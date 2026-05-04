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
    udlejningsudgifter: [],

    // ny værdi med samme navn, overrider den gamle standardværdi fra "Standardcase"
    ...overrides
  };
}

describe("validerCase", () => {
  test("godkender en gyldig investeringscase", () => {
    const input = lavGyldigCase();

    const resultat = validerCase(input);

    expect(resultat).toEqual([]); // der skal være 0 fejl.
  });

  test("afviser case uden navn", () => {
    const input = lavGyldigCase({
      navn: ""
    });

    const resultat = validerCase(input);

    expect(resultat).toContain("Giv casen et navn.");
  });

  test("afviser case med ugyldige købsposter og ugyldig købspris", () => {
    const input = lavGyldigCase({
      koebsposter: [ { navn: "", beloeb: -1000000 } ]
    });

    const resultat = validerCase(input);

    expect(resultat).toContain(
      "Alle købsposter skal udfyldes med gyldige beløb.",
      "Ejendomspris skal være større end 0."
    );
  });

  test("afviser case uden købsposter", () => {
    const input = lavGyldigCase({
      koebsposter: []
    });

    const resultat = validerCase(input);
    
    expect(resultat).toContain("Tilføj mindst én købspost.")
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

  test("afviser ugyldige grundfelter", () => {
    const input = lavGyldigCase({
      ejendomID: null,
      rente: "abc",
      loebetid: 0
    });

    const resultat = validerCase(input);

    expect(resultat).toEqual(expect.arrayContaining([
      "Vælg en ejendomsprofil.",
      "rente skal være et tal på 0 eller derover.",
      "loebetid skal være større end 0."
    ]));
  });

  test("afviser ugyldige aktive renoverings-, drifts- og udlejningsfelter", () => {
    const input = lavGyldigCase({
      renoveringAktiv: true,
      renoveringer: [
        { navn: "", beloeb: 0, tidspunktAar: "abc" }
      ],

      driftsposter: [
        { navn: "", beloeb: 0, periode: "ugentligt" }
      ],

      udlejningAktiv: true,
      maanedligLeje: 0,
      udlejningsudgifter: [
        { navn: "", beloeb: 0, periode: "ugentligt" }
      ]
    });

    const resultat = validerCase(input);

    expect(resultat).toEqual(expect.arrayContaining([
      "Alle renoveringsfelter skal udfyldes",
      "Renoveringsår skal være et tal på 0 eller derover.",
      "Alle driftsfelter skal udfyldes",
      "Driftsperiode skal være maanedligt eller aarligt.",
      "Udlejningsfelter skal udfyldes",
      "Udlejningsperiode skal være maanedligt eller aarligt."
    ]));
  });
});