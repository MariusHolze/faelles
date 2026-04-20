function visProfil() {
  const fornavnElement = document.getElementById("profilFornavn");
  const efternavnElement = document.getElementById("profilEfternavn");
  const emailElement = document.getElementById("profilEmail");

  if (!fornavnElement || !efternavnElement || !emailElement) {
    return; // stop hvis det ikke er profilsiden
  }

  const bruger = hentLoggetIndBruger(); // henter gemt bruger

  if (!bruger) {
    window.location.href = "login.html"; // sender til login hvis ingen bruger findes
    return;
  }

  fornavnElement.textContent = bruger.fornavn || ""; // viser fornavn
  efternavnElement.textContent = bruger.efternavn || ""; // viser efternavn
  emailElement.textContent = bruger.email || ""; // viser email
}

async function hentProfilEjendomme() {
  const liste = document.getElementById("profilEjendomListe"); // område til ejendomme på profilsiden
  const antalElement = document.getElementById("profilEjendomAntal"); // viser hvor mange ejendomme brugeren har

  if (!liste) {
    return;
  }

  const bruger = hentLoggetIndBruger(); // henter logget ind bruger

  if (!bruger) {
    return;
  }

  liste.innerHTML = "Loader..."; // tekst mens data hentes
  if (antalElement) {
    antalElement.textContent = "Henter...";
  }

  try {
    const response = await fetch(`/api/ejendomme?email=${encodeURIComponent(bruger.email)}`); // henter brugerens ejendomme
    const data = await response.json();

    if (!response.ok) {
      liste.innerHTML = "Fejl ved hentning";
      if (antalElement) {
        antalElement.textContent = "Kunne ikke hente";
      }
      return;
    }

    if (data.length === 0) {
      liste.innerHTML = `
        <div class="tom-tilstand">
          <h3>Ingen ejendomsprofiler endnu</h3>
          <p>Søg efter en dansk adresse på forsiden for at oprette din første ejendomsprofil.</p>
          <a class="knap" href="index.html">Find ejendom</a>
        </div>
      `; // besked hvis ingen findes
      if (antalElement) {
        antalElement.textContent = "0 ejendomme";
      }
      return;
    }

    liste.innerHTML = ""; // rydder området
    if (antalElement) {
      antalElement.textContent = `${data.length} ${data.length === 1 ? "ejendom" : "ejendomme"}`;
    }

    data.forEach((ejendom) => {
      const div = document.createElement("div"); // laver en boks til hver ejendom
      div.classList.add("ejendom-kort");

      // Her viser vi også BBR-felterne. Hvis databasen ikke har data endnu,
      // skriver vi "Mangler data", så brugeren kan se hvad der mangler.
      div.innerHTML = `
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
          <button class="knap opret-case-fra-profil" type="button" data-ejendom-id="${ejendom.id}">
            Opret case
          </button>
          <a class="knap sekundaer-knap" href="investeringscase.html">Se cases</a>
        </div>
      `;

      const opretCaseKnap = div.querySelector(".opret-case-fra-profil");
      opretCaseKnap.addEventListener("click", async () => {
        await opretInvesteringscaseFraProfil(ejendom);
      });

      liste.appendChild(div);
    });
  } catch (error) {
    console.error("Fejl ved hentning af profil-ejendomme:", error);
    liste.innerHTML = "Server fejl";
    if (antalElement) {
      antalElement.textContent = "Server fejl";
    }
  }
}

// Opretter en investeringscase direkte fra en bolig på profilsiden.
async function opretInvesteringscaseFraProfil(ejendom) {
  const bruger = hentLoggetIndBruger();

  if (!bruger) {
    window.location.href = "login.html";
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

// Bruges til tekstfelter, hvor værdien kan mangle i databasen.
function formatVaerdi(value) {
  if (value === null || value === undefined || value === "") {
    return '<span class="mangler-data">Mangler data</span>';
  }

  return escapeHtml(String(value));
}

// Bruges til arealer, så de altid vises ens på profilsiden.
function formatAreal(value) {
  if (value === null || value === undefined || value === "") {
    return '<span class="mangler-data">Mangler data</span>';
  }

  return `${Number(value).toLocaleString("da-DK")} m2`;
}

// Bruges til datoer, så JavaScript-datoer bliver vist på dansk format.
function formatDato(value) {
  if (!value) {
    return '<span class="mangler-data">Mangler data</span>';
  }

  return new Date(value).toLocaleDateString("da-DK");
}

// Postnummer og by vises øverst på ejendomskortet, hvis de findes.
function formatAdresseDel(postnr, bynavn) {
  const post = [postnr, bynavn].filter(Boolean).join(" ");
  return escapeHtml(post || "Adresse");
}

// Simpel beskyttelse mod at tekst fra databasen bliver tolket som HTML.
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
