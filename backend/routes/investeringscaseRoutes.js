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

function lavTomCaseData() {
  return {
    koebsudgifter: {},
    finansiering: {},
    renovering: {},
    driftsbudget: {},
    udlejning: {}
  };
}

function mergeTrinData(eksisterendeData, trin, data) {
  const samletData = {
    ...lavTomCaseData(),
    ...(eksisterendeData || {})
  };

  samletData[trin] = data || {};
  return samletData;
}

function tal(value) {
  const nummer = Number(value);
  return Number.isNaN(nummer) ? 0 : nummer;
}

function harData(data) {
  if (!data || typeof data !== "object") {
    return false;
  }

  return Object.values(data).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return value !== "" && value !== null && value !== undefined;
  });
}

function beregnHovedstol(laanebeloeb, egenbetaling) {
  return Math.max(0, tal(laanebeloeb) - tal(egenbetaling));
}

function beregnYdelse(laanebeloeb, rente, loebetid, afdragsfrihed, egenbetaling) {
  const hovedstol = beregnHovedstol(laanebeloeb, egenbetaling);
  const maanedligRente = (tal(rente) / 100) / 12;
  const antalMaaneder = tal(loebetid) * 12;

  // Hvis der mangler lånedata, kan vi ikke beregne en ydelse endnu.
  if (hovedstol <= 0 || antalMaaneder <= 0) {
    return 0;
  }

  // Hvis casen har afdragsfrihed, viser vi den første ydelse som rente-only.
  if (tal(afdragsfrihed) > 0) {
    return hovedstol * maanedligRente;
  }

  if (maanedligRente === 0) {
    return hovedstol / antalMaaneder;
  }

  return hovedstol * (maanedligRente / (1 - Math.pow(1 + maanedligRente, -antalMaaneder)));
}

function beregnAnalyse(trinData) {
  const koeb = trinData.koebsudgifter || {};
  const finansiering = trinData.finansiering || {};
  const renovering = trinData.renovering || {};
  const drift = trinData.driftsbudget || {};
  const udlejning = trinData.udlejning || {};
  const poster = hentKoebsposter(koeb);
  const koebsudgifterIAlt = poster.reduce((sum, post) => sum + post.beloeb, 0);
  const renoveringsbuffer = tal(renovering.renoveringsbudget) * (tal(renovering.bufferProcent) / 100);
  const renoveringIAlt = tal(renovering.renoveringsbudget) + renoveringsbuffer;
  const samletInvestering = koebsudgifterIAlt + renoveringIAlt;
  const driftsudgifterAarligt =
    tal(drift.ejendomsskat) +
    tal(drift.forsikring) +
    tal(drift.vedligehold) +
    tal(drift.oevrigeUdgifter);
  const lejeAarligt = tal(udlejning.maanedligLeje) * 12;
  const tomgangBeloeb = lejeAarligt * (tal(udlejning.tomgangProcent) / 100);
  const lejeEfterTomgang = lejeAarligt - tomgangBeloeb;
  const hovedstol = beregnHovedstol(finansiering.laanebeloeb, finansiering.egenbetaling);
  const renteudgiftAarligt = hovedstol * (tal(finansiering.rente) / 100);
  const maanedligYdelse = beregnYdelse(
    finansiering.laanebeloeb,
    finansiering.rente,
    finansiering.loebetid,
    finansiering.afdragsfrihed,
    finansiering.egenbetaling
  );
  const ydelseAarligt = maanedligYdelse * 12;
  const resultatFoerFinansiering = lejeEfterTomgang - driftsudgifterAarligt;
  const resultatEfterRente = resultatFoerFinansiering - renteudgiftAarligt;
  const resultatEfterFinansiering = resultatFoerFinansiering - ydelseAarligt;
  const egenkapitalBehov = Math.max(0, samletInvestering - tal(finansiering.laanebeloeb));
  const antalUdfyldteTrin = gyldigeTrin.filter((trin) => harData(trinData[trin])).length;
  const naesteTrin = gyldigeTrin.find((trin) => !harData(trinData[trin])) || "koebsudgifter";

  return {
    antalKoebsposter: poster.length,
    koebsudgifterIAlt,
    renoveringIAlt,
    samletInvestering,
    driftsudgifterAarligt,
    lejeAarligt,
    tomgangBeloeb,
    lejeEfterTomgang,
    renteudgiftAarligt,
    maanedligYdelse,
    ydelseAarligt,
    resultatFoerFinansiering,
    resultatEfterRente,
    resultatEfterFinansiering,
    egenkapitalBehov,
    antalUdfyldteTrin,
    naesteTrin
  };
}

function mapCaseRow(row) {
  const data = parseJson(row.dataJson);
  const analyse = beregnAnalyse(data);

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
    egenkapitalBehov: analyse.egenkapitalBehov,
    maanedligYdelse: analyse.maanedligYdelse,
    lejeEfterTomgang: analyse.lejeEfterTomgang,
    driftsudgifterAarligt: analyse.driftsudgifterAarligt,
    resultatEfterFinansiering: analyse.resultatEfterFinansiering,
    antalUdfyldteTrin: analyse.antalUdfyldteTrin,
    naesteTrin: analyse.naesteTrin
  };
}

// Henter alle cases for en bruger eller for en bestemt ejendom.
router.get("/", async (req, res) => {
  const email = req.query.email;
  const ejendomID = req.query.ejendomID;

  if (!email && !ejendomID) {
    return res.status(400).json({ message: "Email eller ejendomID mangler" });
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    let whereClause = "1 = 1";

    if (email) {
      request.input("email", sql.VarChar(255), email);
      whereClause += " AND b.email = @email";
    }

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
        JOIN Bruger b ON e.brugerID = b.brugerID
        WHERE ${whereClause}
        ORDER BY c.oprettetTidspunkt DESC
      `);

    const cases = result.recordset.map(mapCaseRow);

    res.json(cases);
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

    const gyldigePoster = poster
      .map((post) => ({
        navn: String(post.navn || "").trim(),
        beloeb: Number(post.beloeb)
      }))
      .filter((post) => post.navn && !Number.isNaN(post.beloeb) && post.beloeb >= 0);

    const caseData = lavTomCaseData();

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

    const caseID = caseResult.recordset[0].caseID;

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
      .query(`
        SELECT dataJson, oprettetTidspunkt
        FROM Investeringscase
        WHERE caseID = @caseID
      `);

    if (result.recordset.length === 0) {
      return res.json({ data: null });
    }

    const samletData = parseJson(result.recordset[0].dataJson);

    res.json({
      data: samletData[trin] || null,
      opdateretTidspunkt: result.recordset[0].oprettetTidspunkt
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
    res.status(500).json({ message: "Server fejl" });
  }
});

// Gemmer data for ét trin i den guidede formular.
// Sletter en investeringscase, hvis brugeren ejer den.
router.delete("/:caseID", async (req, res) => {
  const { caseID } = req.params;
  const { ownerEmail } = req.body;

  if (!ownerEmail) {
    return res.status(400).json({ message: "Email mangler" });
  }

  try {
    const pool = await getPool();
    const harAdgang = await brugerHarAdgangTilCase(pool, caseID, ownerEmail);

    if (!harAdgang) {
      return res.status(404).json({ message: "Case ikke fundet eller ingen adgang" });
    }

    const result = await pool.request()
      .input("caseID", sql.Int, Number(caseID))
      .query(`
        DELETE FROM Investeringscase
        WHERE caseID = @caseID
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Case ikke fundet" });
    }

    res.json({ message: "Investeringscase slettet" });
  } catch (error) {
    console.error("Fejl ved sletning af investeringscase:", error);
    res.status(500).json({ message: "Server fejl" });
  }
});

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
    res.status(500).json({ message: "Server fejl" });
  }
});

module.exports = router;
