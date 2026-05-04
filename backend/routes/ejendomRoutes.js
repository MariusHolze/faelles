const express = require("express");
const router = express.Router();
const { sql, getPool } = require("../db");
const { hentBbrData, vurderEjendomsprofilMulighedFraBbrData } = require("../services/bbrService");

router.post("/", async (req, res) => {
  const { adresse, adresseID, vejnavn, husnr, postnr, bynavn, adgangsadresseID } = req.body;

  if (!adresse || !vejnavn || !husnr || !postnr || !bynavn || !adgangsadresseID) {
    return res.status(400).json({ message: "Ejendommen skal oprettes fra en valideret adresse" });
  }

  try {
    const pool = await getPool();
    const bbrData = await hentBbrData(adresseID, adgangsadresseID);
    const bbrVurdering = vurderEjendomsprofilMulighedFraBbrData(bbrData);

    if (!bbrVurdering.kanOprettes) {
      return res.status(400).json({
        message: bbrVurdering.aarsag || "Adressen kan ikke bruges til en ejendomsprofil"
      });
    }

    await pool.request()
      .input("adresse", sql.VarChar(255), adresse)
      .input("adresseID", sql.VarChar(50), adresseID || null)
      .input("vejnavn", sql.VarChar(100), vejnavn || null)
      .input("husnr", sql.VarChar(20), husnr || null)
      .input("postnr", sql.VarChar(10), postnr || null)
      .input("bynavn", sql.VarChar(100), bynavn || null)
      .input("adgangsadresseID", sql.VarChar(50), adgangsadresseID)
      .input("boligtype", sql.VarChar(100), bbrData.boligtype || null)
      .input("byggeaar", sql.Int, bbrData.byggeaar || null)
      .input("boligareal", sql.Int, bbrData.boligareal || null)
      .input("grundareal", sql.Int, bbrData.grundareal || null)
      .input("antalVaerelser", sql.Int, bbrData.antalVaerelser || null)
      .query(`
        INSERT INTO Ejendomsprofil
        (adresse, adresseID, vejnavn, husnr, postnr, bynavn, adgangsadresseID, boligtype, byggeaar, boligareal, grundareal, antalVaerelser)
        VALUES
        (@adresse, @adresseID, @vejnavn, @husnr, @postnr, @bynavn, @adgangsadresseID, @boligtype, @byggeaar, @boligareal, @grundareal, @antalVaerelser)
      `);

    res.status(201).json({ message: "Ejendom oprettet" });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ message: "Der findes allerede en ejendomsprofil med den adresse." });
    }

    console.error("Fejl ved oprettelse af ejendom:", error);
    res.status(500).json({ message: "Server fejl" });
  }
});

router.get("/", async (req, res) => {
  try {
    const pool = await getPool();
    res.json(await hentEjendomme(pool));
  } catch (error) {
    console.error("Fejl ved hentning af ejendomme:", error);
    res.status(500).json({ message: "Server fejl" });
  }
});

router.get("/find", async (req, res) => {
  const { adresseID, adgangsadresseID } = req.query;

  if (!adresseID && !adgangsadresseID) {
    return res.status(400).json({ message: "adresseID eller adgangsadresseID mangler" });
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    let whereClause = "1 = 1";

    if (adresseID) {
      request.input("adresseID", sql.VarChar(50), adresseID);
      whereClause += " AND e.adresseID = @adresseID";
    } else {
      request.input("adgangsadresseID", sql.VarChar(50), adgangsadresseID);
      whereClause += " AND e.adgangsadresseID = @adgangsadresseID";
    }

    const result = await request.query(`
      SELECT TOP 1
        e.ejendomID AS id,
        e.adresse,
        e.adresseID,
        e.adgangsadresseID,
        e.postnr,
        e.bynavn,
        COUNT(c.caseID) AS antalCases
      FROM Ejendomsprofil e
      LEFT JOIN Investeringscase c ON e.ejendomID = c.ejendomID
      WHERE ${whereClause}
      GROUP BY e.ejendomID, e.adresse, e.adresseID, e.adgangsadresseID, e.postnr, e.bynavn
      ORDER BY e.ejendomID DESC
    `);

    res.json(result.recordset[0] || null);
  } catch (error) {
    console.error("Fejl ved opslag af ejendom:", error);
    res.status(500).json({ message: "Server fejl" });
  }
});

async function hentEjendomme(pool) {
  const result = await pool.request().query(`
    SELECT
      e.ejendomID AS id,
      e.adresse,
      e.adresseID,
      e.vejnavn,
      e.husnr,
      e.postnr,
      e.bynavn,
      e.adgangsadresseID,
      e.boligtype,
      e.byggeaar,
      e.boligareal,
      e.grundareal,
      e.antalVaerelser,
      e.oprettetTidspunkt,
      e.sidstOpdateret,
      COUNT(c.caseID) AS antalCases
    FROM Ejendomsprofil e
    LEFT JOIN Investeringscase c ON e.ejendomID = c.ejendomID
    GROUP BY
      e.ejendomID, e.adresse, e.adresseID, e.vejnavn, e.husnr, e.postnr, e.bynavn,
      e.adgangsadresseID, e.boligtype, e.byggeaar, e.boligareal, e.grundareal,
      e.antalVaerelser, e.oprettetTidspunkt, e.sidstOpdateret
    ORDER BY e.oprettetTidspunkt DESC
  `);

  return result.recordset;
}

router.delete("/:id", async (req, res) => {
  const ejendomID = Number(req.params.id);

  try {
    const pool = await getPool();
    await pool.request()
      .input("ejendomID", sql.Int, ejendomID)
      .query(`
        DELETE FROM Investeringscase WHERE ejendomID = @ejendomID;
        DELETE FROM Ejendomsprofil WHERE ejendomID = @ejendomID;
      `);

    res.json({ message: "Ejendom og tilknyttede investeringscases slettet" });
  } catch (error) {
    console.error("Fejl ved sletning af ejendom:", error);
    res.status(500).json({ message: "Server fejl" });
  }
});

module.exports = router;
