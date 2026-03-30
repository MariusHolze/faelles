document.addEventListener("DOMContentLoaded", async () => {
    const navbarPlaceholder = document.getElementById("navbar-placeholder");

    if (navbarPlaceholder) {
        const response = await fetch("navbar.html");
        const navbarHtml = await response.text();
        navbarPlaceholder.innerHTML = navbarHtml;
    }

    const form = document.getElementById("opretProfileForm");

    if (!form) {
        return;
    }

    const ageErrorMessage = document.getElementById("error-message-age");
    const passwordErrorMessage = document.getElementById("error-message-password");

    form.addEventListener("submit", async function(event) {
        event.preventDefault();

        const birthdayInput = document.getElementById("birthday");
        const birthday = new Date(birthdayInput.value);
        const today = new Date();

        let age = today.getFullYear() - birthday.getFullYear();
        const m = today.getMonth() - birthday.getMonth();

        if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
            age--;
        }

        let ageValid = true;
        if (age < 18) {
            ageValid = false;
            ageErrorMessage.style.display = "block";
        } else {
            ageErrorMessage.style.display = "none";
        }

        const adgangskode = document.getElementById("adgangskode").value;
        const kontrolAdgangskode = document.getElementById("kontrolAdgangskode").value;

        let passwordsMatch = true;
        if (adgangskode !== kontrolAdgangskode) {
            passwordsMatch = false;
            passwordErrorMessage.style.display = "block";
        } else {
            passwordErrorMessage.style.display = "none";
        }

        if (!ageValid || !passwordsMatch) {
            return;
        }

        const brugerData = {
            fornavn: document.getElementById("Fornavn").value,
            efternavn: document.getElementById("Efternavn").value,
            telefon: document.getElementById("Phone").value,
            email: document.getElementById("opretEmail").value,
            foedselsdato: document.getElementById("birthday").value,
            investorType: document.getElementById("investorType").value,
            adgangskode: document.getElementById("adgangskode").value
        };

        try {
            const response = await fetch("http://localhost:3000/brugere", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(brugerData)
            });

            const result = await response.json();

            if (!response.ok) {
                alert("Fejl: " + result.message);
                return;
            }

            alert("Bruger oprettet!");
            console.log(result);

            form.reset();
        } catch (error) {
            console.error("Fejl ved oprettelse af bruger:", error);
            alert("Kunne ikke oprette bruger. Tjek om serveren kører.");
        }
    });
});