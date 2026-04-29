function tal(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function positivtTal(value) {
  return Math.max(0, tal(value));
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
  const koebsposter = Array.isArray(input.koebsposter)
    ? input.koebsposter
    : Array.isArray(input.koebsudgifter?.poster)
      ? input.koebsudgifter.poster
      : [];
  const renoveringer = Array.isArray(input.renoveringer)
    ? input.renoveringer
    : Array.isArray(input.renovering?.poster)
      ? input.renovering.poster
      : [];
  const driftsposter = Array.isArray(input.driftsposter)
    ? input.driftsposter
    : Array.isArray(input.driftsbudget?.poster)
      ? input.driftsbudget.poster
      : [];
  const udlejningsudgifter = Array.isArray(input.udlejningsudgifter)
    ? input.udlejningsudgifter
    : [
      {
        navn: "Månedlige udlejningsudgifter",
        beloeb: input.udlejning?.maanedligeUdlejningsudgifter || 0,
        periode: "maanedligt"
      },
      {
        navn: "Årlige udlejningsudgifter",
        beloeb: input.udlejning?.aarligeUdlejningsudgifter || 0,
        periode: "aarligt"
      }
    ];

  const koebspris = input.koebspris !== undefined
    ? positivtTal(input.koebspris)
    : hentPostTotal(koebsposter, "Ejendomspris");

  return {
    koebsposter,
    renoveringer: input.renoveringAktiv === false || input.renovering?.aktiv === false ? [] : renoveringer,
    driftsposter,
    udlejningsudgifter: input.udlejningAktiv === false ? [] : udlejningsudgifter,
    koebspris,
    laanebeloeb: positivtTal(input.laanebeloeb ?? input.finansiering?.laanebeloeb),
    egenbetaling: positivtTal(input.egenbetaling ?? input.finansiering?.egenbetaling),
    rente: positivtTal(input.rente ?? input.finansiering?.rente),
    loebetid: positivtTal(input.loebetid ?? input.finansiering?.loebetid),
    udlejningAktiv: input.udlejningAktiv !== false,
    maanedligLeje: input.udlejningAktiv === false
      ? 0
      : positivtTal(input.maanedligLeje ?? input.udlejning?.maanedligLeje),
    tomgangProcent: Math.min(100, positivtTal(input.tomgangProcent)),
    vaekstProcent: tal(input.vaekstProcent),
    periodeAar: input.periodeAar === undefined ? 30 : positivtTal(input.periodeAar || 10)
  };
}

function calculateInvestmentCase(input = {}) {
  const data = normaliserInput(input);
  const koebsomkostninger = Math.max(0, sumPoster(data.koebsposter) - data.koebspris);
  const renoveringIAlt = sumPoster(data.renoveringer);
  const startInvestering = data.koebspris + koebsomkostninger + renoveringIAlt;
  const laanebeloeb = data.laanebeloeb || Math.max(0, startInvestering - data.egenbetaling);
  const maanedligYdelse = beregnMaanedligYdelse(laanebeloeb, data.rente, data.loebetid);
  const totalRenteomkostning = Math.max(0, maanedligYdelse * data.loebetid * 12 - laanebeloeb);

  // Simpel prototype: månedlige indtægter minus månedlige udgifter.
  const driftMaanedligt = maanedligTotal(data.driftsposter);
  const lejeUdgifterMaanedligt = maanedligTotal(data.udlejningsudgifter);
  const maanedligIndtaegt = data.maanedligLeje * (1 - data.tomgangProcent / 100);
  const maanedligeUdgifter = driftMaanedligt + lejeUdgifterMaanedligt + maanedligYdelse;
  const maanedligtCashflow = maanedligIndtaegt - maanedligeUdgifter;
  const aarligtCashflow = maanedligtCashflow * 12;
  const estimeretVaerdiEfterPeriode = data.koebspris * Math.pow(1 + data.vaekstProcent / 100, data.periodeAar);
  const samletResultat = (estimeretVaerdiEfterPeriode - data.koebspris) + (aarligtCashflow * data.periodeAar) - renoveringIAlt;

  return {
    koebspris: data.koebspris,
    koebsomkostninger,
    koebsudgifterIAlt: data.koebspris + koebsomkostninger,
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
    noegletalOverTid: Array.from({ length: Math.max(1, Math.round(data.periodeAar)) }, (_, index) => {
      const aar = index + 1;
      const ejendomsvaerdi = data.koebspris * Math.pow(1 + data.vaekstProcent / 100, aar);
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
