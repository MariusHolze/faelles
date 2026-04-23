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

    const harAdresseID = await harKolonne(pool, "Ejendomsprofil", "adresseID");
    const request = pool.request()
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
      .input("antalVaerelser", sql.Int, bbrData.antalVaerelser || null);

    if (harAdresseID) {
      request.input("adresseID", sql.VarChar(50), adresseID || null);
    }

    // Her indsætter vi ejendommen i tabellen Ejendomsprofil.
    await request.query(`
      INSERT INTO Ejendomsprofil
      (${harAdresseID ? "brugerID, adresse, adresseID, vejnavn, husnr, postnr, bynavn, adgangsadresseID, boligtype, byggeaar, boligareal, grundareal, antalVaerelser" : "brugerID, adresse, vejnavn, husnr, postnr, bynavn, adgangsadresseID, boligtype, byggeaar, boligareal, grundareal, antalVaerelser"})
      VALUES
      (${harAdresseID ? "@brugerID, @adresse, @adresseID, @vejnavn, @husnr, @postnr, @bynavn, @adgangsadresseID, @boligtype, @byggeaar, @boligareal, @grundareal, @antalVaerelser" : "@brugerID, @adresse, @vejnavn, @husnr, @postnr, @bynavn, @adgangsadresseID, @boligtype, @byggeaar, @boligareal, @grundareal, @antalVaerelser"})
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
    const harAdresseID = await harKolonne(pool, "Ejendomsprofil", "adresseID");
    const ejendomme = await hentEjendommeForBruger(pool, email, harAdresseID);

    // Når profilsiden henter "mine boliger", forsøger vi også at opfriske BBR-data.
    for (const ejendom of ejendomme) {
      await opdaterBbrDataForEjendom(pool, ejendom);
    }

    // Til sidst henter vi listen igen, så frontend får de nyeste BBR-felter.
    const opdateredeEjendomme = await hentEjendommeForBruger(pool, email, harAdresseID);

    // Sender listen med ejendomme tilbage til frontend.
    res.json(opdateredeEjendomme);
  } catch (error) {
    console.error("Fejl ved hentning af ejendomme:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

// Finder en aktiv ejendom i systemet ud fra adresse-id eller adgangsadresse-id.
router.get("/find", async (req, res) => {
  const { adresseID, adgangsadresseID } = req.query;

  if (!adresseID && !adgangsadresseID) {
    return res.status(400).json({
      message: "adresseID eller adgangsadresseID mangler"
    });
  }

  try {
    const pool = await getPool();
    const harAdresseID = await harKolonne(pool, "Ejendomsprofil", "adresseID");
    const request = pool.request();

    let whereClause = "e.erArkiveret = 0";

    if (harAdresseID && adresseID) {
      request.input("adresseID", sql.VarChar(50), adresseID);
      whereClause += " AND e.adresseID = @adresseID";
    } else if (adgangsadresseID) {
      request.input("adgangsadresseID", sql.VarChar(50), adgangsadresseID);
      whereClause += " AND e.adgangsadresseID = @adgangsadresseID";
    }

    const result = await request.query(`
      SELECT TOP 1
        e.ejendomID AS id,
        e.adresse,
        ${harAdresseID ? "e.adresseID," : "CAST(NULL AS VARCHAR(50)) AS adresseID,"}
        e.adgangsadresseID,
        e.postnr,
        e.bynavn,
        COUNT(c.caseID) AS antalCases
      FROM Ejendomsprofil e
      LEFT JOIN Investeringscase c ON e.ejendomID = c.ejendomID
      WHERE ${whereClause}
      GROUP BY
        e.ejendomID,
        e.adresse,
        ${harAdresseID ? "e.adresseID," : ""}
        e.adgangsadresseID,
        e.postnr,
        e.bynavn
      ORDER BY e.ejendomID DESC
    `);

    if (result.recordset.length === 0) {
      return res.json(null);
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Fejl ved opslag af offentlig ejendom:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

async function hentEjendommeForBruger(pool, email, harAdresseID) {
  // Her henter vi alle aktive ejendomme for brugeren.
    // Vi tæller også hvor mange cases der er knyttet til hver ejendom.
  const result = await pool.request()
    .input("email", sql.VarChar(255), email)
    .query(`
        SELECT
          e.ejendomID AS id,
          e.adresse,
          ${harAdresseID ? "e.adresseID," : "CAST(NULL AS VARCHAR(50)) AS adresseID,"}
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
          ${harAdresseID ? "e.adresseID," : ""}
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

  return result.recordset;
}

async function opdaterBbrDataForEjendom(pool, ejendom) {
  if (!ejendom.adresseID && !ejendom.adgangsadresseID) {
    return;
  }

  try {
    const bbrData = await hentBbrData(ejendom.adresseID, ejendom.adgangsadresseID);

    if (!harBbrVaerdier(bbrData)) {
      return;
    }

    await pool.request()
      .input("ejendomID", sql.Int, ejendom.id)
      .input("boligtype", sql.VarChar(100), bbrData.boligtype || ejendom.boligtype || null)
      .input("byggeaar", sql.Int, bbrData.byggeaar || ejendom.byggeaar || null)
      .input("boligareal", sql.Int, bbrData.boligareal || ejendom.boligareal || null)
      .input("grundareal", sql.Int, bbrData.grundareal || ejendom.grundareal || null)
      .input("antalVaerelser", sql.Int, bbrData.antalVaerelser || ejendom.antalVaerelser || null)
      .query(`
        UPDATE Ejendomsprofil
        SET boligtype = @boligtype,
            byggeaar = @byggeaar,
            boligareal = @boligareal,
            grundareal = @grundareal,
            antalVaerelser = @antalVaerelser,
            sidstOpdateret = SYSDATETIME()
        WHERE ejendomID = @ejendomID
      `);
  } catch (error) {
    console.error(`Fejl ved opdatering af BBR-data for ejendom ${ejendom.id}:`, error.message);
  }
}

function harBbrVaerdier(bbrData) {
  return Boolean(
    bbrData &&
    (bbrData.boligtype ||
      bbrData.byggeaar ||
      bbrData.boligareal ||
      bbrData.grundareal ||
      bbrData.antalVaerelser)
  );
}

async function harKolonne(pool, tabel, kolonne) {
  const result = await pool.request()
    .input("tabel", sql.VarChar(128), tabel)
    .input("kolonne", sql.VarChar(128), kolonne)
    .query(`
      SELECT COUNT(*) AS antal
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tabel
        AND COLUMN_NAME = @kolonne
    `);

  return result.recordset[0].antal > 0;
}

// Denne route opdaterer en eksisterende ejendom.
router.put("/:id", async (req, res) => {
  const ejendomID = Number(req.params.id);
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

  // Ejendommen må kun opdateres med en ny valideret adresse.
  // Derfor kræver vi både den samlede adresse og de opdelte adressefelter.
  if (!adresse || !vejnavn || !husnr || !postnr || !bynavn || !adgangsadresseID || !ownerEmail) {
    return res.status(400).json({
      message: "Ejendommen skal opdateres med en valideret adresse"
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

    // Vi henter friske BBR-data ud fra den validerede adresse.
    const bbrData = await hentBbrData(adresseID, adgangsadresseID);
    const harAdresseID = await harKolonne(pool, "Ejendomsprofil", "adresseID");
    const request = pool.request()
      .input("ejendomID", sql.Int, ejendomID)
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
      .input("antalVaerelser", sql.Int, bbrData.antalVaerelser || null);

    if (harAdresseID) {
      request.input("adresseID", sql.VarChar(50), adresseID || null);
    }

    // Hvis adgang er godkendt, opdaterer vi ejendomsprofilen.
    // Samtidig gemmer vi de nye BBR-felter og tidspunktet for sidste ændring.
    await request.query(`
        UPDATE Ejendomsprofil
        SET adresse = @adresse,
            ${harAdresseID ? "adresseID = @adresseID," : ""}
            vejnavn = @vejnavn,
            husnr = @husnr,
            postnr = @postnr,
            bynavn = @bynavn,
            adgangsadresseID = @adgangsadresseID,
            boligtype = @boligtype,
            byggeaar = @byggeaar,
            boligareal = @boligareal,
            grundareal = @grundareal,
            antalVaerelser = @antalVaerelser,
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

// Denne route sletter en ejendom og dens tilknyttede investeringscases.
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

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input("ejendomID", sql.Int, ejendomID)
        .query(`
          DELETE FROM Investeringscase
          WHERE ejendomID = @ejendomID
        `);

      const sletResultat = await new sql.Request(transaction)
        .input("ejendomID", sql.Int, ejendomID)
        .query(`
          DELETE FROM Ejendomsprofil
          WHERE ejendomID = @ejendomID
        `);

      if (sletResultat.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(404).json({
          message: "Ejendom ikke fundet"
        });
      }

      await transaction.commit();

      res.json({
        message: "Ejendom og tilknyttede investeringscases slettet"
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Fejl ved sletning af ejendom:", error);
    res.status(500).json({
      message: "Server fejl"
    });
  }
});

// Eksporterer routeren, så server.js kan bruge den.
module.exports = router;
