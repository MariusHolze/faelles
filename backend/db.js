const sql = require("mssql");

// Her samler vi alle oplysninger til databasen i ét objekt.
// Værdierne kommer fra .env-filen, så vi ikke skriver dem direkte i koden.
const config = {
  user: process.env.DB_USER,           // brugernavn til databasen
  password: process.env.DB_PASSWORD,   // adgangskode til databasen
  server: process.env.DB_SERVER,       // servernavn / adresse til databasen
  database: process.env.DB_DATABASE,   // navnet på databasen
  options: {
    encrypt: true,                     // bruger krypteret forbindelse
    trustServerCertificate: false      // certifikatet skal være gyldigt
  }
};

// Vi gemmer forbindelsen i variablen pool.
// På den måde kan serveren genbruge den samme forbindelse.
let pool;

// Denne funktion henter databaseforbindelsen.
async function getPool() {
  // Hvis der allerede findes en forbindelse,
  // sender vi den tilbage med det samme.
  if (pool) {
    return pool;
  }

  // Hvis der ikke findes en forbindelse endnu,
  // opretter vi en ny forbindelse til databasen.
  pool = await sql.connect(config);

  // Den oprettede forbindelse returneres,
  // så andre filer kan bruge den.
  return pool;
}

// Vi eksporterer både selve sql-biblioteket og getPool-funktionen,
// så de kan bruges i route-filerne.
module.exports = { sql, getPool };