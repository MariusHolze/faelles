// Denne fil håndterer opslag i BBR.
// Vi holder BBR-koden samlet her, så ejendomRoutes.js ikke bliver for rodet.

function hentBbrConfig() {
  return {
    username: process.env.BBR_USERNAME,
    password: process.env.BBR_PASSWORD,
    baseUrl: process.env.BBR_BASE_URL
  };
}

function harBbrLogin(config) {
  return Boolean(config.username && config.password && config.baseUrl);
}

async function hentBbrData(adresseID, adgangsadresseID) {
  // Hvis vi ikke har et adresse-id, kan vi ikke slå adressen op i BBR.
  if (!adresseID && !adgangsadresseID) {
    return {};
  }

  const config = hentBbrConfig();

  if (!harBbrLogin(config)) {
    console.log("BBR-login mangler i .env");
    return {};
  }

  try {
    const bygninger = await hentBygninger(adgangsadresseID, config);
    const enheder = await hentEnheder(adresseID, config);
    const grunde = await hentGrunde(adgangsadresseID, config);

    return lavBbrOverblik(bygninger, enheder, grunde);
  } catch (error) {
    // Vi stopper ikke oprettelse af ejendom, hvis BBR fejler.
    // Så kan brugeren stadig gemme den validerede adresse.
    console.error("Fejl ved hentning af BBR-data:", error.message);
    return {};
  }
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
    console.error(`BBR ${metode} svarede med status ${response.status}`);
    return [];
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
      enhed.enh026EnhedensSamledeAreal
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
  const tal = Number(value);

  if (Number.isNaN(tal)) {
    return null;
  }

  return tal;
}

module.exports = {
  hentBbrData
};
