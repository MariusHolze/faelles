function tal(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function positivtTal(value) {
  return Math.max(0, tal(value));
}

function talMedStandard(value, standard) {
  if (value === undefined || value === null || value === "") {
    return standard;
  }

  return positivtTal(value);
}

function sumPoster(poster = []) {
  return poster.reduce((sum, post) => sum + positivtTal(post.beloeb), 0);
}

function maanedligTotal(poster = []) {
  return poster.reduce((sum, post) => {
    const beloeb = positivtTal(post.beloeb);
    return sum + (post.periode === "aarligt" ? beloeb / 12 : beloeb);
  }, 0);
}

function hentPostTotal(poster = [], navn) {
  return poster
    .filter((post) => String(post.navn || "").toLowerCase() === navn.toLowerCase())
    .reduce((sum, post) => sum + positivtTal(post.beloeb), 0);
}

function beregnMaanedligYdelse(laanebeloeb, renteProcent, loebetidAar) {
  const hovedstol = positivtTal(laanebeloeb);
  const maaneder = positivtTal(loebetidAar) * 12;
  const maanedligRente = (positivtTal(renteProcent) / 100) / 12;

  if (hovedstol === 0 || maaneder === 0) {
    return 0;
  }

  if (maanedligRente === 0) {
    return hovedstol / maaneder;
  }

  return hovedstol * (maanedligRente / (1 - Math.pow(1 + maanedligRente, -maaneder)));
}

function restgaeldEfterAar(laanebeloeb, renteProcent, loebetidAar, aar) {
  const hovedstol = positivtTal(laanebeloeb);
  const maaneder = positivtTal(loebetidAar) * 12;
  const betalteMaaneder = Math.min(maaneder, positivtTal(aar) * 12);
  const maanedligRente = (positivtTal(renteProcent) / 100) / 12;

  if (hovedstol === 0 || maaneder === 0 || betalteMaaneder >= maaneder) {
    return 0;
  }

  if (maanedligRente === 0) {
    return Math.max(0, hovedstol - (hovedstol / maaneder) * betalteMaaneder);
  }

  const ydelse = beregnMaanedligYdelse(hovedstol, renteProcent, loebetidAar);
  const restgaeld = hovedstol * Math.pow(1 + maanedligRente, betalteMaaneder)
    - ydelse * ((Math.pow(1 + maanedligRente, betalteMaaneder) - 1) / maanedligRente);

  return Math.max(0, restgaeld);
}

function normaliserInput(input = {}) {
  const koebsposter = Array.isArray(input.koebsposter) ? input.koebsposter : [];
  const driftsposter = Array.isArray(input.driftsposter) ? input.driftsposter : [];

  const renoveringer = input.renoveringAktiv === true && Array.isArray(input.renoveringer)
    ? input.renoveringer
    : [];

  const udlejningsudgifter = input.udlejningAktiv === true && Array.isArray(input.udlejningsudgifter)
    ? input.udlejningsudgifter
    : [];

  return {
    koebsposter,
    renoveringer,
    driftsposter,
    udlejningsudgifter,

    koebspris: hentPostTotal(koebsposter, "Ejendomspris"),

    laanebeloeb: positivtTal(input.laanebeloeb),
    egenbetaling: positivtTal(input.egenbetaling),
    rente: positivtTal(input.rente),
    loebetid: positivtTal(input.loebetid),

    udlejningAktiv: input.udlejningAktiv === true,
    maanedligLeje: input.udlejningAktiv === true ? positivtTal(input.maanedligLeje) : 0,
    tomgangDage: input.udlejningAktiv === true ? Math.min(365, positivtTal(input.tomgangDage)) : 0,

    vaekstProcent: talMedStandard(input.vaekstProcent, 2),
    periodeAar: talMedStandard(input.periodeAar, 30)
  };
}

function calculateInvestmentCase(input = {}) {
  const data = normaliserInput(input);

  const koebsudgifterIAlt = sumPoster(data.koebsposter);
  const koebsomkostninger = Math.max(0, koebsudgifterIAlt - data.koebspris);
  const renoveringIAlt = sumPoster(data.renoveringer);
  const startInvestering = koebsudgifterIAlt + renoveringIAlt;

  const laanebeloeb = data.laanebeloeb;
  const maanedligYdelse = beregnMaanedligYdelse(laanebeloeb, data.rente, data.loebetid);
  const totalRenteomkostning = Math.max(0, maanedligYdelse * data.loebetid * 12 - laanebeloeb);

  const driftMaanedligt = maanedligTotal(data.driftsposter);
  const lejeUdgifterMaanedligt = maanedligTotal(data.udlejningsudgifter);

  const lejeAarligt = data.maanedligLeje * 12;
  const tomgangBeloeb = lejeAarligt * (data.tomgangDage / 365);
  const maanedligIndtaegt = (lejeAarligt - tomgangBeloeb) / 12;

  const maanedligeUdgifter = driftMaanedligt + lejeUdgifterMaanedligt + maanedligYdelse;
  const maanedligtCashflow = maanedligIndtaegt - maanedligeUdgifter;
  const aarligtCashflow = maanedligtCashflow * 12;

  const vaekstFaktor = 1 + data.vaekstProcent / 100;
  const periodeAar = Math.max(1, Math.round(data.periodeAar));
  const estimeretVaerdiEfterPeriode = data.koebspris * Math.pow(vaekstFaktor, periodeAar);
  const samletResultat = (estimeretVaerdiEfterPeriode - data.koebspris) + (aarligtCashflow * periodeAar) - renoveringIAlt;

  return {
    koebspris: data.koebspris,
    koebsomkostninger,
    koebsudgifterIAlt,
    renoveringIAlt,
    startInvestering,
    samletInvestering: startInvestering,

    laanebeloeb,
    finansieringsbehov: laanebeloeb,
    egenkapitalBehov: data.egenbetaling,
    maanedligYdelse,
    totalRenteomkostning,

    driftMaanedligt,
    driftsudgifterMaanedligt: driftMaanedligt,
    driftsudgifterAarligt: driftMaanedligt * 12,

    lejeUdgifterMaanedligt,
    lejeUdgifterAarligt: lejeUdgifterMaanedligt * 12,
    maanedligIndtaegt,
    maanedligeUdgifter,

    maanedligtCashflow,
    aarligtCashflow,
    aarligtCashflowEfterLaaneydelse: aarligtCashflow,

    simpelROI: data.egenbetaling > 0 ? (aarligtCashflow / data.egenbetaling) * 100 : 0,
    ejendomspris: data.koebspris,
    belaaning: data.koebspris > 0 ? (laanebeloeb / data.koebspris) * 100 : 0,
    estimeretVaerdiEfterPeriode,
    samletResultat,

    noegletalOverTid: Array.from({ length: periodeAar }, (_, index) => {
      const aar = index + 1;
      const ejendomsvaerdi = data.koebspris * Math.pow(vaekstFaktor, aar);
      const restgaeld = restgaeldEfterAar(laanebeloeb, data.rente, data.loebetid, aar);

      return {
        aar,
        ejendomsvaerdi,
        restgaeld,
        gaeld: restgaeld,
        egenkapitalIEjendom: ejendomsvaerdi - restgaeld,
        akkumuleretCashflow: aarligtCashflow * aar,
        samletInvestorVaerdi: ejendomsvaerdi - restgaeld + aarligtCashflow * aar
      };
    })
  };
}

module.exports = {
  calculateInvestmentCase,
  beregnAnalyse: calculateInvestmentCase,
  beregnMaanedligYdelse,
  beregnRestgaeldEfterAar: restgaeldEfterAar,
  beregnNoegletalOverTid: (input) => calculateInvestmentCase(input).noegletalOverTid,
  normaliserInput,
  sumPoster,
  maanedligTotal
};