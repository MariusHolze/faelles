const express = require("express");
const router = express.Router();
const { sql, getPool } = require("../db");
const { hentBbrData } = require("../services/bbrService");

// Denne route opretter en ny ejendom i databasen.
router.post("/", async (req, res) => {
  // Vi henter de data, som frontend sender med.
  const {
    adresse,
    adresseID,
    vejnavn,
    husnr,
    postnr,
    bynavn,
    adgangsadresseID,
    ownerEmail
  } = req.body;

  // Ejendommen må kun oprettes ud fra en adresse, der er valgt fra adresse-API'et.
  // Derfor kræver vi både den samlede adresse og de opdelte adressefelter.
  if (!adresse || !vejnavn || !husnr || !postnr || !bynavn || !adgangsadresseID || !ownerEmail) {
    return res.status(400).json({
      message: "Ejendommen skal oprettes fra en valideret adresse"
    });
  }

  try {
    // Henter databaseforbindelsen.
    const pool = await getPool();

    // Vi finder først den bruger, som ejendommen skal tilhøre.
    const brugerResult = await pool.request()
      .input("email", sql.VarChar(255), ownerEmail)
      .query(`
        SELECT brugerID
        FROM Bruger
        WHERE email = @email
      `);

    // Hvis brugeren ikke findes, kan ejendommen ikke oprettes.
    if (brugerResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Bruger findes ikke"
      });
    }

    // Henter brugerens ID fra databasen.
    const brugerID = brugerResult.recordset[0].brugerID;
    const bbrData = await hentBbrData(adresseID, adgangsadresseID); // henter BBR-data ud fra den validerede adresse

    // Her indsætter vi ejendommen i tabellen Ejendomsprofil.
    await pool.request()
      .input("brugerID", sql.Int, brugerID)
      .input("adresse", sql.VarChar(255), adresse)
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
        (brugerID, adresse, vejnavn, husnr, postnr, bynavn, adgangsadresseID, boligtype, byggeaar, boligareal, grundareal, antalVaerelser)
        VALUES
        (@brugerID, @adresse, @vejnavn, @husnr, @postnr, @bynavn, @adgangsadresseID, @boligtype, @byggeaar, @boligareal, @grundareal, @antalVaerelser)
      `);

    // Hvis alt lykkes, sender vi besked om at ejendommen er oprettet.
    res.status(201).json({
      message: "Ejendom oprettet"
    });
  } catch (error) {
    // Logger fejl og sender en generel serverfejl tilbage.
    console.error("Fejl ved oprettelse af ejendom:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

// Denne route henter alle ejendomme, som tilhører en bestemt bruger.
router.get("/", async (req, res) => {
  const email = req.query.email;

  // Email skal bruges for at finde den rigtige bruger.
  if (!email) {
    return res.status(400).json({
      message: "Email mangler"
    });
  }

  try {
    // Henter forbindelse til databasen.
    const pool = await getPool();

    // Her henter vi alle aktive ejendomme for brugeren.
    // Vi tæller også hvor mange cases der er knyttet til hver ejendom.
    const result = await pool.request()
      .input("email", sql.VarChar(255), email)
      .query(`
        SELECT
          e.ejendomID AS id,
          e.adresse,
          e.vejnavn,
          e.husnr,
          e.postnr,
          e.bynavn,
          e.adgangsadresseID,
          -- Disse felter bruges på profilsiden til overblikket over ejendommen.
          e.boligtype,
          e.byggeaar,
          e.boligareal,
          e.grundareal,
          e.antalVaerelser,
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
          e.sidstOpdateret
        ORDER BY e.oprettetTidspunkt DESC
      `);

    // Sender listen med ejendomme tilbage til frontend.
    res.json(result.recordset);
  } catch (error) {
    console.error("Fejl ved hentning af ejendomme:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

// Denne route opdaterer en eksisterende ejendom.
router.put("/:id", async (req, res) => {
  const ejendomID = Number(req.params.id);
  const { adresse, ownerEmail } = req.body;

  // Adresse og email skal bruges for at kunne opdatere.
  if (!adresse || !ownerEmail) {
    return res.status(400).json({
      message: "Adresse eller email mangler"
    });
  }

  try {
    // Henter databaseforbindelsen.
    const pool = await getPool();

    // Først tjekker vi om ejendommen findes,
    // og om den tilhører den bruger der prøver at redigere den.
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

    // Hvis der ikke findes en match, må brugeren ikke opdatere den.
    if (adgangResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Ejendom ikke fundet eller ingen adgang"
      });
    }

    // Hvis adgang er godkendt, opdaterer vi adressen.
    // Samtidig gemmer vi tidspunktet for sidste ændring.
    await pool.request()
      .input("ejendomID", sql.Int, ejendomID)
      .input("adresse", sql.VarChar(255), adresse)
      .query(`
        UPDATE Ejendomsprofil
        SET adresse = @adresse,
            sidstOpdateret = SYSDATETIME()
        WHERE ejendomID = @ejendomID
      `);

    // Sender svar tilbage om at opdateringen lykkedes.
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

// Denne route arkiverer en ejendom i stedet for at slette den helt.
router.delete("/:id", async (req, res) => {
  const ejendomID = Number(req.params.id);
  const email = req.query.email;

  // Email bruges til at kontrollere ejerforhold.
  if (!email) {
    return res.status(400).json({
      message: "Email mangler"
    });
  }

  try {
    // Henter databaseforbindelsen.
    const pool = await getPool();

    // Først tjekker vi om brugeren har adgang til den valgte ejendom.
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

    // Hvis ejendommen ikke findes eller ikke tilhører brugeren,
    // stopper vi her.
    if (adgangResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Ejendom ikke fundet eller ingen adgang"
      });
    }

    // I stedet for at slette rækken sætter vi erArkiveret til 1.
    // Det gør at ejendommen skjules, men stadig findes i databasen.
    await pool.request()
      .input("ejendomID", sql.Int, ejendomID)
      .query(`
        UPDATE Ejendomsprofil
        SET erArkiveret = 1,
            sidstOpdateret = SYSDATETIME()
        WHERE ejendomID = @ejendomID
      `);

    // Sender besked tilbage om at ejendommen er arkiveret.
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

// Eksporterer routeren, så server.js kan bruge den.
module.exports = router;
