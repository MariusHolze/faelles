// Validerer investeringscase-input med en simpel klasse.

function gyldigtId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function gyldigtTal(value) {
  return value === undefined || value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0);
}

function sumPoster(poster = []) {
  return Array.isArray(poster)
    ? poster.reduce((sum, post) => sum + (Number(post.beloeb) || 0), 0)
    : 0;
}

function postTotal(poster = [], navn) {
  return Array.isArray(poster)
    ? poster
      .filter((post) => String(post.navn || "").toLowerCase() === navn.toLowerCase())
      .reduce((sum, post) => sum + (Number(post.beloeb) || 0), 0)
    : 0;
}

class CaseValidering {
  constructor(body = {}) {
    this.body = body;
    this.fejl = [];
  }

  valider() {
    this.validerGrunddata();
    this.validerKoebsposter();
    this.validerFinansiering();
    this.validerRenovering();
    this.validerDrift();
    this.validerUdlejning();
    return this.fejl;
  }

  validerGrunddata() {
    if (!gyldigtId(this.body.ejendomID)) {
      this.fejl.push("Vælg en ejendomsprofil.");
    }

    if (!String(this.body.navn || "").trim()) {
      this.fejl.push("Giv casen et navn.");
    }

    for (const felt of ["laanebeloeb", "egenbetaling", "rente", "loebetid", "maanedligLeje"]) {
      if (!gyldigtTal(this.body[felt])) {
        this.fejl.push(`${felt} skal være et tal på 0 eller derover.`);
      }
    }

    if (Number(this.body.loebetid) <= 0) {
      this.fejl.push("loebetid skal være større end 0.");
    }
  }

  validerKoebsposter() {
    if (!Array.isArray(this.body.koebsposter) || this.body.koebsposter.length === 0) {
      this.fejl.push("Tilføj mindst én købspost.");
    }

    for (const post of this.body.koebsposter || []) {
      if (!String(post.navn || "").trim() || !gyldigtTal(post.beloeb)) {
        this.fejl.push("Alle købsposter skal udfyldes med gyldige beløb.");
      }
    }

    if (postTotal(this.body.koebsposter, "Ejendomspris") <= 0) {
      this.fejl.push("Ejendomspris skal være større end 0.");
    }
  }

  validerFinansiering() {
    const samletKoebssum = sumPoster(this.body.koebsposter);
    const totalFinansiering = Number(this.body.laanebeloeb) + Number(this.body.egenbetaling);

    if (Math.round(totalFinansiering) !== Math.round(samletKoebssum)) {
      this.fejl.push("Lånebeløb + egenbetaling skal være lig med samlede købs- og omkostningsposter.");
    }
  }

  validerRenovering() {
    if (!this.body.renoveringAktiv) {
      return;
    }

    for (const post of this.body.renoveringer || []) {
      this.validerPost(post, "Alle renoveringsfelter skal udfyldes");

      if (post.tidspunktAar !== undefined && post.tidspunktAar !== null && post.tidspunktAar !== "" && !gyldigtTal(post.tidspunktAar)) {
        this.fejl.push("Renoveringsår skal være et tal på 0 eller derover.");
      }
    }
  }

  validerDrift() {
    for (const post of this.body.driftsposter || []) {
      this.validerPost(post, "Alle driftsfelter skal udfyldes");
      if (!["maanedligt", "aarligt"].includes(post.periode)) {
        this.fejl.push("Driftsperiode skal være maanedligt eller aarligt.");
      }
    }
  }

  validerUdlejning() {
    if (!this.body.udlejningAktiv) {
      return;
    }

    if (Number(this.body.maanedligLeje) <= 0) {
      this.fejl.push("Udlejningsfelter skal udfyldes");
    }

    for (const post of this.body.udlejningsudgifter || []) {
      this.validerPost(post, "Udlejningsfelter skal udfyldes");
      if (!["maanedligt", "aarligt"].includes(post.periode)) {
        this.fejl.push("Udlejningsperiode skal være maanedligt eller aarligt.");
      }
    }
  }

  validerPost(post, besked) {
    if (!String(post.navn || "").trim() || !gyldigtTal(post.beloeb) || Number(post.beloeb) <= 0) {
      this.fejl.push(besked);
    }
  }
}

function validerCase(body = {}) {
  return new CaseValidering(body).valider();
}

module.exports = {
  CaseValidering,
  validerCase,
  gyldigtId,
  gyldigtTal,
  sumPoster,
  postTotal
};
