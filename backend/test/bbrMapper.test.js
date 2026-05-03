const { mapBbrTilEjendomsdata } = require("../services/bbrMapper");

describe("bbrMapper", () => {
    test("kortlægger rå BBR-data til brugbart JSON-format", () => {
        const bbrData = {
            adgangsadresse: {
                adressebetegnelse: "Testvej 1, 1234 Testbyen"
            },
            grundareal: 700,
            enheder: [
                {
                    enh023Boligtype: 1,
                    enh026EnhedensSamledeAreal: 140,
                    enh031AntalVaerelser: 5
                }
            ],
            bygninger: [
                {
                    byg021BygningensAnvendelse: 120,
                    byg026Opfoerelsesaar: 1998,
                    byg039BygningensSamledeBoligAreal: 140
                }
            ]
        };

        const resultat = mapBbrTilEjendomsdata(bbrData);

        expect(resultat).toMatchObject({
            adresse: "Testvej 1, 1234 Testbyen",
            boligtype: "Egentlig beboelseslejlighed",
            bygningAnvendelseTekst: "Fritliggende enfamiliehus",
            byggeaar: 1998,
            boligareal: 140,
            antalVaerelser: 5,
            grundareal: 700,
            kanOprettesSomEjendomsprofil: true
        });
    });

    test("afviser adresse grundet manglende boligdata", () => {
        const bbrData = {
            adgangsadresse: {
                adressebetegnelse: "Testvej 1, 1234 Testbyen"
            },
            grundareal: 400,
            enheder: [],
            bygninger: [{ byg026Opfoerelsesaar: 1998 }
            ]
        };

        const resultat = mapBbrTilEjendomsdata(bbrData);

        expect(resultat.adresse).toBe("Testvej 1, 1234 Testbyen");
        expect(resultat.byggeaar).toBe(1998);
        expect(resultat.grundareal).toBe(400);
        expect(resultat.kanOprettesSomEjendomsprofil).toBe(false);
        expect(resultat.afvisningsaarsag).toContain("fordi BBR ikke viser boligdata for adressen.")
    });

    test("vælger den største relevante boligbygning", () => {
        const bbrData = {
            adgangsadresse: {
                adressebetegnelse: "Testvej 2, 1234 Testbyen"
            },
            grundareal: 1000,
            bygninger: [
                {
                    byg021BygningensAnvendelse: 185,
                    byg026Opfoerelsesaar: 2004,
                    byg039BygningensSamledeBoligAreal: 25
                },
                {
                    byg021BygningensAnvendelse: 120,
                    byg026Opfoerelsesaar: 1988,
                    byg039BygningensSamledeBoligAreal: 150
                }
            ]
        };

        const resultat = mapBbrTilEjendomsdata(bbrData);

        expect(resultat).toMatchObject({
            adresse: "Testvej 2, 1234 Testbyen",
            bygningAnvendelseKode: 120,
            bygningAnvendelseTekst: "Fritliggende enfamiliehus",
            byggeaar: 1988,
            boligareal: 150,
            grundareal: 1000,
            kanOprettesSomEjendomsprofil: true
        });
    });
})