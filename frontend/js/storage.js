function hentLoggetIndBruger() {
  const tekst = localStorage.getItem("loggetIndBruger");

  if (!tekst) {
    return null;
  }

  try {
    return JSON.parse(tekst);
  } catch (error) {
    console.error("Fejl ved læsning af bruger fra localStorage:", error);
    localStorage.removeItem("loggetIndBruger");
    return null;
  }
}

function gemLoggetIndBruger(bruger) {
  localStorage.setItem("loggetIndBruger", JSON.stringify(bruger));
}

function fjernLoggetIndBruger() {
  localStorage.removeItem("loggetIndBruger");
}