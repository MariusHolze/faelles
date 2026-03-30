require("dotenv").config();

const express = require("express");
const sql = require("mssql");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

sql.connect(dbConfig)
  .then(() => {
    console.log("Forbundet til Azure SQL");
  })
  .catch(err => {
    console.error("Fejl i databaseforbindelse:", err);
  });

app.get("/api/test", async (req, res) => {
  try {
    const result = await sql.query`SELECT GETDATE() AS tid`;
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send("Noget gik galt");
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server kører på http://localhost:${process.env.PORT}`);
});

app.post('/brugere', (req, res) => {
    console.log(req.body);
    res.send("bruger modtaget");
});
