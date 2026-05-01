// Enkel BBR-service til ejendomsprofiler.
// Input er DAWA-id'er fra frontend. Output er de felter, routes gemmer i databasen.

const BYGNING_ANVENDELSE = {
  110: "Stuehus til landbrugsejendom",
  120: "Fritliggende enfamiliehus",
  121: "Sammenbygget enfamiliehus",
  122: "Fritliggende enfamiliehus i tæt-lav bebyggelse",
  130: "Række-, kæde- eller dobbelthus",
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

const TILLADTE_BYGNINGSKODER = new Set(Object.keys(BYGNING_ANVENDELSE).map(Number));

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
    const kanOprettes = harBoligEnhed(enheder) || harBoligBygning(bygninger);
    const valgtEnhed = vaelgRelevantEnhed(enheder);
    const valgtBygning = vaelgRelevantBygning(bygninger);
    const adgangsadresse = adgangsadresseID ? await hentAdgangsadresse(adgangsadresseID) : null;
    let grundareal = null;

    try {
      grundareal = await hentGrundareal(adgangsadresse);
    } catch (error) {
      console.warn("Kunne ikke hente grundareal:", error.message);
    }

    return lavBbrOverblik(valgtEnhed, valgtBygning, adgangsadresse, grundareal, kanOprettes);
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

function lavBbrOverblik(enhed, bygning, adgangsadresse, grundareal, kanOprettes) {
  const enhedTypeKode = tal(enhed.enh023Boligtype);
  const bygningTypeKode = tal(bygning.byg021BygningensAnvendelse);
  const bygningAnvendelseTekst = BYGNING_ANVENDELSE[bygningTypeKode] || null;

  return {
    adresse: tekst(adgangsadresse?.adressebetegnelse || adgangsadresse?.betegnelse),
    boligtype: tekst(
      enhed.EnhedAnvendelseTekst ||
      enhed.enh023BoligtypeTekst ||
      enhed.enh020EnhedensAnvendelseTekst ||
      ENHED_BOLIGTYPE[enhedTypeKode] ||
      bygning.BygningAnvendelseTekst ||
      bygning.byg021BygningensAnvendelseTekst ||
      bygningAnvendelseTekst
    ),
    bygningAnvendelseKode: bygningTypeKode,
    bygningAnvendelseTekst,
    kanOprettesSomEjendomsprofil: kanOprettes,
    afvisningsaarsag: kanOprettes ? null : "Adressen kan ikke bruges til en ejendomsprofil, fordi BBR ikke viser boligdata for adressen.",
    byggeaar: tal(bygning.byg026Opfoerelsesaar ?? bygning.byg026Opførelsesår),
    boligareal: tal(
      enhed.enh027ArealTilBeboelse ??
      enhed.enh026EnhedensSamledeAreal ??
      bygning.byg039BygningensSamledeBoligAreal ??
      bygning.byg039BygningensSamledeBoligareal ??
      bygning.byg038SamletBygningsareal
    ),
    antalVaerelser: tal(enhed.enh031AntalVaerelser ?? enhed.enh031AntalVærelser),
    grundareal
  };
}

function harBoligEnhed(enheder) {
  return Array.isArray(enheder) && enheder.some((enhed) =>
    tal(enhed.enh023Boligtype) !== null
  );
}

function harBoligBygning(bygninger) {
  return Array.isArray(bygninger) && bygninger.some((bygning) =>
    TILLADTE_BYGNINGSKODER.has(tal(bygning.byg021BygningensAnvendelse))
  );
}

function vaelgRelevantEnhed(enheder) {
  if (!Array.isArray(enheder) || enheder.length === 0) {
    return {};
  }

  return enheder.find((enhed) =>
    tal(enhed.enh023Boligtype) !== null
  ) || enheder[0] || {};
}

function vaelgRelevantBygning(bygninger) {
  if (!Array.isArray(bygninger) || bygninger.length === 0) {
    return {};
  }

  const boligbygninger = bygninger.filter((bygning) =>
    TILLADTE_BYGNINGSKODER.has(tal(bygning.byg021BygningensAnvendelse))
  );

  const kandidater = boligbygninger.length > 0 ? boligbygninger : bygninger;

  return kandidater.reduce((stoerste, bygning) =>
    bygningAreal(bygning) > bygningAreal(stoerste) ? bygning : stoerste
  );
}

function bygningAreal(bygning) {
  return tal(
    bygning.byg038SamletBygningsareal ??
    bygning.byg039BygningensSamledeBoligAreal ??
    bygning.byg039BygningensSamledeBoligareal
  ) || 0;
}

function vurderEjendomsprofilMulighedFraBbrData(bbrData) {
  return {
    kanOprettes: bbrData?.kanOprettesSomEjendomsprofil === true,
    aarsag: bbrData?.afvisningsaarsag || null
  };
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

function tal(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function tekst(value) {
  return value === null || value === undefined || value === "" ? null : String(value);
}

module.exports = {
  hentBbrData,
  vurderEjendomsprofilMulighedFraBbrData
};
