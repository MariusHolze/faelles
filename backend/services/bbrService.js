// henter data fra BBR/API.

const {
  mapBbrTilEjendomsdata,
  vurderEjendomsprofilMulighedFraBbrData,
  tal
} = require("./bbrMapper");

function hentBbrConfig() {
  return {
    username: process.env.BBR_USERNAME,
    password: process.env.BBR_PASSWORD,
    baseUrl: process.env.BBR_BASE_URL || "https://services.datafordeler.dk/BBR/BBRPublic/1/rest"
  };
}

async function hentBbrData(adresseID, adgangsadresseID) {
  const config = hentBbrConfig();

  if (!adresseID && !adgangsadresseID) {
    return {};
  }

  if (!config.username || !config.password || !config.baseUrl) {
    console.error("BBR REST kræver BBR_USERNAME, BBR_PASSWORD og BBR_BASE_URL i backend/.env");
    return {};
  }

  try {
    const enheder = adresseID
      ? await hentFraBbrRest(config, "enhed", { AdresseIdentificerer: adresseID })
      : [];

    const bygninger = adgangsadresseID
      ? await hentFraBbrRest(config, "bygning", { Husnummer: adgangsadresseID })
      : [];

    const adgangsadresse = adgangsadresseID
      ? await hentAdgangsadresse(adgangsadresseID)
      : null;

    let grundareal = null;

    try {
      grundareal = await hentGrundareal(adgangsadresse);
    } catch (error) {
      console.warn("Kunne ikke hente grundareal:", error.message);
    }

    return mapBbrTilEjendomsdata({
      enheder,
      bygninger,
      adgangsadresse,
      grundareal
    });
  } catch (error) {
    console.error("Fejl ved hentning af BBR-data:", error.message);
    return {};
  }
}

async function hentFraBbrRest(config, metode, soegeParametre) {
  const baseUrl = normaliserRestUrl(config.baseUrl);
  const params = new URLSearchParams({
    ...soegeParametre,
    username: config.username,
    password: config.password,
    Format: "JSON"
  });

  const response = await fetch(`${baseUrl}/${metode}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`${metode} svarede med status ${response.status}`);
  }

  return normaliserListe(await response.json());
}

async function hentAdgangsadresse(adgangsadresseID) {
  return hentDataforsyningenObjekt(
    `https://api.dataforsyningen.dk/adgangsadresser/${encodeURIComponent(adgangsadresseID)}`
  );
}

async function hentGrundareal(adgangsadresse) {
  const jordstykkeUrl = adgangsadresse?.jordstykke?.href;

  if (!jordstykkeUrl) {
    return null;
  }

  const jordstykke = await hentDataforsyningenObjekt(jordstykkeUrl);
  return tal(jordstykke?.registreretareal ?? jordstykke?.registreretAreal);
}

async function hentDataforsyningenObjekt(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Dataforsyningen svarede med status ${response.status}`);
  }

  return response.json();
}

function normaliserRestUrl(url) {
  return url.replace(/\/$/, "").replace("/REST", "/rest");
}

function normaliserListe(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.resultater)) return data.resultater;
  if (data && typeof data === "object") return [data];
  return [];
}

module.exports = {
  hentBbrData,
  vurderEjendomsprofilMulighedFraBbrData
};