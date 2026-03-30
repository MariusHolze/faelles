document.addEventListener("DOMContentLoaded", async () => {                     // Vent til HTML-siden er klar
    const navbarPlaceholder = document.getElementById("navbar-placeholder");    // Find stedet i HTML hvor navbaren skal indsættes

    if (navbarPlaceholder) {                            // Kun hvis den findes
        const response = await fetch("navbar.html");    // Vent på at filen navbar.html bliver hentet, og gem svaret i variablen response
        const navbarHtml = await response.text();       // Tag det hentede svar og læs det som almindelig tekst
        navbarPlaceholder.innerHTML = navbarHtml;       // Indsæt navbaren på siden
    }
});

// Hent formularen og fejlmeddelelseselementerne
const form = document.getElementById('opretProfileForm');
const ageErrorMessage = document.getElementById('error-message-age');
const passwordErrorMessage = document.getElementById('error-message-password');

// Tilføj event listener til formularens submit handling
form.addEventListener('submit', function(event) {
    // Hent fødselsdatoen som en Date
    const birthdayInput = document.getElementById('birthday');
    const birthday = new Date(birthdayInput.value);

    // Få den nuværende dato
    const today = new Date();
    
    // Beregn forskellen i år
    let age = today.getFullYear() - birthday.getFullYear();
    const m = today.getMonth() - birthday.getMonth();

    // Hvis måned og dag ikke er kommet endnu i år, skal aldersberegningen trækkes 1 år fra
    if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
        age--;
    }

    // Tjek om brugeren er 18 år eller ældre
    let ageValid = true;
    if (age < 18) {
        ageValid = false;
        // Forhindre formularen i at blive sendt
        event.preventDefault();
        
        // Vis fejlmeddelelsen om alderskrav
        ageErrorMessage.style.display = 'block';
    } else {
        ageErrorMessage.style.display = 'none';
    }

    // Tjek om adgangskoderne matcher
    const adgangskode = document.getElementById('adgangskode').value;
    const kontrolAdgangskode = document.getElementById('kontrolAdgangskode').value;

    let passwordsMatch = true;
    if (adgangskode !== kontrolAdgangskode) {
        passwordsMatch = false;
        // Forhindre formularen i at blive sendt
        event.preventDefault();
        passwordErrorMessage.style.display = 'block';
    } else {
        passwordErrorMessage.style.display = 'none';
    }

    // Hvis begge betingelser er opfyldt (alder og adgangskoder)
    if (ageValid && passwordsMatch) {
        // Formularen vil blive sendt (forhindres ikke)
    }
});