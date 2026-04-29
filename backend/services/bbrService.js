// Denne fil håndterer opslag i BBR.
// Vi holder BBR-koden samlet her, så ejendomRoutes.js ikke bliver for rodet.

const BYGNING_ANVENDELSE = {
  110: "Stuehus til landbrugsejendom",
  120: "Fritliggende enfamiliehus",
  121: "Sammenbygget enfamiliehus",
  122: "Fritliggende enfamiliehus i tæt-lav bebyggelse",
  130: "Række-, kæde- eller dobbelthus (udfases)",
  131: "Række-, kæde- og klyngehus",
  132: "Dobbelthus",
  140: "Etagebolig-bygning, flerfamiliehus eller to-familiehus",
  150: "Kollegium",
  160: "Boligbygning til døgninstitution",
  185: "Anneks i tilknytning til helårsbolig",
  190: "Anden bygning til helårsbeboelse",
  510: "Sommerhus"
};

const ENHED_BOLIGTYPE = {
  1: "Egentlig beboelseslejlighed",
  2: "Blandet erhverv og bolig",
  3: "Enkeltværelse",
  4: "Fællesbolig",
  5: "Sommer-/fritidsbolig"
};

const TILLADTE_BYGNINGSKODER_TIL_EJENDOMSPROFIL = new Set(
  Object.keys(BYGNING_ANVENDELSE).map(Number)
);

const TILLADTE_ENHED_BOLIGTYPER_TIL_EJENDOMSPROFIL = new Set([1, 2, 3, 4, 5]);

let bbrRestAdgangAfvist = false;
let darBfeAdgangAfvist = false;

function hentBbrConfig() {
  return {
    username: process.env.BBR_USERNAME,
    password: process.env.BBR_PASSWORD,
    baseUrl: process.env.BBR_BASE_URL || "https://services.datafordeler.dk/BBR/BBRPublic/1/rest",
    apiKey: process.env.BBR_API_KEY,
    wfsBaseUrl: process.env.BBR_WFS_BASE_URL,
    darBfeBaseUrl: process.env.DAR_BFE_BASE_URL || "https://services.datafordeler.dk/DAR/DAR_BFE_Public/1/rest",
    bbrGraphqlBaseUrl: process.env.BBR_GRAPHQL_BASE_URL || "https://graphql.datafordeler.dk/BBR/v1",
    matGraphqlBaseUrl: process.env.MAT_GRAPHQL_BASE_URL || "https://graphql.datafordeler.dk/MAT/v1"
  };
}

function harBbrLogin(config) {
  return Boolean(config.username && config.password && config.baseUrl && !bbrRestAdgangAfvist);
}

function harDarBfeLogin(config) {
  return Boolean(config.username && config.password && config.darBfeBaseUrl && !darBfeAdgangAfvist);
}

function harBbrApiKey(config) {
  return Boolean(
    config.apiKey &&
    config.apiKey !== "DIN_DATAFORDELER_API_KEY" &&
    config.wfsBaseUrl
  );
}

function harBbrGraphql(config) {
  return Boolean(
    config.apiKey &&
    config.apiKey !== "DIN_DATAFORDELER_API_KEY" &&
    config.bbrGraphqlBaseUrl
  );
}

async function hentBbrData(adresseID, adgangsadresseID) {
  // Adresse-id bruges til enhedsdata, adgangsadresse-id bruges til bygning/grund.
  if (!adresseID && !adgangsadresseID) {
    return {};
  }

  const config = hentBbrConfig();

  if (harBbrLogin(config)) {
    try {
      const bygninger = await hentBygninger(adgangsadresseID, config);
      const enheder = await hentEnheder(adresseID, config);
      const bfeNumre = await hentBfeNumre(adresseID, adgangsadresseID, config);
      const grundareal = await hentGrundarealViaDataforsyningen(bfeNumre, adgangsadresseID);
      const grunde = grundareal ? [{ grundareal }] : await hentGrunde(bfeNumre, config);
      const bbrOverblik = lavBbrOverblik(bygninger, enheder, grunde);

      if (harBbrVaerdier(bbrOverblik)) {
        return bbrOverblik;
      }
    } catch (error) {
      console.error("Fejl ved hentning af BBR-data via REST:", forklarDatafordelerFejl(error));
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

  console.log("BBR-data kunne ikke hentes med den nuvaerende REST-konfiguration");
  return {};
}

async function hentBbrDataViaGraphql(adresseID, adgangsadresseID, config) {
  const tid = new Date().toISOString();
  const enheder = adresseID ? await hentEnhederViaGraphql(adresseID, tid, config) : [];
  let bygninger = adgangsadresseID ? await hentBygningerViaGraphql(adgangsadresseID, tid, config) : [];

  if (bygninger.length === 0 && enheder.length > 0) {
    bygninger = await hentBygningerForEnhederViaGraphql(enheder, tid, config);
  }

  const grundareal = await hentGrundarealForBygningerViaGraphql(bygninger, tid, config);
  const grunde = grundareal ? [{ grundareal }] : [];

  return lavBbrOverblik(bygninger, enheder, grunde);
}

async function hentEnhederViaGraphql(adresseID, tid, config) {
  const query = `
    query HentEnhed($adresseID: String!, $tid: DafDateTime) {
      BBR_Enhed(
        first: 10
        registreringstid: $tid
        virkningstid: $tid
        where: { adresseIdentificerer: { eq: $adresseID } }
      ) {
        nodes {
          adresseIdentificerer
          bygning
          enh020EnhedensAnvendelse
          enh023Boligtype
          enh026EnhedensSamledeAreal
          enh027ArealTilBeboelse
          enh031AntalVaerelser
          status
        }
      }
    }
  `;

  const data = await hentFraGraphql(config.bbrGraphqlBaseUrl, config.apiKey, query, {
    adresseID,
    tid
  });

  return data?.BBR_Enhed?.nodes || [];
}

async function hentBygningerViaGraphql(adgangsadresseID, tid, config) {
  const query = `
    query HentBygning($adgangsadresseID: String!, $tid: DafDateTime) {
      BBR_Bygning(
        first: 25
        registreringstid: $tid
        virkningstid: $tid
        where: { husnummer: { eq: $adgangsadresseID } }
      ) {
        nodes {
          id_lokalId
          husnummer
          grund
          jordstykke
          byg021BygningensAnvendelse
          byg026Opfoerelsesaar
          byg038SamletBygningsareal
          byg039BygningensSamledeBoligAreal
          byg041BebyggetAreal
          status
        }
      }
    }
  `;

  const data = await hentFraGraphql(config.bbrGraphqlBaseUrl, config.apiKey, query, {
    adgangsadresseID,
    tid
  });

  return data?.BBR_Bygning?.nodes || [];
}

async function hentBygningerForEnhederViaGraphql(enheder, tid, config) {
  const bygningIDs = [
    ...new Set(
      enheder
        .map((enhed) => enhed.bygning)
        .filter(Boolean)
    )
  ];
  const bygninger = [];

  for (const bygningID of bygningIDs) {
    const fundneBygninger = await hentBygningViaGraphql(bygningID, tid, config);
    bygninger.push(...fundneBygninger);
  }

  return bygninger;
}

async function hentBygningViaGraphql(bygningID, tid, config) {
  const query = `
    query HentBygningFraId($bygningID: String!, $tid: DafDateTime) {
      BBR_Bygning(
        first: 5
        registreringstid: $tid
        virkningstid: $tid
        where: { id_lokalId: { eq: $bygningID } }
      ) {
        nodes {
          id_lokalId
          husnummer
          grund
          jordstykke
          byg021BygningensAnvendelse
          byg026Opfoerelsesaar
          byg038SamletBygningsareal
          byg039BygningensSamledeBoligAreal
          byg041BebyggetAreal
          status
        }
      }
    }
  `;

  const data = await hentFraGraphql(config.bbrGraphqlBaseUrl, config.apiKey, query, {
    bygningID,
    tid
  });

  return data?.BBR_Bygning?.nodes || [];
}

async function hentGrundarealViaGraphql(jordstykkeID, tid, config) {
  const query = `
    query HentJordstykke($jordstykkeID: String!, $tid: DafDateTime) {
      MAT_Jordstykke(
        first: 5
        registreringstid: $tid
        virkningstid: $tid
        where: { id_lokalId: { eq: $jordstykkeID } }
      ) {
        nodes {
          id_lokalId
          registreretAreal
          status
        }
      }
    }
  `;

  const data = await hentFraGraphql(config.matGraphqlBaseUrl, config.apiKey, query, {
    jordstykkeID,
    tid
  });
  const jordstykke = data?.MAT_Jordstykke?.nodes?.[0] || null;

  return findFoersteTal(jordstykke?.registreretAreal);
}

async function hentGrundarealForBygningerViaGraphql(bygninger, tid, config) {
  const bygning = vaelgRelevantBygning(bygninger);
  const jordstykkeID = findFoersteVaerdiIObjekter([bygning], "jordstykke");
  return jordstykkeID ? hentMatJordstykkeArealViaGraphql(jordstykkeID, tid, config) : null;
}

async function hentMatJordstykkeArealViaGraphql(jordstykkeID, tid, config) {
  try {
    return await hentGrundarealViaGraphql(jordstykkeID, tid, config);
  } catch (error) {
    console.error("MAT-jordstykkeareal kunne ikke hentes:", error.message);
    return null;
  }
}

async function hentFraGraphql(baseUrl, apiKey, query, variables) {
  // Datafordelerens GraphQL-dokumentation bruger parameteren "apiKey".
  const url = `${baseUrl}?apiKey=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    const errorBody = await laesSvarBody(response);
    const error = new Error(`GraphQL svarede med status ${response.status}`);
    error.status = response.status;
    error.body = errorBody;
    throw error;
  }

  const result = await response.json();

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors.map((error) => error.message).join(" | "));
  }

  return result.data || {};
}

async function laesSvarBody(response) {
  try {
    return await response.json();
  } catch {
    try {
      return await response.text();
    } catch {
      return null;
    }
  }
}

function forklarDatafordelerFejl(error) {
  const detail = error?.body?.detail || "";
  const errorCode = error?.body?.errorCode || "";

  if (errorCode === "DAF-AUTH-0005" || detail.toLowerCase().includes("ip address is not verified")) {
    return `${error.message}. Datafordeler afviser IP-adressen. Tilfoej den offentlige IPv4-adresse til IP Allowlist paa IT-systemet i Datafordeler Administration.`;
  }

  if (erAdgangAfvist(error?.status)) {
    return `${error.message}. Tjek at BBR_USERNAME og BBR_PASSWORD er en gyldig Datafordeler tjenestebruger med adgang til BBR REST.`;
  }

  return error.message;
}

async function hentBygninger(adgangsadresseID, config) {
  // Datafordeler bruger normalt Husnummer for adgangsadresse-id'et.
  return hentFraDatafordelerMedFallback(
    "bygning",
    [
      { Husnummer: adgangsadresseID },
      { husnummer: adgangsadresseID }
    ],
    config
  );
}

async function hentEnheder(adresseID, config) {
  return hentFraDatafordelerMedFallback(
    "enhed",
    [
      { AdresseIdentificerer: adresseID },
      { adresseIdentificerer: adresseID }
    ],
    config
  );
}

async function hentBfeNumre(adresseID, adgangsadresseID, config) {
  if (!harDarBfeLogin(config)) {
    return [];
  }

  const bfeNumre = [];

  if (adresseID) {
    const adresseBfe = await hentFraDarBfe("adresseTilEnhedBfe", { adresseId: adresseID }, config);
    bfeNumre.push(...findAlleBfeNumre(adresseBfe));
  }

  if (adgangsadresseID) {
    const bygningBfe = await hentFraDarBfe(
      "husnummerTilBygningBfe",
      { husnummerId: adgangsadresseID },
      config
    );
    bfeNumre.push(...findAlleBfeNumre(bygningBfe));
  }

  return [...new Set(bfeNumre)];
}

async function hentGrundarealViaDataforsyningen(bfeNumre, adgangsadresseID) {
  const jordstykker = [];

  for (const bfeNummer of bfeNumre) {
    const data = await hentDataforsyningenListe(
      `https://api.dataforsyningen.dk/jordstykker?bfenummer=${encodeURIComponent(bfeNummer)}`
    );
    jordstykker.push(...data);
  }

  if (jordstykker.length === 0 && adgangsadresseID) {
    const adgangsadresse = await hentDataforsyningenObjekt(
      `https://api.dataforsyningen.dk/adgangsadresser/${encodeURIComponent(adgangsadresseID)}`
    );
    const jordstykkeUrl = adgangsadresse?.jordstykke?.href;

    if (jordstykkeUrl) {
      const jordstykke = await hentDataforsyningenObjekt(jordstykkeUrl);
      if (jordstykke) {
        jordstykker.push(jordstykke);
      }
    }
  }

  const arealer = jordstykker
    .map((jordstykke) => findFoersteTalIObjekter([jordstykke], "registreretareal", "registreretAreal"))
    .filter((areal) => areal !== null);

  if (arealer.length === 0) {
    return null;
  }

  return arealer.reduce((sum, areal) => sum + areal, 0);
}

async function hentDataforsyningenObjekt(url) {
  const response = await fetch(url);

  if (!response.ok) {
    console.error(`Dataforsyningen svarede med status ${response.status} for ${url}`);
    return null;
  }

  return response.json();
}

async function hentDataforsyningenListe(url) {
  const data = await hentDataforsyningenObjekt(url);
  return Array.isArray(data) ? data : [];
}

async function hentGrunde(bfeNumre, config) {
  for (const bfeNummer of bfeNumre) {
    let grunde = [];

    try {
      grunde = await hentFraDatafordeler("grund", { BFENummer: bfeNummer }, config);
    } catch (error) {
      console.error(`BBR grund kunne ikke hentes for BFE ${bfeNummer}:`, error.message);
      continue;
    }

    if (grunde.length > 0) {
      return grunde;
    }
  }

  return [];
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
  return normaliserBbrListe(data);
}

async function hentFraDatafordelerMedFallback(metode, parametreListe, config) {
  if (bbrRestAdgangAfvist) {
    return [];
  }

  for (const parametre of parametreListe) {
    const harVaerdi = Object.values(parametre).some(Boolean);

    if (!harVaerdi) {
      continue;
    }

    let data = [];

    try {
      data = await hentFraDatafordeler(metode, parametre, config);
    } catch (error) {
      if (erAdgangAfvist(error.status)) {
        bbrRestAdgangAfvist = true;
        console.error(`BBR REST-login afvist med status ${error.status}. REST-fallback springes over indtil serveren genstartes.`);
        return [];
      }

      console.error(`BBR ${metode} kunne ikke hentes med de valgte parametre:`, error.message);
      continue;
    }

    if (data.length > 0) {
      return data;
    }
  }

  return [];
}

async function hentFraDarBfe(metode, soegeParametre, config) {
  if (darBfeAdgangAfvist) {
    return [];
  }

  const baseUrl = config.darBfeBaseUrl.replace(/\/$/, "").replace("/REST", "/rest");

  const params = new URLSearchParams({
    ...soegeParametre,
    username: config.username,
    password: config.password,
    Format: "JSON"
  });

  const response = await fetch(`${baseUrl}/${metode}?${params.toString()}`);

  if (!response.ok) {
    if (erAdgangAfvist(response.status)) {
      darBfeAdgangAfvist = true;
      console.error(`DAR-BFE-login afvist med status ${response.status}. DAR-BFE-opslag springes over indtil serveren genstartes.`);
      return [];
    }

    console.error(`DAR-BFE ${metode} svarede med status ${response.status}`);
    return [];
  }

  const data = await response.json();
  return normaliserBbrListe(data);
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
    const error = new Error(`BBR ${metode} svarede med status ${response.status}`);
    error.status = response.status;
    error.body = await laesSvarBody(response);
    throw error;
  }

  const data = await response.json();
  return normaliserBbrListe(data);
}

function erAdgangAfvist(status) {
  return status === 401 || status === 403;
}

function lavBbrOverblik(bygninger, enheder, grunde) {
  const bygning = vaelgRelevantBygning(bygninger);
  const enhed = enheder[0] || {};
  const bbrVurdering = vurderEjendomsprofilMulighed(bygninger, enheder);
  const grund = grunde[0] || {};
  const enhedTypeKode = findFoersteTalIObjekter(
    [enhed],
    "enh023Boligtype",
    "enh020EnhedensAnvendelse"
  );
  const bygningTypeKode = findFoersteTalIObjekter([bygning], "byg021BygningensAnvendelse");
  const boligtype = findFoersteVaerdi(
    findFoersteVaerdiIObjekter(
      [enhed],
      "EnhedAnvendelseTekst",
      "enh023BoligtypeTekst",
      "enh020EnhedensAnvendelseTekst"
    ),
    ENHED_BOLIGTYPE[enhedTypeKode],
    findFoersteVaerdiIObjekter([bygning], "BygningAnvendelseTekst", "byg021BygningensAnvendelseTekst"),
    BYGNING_ANVENDELSE[bygningTypeKode],
    enhedTypeKode,
    bygningTypeKode
  );

  return {
    boligtype: boligtype ? String(boligtype) : null,
    bygningAnvendelseKode: bygningTypeKode,
    bygningAnvendelseTekst: BYGNING_ANVENDELSE[bygningTypeKode] || null,
    kanOprettesSomEjendomsprofil: bbrVurdering.kanOprettes,
    afvisningsaarsag: bbrVurdering.aarsag,
    byggeaar: findFoersteTalIObjekter(
      [bygning],
      "byg026Opfoerelsesaar",
      "byg026Opførelsesår",
      "byg026Opførelsesaar",
      "byg026Opfoerelsesår"
    ),
    boligareal: findFoersteTalIObjekter(
      [enhed, bygning],
      "enh027ArealTilBeboelse",
      "enh026EnhedensSamledeAreal",
      "byg039BygningensSamledeBoligAreal",
      "byg039BygningensSamledeBoligareal",
      "byg038SamletBygningsareal"
    ),
    antalVaerelser: findFoersteTalIObjekter(
      [enhed],
      "enh031AntalVaerelser",
      "enh031AntalVærelser"
    ),
    grundareal: findFoersteTalIObjekter(
      [grund, bygning],
      "gru009SamletAreal",
      "grundareal",
      "Grundareal"
    )
  };
}

function vurderEjendomsprofilMulighedFraBbrData(bbrData) {
  if (!bbrData || typeof bbrData !== "object") {
    return {
      kanOprettes: true,
      aarsag: null
    };
  }

  if (typeof bbrData.kanOprettesSomEjendomsprofil === "boolean") {
    return {
      kanOprettes: bbrData.kanOprettesSomEjendomsprofil,
      aarsag: bbrData.afvisningsaarsag || null
    };
  }

  const bygningAnvendelseKode = findFoersteTal(
    bbrData.bygningAnvendelseKode,
    bbrData.byg021BygningensAnvendelse
  );

  if (!bygningAnvendelseKode) {
    return {
      kanOprettes: true,
      aarsag: null
    };
  }

  const bygningAnvendelseTekst =
    bbrData.bygningAnvendelseTekst ||
    BYGNING_ANVENDELSE[bygningAnvendelseKode] ||
    `BBR-kode ${bygningAnvendelseKode}`;

  return {
    kanOprettes: TILLADTE_BYGNINGSKODER_TIL_EJENDOMSPROFIL.has(bygningAnvendelseKode),
    aarsag: TILLADTE_BYGNINGSKODER_TIL_EJENDOMSPROFIL.has(bygningAnvendelseKode)
      ? null
      : `Adressen kan ikke bruges til en ejendomsprofil, fordi BBR registrerer den som ${bygningAnvendelseTekst}.`
  };
}

function vurderEjendomsprofilMulighed(bygninger, enheder) {
  const harBoligenhed = Array.isArray(enheder) && enheder.some((enhed) => {
    const boligtype = findFoersteTalIObjekter([enhed], "enh023Boligtype");
    return TILLADTE_ENHED_BOLIGTYPER_TIL_EJENDOMSPROFIL.has(boligtype);
  });

  if (harBoligenhed) {
    return {
      kanOprettes: true,
      aarsag: null
    };
  }

  const relevantBygning = vaelgRelevantBygning(bygninger);
  const bygningAnvendelseKode = findFoersteTalIObjekter(
    [relevantBygning],
    "byg021BygningensAnvendelse"
  );

  if (!bygningAnvendelseKode) {
    return {
      kanOprettes: true,
      aarsag: null
    };
  }

  return vurderEjendomsprofilMulighedFraBbrData({
    bygningAnvendelseKode,
    bygningAnvendelseTekst: findFoersteVaerdiIObjekter(
      [relevantBygning],
      "BygningAnvendelseTekst",
      "byg021BygningensAnvendelseTekst"
    )
  });
}

function vaelgRelevantBygning(bygninger) {
  if (!Array.isArray(bygninger) || bygninger.length === 0) {
    return {};
  }

  return [...bygninger].sort((a, b) => bygningScore(b) - bygningScore(a))[0] || {};
}

function bygningScore(bygning) {
  const anvendelse = findFoersteTalIObjekter([bygning], "byg021BygningensAnvendelse");
  const boligareal = findFoersteTalIObjekter(
    [bygning],
    "byg039BygningensSamledeBoligAreal",
    "byg039BygningensSamledeBoligareal"
  );
  const samletAreal = findFoersteTalIObjekter([bygning], "byg038SamletBygningsareal");
  const bebyggetAreal = findFoersteTalIObjekter([bygning], "byg041BebyggetAreal");
  const status = findFoersteTalIObjekter([bygning], "status");

  let score = 0;

  if (status === 6) score += 50;
  if (anvendelse >= 110 && anvendelse <= 190) score += 1000;
  if (anvendelse >= 510 && anvendelse <= 529) score += 900;
  if (anvendelse >= 910 && anvendelse <= 970) score -= 500;

  score += (boligareal || 0) * 3;
  score += samletAreal || 0;
  score += (bebyggetAreal || 0) / 10;

  return score;
}

function harBbrVaerdier(bbrData) {
  return Boolean(
    bbrData &&
    (bbrData.boligtype ||
      bbrData.byggeaar ||
      bbrData.boligareal ||
      bbrData.grundareal ||
      bbrData.antalVaerelser)
  );
}

function normaliserBbrListe(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.features)) {
    return data.features.map((feature) => feature.properties || feature).filter(Boolean);
  }

  if (data && Array.isArray(data.resultater)) {
    return data.resultater;
  }

  if (data && typeof data === "object") {
    return [data];
  }

  return [];
}

function findAlleBfeNumre(data) {
  const resultater = [];

  function gennemgaa(value) {
    if (!value || typeof value !== "object") {
      return;
    }

    for (const [key, indhold] of Object.entries(value)) {
      const normaliseretKey = normaliserKey(key);

      if (
        normaliseretKey.includes("bfenummer") ||
        normaliseretKey.includes("bfenr") ||
        normaliseretKey === "bfe" ||
        normaliseretKey === "samletfastejendom"
      ) {
        const nummer = Number(indhold);

        if (!Number.isNaN(nummer)) {
          resultater.push(nummer);
        }
      }

      if (indhold && typeof indhold === "object") {
        gennemgaa(indhold);
      }
    }
  }

  normaliserBbrListe(data).forEach(gennemgaa);
  return resultater;
}

function findFoersteVaerdiIObjekter(objekter, ...keys) {
  for (const objekt of objekter) {
    const value = findVaerdiIObjekt(objekt, keys);

    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }

  return null;
}

function findFoersteTalIObjekter(objekter, ...keys) {
  return findFoersteTal(findFoersteVaerdiIObjekter(objekter, ...keys));
}

function findVaerdiIObjekt(objekt, keys) {
  if (!objekt || typeof objekt !== "object") {
    return null;
  }

  const normaliseredeKeys = keys.map(normaliserKey);

  for (const [key, value] of Object.entries(objekt)) {
    if (normaliseredeKeys.includes(normaliserKey(key))) {
      return value;
    }
  }

  for (const value of Object.values(objekt)) {
    if (value && typeof value === "object") {
      const fundet = findVaerdiIObjekt(value, keys);

      if (fundet !== null && fundet !== undefined && fundet !== "") {
        return fundet;
      }
    }
  }

  return null;
}

function normaliserKey(key) {
  return String(key)
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "oe")
    .replaceAll("å", "aa")
    .replace(/[^a-z0-9]/g, "");
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
  hentBbrData,
  vurderEjendomsprofilMulighedFraBbrData
};
