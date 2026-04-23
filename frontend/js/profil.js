function hentAktivBruger() {
  const bruger = hentLoggetIndBruger();

  if (!bruger) {
    window.location.href = "login.html";
    return null;
  }

  return bruger;
}

// Viser den loggede brugers oplysninger på profilsiden.
function visProfil() {
  const fornavnElement = document.getElementById("profilFornavn");
  const efternavnElement = document.getElementById("profilEfternavn");
  const emailElement = document.getElementById("profilEmail");

  if (!fornavnElement || !efternavnElement || !emailElement) {
    return;
  }

  const bruger = hentAktivBruger();

  if (!bruger) {
    return;
  }

  fornavnElement.textContent = bruger.fornavn || "";
  efternavnElement.textContent = bruger.efternavn || "";
  emailElement.textContent = bruger.email || "";
}

// Udfylder felterne på siden til redigering af brugerprofil.
function udfyldRedigerProfilForm() {
  const fornavnInput = document.getElementById("redigerFornavn");
  const efternavnInput = document.getElementById("redigerEfternavn");
  const telefonInput = document.getElementById("redigerTelefon");
  const emailInput = document.getElementById("redigerEmail");

  if (!fornavnInput || !efternavnInput || !telefonInput || !emailInput) {
    return;
  }

  const bruger = hentAktivBruger();

  if (!bruger) {
    return;
  }

  fornavnInput.value = bruger.fornavn || "";
  efternavnInput.value = bruger.efternavn || "";
  telefonInput.value = bruger.telefon || "";
  emailInput.value = bruger.email || "";
}

// Gemmer ændringer til den loggede brugers profil.
function bindRedigerProfilForm() {
  const form = document.getElementById("redigerProfilForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const bruger = hentAktivBruger();

    if (!bruger) {
      return;
    }

    const fornavnInput = document.getElementById("redigerFornavn");
    const efternavnInput = document.getElementById("redigerEfternavn");
    const telefonInput = document.getElementById("redigerTelefon");
    const emailInput = document.getElementById("redigerEmail");

    try {
      const response = await fetch("/api/brugere/profil", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          brugerID: bruger.brugerID,
          fornavn: fornavnInput.value,
          efternavn: efternavnInput.value,
          telefon: telefonInput.value,
          email: emailInput.value
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Kunne ikke opdatere profil.");
        return;
      }

      gemLoggetIndBruger(data.bruger);
      window.location.href = "profil.html";
    } catch (error) {
      console.error("Fejl ved opdatering af profil:", error);
      alert("Server fejl");
    }
  });
}

// Sletter den loggede brugers konto efter bekræftelse.
function bindSletKontoKnap() {
  const sletKnap = document.getElementById("sletKontoKnap");

  if (!sletKnap) {
    return;
  }

  sletKnap.addEventListener("click", async function () {
    const bruger = hentAktivBruger();

    if (!bruger) {
      return;
    }

    const erSikker = confirm("Er du sikker på, at du vil slette din konto?");

    if (!erSikker) {
      return;
    }

    try {
      const response = await fetch("/api/brugere/profil", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          brugerID: bruger.brugerID
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Kunne ikke slette konto.");
        return;
      }

      fjernLoggetIndBruger();
      alert("Din konto er blevet slettet.");
      window.location.href = "index.html";
    } catch (error) {
      console.error("Fejl ved sletning af profil:", error);
      alert("Server fejl");
    }
  });
}

// Henter og viser brugerens ejendomsprofiler.
async function hentProfilEjendomme() {
  const liste = document.getElementById("profilEjendomListe");
  const antalElement = document.getElementById("profilEjendomAntal");

  if (!liste) {
    return;
  }

  const bruger = hentAktivBruger();

  if (!bruger) {
    return;
  }

  liste.innerHTML = "Loader...";

  if (antalElement) {
    antalElement.textContent = "Henter...";
  }

  try {
    const response = await fetch(`/api/ejendomme?email=${encodeURIComponent(bruger.email)}`);
    const ejendomme = await response.json();

    if (!response.ok) {
      visProfilEjendomFejl(liste, antalElement);
      return;
    }

    if (ejendomme.length === 0) {
      visTomProfilEjendomme(liste, antalElement);
      return;
    }

    liste.innerHTML = "";
    opdaterProfilEjendomAntal(antalElement, ejendomme.length);

    ejendomme.forEach((ejendom) => {
      const kort = lavEjendomKort(ejendom);
      bindEjendomKort(kort, ejendom);
      liste.appendChild(kort);
    });
  } catch (error) {
    console.error("Fejl ved hentning af profil-ejendomme:", error);
    visProfilEjendomFejl(liste, antalElement);
  }
}

function visTomProfilEjendomme(liste, antalElement) {
  liste.innerHTML = `
    <div class="tom-tilstand">
      <h3>Ingen ejendomsprofiler endnu</h3>
      <p>Søg efter en dansk adresse på forsiden for at oprette din første ejendomsprofil.</p>
      <a class="knap" href="index.html">Find ejendom</a>
    </div>
  `;

  if (antalElement) {
    antalElement.textContent = "0 ejendomme";
  }
}

function visProfilEjendomFejl(liste, antalElement) {
  liste.innerHTML = "Fejl ved hentning";

  if (antalElement) {
    antalElement.textContent = "Kunne ikke hente";
  }
}

function opdaterProfilEjendomAntal(antalElement, antal) {
  if (!antalElement) {
    return;
  }

  antalElement.textContent = `${antal} ${antal === 1 ? "ejendom" : "ejendomme"}`;
}

function lavEjendomKort(ejendom) {
  const div = document.createElement("div");
  div.classList.add("ejendom-kort");
  div.innerHTML = hentEjendomKortHtml(ejendom);
  return div;
}

function hentEjendomKortHtml(ejendom) {
  return `
    <div class="ejendom-kort-top">
      <div>
        <p class="eyebrow">${formatAdresseDel(ejendom.postnr, ejendom.bynavn)}</p>
        <h3>${formatVaerdi(ejendom.adresse)}</h3>
      </div>
      <span class="case-badge">${ejendom.antalCases || 0} ${Number(ejendom.antalCases) === 1 ? "case" : "cases"}</span>
    </div>

    <dl class="ejendom-data-grid">
      <div>
        <dt>Boligtype</dt>
        <dd>${formatVaerdi(ejendom.boligtype)}</dd>
      </div>
      <div>
        <dt>Byggeår</dt>
        <dd>${formatVaerdi(ejendom.byggeaar)}</dd>
      </div>
      <div>
        <dt>Boligareal</dt>
        <dd>${formatAreal(ejendom.boligareal)}</dd>
      </div>
      <div>
        <dt>Grundareal</dt>
        <dd>${formatAreal(ejendom.grundareal)}</dd>
      </div>
      <div>
        <dt>Værelser</dt>
        <dd>${formatVaerdi(ejendom.antalVaerelser)}</dd>
      </div>
      <div>
        <dt>Oprettet</dt>
        <dd>${formatDato(ejendom.oprettetTidspunkt)}</dd>
      </div>
      <div>
        <dt>Sidst hentet</dt>
        <dd>${formatDato(ejendom.sidstOpdateret)}</dd>
      </div>
    </dl>

    <div class="ejendom-kort-footer">
      ${hentKortdataKnapHtml({
        adresseID: ejendom.adresseID,
        adgangsadresseID: ejendom.adgangsadresseID,
        adresse: ejendom.adresse,
        disabled: !ejendom.adresseID && !ejendom.adgangsadresseID
      })}
    </div>

    <div class="ejendom-knapper">
      <button class="knap sekundaer-knap slet-ejendom-fra-profil" type="button">Slet ejendom</button>
      <button class="knap opret-case-fra-profil" type="button">Opret case</button>
      <a class="knap sekundaer-knap" href="investeringscase.html">Se cases</a>
    </div>

    <div class="rediger-ejendom-panel skjult">
      <label for="redigerEjendomInput-${ejendom.id}">Vælg ny valideret adresse</label>
      <div class="søgefelt-wrapper">
        <input
          type="search"
          id="redigerEjendomInput-${ejendom.id}"
          class="rediger-ejendom-input"
          placeholder="Søg efter dansk adresse..."
          autocomplete="off"
        >
        <div class="adresseListe adresse-dropdown skjult"></div>
      </div>
      <p class="rediger-ejendom-status"></p>
      <div class="ejendom-knapper">
        <button class="knap gem-redigeret-ejendom" type="button" disabled>Gem ny adresse</button>
        <button class="knap sekundaer-knap annuller-redigeret-ejendom" type="button">Annuller</button>
      </div>
    </div>
  `;
}

function bindEjendomKort(kort, ejendom) {
  const sletEjendomKnap = kort.querySelector(".slet-ejendom-fra-profil");
  sletEjendomKnap.addEventListener("click", async () => {
    await sletEjendomFraProfil(ejendom);
  });

  const opretCaseKnap = kort.querySelector(".opret-case-fra-profil");
  opretCaseKnap.addEventListener("click", async () => {
    await opretInvesteringscaseFraProfil(ejendom);
  });
}

function bindRedigerEjendomPanel(kort, ejendom) {
  const redigerEjendomKnap = kort.querySelector(".rediger-ejendom-fra-profil");
  const redigerPanel = kort.querySelector(".rediger-ejendom-panel");
  const redigerInput = kort.querySelector(".rediger-ejendom-input");
  const forslagListe = kort.querySelector(".adresseListe");
  const statusElement = kort.querySelector(".rediger-ejendom-status");
  const gemKnap = kort.querySelector(".gem-redigeret-ejendom");
  const annullerKnap = kort.querySelector(".annuller-redigeret-ejendom");

  let nyValideretAdresse = null;
  let soegeTimer = null;

  redigerEjendomKnap.addEventListener("click", () => {
    redigerPanel.classList.remove("skjult");
    redigerInput.focus();
  });

  redigerInput.addEventListener("input", function () {
    const soeg = redigerInput.value.trim();

    nyValideretAdresse = null;
    gemKnap.disabled = true;
    statusElement.textContent = "";
    forslagListe.innerHTML = "";
    forslagListe.classList.add("skjult");
    clearTimeout(soegeTimer);

    if (!soeg) {
      return;
    }

    soegeTimer = setTimeout(async function () {
      await visAdresseForslagTilRedigering(soeg, forslagListe, statusElement, function (adresse) {
        nyValideretAdresse = adresse;
        redigerInput.value = adresse.adresse || "";
        gemKnap.disabled = false;
        statusElement.textContent = `${adresse.postnr || ""} ${adresse.postnrnavn || ""}`.trim();
      });
    }, 250);
  });

  gemKnap.addEventListener("click", async () => {
    await redigerEjendomFraProfil(ejendom, nyValideretAdresse, statusElement);
  });

  annullerKnap.addEventListener("click", () => {
    nulstilRedigerEjendomPanel(redigerPanel, redigerInput, forslagListe, statusElement, gemKnap);
    nyValideretAdresse = null;
  });
}

function nulstilRedigerEjendomPanel(redigerPanel, redigerInput, forslagListe, statusElement, gemKnap) {
  redigerPanel.classList.add("skjult");
  redigerInput.value = "";
  forslagListe.innerHTML = "";
  forslagListe.classList.add("skjult");
  statusElement.textContent = "";
  gemKnap.disabled = true;
}

// Søger efter adresser til redigering af en eksisterende ejendomsprofil.
async function visAdresseForslagTilRedigering(soeg, forslagListe, statusElement, onSelect) {
  try {
    const response = await fetch(`/api/adresser?soeg=${encodeURIComponent(soeg)}`);
    const data = await response.json();

    forslagListe.innerHTML = "";

    if (!response.ok) {
      statusElement.textContent = data.message || "Kunne ikke hente adresseforslag.";
      forslagListe.classList.add("skjult");
      return;
    }

    data.forEach((adresse) => {
      const knap = document.createElement("button");
      knap.type = "button";
      knap.className = "adresse-forslag";
      knap.textContent = adresse.adresse || "";

      knap.addEventListener("click", function () {
        forslagListe.innerHTML = "";
        forslagListe.classList.add("skjult");
        onSelect(adresse);
      });

      forslagListe.appendChild(knap);
    });

    forslagListe.classList.remove("skjult");
  } catch (error) {
    console.error("Fejl ved hentning af adresseforslag til redigering:", error);
    statusElement.textContent = "Server fejl";
    forslagListe.classList.add("skjult");
  }
}

// Opdaterer en ejendomsprofil med en ny valideret adresse.
async function redigerEjendomFraProfil(ejendom, nyAdresse, statusElement) {
  const bruger = hentAktivBruger();

  if (!bruger) {
    return;
  }

  if (!nyAdresse) {
    statusElement.textContent = "Du skal vælge en gyldig adresse fra listen.";
    return;
  }

  try {
    const response = await fetch(`/api/ejendomme/${ejendom.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        adresse: nyAdresse.adresse,
        adresseID: nyAdresse.adresseID,
        vejnavn: nyAdresse.vejnavn,
        husnr: nyAdresse.husnr,
        postnr: nyAdresse.postnr,
        bynavn: nyAdresse.postnrnavn,
        adgangsadresseID: nyAdresse.adgangsadresseID,
        ownerEmail: bruger.email
      })
    });

    const data = await response.json();

    if (!response.ok) {
      statusElement.textContent = data.message || "Kunne ikke opdatere ejendom.";
      return;
    }

    statusElement.textContent = "Ejendommen er opdateret.";
    await hentProfilEjendomme();
  } catch (error) {
    console.error("Fejl ved opdatering af ejendom:", error);
    statusElement.textContent = "Server fejl";
  }
}

// Arkiverer en ejendom fra profilsiden.
async function sletEjendomFraProfil(ejendom) {
  const bruger = hentAktivBruger();

  if (!bruger) {
    return;
  }

  const erSikker = confirm("Er du sikker på, at du vil slette denne ejendom?");

  if (!erSikker) {
    return;
  }

  try {
    const response = await fetch(`/api/ejendomme/${ejendom.id}?email=${encodeURIComponent(bruger.email)}`, {
      method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Kunne ikke slette ejendom.");
      return;
    }

    await hentProfilEjendomme();
    alert(data.message || "Ejendom slettet.");
  } catch (error) {
    console.error("Fejl ved sletning af ejendom:", error);
    alert("Server fejl");
  }
}

// Opretter en investeringscase fra den valgte ejendom.
async function opretInvesteringscaseFraProfil(ejendom) {
  const bruger = hentAktivBruger();

  if (!bruger) {
    return;
  }

  const navn = prompt("Navn på investeringscase:", `Case for ${ejendom.adresse || "valgt ejendom"}`);

  if (!navn || !navn.trim()) {
    return;
  }

  const beskrivelse = prompt("Kort beskrivelse af casen:", "Ny investeringscase oprettet fra min profil.") || "";

  try {
    const response = await fetch("/api/investeringscases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ejendomID: ejendom.id,
        ownerEmail: bruger.email,
        navn: navn.trim(),
        beskrivelse: beskrivelse.trim(),
        koebsposter: []
      })
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Kunne ikke oprette investeringscase.");
      return;
    }

    localStorage.setItem("valgtInvesteringscase", JSON.stringify({
      caseID: data.caseID,
      navn: navn.trim(),
      adresse: ejendom.adresse || ""
    }));

    window.location.href = "købsudgifter.html";
  } catch (error) {
    console.error("Fejl ved oprettelse af investeringscase fra profil:", error);
    alert("Serverfejl ved oprettelse af investeringscase.");
  }
}

function formatVaerdi(value) {
  if (value === null || value === undefined || value === "") {
    return '<span class="mangler-data">Mangler data</span>';
  }

  return escapeHtml(String(value));
}

function formatAreal(value) {
  if (value === null || value === undefined || value === "") {
    return '<span class="mangler-data">Mangler data</span>';
  }

  return `${Number(value).toLocaleString("da-DK")} m2`;
}

function formatDato(value) {
  if (!value) {
    return '<span class="mangler-data">Mangler data</span>';
  }

  return new Date(value).toLocaleDateString("da-DK");
}

function formatAdresseDel(postnr, bynavn) {
  const post = [postnr, bynavn].filter(Boolean).join(" ");
  return escapeHtml(post || "Adresse");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
