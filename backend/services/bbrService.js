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
  211: "Stald til svin",
  212: "Stald til kvæg, får mv.",
  213: "Stald til fjerkræ",
  214: "Minkhal",
  215: "Væksthus",
  216: "Lade til foder, afgrøder mv.",
  217: "Maskinhus, garage mv.",
  218: "Lade til halm, hø mv.",
  219: "Anden bygning til landbrug mv.",
  221: "Bygning til industri med integreret produktionsapparat",
  222: "Bygning til industri uden integreret produktionsapparat",
  223: "Værksted",
  229: "Anden bygning til produktion",
  231: "Bygning til energiproduktion",
  232: "Bygning til energidistribution",
  233: "Bygning til vandforsyning",
  234: "Bygning til håndtering af affald og spildevand",
  239: "Anden bygning til energiproduktion og forsyning",
  311: "Bygning til jernbane- og busdrift",
  312: "Bygning til luftfart",
  313: "Bygning til parkering- og transportanlæg",
  314: "Bygning til parkering af flere end to køretøjer i tilknytning til boliger",
  315: "Havneanlæg",
  319: "Andet transportanlæg",
  321: "Bygning til kontor",
  322: "Bygning til detailhandel",
  323: "Bygning til lager",
  324: "Butikscenter",
  325: "Tankstation",
  329: "Anden bygning til kontor, handel og lager",
  331: "Hotel, kro eller konferencecenter med overnatning",
  332: "Bed & breakfast mv.",
  333: "Restaurant, cafe og konferencecenter uden overnatning",
  334: "Privat servicevirksomhed",
  339: "Anden bygning til serviceerhverv",
  411: "Biograf, teater, koncertsted mv.",
  412: "Museum",
  413: "Bibliotek",
  414: "Kirke eller anden bygning til trosudøvelse",
  415: "Forsamlingshus",
  416: "Forlystelsespark",
  419: "Anden bygning til kulturelle formål",
  421: "Grundskole",
  422: "Universitet",
  429: "Anden bygning til undervisning og forskning",
  431: "Hospital og sygehus",
  432: "Hospice, behandlingshjem mv.",
  433: "Sundhedscenter, lægehus, fødeklinik mv.",
  439: "Anden bygning til sundhedsformål",
  441: "Daginstitution",
  442: "Servicefunktion på døgninstitution",
  443: "Kaserne",
  444: "Fængsel, arresthus mv.",
  449: "Anden bygning til institutionsformål",
  451: "Beskyttelsesrum",
  510: "Sommerhus",
  521: "Feriecenter, center til campingplads mv.",
  522: "Bygning med ferielejligheder til erhvervsmæssig udlejning",
  523: "Bygning med ferielejligheder til eget brug",
  529: "Anden bygning til ferieformål",
  531: "Klubhus i forbindelse med fritid og idræt",
  532: "Svømmehal",
  533: "Idrætshal",
  534: "Tribune i forbindelse med stadion",
  535: "Bygning til træning og opstaldning af heste",
  539: "Anden bygning til idrætformål",
  540: "Kolonihavehus",
  585: "Anneks i tilknytning til fritids- og sommerhus",
  590: "Anden bygning til fritidsformål",
  910: "Garage",
  920: "Carport",
  930: "Udhus",
  940: "Drivhus",
  950: "Fritliggende overdækning",
  960: "Fritliggende udestue",
  970: "Tiloversbleven landbrugsbygning",
  990: "Faldefærdig bygning",
  999: "Ukendt bygning"
};

const ENHED_BOLIGTYPE = {
  1: "Egentlig beboelseslejlighed",
  2: "Blandet erhverv og bolig",
  3: "Enkeltværelse",
  4: "Fællesbolig",
  5: "Sommer-/fritidsbolig"
};

function hentBbrConfig() {
  return {
    username: process.env.BBR_USERNAME,
    password: process.env.BBR_PASSWORD,
    baseUrl: process.env.BBR_BASE_URL,
    apiKey: process.env.BBR_API_KEY,
    wfsBaseUrl: process.env.BBR_WFS_BASE_URL,
    darBfeBaseUrl: process.env.DAR_BFE_BASE_URL || "https://services.datafordeler.dk/DAR/DAR_BFE_Public/1/rest",
    bbrGraphqlBaseUrl: process.env.BBR_GRAPHQL_BASE_URL || "https://graphql.datafordeler.dk/BBR/v1",
    matGraphqlBaseUrl: process.env.MAT_GRAPHQL_BASE_URL || "https://graphql.datafordeler.dk/MAT/v1"
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

  if (harBbrGraphql(config)) {
    try {
      const bbrOverblik = await hentBbrDataViaGraphql(adresseID, adgangsadresseID, config);

      if (harBbrVaerdier(bbrOverblik)) {
        return bbrOverblik;
      }
    } catch (error) {
      console.error("Fejl ved hentning af BBR-data via GraphQL:", error.message);
    }
  }

  if (harBbrLogin(config)) {
    try {
      const bygninger = await hentBygninger(adgangsadresseID, config);
      const enheder = await hentEnheder(adresseID, config);
      const bfeNumre = await hentBfeNumre(adresseID, adgangsadresseID, config);
      const grunde = await hentGrunde(bfeNumre, config);
      const bbrOverblik = lavBbrOverblik(bygninger, enheder, grunde);

      if (harBbrVaerdier(bbrOverblik)) {
        return bbrOverblik;
      }
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

async function hentBbrDataViaGraphql(adresseID, adgangsadresseID, config) {
  const tid = new Date().toISOString();
  const enheder = adresseID ? await hentEnhederViaGraphql(adresseID, tid, config) : [];
  let bygninger = adgangsadresseID ? await hentBygningerViaGraphql(adgangsadresseID, tid, config) : [];

  if (bygninger.length === 0 && enheder.length > 0) {
    bygninger = await hentBygningerForEnhederViaGraphql(enheder, tid, config);
  }

  const jordstykkeID = findFoersteVaerdiIObjekter(bygninger, "jordstykke");
  const grundareal = jordstykkeID ? await hentGrundarealViaGraphql(jordstykkeID, tid, config) : null;
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

async function hentFraGraphql(baseUrl, apiKey, query, variables) {
  const url = `${baseUrl}?apikey=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`GraphQL svarede med status ${response.status}`);
  }

  const result = await response.json();

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors.map((error) => error.message).join(" | "));
  }

  return result.data || {};
}

async function hentBygninger(adgangsadresseID, config) {
  // Datafordeler bruger normalt Husnummer for adgangsadresse-id'et.
  return hentFraDatafordelerMedFallback(
    "bygning",
    [
      { Husnummer: adgangsadresseID },
      { husnummer: adgangsadresseID },
      { AdgangTilOpgang: adgangsadresseID },
      { adgangTilOpgang: adgangsadresseID }
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
  for (const parametre of parametreListe) {
    const harVaerdi = Object.values(parametre).some(Boolean);

    if (!harVaerdi) {
      continue;
    }

    let data = [];

    try {
      data = await hentFraDatafordeler(metode, parametre, config);
    } catch (error) {
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
  const baseUrl = config.darBfeBaseUrl.replace(/\/$/, "").replace("/REST", "/rest");

  const params = new URLSearchParams({
    ...soegeParametre,
    username: config.username,
    password: config.password,
    Format: "JSON"
  });

  const response = await fetch(`${baseUrl}/${metode}?${params.toString()}`);

  if (!response.ok) {
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
    throw new Error(`BBR ${metode} svarede med status ${response.status}`);
  }

  const data = await response.json();
  return normaliserBbrListe(data);
}

function lavBbrOverblik(bygninger, enheder, grunde) {
  const bygning = vaelgRelevantBygning(bygninger);
  const enhed = enheder[0] || {};
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
        normaliseretKey === "bfe"
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
  hentBbrData
};
