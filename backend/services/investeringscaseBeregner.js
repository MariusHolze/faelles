const GYLDIGE_TRIN = [
  "koebsudgifter",
  "finansiering",
  "renovering",
  "driftsbudget",
  "udlejning"
];

function lavTomCaseData() {
  return {
    koebsudgifter: {},
    finansiering: {},
    renovering: {},
    driftsbudget: {},
    udlejning: {}
  };
}

function parseJson(value) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function mergeTrinData(eksisterendeData, trin, data) {
  return {
    ...lavTomCaseData(),
    ...(eksisterendeData || {}),
    [trin]: data || {}
  };
}

function tal(value) {
  const nummer = Number(value);
  return Number.isNaN(nummer) ? 0 : nummer;
}

function harData(data) {
  if (!data || typeof data !== "object") {
    return false;
  }

  return Object.values(data).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return value !== "" && value !== null && value !== undefined;
  });
}

function hentKoebsposter(data) {
  const poster = Array.isArray(data?.poster) ? data.poster : [];

  return poster
    .map((post) => ({
      navn: String(post.navn || "").trim(),
      beloeb: Number(post.beloeb)
    }))
    .filter((post) => post.navn && !Number.isNaN(post.beloeb) && post.beloeb >= 0);
}

function hentRenoveringsposter(data) {
  if (!data || data.aktiv === false) {
    return [];
  }

  const poster = Array.isArray(data.poster) ? data.poster : [];

  return poster
    .map((post) => ({
      navn: String(post.navn || "").trim(),
      beloeb: Number(post.beloeb),
      tidspunktMaaned: post.tidspunktMaaned === "" || post.tidspunktMaaned === undefined
        ? null
        : Number(post.tidspunktMaaned)
    }))
    .filter((post) => post.navn && !Number.isNaN(post.beloeb) && post.beloeb >= 0);
}

function hentDriftsposter(data) {
  const poster = Array.isArray(data?.poster) ? data.poster : [];

  return poster
    .map((post) => ({
      navn: String(post.navn || "").trim(),
      beloeb: Number(post.beloeb),
      periode: post.periode === "maanedligt" ? "maanedligt" : "aarligt"
    }))
    .filter((post) => post.navn && !Number.isNaN(post.beloeb) && post.beloeb > 0);
}

function beregnDriftsudgifter(poster) {
  return poster.reduce((totaler, post) => {
    if (post.periode === "maanedligt") {
      totaler.maanedligt += post.beloeb;
      totaler.aarligt += post.beloeb * 12;
    } else {
      totaler.aarligt += post.beloeb;
      totaler.maanedligt += post.beloeb / 12;
    }

    return totaler;
  }, { maanedligt: 0, aarligt: 0 });
}

function beregnMaanedligYdelse(laanebeloeb, rente, loebetid, afdragsfrihed) {
  const hovedstol = Math.max(0, tal(laanebeloeb));
  const maanedligRente = (tal(rente) / 100) / 12;
  const antalMaaneder = tal(loebetid) * 12;

  if (hovedstol <= 0 || antalMaaneder <= 0) {
    return 0;
  }

  // Ved afdragsfrihed viser vi første ydelse som rente-only.
  if (tal(afdragsfrihed) > 0) {
    return hovedstol * maanedligRente;
  }

  if (maanedligRente === 0) {
    return hovedstol / antalMaaneder;
  }

  return hovedstol * (maanedligRente / (1 - Math.pow(1 + maanedligRente, -antalMaaneder)));
}

function beregnSamletRenteomkostning(laanebeloeb, rente, loebetid, afdragsfrihed) {
  const hovedstol = Math.max(0, tal(laanebeloeb));
  const maanedligRente = (tal(rente) / 100) / 12;
  const antalMaaneder = tal(loebetid) * 12;
  const afdragsfriMaaneder = Math.min(antalMaaneder, tal(afdragsfrihed) * 12);
  const afviklingsMaaneder = Math.max(0, antalMaaneder - afdragsfriMaaneder);

  if (hovedstol <= 0 || antalMaaneder <= 0) {
    return 0;
  }

  const renteOnlyYdelse = maanedligRente === 0 ? 0 : hovedstol * maanedligRente;
  const amortiseretYdelse = afviklingsMaaneder <= 0
    ? 0
    : maanedligRente === 0
      ? hovedstol / afviklingsMaaneder
      : hovedstol * (maanedligRente / (1 - Math.pow(1 + maanedligRente, -afviklingsMaaneder)));

  return Math.max(0, (renteOnlyYdelse * afdragsfriMaaneder) +
    (amortiseretYdelse * afviklingsMaaneder) -
    hovedstol);
}

function beregnRestgaeldEfterAar(startGaeld, rente, loebetid, afdragsfrihed, aar) {
  const hovedstol = Math.max(0, tal(startGaeld));
  const maanedligRente = (tal(rente) / 100) / 12;
  const totalMaaneder = Math.max(0, tal(loebetid) * 12);
  const afdragsfriMaaneder = Math.min(totalMaaneder, Math.max(0, tal(afdragsfrihed) * 12));
  const maaned = Math.min(totalMaaneder, Math.max(0, tal(aar) * 12));
  const afviklingsMaaneder = Math.max(0, totalMaaneder - afdragsfriMaaneder);

  if (hovedstol <= 0 || totalMaaneder <= 0 || maaned >= totalMaaneder) {
    return 0;
  }

  if (maaned <= afdragsfriMaaneder) {
    return hovedstol;
  }

  const betalteMaaneder = maaned - afdragsfriMaaneder;

  if (maanedligRente === 0) {
    return Math.max(0, hovedstol - (hovedstol / afviklingsMaaneder) * betalteMaaneder);
  }

  const ydelse = hovedstol * (maanedligRente / (1 - Math.pow(1 + maanedligRente, -afviklingsMaaneder)));
  const restgaeld = (hovedstol * Math.pow(1 + maanedligRente, betalteMaaneder)) -
    (ydelse * ((Math.pow(1 + maanedligRente, betalteMaaneder) - 1) / maanedligRente));

  return Math.max(0, restgaeld);
}

function findEjendomspris(poster, standardvaerdi) {
  const post = poster.find((item) =>
    item.navn.toLowerCase().replaceAll("æ", "ae").replaceAll("ø", "oe").replaceAll("å", "aa") === "ejendomspris"
  );

  return Math.max(0, tal(post?.beloeb || standardvaerdi));
}

function beregnNoegletalOverTid({
  antalAar = 30,
  ejendomspris,
  finansieringsbehov,
  rente,
  loebetid,
  afdragsfrihed,
  aarligtCashflowEfterLaaneydelse
}) {
  return Array.from({ length: antalAar }, (_, index) => {
    const aar = index + 1;
    // Konservativ model: ejendomsværdien sættes til købsprisen og fremskrives ikke.
    const ejendomsvaerdi = Math.max(0, tal(ejendomspris));
    const restgaeld = beregnRestgaeldEfterAar(finansieringsbehov, rente, loebetid, afdragsfrihed, aar);
    const akkumuleretCashflow = tal(aarligtCashflowEfterLaaneydelse) * aar;

    // Egenkapital i ejendom er ejendomsværdi minus restgæld.
    const egenkapitalIEjendom = ejendomsvaerdi - restgaeld;

    return {
      aar,
      ejendomsvaerdi,
      restgaeld,
      gaeld: restgaeld,
      egenkapitalIEjendom,
      akkumuleretCashflow,
      samletInvestorVaerdi: egenkapitalIEjendom + akkumuleretCashflow
    };
  });
}

class InvesteringscaseBeregner {
  constructor(trinData) {
    this.trinData = {
      ...lavTomCaseData(),
      ...(trinData || {})
    };
  }

  beregnAnalyse() {
    return beregnAnalyseForTrinData(this);
  }

  beregnSamletInvestering(koebsposter, renoveringsposter) {
    const koebsudgifterIAlt = koebsposter.reduce((sum, post) => sum + post.beloeb, 0);
    const renoveringIAlt = renoveringsposter.reduce((sum, post) => sum + post.beloeb, 0);

    return {
      koebsudgifterIAlt,
      renoveringIAlt,
      samletInvestering: koebsudgifterIAlt + renoveringIAlt
    };
  }

  beregnFinansiering(samletInvestering, egenbetaling) {
    const finansieringsbehov = Math.max(0, samletInvestering - tal(egenbetaling));

    return {
      finansieringsbehov,
      egenkapitalBehov: Math.max(0, samletInvestering - finansieringsbehov)
    };
  }

  beregnCashflow(resultatFoerFinansiering, ydelseAarligt) {
    // Ydelsen kan indeholde afdrag, så dette er cashflow og ikke regnskabsmæssigt resultat.
    return resultatFoerFinansiering - ydelseAarligt;
  }

  beregnNoegletalOverTid(input) {
    return beregnNoegletalOverTid(input);
  }
}

function beregnAnalyse(trinData) {
  const beregner = new InvesteringscaseBeregner(trinData);
  return beregner.beregnAnalyse();
}

function beregnAnalyseForTrinData(beregner) {
  const trinData = beregner.trinData;
  const koeb = trinData.koebsudgifter || {};
  const finansiering = trinData.finansiering || {};
  const renovering = trinData.renovering || {};
  const drift = trinData.driftsbudget || {};
  const udlejning = trinData.udlejning || {};

  const koebsposter = hentKoebsposter(koeb);
  const renoveringsposter = hentRenoveringsposter(renovering);
  const driftsposter = hentDriftsposter(drift);
  const investering = beregner.beregnSamletInvestering(koebsposter, renoveringsposter);
  const koebsudgifterIAlt = investering.koebsudgifterIAlt;
  const renoveringIAlt = investering.renoveringIAlt;
  const samletInvestering = investering.samletInvestering;
  const finansieringstal = beregner.beregnFinansiering(samletInvestering, finansiering.egenbetaling);
  const finansieringsbehov = finansieringstal.finansieringsbehov;
  const egenkapitalBehov = finansieringstal.egenkapitalBehov;

  const driftsudgifter = beregnDriftsudgifter(driftsposter);
  const lejeAarligt = udlejning.aktiv === false ? 0 : tal(udlejning.maanedligLeje) * 12;
  const tomgangDage = Math.min(365, Math.max(0, tal(udlejning.tomgangDage)));
  const tomgangBeloeb = lejeAarligt * (tomgangDage / 365);
  const lejeEfterTomgang = lejeAarligt - tomgangBeloeb;
  const lejeudgifterAarligt = udlejning.aktiv === false
    ? 0
    : (tal(udlejning.maanedligeUdlejningsudgifter) * 12) + tal(udlejning.aarligeUdlejningsudgifter);
  const nettoLejeAarligt = lejeEfterTomgang - lejeudgifterAarligt;

  // Skat er kun et simpelt estimat til prototypen.
  const skattefritBeloeb = Math.max(0, nettoLejeAarligt) * 0.4;
  const skattepligtigtBeloeb = Math.max(0, nettoLejeAarligt - skattefritBeloeb);
  const skatBeloeb = skattepligtigtBeloeb * 0.42;
  const lejeEfterSkatAarligt = nettoLejeAarligt - skatBeloeb;

  const maanedligYdelse = beregnMaanedligYdelse(
    finansieringsbehov,
    finansiering.rente,
    finansiering.loebetid,
    finansiering.afdragsfrihed
  );
  const ydelseAarligt = maanedligYdelse * 12;
  const renteudgiftAarligt = finansieringsbehov * (tal(finansiering.rente) / 100);
  const samletRenteomkostning = beregnSamletRenteomkostning(
    finansieringsbehov,
    finansiering.rente,
    finansiering.loebetid,
    finansiering.afdragsfrihed
  );

  const resultatFoerFinansiering = nettoLejeAarligt - driftsudgifter.aarligt;
  const aarligtResultatEfterRente = resultatFoerFinansiering - renteudgiftAarligt;
  const aarligtCashflowEfterLaaneydelse = beregner.beregnCashflow(resultatFoerFinansiering, ydelseAarligt);
  const ejendomspris = findEjendomspris(koebsposter, koebsudgifterIAlt);
  const noegletalOverTid = beregner.beregnNoegletalOverTid({
    ejendomspris,
    finansieringsbehov,
    rente: finansiering.rente,
    loebetid: finansiering.loebetid,
    afdragsfrihed: finansiering.afdragsfrihed,
    aarligtCashflowEfterLaaneydelse
  });
  const antalUdfyldteTrin = GYLDIGE_TRIN.filter((trin) => harData(trinData[trin])).length;
  const naesteTrin = GYLDIGE_TRIN.find((trin) => !harData(trinData[trin])) || "koebsudgifter";

  return {
    antalKoebsposter: koebsposter.length,
    antalRenoveringsposter: renoveringsposter.length,
    antalDriftsposter: driftsposter.length,
    koebsudgifterIAlt,
    renoveringIAlt,
    samletInvestering,
    finansieringsbehov,
    egenkapitalBehov,
    ejendomspris,
    ejendomsvaerdiStart: ejendomspris,
    ejendomsvaerdiNote: "Konservativt estimat: ejendomsværdi fremskrives ikke, og købsprisen bruges som fast værdi.",
    driftsudgifterMaanedligt: driftsudgifter.maanedligt,
    driftsudgifterAarligt: driftsudgifter.aarligt,
    lejeAarligt,
    tomgangDage,
    tomgangBeloeb,
    lejeEfterTomgang,
    lejeudgifterMaanedligt: lejeudgifterAarligt / 12,
    lejeudgifterAarligt,
    nettoLejeMaanedligt: nettoLejeAarligt / 12,
    nettoLejeAarligt,
    skattefritBeloeb,
    skattepligtigtBeloeb,
    skatBeloeb,
    lejeEfterSkatMaanedligt: lejeEfterSkatAarligt / 12,
    lejeEfterSkatAarligt,
    renteudgiftAarligt,
    samletRenteomkostning,
    maanedligYdelse,
    ydelseAarligt,
    resultatFoerFinansiering,
    resultatEfterRente: aarligtResultatEfterRente,
    resultatEfterFinansiering: aarligtCashflowEfterLaaneydelse,
    aarligtResultatEfterRente,
    aarligtCashflowEfterLaaneydelse,
    noegletalOverTid,
    antalUdfyldteTrin,
    naesteTrin
  };
}

module.exports = {
  GYLDIGE_TRIN,
  InvesteringscaseBeregner,
  beregnAnalyse,
  beregnRestgaeldEfterAar,
  beregnNoegletalOverTid,
  lavTomCaseData,
  mergeTrinData,
  parseJson
};
