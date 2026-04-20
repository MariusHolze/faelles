const express = require("express");
const router = express.Router();
const { sql, getPool } = require("../db");

const gyldigeTrin = [
  "koebsudgifter",
  "finansiering",
  "renovering",
  "driftsbudget",
  "udlejning"
];

function erGyldigtTrin(trin) {
  return gyldigeTrin.includes(trin);
}

async function brugerHarAdgangTilCase(pool, caseID, email) {
  const result = await pool.request()
    .input("caseID", sql.Int, Number(caseID))
    .input("email", sql.VarChar(255), email)
    .query(`
      SELECT c.caseID
      FROM Investeringscase c
      JOIN Ejendomsprofil e ON c.ejendomID = e.ejendomID
      JOIN Bruger b ON e.brugerID = b.brugerID
      WHERE c.caseID = @caseID
        AND b.email = @email
        AND e.erArkiveret = 0
    `);

  return result.recordset.length > 0;
}

function hentKoebsposter(data) {
  if (!data || !Array.isArray(data.poster)) {
    return [];
  }

  return data.poster
    .map((post) => ({
      navn: String(post.navn || "").trim(),
      beloeb: Number(post.beloeb)
    }))
    .filter((post) => post.navn && !Number.isNaN(post.beloeb) && post.beloeb >= 0);
}

function parseJson(value) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function tal(value) {
  const nummer = Number(value);
  return Number.isNaN(nummer) ? 0 : nummer;
}

function beregnAnalyse(trinData) {
  const koeb = trinData.koebsudgifter || {};
  const finansiering = trinData.finansiering || {};
  const drift = trinData.driftsbudget || {};
  const udlejning = trinData.udlejning || {};
  const poster = hentKoebsposter(koeb);
  const koebsudgifterIAlt = poster.reduce((sum, post) => sum + post.beloeb, 0);
  const driftsudgifterAarligt =
    tal(drift.ejendomsskat) +
    tal(drift.forsikring) +
    tal(drift.vedligehold) +
    tal(drift.oevrigeUdgifter);
  const lejeAarligt = tal(udlejning.maanedligLeje) * 12;
  const tomgangBeloeb = lejeAarligt * (tal(udlejning.tomgangProcent) / 100);
  const lejeEfterTomgang = lejeAarligt - tomgangBeloeb;
  const renteudgiftAarligt = tal(finansiering.laanebeloeb) * (tal(finansiering.rente) / 100);
  const resultatFoerFinansiering = lejeEfterTomgang - driftsudgifterAarligt;
  const resultatEfterRente = resultatFoerFinansiering - renteudgiftAarligt;
  const egenkapitalBehov = Math.max(0, koebsudgifterIAlt - tal(finansiering.laanebeloeb));

  return {
    antalKoebsposter: poster.length,
    koebsudgifterIAlt,
    driftsudgifterAarligt,
    lejeAarligt,
    tomgangBeloeb,
    lejeEfterTomgang,
    renteudgiftAarligt,
    resultatFoerFinansiering,
    resultatEfterRente,
    egenkapitalBehov
  };
}

// Henter alle cases for en bruger.
router.get("/", async (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ message: "Email mangler" });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("email", sql.VarChar(255), email)
      .query(`
        SELECT
          c.caseID,
          c.ejendomID,
          c.navn,
          c.beskrivelse,
          c.oprettetTidspunkt,
          e.adresse,
          e.boligareal,
          e.byggeaar,
          COALESCE(SUM(k.beloeb), 0) AS koebsudgifterIAlt
        FROM Investeringscase c
        JOIN Ejendomsprofil e ON c.ejendomID = e.ejendomID
        JOIN Bruger b ON e.brugerID = b.brugerID
        LEFT JOIN InvesteringscaseKoebspost k ON c.caseID = k.caseID
        WHERE b.email = @email
          AND e.erArkiveret = 0
        GROUP BY
          c.caseID,
          c.ejendomID,
          c.navn,
          c.beskrivelse,
          c.oprettetTidspunkt,
          e.adresse,
          e.boligareal,
          e.byggeaar
        ORDER BY c.oprettetTidspunkt DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Fejl ved hentning af investeringscases:", error);
    res.status(500).json({ message: "Server fejl" });
  }
});

// Opretter en case med navn, beskrivelse og variable købsposter.
router.post("/", async (req, res) => {
  const { ejendomID, ownerEmail, navn, beskrivelse, koebsposter } = req.body;
  const caseNavn = String(navn || "").trim();
  const caseBeskrivelse = String(beskrivelse || "").trim();
  const poster = Array.isArray(koebsposter) ? koebsposter : [];

  if (!ejendomID || !ownerEmail || !caseNavn) {
    return res.status(400).json({ message: "Ejendom, bruger og navn skal udfyldes" });
  }

  if (caseNavn.length > 100) {
    return res.status(400).json({ message: "Navn må højst være 100 tegn" });
  }

  try {
    const pool = await getPool();

    // Tjekker at ejendommen tilhører brugeren.
    const adgang = await pool.request()
      .input("ejendomID", sql.Int, Number(ejendomID))
      .input("email", sql.VarChar(255), ownerEmail)
      .query(`
        SELECT e.ejendomID
        FROM Ejendomsprofil e
        JOIN Bruger b ON e.brugerID = b.brugerID
        WHERE e.ejendomID = @ejendomID
          AND b.email = @email
          AND e.erArkiveret = 0
      `);

    if (adgang.recordset.length === 0) {
      return res.status(404).json({ message: "Ejendom ikke fundet eller ingen adgang" });
    }

    // Navnet skal være unikt for brugerens cases.
    const eksisterende = await pool.request()
      .input("email", sql.VarChar(255), ownerEmail)
      .input("navn", sql.VarChar(100), caseNavn)
      .query(`
        SELECT c.caseID
        FROM Investeringscase c
        JOIN Ejendomsprofil e ON c.ejendomID = e.ejendomID
        JOIN Bruger b ON e.brugerID = b.brugerID
        WHERE b.email = @email
          AND c.navn = @navn
      `);

    if (eksisterende.recordset.length > 0) {
      return res.status(409).json({ message: "Du har allerede en case med det navn" });
    }

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

    // Gemmer kun købsposter med både navn og gyldigt beløb.
    for (const post of poster) {
      const postNavn = String(post.navn || "").trim();
      const beloeb = Number(post.beloeb);

      if (!postNavn || Number.isNaN(beloeb) || beloeb < 0) {
        continue;
      }

      await pool.request()
        .input("caseID", sql.Int, caseID)
        .input("navn", sql.VarChar(100), postNavn)
        .input("beloeb", sql.Decimal(18, 2), beloeb)
        .query(`
          INSERT INTO InvesteringscaseKoebspost (caseID, navn, beloeb)
          VALUES (@caseID, @navn, @beloeb)
        `);
    }

    res.status(201).json({
      message: "Investeringscase oprettet",
      caseID
    });
  } catch (error) {
    console.error("Fejl ved oprettelse af investeringscase:", error);
    res.status(500).json({ message: "Server fejl" });
  }
});

// Henter gemte data for ét trin i den guidede formular.
router.get("/:caseID/trin/:trin", async (req, res) => {
  const { caseID, trin } = req.params;
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ message: "Email mangler" });
  }

  if (!erGyldigtTrin(trin)) {
    return res.status(400).json({ message: "Ugyldigt formulartrin" });
  }

  try {
    const pool = await getPool();
    const harAdgang = await brugerHarAdgangTilCase(pool, caseID, email);

    if (!harAdgang) {
      return res.status(404).json({ message: "Case ikke fundet eller ingen adgang" });
    }

    const result = await pool.request()
      .input("caseID", sql.Int, Number(caseID))
      .input("trin", sql.VarChar(50), trin)
      .query(`
        SELECT dataJson, opdateretTidspunkt
        FROM InvesteringscaseTrinData
        WHERE caseID = @caseID
          AND trin = @trin
      `);

    if (result.recordset.length === 0) {
      return res.json({ data: null });
    }

    res.json({
      data: JSON.parse(result.recordset[0].dataJson),
      opdateretTidspunkt: result.recordset[0].opdateretTidspunkt
    });
  } catch (error) {
    console.error("Fejl ved hentning af formulartrin:", error);
    res.status(500).json({ message: "Server fejl" });
  }
});

// Samler de gemte trin til en enkel økonomisk analyse.
router.get("/:caseID/analyse", async (req, res) => {
  const { caseID } = req.params;
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ message: "Email mangler" });
  }

  try {
    const pool = await getPool();
    const harAdgang = await brugerHarAdgangTilCase(pool, caseID, email);

    if (!harAdgang) {
      return res.status(404).json({ message: "Case ikke fundet eller ingen adgang" });
    }

    const result = await pool.request()
      .input("caseID", sql.Int, Number(caseID))
      .query(`
        SELECT trin, dataJson
        FROM InvesteringscaseTrinData
        WHERE caseID = @caseID
      `);

    const trinData = {};

    result.recordset.forEach((row) => {
      trinData[row.trin] = parseJson(row.dataJson);
    });

    res.json({
      trinData,
      analyse: beregnAnalyse(trinData)
    });
  } catch (error) {
    console.error("Fejl ved beregning af investeringsanalyse:", error);
    res.status(500).json({ message: "Server fejl" });
  }
});

// Gemmer data for ét trin i den guidede formular.
router.put("/:caseID/trin/:trin", async (req, res) => {
  const { caseID, trin } = req.params;
  const { ownerEmail, data } = req.body;

  if (!ownerEmail) {
    return res.status(400).json({ message: "Email mangler" });
  }

  if (!erGyldigtTrin(trin)) {
    return res.status(400).json({ message: "Ugyldigt formulartrin" });
  }

  try {
    const pool = await getPool();
    const harAdgang = await brugerHarAdgangTilCase(pool, caseID, ownerEmail);

    if (!harAdgang) {
      return res.status(404).json({ message: "Case ikke fundet eller ingen adgang" });
    }

    const dataJson = JSON.stringify(data || {});

    await pool.request()
      .input("caseID", sql.Int, Number(caseID))
      .input("trin", sql.VarChar(50), trin)
      .input("dataJson", sql.NVarChar(sql.MAX), dataJson)
      .query(`
        MERGE InvesteringscaseTrinData AS target
        USING (SELECT @caseID AS caseID, @trin AS trin) AS source
        ON target.caseID = source.caseID AND target.trin = source.trin
        WHEN MATCHED THEN
          UPDATE SET dataJson = @dataJson, opdateretTidspunkt = SYSDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (caseID, trin, dataJson)
          VALUES (@caseID, @trin, @dataJson);
      `);

    // Købsudgifter bruges også i oversigten, så vi holder købsposterne opdateret.
    if (trin === "koebsudgifter") {
      const poster = hentKoebsposter(data);

      await pool.request()
        .input("caseID", sql.Int, Number(caseID))
        .query(`
          DELETE FROM InvesteringscaseKoebspost
          WHERE caseID = @caseID
        `);

      for (const post of poster) {
        await pool.request()
          .input("caseID", sql.Int, Number(caseID))
          .input("navn", sql.VarChar(100), post.navn)
          .input("beloeb", sql.Decimal(18, 2), post.beloeb)
          .query(`
            INSERT INTO InvesteringscaseKoebspost (caseID, navn, beloeb)
            VALUES (@caseID, @navn, @beloeb)
          `);
      }
    }

    res.json({ message: "Formulartrin gemt" });
  } catch (error) {
    console.error("Fejl ved gem af formulartrin:", error);
    res.status(500).json({ message: "Server fejl" });
  }
});

module.exports = router;
