// validerer investeringscase-input.

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

function validerCase(body = {}) {
  const fejl = [];

  if (!gyldigtId(body.ejendomID)) {
    fejl.push("Vælg en ejendomsprofil.");
  }

  if (!String(body.navn || "").trim()) {
    fejl.push("Giv casen et navn.");
  }

  for (const felt of [
    "laanebeloeb",
    "egenbetaling",
    "rente",
    "loebetid",
    "maanedligLeje",
    "tomgangDage"
  ]) {
    if (!gyldigtTal(body[felt])) {
      fejl.push(`${felt} skal være et tal på 0 eller derover.`);
    }
  }

  if (Number(body.loebetid) <= 0) {
    fejl.push("loebetid skal være større end 0.");
  }

  if (Number(body.tomgangDage) > 365) {
    fejl.push("tomgangDage må højst være 365.");
  }

  if (!Array.isArray(body.koebsposter) || body.koebsposter.length === 0) {
    fejl.push("Tilføj mindst én købspost.");
  }

  for (const post of body.koebsposter || []) {
    if (!String(post.navn || "").trim() || !gyldigtTal(post.beloeb)) {
      fejl.push("Alle købsposter skal udfyldes med gyldige beløb.");
    }
  }

  const ejendomspris = postTotal(body.koebsposter, "Ejendomspris");

  if (ejendomspris <= 0) {
    fejl.push("Ejendomspris skal være større end 0.");
  }

  const samletKoebssum = sumPoster(body.koebsposter);
  const totalFinansiering = Number(body.laanebeloeb) + Number(body.egenbetaling);

  if (Math.round(totalFinansiering) !== Math.round(samletKoebssum)) {
    fejl.push("Lånebeløb + egenbetaling skal være lig med samlede købs- og omkostningsposter.");
  }

  if (body.renoveringAktiv) {
    for (const post of body.renoveringer || []) {
      if (!String(post.navn || "").trim() || !gyldigtTal(post.beloeb) || Number(post.beloeb) <= 0) {
        fejl.push("Alle renoveringsfelter skal udfyldes");
      }

      if (post.tidspunktAar !== undefined && post.tidspunktAar !== null && post.tidspunktAar !== "" && !gyldigtTal(post.tidspunktAar)) {
        fejl.push("Renoveringsår skal være et tal på 0 eller derover.");
      }
    }
  }

  for (const post of body.driftsposter || []) {
    if (!String(post.navn || "").trim() || !gyldigtTal(post.beloeb) || Number(post.beloeb) <= 0) {
      fejl.push("Alle driftsfelter skal udfyldes");
    }

    if (!["maanedligt", "aarligt"].includes(post.periode)) {
      fejl.push("Driftsperiode skal være maanedligt eller aarligt.");
    }
  }

  if (body.udlejningAktiv) {
    if (Number(body.maanedligLeje) <= 0) {
      fejl.push("Udlejningsfelter skal udfyldes");
    }

    for (const post of body.udlejningsudgifter || []) {
      if (!String(post.navn || "").trim() || !gyldigtTal(post.beloeb) || Number(post.beloeb) <= 0) {
        fejl.push("Udlejningsfelter skal udfyldes");
      }

      if (!["maanedligt", "aarligt"].includes(post.periode)) {
        fejl.push("Udlejningsperiode skal være maanedligt eller aarligt.");
      }
    }
  }

  return fejl;
}

module.exports = {
  validerCase,
  gyldigtId,
  gyldigtTal,
  sumPoster,
  postTotal
};