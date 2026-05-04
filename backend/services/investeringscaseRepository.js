// gemmer og henter fra databasen.

const { sql } = require("../db");
const { beregnInvesteringscase } = require("./beregnCase");

function request(db) {
  return db.request ? db.request() : new sql.Request(db);
}

function tekst(value, maxLength) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function tal(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function heltal(value) {
  return Math.round(tal(value));
}

function poster(value) {
  return Array.isArray(value)
    ? value
      .map((post) => ({
        navn: tekst(post.navn, 100),
        beloeb: tal(post.beloeb),
        periode: post.periode === "aarligt" ? "aarligt" : "maanedligt",
        tidspunktAar: post.tidspunktAar === undefined || post.tidspunktAar === "" || post.tidspunktAar === null
          ? null
          : heltal(post.tidspunktAar)
      }))
      .filter((post) => post.navn || post.beloeb > 0)
    : [];
}

async function hentCaseInput(pool, caseID) {
  const [koeb, renovering, finansiering, drift, udlejning] = await Promise.all([
    pool.request()
      .input("caseID", sql.Int, caseID)
      .query("SELECT navn, beloeb FROM InvesteringscaseKoebspost WHERE caseID = @caseID ORDER BY koebspostID"),
    pool.request()
      .input("caseID", sql.Int, caseID)
      .query(`
        SELECT navn, beloeb, tidspunktAar
        FROM InvesteringscaseRenoveringspost
        WHERE caseID = @caseID
        ORDER BY renoveringspostID
      `),
    pool.request()
      .input("caseID", sql.Int, caseID)
      .query("SELECT laanebeloeb, egenbetaling, rente, loebetid FROM InvesteringscaseFinansiering WHERE caseID = @caseID"),
    pool.request()
      .input("caseID", sql.Int, caseID)
      .query("SELECT navn, beloeb, periode FROM InvesteringscaseDriftspost WHERE caseID = @caseID ORDER BY driftspostID"),
    pool.request()
      .input("caseID", sql.Int, caseID)
      .query(`
        SELECT aktiv, maanedligLeje,
               maanedligeUdlejningsudgifter, aarligeUdlejningsudgifter
        FROM InvesteringscaseUdlejning
        WHERE caseID = @caseID
      `)
  ]);

  const finansieringRow = finansiering.recordset[0] || {};
  const udlejningRow = udlejning.recordset[0] || {};
  const udlejningsudgifter = [];

  if (tal(udlejningRow.maanedligeUdlejningsudgifter) > 0) {
    udlejningsudgifter.push({
      navn: "Udlejningsudgifter",
      beloeb: tal(udlejningRow.maanedligeUdlejningsudgifter),
      periode: "maanedligt"
    });
  }

  if (tal(udlejningRow.aarligeUdlejningsudgifter) > 0) {
    udlejningsudgifter.push({
      navn: "Årlige udlejningsudgifter",
      beloeb: tal(udlejningRow.aarligeUdlejningsudgifter),
      periode: "aarligt"
    });
  }

  return {
    koebsposter: koeb.recordset.map((row) => ({
      navn: row.navn,
      beloeb: Number(row.beloeb)
    })),
    renoveringAktiv: renovering.recordset.length > 0,
    renoveringer: renovering.recordset.map((row) => ({
      navn: row.navn,
      beloeb: Number(row.beloeb),
      tidspunktAar: row.tidspunktAar
    })),
    laanebeloeb: tal(finansieringRow.laanebeloeb),
    egenbetaling: tal(finansieringRow.egenbetaling),
    rente: tal(finansieringRow.rente),
    loebetid: tal(finansieringRow.loebetid),
    driftsposter: drift.recordset.map((row) => ({
      navn: row.navn,
      beloeb: Number(row.beloeb),
      periode: row.periode
    })),
    udlejningAktiv: Boolean(udlejningRow.aktiv),
    maanedligLeje: tal(udlejningRow.maanedligLeje),
    udlejningsudgifter,
    vaekstProcent: 2,
    periodeAar: 30
  };
}

function mapCase(row, input) {
  return {
    caseID: row.caseID,
    ejendomID: row.ejendomID,
    navn: row.navn,
    beskrivelse: row.beskrivelse,
    oprettetTidspunkt: row.oprettetTidspunkt,
    adresse: row.adresse,
    boligareal: row.boligareal,
    byggeaar: row.byggeaar,
    input,
    resultat: beregnInvesteringscase(input)
  };
}

async function hentAlleCases(pool, ejendomID) {
  const dbRequest = pool.request();
  let where = "";

  if (ejendomID) {
    dbRequest.input("ejendomID", sql.Int, Number(ejendomID));
    where = "WHERE c.ejendomID = @ejendomID";
  }

  const result = await dbRequest.query(`
    SELECT c.caseID, c.ejendomID, c.navn, c.beskrivelse, c.oprettetTidspunkt,
           e.adresse, e.boligareal, e.byggeaar
    FROM Investeringscase c
    JOIN Ejendomsprofil e ON e.ejendomID = c.ejendomID
    ${where}
    ORDER BY c.oprettetTidspunkt DESC
  `);

  return Promise.all(result.recordset.map(async (row) => {
    const input = await hentCaseInput(pool, row.caseID);
    return mapCase(row, input);
  }));
}

async function hentCase(pool, caseID) {
  const result = await pool.request()
    .input("caseID", sql.Int, Number(caseID))
    .query(`
      SELECT c.caseID, c.ejendomID, c.navn, c.beskrivelse, c.oprettetTidspunkt,
             e.adresse, e.boligareal, e.byggeaar
      FROM Investeringscase c
      JOIN Ejendomsprofil e ON e.ejendomID = c.ejendomID
      WHERE c.caseID = @caseID
    `);

  const row = result.recordset[0];
  return row ? mapCase(row, await hentCaseInput(pool, row.caseID)) : null;
}

async function gemKoebsposter(transaction, caseID, input) {
  for (const post of poster(input.koebsposter)) {
    await request(transaction)
      .input("caseID", sql.Int, Number(caseID))
      .input("navn", sql.VarChar(100), post.navn)
      .input("beloeb", sql.Decimal(18, 2), post.beloeb)
      .query("INSERT INTO InvesteringscaseKoebspost (caseID, navn, beloeb) VALUES (@caseID, @navn, @beloeb)");
  }
}

async function gemRenoveringer(transaction, caseID, input) {
  if (!input.renoveringAktiv) {
    return;
  }

  for (const post of poster(input.renoveringer)) {
    await request(transaction)
      .input("caseID", sql.Int, Number(caseID))
      .input("navn", sql.VarChar(100), post.navn)
      .input("beloeb", sql.Decimal(18, 2), post.beloeb)
      .input("tidspunktAar", sql.Int, post.tidspunktAar)
      .query(`
        INSERT INTO InvesteringscaseRenoveringspost
        (caseID, navn, beloeb, tidspunktAar)
        VALUES
        (@caseID, @navn, @beloeb, @tidspunktAar)
      `);
  }
}

async function gemFinansiering(transaction, caseID, input) {
  await request(transaction)
    .input("caseID", sql.Int, Number(caseID))
    .input("laanebeloeb", sql.Decimal(18, 2), tal(input.laanebeloeb))
    .input("egenbetaling", sql.Decimal(18, 2), tal(input.egenbetaling))
    .input("rente", sql.Decimal(9, 4), tal(input.rente))
    .input("loebetid", sql.Int, heltal(input.loebetid) || 1)
    .query(`
      INSERT INTO InvesteringscaseFinansiering
      (caseID, laanebeloeb, egenbetaling, rente, loebetid)
      VALUES (@caseID, @laanebeloeb, @egenbetaling, @rente, @loebetid)
    `);
}

async function gemDriftsposter(transaction, caseID, input) {
  for (const post of poster(input.driftsposter)) {
    if (post.beloeb <= 0) {
      continue;
    }

    await request(transaction)
      .input("caseID", sql.Int, Number(caseID))
      .input("navn", sql.VarChar(100), post.navn)
      .input("beloeb", sql.Decimal(18, 2), post.beloeb)
      .input("periode", sql.VarChar(20), post.periode)
      .query("INSERT INTO InvesteringscaseDriftspost (caseID, navn, beloeb, periode) VALUES (@caseID, @navn, @beloeb, @periode)");
  }
}

async function gemUdlejning(transaction, caseID, input) {
  const udgifter = poster(input.udlejningsudgifter);
  const maanedligeUdlejningsudgifter = udgifter
    .filter((post) => post.periode === "maanedligt")
    .reduce((sum, post) => sum + post.beloeb, 0);
  const aarligeUdlejningsudgifter = udgifter
    .filter((post) => post.periode === "aarligt")
    .reduce((sum, post) => sum + post.beloeb, 0);

  await request(transaction)
    .input("caseID", sql.Int, Number(caseID))
    .input("aktiv", sql.Bit, Boolean(input.udlejningAktiv))
    .input("maanedligLeje", sql.Decimal(18, 2), tal(input.maanedligLeje))
    .input("maanedligeUdlejningsudgifter", sql.Decimal(18, 2), maanedligeUdlejningsudgifter)
    .input("aarligeUdlejningsudgifter", sql.Decimal(18, 2), aarligeUdlejningsudgifter)
    .query(`
      INSERT INTO InvesteringscaseUdlejning
      (caseID, aktiv, maanedligLeje,
       maanedligeUdlejningsudgifter, aarligeUdlejningsudgifter)
      VALUES
      (@caseID, @aktiv, @maanedligLeje,
       @maanedligeUdlejningsudgifter, @aarligeUdlejningsudgifter)
    `);
}

async function opretCase(pool, body) {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const result = await request(transaction)
      .input("ejendomID", sql.Int, Number(body.ejendomID))
      .input("navn", sql.VarChar(100), tekst(body.navn, 100))
      .input("beskrivelse", sql.VarChar(500), tekst(body.beskrivelse, 500))
      .query(`
        INSERT INTO Investeringscase (ejendomID, navn, beskrivelse)
        OUTPUT INSERTED.caseID
        VALUES (@ejendomID, @navn, @beskrivelse)
      `);

    const caseID = result.recordset[0].caseID;
    await gemKoebsposter(transaction, caseID, body);
    await gemRenoveringer(transaction, caseID, body);
    await gemFinansiering(transaction, caseID, body);
    await gemDriftsposter(transaction, caseID, body);
    await gemUdlejning(transaction, caseID, body);
    await transaction.commit();
    return caseID;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function sletDetaljer(transaction, caseID) {
  for (const table of [
    "InvesteringscaseUdlejning",
    "InvesteringscaseDriftspost",
    "InvesteringscaseRenoveringspost",
    "InvesteringscaseFinansiering",
    "InvesteringscaseKoebspost"
  ]) {
    await request(transaction)
      .input("caseID", sql.Int, Number(caseID))
      .query(`DELETE FROM ${table} WHERE caseID = @caseID`);
  }
}

async function opdaterCase(pool, caseID, body) {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    await request(transaction)
      .input("caseID", sql.Int, Number(caseID))
      .input("ejendomID", sql.Int, Number(body.ejendomID))
      .input("navn", sql.VarChar(100), tekst(body.navn, 100))
      .input("beskrivelse", sql.VarChar(500), tekst(body.beskrivelse, 500))
      .query(`
        UPDATE Investeringscase
        SET ejendomID = @ejendomID,
            navn = @navn,
            beskrivelse = @beskrivelse
        WHERE caseID = @caseID
      `);

    await sletDetaljer(transaction, caseID);
    await gemKoebsposter(transaction, caseID, body);
    await gemRenoveringer(transaction, caseID, body);
    await gemFinansiering(transaction, caseID, body);
    await gemDriftsposter(transaction, caseID, body);
    await gemUdlejning(transaction, caseID, body);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function sletCase(pool, caseID) {
  const result = await pool.request()
    .input("caseID", sql.Int, Number(caseID))
    .query("DELETE FROM Investeringscase WHERE caseID = @caseID");

  return result.rowsAffected[0] > 0;
}

class InvesteringscaseRepository {
  constructor(pool) {
    this.pool = pool;
  }

  hentAlle(ejendomID) {
    return hentAlleCases(this.pool, ejendomID);
  }

  hent(caseID) {
    return hentCase(this.pool, caseID);
  }

  opret(body) {
    return opretCase(this.pool, body);
  }

  opdater(caseID, body) {
    return opdaterCase(this.pool, caseID, body);
  }

  slet(caseID) {
    return sletCase(this.pool, caseID);
  }
}

module.exports = {
  InvesteringscaseRepository,
  hentAlleCases,
  hentCase,
  opretCase,
  opdaterCase,
  sletCase
};
