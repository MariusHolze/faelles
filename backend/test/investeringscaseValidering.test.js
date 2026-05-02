const { validerCase } = require("../services/validerCase");

function lavGyldigCase(overrides = {}) {
  return {
    ejendomID: 1,
    navn: "Standardcase",

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

    driftsposter: [],

    udlejningAktiv: false,
    maanedligLeje: 0,
    tomgangDage: 0,
    udlejningsudgifter: [],

    // ny værdi med samme navn, overrider den gamle standardværdi fra "Standardcase"
    ...overrides 
  };
}

describe("validerCase", () => {
  test("godkender en gyldig investeringscase", () => {
    const input = lavGyldigCase();

    const resultat = validerCase(input);

    expect(resultat).toHaveLength(0); // der skal være 0 fejl.
  });

  test("afviser case uden navn", () => {
    const input = lavGyldigCase({
      navn: ""
    });

    const resultat = validerCase(input);

    expect(resultat).toContain("Giv casen et navn.");
  });

  test("afviser case hvor finansiering ikke matcher købsposter", () => {
    const input = lavGyldigCase({
      // gammel standardværdi overrided til ny
      laanebeloeb: 500000
    });

    const resultat = validerCase(input);

    expect(resultat).toContain(
      "Lånebeløb + egenbetaling skal være lig med samlede købs- og omkostningsposter."
    );
  });
});