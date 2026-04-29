let valgtAdresse = null; // gemmer den adresse brugeren vælger
let aktivSoegning = null;
let soegeTimer = null;

async function opdaterCasesKnapForAdresse(adresse) {
  const casesKnap = document.getElementById("seCasesForEjendomKnap");

  if (!casesKnap) {
    return;
  }

  casesKnap.disabled = true;
  casesKnap.textContent = "Finder cases...";
  casesKnap.removeAttribute("data-ejendom-id");
  casesKnap.removeAttribute("data-ejendom-adresse");

  try {
    const params = new URLSearchParams();

    if (adresse.adresseID) {
      params.set("adresseID", adresse.adresseID);
    }

    if (adresse.adgangsadresseID) {
      params.set("adgangsadresseID", adresse.adgangsadresseID);
    }

    const response = await fetch(`/api/ejendomme/find?${params.toString()}`);
    const data = await response.json();

    if (!response.ok || !data) {
      casesKnap.textContent = "Ingen cases endnu";
      return;
    }

    casesKnap.dataset.ejendomId = data.id;
    casesKnap.dataset.ejendomAdresse = data.adresse || adresse.adresse || "";
    casesKnap.disabled = false;
    casesKnap.textContent = `Se cases (${data.antalCases || 0})`;
  } catch (error) {
    console.error("Fejl ved opslag af offentlig ejendom:", error);
    casesKnap.textContent = "Ingen cases endnu";
  }
}

function rydAdresseForslag() {
  const adresseListe = document.getElementById("adresseListe");

  if (!adresseListe) return;

  adresseListe.innerHTML = "";
  adresseListe.classList.add("skjult");
}

function visFejlBesked(besked) {
  const fejlBesked = document.getElementById("fejlBesked");

  if (fejlBesked) {
    fejlBesked.textContent = besked;
  }
}

async function hentAdresseForslag(soeg, { visTomSoegning = false } = {}) {
  const resultatKort = document.getElementById("resultatKort");

  visFejlBesked("");
  rydAdresseForslag();

  if (resultatKort) {
    resultatKort.classList.add("skjult");
  }

  if (!soeg) {
    if (visTomSoegning) {
      visFejlBesked("Du skal skrive en adresse");
    }
    return;
  }

  if (aktivSoegning) {
    aktivSoegning.abort();
  }

  const controller = new AbortController();
  aktivSoegning = controller;

  try {
    const response = await fetch(`/api/adresser?soeg=${encodeURIComponent(soeg)}`, {
      signal: controller.signal
    });
    const data = await response.json();

    if (!response.ok) {
      visFejlBesked(data.message || "Fejl ved søgning");
      return;
    }

    visAdresseForslag(data);
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    console.error("Fejl ved søgning:", error);
    visFejlBesked("Server fejl");
  } finally {
    if (aktivSoegning === controller) {
      aktivSoegning = null;
    }
  }
}

function bindAdresseSoegning() {
  const form = document.getElementById("index-søge"); // søgeformularen på forsiden
  const input = document.getElementById("index-søge-input"); // feltet hvor man skriver adresse

  if (!form || !input) return; // stop hvis siden ikke har de elementer

  form.addEventListener("submit", async function (event) {
    event.preventDefault(); // stopper siden i at reloade
    await hentAdresseForslag(input.value.trim(), { visTomSoegning: true });
  });

  input.addEventListener("input", function () {
    const soeg = input.value.trim();
    const resultatKort = document.getElementById("resultatKort");

    valgtAdresse = null;
    visFejlBesked("");
    clearTimeout(soegeTimer);

    if (resultatKort) {
      resultatKort.classList.add("skjult");
    }

    if (!soeg) {
      rydAdresseForslag();
      return;
    }

    soegeTimer = setTimeout(function () {
      hentAdresseForslag(soeg);
    }, 250);
  });

  input.addEventListener("focus", function () {
    const adresseListe = document.getElementById("adresseListe");

    if (adresseListe && adresseListe.children.length > 0) {
      adresseListe.classList.remove("skjult");
    }
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      rydAdresseForslag();
      input.blur();
    }
  });

  document.addEventListener("click", function (event) {
    if (!form.contains(event.target)) {
      rydAdresseForslag();
    }
  });
}

function visAdresseForslag(adresser) {
  const adresseListe = document.getElementById("adresseListe"); // stedet hvor forslag skal vises

  if (!adresseListe) return;

  adresseListe.innerHTML = ""; // rydder listen før nye forslag vises

  if (!adresser || adresser.length === 0) {
    adresseListe.classList.add("skjult");
    return;
  }

  adresser.forEach((adresse) => {
    const knap = document.createElement("button");
    knap.type = "button";
    knap.className = "adresse-forslag";
    knap.textContent = adresse.adresse || "";

    knap.addEventListener("click", function () {
      vaelgAdresse(adresse);
    });

    adresseListe.appendChild(knap);
  });

  adresseListe.classList.remove("skjult");
}

function vaelgAdresse(adresse) {
  valgtAdresse = adresse; // gemmer den valgte adresse i variablen

  const input = document.getElementById("index-søge-input");
  const resultatKort = document.getElementById("resultatKort");
  const ejendomAdresse = document.getElementById("ejendomAdresse");
  const ejendomPost = document.getElementById("ejendomPost");
  const ejendomBeskrivelse = document.getElementById("ejendomBeskrivelse");
  const visKortdataKnap = document.getElementById("visKortdataKnap");
  const seCasesKnap = document.getElementById("seCasesForEjendomKnap");

  if (input) {
    input.value = adresse.adresse || "";
  }

  rydAdresseForslag();

  if (ejendomAdresse) {
    ejendomAdresse.textContent = adresse.adresse || ""; // viser den valgte adresse
  }

  if (ejendomPost) {
    ejendomPost.textContent = `${adresse.postnr || ""} ${adresse.postnrnavn || ""}`.trim(); // viser postnr og by
  }

  if (ejendomBeskrivelse) {
    ejendomBeskrivelse.textContent = "Klar til at oprette ejendomsprofil eller se eksisterende cases."; // hjælpetekst
  }

  if (visKortdataKnap) {
    visKortdataKnap.disabled = !adresse.adresseID && !adresse.adgangsadresseID;
    visKortdataKnap.dataset.kortAdresseId = adresse.adresseID || "";
    visKortdataKnap.dataset.kortAdgangsadresseId = adresse.adgangsadresseID || "";
    visKortdataKnap.dataset.kortAdresse = adresse.adresse || "";
  }

  if (seCasesKnap) {
    seCasesKnap.disabled = true;
    seCasesKnap.textContent = "Se cases";
  }

  if (resultatKort) {
    resultatKort.classList.remove("skjult"); // viser kortet med den valgte adresse
  }

  opdaterCasesKnapForAdresse(adresse);
}

function bindOpretEjendomsprofilFraForside() {
  const knap = document.getElementById("opretEjendomsprofilKnap"); // knap på resultatkortet

  if (!knap) return;

  knap.addEventListener("click", async function () {
    const fejlBesked = document.getElementById("fejlBesked");

    if (fejlBesked) {
      fejlBesked.textContent = ""; // rydder gammel fejl
    }

    if (!valgtAdresse) {
      if (fejlBesked) {
        fejlBesked.textContent = "Du skal vælge en adresse først"; // man skal vælge adresse før oprettelse
      }
      return;
    }

    try {
      const response = await fetch("/api/ejendomme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          adresse: valgtAdresse.adresse,
          adresseID: valgtAdresse.adresseID,
          vejnavn: valgtAdresse.vejnavn,
          husnr: valgtAdresse.husnr,
          postnr: valgtAdresse.postnr,
          bynavn: valgtAdresse.postnrnavn,
          adgangsadresseID: valgtAdresse.adgangsadresseID
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (fejlBesked) {
          fejlBesked.textContent = data.message || "Fejl ved oprettelse af ejendom"; // fejl fra backend
        }
        return;
      }

      window.location.href = "profil.html"; // går til profilsiden når det lykkes
    } catch (error) {
      console.error("Fejl ved oprettelse af ejendom:", error);

      if (fejlBesked) {
        fejlBesked.textContent = "Server fejl";
      }
    }
  });
}

function bindSeCasesFraForside() {
  const knap = document.getElementById("seCasesForEjendomKnap");

  if (!knap) {
    return;
  }

  knap.addEventListener("click", () => {
    const ejendomID = knap.dataset.ejendomId;

    if (!ejendomID) {
      return;
    }

    const url = new URL("investeringscase.html", window.location.href);
    url.searchParams.set("ejendomID", ejendomID);
    url.searchParams.set("visning", "offentlig");

    if (knap.dataset.ejendomAdresse) {
      url.searchParams.set("adresse", knap.dataset.ejendomAdresse);
    }

    window.location.href = url.toString();
  });
}
