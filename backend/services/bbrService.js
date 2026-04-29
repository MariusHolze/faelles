// Denne fil håndterer opslag i BBR via Datafordeler REST.
// Vi bruger én integrationsstrategi: DAWA-id'er -> BBR REST + DAR-BFE REST + Dataforsyningen jordstykker.

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

class BBRService {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.darBfeBaseUrl = config.darBfeBaseUrl;
    this.username = config.username;
    this.password = config.password;
  }

  harCredentials() {
    return Boolean(this.username && this.password && this.baseUrl && this.darBfeBaseUrl);
  }

  async hentBbrData(adresseID, adgangsadresseID) {
    if (!adresseID && !adgangsadresseID) {
      return {};
    }

    if (!this.harCredentials()) {
      console.error("BBR REST kræver BBR_USERNAME, BBR_PASSWORD, BBR_BASE_URL og DAR_BFE_BASE_URL i backend/.env");
      return {};
    }

    try {
      const enheder = adresseID ? await this.hentEnheder(adresseID) : [];
      const bygningerViaHusnummer = adgangsadresseID ? await this.hentBygninger(adgangsadresseID) : [];
      const bygningerViaEnhed = await this.hentBygningerFraEnheder(enheder);
      const bygninger = samlUnikkeBygninger(bygningerViaHusnummer, bygningerViaEnhed);
      const bfeNumre = await this.hentBfeNumre(adresseID, adgangsadresseID);
      const grundareal = await this.hentGrundarealViaDataforsyningen(bfeNumre, adgangsadresseID);

      return lavBbrOverblik(bygninger, enheder, grundareal ? [{ grundareal }] : []);
    } catch (error) {
      console.error("Fejl ved hentning af BBR-data via REST:", error.message);
      return {};
    }
  }

  async hentBygninger(adgangsadresseID) {
    return this.hentFraDatafordeler("bygning", { Husnummer: adgangsadresseID });
  }

  async hentEnheder(adresseID) {
    return this.hentFraDatafordeler("enhed", { AdresseIdentificerer: adresseID });
  }

  async hentBygningerFraEnheder(enheder) {
    const bygningIDs = [
      ...new Set(
        enheder
          .map((enhed) => findFoersteVaerdiIObjekter([enhed], "bygning"))
          .filter(Boolean)
      )
    ];
    const bygninger = [];

    for (const bygningID of bygningIDs) {
      const fundneBygninger = await this.hentFraDatafordeler("bygning", { id: bygningID });
      bygninger.push(...fundneBygninger);
    }

    return bygninger;
  }

  async hentBfeNumre(adresseID, adgangsadresseID) {
    const bfeNumre = [];

    if (adresseID) {
      const adresseBfe = await this.hentFraDarBfe("adresseTilEnhedBfe", { adresseId: adresseID });
      bfeNumre.push(...findAlleBfeNumre(adresseBfe));
    }

    if (adgangsadresseID) {
      const bygningBfe = await this.hentFraDarBfe("husnummerTilBygningBfe", { husnummerId: adgangsadresseID });
      bfeNumre.push(...findAlleBfeNumre(bygningBfe));
    }

    return [...new Set(bfeNumre)];
  }

  async hentGrundarealViaDataforsyningen(bfeNumre, adgangsadresseID) {
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
        if (jordstykke) jordstykker.push(jordstykke);
      }
    }

    const arealer = jordstykker
      .map((jordstykke) => findFoersteTalIObjekter([jordstykke], "registreretareal", "registreretAreal"))
      .filter((areal) => areal !== null);

    return arealer.length > 0 ? arealer.reduce((sum, areal) => sum + areal, 0) : null;
  }

  async hentFraDarBfe(metode, soegeParametre) {
    return hentFraRest(this.darBfeBaseUrl, metode, soegeParametre, this);
  }

  async hentFraDatafordeler(metode, soegeParametre) {
    return hentFraRest(this.baseUrl, metode, soegeParametre, this);
  }
}

function hentBbrConfig() {
  return {
    username: process.env.BBR_USERNAME,
    password: process.env.BBR_PASSWORD,
    baseUrl: process.env.BBR_BASE_URL || "https://services.datafordeler.dk/BBR/BBRPublic/1/rest",
    darBfeBaseUrl: process.env.DAR_BFE_BASE_URL || "https://services.datafordeler.dk/DAR/DAR_BFE_Public/1/rest"
  };
}

async function hentBbrData(adresseID, adgangsadresseID) {
  const service = new BBRService(hentBbrConfig());
  return service.hentBbrData(adresseID, adgangsadresseID);
}

function samlUnikkeBygninger(...lister) {
  const bygninger = [];
  const seteNoegler = new Set();

  for (const liste of lister) {
    for (const bygning of liste) {
      const noegle = findFoersteVaerdiIObjekter([bygning], "id_lokalId", "id", "bygning") || JSON.stringify(bygning);

      if (!seteNoegler.has(noegle)) {
        seteNoegler.add(noegle);
        bygninger.push(bygning);
      }
    }
  }

  return bygninger;
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

async function hentFraRest(baseUrlFraConfig, metode, soegeParametre, config) {
  const baseUrl = normaliserRestUrl(baseUrlFraConfig);
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

function normaliserRestUrl(url) {
  return url.replace(/\/$/, "").replace("/REST", "/rest");
}

function lavBbrOverblik(bygninger, enheder, grunde) {
  const bygning = vaelgRelevantBygning(bygninger);
  const enhed = enheder[0] || {};
  const bbrVurdering = vurderEjendomsprofilMulighed(bygninger, enheder);
  const grund = grunde[0] || {};
  const enhedTypeKode = findFoersteTalIObjekter([enhed], "enh023Boligtype", "enh020EnhedensAnvendelse");
  const bygningTypeKode = findFoersteTalIObjekter([bygning], "byg021BygningensAnvendelse");
  const boligtype = findFoersteVaerdi(
    findFoersteVaerdiIObjekter([enhed], "EnhedAnvendelseTekst", "enh023BoligtypeTekst", "enh020EnhedensAnvendelseTekst"),
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
    byggeaar: findFoersteTalIObjekter([bygning], "byg026Opfoerelsesaar", "byg026Opførelsesår", "byg026Opførelsesaar", "byg026Opfoerelsesår"),
    boligareal: findFoersteTalIObjekter([enhed, bygning], "enh027ArealTilBeboelse", "enh026EnhedensSamledeAreal", "byg039BygningensSamledeBoligAreal", "byg039BygningensSamledeBoligareal", "byg038SamletBygningsareal"),
    antalVaerelser: findFoersteTalIObjekter([enhed], "enh031AntalVaerelser", "enh031AntalVærelser"),
    grundareal: findFoersteTalIObjekter([grund], "grundareal", "registreretareal", "registreretAreal")
  };
}

function vurderEjendomsprofilMulighedFraBbrData(bbrData) {
  if (!bbrData || typeof bbrData !== "object") {
    return { kanOprettes: true, aarsag: null };
  }

  if (typeof bbrData.kanOprettesSomEjendomsprofil === "boolean") {
    return {
      kanOprettes: bbrData.kanOprettesSomEjendomsprofil,
      aarsag: bbrData.afvisningsaarsag || null
    };
  }

  const bygningAnvendelseKode = findFoersteTal(bbrData.bygningAnvendelseKode, bbrData.byg021BygningensAnvendelse);
  if (!bygningAnvendelseKode) {
    return {
      kanOprettes: false,
      aarsag: "Adressen kan ikke bruges til en ejendomsprofil, fordi BBR ikke returnerer en boligenhed eller boligbygning for adressen."
    };
  }

  const bygningAnvendelseTekst = bbrData.bygningAnvendelseTekst || BYGNING_ANVENDELSE[bygningAnvendelseKode] || `BBR-kode ${bygningAnvendelseKode}`;
  const kanOprettes = TILLADTE_BYGNINGSKODER_TIL_EJENDOMSPROFIL.has(bygningAnvendelseKode);

  return {
    kanOprettes,
    aarsag: kanOprettes ? null : `Adressen kan ikke bruges til en ejendomsprofil, fordi BBR registrerer den som ${bygningAnvendelseTekst}.`
  };
}

function vurderEjendomsprofilMulighed(bygninger, enheder) {
  const harBoligenhed = Array.isArray(enheder) && enheder.some((enhed) => {
    const boligtype = findFoersteTalIObjekter([enhed], "enh023Boligtype");
    return TILLADTE_ENHED_BOLIGTYPER_TIL_EJENDOMSPROFIL.has(boligtype);
  });

  if (harBoligenhed) {
    return { kanOprettes: true, aarsag: null };
  }

  const relevantBygning = vaelgRelevantBygning(bygninger);
  const bygningAnvendelseKode = findFoersteTalIObjekter([relevantBygning], "byg021BygningensAnvendelse");

  if (!bygningAnvendelseKode) {
    return { kanOprettes: true, aarsag: null };
  }

  return vurderEjendomsprofilMulighedFraBbrData({
    bygningAnvendelseKode,
    bygningAnvendelseTekst: findFoersteVaerdiIObjekter([relevantBygning], "BygningAnvendelseTekst", "byg021BygningensAnvendelseTekst")
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
  const boligareal = findFoersteTalIObjekter([bygning], "byg039BygningensSamledeBoligAreal", "byg039BygningensSamledeBoligareal");
  const samletAreal = findFoersteTalIObjekter([bygning], "byg038SamletBygningsareal");
  const status = findFoersteTalIObjekter([bygning], "status");

  let score = 0;
  if (status === 6) score += 50;
  if (anvendelse >= 110 && anvendelse <= 190) score += 1000;
  if (anvendelse >= 510 && anvendelse <= 529) score += 900;
  score += (boligareal || 0) * 3;
  score += samletAreal || 0;

  return score;
}

function normaliserListe(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.resultater)) return data.resultater;
  if (data && Array.isArray(data.features)) return data.features.map((feature) => feature.properties || feature).filter(Boolean);
  if (data && typeof data === "object") return [data];
  return [];
}

function findAlleBfeNumre(data) {
  const resultater = [];

  function gennemgaa(value) {
    if (!value || typeof value !== "object") return;

    for (const [key, indhold] of Object.entries(value)) {
      const normaliseretKey = normaliserKey(key);

      if (
        normaliseretKey.includes("bfenummer") ||
        normaliseretKey.includes("bfenr") ||
        normaliseretKey === "bfe" ||
        normaliseretKey === "samletfastejendom"
      ) {
        const nummer = Number(indhold);
        if (!Number.isNaN(nummer)) resultater.push(nummer);
      }

      if (indhold && typeof indhold === "object") gennemgaa(indhold);
    }
  }

  normaliserListe(data).forEach(gennemgaa);
  return resultater;
}

function findFoersteVaerdiIObjekter(objekter, ...keys) {
  for (const objekt of objekter) {
    const value = findVaerdiIObjekt(objekt, keys);
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
}

function findFoersteTalIObjekter(objekter, ...keys) {
  return findFoersteTal(findFoersteVaerdiIObjekter(objekter, ...keys));
}

function findVaerdiIObjekt(objekt, keys) {
  if (!objekt || typeof objekt !== "object") return null;
  const normaliseredeKeys = keys.map(normaliserKey);

  for (const [key, value] of Object.entries(objekt)) {
    if (normaliseredeKeys.includes(normaliserKey(key))) return value;
  }

  for (const value of Object.values(objekt)) {
    if (value && typeof value === "object") {
      const fundet = findVaerdiIObjekt(value, keys);
      if (fundet !== null && fundet !== undefined && fundet !== "") return fundet;
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
  if (value === null || value === undefined || value === "") return null;

  const tal = Number(value);
  return Number.isNaN(tal) ? null : tal;
}

module.exports = {
  BBRService,
  hentBbrData,
  vurderEjendomsprofilMulighedFraBbrData
};
