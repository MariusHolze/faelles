/* =========================
   KONFIGURATION
========================= */

// Backend kører på port 3000
const API_BASE_URL = "http://localhost:3000";

// Her gemmes den adresse brugeren vælger fra søgeresultaterne
let valgtAdresseData = null;

/* =========================
   START
========================= */

document.addEventListener("DOMContentLoaded", async () => {
  await indsætNavbar();
  opdaterNavbarEfterLogin();

  bindLoginForm();
  bindBrugerForm();
  bindEjendomForm();
  bindForside();
  bindProfilside();
});

/* =========================
   BIND EVENTS
========================= */

// Binder login-form hvis vi er på login-siden
function bindLoginForm() {
  const loginForm = document.getElementById("login-form");
  if (!loginForm) return;

  loginForm.addEventListener("submit", logIndBruger);
}

// Binder opret bruger-form hvis vi er på opret bruger-siden
function bindBrugerForm() {
  const brugerForm = document.getElementById("opretProfileForm");
  if (!brugerForm) return;

  brugerForm.addEventListener("submit", opretBruger);
}

// Binder opret ejendom-form hvis vi er på ejendomssiden
function bindEjendomForm() {
  const ejendomForm = document.getElementById("ejendomForm");
  if (!ejendomForm) return;

  ejendomForm.addEventListener("submit", opretEjendomFraForm);
}

// Binder forsiden
function bindForside() {
  const indexForm = document.getElementById("index-søge");
  if (!indexForm) return;

  indexForm.addEventListener("submit", soegAdresse);

  const opretKnap = document.getElementById("opretEjendomsprofilKnap");
  if (opretKnap) {
    opretKnap.addEventListener("click", opretEjendomsprofilFraValgtAdresse);
  }

  hentMineEjendomme();
}

// Binder profilsiden
function bindProfilside() {
  if (!document.getElementById("profilFornavn")) return;

  visMinProfil();
  hentMineEjendommeTilProfil();
}

/* =========================
   GENERELLE HJÆLPEFUNKTIONER
========================= */

// Loader navbar ind i placeholder
async function indsætNavbar() {
  const navbarPlaceholder = document.getElementById("navbar-placeholder");
  if (!navbarPlaceholder) return;

  try {
    const response = await fetch("navbar.html");
    const navbarHtml = await response.text();
    navbarPlaceholder.innerHTML = navbarHtml;
  } catch (error) {
    console.error("Fejl ved indlæsning af navbar:", error);
  }
}

// Henter logget bruger fra localStorage
function hentLoggetIndBruger() {
  const tekst = localStorage.getItem("loggetIndBruger");
  if (!tekst) return null;

  try {
    return JSON.parse(tekst);
  } catch (error) {
    console.error("Fejl i localStorage:", error);
    localStorage.removeItem("loggetIndBruger");
    return null;
  }
}

// Formatterer dato pænere
function formaterDato(datoString) {
  if (!datoString) return "Ikke tilgængelig";

  const dato = new Date(datoString);
  if (Number.isNaN(dato.getTime())) return datoString;

  return dato.toLocaleString("da-DK");
}

// Simpel helper til JSON-kald
async function hentJson(url, options = {}) {
  const response = await fetch(url, options);

  let data;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  return { response, data };
}

/* =========================
   NAVBAR / LOGINSTATUS
========================= */

// Opdaterer navbar alt efter om brugeren er logget ind
function opdaterNavbarEfterLogin() {
  const loginNavKnap = document.getElementById("loginNavKnap");
  const brugerMenuWrapper = document.getElementById("brugerMenuWrapper");
  const brugerMenuNavn = document.getElementById("brugerMenuNavn");
  const brugerMenuKnap = document.getElementById("brugerMenuKnap");
  const brugerDropdown = document.getElementById("brugerDropdown");
  const logUdKnap = document.getElementById("logUdKnap");

  if (!loginNavKnap || !brugerMenuWrapper) return;

  const loggetIndBruger = hentLoggetIndBruger();

  // Ingen bruger logget ind
  if (!loggetIndBruger) {
    loginNavKnap.classList.remove("skjult");
    brugerMenuWrapper.classList.add("skjult");
    return;
  }

  // Bruger er logget ind
  loginNavKnap.classList.add("skjult");
  brugerMenuWrapper.classList.remove("skjult");

  if (brugerMenuNavn) {
    brugerMenuNavn.textContent = loggetIndBruger.fornavn || "Bruger";
  }

  // Åbn/luk dropdown
  if (brugerMenuKnap && brugerDropdown) {
    brugerMenuKnap.addEventListener("click", (event) => {
      event.stopPropagation();
      brugerDropdown.classList.toggle("skjult");
    });

    document.addEventListener("click", (event) => {
      if (!brugerMenuWrapper.contains(event.target)) {
        brugerDropdown.classList.add("skjult");
      }
    });
  }

  // Logout
  if (logUdKnap) {
    logUdKnap.addEventListener("click", logUdBruger);
  }
}

// Logger ud
function logUdBruger() {
  localStorage.removeItem("loggetIndBruger");
  alert("Du er nu logget ud");
  window.location.href = "index.html";
}

/* =========================
   OPRET BRUGER
========================= */

// Opretter ny bruger
async function opretBruger(event) {
  event.preventDefault();

  const form = document.getElementById("opretProfileForm");
  const ageErrorMessage = document.getElementById("error-message-age");
  const passwordErrorMessage = document.getElementById("error-message-password");

  const foedselsdato = document.getElementById("birthday").value;
  const adgangskode = document.getElementById("adgangskode").value;
  const kontrolAdgangskode = document.getElementById("kontrolAdgangskode").value;

  // Alder-validering
  const alderGyldig = erMindst18Aar(foedselsdato);
  if (ageErrorMessage) {
    ageErrorMessage.style.display = alderGyldig ? "none" : "block";
  }

  // Tjek om passwords matcher
  const passwordsMatcher = adgangskode === kontrolAdgangskode;
  if (passwordErrorMessage) {
    passwordErrorMessage.style.display = passwordsMatcher ? "none" : "block";
  }

  if (!alderGyldig || !passwordsMatcher) {
    return;
  }

  const brugerData = {
    fornavn: document.getElementById("Fornavn").value.trim(),
    efternavn: document.getElementById("Efternavn").value.trim(),
    telefon: document.getElementById("Phone").value.trim(),
    email: document.getElementById("opretEmail").value.trim(),
    foedselsdato,
    investorType: document.getElementById("investorType").value,
    adgangskode
  };

  try {
    const { response, data } = await hentJson(`${API_BASE_URL}/brugere`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(brugerData)
    });

    if (!response.ok) {
      alert("Fejl: " + (data?.message || "Kunne ikke oprette bruger"));
      return;
    }

    alert("Bruger oprettet!");
    form.reset();
    window.location.href = "login.html";
  } catch (error) {
    console.error("Fejl ved oprettelse af bruger:", error);
    alert("Kunne ikke oprette bruger");
  }
}

// Tjekker om bruger er mindst 18 år
function erMindst18Aar(foedselsdatoString) {
  if (!foedselsdatoString) return false;

  const foedselsdato = new Date(foedselsdatoString);
  const iDag = new Date();

  let alder = iDag.getFullYear() - foedselsdato.getFullYear();
  const maanedsForskel = iDag.getMonth() - foedselsdato.getMonth();

  if (
    maanedsForskel < 0 ||
    (maanedsForskel === 0 && iDag.getDate() < foedselsdato.getDate())
  ) {
    alder--;
  }

  return alder >= 18;
}

/* =========================
   LOGIN
========================= */

// Logger bruger ind
async function logIndBruger(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const adgangskode = document.getElementById("loginPassword").value.trim();
  const loginFejl = document.getElementById("loginFejl");

  if (loginFejl) {
    loginFejl.textContent = "";
  }

  if (!email || !adgangskode) {
    if (loginFejl) {
      loginFejl.textContent = "Du skal udfylde begge felter";
    }
    return;
  }

  try {
    const { response, data } = await hentJson(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, adgangskode })
    });

    if (!response.ok) {
      if (loginFejl) {
        loginFejl.textContent = data?.message || "Login fejlede";
      }
      return;
    }

    localStorage.setItem("loggetIndBruger", JSON.stringify(data.bruger));
    alert("Du er nu logget ind");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Fejl ved login:", error);
    if (loginFejl) {
      loginFejl.textContent = "Kunne ikke logge ind";
    }
  }
}

/* =========================
   ADRESSESØGNING
========================= */

// Søger efter adresser
async function soegAdresse(event) {
  event.preventDefault();

  const input = document.getElementById("index-søge-input");
  const fejlBesked = document.getElementById("fejlBesked");
  const soegTekst = input.value.trim();

  nulstilAdresseSoegning();

  if (!soegTekst) {
    if (fejlBesked) {
      fejlBesked.textContent = "Du skal skrive en adresse";
    }
    return;
  }

  try {
    const { response, data } = await hentJson(
      `${API_BASE_URL}/api/adresse?soeg=${encodeURIComponent(soegTekst)}`
    );

    if (!response.ok) {
      if (fejlBesked) {
        fejlBesked.textContent = data?.message || "Søgning fejlede";
      }
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      if (fejlBesked) {
        fejlBesked.textContent = "Ingen adresser fundet";
      }
      return;
    }

    visAdresseForslag(data);
  } catch (error) {
    console.error("Fejl ved adresse-søgning:", error);
    if (fejlBesked) {
      fejlBesked.textContent = "Der skete en fejl ved søgning";
    }
  }
}

// Nulstiller visning før ny søgning
function nulstilAdresseSoegning() {
  const fejlBesked = document.getElementById("fejlBesked");
  const resultatKort = document.getElementById("resultatKort");
  const adresseListe = document.getElementById("adresseListe");

  valgtAdresseData = null;

  if (fejlBesked) fejlBesked.textContent = "";
  if (resultatKort) resultatKort.classList.add("skjult");
  if (adresseListe) adresseListe.innerHTML = "";
}

// Viser liste med adresseforslag
function visAdresseForslag(adresser) {
  const adresseListe = document.getElementById("adresseListe");
  if (!adresseListe) return;

  adresseListe.innerHTML = "";

  adresser.forEach((adresse) => {
    const knap = document.createElement("button");
    knap.type = "button";
    knap.className = "adresse-forslag";
    knap.textContent = adresse.adresse;

    // Når brugeren klikker på en adresse, gemmes den og vises
    knap.addEventListener("click", () => {
      valgtAdresseData = adresse;
      visValgtAdresse(adresse);
      markerValgtAdresseKnap(adresseListe, knap);
    });

    adresseListe.appendChild(knap);
  });
}

// Marker hvilken adresse der er valgt
function markerValgtAdresseKnap(wrapper, aktivKnap) {
  const alleKnapper = wrapper.querySelectorAll(".adresse-forslag");

  alleKnapper.forEach((knap) => {
    knap.classList.remove("valgt");
  });

  aktivKnap.classList.add("valgt");
}

// Viser den valgte adresse i resultatkortet
function visValgtAdresse(adresse) {
  const resultatKort = document.getElementById("resultatKort");
  const adresseFelt = document.getElementById("ejendomAdresse");
  const postFelt = document.getElementById("ejendomPost");
  const beskrivelseFelt = document.getElementById("ejendomBeskrivelse");

  if (adresseFelt) {
    adresseFelt.textContent = adresse.adresse || "";
  }

  if (postFelt) {
    postFelt.textContent = `${adresse.postnr || ""} ${adresse.postnrnavn || ""}`.trim();
  }

  if (beskrivelseFelt) {
    beskrivelseFelt.textContent = `Vej: ${adresse.vejnavn || ""}, Husnr: ${adresse.husnr || ""}`;
  }

  if (resultatKort) {
    resultatKort.classList.remove("skjult");
  }
}

/* =========================
   OPRET EJENDOMSPROFIL
========================= */

// Opretter ejendom direkte fra form
async function opretEjendomFraForm(event) {
  event.preventDefault();

  const loggetIndBruger = hentLoggetIndBruger();
  if (!loggetIndBruger) {
    alert("Du skal være logget ind for at oprette en ejendom.");
    window.location.href = "login.html";
    return;
  }

  const ejendomData = {
    adresse: document.getElementById("adresse").value.trim(),
    boligtype: document.getElementById("boligtype").value.trim(),
    boligareal: document.getElementById("boligareal").value.trim(),
    ownerEmail: loggetIndBruger.email
  };

  try {
    const { response, data } = await hentJson(`${API_BASE_URL}/ejendomme`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(ejendomData)
    });

    if (!response.ok) {
      alert("Fejl: " + (data?.message || "Kunne ikke oprette ejendom"));
      return;
    }

    alert("Ejendom oprettet!");
    document.getElementById("ejendomForm").reset();
  } catch (error) {
    console.error("Fejl ved oprettelse af ejendom:", error);
    alert("Kunne ikke oprette ejendom");
  }
}

// Opretter ejendomsprofil ud fra valgt adresse fra forsiden
async function opretEjendomsprofilFraValgtAdresse() {
  const loggetIndBruger = hentLoggetIndBruger();

  if (!loggetIndBruger) {
    alert("Du skal være logget ind for at oprette en ejendomsprofil.");
    window.location.href = "login.html";
    return;
  }

  if (!valgtAdresseData) {
    alert("Du skal først vælge en adresse");
    return;
  }

  const ejendomData = {
    adresse: valgtAdresseData.adresse,
    vejnavn: valgtAdresseData.vejnavn,
    husnr: valgtAdresseData.husnr,
    postnr: valgtAdresseData.postnr,
    bynavn: valgtAdresseData.postnrnavn,
    ownerEmail: loggetIndBruger.email
  };

  try {
    const { response, data } = await hentJson(`${API_BASE_URL}/ejendomme`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(ejendomData)
    });

    if (!response.ok) {
      alert("Fejl: " + (data?.message || "Kunne ikke oprette ejendomsprofil"));
      return;
    }

    alert("Ejendomsprofil oprettet");
    hentMineEjendomme();
  } catch (error) {
    console.error("Fejl ved oprettelse af ejendomsprofil:", error);
    alert("Kunne ikke oprette ejendomsprofil");
  }
}

/* =========================
   HENT / VIS EJENDOMME
========================= */

// Henter ejendomme til forsiden
async function hentMineEjendomme() {
  const loggetIndBruger = hentLoggetIndBruger();
  const liste = document.getElementById("ejendomListe");

  if (!liste) return;

  if (!loggetIndBruger) {
    liste.innerHTML = "<p>Log ind for at se dine ejendomsprofiler.</p>";
    return;
  }

  try {
    const { response, data } = await hentJson(
      `${API_BASE_URL}/mine-ejendomme?email=${encodeURIComponent(loggetIndBruger.email)}`
    );

    liste.innerHTML = "";

    if (!response.ok) {
      liste.innerHTML = `<p>${data?.message || "Der skete en fejl."}</p>`;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      liste.innerHTML = "<p>Du har ingen ejendomsprofiler endnu.</p>";
      return;
    }

    data.forEach((ejendom) => {
      liste.appendChild(lavEjendomKort(ejendom, true));
    });
  } catch (error) {
    console.error("Fejl ved hentning af egne ejendomme:", error);
    liste.innerHTML = "<p>Der skete en fejl ved hentning af dine profiler.</p>";
  }
}

// Henter ejendomme til profilsiden
async function hentMineEjendommeTilProfil() {
  const loggetIndBruger = hentLoggetIndBruger();
  const liste = document.getElementById("profilEjendomListe");

  if (!liste) return;

  if (!loggetIndBruger) {
    liste.innerHTML = "<p>Du skal være logget ind.</p>";
    return;
  }

  try {
    const { response, data } = await hentJson(
      `${API_BASE_URL}/mine-ejendomme?email=${encodeURIComponent(loggetIndBruger.email)}`
    );

    liste.innerHTML = "";

    if (!response.ok) {
      liste.innerHTML = `<p>${data?.message || "Der skete en fejl."}</p>`;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      liste.innerHTML = "<p>Du har ingen ejendomsprofiler endnu.</p>";
      return;
    }

    data.forEach((ejendom) => {
      liste.appendChild(lavEjendomKort(ejendom, false));
    });
  } catch (error) {
    console.error("Fejl ved hentning af ejendomme til profil:", error);
    liste.innerHTML = "<p>Der skete en fejl.</p>";
  }
}

// Laver et ejendomskort
function lavEjendomKort(ejendom, visKnapper) {
  const kort = document.createElement("div");
  kort.className = "ejendom-kort";

  const titel = document.createElement("h3");
  titel.textContent = ejendom.adresse || "Ukendt adresse";

  const oprettet = document.createElement("p");
  oprettet.innerHTML =
    "<strong>Oprettet:</strong> " + formaterDato(ejendom.oprettetTidspunkt);

  const opdateret = document.createElement("p");
  opdateret.innerHTML =
    "<strong>Sidst hentet data:</strong> " + formaterDato(ejendom.sidstOpdateret);

  const cases = document.createElement("p");
  cases.innerHTML =
    "<strong>Antal investeringscases:</strong> " + (ejendom.antalCases ?? 0);

  kort.appendChild(titel);
  kort.appendChild(oprettet);
  kort.appendChild(opdateret);
  kort.appendChild(cases);

  if (visKnapper) {
    const knapWrapper = document.createElement("div");
    knapWrapper.className = "ejendom-knapper";

    const redigerKnap = document.createElement("button");
    redigerKnap.className = "knap";
    redigerKnap.textContent = "Rediger";
    redigerKnap.addEventListener("click", () => {
      redigerEjendom(ejendom.id, ejendom.adresse);
    });

    const sletKnap = document.createElement("button");
    sletKnap.className = "knap slet-knap";
    sletKnap.textContent = "Slet";
    sletKnap.addEventListener("click", () => {
      sletEjendom(ejendom.id);
    });

    knapWrapper.appendChild(redigerKnap);
    knapWrapper.appendChild(sletKnap);
    kort.appendChild(knapWrapper);
  }

  return kort;
}

/* =========================
   REDIGER / ARKIVER EJENDOM
========================= */

// Redigerer ejendommens adresse
async function redigerEjendom(id, gammelAdresse) {
  const loggetIndBruger = hentLoggetIndBruger();

  if (!loggetIndBruger) {
    alert("Du skal være logget ind");
    return;
  }

  const nyAdresse = prompt("Skriv ny adresse:", gammelAdresse);

  if (!nyAdresse || nyAdresse.trim() === "") {
    return;
  }

  try {
    const { response, data } = await hentJson(`${API_BASE_URL}/ejendomme/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        adresse: nyAdresse.trim(),
        ownerEmail: loggetIndBruger.email
      })
    });

    if (!response.ok) {
      alert("Fejl: " + (data?.message || "Kunne ikke redigere ejendom"));
      return;
    }

    hentMineEjendomme();
    hentMineEjendommeTilProfil();
  } catch (error) {
    console.error("Fejl ved redigering:", error);
    alert("Kunne ikke redigere ejendommen");
  }
}

// Arkiverer ejendom
async function sletEjendom(id) {
  const loggetIndBruger = hentLoggetIndBruger();

  if (!loggetIndBruger) {
    alert("Du skal være logget ind");
    return;
  }

  const sikker = confirm("Er du sikker på, at du vil slette ejendommen?");
  if (!sikker) return;

  try {
    const { response, data } = await hentJson(
      `${API_BASE_URL}/ejendomme/${id}?email=${encodeURIComponent(loggetIndBruger.email)}`,
      {
        method: "DELETE"
      }
    );

    if (!response.ok) {
      alert("Fejl: " + (data?.message || "Kunne ikke slette ejendom"));
      return;
    }

    hentMineEjendomme();
    hentMineEjendommeTilProfil();
  } catch (error) {
    console.error("Fejl ved sletning:", error);
    alert("Kunne ikke slette ejendommen");
  }
}

/* =========================
   PROFILSIDE
========================= */

// Viser logget brugers profil
function visMinProfil() {
  const loggetIndBruger = hentLoggetIndBruger();

  if (!loggetIndBruger) {
    window.location.href = "login.html";
    return;
  }

  const fornavnFelt = document.getElementById("profilFornavn");
  const efternavnFelt = document.getElementById("profilEfternavn");
  const emailFelt = document.getElementById("profilEmail");

  if (fornavnFelt) fornavnFelt.textContent = loggetIndBruger.fornavn || "";
  if (efternavnFelt) efternavnFelt.textContent = loggetIndBruger.efternavn || "";
  if (emailFelt) emailFelt.textContent = loggetIndBruger.email || "";
}