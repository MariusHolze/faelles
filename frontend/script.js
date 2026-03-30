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

async function hentBrugere() {
    const response = await fetch("http://localhost:3000/brugere");
    const brugere = await response.json();

    console.log("Brugere:", brugere);

    const liste = document.getElementById("brugerListe");

    if (!liste) return;

    liste.innerHTML = "";

    brugere.forEach(bruger => {
        const li = document.createElement("li");
        li.textContent = bruger.fornavn + " " + bruger.efternavn;
        liste.appendChild(li);
    });
}





const ejendomForm = document.getElementById("ejendomForm"); // finder form

if (ejendomForm) {
  ejendomForm.addEventListener("submit", async function (event) {
    event.preventDefault(); // stopper reload

    // samler input fra form
    const ejendomData = {
      adresse: document.getElementById("adresse").value,
      boligtype: document.getElementById("boligtype").value,
      boligareal: document.getElementById("boligareal").value
    };

    try {
      const response = await fetch("http://localhost:3000/ejendomme", {
        method: "POST", // sender data
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(ejendomData) // laver data om til JSON
      });

      const result = await response.json(); // læser svar

      if (!response.ok) {
        alert("Fejl: " + result.message);
        return;
      }

      alert("Ejendom oprettet!");
      ejendomForm.reset(); // rydder form
    } catch (error) {
      console.error(error);
      alert("Noget gik galt");
    }
  });
}



async function hentEjendomme() {
  const response = await fetch("http://localhost:3000/ejendomme"); // henter data
  const ejendomme = await response.json(); // laver JSON om til JS

  const liste = document.getElementById("ejendomListe");

  if (!liste) return;

  liste.innerHTML = ""; // rydder listen

  ejendomme.forEach(ejendom => {
    const li = document.createElement("li"); // laver nyt liste-element
    li.textContent = ejendom.adresse + " - " + ejendom.boligtype;
    liste.appendChild(li); // tilføjer til siden
  });
}