const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  const soeg = req.query.soeg;

  if (!soeg || soeg.trim() === "") {
    return res.status(400).json({
      message: "Søgetekst mangler"
    });
  }

  try {
    const response = await fetch(
      `https://api.dataforsyningen.dk/adresser/autocomplete?q=${encodeURIComponent(soeg)}`
    );

    if (!response.ok) {
      return res.status(500).json({
        message: "Fejl ved kontakt til adresse-API"
      });
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({
        message: "Ingen adresse fundet"
      });
    }

    const adresser = data.slice(0, 10).map((item) => {
      const adr = item.adresse || {};

      return {
        adresse: item.tekst || "",
        vejnavn: adr.vejnavn || "",
        husnr: adr.husnr || "",
        postnr: adr.postnr || "",
        postnrnavn: adr.postnrnavn || ""
      };
    });

    res.json(adresser);
  } catch (error) {
    console.error("Fejl ved adresse API:", error);
    res.status(500).json({
      message: "Fejl ved hentning af adresse"
    });
  }
});

module.exports = router;