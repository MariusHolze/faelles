const express = require("express");
const router = express.Router();
const { sql, getPool } = require("../db");

// opret ejendom
router.post("/", async (req, res) => {
  const {
    adresse,
    vejnavn,
    husnr,
    postnr,
    bynavn,
    boligtype,
    boligareal,
    ownerEmail
  } = req.body;

  if (!adresse || !ownerEmail) {
    return res.status(400).json({
      message: "Adresse eller email mangler"
    });
  }

  try {
    const pool = await getPool();

    const brugerResult = await pool.request()
      .input("email", sql.VarChar(255), ownerEmail)
      .query(`
        SELECT brugerID
        FROM Bruger
        WHERE email = @email
      `);

    if (brugerResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Bruger findes ikke"
      });
    }

    const brugerID = brugerResult.recordset[0].brugerID;

    await pool.request()
      .input("brugerID", sql.Int, brugerID)
      .input("adresse", sql.VarChar(255), adresse)
      .input("vejnavn", sql.VarChar(100), vejnavn || null)
      .input("husnr", sql.VarChar(20), husnr || null)
      .input("postnr", sql.VarChar(10), postnr || null)
      .input("bynavn", sql.VarChar(100), bynavn || null)
      .input("boligtype", sql.VarChar(100), boligtype || null)
      .input("boligareal", sql.Int, boligareal ? Number(boligareal) : null)
      .query(`
        INSERT INTO Ejendomsprofil
        (brugerID, adresse, vejnavn, husnr, postnr, bynavn, boligtype, boligareal)
        VALUES
        (@brugerID, @adresse, @vejnavn, @husnr, @postnr, @bynavn, @boligtype, @boligareal)
      `);

    res.status(201).json({
      message: "Ejendom oprettet"
    });
  } catch (error) {
    console.error("Fejl ved oprettelse af ejendom:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

// hent brugerens ejendomme
router.get("/", async (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({
      message: "Email mangler"
    });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("email", sql.VarChar(255), email)
      .query(`
        SELECT
          e.ejendomID AS id,
          e.adresse,
          e.oprettetTidspunkt,
          e.sidstOpdateret,
          COUNT(c.caseID) AS antalCases
        FROM Ejendomsprofil e
        JOIN Bruger b ON e.brugerID = b.brugerID
        LEFT JOIN Investeringscase c ON e.ejendomID = c.ejendomID
        WHERE b.email = @email
          AND e.erArkiveret = 0
        GROUP BY
          e.ejendomID,
          e.adresse,
          e.oprettetTidspunkt,
          e.sidstOpdateret
        ORDER BY e.oprettetTidspunkt DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Fejl ved hentning af ejendomme:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

// rediger ejendom
router.put("/:id", async (req, res) => {
  const ejendomID = Number(req.params.id);
  const { adresse, ownerEmail } = req.body;

  if (!adresse || !ownerEmail) {
    return res.status(400).json({
      message: "Adresse eller email mangler"
    });
  }

  try {
    const pool = await getPool();

    const adgangResult = await pool.request()
      .input("ejendomID", sql.Int, ejendomID)
      .input("email", sql.VarChar(255), ownerEmail)
      .query(`
        SELECT e.ejendomID
        FROM Ejendomsprofil e
        JOIN Bruger b ON e.brugerID = b.brugerID
        WHERE e.ejendomID = @ejendomID
          AND b.email = @email
          AND e.erArkiveret = 0
      `);

    if (adgangResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Ejendom ikke fundet eller ingen adgang"
      });
    }

    await pool.request()
      .input("ejendomID", sql.Int, ejendomID)
      .input("adresse", sql.VarChar(255), adresse)
      .query(`
        UPDATE Ejendomsprofil
        SET adresse = @adresse,
            sidstOpdateret = SYSDATETIME()
        WHERE ejendomID = @ejendomID
      `);

    res.json({
      message: "Ejendom opdateret"
    });
  } catch (error) {
    console.error("Fejl ved opdatering:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

// arkiver ejendom
router.delete("/:id", async (req, res) => {
  const ejendomID = Number(req.params.id);
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({
      message: "Email mangler"
    });
  }

  try {
    const pool = await getPool();

    const adgangResult = await pool.request()
      .input("ejendomID", sql.Int, ejendomID)
      .input("email", sql.VarChar(255), email)
      .query(`
        SELECT e.ejendomID
        FROM Ejendomsprofil e
        JOIN Bruger b ON e.brugerID = b.brugerID
        WHERE e.ejendomID = @ejendomID
          AND b.email = @email
          AND e.erArkiveret = 0
      `);

    if (adgangResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Ejendom ikke fundet eller ingen adgang"
      });
    }

    await pool.request()
      .input("ejendomID", sql.Int, ejendomID)
      .query(`
        UPDATE Ejendomsprofil
        SET erArkiveret = 1,
            sidstOpdateret = SYSDATETIME()
        WHERE ejendomID = @ejendomID
      `);

    res.json({
      message: "Ejendom arkiveret"
    });
  } catch (error) {
    console.error("Fejl ved arkivering:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

module.exports = router;