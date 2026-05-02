const express = require("express");
const router = express.Router();

// Denne route bruges til at søge efter adresser.
// Frontend sender en søgetekst med i URL'en.
router.get("/", async (req, res) => {
  const soeg = req.query.soeg;

  if (!soeg) {
    return res.status(400).json({ message: "Søgetekst mangler" });
  }

  try {
    // Her sender vi en forespørgsel videre til Dataforsyningens API.
    // encodeURIComponent sørger for, at teksten er sikker at sende i en URL.
    const response = await fetch(
      `https://api.dataforsyningen.dk/adresser/autocomplete?q=${encodeURIComponent(soeg)}`
    );

    // Hvis API'et ikke svarer korrekt,
    // sender vi en serverfejl tilbage.
    if (!response.ok) {
      return res.status(500).json({
        message: "Fejl ved kontakt til adresse-API"
      });
    }

    // Svaret fra API'et bliver lavet om til JavaScript-data.
    const data = await response.json();

    // Hvis der ikke kommer nogen adresser tilbage,
    // sender vi en 404-fejl.
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({
        message: "Ingen adresse fundet"
      });
    }

    // Her vælger vi kun de første 10 resultater.
    // Samtidig laver vi hvert resultat om til et enklere objekt,
    // så frontend kun får de felter, den skal bruge.
    const adresser = data.slice(0, 10).map((item) => {
      const adr = item.adresse || {};

      return {
        adresse: item.tekst || "",
        // Disse ID'er skal bruges, hvis vi senere henter flere data fra BBR.
        adresseID: adr.id || "",
        adgangsadresseID: adr.adgangsadresseid || "",
        kommunekode: adr.kommunekode || "",
        vejnavn: adr.vejnavn || "",
        husnr: adr.husnr || "",
        postnr: adr.postnr || "",
        postnrnavn: adr.postnrnavn || ""
      };
    });

    // De bearbejdede adresser sendes tilbage til frontend.
    // Tunge BBR-opslag sker først, når brugeren faktisk opretter/opdaterer en ejendomsprofil.
    res.json(adresser);
  } catch (error) {
    // Hvis der sker en uventet fejl,
    // logger vi den i terminalen og sender fejlbesked tilbage.
    console.error("Fejl ved adresse API:", error);
    res.status(500).json({
      message: "Fejl ved hentning af adresse"
    });
  }
});

// Gør routeren tilgængelig for server.js
module.exports = router;
