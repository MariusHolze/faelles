const assert = require("assert");
const { beregnAnalyse } = require("./services/beregnCase");

function lavBasisCase(overrides = {}) {
  return {
    koebsposter: [
      { navn: "Ejendomspris", beloeb: 1000000 },
      { navn: "Omkostninger ved køb", beloeb: 50000 }
    ],

    laanebeloeb: 850000,
    egenbetaling: 200000,
    rente: 4,
    loebetid: 30,

    renoveringAktiv: false,
    renoveringer: [],

    driftsposter: [
      { navn: "Drift", beloeb: 24000, periode: "aarligt" }
    ],

    udlejningAktiv: true,
    maanedligLeje: 10000,
    tomgangDage: 0,
    udlejningsudgifter: [],

    vaekstProcent: 2,
    periodeAar: 30,

    ...overrides
  };
}

function testUdenRenovering() {
  const analyse = beregnAnalyse(lavBasisCase());

  assert.strictEqual(analyse.koebspris, 1000000);
  assert.strictEqual(analyse.koebsomkostninger, 50000);
  assert.strictEqual(analyse.samletInvestering, 1050000);
  assert.strictEqual(analyse.finansieringsbehov, 850000);
  assert.strictEqual(analyse.egenkapitalBehov, 200000);
}

function testMedRenovering() {
  const analyse = beregnAnalyse(lavBasisCase({
    renoveringAktiv: true,
    renoveringer: [
      { navn: "Køkken", beloeb: 150000, tidspunktAar: 1 }
    ]
  }));

  assert.strictEqual(analyse.renoveringIAlt, 150000);
  assert.strictEqual(analyse.samletInvestering, 1200000);
  assert.strictEqual(analyse.finansieringsbehov, 850000);
}

function testEgenbetalingDaekkerInvestering() {
  const analyse = beregnAnalyse(lavBasisCase({
    laanebeloeb: 0,
    egenbetaling: 1050000
  }));

  assert.strictEqual(analyse.finansieringsbehov, 0);
  assert.strictEqual(analyse.maanedligYdelse, 0);
}

function testNegativtCashflow() {
  const analyse = beregnAnalyse(lavBasisCase({
    maanedligLeje: 1000
  }));

  assert.ok(analyse.aarligtCashflowEfterLaaneydelse < 0);
  assert.ok(analyse.noegletalOverTid[29].akkumuleretCashflow < 0);
}

function testUdlejningKanSlaasFra() {
  const analyse = beregnAnalyse(lavBasisCase({
    udlejningAktiv: false,
    maanedligLeje: 10000,
    udlejningsudgifter: [
      { navn: "Administration", beloeb: 500, periode: "maanedligt" }
    ]
  }));

  assert.strictEqual(analyse.maanedligIndtaegt, 0);
  assert.strictEqual(analyse.lejeUdgifterMaanedligt, 0);
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
  testUdlejningKanSlaasFra();
  testLaanAfdragesOver30Aar();
  console.log("Alle investeringscase-beregningstests er OK.");
}

koerTests();