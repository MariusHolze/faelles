const express = require("express");
const router = express.Router();
const { getPool } = require("../db");
const {
  InvesteringscaseRepository
} = require("../services/investeringscaseRepository");

const { beregnInvesteringscase } = require("../services/beregnCase");
const { CaseValidering, gyldigtId } = require("../services/validerCase");

function validerCase(body) {
  return new CaseValidering(body).valider();
}

async function hentRepository() {
  return new InvesteringscaseRepository(await getPool());
}

router.get("/", async (req, res) => {
  const { ejendomID } = req.query;

  if (ejendomID && !gyldigtId(ejendomID)) {
    return res.status(400).json({ message: "Ugyldigt ejendoms-ID" });
  }

  try {
    const repository = await hentRepository();
    const cases = await repository.hentAlle(ejendomID ? Number(ejendomID) : null);
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
    const repository = await hentRepository();
    const investeringscase = await repository.hent(Number(req.params.id));

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
    resultat: beregnInvesteringscase(req.body)
  });
});

router.post("/", async (req, res) => {
  const fejl = validerCase(req.body);

  if (fejl.length > 0) {
    return res.status(400).json({ message: fejl[0], fejl });
  }

  try {
    const repository = await hentRepository();
    const caseID = await repository.opret(req.body);
    const investeringscase = await repository.hent(caseID);

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
    const repository = await hentRepository();
    const original = await repository.hent(Number(req.params.id));

    if (!original) {
      return res.status(404).json({ message: "Case ikke fundet" });
    }

    const kopi = {
      ...original.input,
      ejendomID: original.ejendomID,
      navn: `Kopi af ${original.navn}`,
      beskrivelse: original.beskrivelse || ""
    };

    const caseID = await repository.opret(kopi);

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
    const repository = await hentRepository();
    const eksisterende = await repository.hent(Number(req.params.id));

    if (!eksisterende) {
      return res.status(404).json({ message: "Case ikke fundet" });
    }

    await repository.opdater(Number(req.params.id), req.body);
    const investeringscase = await repository.hent(Number(req.params.id));

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
    const repository = await hentRepository();
    const slettet = await repository.slet(Number(req.params.id));

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
