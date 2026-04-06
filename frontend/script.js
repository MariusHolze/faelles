// gemmer den adresse vi sidst fandt
let fundetAdresseData = null;

document.addEventListener("DOMContentLoaded", async () => {
  const navbarPlaceholder = document.getElementById("navbar-placeholder");

  // indsætter navbar hvis placeholder findes
  if (navbarPlaceholder) {
    const response = await fetch("navbar.html");
    const navbarHtml = await response.text();
    navbarPlaceholder.innerHTML = navbarHtml;
  }

  // opdaterer navbar efter login
  opdaterNavbarEfterLogin();

  const loginForm = document.getElementById("login-form");

  // hvis vi er på login-siden
  if (loginForm) {
    loginForm.addEventListener("submit", logIndBruger);
  }

  const brugerForm = document.getElementById("opretProfileForm");

  // hvis vi er på opret bruger-siden
  if (brugerForm) {
    const ageErrorMessage = document.getElementById("error-message-age");
    const passwordErrorMessage = document.getElementById("error-message-password");

    brugerForm.addEventListener("submit", async function (event) {
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

      // tjekker alder
      if (age < 18) {
        ageValid = false;
        ageErrorMessage.style.display = "block";
      } else {
        ageErrorMessage.style.display = "none";
      }

      const adgangskode = document.getElementById("adgangskode").value;
      const kontrolAdgangskode = document.getElementById("kontrolAdgangskode").value;

      let passwordsMatch = true;

      // tjekker om kodeord er ens
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
        brugerForm.reset();
      } catch (error) {
        console.error("Fejl ved oprettelse af bruger:", error);
        alert("Kunne ikke oprette bruger. Tjek om serveren kører.");
      }
    });
  }

  const ejendomForm = document.getElementById("ejendomForm");

  // hvis vi er på opret ejendom-siden
  if (ejendomForm) {
    ejendomForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const loggetIndBrugerTekst = localStorage.getItem("loggetIndBruger");

      // man skal være logget ind
      if (!loggetIndBrugerTekst) {
        alert("Du skal være logget ind for at oprette en ejendom.");
        window.location.href = "login.html";
        return;
      }

      const loggetIndBruger = JSON.parse(loggetIndBrugerTekst);

      const ejendomData = {
        adresse: document.getElementById("adresse").value,
        boligtype: document.getElementById("boligtype").value,
        boligareal: document.getElementById("boligareal").value,
        ownerEmail: loggetIndBruger.email
      };

      try {
        const response = await fetch("http://localhost:3000/ejendomme", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(ejendomData)
        });

        const result = await response.json();

        if (!response.ok) {
          alert("Fejl: " + result.message);
          return;
        }

        alert("Ejendom oprettet!");
        ejendomForm.reset();
      } catch (error) {
        console.error("Fejl ved oprettelse af ejendom:", error);
        alert("Kunne ikke oprette ejendom. Tjek om serveren kører.");
      }
    });
  }

  const indexForm = document.getElementById("index-søge");

  // hvis vi er på forsiden
  if (indexForm) {
    indexForm.addEventListener("submit", soegAdresse);

    const opretKnap = document.getElementById("opretEjendomsprofilKnap");
    if (opretKnap) {
      opretKnap.addEventListener("click", opretEjendomsprofil);
    }

    hentMineEjendomme();
  }

  // hvis vi er på profil-siden
  if (document.getElementById("profilFornavn")) {
    visMinProfil();
    hentMineEjendommeTilProfil();
  }
});

// søger adresse
async function soegAdresse(event) {
  event.preventDefault();

  const input = document.getElementById("index-søge-input");
  const fejlBesked = document.getElementById("fejlBesked");
  const resultatKort = document.getElementById("resultatKort");

  const soegTekst = input.value.trim();

  // nulstiller gammel visning
  fejlBesked.textContent = "";
  resultatKort.classList.add("skjult");
  fundetAdresseData = null;

  if (soegTekst === "") {
    fejlBesked.textContent = "Du skal skrive en adresse";
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3000/api/adresse?soeg=${encodeURIComponent(soegTekst)}`
    );

    const result = await response.json();

    if (!response.ok) {
      fejlBesked.textContent = result.message;
      return;
    }

    // gemmer den fundne adresse
    fundetAdresseData = result;

    // viser data på siden
    document.getElementById("ejendomAdresse").textContent = result.adresse;
    document.getElementById("ejendomPost").textContent = result.postnr + " " + result.postnrnavn;
    document.getElementById("ejendomBeskrivelse").textContent =
      "Vej: " + result.vejnavn + ", Husnr: " + result.husnr;

    resultatKort.classList.remove("skjult");
  } catch (error) {
    console.error("Fejl ved adresse-søgning:", error);
    fejlBesked.textContent = "Der skete en fejl ved søgning";
  }
}

// opretter ejendomsprofil ud fra den fundne adresse
async function opretEjendomsprofil() {
  const loggetIndBrugerTekst = localStorage.getItem("loggetIndBruger");

  // man skal være logget ind
  if (!loggetIndBrugerTekst) {
    alert("Du skal være logget ind for at oprette en ejendomsprofil.");
    window.location.href = "login.html";
    return;
  }

  // man skal have søgt en adresse først
  if (!fundetAdresseData) {
    alert("Du skal først søge efter en adresse");
    return;
  }

  const loggetIndBruger = JSON.parse(loggetIndBrugerTekst);

  const ejendomData = {
    adresse: fundetAdresseData.adresse,
    vejnavn: fundetAdresseData.vejnavn,
    husnr: fundetAdresseData.husnr,
    postnr: fundetAdresseData.postnr,
    by: fundetAdresseData.postnrnavn,
    ownerEmail: loggetIndBruger.email
  };

  try {
    const response = await fetch("http://localhost:3000/ejendomme", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(ejendomData)
    });

    const result = await response.json();

    if (!response.ok) {
      alert("Fejl: " + result.message);
      return;
    }

    alert("Ejendomsprofil oprettet");
    hentMineEjendomme();
  } catch (error) {
    console.error("Fejl ved oprettelse af ejendomsprofil:", error);
    alert("Kunne ikke oprette ejendomsprofil");
  }
}

// henter alle brugere
async function hentBrugere() {
  const response = await fetch("http://localhost:3000/brugere");
  const brugere = await response.json();

  const liste = document.getElementById("brugerListe");
  if (!liste) return;

  liste.innerHTML = "";

  brugere.forEach((bruger) => {
    const li = document.createElement("li");
    li.textContent = bruger.fornavn + " " + bruger.efternavn;
    liste.appendChild(li);
  });
}

// henter kun den loggede brugers egne ejendomme
async function hentMineEjendomme() {
  const loggetIndBrugerTekst = localStorage.getItem("loggetIndBruger");
  const liste = document.getElementById("ejendomListe");

  if (!liste) return;

  // hvis ingen er logget ind
  if (!loggetIndBrugerTekst) {
    liste.innerHTML = "<p>Log ind for at se dine ejendomsprofiler.</p>";
    return;
  }

  const loggetIndBruger = JSON.parse(loggetIndBrugerTekst);

  try {
    const response = await fetch(
      `http://localhost:3000/mine-ejendomme?email=${encodeURIComponent(loggetIndBruger.email)}`
    );

    const ejendomme = await response.json();

    liste.innerHTML = "";

    if (ejendomme.length === 0) {
      liste.innerHTML = "<p>Du har ingen ejendomsprofiler endnu.</p>";
      return;
    }

    ejendomme.forEach((ejendom) => {
      const kort = document.createElement("div");
      kort.className = "ejendom-kort";

      const titel = document.createElement("h3");
      titel.textContent = ejendom.adresse;

      const oprettet = document.createElement("p");
      oprettet.innerHTML = "<strong>Oprettet:</strong> " + ejendom.oprettetTidspunkt;

      const opdateret = document.createElement("p");
      opdateret.innerHTML = "<strong>Sidst hentet data:</strong> " + ejendom.sidstOpdateret;

      const cases = document.createElement("p");
      cases.innerHTML = "<strong>Antal investeringscases:</strong> " + ejendom.antalCases;

      const knapWrapper = document.createElement("div");
      knapWrapper.className = "ejendom-knapper";

      const redigerKnap = document.createElement("button");
      redigerKnap.className = "knap";
      redigerKnap.textContent = "Rediger";
      redigerKnap.addEventListener("click", function () {
        redigerEjendom(ejendom.id, ejendom.adresse);
      });

      const sletKnap = document.createElement("button");
      sletKnap.className = "knap slet-knap";
      sletKnap.textContent = "Slet";
      sletKnap.addEventListener("click", function () {
        sletEjendom(ejendom.id);
      });

      knapWrapper.appendChild(redigerKnap);
      knapWrapper.appendChild(sletKnap);

      kort.appendChild(titel);
      kort.appendChild(oprettet);
      kort.appendChild(opdateret);
      kort.appendChild(cases);
      kort.appendChild(knapWrapper);

      liste.appendChild(kort);
    });
  } catch (error) {
    console.error("Fejl ved hentning af egne ejendomme:", error);
    liste.innerHTML = "<p>Der skete en fejl ved hentning af dine profiler.</p>";
  }
}

// redigerer en ejendom
async function redigerEjendom(id, gammelAdresse) {
  const loggetIndBrugerTekst = localStorage.getItem("loggetIndBruger");

  if (!loggetIndBrugerTekst) {
    alert("Du skal være logget ind");
    return;
  }

  const loggetIndBruger = JSON.parse(loggetIndBrugerTekst);
  const nyAdresse = prompt("Skriv ny adresse:", gammelAdresse);

  if (!nyAdresse || nyAdresse.trim() === "") {
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/ejendomme/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        adresse: nyAdresse,
        ownerEmail: loggetIndBruger.email
      })
    });

    const result = await response.json();

    if (!response.ok) {
      alert("Fejl: " + result.message);
      return;
    }

    hentMineEjendomme();
  } catch (error) {
    console.error("Fejl ved redigering:", error);
    alert("Kunne ikke redigere ejendommen");
  }
}

// sletter en ejendom
async function sletEjendom(id) {
  const loggetIndBrugerTekst = localStorage.getItem("loggetIndBruger");

  if (!loggetIndBrugerTekst) {
    alert("Du skal være logget ind");
    return;
  }

  const loggetIndBruger = JSON.parse(loggetIndBrugerTekst);
  const sikker = confirm("Er du sikker på, at du vil slette ejendommen?");

  if (!sikker) {
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3000/ejendomme/${id}?email=${encodeURIComponent(loggetIndBruger.email)}`,
      {
        method: "DELETE"
      }
    );

    const result = await response.json();

    if (!response.ok) {
      alert("Fejl: " + result.message);
      return;
    }

    hentMineEjendomme();
  } catch (error) {
    console.error("Fejl ved sletning:", error);
    alert("Kunne ikke slette ejendommen");
  }
}

// logger brugeren ind
async function logIndBruger(event) {
  event.preventDefault();

  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const loginFejl = document.getElementById("loginFejl");

  const email = emailInput.value.trim();
  const adgangskode = passwordInput.value.trim();

  // nulstiller fejl
  loginFejl.textContent = "";

  if (email === "" || adgangskode === "") {
    loginFejl.textContent = "Du skal udfylde begge felter";
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email,
        adgangskode: adgangskode
      })
    });

    const result = await response.json();

    if (!response.ok) {
      loginFejl.textContent = result.message;
      return;
    }

    // gemmer bruger i localStorage
    localStorage.setItem("loggetIndBruger", JSON.stringify(result.bruger));

    alert("Du er nu logget ind");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Fejl ved login:", error);
    loginFejl.textContent = "Kunne ikke logge ind";
  }
}

// logger brugeren ud
function logUdBruger() {
  localStorage.removeItem("loggetIndBruger");
  alert("Du er nu logget ud");
  window.location.href = "index.html";
}

// viser rigtig navbar efter login-status
function opdaterNavbarEfterLogin() {
  const loginNavKnap = document.getElementById("loginNavKnap");
  const brugerMenuWrapper = document.getElementById("brugerMenuWrapper");
  const brugerMenuNavn = document.getElementById("brugerMenuNavn");
  const brugerMenuKnap = document.getElementById("brugerMenuKnap");
  const brugerDropdown = document.getElementById("brugerDropdown");
  const logUdKnap = document.getElementById("logUdKnap");

  // hvis navbar ikke er klar endnu
  if (!loginNavKnap || !brugerMenuWrapper) {
    return;
  }

  const loggetIndBrugerTekst = localStorage.getItem("loggetIndBruger");

  // hvis ingen er logget ind
  if (!loggetIndBrugerTekst) {
    loginNavKnap.classList.remove("skjult");
    brugerMenuWrapper.classList.add("skjult");
    return;
  }

  const loggetIndBruger = JSON.parse(loggetIndBrugerTekst);

  loginNavKnap.classList.add("skjult");
  brugerMenuWrapper.classList.remove("skjult");

  // viser navn i knappen
  if (loggetIndBruger.fornavn) {
    brugerMenuNavn.textContent = loggetIndBruger.fornavn;
  } else {
    brugerMenuNavn.textContent = "Bruger";
  }

  // åbner og lukker dropdown
  brugerMenuKnap.addEventListener("click", function (event) {
    event.stopPropagation();
    brugerDropdown.classList.toggle("skjult");
  });

  // logger ud
  if (logUdKnap) {
    logUdKnap.addEventListener("click", function () {
      logUdBruger();
    });
  }

  // lukker dropdown hvis man klikker udenfor
  document.addEventListener("click", function (event) {
    if (!brugerMenuWrapper.contains(event.target)) {
      brugerDropdown.classList.add("skjult");
    }
  });
}

// viser den loggede brugers profil
function visMinProfil() {
  const loggetIndBrugerTekst = localStorage.getItem("loggetIndBruger");

  if (!loggetIndBrugerTekst) {
    window.location.href = "login.html";
    return;
  }

  const loggetIndBruger = JSON.parse(loggetIndBrugerTekst);

  const fornavnFelt = document.getElementById("profilFornavn");
  const efternavnFelt = document.getElementById("profilEfternavn");
  const emailFelt = document.getElementById("profilEmail");

  if (fornavnFelt) fornavnFelt.textContent = loggetIndBruger.fornavn || "";
  if (efternavnFelt) efternavnFelt.textContent = loggetIndBruger.efternavn || "";
  if (emailFelt) emailFelt.textContent = loggetIndBruger.email || "";
}

// viser brugerens egne ejendomme på profil-siden
async function hentMineEjendommeTilProfil() {
  const loggetIndBrugerTekst = localStorage.getItem("loggetIndBruger");
  const liste = document.getElementById("profilEjendomListe");

  if (!liste) return;

  if (!loggetIndBrugerTekst) {
    liste.innerHTML = "<p>Du skal være logget ind.</p>";
    return;
  }

  const loggetIndBruger = JSON.parse(loggetIndBrugerTekst);

  try {
    const response = await fetch(
      `http://localhost:3000/mine-ejendomme?email=${encodeURIComponent(loggetIndBruger.email)}`
    );

    const ejendomme = await response.json();

    liste.innerHTML = "";

    if (ejendomme.length === 0) {
      liste.innerHTML = "<p>Du har ingen ejendomsprofiler endnu.</p>";
      return;
    }

    ejendomme.forEach((ejendom) => {
      const kort = document.createElement("div");
      kort.className = "ejendom-kort";

      kort.innerHTML = `
        <h3>${ejendom.adresse}</h3>
        <p><strong>Oprettet:</strong> ${ejendom.oprettetTidspunkt}</p>
        <p><strong>Sidst hentet data:</strong> ${ejendom.sidstOpdateret}</p>
        <p><strong>Antal investeringscases:</strong> ${ejendom.antalCases}</p>
      `;

      liste.appendChild(kort);
    });
  } catch (error) {
    console.error("Fejl ved hentning af ejendomme til profil:", error);
    liste.innerHTML = "<p>Der skete en fejl.</p>";
  }
}