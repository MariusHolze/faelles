// Beregner økonomien i en investeringscase med simple klasser.

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

class PostSamling {
  constructor(poster = []) {
    this.poster = Array.isArray(poster) ? poster : [];
  }

  sum() {
    return this.poster.reduce((sum, post) => sum + positivtTal(post.beloeb), 0);
  }

  maanedligTotal() {
    return this.poster.reduce((sum, post) => {
      const beloeb = positivtTal(post.beloeb);
      return sum + (post.periode === "aarligt" ? beloeb / 12 : beloeb);
    }, 0);
  }

  totalForNavn(navn) {
    return this.poster
      .filter((post) => String(post.navn || "").toLowerCase() === navn.toLowerCase())
      .reduce((sum, post) => sum + positivtTal(post.beloeb), 0);
  }
}

class Laan {
  constructor(laanebeloeb, renteProcent, loebetidAar) {
    this.laanebeloeb = positivtTal(laanebeloeb);
    this.renteProcent = positivtTal(renteProcent);
    this.loebetidAar = positivtTal(loebetidAar);
  }

  maanedligYdelse() {
    const maaneder = this.loebetidAar * 12;
    const maanedligRente = (this.renteProcent / 100) / 12;

    if (this.laanebeloeb === 0 || maaneder === 0) {
      return 0;
    }

    if (maanedligRente === 0) {
      return this.laanebeloeb / maaneder;
    }

    return this.laanebeloeb * (maanedligRente / (1 - Math.pow(1 + maanedligRente, -maaneder)));
  }

  totalRenteomkostning() {
    return Math.max(0, this.maanedligYdelse() * this.loebetidAar * 12 - this.laanebeloeb);
  }

  restgaeldEfterAar(aar) {
    const maaneder = this.loebetidAar * 12;
    const betalteMaaneder = Math.min(maaneder, positivtTal(aar) * 12);
    const maanedligRente = (this.renteProcent / 100) / 12;

    if (this.laanebeloeb === 0 || maaneder === 0 || betalteMaaneder >= maaneder) {
      return 0;
    }

    if (maanedligRente === 0) {
      return Math.max(0, this.laanebeloeb - (this.laanebeloeb / maaneder) * betalteMaaneder);
    }

    const ydelse = this.maanedligYdelse();
    const restgaeld = this.laanebeloeb * Math.pow(1 + maanedligRente, betalteMaaneder)
      - ydelse * ((Math.pow(1 + maanedligRente, betalteMaaneder) - 1) / maanedligRente);

    return Math.max(0, restgaeld);
  }
}

class InvesteringscaseData {
  constructor(input = {}) {
    this.koebsposter = Array.isArray(input.koebsposter) ? input.koebsposter : [];
    this.driftsposter = Array.isArray(input.driftsposter) ? input.driftsposter : [];
    this.renoveringAktiv = input.renoveringAktiv === true;
    this.udlejningAktiv = input.udlejningAktiv === true;
    this.renoveringer = this.renoveringAktiv && Array.isArray(input.renoveringer) ? input.renoveringer : [];
    this.udlejningsudgifter = this.udlejningAktiv && Array.isArray(input.udlejningsudgifter) ? input.udlejningsudgifter : [];
    this.koebspris = new PostSamling(this.koebsposter).totalForNavn("Ejendomspris");
    this.laanebeloeb = positivtTal(input.laanebeloeb);
    this.egenbetaling = positivtTal(input.egenbetaling);
    this.rente = positivtTal(input.rente);
    this.loebetid = positivtTal(input.loebetid);
    this.maanedligLeje = this.udlejningAktiv ? positivtTal(input.maanedligLeje) : 0;
    this.vaekstProcent = talMedStandard(input.vaekstProcent, 2);
    this.periodeAar = talMedStandard(input.periodeAar, 30);
  }
}

class InvesteringscaseBeregner {
  constructor(input = {}) {
    this.input = input instanceof InvesteringscaseData ? input : new InvesteringscaseData(input);
    this.laan = new Laan(this.input.laanebeloeb, this.input.rente, this.input.loebetid);
  }

  beregn() {
    const koeb = new PostSamling(this.input.koebsposter);
    const renovering = new PostSamling(this.input.renoveringer);
    const drift = new PostSamling(this.input.driftsposter);
    const udlejning = new PostSamling(this.input.udlejningsudgifter);

    const koebsudgifterIAlt = koeb.sum();
    const renoveringIAlt = renovering.sum();
    const startInvestering = koebsudgifterIAlt + renoveringIAlt;
    const maanedligYdelse = this.laan.maanedligYdelse();
    const driftMaanedligt = drift.maanedligTotal();
    const lejeUdgifterMaanedligt = udlejning.maanedligTotal();
    const maanedligeUdgifter = driftMaanedligt + lejeUdgifterMaanedligt + maanedligYdelse;
    const maanedligtCashflow = this.input.maanedligLeje - maanedligeUdgifter;
    const aarligtCashflow = maanedligtCashflow * 12;
    const periodeAar = Math.max(1, Math.round(this.input.periodeAar));
    const vaekstFaktor = 1 + this.input.vaekstProcent / 100;
    const estimeretVaerdiEfterPeriode = this.input.koebspris * Math.pow(vaekstFaktor, periodeAar);

    return {
      koebspris: this.input.koebspris,
      koebsomkostninger: Math.max(0, koebsudgifterIAlt - this.input.koebspris),
      koebsudgifterIAlt,
      renoveringIAlt,
      startInvestering,
      samletInvestering: startInvestering,
      laanebeloeb: this.input.laanebeloeb,
      finansieringsbehov: this.input.laanebeloeb,
      egenkapitalBehov: this.input.egenbetaling,
      maanedligYdelse,
      totalRenteomkostning: this.laan.totalRenteomkostning(),
      driftMaanedligt,
      driftsudgifterMaanedligt: driftMaanedligt,
      driftsudgifterAarligt: driftMaanedligt * 12,
      lejeUdgifterMaanedligt,
      lejeUdgifterAarligt: lejeUdgifterMaanedligt * 12,
      maanedligIndtaegt: this.input.maanedligLeje,
      maanedligeUdgifter,
      maanedligtCashflow,
      aarligtCashflow,
      aarligtCashflowEfterLaaneydelse: aarligtCashflow,
      ejendomspris: this.input.koebspris,
      belaaning: this.input.koebspris > 0 ? (this.input.laanebeloeb / this.input.koebspris) * 100 : 0,
      estimeretVaerdiEfterPeriode,
      samletResultat: (estimeretVaerdiEfterPeriode - this.input.koebspris) + (aarligtCashflow * periodeAar) - renoveringIAlt,
      noegletalOverTid: this.beregnNoegletalOverTid(periodeAar, vaekstFaktor, aarligtCashflow)
    };
  }

  beregnNoegletalOverTid(periodeAar, vaekstFaktor, aarligtCashflow) {
    return Array.from({ length: periodeAar }, (_, index) => {
      const aar = index + 1;
      const ejendomsvaerdi = this.input.koebspris * Math.pow(vaekstFaktor, aar);
      const restgaeld = this.laan.restgaeldEfterAar(aar);

      return {
        aar,
        ejendomsvaerdi,
        restgaeld,
        gaeld: restgaeld,
        egenkapitalIEjendom: ejendomsvaerdi - restgaeld,
        akkumuleretCashflow: aarligtCashflow * aar,
        samletInvestorVaerdi: ejendomsvaerdi - restgaeld + aarligtCashflow * aar
      };
    });
  }
}

function normaliserCaseData(input = {}) {
  return { ...new InvesteringscaseData(input) };
}

function sumPoster(poster = []) {
  return new PostSamling(poster).sum();
}

function maanedligTotal(poster = []) {
  return new PostSamling(poster).maanedligTotal();
}

function beregnMaanedligYdelse(laanebeloeb, renteProcent, loebetidAar) {
  return new Laan(laanebeloeb, renteProcent, loebetidAar).maanedligYdelse();
}

function restgaeldEfterAar(laanebeloeb, renteProcent, loebetidAar, aar) {
  return new Laan(laanebeloeb, renteProcent, loebetidAar).restgaeldEfterAar(aar);
}

function beregnInvesteringscase(input = {}) {
  return new InvesteringscaseBeregner(input).beregn();
}

module.exports = {
  PostSamling,
  Laan,
  InvesteringscaseData,
  InvesteringscaseBeregner,
  beregnInvesteringscase,
  beregnAnalyse: beregnInvesteringscase,
  beregnMaanedligYdelse,
  beregnRestgaeldEfterAar: restgaeldEfterAar,
  beregnNoegletalOverTid: (input) => beregnInvesteringscase(input).noegletalOverTid,
  normaliserCaseData,
  normaliserInput: normaliserCaseData,
  sumPoster,
  maanedligTotal,
  tal,
  positivtTal,
  talMedStandard
};
