const { beregnInvesteringscase } = require("../services/beregnCase");

describe("beregnCase", () => {

  test("beregner investering, lån, cashflow og restgæld", () => {
    const input = {
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
        { navn: "Drift", beloeb: 2000, periode: "maanedligt" }
      ],

      udlejningAktiv: true,
      maanedligLeje: 10000,
      tomgangDage: 0,
      udlejningsudgifter: [
        { navn: "Administration", beloeb: 500, periode: "maanedligt" }
      ],

      vaekstProcent: 2,
      periodeAar: 30
    };

    const resultat = beregnInvesteringscase(input);

    expect(resultat.startInvestering).toBe(1050000);

    expect(resultat.finansieringsbehov).toBe(850000);
    expect(Math.round(resultat.maanedligYdelse)).toBe(4058);
    expect(Math.round(resultat.totalRenteomkostning)).toBe(610891);

    expect(Math.round(resultat.maanedligtCashflow)).toBe(3442);
    expect(Math.round(resultat.aarligtCashflow)).toBe(41304);

    expect(resultat.noegletalOverTid).toHaveLength(30);
    expect(Math.round(resultat.noegletalOverTid[29].restgaeld)).toBe(0);
  });

  test("medregner renovering i startinvesteringen", () => {
    const input = {
      koebsposter: [
        { navn: "Ejendomspris", beloeb: 1000000 },
        { navn: "Omkostninger ved køb", beloeb: 50000 }
      ],

      laanebeloeb: 0,
      egenbetaling: 1150000,
      rente: 0,
      loebetid: 30,

      renoveringAktiv: true,
      renoveringer: [
        { navn: "Køkken", beloeb: 100000, tidspunktAar: 1 }
      ],

      driftsposter: [],

      udlejningAktiv: false,
      maanedligLeje: 0,
      tomgangDage: 0,
      udlejningsudgifter: [],

      vaekstProcent: 2,
      periodeAar: 30
    };

    const resultat = beregnInvesteringscase(input);

    expect(resultat.koebspris).toBe(1000000);
    expect(resultat.koebsomkostninger).toBe(50000);
    expect(resultat.renoveringIAlt).toBe(100000);
    expect(resultat.startInvestering).toBe(1150000);
  });

  test("ignorerer lejeindtægter når udlejning ikke er aktiv", () => {
    const input = {
      koebsposter: [
        { navn: "Ejendomspris", beloeb: 1000000 },
        { navn: "Omkostninger ved køb", beloeb: 50000 }
      ],

      laanebeloeb: 0,
      egenbetaling: 1050000,
      rente: 0,
      loebetid: 30,

      renoveringAktiv: false,
      renoveringer: [],

      driftsposter: [
        { navn: "Drift", beloeb: 2000, periode: "maanedligt" }
      ],

      udlejningAktiv: false,
      maanedligLeje: 10000,
      tomgangDage: 0,
      udlejningsudgifter: [
        { navn: "Administration", beloeb: 500, periode: "maanedligt" }
      ],

      vaekstProcent: 2,
      periodeAar: 30
    };

    const resultat = beregnInvesteringscase(input);

    expect(resultat.maanedligIndtaegt).toBe(0);
    expect(resultat.lejeUdgifterMaanedligt).toBe(0);
    expect(resultat.maanedligeUdgifter).toBe(2000);
    expect(resultat.maanedligtCashflow).toBe(-2000);
    expect(resultat.aarligtCashflow).toBe(-24000);
  });
});