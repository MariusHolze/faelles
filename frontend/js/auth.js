// -------- LOGIN --------
function bindLoginForm() {
    const form = document.getElementById("login-form");

    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const adgangskode = document.getElementById("loginPassword").value;
        const fejlElement = document.getElementById("loginFejl");

        fejlElement.textContent = "";

        try {
            const response = await fetch(`/api/brugere/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, adgangskode })
            });

            const data = await response.json();

            if (!response.ok) {
                fejlElement.textContent = data.message || "Login fejlede";
                return;
            }

            // gem bruger i localStorage
            gemLoggetIndBruger(data.bruger);

            // gå til profil
            window.location.href = "profil.html";

        } catch (error) {
            console.error("Login fejl:", error);
            fejlElement.textContent = "Server fejl";
        }
    });
}

// -------- OPRET BRUGER --------
function bindOpretBrugerForm() {
    const form = document.getElementById("opretProfileForm");

    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const fornavn = document.getElementById("Fornavn").value;
        const efternavn = document.getElementById("Efternavn").value;
        const telefon = document.getElementById("Phone").value;
        const email = document.getElementById("opretEmail").value;
        const foedselsdato = document.getElementById("birthday").value;
        const investorType = document.getElementById("investorType").value;
        const adgangskode = document.getElementById("adgangskode").value;
        const kontrolAdgangskode = document.getElementById("kontrolAdgangskode").value;

        const fejlPassword = document.getElementById("error-message-password");
        const fejlAge = document.getElementById("error-message-age");

        fejlPassword.style.display = "none";
        fejlAge.style.display = "none";

        // tjek password
        if (adgangskode !== kontrolAdgangskode) {
            fejlPassword.style.display = "block";
            return;
        }

        // tjek alder
        if (!erMindst18Aar(foedselsdato)) {
            fejlAge.style.display = "block";
            return;
        }

        try {
            const response = await fetch(`/api/brugere`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    fornavn,
                    efternavn,
                    telefon,
                    email,
                    foedselsdato,
                    investorType,
                    adgangskode
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Fejl ved oprettelse");
                return;
            }

            alert("Bruger oprettet!");
            window.location.href = "login.html";

        } catch (error) {
            console.error("Fejl ved oprettelse af bruger:", error);
            alert("Kunne ikke kontakte serveren. Tjek at siden er åbnet via localhost:3000");
        }
    });
}

// -------- ALDER CHECK --------
function erMindst18Aar(foedselsdato) {
    const birth = new Date(foedselsdato);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age >= 18;
}