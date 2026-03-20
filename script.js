document.addEventListener("DOMContentLoaded", async () => {                     // Vent til HTML-siden er klar
    const navbarPlaceholder = document.getElementById("navbar-placeholder");    // Find stedet i HTML hvor navbaren skal indsættes

    if (navbarPlaceholder) {                            // Kun hvis den findes
        const response = await fetch("navbar.html");    // Vent på at filen navbar.html bliver hentet, og gem svaret i variablen response
        const navbarHtml = await response.text();       // Tag det hentede svar og læs det som almindelig tekst
        navbarPlaceholder.innerHTML = navbarHtml;       // Indsæt navbaren på siden
    }
});