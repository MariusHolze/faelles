const express = require("express");
const router = express.Router();
const { getPool } = require("../db");
const {
  hentAlleCases,
  hentCase,
  opretCase,
  opdaterCase,
  sletCase
} = require("../services/investeringscaseRepository");
const { calculateInvestmentCase } = require("../services/beregnCase");

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

function validerCase(body) {
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

router.get("/", async (req, res) => {
  const { ejendomID } = req.query;

  if (ejendomID && !gyldigtId(ejendomID)) {
    return res.status(400).json({ message: "Ugyldigt ejendoms-ID" });
  }

  try {
    const pool = await getPool();
    const cases = await hentAlleCases(pool, ejendomID ? Number(ejendomID) : null);
    res.json(cases);
  } catch (error) {
    console.error("Fejl ved hentning af investeringscases:", error);
    res.status(500).json({ message: "Databasefejl ved hentning af investeringscases" });
  }
});

router.get("/:id", async (req, res) => {
  if (!gyldigtId(req.params.id)) {
    return res.status(400).json({ message: "Ugyldigt case-ID" });
  }

  try {
    const pool = await getPool();
    const investeringscase = await hentCase(pool, Number(req.params.id));

    if (!investeringscase) {
      return res.status(404).json({ message: "Case ikke fundet" });
    }

    res.json(investeringscase);
  } catch (error) {
    console.error("Fejl ved hentning af investeringscase:", error);
    res.status(500).json({ message: "Databasefejl ved hentning af investeringscase" });
  }
});

router.post("/beregn", (req, res) => {
  const fejl = validerCase(req.body);

  if (fejl.length > 0) {
    return res.status(400).json({ message: fejl[0], fejl });
  }

  res.json({
    resultat: calculateInvestmentCase(req.body)
  });
});

router.post("/", async (req, res) => {
  const fejl = validerCase(req.body);

  if (fejl.length > 0) {
    return res.status(400).json({ message: fejl[0], fejl });
  }

  try {
    const pool = await getPool();
    const caseID = await opretCase(pool, req.body);
    const investeringscase = await hentCase(pool, caseID);

    res.status(201).json({
      message: "Investeringscase gemt",
      caseID,
      case: investeringscase
    });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ message: "Der findes allerede en investeringscase med det navn." });
    }

    console.error("Fejl ved oprettelse af investeringscase:", error);
    res.status(500).json({ message: "Databasefejl ved oprettelse af investeringscase" });
  }
});

router.post("/:id/duplicate", async (req, res) => {
  if (!gyldigtId(req.params.id)) {
    return res.status(400).json({ message: "Ugyldigt case-ID" });
  }

  try {
    const pool = await getPool();
    const original = await hentCase(pool, Number(req.params.id));

    if (!original) {
      return res.status(404).json({ message: "Case ikke fundet" });
    }

    const kopi = {
      ...original.input,
      ejendomID: original.ejendomID,
      navn: `Kopi af ${original.navn}`,
      beskrivelse: original.beskrivelse || ""
    };

    const caseID = await opretCase(pool, kopi);

    res.status(201).json({
      message: "Investeringscase duplikeret",
      caseID
    });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ message: "Der findes allerede en investeringscase med navnet Kopi af denne case." });
    }

    console.error("Fejl ved duplikering af investeringscase:", error);
    res.status(500).json({ message: "Databasefejl ved duplikering af investeringscase" });
  }
});

router.put("/:id", async (req, res) => {
  if (!gyldigtId(req.params.id)) {
    return res.status(400).json({ message: "Ugyldigt case-ID" });
  }

  const fejl = validerCase(req.body);

  if (fejl.length > 0) {
    return res.status(400).json({ message: fejl[0], fejl });
  }

  try {
    const pool = await getPool();
    const eksisterende = await hentCase(pool, Number(req.params.id));

    if (!eksisterende) {
      return res.status(404).json({ message: "Case ikke fundet" });
    }

    await opdaterCase(pool, Number(req.params.id), req.body);
    const investeringscase = await hentCase(pool, Number(req.params.id));

    res.json({
      message: "Investeringscase gemt",
      caseID: Number(req.params.id),
      case: investeringscase
    });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ message: "Der findes allerede en investeringscase med det navn." });
    }

    console.error("Fejl ved opdatering af investeringscase:", error);
    res.status(500).json({ message: "Databasefejl ved opdatering af investeringscase" });
  }
});

router.delete("/:id", async (req, res) => {
  if (!gyldigtId(req.params.id)) {
    return res.status(400).json({ message: "Ugyldigt case-ID" });
  }

  try {
    const pool = await getPool();
    const slettet = await sletCase(pool, Number(req.params.id));

    if (!slettet) {
      return res.status(404).json({ message: "Case ikke fundet" });
    }

    res.json({ message: "Investeringscase slettet" });
  } catch (error) {
    console.error("Fejl ved sletning af investeringscase:", error);
    res.status(500).json({ message: "Databasefejl ved sletning af investeringscase" });
  }
});

module.exports = router;
