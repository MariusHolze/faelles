const express = require("express");

const router = express.Router();
const MATRIKELKORT_WMS_URL = "https://services.datafordeler.dk/MATRIKLEN2/MatGaeldendeOgForeloebigWMS/1.0.0/WMS";

function hentKortToken() {
  const token = process.env.DATAFORSYNINGEN_MAP_TOKEN || "";

  if (!token || token === "DIN_DATAFORSYNINGEN_TOKEN") {
    return "";
  }

  return token;
}

function sanitiserWmsTekst(body) {
  return body
    .replace(/([?&amp;]username=)[^&<]*/gi, "$1")
    .replace(/([?&amp;]password=)[^&<]*/gi, "$1");
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

router.get("/matrikel-wms", async (req, res) => {
  const username = process.env.BBR_USERNAME;
  const password = process.env.BBR_PASSWORD;

  if (!username || !password) {
    return res.status(503).send("Matrikelkortet kræver BBR_USERNAME og BBR_PASSWORD i backend/.env");
  }

  try {
    const params = new URLSearchParams();

    Object.entries(req.query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => params.append(key, entry));
      } else if (value !== undefined) {
        params.set(key, value);
      }
    });

    params.set("username", username);
    params.set("password", password);

    const upstream = await fetch(`${MATRIKELKORT_WMS_URL}?${params.toString()}`);
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";

    res.status(upstream.status);
    res.set("content-type", contentType);

    if (/xml|text/i.test(contentType)) {
      res.send(sanitiserWmsTekst(await upstream.text()));
      return;
    }

    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error("Fejl ved hentning af matrikelkort-WMS:", error.message);
    res.status(502).send("Kunne ikke hente Matrikelkortet");
  }
});

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

    res.json({
      adresseID,
      adgangsadresseID: adgangsadresse.id || adgangsadresseID || "",
      adressebetegnelse: adresseData?.adressebetegnelse || adgangsadresse.adressebetegnelse || "",
      koordinater: Array.isArray(adgangspunkt.koordinater) ? adgangspunkt.koordinater : null,
      jordstykke: jordstykke.href || adgangsadresse.matrikelnr || adgangsadresse.ejerlav?.kode
        ? {
            ejerlavkode: jordstykke.ejerlav?.kode || adgangsadresse.ejerlav?.kode || null,
            ejerlavnavn: jordstykke.ejerlav?.navn || adgangsadresse.ejerlav?.navn || "",
            matrikelnr: jordstykke.matrikelnr || adgangsadresse.matrikelnr || ""
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
