const express = require("express");
const router = express.Router();
const { sql, getPool } = require("../db");
const {
  GYLDIGE_TRIN,
  beregnAnalyse,
  lavTomCaseData,
  mergeTrinData,
  parseJson
} = require("../services/investeringscaseBeregner");

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

function mapCaseRow(row) {
  const analyse = beregnAnalyse(parseJson(row.dataJson));

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

function hentGyldigeKoebsposter(koebsposter) {
  const poster = Array.isArray(koebsposter) ? koebsposter : [];

  return poster
    .map((post) => ({
      navn: String(post.navn || "").trim(),
      beloeb: Number(post.beloeb)
    }))
    .filter((post) => post.navn && !Number.isNaN(post.beloeb) && post.beloeb >= 0);
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
        c.dataJson,
        e.adresse,
        e.boligareal,
        e.byggeaar
      FROM Investeringscase c
      JOIN Ejendomsprofil e ON c.ejendomID = e.ejendomID
      WHERE ${whereClause}
      ORDER BY c.oprettetTidspunkt DESC
    `);

    res.json(result.recordset.map(mapCaseRow));
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

    const caseData = lavTomCaseData();
    const gyldigePoster = hentGyldigeKoebsposter(koebsposter);

    if (gyldigePoster.length > 0) {
      caseData.koebsudgifter = {
        poster: gyldigePoster,
        total: gyldigePoster.reduce((sum, post) => sum + post.beloeb, 0)
      };
    }

    const caseResult = await pool.request()
      .input("ejendomID", sql.Int, Number(ejendomID))
      .input("navn", sql.VarChar(100), caseNavn)
      .input("beskrivelse", sql.VarChar(500), caseBeskrivelse || null)
      .input("dataJson", sql.NVarChar(sql.MAX), JSON.stringify(caseData))
      .query(`
        INSERT INTO Investeringscase (ejendomID, navn, beskrivelse, dataJson)
        OUTPUT INSERTED.caseID
        VALUES (@ejendomID, @navn, @beskrivelse, @dataJson)
      `);

    res.status(201).json({
      message: "Investeringscase oprettet",
      caseID: caseResult.recordset[0].caseID
    });
  } catch (error) {
    console.error("Fejl ved oprettelse af investeringscase:", error);
    res.status(500).json({ message: "Databasefejl ved oprettelse af investeringscase" });
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

    const result = await pool.request()
      .input("caseID", sql.Int, Number(caseID))
      .query(`
        SELECT dataJson, oprettetTidspunkt
        FROM Investeringscase
        WHERE caseID = @caseID
      `);

    const samletData = result.recordset.length > 0
      ? parseJson(result.recordset[0].dataJson)
      : {};

    res.json({
      data: samletData[trin] || null,
      opdateretTidspunkt: result.recordset[0]?.oprettetTidspunkt || null
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

    const result = await pool.request()
      .input("caseID", sql.Int, Number(caseID))
      .query(`
        SELECT dataJson
        FROM Investeringscase
        WHERE caseID = @caseID
      `);

    const trinData = result.recordset.length > 0
      ? { ...lavTomCaseData(), ...parseJson(result.recordset[0].dataJson) }
      : lavTomCaseData();

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

    const eksisterende = await pool.request()
      .input("caseID", sql.Int, Number(caseID))
      .query(`
        SELECT dataJson
        FROM Investeringscase
        WHERE caseID = @caseID
      `);

    if (eksisterende.recordset.length === 0) {
      return res.status(404).json({ message: "Case ikke fundet" });
    }

    const samletData = mergeTrinData(parseJson(eksisterende.recordset[0].dataJson), trin, data || {});

    await pool.request()
      .input("caseID", sql.Int, Number(caseID))
      .input("dataJson", sql.NVarChar(sql.MAX), JSON.stringify(samletData))
      .query(`
        UPDATE Investeringscase
        SET dataJson = @dataJson
        WHERE caseID = @caseID
      `);

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
