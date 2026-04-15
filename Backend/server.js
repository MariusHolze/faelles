console.time("load express");
const express = require("express");
console.timeEnd("load express");

console.time("load path");
const path = require("path");
console.timeEnd("load path");

console.time("load dotenv");
require("dotenv").config();
console.timeEnd("load dotenv");

console.time("load db");
const { sql, getPool } = require("./db");
console.timeEnd("load db");

console.time("init app");
const app = express();
const port = process.env.PORT || 3000;
console.timeEnd("init app");

/* =========================
   MIDDLEWARE
========================= */

// Gør så vi kan læse JSON fra requests
app.use(express.json());

// Server frontend-filer fra /frontend
app.use(express.static(path.join(__dirname, "../frontend")));

/* =========================
   TEST DATABASE CONNECTION
========================= */

// Simpel test af DB connection
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
   SØG ADRESSE (DAWA)
========================= */

// Søger adresse via DAWA autocomplete
app.get("/api/adresse", async (req, res) => {
  const soeg = req.query.soeg;

  if (!soeg || soeg.trim() === "") {
    return res.status(400).json({
      message: "Søgetekst mangler"
    });
  }

  try {
    const response = await fetch(
      `https://api.dataforsyningen.dk/adresser/autocomplete?q=${encodeURIComponent(soeg)}`
    );

    if (!response.ok) {
      return res.status(500).json({
        message: "Fejl ved kontakt til adresse-API"
      });
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({
        message: "Ingen adresse fundet"
      });
    }

    // map de 10 første resultater til et simpelt format
    const adresser = data.slice(0, 10).map((item) => {
      const adr = item.adresse || {};

      return {
        adresse: item.tekst || "",
        vejnavn: adr.vejnavn || "",
        husnr: adr.husnr || "",
        postnr: adr.postnr || "",
        postnrnavn: adr.postnrnavn || ""
      };
    });

    res.json(adresser);

  } catch (error) {
    console.error("Fejl ved adresse API:", error);
    res.status(500).json({
      message: "Fejl ved hentning af adresse"
    });
  }
});

/* =========================
   OPRET BRUGER
========================= */

app.post("/brugere", async (req, res) => {
  const nyBruger = req.body;

  // Simpel validering
  if (!nyBruger.email || !nyBruger.adgangskode) {
    return res.status(400).json({
      message: "Email og adgangskode mangler"
    });
  }

  try {
    const pool = await getPool();

    // Tjek om email findes allerede
    const findes = await pool.request()
      .input("email", sql.VarChar(255), nyBruger.email)
      .query("SELECT brugerID FROM Bruger WHERE email = @email");

    if (findes.recordset.length > 0) {
      return res.status(400).json({
        message: "Bruger findes allerede"
      });
    }

    // Indsæt ny bruger
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

    // Find bruger i DB
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
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

/* =========================
   OPRET EJENDOM
========================= */

app.post("/ejendomme", async (req, res) => {
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

    // Find brugerID via email
    const bruger = await pool.request()
      .input("email", sql.VarChar(255), ownerEmail)
      .query("SELECT brugerID FROM Bruger WHERE email = @email");

    if (bruger.recordset.length === 0) {
      return res.status(400).json({
        message: "Bruger findes ikke"
      });
    }

    const brugerID = bruger.recordset[0].brugerID;

    // Indsæt ejendom
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

    res.json({
      message: "Ejendom oprettet"
    });
  } catch (error) {
    console.error("Ejendom fejl:", error);
    res.status(500).json({
      message: "Server fejl"
    });
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
        ORDER BY e.oprettetTidspunkt DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Hent fejl:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

/* =========================
   REDIGER EJENDOM
========================= */

app.put("/ejendomme/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { adresse, ownerEmail } = req.body;

  if (!adresse || !ownerEmail) {
    return res.status(400).json({
      message: "Adresse eller email mangler"
    });
  }

  try {
    const pool = await getPool();

    // Tjek at ejendommen tilhører den rigtige bruger
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("email", sql.VarChar(255), ownerEmail)
      .query(`
        SELECT e.ejendomID
        FROM Ejendomsprofil e
        JOIN Bruger b ON e.brugerID = b.brugerID
        WHERE e.ejendomID = @id
          AND b.email = @email
          AND e.erArkiveret = 0
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Ejendom ikke fundet eller adgang nægtet"
      });
    }

    await pool.request()
      .input("id", sql.Int, id)
      .input("adresse", sql.VarChar(255), adresse)
      .query(`
        UPDATE Ejendomsprofil
        SET adresse = @adresse,
            sidstOpdateret = SYSDATETIME()
        WHERE ejendomID = @id
      `);

    res.json({
      message: "Ejendom opdateret"
    });
  } catch (error) {
    console.error("Fejl ved redigering:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

/* =========================
   ARKIVER EJENDOM
========================= */

app.delete("/ejendomme/:id", async (req, res) => {
  const id = Number(req.params.id);
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({
      message: "Email mangler"
    });
  }

  try {
    const pool = await getPool();

    // Tjek at ejendommen tilhører brugeren
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("email", sql.VarChar(255), email)
      .query(`
        SELECT e.ejendomID
        FROM Ejendomsprofil e
        JOIN Bruger b ON e.brugerID = b.brugerID
        WHERE e.ejendomID = @id
          AND b.email = @email
          AND e.erArkiveret = 0
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Ejendom ikke fundet eller adgang nægtet"
      });
    }

    await pool.request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE Ejendomsprofil
        SET erArkiveret = 1,
            sidstOpdateret = SYSDATETIME()
        WHERE ejendomID = @id
      `);

    res.json({
      message: "Ejendom arkiveret"
    });
  } catch (error) {
    console.error("Fejl ved sletning/arkivering:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

/* =========================
   START SERVER
========================= */


app.listen(port, () => {
  console.log("Server kører på port " + port);
});