// -------- LOGIN --------
function bindLoginForm() {
  const form = document.getElementById("login-form"); // finder loginformularen

  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault(); // stopper normal formular-opførsel

    const email = document.getElementById("loginEmail").value; // henter email
    const adgangskode = document.getElementById("loginPassword").value; // henter password
    const fejlElement = document.getElementById("loginFejl"); // sted til fejltekst

    fejlElement.textContent = ""; // rydder gammel fejl

    try {
      const response = await fetch(`/api/brugere/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, adgangskode }) // sender login-data til backend
      });

      const data = await response.json();

      if (!response.ok) {
        fejlElement.textContent = data.message || "Login fejlede"; // viser fejl hvis login ikke virker
        return;
      }

      gemLoggetIndBruger(data.bruger); // gemmer bruger lokalt i browseren

      window.location.href = "profil.html"; // sender brugeren videre til profil
    } catch (error) {
      console.error("Login fejl:", error);
      fejlElement.textContent = "Server fejl";
    }
  });
}

// -------- OPRET BRUGER --------
function bindOpretBrugerForm() {
  const form = document.getElementById("opretProfileForm"); // finder opret-bruger-formularen

  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault(); // stopper reload

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

    fejlPassword.style.display = "none"; // skjuler gammel password-fejl
    fejlAge.style.display = "none"; // skjuler gammel alders-fejl

    if (adgangskode !== kontrolAdgangskode) {
      fejlPassword.style.display = "block"; // viser fejl hvis passwords ikke er ens
      return;
    }

    if (!erMindst18Aar(foedselsdato)) {
      fejlAge.style.display = "block"; // viser fejl hvis bruger er under 18
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
        }) // sender alle data til backend
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Fejl ved oprettelse"); // simpel fejlvisning
        return;
      }

      alert("Bruger oprettet!"); // simpel succesbesked
      window.location.href = "login.html"; // sender videre til login
    } catch (error) {
      console.error("Fejl ved oprettelse af bruger:", error);
      alert("Kunne ikke kontakte serveren. Tjek at siden er åbnet via localhost:3000");
    }
  });
}

// -------- ALDER CHECK --------
function erMindst18Aar(foedselsdato) {
  const birth = new Date(foedselsdato); // laver tekst om til dato
  const today = new Date(); // dags dato

  let age = today.getFullYear() - birth.getFullYear(); // grov aldersberegning
  const m = today.getMonth() - birth.getMonth(); // sammenligner måned

  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--; // trækker et år fra hvis fødselsdag ikke har været endnu
  }

  return age >= 18; // returnerer true eller false
}