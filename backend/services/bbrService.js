// Denne fil håndterer opslag i BBR.
// Vi holder BBR-koden samlet her, så ejendomRoutes.js ikke bliver for rodet.

function hentBbrConfig() {
  return {
    username: process.env.BBR_USERNAME,
    password: process.env.BBR_PASSWORD,
    baseUrl: process.env.BBR_BASE_URL,
    apiKey: process.env.BBR_API_KEY,
    wfsBaseUrl: process.env.BBR_WFS_BASE_URL
  };
}

function harBbrLogin(config) {
  return Boolean(config.username && config.password && config.baseUrl);
}

function harBbrApiKey(config) {
  return Boolean(
    config.apiKey &&
    config.apiKey !== "DIN_DATAFORDELER_API_KEY" &&
    config.wfsBaseUrl
  );
}

async function hentBbrData(adresseID, adgangsadresseID) {
  // Hvis vi ikke har et adresse-id, kan vi ikke slå adressen op i BBR.
  if (!adresseID && !adgangsadresseID) {
    return {};
  }

  const config = hentBbrConfig();

  if (harBbrLogin(config)) {
    try {
      const bygninger = await hentBygninger(adgangsadresseID, config);
      const enheder = await hentEnheder(adresseID, config);
      const grunde = await hentGrunde(adgangsadresseID, config);

      return lavBbrOverblik(bygninger, enheder, grunde);
    } catch (error) {
      console.error("Fejl ved hentning af BBR-data via REST:", error.message);
    }
  }

  if (harBbrApiKey(config) && adgangsadresseID) {
    try {
      const bygninger = await hentBygningerViaWfs(adgangsadresseID, config);
      return lavBbrOverblik(bygninger, [], []);
    } catch (error) {
      console.error("Fejl ved hentning af BBR-data via WFS:", error.message);
    }
  }

  console.log("BBR-login eller API-key mangler eller kunne ikke bruges");
  return {};
}

async function hentBygninger(adgangsadresseID, config) {
  // Datafordeler kalder adgangsadresse-id'et for "Husnummer".
  return hentFraDatafordeler("bygning", { Husnummer: adgangsadresseID }, config);
}

async function hentEnheder(adresseID, config) {
  // Enheder bruger det konkrete adresse-id fra adresse-API'et.
  return hentFraDatafordeler("enhed", { AdresseIdentificerer: adresseID }, config);
}

async function hentGrunde(adgangsadresseID, config) {
  // Grund-opslaget bruger også adgangsadresse-id'et som "Husnummer".
  return hentFraDatafordeler("grund", { Husnummer: adgangsadresseID }, config);
}

async function hentBygningerViaWfs(adgangsadresseID, config) {
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: "bbr_v001:bygning_current",
    outputFormat: "application/json",
    count: "25",
    cql_filter: `husnummer='${adgangsadresseID}'`,
    apikey: config.apiKey
  });

  const response = await fetch(`${config.wfsBaseUrl}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`BBR WFS svarede med status ${response.status}`);
  }

  const data = await response.json();
  const features = Array.isArray(data.features) ? data.features : [];

  return features
    .map((feature) => feature.properties || null)
    .filter(Boolean);
}

async function hentFraDatafordeler(metode, soegeParametre, config) {
  const baseUrl = config.baseUrl.replace(/\/$/, "").replace("/REST", "/rest");

  const params = new URLSearchParams({
    ...soegeParametre,
    username: config.username,
    password: config.password,
    Format: "JSON"
  });

  const response = await fetch(`${baseUrl}/${metode}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`BBR ${metode} svarede med status ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    return [];
  }

  return data;
}

function lavBbrOverblik(bygninger, enheder, grunde) {
  const bygning = bygninger[0] || {};
  const enhed = enheder[0] || {};
  const grund = grunde[0] || {};

  return {
    boligtype: findFoersteVaerdi(
      enhed.EnhedAnvendelseTekst,
      enhed.enh020EnhedensAnvendelse,
      bygning.BygningAnvendelseTekst,
      bygning.byg021BygningensAnvendelse
    ),
    byggeaar: findFoersteTal(
      bygning.byg026Opfoerelsesaar,
      bygning.byg026Opførelsesår
    ),
    boligareal: findFoersteTal(
      enhed.enh027ArealTilBeboelse,
      enhed.enh026EnhedensSamledeAreal,
      bygning.byg039BygningensSamledeBoligAreal,
      bygning.byg038SamletBygningsareal
    ),
    antalVaerelser: findFoersteTal(
      enhed.enh031AntalVaerelser,
      enhed.enh031AntalVærelser
    ),
    grundareal: findFoersteTal(
      grund.gru009SamletAreal,
      grund.grundareal
    )
  };
}

function findFoersteVaerdi(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== "") || null;
}

function findFoersteTal(...values) {
  const value = findFoersteVaerdi(...values);

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const tal = Number(value);

  if (Number.isNaN(tal)) {
    return null;
  }

  return tal;
}

module.exports = {
  hentBbrData
};
