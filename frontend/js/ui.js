async function indsætNavbar() {
  const navbarContainer = document.getElementById("navbar-container"); // stedet hvor navbar skal ind

  if (!navbarContainer) {
    return;
  }

  try {
    const response = await fetch("/navbar.html"); // henter HTML-filen med navbar
    const html = await response.text(); // læser svaret som tekst
    navbarContainer.innerHTML = html; // sætter navbar ind på siden
  } catch (error) {
    console.error("Fejl ved indlæsning af navbar:", error);
  }
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
