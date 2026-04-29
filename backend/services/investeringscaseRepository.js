const { sql } = require("../db");
const { lavTomCaseData } = require("./investeringscaseBeregner");

function request(db) {
  return db.request ? db.request() : new sql.Request(db);
}

function tekst(value, maxLength) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function decimal(value) {
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

function int(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function bool(value) {
  return value === true;
}

function gyldigeKoebsposter(data = {}) {
  const poster = Array.isArray(data.poster) ? data.poster : [];

  return poster
    .map((post) => ({
      navn: tekst(post.navn, 100),
      beloeb: decimal(post.beloeb)
    }))
    .filter((post) => post.navn && post.beloeb !== null && post.beloeb >= 0);
}

function gyldigeRenoveringsposter(data = {}) {
  const poster = Array.isArray(data.poster) ? data.poster : [];

  return poster
    .map((post) => ({
      navn: tekst(post.navn, 100),
      beloeb: decimal(post.beloeb),
      tidspunktKey: tekst(post.tidspunktKey, 50),
      tidspunktLabel: tekst(post.tidspunktLabel, 100),
      tidspunktMaaned: int(Number(post.tidspunktMaaned))
    }))
    .filter((post) => post.navn && post.beloeb !== null && post.beloeb >= 0);
}

function gyldigeDriftsposter(data = {}) {
  const poster = Array.isArray(data.poster) ? data.poster : [];

  return poster
    .map((post) => ({
      navn: tekst(post.navn, 100),
      beloeb: decimal(post.beloeb),
      periode: post.periode === "maanedligt" ? "maanedligt" : "aarligt"
    }))
    .filter((post) => post.navn && post.beloeb !== null && post.beloeb > 0);
}

function sum(poster) {
  return poster.reduce((total, post) => total + Number(post.beloeb || 0), 0);
}

function beregnDriftTotaler(poster) {
  return poster.reduce((totaler, post) => {
    if (post.periode === "maanedligt") {
      totaler.driftsudgifterMaanedligt += post.beloeb;
      totaler.driftsudgifterAarligt += post.beloeb * 12;
    } else {
      totaler.driftsudgifterAarligt += post.beloeb;
      totaler.driftsudgifterMaanedligt += post.beloeb / 12;
    }

    return totaler;
  }, { driftsudgifterMaanedligt: 0, driftsudgifterAarligt: 0 });
}

function mapDecimal(value) {
  return value === null || value === undefined ? "" : Number(value);
}

async function hentKoebsudgifter(pool, caseID) {
  const result = await pool.request()
    .input("caseID", sql.Int, Number(caseID))
    .query(`
      SELECT navn, beloeb
      FROM InvesteringscaseKoebspost
      WHERE caseID = @caseID
      ORDER BY koebspostID
    `);

  const poster = result.recordset.map((row) => ({
    navn: row.navn,
    beloeb: Number(row.beloeb)
  }));

  return poster.length ? { poster, total: sum(poster) } : {};
}

async function hentFinansiering(pool, caseID) {
  const result = await pool.request()
    .input("caseID", sql.Int, Number(caseID))
    .query(`
      SELECT laanetype, laanebeloeb, egenbetaling, rente, loebetid, afdragsfrihed
      FROM InvesteringscaseFinansiering
      WHERE caseID = @caseID
    `);

  const row = result.recordset[0];

  if (!row) {
    return {};
  }

  return {
    laanetype: row.laanetype || "",
    laanebeloeb: mapDecimal(row.laanebeloeb),
    egenbetaling: mapDecimal(row.egenbetaling),
    rente: mapDecimal(row.rente),
    loebetid: row.loebetid ?? "",
    afdragsfrihed: row.afdragsfrihed ?? ""
  };
}

async function hentRenovering(pool, caseID) {
  const [status, posterResult] = await Promise.all([
    pool.request()
      .input("caseID", sql.Int, Number(caseID))
      .query("SELECT aktiv FROM InvesteringscaseRenovering WHERE caseID = @caseID"),
    pool.request()
      .input("caseID", sql.Int, Number(caseID))
      .query(`
        SELECT navn, beloeb, tidspunktKey, tidspunktLabel, tidspunktMaaned
        FROM InvesteringscaseRenoveringspost
        WHERE caseID = @caseID
        ORDER BY renoveringspostID
      `)
  ]);

  const poster = posterResult.recordset.map((row) => ({
    navn: row.navn,
    beloeb: Number(row.beloeb),
    tidspunktKey: row.tidspunktKey || "",
    tidspunktLabel: row.tidspunktLabel || "",
    tidspunktMaaned: row.tidspunktMaaned
  }));

  if (!status.recordset[0] && poster.length === 0) {
    return {};
  }

  return {
    aktiv: Boolean(status.recordset[0]?.aktiv),
    allePoster: poster,
    poster,
    total: sum(poster)
  };
}

async function hentDriftsbudget(pool, caseID) {
  const result = await pool.request()
    .input("caseID", sql.Int, Number(caseID))
    .query(`
      SELECT navn, beloeb, periode
      FROM InvesteringscaseDriftspost
      WHERE caseID = @caseID
      ORDER BY driftspostID
    `);

  const poster = result.recordset.map((row) => ({
    navn: row.navn,
    beloeb: Number(row.beloeb),
    periode: row.periode
  }));
  const totaler = beregnDriftTotaler(poster);

  return poster.length ? { allePoster: poster, poster, ...totaler } : {};
}

async function hentUdlejning(pool, caseID) {
  const result = await pool.request()
    .input("caseID", sql.Int, Number(caseID))
    .query(`
      SELECT aktiv, maanedligLeje, depositum, tomgangDage,
             maanedligeUdlejningsudgifter, aarligeUdlejningsudgifter, udlejningsNoter
      FROM InvesteringscaseUdlejning
      WHERE caseID = @caseID
    `);

  const row = result.recordset[0];

  if (!row) {
    return {};
  }

  return {
    aktiv: Boolean(row.aktiv),
    maanedligLeje: mapDecimal(row.maanedligLeje),
    depositum: mapDecimal(row.depositum),
    tomgangDage: row.tomgangDage ?? "",
    maanedligeUdlejningsudgifter: mapDecimal(row.maanedligeUdlejningsudgifter),
    aarligeUdlejningsudgifter: mapDecimal(row.aarligeUdlejningsudgifter),
    udlejningsNoter: row.udlejningsNoter || ""
  };
}

async function hentAlleTrinData(pool, caseID) {
  const [koebsudgifter, finansiering, renovering, driftsbudget, udlejning] = await Promise.all([
    hentKoebsudgifter(pool, caseID),
    hentFinansiering(pool, caseID),
    hentRenovering(pool, caseID),
    hentDriftsbudget(pool, caseID),
    hentUdlejning(pool, caseID)
  ]);

  return {
    ...lavTomCaseData(),
    koebsudgifter,
    finansiering,
    renovering,
    driftsbudget,
    udlejning
  };
}

async function hentTrinData(pool, caseID, trin) {
  const trinData = await hentAlleTrinData(pool, caseID);
  const data = trinData[trin] || {};
  return Object.keys(data).length ? data : null;
}

async function sletTrin(transaction, caseID, trin) {
  const tables = {
    koebsudgifter: ["InvesteringscaseKoebspost"],
    finansiering: ["InvesteringscaseFinansiering"],
    renovering: ["InvesteringscaseRenoveringspost", "InvesteringscaseRenovering"],
    driftsbudget: ["InvesteringscaseDriftspost"],
    udlejning: ["InvesteringscaseUdlejning"]
  };

  for (const table of tables[trin] || []) {
    await request(transaction)
      .input("caseID", sql.Int, Number(caseID))
      .query(`DELETE FROM ${table} WHERE caseID = @caseID`);
  }
}

async function gemKoebsudgifter(transaction, caseID, data) {
  const poster = gyldigeKoebsposter(data);

  for (const post of poster) {
    await request(transaction)
      .input("caseID", sql.Int, Number(caseID))
      .input("navn", sql.VarChar(100), post.navn)
      .input("beloeb", sql.Decimal(18, 2), post.beloeb)
      .query(`
        INSERT INTO InvesteringscaseKoebspost (caseID, navn, beloeb)
        VALUES (@caseID, @navn, @beloeb)
      `);
  }
}

async function gemFinansiering(transaction, caseID, data = {}) {
  await request(transaction)
    .input("caseID", sql.Int, Number(caseID))
    .input("laanetype", sql.VarChar(50), tekst(data.laanetype, 50))
    .input("laanebeloeb", sql.Decimal(18, 2), decimal(data.laanebeloeb))
    .input("egenbetaling", sql.Decimal(18, 2), decimal(data.egenbetaling))
    .input("rente", sql.Decimal(9, 4), decimal(data.rente))
    .input("loebetid", sql.Int, int(Number(data.loebetid)))
    .input("afdragsfrihed", sql.Int, int(Number(data.afdragsfrihed)))
    .query(`
      INSERT INTO InvesteringscaseFinansiering
      (caseID, laanetype, laanebeloeb, egenbetaling, rente, loebetid, afdragsfrihed)
      VALUES
      (@caseID, @laanetype, @laanebeloeb, @egenbetaling, @rente, @loebetid, @afdragsfrihed)
    `);
}

async function gemRenovering(transaction, caseID, data = {}) {
  await request(transaction)
    .input("caseID", sql.Int, Number(caseID))
    .input("aktiv", sql.Bit, bool(data.aktiv))
    .query("INSERT INTO InvesteringscaseRenovering (caseID, aktiv) VALUES (@caseID, @aktiv)");

  if (!data.aktiv) {
    return;
  }

  const poster = gyldigeRenoveringsposter(data);

  for (const post of poster) {
    await request(transaction)
      .input("caseID", sql.Int, Number(caseID))
      .input("navn", sql.VarChar(100), post.navn)
      .input("beloeb", sql.Decimal(18, 2), post.beloeb)
      .input("tidspunktKey", sql.VarChar(50), post.tidspunktKey)
      .input("tidspunktLabel", sql.VarChar(100), post.tidspunktLabel)
      .input("tidspunktMaaned", sql.Int, post.tidspunktMaaned)
      .query(`
        INSERT INTO InvesteringscaseRenoveringspost
        (caseID, navn, beloeb, tidspunktKey, tidspunktLabel, tidspunktMaaned)
        VALUES
        (@caseID, @navn, @beloeb, @tidspunktKey, @tidspunktLabel, @tidspunktMaaned)
      `);
  }
}

async function gemDriftsbudget(transaction, caseID, data = {}) {
  const poster = gyldigeDriftsposter(data);

  for (const post of poster) {
    await request(transaction)
      .input("caseID", sql.Int, Number(caseID))
      .input("navn", sql.VarChar(100), post.navn)
      .input("beloeb", sql.Decimal(18, 2), post.beloeb)
      .input("periode", sql.VarChar(20), post.periode)
      .query(`
        INSERT INTO InvesteringscaseDriftspost (caseID, navn, beloeb, periode)
        VALUES (@caseID, @navn, @beloeb, @periode)
      `);
  }
}

async function gemUdlejning(transaction, caseID, data = {}) {
  await request(transaction)
    .input("caseID", sql.Int, Number(caseID))
    .input("aktiv", sql.Bit, bool(data.aktiv))
    .input("maanedligLeje", sql.Decimal(18, 2), decimal(data.maanedligLeje) || 0)
    .input("depositum", sql.Decimal(18, 2), decimal(data.depositum) || 0)
    .input("tomgangDage", sql.Int, int(Number(data.tomgangDage)) || 0)
    .input("maanedligeUdlejningsudgifter", sql.Decimal(18, 2), decimal(data.maanedligeUdlejningsudgifter) || 0)
    .input("aarligeUdlejningsudgifter", sql.Decimal(18, 2), decimal(data.aarligeUdlejningsudgifter) || 0)
    .input("udlejningsNoter", sql.VarChar(500), tekst(data.udlejningsNoter, 500))
    .query(`
      INSERT INTO InvesteringscaseUdlejning
      (caseID, aktiv, maanedligLeje, depositum, tomgangDage,
       maanedligeUdlejningsudgifter, aarligeUdlejningsudgifter, udlejningsNoter)
      VALUES
      (@caseID, @aktiv, @maanedligLeje, @depositum, @tomgangDage,
       @maanedligeUdlejningsudgifter, @aarligeUdlejningsudgifter, @udlejningsNoter)
    `);
}

async function gemTrinData(pool, caseID, trin, data) {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    await sletTrin(transaction, caseID, trin);

    if (trin === "koebsudgifter") {
      await gemKoebsudgifter(transaction, caseID, data);
    } else if (trin === "finansiering") {
      await gemFinansiering(transaction, caseID, data);
    } else if (trin === "renovering") {
      await gemRenovering(transaction, caseID, data);
    } else if (trin === "driftsbudget") {
      await gemDriftsbudget(transaction, caseID, data);
    } else if (trin === "udlejning") {
      await gemUdlejning(transaction, caseID, data);
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  hentAlleTrinData,
  hentTrinData,
  gemTrinData,
  gyldigeKoebsposter
};
