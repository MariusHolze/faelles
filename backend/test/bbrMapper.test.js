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
        
        expect(resultat.adresse).toBe("Testvej 1, 1234 Testbyen");
        expect(resultat.boligtype).toBe("Egentlig beboelseslejlighed");
        expect(resultat.bygningAnvendelseTekst).toBe("Fritliggende enfamiliehus");
        expect(resultat.byggeaar).toBe(1998);
        expect(resultat.boligareal).toBe(140);
        expect(resultat.antalVaerelser).toBe(5);
        expect(resultat.grundareal).toBe(700);
        expect(resultat.kanOprettesSomEjendomsprofil).toBe(true);
    });
    
        test("afviser adresse grundet manglende boligdata", () => {
        const bbrData = {
            adgangsadresse: {
                adressebetegnelse: "Testvej 1, 1234 Testbyen"
            },
            grundareal: 400,
            enheder: [],
            bygninger: [ { byg026Opfoerelsesaar: 1998 }
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
        
        expect(resultat.adresse).toBe("Testvej 2, 1234 Testbyen");
        expect(resultat.bygningAnvendelseKode).toBe(120);
        expect(resultat.bygningAnvendelseTekst).toBe("Fritliggende enfamiliehus");
        expect(resultat.byggeaar).toBe(1988);
        expect(resultat.boligareal).toBe(150);
        expect(resultat.grundareal).toBe(1000);
        expect(resultat.kanOprettesSomEjendomsprofil).toBe(true);
    });
})