let valgtAdresse = null; // gemmer den adresse brugeren vælger

function bindAdresseSoegning() {
  const form = document.getElementById("index-søge"); // søgeformularen på forsiden
  const input = document.getElementById("index-søge-input"); // feltet hvor man skriver adresse

  if (!form || !input) return; // stop hvis siden ikke har de elementer

  form.addEventListener("submit", async function (event) {
    event.preventDefault(); // stopper siden i at reloade

    const soeg = input.value.trim(); // henter tekst uden mellemrum i start/slut
    const fejlBesked = document.getElementById("fejlBesked");
    const adresseListe = document.getElementById("adresseListe");
    const resultatKort = document.getElementById("resultatKort");

    if (fejlBesked) fejlBesked.textContent = ""; // rydder gammel fejl
    if (adresseListe) adresseListe.innerHTML = ""; // rydder gamle forslag
    if (resultatKort) resultatKort.classList.add("skjult"); // skjuler resultatkort

    if (!soeg) {
      if (fejlBesked) {
        fejlBesked.textContent = "Du skal skrive en adresse"; // viser fejl hvis feltet er tomt
      }
      return;
    }

    try {
      const response = await fetch(`/api/adresser?soeg=${encodeURIComponent(soeg)}`); // sender søgning til backend
      const data = await response.json(); // laver svar om til JavaScript-data

      if (!response.ok) {
        if (fejlBesked) {
          fejlBesked.textContent = data.message || "Fejl ved søgning"; // viser fejl fra serveren
        }
        return;
      }

      visAdresseForslag(data); // viser de adresser der blev fundet
    } catch (error) {
      console.error("Fejl ved søgning:", error);

      if (fejlBesked) {
        fejlBesked.textContent = "Server fejl"; // vises hvis serveren ikke svarer
      }
    }
  });
}

function visAdresseForslag(adresser) {
  const adresseListe = document.getElementById("adresseListe"); // stedet hvor forslag skal vises

  if (!adresseListe) return;

  adresseListe.innerHTML = ""; // rydder listen før nye forslag vises

  if (!adresser || adresser.length === 0) {
    adresseListe.innerHTML = "<p>Ingen adresser fundet</p>"; // besked hvis intet findes
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
}

function vaelgAdresse(adresse) {
  valgtAdresse = adresse; // gemmer den valgte adresse i variablen

  const adresseListe = document.getElementById("adresseListe");
  const resultatKort = document.getElementById("resultatKort");
  const ejendomAdresse = document.getElementById("ejendomAdresse");
  const ejendomPost = document.getElementById("ejendomPost");
  const ejendomBeskrivelse = document.getElementById("ejendomBeskrivelse");

  if (adresseListe) {
    adresseListe.innerHTML = ""; // skjuler forslagene efter valg
  }

  if (ejendomAdresse) {
    ejendomAdresse.textContent = adresse.adresse || ""; // viser den valgte adresse
  }

  if (ejendomPost) {
    ejendomPost.textContent = `${adresse.postnr || ""} ${adresse.postnrnavn || ""}`.trim(); // viser postnr og by
  }

  if (ejendomBeskrivelse) {
    ejendomBeskrivelse.textContent = "Du kan nu oprette en ejendomsprofil ud fra denne adresse."; // hjælpetekst
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
