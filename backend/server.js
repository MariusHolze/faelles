const express = require("express");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, ".env")
});

// Her henter vi vores route-filer.
// Hver route-fil håndterer et område i systemet.
const adresseRoutes = require("./routes/adresseRoutes");
const brugerRoutes = require("./routes/brugerRoutes");
const ejendomRoutes = require("./routes/ejendomRoutes");

// Vi opretter selve Express-appen.
const app = express();

// Serveren kører på den port, der står i .env.
// Hvis der ikke står noget, bruges port 3000.
const port = process.env.PORT || 3000;

// Gør at serveren kan modtage JSON fra frontend.
// Det bruges fx når man sender data fra formularer.
app.use(express.json());

// Gør frontend-mappen offentlig.
// Det betyder, at HTML, CSS, billeder og JavaScript
// kan åbnes i browseren.
app.use(express.static(path.join(__dirname, "../frontend")));

// Her kobler vi vores API-routes på serveren.
// Når frontend kalder disse adresser, sendes forespørgslen videre
// til den rigtige route-fil.
app.use("/api/adresser", adresseRoutes);
app.use("/api/brugere", brugerRoutes);
app.use("/api/ejendomme", ejendomRoutes);

// Simpel testroute.
// Den kan bruges til hurtigt at tjekke om serveren kører.
app.get("/api/test", (req, res) => {
  res.json({ message: "Server virker" });
});

// Starter serveren og får den til at lytte på den valgte port.
app.listen(port, () => {
  console.log(`Server kører på port ${port}`);
});
