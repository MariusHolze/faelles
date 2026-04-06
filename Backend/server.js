const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const port = 3000;

// serveren kan læse JSON
app.use(express.json());

// frontend må tale med backend
app.use(cors());

// gør frontend-filer synlige i browseren
app.use(express.static(path.join(__dirname, "../frontend")));

// midlertidig "database"
let brugere = [];
let ejendomme = [];
let naesteEjendomsId = 1;

// test-route
app.get("/api/test", (req, res) => {
  res.json({ message: "API virker" });
});


// ---------------- BRUGERE ----------------

// opret bruger
app.post("/brugere", (req, res) => {
  const nyBruger = req.body;

  // tjekker om vigtige felter mangler
  if (!nyBruger.fornavn || !nyBruger.efternavn || !nyBruger.email || !nyBruger.adgangskode) {
    return res.status(400).json({
      message: "Mangler fornavn, efternavn, email eller adgangskode"
    });
  }

  // tjekker om email allerede findes
  const brugerFindes = brugere.find((bruger) => bruger.email === nyBruger.email);

  if (brugerFindes) {
    return res.status(400).json({
      message: "En bruger med denne email findes allerede"
    });
  }

  // gemmer bruger i array
  brugere.push(nyBruger);

  res.status(201).json({
    message: "Bruger oprettet",
    bruger: {
      fornavn: nyBruger.fornavn,
      efternavn: nyBruger.efternavn,
      email: nyBruger.email
    }
  });
});

// hent alle brugere
app.get("/brugere", (req, res) => {
  res.json(brugere);
});

// logger en bruger ind
app.post("/login", (req, res) => {
  const email = req.body.email;
  const adgangskode = req.body.adgangskode;

  // tjekker om felter mangler
  if (!email || !adgangskode) {
    return res.status(400).json({
      message: "Mangler email eller adgangskode"
    });
  }

  // finder brugeren i arrayet
  const bruger = brugere.find((b) => {
    return b.email === email && b.adgangskode === adgangskode;
  });

  // hvis bruger ikke findes
  if (!bruger) {
    return res.status(401).json({
      message: "Forkert email eller adgangskode"
    });
  }

  // sender simpelt svar tilbage
  res.json({
    message: "Login godkendt",
    bruger: {
      fornavn: bruger.fornavn,
      efternavn: bruger.efternavn,
      email: bruger.email
    }
  });
});


// ---------------- ADRESSE-SØGNING ----------------

// søger adresse via DAWA
app.get("/api/adresse", async (req, res) => {
  const soegTekst = req.query.soeg;

  // tjekker om der er skrevet noget
  if (!soegTekst || soegTekst.trim() === "") {
    return res.status(400).json({
      message: "Du skal skrive en adresse"
    });
  }

  try {
    // kalder offentligt API
    const dawaResponse = await fetch(
      `https://api.dataforsyningen.dk/adresser/autocomplete?q=${encodeURIComponent(soegTekst)}`
    );

    if (!dawaResponse.ok) {
      return res.status(500).json({
        message: "Kunne ikke hente data fra adresse-API"
      });
    }

    const data = await dawaResponse.json();

    // hvis ingen adresse blev fundet
    if (data.length === 0) {
      return res.status(404).json({
        message: "Ingen adresser fundet"
      });
    }

    // tager første adresse for at holde det simpelt
    const valgtAdresse = data[0];

    const adresseData = {
      adresse: valgtAdresse.tekst,
      vejnavn: valgtAdresse.vejnavn,
      husnr: valgtAdresse.husnr,
      postnr: valgtAdresse.postnr,
      postnrnavn: valgtAdresse.postnrnavn
    };

    res.json(adresseData);
  } catch (error) {
    console.error("Fejl ved DAWA:", error);

    res.status(500).json({
      message: "Serverfejl ved adresseopslag"
    });
  }
});


// ---------------- EJENDOMSPROFILER ----------------

// opretter en ejendomsprofil
app.post("/ejendomme", (req, res) => {
  const nyEjendom = req.body;

  // tjekker at adresse og ejer findes
  if (!nyEjendom.adresse || !nyEjendom.ownerEmail) {
    return res.status(400).json({
      message: "Mangler adresse eller ownerEmail"
    });
  }

  // tjekker at brugeren findes
  const ejerFindes = brugere.find((bruger) => bruger.email === nyEjendom.ownerEmail);

  if (!ejerFindes) {
    return res.status(400).json({
      message: "Brugeren findes ikke"
    });
  }

  // tjekker om samme bruger allerede har samme adresse gemt
  const ejendomFindes = ejendomme.find((ejendom) => {
    return (
      ejendom.ownerEmail === nyEjendom.ownerEmail &&
      ejendom.adresse === nyEjendom.adresse
    );
  });

  if (ejendomFindes) {
    return res.status(400).json({
      message: "Du har allerede oprettet denne ejendomsprofil"
    });
  }

  const oprettetTid = new Date().toLocaleString("da-DK");

  // objekt der gemmes i array
  const ejendomDerSkalGemmes = {
    id: naesteEjendomsId,
    adresse: nyEjendom.adresse,
    vejnavn: nyEjendom.vejnavn || "",
    husnr: nyEjendom.husnr || "",
    postnr: nyEjendom.postnr || "",
    by: nyEjendom.by || "",
    ownerEmail: nyEjendom.ownerEmail,
    oprettetTidspunkt: oprettetTid,
    sidstOpdateret: oprettetTid,
    antalCases: 0
  };

  ejendomme.push(ejendomDerSkalGemmes);
  naesteEjendomsId++;

  res.status(201).json({
    message: "Ejendomsprofil oprettet",
    ejendom: ejendomDerSkalGemmes
  });
});

// henter kun den loggede brugers ejendomme
app.get("/mine-ejendomme", (req, res) => {
  const email = req.query.email;

  // email skal sendes med
  if (!email) {
    return res.status(400).json({
      message: "Mangler email"
    });
  }

  // filtrerer så kun ejerens profiler returneres
  const brugerensEjendomme = ejendomme.filter((ejendom) => {
    return ejendom.ownerEmail === email;
  });

  res.json(brugerensEjendomme);
});

// redigerer en ejendom
app.put("/ejendomme/:id", (req, res) => {
  const id = Number(req.params.id);
  const nyAdresse = req.body.adresse;
  const ownerEmail = req.body.ownerEmail;

  const ejendom = ejendomme.find((e) => e.id === id);

  if (!ejendom) {
    return res.status(404).json({
      message: "Ejendom ikke fundet"
    });
  }

  // kun ejeren må redigere
  if (ejendom.ownerEmail !== ownerEmail) {
    return res.status(403).json({
      message: "Du må ikke redigere denne ejendom"
    });
  }

  if (!nyAdresse || nyAdresse.trim() === "") {
    return res.status(400).json({
      message: "Adresse må ikke være tom"
    });
  }

  // opdaterer adresse
  ejendom.adresse = nyAdresse.trim();
  ejendom.sidstOpdateret = new Date().toLocaleString("da-DK");

  res.json({
    message: "Ejendom opdateret",
    ejendom: ejendom
  });
});

// sletter en ejendom
app.delete("/ejendomme/:id", (req, res) => {
  const id = Number(req.params.id);
  const ownerEmail = req.query.email;

  const index = ejendomme.findIndex((e) => e.id === id);

  if (index === -1) {
    return res.status(404).json({
      message: "Ejendom ikke fundet"
    });
  }

  // kun ejeren må slette
  if (ejendomme[index].ownerEmail !== ownerEmail) {
    return res.status(403).json({
      message: "Du må ikke slette denne ejendom"
    });
  }

  ejendomme.splice(index, 1);

  res.json({
    message: "Ejendom slettet"
  });
});

// starter serveren
app.listen(port, () => {
  console.log(`Server kører på http://localhost:${port}`);
});