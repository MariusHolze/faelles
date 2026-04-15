let valgtAdresse = null;

function bindAdresseSoegning() {
  const form = document.getElementById("index-søge");
  const input = document.getElementById("index-søge-input");

  if (!form || !input) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const soeg = input.value.trim();
    const fejlBesked = document.getElementById("fejlBesked");
    const adresseListe = document.getElementById("adresseListe");
    const resultatKort = document.getElementById("resultatKort");

    if (fejlBesked) fejlBesked.textContent = "";
    if (adresseListe) adresseListe.innerHTML = "";
    if (resultatKort) resultatKort.classList.add("skjult");

    if (!soeg) {
      if (fejlBesked) {
        fejlBesked.textContent = "Du skal skrive en adresse";
      }
      return;
    }

    try {
      const response = await fetch(`/api/adresser?soeg=${encodeURIComponent(soeg)}`);
      const data = await response.json();

      if (!response.ok) {
        if (fejlBesked) {
          fejlBesked.textContent = data.message || "Fejl ved søgning";
        }
        return;
      }

      visAdresseForslag(data);

    } catch (error) {
      console.error("Fejl ved søgning:", error);

      if (fejlBesked) {
        fejlBesked.textContent = "Server fejl";
      }
    }
  });
}

function visAdresseForslag(adresser) {
  const adresseListe = document.getElementById("adresseListe");

  if (!adresseListe) return;

  adresseListe.innerHTML = "";

  if (!adresser || adresser.length === 0) {
    adresseListe.innerHTML = "<p>Ingen adresser fundet</p>";
    return;
  }

  adresser.forEach((adresse) => {
    const knap = document.createElement("button");
    knap.type = "button";
    knap.className = "adresse-forslag";
    knap.textContent = adresse.adresse;

    knap.addEventListener("click", function () {
      vaelgAdresse(adresse);
    });

    adresseListe.appendChild(knap);
  });
}

function vaelgAdresse(adresse) {
  valgtAdresse = adresse;

  const adresseListe = document.getElementById("adresseListe");
  const resultatKort = document.getElementById("resultatKort");
  const ejendomAdresse = document.getElementById("ejendomAdresse");
  const ejendomPost = document.getElementById("ejendomPost");
  const ejendomBeskrivelse = document.getElementById("ejendomBeskrivelse");

  if (adresseListe) {
    adresseListe.innerHTML = "";
  }

  if (ejendomAdresse) {
    ejendomAdresse.textContent = adresse.adresse || "";
  }

  if (ejendomPost) {
    ejendomPost.textContent = `${adresse.postnr || ""} ${adresse.postnrnavn || ""}`.trim();
  }

  if (ejendomBeskrivelse) {
    ejendomBeskrivelse.textContent = "Du kan nu oprette en ejendomsprofil ud fra denne adresse.";
  }

  if (resultatKort) {
    resultatKort.classList.remove("skjult");
  }
}

function bindOpretEjendomsprofilFraForside() {
  const knap = document.getElementById("opretEjendomsprofilKnap");

  if (!knap) return;

  knap.addEventListener("click", async function () {
    const bruger = hentLoggetIndBruger();
    const fejlBesked = document.getElementById("fejlBesked");

    if (fejlBesked) {
      fejlBesked.textContent = "";
    }

    if (!bruger) {
      window.location.href = "login.html";
      return;
    }

    if (!valgtAdresse) {
      if (fejlBesked) {
        fejlBesked.textContent = "Du skal vælge en adresse først";
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
          vejnavn: valgtAdresse.vejnavn,
          husnr: valgtAdresse.husnr,
          postnr: valgtAdresse.postnr,
          bynavn: valgtAdresse.postnrnavn,
          boligtype: "Ukendt",
          boligareal: null,
          ownerEmail: bruger.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (fejlBesked) {
          fejlBesked.textContent = data.message || "Fejl ved oprettelse af ejendom";
        }
        return;
      }

      window.location.href = "profil.html";

    } catch (error) {
      console.error("Fejl ved oprettelse af ejendom:", error);

      if (fejlBesked) {
        fejlBesked.textContent = "Server fejl";
      }
    }
  });
}