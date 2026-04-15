const express = require("express");
const path = require("path");
require("dotenv").config();

const adresseRoutes = require("./routes/adresseRoutes");
const brugerRoutes = require("./routes/brugerRoutes");
const ejendomRoutes = require("./routes/ejendomRoutes");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// gør frontend-filer synlige i browseren
app.use(express.static(path.join(__dirname, "../frontend")));

// routes
app.use("/api/adresser", adresseRoutes);
app.use("/api/brugere", brugerRoutes);
app.use("/api/ejendomme", ejendomRoutes);

// simpel testroute
app.get("/api/test", (req, res) => {
  res.json({ message: "Server virker" });
});

app.listen(port, () => {
  console.log(`Server kører på port ${port}`);
});