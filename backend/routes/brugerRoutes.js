const express = require("express");
const router = express.Router();
const { sql, getPool } = require("../db");

// opret bruger
router.post("/", async (req, res) => {
  const {
    fornavn,
    efternavn,
    telefon,
    email,
    foedselsdato,
    investorType,
    adgangskode
  } = req.body;

  if (!email || !adgangskode) {
    return res.status(400).json({
      message: "Email og adgangskode mangler"
    });
  }

  try {
    const pool = await getPool();

    const findes = await pool.request()
      .input("email", sql.VarChar(255), email)
      .query(`
        SELECT brugerID
        FROM Bruger
        WHERE email = @email
      `);

    if (findes.recordset.length > 0) {
      return res.status(400).json({
        message: "Bruger findes allerede"
      });
    }

    await pool.request()
      .input("fornavn", sql.VarChar(100), fornavn || "")
      .input("efternavn", sql.VarChar(100), efternavn || "")
      .input("telefon", sql.VarChar(30), telefon || null)
      .input("email", sql.VarChar(255), email)
      .input("foedselsdato", sql.Date, foedselsdato || null)
      .input("investorType", sql.VarChar(100), investorType || null)
      .input("adgangskode", sql.VarChar(255), adgangskode)
      .query(`
        INSERT INTO Bruger
        (fornavn, efternavn, telefon, email, foedselsdato, investorType, adgangskode)
        VALUES
        (@fornavn, @efternavn, @telefon, @email, @foedselsdato, @investorType, @adgangskode)
      `);

    res.status(201).json({
      message: "Bruger oprettet"
    });
  } catch (error) {
    console.error("Fejl ved oprettelse af bruger:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

// login
router.post("/login", async (req, res) => {
  const { email, adgangskode } = req.body;

  if (!email || !adgangskode) {
    return res.status(400).json({
      message: "Email og adgangskode mangler"
    });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("email", sql.VarChar(255), email)
      .input("adgangskode", sql.VarChar(255), adgangskode)
      .query(`
        SELECT brugerID, fornavn, efternavn, email
        FROM Bruger
        WHERE email = @email
          AND adgangskode = @adgangskode
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({
        message: "Forkert login"
      });
    }

    res.json({
      message: "Login ok",
      bruger: result.recordset[0]
    });
  } catch (error) {
    console.error("Login fejl:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

module.exports = router;