const express = require("express");

const router = express.Router();

function hentKortToken() {
  const token = process.env.DATAFORSYNINGEN_MAP_TOKEN || "";

  if (!token || token === "DIN_DATAFORSYNINGEN_TOKEN") {
    return "";
  }

  return token;
}

async function hentJsonFraUrl(url) {
  const response = await fetch(url);

  if (!response.ok) {
    const fejl = new Error(`Upstream fejl ${response.status} for ${url}`);
    fejl.status = response.status;
    throw fejl;
  }

  return response.json();
}

router.get("/ejendom", async (req, res) => {
  const { adresseID, adgangsadresseID } = req.query;

  if (!adresseID && !adgangsadresseID) {
    return res.status(400).json({
      message: "adresseID eller adgangsadresseID mangler"
    });
  }

  try {
    let adresseData = null;
    let adgangsadresse = {};

    if (adresseID) {
      try {
        adresseData = await hentJsonFraUrl(`https://api.dataforsyningen.dk/adresser/${encodeURIComponent(adresseID)}`);
        adgangsadresse = adresseData.adgangsadresse || {};
      } catch (error) {
        if (!adgangsadresseID) {
          throw error;
        }
      }
    }

    if (!adresseData && adgangsadresseID) {
      adgangsadresse = await hentJsonFraUrl(`https://api.dataforsyningen.dk/adgangsadresser/${encodeURIComponent(adgangsadresseID)}`);
    }

    const adgangspunkt = adgangsadresse.adgangspunkt || {};
    const jordstykke = adgangsadresse.jordstykke || {};
    let jordstykkeGeojson = null;

    if (jordstykke.href) {
      try {
        jordstykkeGeojson = await hentJsonFraUrl(`${jordstykke.href}?format=geojson`);
      } catch (error) { // Hvis polygonen fejler, viser vi stadig selve adressen på kortet.
        jordstykkeGeojson = null;
      }
    }

    res.json({
      adresseID,
      adgangsadresseID: adgangsadresse.id || adgangsadresseID || "",
      adressebetegnelse: adresseData?.adressebetegnelse || adgangsadresse.adressebetegnelse || "",
      koordinater: Array.isArray(adgangspunkt.koordinater) ? adgangspunkt.koordinater : null,
      jordstykke: jordstykke.href || adgangsadresse.matrikelnr || adgangsadresse.ejerlav?.kode
        ? {
            ejerlavkode: jordstykke.ejerlav?.kode || adgangsadresse.ejerlav?.kode || null,
            ejerlavnavn: jordstykke.ejerlav?.navn || adgangsadresse.ejerlav?.navn || "",
            matrikelnr: jordstykke.matrikelnr || adgangsadresse.matrikelnr || "",
            geojson: jordstykkeGeojson
          }
        : null,
      kort: {
        dataforsyningenToken: hentKortToken()
      }
    });
  } catch (error) {
    console.error("Fejl ved hentning af kortdata:", error.message);
    res.status(500).json({
      message: "Server fejl ved hentning af kortdata"
    });
  }
});

module.exports = router;
