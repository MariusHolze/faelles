async function indsætNavbar() {
  const navbarContainer = document.getElementById("navbar-container");

  if (!navbarContainer) {
    return;
  }

  try {
    const response = await fetch("navbar.html");
    const html = await response.text();
    navbarContainer.innerHTML = html;
  } catch (error) {
    console.error("Fejl ved indlæsning af navbar:", error);
  }
}

function opdaterNavbarEfterLogin() {
  const bruger = hentLoggetIndBruger();

  const loginNavKnap = document.getElementById("loginNavKnap");
  const brugerMenuWrapper = document.getElementById("brugerMenuWrapper");
  const brugerMenuNavn = document.getElementById("brugerMenuNavn");

  if (!loginNavKnap || !brugerMenuWrapper) {
    return;
  }

  if (bruger) {
    loginNavKnap.classList.add("skjult");
    brugerMenuWrapper.classList.remove("skjult");

    if (brugerMenuNavn) {
      const navn = `${bruger.fornavn || ""} ${bruger.efternavn || ""}`.trim();
      brugerMenuNavn.textContent = navn || "Bruger";
    }
  } else {
    loginNavKnap.classList.remove("skjult");
    brugerMenuWrapper.classList.add("skjult");

    if (brugerMenuNavn) {
      brugerMenuNavn.textContent = "Bruger";
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
      dropdown.classList.toggle("skjult");
      return;
    }

    if (!event.target.closest("#brugerMenuWrapper")) {
      dropdown.classList.add("skjult");
    }
  });
}

function bindLogoutKnap() {
  document.addEventListener("click", function (event) {
    if (event.target && event.target.id === "logUdKnap") {
      fjernLoggetIndBruger();
      window.location.href = "index.html";
    }
  });
}

function visBesked(elementId, besked) {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.textContent = besked;
}

function rydBesked(elementId) {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.textContent = "";
}