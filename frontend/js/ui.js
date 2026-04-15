async function indsætNavbar() {
  const navbarContainer = document.getElementById("navbar-container"); // stedet hvor navbar skal ind

  if (!navbarContainer) {
    return;
  }

  try {
    const response = await fetch("navbar.html"); // henter HTML-filen med navbar
    const html = await response.text(); // læser svaret som tekst
    navbarContainer.innerHTML = html; // sætter navbar ind på siden
  } catch (error) {
    console.error("Fejl ved indlæsning af navbar:", error);
  }
}

function opdaterNavbarEfterLogin() {
  const bruger = hentLoggetIndBruger(); // tjekker om der er en logget ind bruger

  const loginNavKnap = document.getElementById("loginNavKnap");
  const brugerMenuWrapper = document.getElementById("brugerMenuWrapper");
  const brugerMenuNavn = document.getElementById("brugerMenuNavn");

  if (!loginNavKnap || !brugerMenuWrapper) {
    return; // stop hvis navbar ikke er sat ind endnu
  }

  if (bruger) {
    loginNavKnap.classList.add("skjult"); // skjuler login-knappen
    brugerMenuWrapper.classList.remove("skjult"); // viser brugermenuen

    if (brugerMenuNavn) {
      const navn = `${bruger.fornavn || ""} ${bruger.efternavn || ""}`.trim();
      brugerMenuNavn.textContent = navn || "Bruger"; // viser navn i menuen
    }
  } else {
    loginNavKnap.classList.remove("skjult"); // viser login-knappen
    brugerMenuWrapper.classList.add("skjult"); // skjuler brugermenuen

    if (brugerMenuNavn) {
      brugerMenuNavn.textContent = "Bruger"; // standardtekst hvis ingen er logget ind
    }
  }
}

function bindBrugerMenu() {
  document.addEventListener("click", function (event) {
    const menuKnap = document.getElementById("brugerMenuKnap");
    const dropdown = document.getElementById("brugerDropdown");
    const wrapper = document.getElementById("brugerMenuWrapper");

    if (!menuKnap || !dropdown || !wrapper) {
      return;
    }

    if (event.target.closest("#brugerMenuKnap")) {
      dropdown.classList.toggle("skjult"); // åbner eller lukker menuen
      return;
    }

    if (!event.target.closest("#brugerMenuWrapper")) {
      dropdown.classList.add("skjult"); // lukker menuen hvis man klikker udenfor
    }
  });
}

function bindLogoutKnap() {
  document.addEventListener("click", function (event) {
    if (event.target && event.target.id === "logUdKnap") {
      fjernLoggetIndBruger(); // sletter gemt bruger
      window.location.href = "index.html"; // sender tilbage til forsiden
    }
  });
}

function visBesked(elementId, besked) {
  const element = document.getElementById(elementId); // finder et element ud fra id

  if (!element) {
    return;
  }

  element.textContent = besked; // skriver tekst i elementet
}

function rydBesked(elementId) {
  const element = document.getElementById(elementId); // finder et element ud fra id

  if (!element) {
    return;
  }

  element.textContent = ""; // rydder teksten
}