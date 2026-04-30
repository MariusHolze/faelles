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
