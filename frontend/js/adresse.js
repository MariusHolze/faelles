let valgtAdresse = null; // gemmer den adresse brugeren vælger
let aktivSoegning = null;
let soegeTimer = null;

function rydAdresseForslag() {
  const adresseListe = document.getElementById("adresseListe");

  if (!adresseListe) return;

  adresseListe.innerHTML = "";
  adresseListe.classList.remove("har-forslag");
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
      adresseListe.classList.add("har-forslag");
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
    adresseListe.innerHTML = '<p class="adresse-tom">Ingen adresser fundet</p>';
    adresseListe.classList.add("har-forslag");
    return;
  }

  adresser.forEach((adresse) => {
    const knap = document.createElement("button"); // laver en knap til hvert forslag
    knap.type = "button";
    knap.className = "adresse-forslag";
    knap.textContent = adresse.adresse; // viser adressen som tekst

    knap.addEventListener("click", function () {
      vaelgAdresse(adresse); // gemmer adressen når man klikker
    });

    adresseListe.appendChild(knap); // sætter knappen ind på siden
  });

  adresseListe.classList.add("har-forslag");
}

function vaelgAdresse(adresse) {
  valgtAdresse = adresse; // gemmer den valgte adresse i variablen

  const input = document.getElementById("index-søge-input");
  const resultatKort = document.getElementById("resultatKort");
  const ejendomAdresse = document.getElementById("ejendomAdresse");
  const ejendomPost = document.getElementById("ejendomPost");
  const ejendomBeskrivelse = document.getElementById("ejendomBeskrivelse");
  const visKortdataKnap = document.getElementById("visKortdataKnap");

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
    ejendomBeskrivelse.textContent = "Du kan nu oprette en ejendomsprofil ud fra denne adresse."; // hjælpetekst
  }

  if (visKortdataKnap) {
    visKortdataKnap.disabled = !adresse.adresseID && !adresse.adgangsadresseID;
    visKortdataKnap.dataset.kortAdresseId = adresse.adresseID || "";
    visKortdataKnap.dataset.kortAdgangsadresseId = adresse.adgangsadresseID || "";
    visKortdataKnap.dataset.kortAdresse = adresse.adresse || "";
  }

  if (resultatKort) {
    resultatKort.classList.remove("skjult"); // viser kortet med den valgte adresse
  }
}

function bindOpretEjendomsprofilFraForside() {
  const knap = document.getElementById("opretEjendomsprofilKnap"); // knap på resultatkortet

  if (!knap) return;

  knap.addEventListener("click", async function () {
    const bruger = hentLoggetIndBruger(); // tjekker om der er en bruger logget ind
    const fejlBesked = document.getElementById("fejlBesked");

    if (fejlBesked) {
      fejlBesked.textContent = ""; // rydder gammel fejl
    }

    if (!bruger) {
      window.location.href = "login.html"; // sender til login hvis ingen bruger findes
      return;
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
          adgangsadresseID: valgtAdresse.adgangsadresseID,
          ownerEmail: bruger.email
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
