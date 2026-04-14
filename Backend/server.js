// Import dependencies
const express = require("express");
const path = require("path");
require("dotenv").config();

// Import database connection
const { sql, getPool } = require("./db");

// Init app
const app = express();
const port = process.env.PORT || 3000;

/* =========================
   MIDDLEWARE
========================= */

// gør så vi kan læse JSON fra requests
app.use(express.json());

// serverer frontend filer (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "../frontend")));

/* =========================
   TEST DATABASE CONNECTION
========================= */

// simpel test af DB connection
app.get("/api/test-db", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT 1 AS ok");
    res.json(result.recordset[0]);
  } catch (error) {
    console.error("DB fejl:", error);
    res.status(500).json({ message: "Database fejl" });
  }
});

/* =========================
   OPRET BRUGER
========================= */

app.post("/brugere", async (req, res) => {
  const nyBruger = req.body;

  // basic validering
  if (!nyBruger.email || !nyBruger.adgangskode) {
    return res.status(400).json({
      message: "Email og adgangskode mangler"
    });
  }

  try {
    const pool = await getPool();

    // tjek om email findes allerede
    const findes = await pool.request()
      .input("email", sql.VarChar(255), nyBruger.email)
      .query("SELECT brugerID FROM Bruger WHERE email = @email");

    if (findes.recordset.length > 0) {
      return res.status(400).json({
        message: "Bruger findes allerede"
      });
    }

    // indsæt ny bruger i database
    await pool.request()
      .input("fornavn", sql.VarChar(100), nyBruger.fornavn || "")
      .input("efternavn", sql.VarChar(100), nyBruger.efternavn || "")
      .input("telefon", sql.VarChar(30), nyBruger.telefon || null)
      .input("email", sql.VarChar(255), nyBruger.email)
      .input("foedselsdato", sql.Date, nyBruger.foedselsdato || null)
      .input("investorType", sql.VarChar(100), nyBruger.investorType || null)
      .input("adgangskode", sql.VarChar(255), nyBruger.adgangskode)
      .query(`
        INSERT INTO Bruger
        (fornavn, efternavn, telefon, email, foedselsdato, investorType, adgangskode)
        VALUES
        (@fornavn, @efternavn, @telefon, @email, @foedselsdato, @investorType, @adgangskode)
      `);

    res.status(201).json({ message: "Bruger oprettet" });

  } catch (error) {
    console.error("Fejl ved oprettelse:", error);
    res.status(500).json({ message: "Server fejl" });
  }
});

/* =========================
   LOGIN
========================= */

app.post("/login", async (req, res) => {
  const { email, adgangskode } = req.body;

  if (!email || !adgangskode) {
    return res.status(400).json({
      message: "Email og adgangskode mangler"
    });
  }

  try {
    const pool = await getPool();

    // find bruger i DB
    const result = await pool.request()
      .input("email", sql.VarChar(255), email)
      .input("adgangskode", sql.VarChar(255), adgangskode)
      .query(`
        SELECT brugerID, fornavn, efternavn, email
        FROM Bruger
        WHERE email = @email AND adgangskode = @adgangskode
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
    res.status(500).json({ message: "Server fejl" });
  }
});

/* =========================
   OPRET EJENDOM
========================= */

app.post("/ejendomme", async (req, res) => {
  const { adresse, ownerEmail } = req.body;

  if (!adresse || !ownerEmail) {
    return res.status(400).json({
      message: "Adresse eller email mangler"
    });
  }

  try {
    const pool = await getPool();

    // find brugerID via email
    const bruger = await pool.request()
      .input("email", sql.VarChar(255), ownerEmail)
      .query("SELECT brugerID FROM Bruger WHERE email = @email");

    if (bruger.recordset.length === 0) {
      return res.status(400).json({
        message: "Bruger findes ikke"
      });
    }

    const brugerID = bruger.recordset[0].brugerID;

    // indsæt ejendom
    await pool.request()
      .input("brugerID", sql.Int, brugerID)
      .input("adresse", sql.VarChar(255), adresse)
      .query(`
        INSERT INTO Ejendomsprofil (brugerID, adresse)
        VALUES (@brugerID, @adresse)
      `);

    res.json({ message: "Ejendom oprettet" });

  } catch (error) {
    console.error("Ejendom fejl:", error);
    res.status(500).json({ message: "Server fejl" });
  }
});

/* =========================
   HENT EJENDOMME
========================= */

app.get("/mine-ejendomme", async (req, res) => {
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
      `);

    res.json(result.recordset);

  } catch (error) {
    console.error("Hent fejl:", error);
    res.status(500).json({ message: "Server fejl" });
  }
});

/* =========================
   START SERVER
========================= */

app.listen(port, () => {
  console.log("Server kører på port " + port);
});