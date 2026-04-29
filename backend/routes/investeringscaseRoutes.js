const express = require("express");
const router = express.Router();
const { sql, getPool } = require("../db");
const {
  GYLDIGE_TRIN,
  beregnAnalyse
} = require("../services/investeringscaseBeregner");
const {
  hentAlleTrinData,
  hentTrinData,
  gemTrinData,
  gyldigeKoebsposter
} = require("../services/investeringscaseRepository");

function erGyldigtTrin(trin) {
  return GYLDIGE_TRIN.includes(trin);
}

function erGyldigtId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

async function caseFindes(pool, caseID) {
  const result = await pool.request()
    .input("caseID", sql.Int, Number(caseID))
    .query("SELECT caseID FROM Investeringscase WHERE caseID = @caseID");

  return result.recordset.length > 0;
}

function mapCaseRow(row, trinData) {
  const analyse = beregnAnalyse(trinData);

  return {
    caseID: row.caseID,
    ejendomID: row.ejendomID,
    navn: row.navn,
    beskrivelse: row.beskrivelse,
    oprettetTidspunkt: row.oprettetTidspunkt,
    adresse: row.adresse,
    boligareal: row.boligareal,
    byggeaar: row.byggeaar,
    koebsudgifterIAlt: analyse.koebsudgifterIAlt,
    samletInvestering: analyse.samletInvestering,
    finansieringsbehov: analyse.finansieringsbehov,
    egenkapitalBehov: analyse.egenkapitalBehov,
    maanedligYdelse: analyse.maanedligYdelse,
    nettoLejeAarligt: analyse.nettoLejeAarligt,
    lejeEfterSkatAarligt: analyse.lejeEfterSkatAarligt,
    driftsudgifterAarligt: analyse.driftsudgifterAarligt,
    resultatEfterFinansiering: analyse.resultatEfterFinansiering,
    aarligtCashflowEfterLaaneydelse: analyse.aarligtCashflowEfterLaaneydelse,
    antalUdfyldteTrin: analyse.antalUdfyldteTrin,
    naesteTrin: analyse.naesteTrin
  };
}

async function hentCaseMetadata(pool, caseID) {
  const result = await pool.request()
    .input("caseID", sql.Int, Number(caseID))
    .query(`
      SELECT
        c.caseID,
        c.ejendomID,
        c.navn,
        c.beskrivelse,
        c.oprettetTidspunkt,
        e.adresse,
        e.boligareal,
        e.byggeaar
      FROM Investeringscase c
      JOIN Ejendomsprofil e ON c.ejendomID = e.ejendomID
      WHERE c.caseID = @caseID
    `);

  return result.recordset[0] || null;
}

async function lavUniktDuplikatNavn(pool, navn) {
  const basisNavn = String(navn || "Investeringscase").slice(0, 91);
  const kandidat = `${basisNavn} (kopi)`.slice(0, 100);
  const eksisterende = await pool.request()
    .input("navn", sql.VarChar(100), kandidat)
    .query("SELECT caseID FROM Investeringscase WHERE navn = @navn");

  if (eksisterende.recordset.length === 0) {
    return kandidat;
  }

  for (let nummer = 2; nummer < 100; nummer += 1) {
    const suffix = ` (kopi ${nummer})`;
    const navnMedNummer = `${basisNavn.slice(0, 100 - suffix.length)}${suffix}`;
    const result = await pool.request()
      .input("navn", sql.VarChar(100), navnMedNummer)
      .query("SELECT caseID FROM Investeringscase WHERE navn = @navn");

    if (result.recordset.length === 0) {
      return navnMedNummer;
    }
  }

  return `${basisNavn.slice(0, 88)} ${Date.now()}`.slice(0, 100);
}

router.get("/", async (req, res) => {
  const { ejendomID } = req.query;

  if (ejendomID && !erGyldigtId(ejendomID)) {
    return res.status(400).json({ message: "Ugyldigt ejendoms-ID" });
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    let whereClause = "1 = 1";

    if (ejendomID) {
      request.input("ejendomID", sql.Int, Number(ejendomID));
      whereClause += " AND e.ejendomID = @ejendomID";
    }

    const result = await request.query(`
      SELECT
        c.caseID,
        c.ejendomID,
        c.navn,
        c.beskrivelse,
        c.oprettetTidspunkt,
        e.adresse,
        e.boligareal,
        e.byggeaar
      FROM Investeringscase c
      JOIN Ejendomsprofil e ON c.ejendomID = e.ejendomID
      WHERE ${whereClause}
      ORDER BY c.oprettetTidspunkt DESC
    `);

    const cases = await Promise.all(result.recordset.map(async (row) => {
      const trinData = await hentAlleTrinData(pool, row.caseID);
      return mapCaseRow(row, trinData);
    }));

    res.json(cases);
  } catch (error) {
    console.error("Fejl ved hentning af investeringscases:", error);
    res.status(500).json({ message: "Databasefejl ved hentning af investeringscases" });
  }
});

router.post("/", async (req, res) => {
  const { ejendomID, navn, beskrivelse, koebsposter } = req.body;
  const caseNavn = String(navn || "").trim();
  const caseBeskrivelse = String(beskrivelse || "").trim();

  if (!erGyldigtId(ejendomID) || !caseNavn) {
    return res.status(400).json({ message: "Ejendom og navn skal udfyldes" });
  }

  if (caseNavn.length > 100) {
    return res.status(400).json({ message: "Navn må højst være 100 tegn" });
  }

  try {
    const pool = await getPool();
    const adgang = await pool.request()
      .input("ejendomID", sql.Int, Number(ejendomID))
      .query("SELECT ejendomID FROM Ejendomsprofil WHERE ejendomID = @ejendomID");

    if (adgang.recordset.length === 0) {
      return res.status(404).json({ message: "Ejendom ikke fundet eller ingen adgang" });
    }

    const eksisterende = await pool.request()
      .input("navn", sql.VarChar(100), caseNavn)
      .query("SELECT caseID FROM Investeringscase WHERE navn = @navn");

    if (eksisterende.recordset.length > 0) {
      return res.status(409).json({ message: "Du har allerede en case med det navn" });
    }

    const gyldigePoster = gyldigeKoebsposter({ poster: koebsposter });

    const caseResult = await pool.request()
      .input("ejendomID", sql.Int, Number(ejendomID))
      .input("navn", sql.VarChar(100), caseNavn)
      .input("beskrivelse", sql.VarChar(500), caseBeskrivelse || null)
      .query(`
        INSERT INTO Investeringscase (ejendomID, navn, beskrivelse)
        OUTPUT INSERTED.caseID
        VALUES (@ejendomID, @navn, @beskrivelse)
      `);
    const caseID = caseResult.recordset[0].caseID;

    if (gyldigePoster.length > 0) {
      await gemTrinData(pool, caseID, "koebsudgifter", {
        poster: gyldigePoster,
        total: gyldigePoster.reduce((sum, post) => sum + post.beloeb, 0)
      });
    }

    res.status(201).json({
      message: "Investeringscase oprettet",
      caseID
    });
  } catch (error) {
    console.error("Fejl ved oprettelse af investeringscase:", error);
    res.status(500).json({ message: "Databasefejl ved oprettelse af investeringscase" });
  }
});

router.post("/:caseID/dupliker", async (req, res) => {
  const { caseID } = req.params;

  if (!erGyldigtId(caseID)) {
    return res.status(400).json({ message: "Ugyldigt case-ID" });
  }

  let nyCaseID = null;

  try {
    const pool = await getPool();
    const original = await hentCaseMetadata(pool, caseID);

    if (!original) {
      return res.status(404).json({ message: "Case ikke fundet" });
    }

    const trinData = await hentAlleTrinData(pool, caseID);
    const nytNavn = await lavUniktDuplikatNavn(pool, original.navn);
    const caseResult = await pool.request()
      .input("ejendomID", sql.Int, original.ejendomID)
      .input("navn", sql.VarChar(100), nytNavn)
      .input("beskrivelse", sql.VarChar(500), original.beskrivelse || null)
      .query(`
        INSERT INTO Investeringscase (ejendomID, navn, beskrivelse)
        OUTPUT INSERTED.caseID
        VALUES (@ejendomID, @navn, @beskrivelse)
      `);

    nyCaseID = caseResult.recordset[0].caseID;

    for (const trin of GYLDIGE_TRIN) {
      await gemTrinData(pool, nyCaseID, trin, trinData[trin] || {});
    }

    const nyRow = await hentCaseMetadata(pool, nyCaseID);
    const nyTrinData = await hentAlleTrinData(pool, nyCaseID);

    res.status(201).json({
      message: "Investeringscase duplikeret",
      case: mapCaseRow(nyRow, nyTrinData)
    });
  } catch (error) {
    if (nyCaseID) {
      try {
        const pool = await getPool();
        await pool.request()
          .input("caseID", sql.Int, nyCaseID)
          .query("DELETE FROM Investeringscase WHERE caseID = @caseID");
      } catch (cleanupError) {
        console.error("Kunne ikke rydde fejlet duplikat op:", cleanupError);
      }
    }

    console.error("Fejl ved duplikering af investeringscase:", error);
    res.status(500).json({ message: "Databasefejl ved duplikering af investeringscase" });
  }
});

router.get("/:caseID/trin/:trin", async (req, res) => {
  const { caseID, trin } = req.params;

  if (!erGyldigtId(caseID) || !erGyldigtTrin(trin)) {
    return res.status(400).json({ message: "Ugyldigt case-ID eller formulartrin" });
  }

  try {
    const pool = await getPool();
    const findes = await caseFindes(pool, caseID);

    if (!findes) {
      return res.status(404).json({ message: "Case ikke fundet" });
    }

    const [trinData, caseResult] = await Promise.all([
      hentTrinData(pool, caseID, trin),
      pool.request()
        .input("caseID", sql.Int, Number(caseID))
        .query("SELECT oprettetTidspunkt FROM Investeringscase WHERE caseID = @caseID")
    ]);

    res.json({
      data: trinData,
      opdateretTidspunkt: caseResult.recordset[0]?.oprettetTidspunkt || null
    });
  } catch (error) {
    console.error("Fejl ved hentning af formulartrin:", error);
    res.status(500).json({ message: "Databasefejl ved hentning af formulartrin" });
  }
});

router.get("/:caseID/analyse", async (req, res) => {
  const { caseID } = req.params;

  if (!erGyldigtId(caseID)) {
    return res.status(400).json({ message: "Ugyldigt case-ID" });
  }

  try {
    const pool = await getPool();
    const findes = await caseFindes(pool, caseID);

    if (!findes) {
      return res.status(404).json({ message: "Case ikke fundet" });
    }

    const trinData = await hentAlleTrinData(pool, caseID);

    res.json({
      trinData,
      analyse: beregnAnalyse(trinData)
    });
  } catch (error) {
    console.error("Fejl ved beregning af investeringsanalyse:", error);
    res.status(500).json({ message: "Databasefejl ved beregning af analyse" });
  }
});

router.put("/:caseID/trin/:trin", async (req, res) => {
  const { caseID, trin } = req.params;
  const { data } = req.body;

  if (!erGyldigtId(caseID) || !erGyldigtTrin(trin)) {
    return res.status(400).json({ message: "Ugyldigt case-ID eller formulartrin" });
  }

  try {
    const pool = await getPool();
    const findes = await caseFindes(pool, caseID);

    if (!findes) {
      return res.status(404).json({ message: "Case ikke fundet" });
    }

    await gemTrinData(pool, caseID, trin, data || {});

    res.json({ message: "Formulartrin gemt" });
  } catch (error) {
    console.error("Fejl ved gem af formulartrin:", error);
    res.status(500).json({ message: "Databasefejl ved gem af formulartrin" });
  }
});

router.delete("/:caseID", async (req, res) => {
  const { caseID } = req.params;

  if (!erGyldigtId(caseID)) {
    return res.status(400).json({ message: "Ugyldigt case-ID" });
  }

  try {
    const pool = await getPool();
    const findes = await caseFindes(pool, caseID);

    if (!findes) {
      return res.status(404).json({ message: "Case ikke fundet" });
    }

    await pool.request()
      .input("caseID", sql.Int, Number(caseID))
      .query(`
        DELETE FROM Investeringscase
        WHERE caseID = @caseID
      `);

    res.json({ message: "Investeringscase slettet" });
  } catch (error) {
    console.error("Fejl ved sletning af investeringscase:", error);
    res.status(500).json({ message: "Databasefejl ved sletning af investeringscase" });
  }
});

module.exports = router;
