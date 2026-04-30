const assert = require("assert");
const { beregnAnalyse } = require("./services/investeringscaseBeregner");

function lavBasisCase(overrides = {}) {
  return {
    koebsudgifter: {
      poster: [
        { navn: "Ejendomspris", beloeb: 1000000 },
        { navn: "Omkostninger ved køb", beloeb: 50000 }
      ]
    },
    finansiering: {
      egenbetaling: 200000,
      rente: 4,
      loebetid: 30,
      afdragsfrihed: 0
    },
    renovering: {
      aktiv: false,
      poster: []
    },
    driftsbudget: {
      poster: [
        { navn: "Drift", beloeb: 24000, periode: "aarligt" }
      ]
    },
    udlejning: {
      aktiv: true,
      maanedligLeje: 10000,
      tomgangDage: 0,
      maanedligeUdlejningsudgifter: 0,
      aarligeUdlejningsudgifter: 0
    },
    ...overrides
  };
}

function testUdenRenovering() {
  const analyse = beregnAnalyse(lavBasisCase());

  assert.strictEqual(analyse.samletInvestering, 1050000);
  assert.strictEqual(analyse.finansieringsbehov, 850000);
  assert.strictEqual(analyse.egenkapitalBehov, 200000);
}

function testMedRenovering() {
  const analyse = beregnAnalyse(lavBasisCase({
    renovering: {
      aktiv: true,
      poster: [
        { navn: "Køkken", beloeb: 150000, tidspunktAar: 1 }
      ]
    }
  }));

  assert.strictEqual(analyse.samletInvestering, 1200000);
  assert.strictEqual(analyse.finansieringsbehov, 1000000);
}

function testEgenbetalingDaekkerInvestering() {
  const analyse = beregnAnalyse(lavBasisCase({
    finansiering: {
      egenbetaling: 1200000,
      rente: 4,
      loebetid: 30,
      afdragsfrihed: 0
    }
  }));

  assert.strictEqual(analyse.finansieringsbehov, 0);
  assert.strictEqual(analyse.maanedligYdelse, 0);
}

function testNegativtCashflow() {
  const analyse = beregnAnalyse(lavBasisCase({
    udlejning: {
      aktiv: true,
      maanedligLeje: 1000,
      tomgangDage: 0,
      maanedligeUdlejningsudgifter: 0,
      aarligeUdlejningsudgifter: 0
    }
  }));

  assert.ok(analyse.aarligtCashflowEfterLaaneydelse < 0);
  assert.ok(analyse.noegletalOverTid[29].akkumuleretCashflow < 0);
}

function testLaanAfdragesOver30Aar() {
  const analyse = beregnAnalyse(lavBasisCase());
  const aar30 = analyse.noegletalOverTid[29];

  assert.ok(aar30.restgaeld < 1);
  assert.ok(aar30.egenkapitalIEjendom >= analyse.ejendomspris - 1);
}

function koerTests() {
  testUdenRenovering();
  testMedRenovering();
  testEgenbetalingDaekkerInvestering();
  testNegativtCashflow();
  testLaanAfdragesOver30Aar();
  console.log("Alle investeringscase-beregningstests er OK.");
}

koerTests();
