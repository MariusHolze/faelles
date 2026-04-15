const express = require("express");
const router = express.Router();
const { sql, getPool } = require("../db");

// Denne route opretter en ny bruger i databasen.
router.post("/", async (req, res) => {
  // Vi henter de oplysninger, som frontend sender med i body.
  const {
    fornavn,
    efternavn,
    telefon,
    email,
    foedselsdato,
    investorType,
    adgangskode
  } = req.body;

  // Email og adgangskode er nødvendige for at kunne oprette brugeren.
  if (!email || !adgangskode) {
    return res.status(400).json({
      message: "Email og adgangskode mangler"
    });
  }

  try {
    // Henter forbindelse til databasen.
    const pool = await getPool();

    // Først tjekker vi om der allerede findes en bruger med samme email.
    const findes = await pool.request()
      .input("email", sql.VarChar(255), email)
      .query(`
        SELECT brugerID
        FROM Bruger
        WHERE email = @email
      `);

    // Hvis email allerede findes, stopper vi oprettelsen.
    if (findes.recordset.length > 0) {
      return res.status(400).json({
        message: "Bruger findes allerede"
      });
    }

    // Hvis brugeren ikke findes i forvejen,
    // indsætter vi den nye bruger i tabellen Bruger.
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

    // Hvis alt gik godt, sender vi svar tilbage om at brugeren er oprettet.
    res.status(201).json({
      message: "Bruger oprettet"
    });
  } catch (error) {
    // Hvis noget går galt i databasen eller serveren,
    // logger vi fejlen og sender en generel fejlbesked tilbage.
    console.error("Fejl ved oprettelse af bruger:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

// Denne route bruges til login.
router.post("/login", async (req, res) => {
  const { email, adgangskode } = req.body;

  // Begge felter skal være sendt med.
  if (!email || !adgangskode) {
    return res.status(400).json({
      message: "Email og adgangskode mangler"
    });
  }

  try {
    // Henter databaseforbindelsen.
    const pool = await getPool();

    // Her leder vi efter en bruger med både rigtig email og adgangskode.
    const result = await pool.request()
      .input("email", sql.VarChar(255), email)
      .input("adgangskode", sql.VarChar(255), adgangskode)
      .query(`
        SELECT brugerID, fornavn, efternavn, email
        FROM Bruger
        WHERE email = @email
          AND adgangskode = @adgangskode
      `);

    // Hvis der ikke findes en matchende bruger,
    // er login forkert.
    if (result.recordset.length === 0) {
      return res.status(401).json({
        message: "Forkert login"
      });
    }

    // Hvis login passer, sender vi brugerens oplysninger tilbage.
    res.json({
      message: "Login ok",
      bruger: result.recordset[0]
    });
  } catch (error) {
    // Hvis der opstår fejl, sender vi en serverfejl tilbage.
    console.error("Login fejl:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

// Eksporterer routeren, så den kan bruges i server.js
module.exports = router;