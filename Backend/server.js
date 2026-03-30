const express = require("express");
const cors = require("cors");

const path = require("path"); // bruges til at finde frontend-mappen

const app = express();
const port = 3000;

// middleware
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../frontend"))); 
// gør frontend-mappen tilgængelig i browseren

// midlertidig "database"
let brugere = [];
let ejendomme = []; // midlertidig liste til ejendomme (fake DB)

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


app.post("/ejendomme", (req, res) => {
  const nyEjendom = req.body; // data fra frontend

  // tjek om nødvendige felter findes
  if (!nyEjendom.adresse || !nyEjendom.boligtype || !nyEjendom.boligareal) {
    return res.status(400).json({
      message: "Mangler adresse, boligtype eller boligareal"
    });
  }

  ejendomme.push(nyEjendom); // gem i array

  console.log("Ny ejendom oprettet:", nyEjendom); // log til terminal

  res.status(201).json({
    message: "Ejendom oprettet",
    ejendom: nyEjendom
  }); // svar tilbage til frontend
});

app.get("/ejendomme", (req, res) => {
  res.json(ejendomme); // sender alle ejendomme tilbage
});


app.listen(port, () => {
  console.log(`Server kører på http://localhost:${port}`);
});