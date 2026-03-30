const express = require("express");
const cors = require("cors");

const app = express();
const port = 3000;

// middleware
app.use(cors());
app.use(express.json());

// midlertidig "database"
let brugere = [];

// test-route
app.get("/api/test", (req, res) => {
  res.json({ message: "API virker" });
});

// opret bruger
app.post("/brugere", (req, res) => {
  const nyBruger = req.body;

  // simpel validering
  if (!nyBruger.fornavn || !nyBruger.efternavn || !nyBruger.email) {
    return res.status(400).json({
      message: "Mangler fornavn, efternavn eller email"
    });
  }

  brugere.push(nyBruger);

  console.log("Ny bruger oprettet:");
  console.log(nyBruger);

  console.log("Alle brugere:");
  console.log(brugere);

  res.status(201).json({
    message: "Bruger oprettet",
    bruger: nyBruger
  });
});

// se alle brugere
app.get("/brugere", (req, res) => {
  res.json(brugere);
});

app.listen(port, () => {
  console.log(`Server kører på http://localhost:${port}`);
});