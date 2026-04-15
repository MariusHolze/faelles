function hentLoggetIndBruger() {
  const tekst = localStorage.getItem("loggetIndBruger"); // læser gemt bruger som tekst

  if (!tekst) {
    return null; // returnerer null hvis der ikke er noget gemt
  }

  try {
    return JSON.parse(tekst); // laver tekst om til objekt
  } catch (error) {
    console.error("Fejl ved læsning af bruger fra localStorage:", error);
    localStorage.removeItem("loggetIndBruger"); // fjerner ødelagte data
    return null;
  }
}

function gemLoggetIndBruger(bruger) {
  localStorage.setItem("loggetIndBruger", JSON.stringify(bruger)); // gemmer bruger som tekst
}

function fjernLoggetIndBruger() {
  localStorage.removeItem("loggetIndBruger"); // sletter brugerdata ved logout
}