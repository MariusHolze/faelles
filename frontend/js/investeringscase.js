function hentInvesteringscases() {
  const tekst = localStorage.getItem("investeringscases");

  if (!tekst) {
    return [];
  }

  try {
    return JSON.parse(tekst);
  } catch (error) {
    console.error("Fejl ved læsning af investeringscases:", error);
    localStorage.removeItem("investeringscases");
    return [];
  }
}

function gemInvesteringscases(cases) {
  localStorage.setItem("investeringscases", JSON.stringify(cases));
}

function lavPlaceholderCase(nummer) {
  const eksempelCases = [
    {
      titel: "Investeringscase 1",
      adresse: "Søndergade 14, 8000 Aarhus C",
      caseId: "CASE-1001",
      oprettet: "12/04/2026",
      boligareal: "124 m²",
      etager: "2",
      byggeaar: "1998"
    },
    {
      titel: "Investeringscase 2",
      adresse: "Østerbrogade 52, 2100 København Ø",
      caseId: "CASE-1002",
      oprettet: "14/04/2026",
      boligareal: "96 m²",
      etager: "1",
      byggeaar: "2007"
    },
    {
      titel: "Investeringscase 3",
      adresse: "Vestergade 7, 5000 Odense C",
      caseId: "CASE-1003",
      oprettet: "15/04/2026",
      boligareal: "148 m²",
      etager: "2",
      byggeaar: "1989"
    }
  ];

  const data = eksempelCases[nummer - 1];

  return `
    <article class="case-card empty">
      <div class="case-card-top">
        <span class="case-status tom">Eksempelcase</span>
      </div>

      <h2>${data.titel}</h2>

      <p class="case-description">
        Dette er en eksempelvisning af, hvordan en investeringscase kan se ud, før brugeren opretter sin egen case.
      </p>

      <div class="case-meta">
        <div><span>Adresse:</span> ${data.adresse}</div>
        <div><span>Case-ID:</span> ${data.caseId}</div>
        <div><span>Oprettelsesdato:</span> ${data.oprettet}</div>
        <div><span>Boligareal:</span> ${data.boligareal}</div>
        <div><span>Etager:</span> ${data.etager}</div>
        <div><span>Byggeår:</span> ${data.byggeaar}</div>
      </div>

      <div class="case-actions">
        <button class="case-hent-knap" type="button" disabled>Hent</button>
        <button class="case-rediger-knap" type="button" disabled>Rediger</button>
      </div>
    </article>
  `;
}

function lavCaseHtml(caseData, index) {
  return `
    <article class="case-card">
      <div class="case-card-top">
        <span class="case-status aktiv">Aktiv case</span>
      </div>

      <h2>${caseData.navn || `Investeringscase ${index + 1}`}</h2>

      <p class="case-description">
        ${caseData.beskrivelse || "Ingen beskrivelse endnu."}
      </p>

      <div class="case-meta">
        <div><span>Adresse:</span> ${caseData.ejendom || "Ikke angivet"}</div>
        <div><span>Case-ID:</span> ${caseData.caseId || `CASE-${1000 + index + 1}`}</div>
        <div><span>Oprettelsesdato:</span> ${caseData.oprettet || "Ikke angivet"}</div>
        <div><span>Boligareal:</span> ${caseData.boligareal || "Ikke angivet"}</div>
        <div><span>Etager:</span> ${caseData.etager || "Ikke angivet"}</div>
        <div><span>Byggeår:</span> ${caseData.byggeaar || "Ikke angivet"}</div>
      </div>

      <div class="case-actions">
        <button class="case-hent-knap" type="button" data-index="${index}">Hent</button>
        <button class="case-rediger-knap" type="button" data-index="${index}">Rediger</button>
      </div>
    </article>
  `;
}

function visInvesteringscases() {
  const casesGrid = document.getElementById("casesGrid");

  if (!casesGrid) {
    return;
  }

  const cases = hentInvesteringscases();
  let html = "";

  for (let i = 0; i < 3; i += 1) {
    if (cases[i]) {
      html += lavCaseHtml(cases[i], i);
    } else {
      html += lavPlaceholderCase(i + 1);
    }
  }

  casesGrid.innerHTML = html;
}

async function hentEjendomsprofilerTilDropdown() {
  if (typeof hentLoggetIndBruger !== "function") {
    console.error("hentLoggetIndBruger findes ikke.");
    return { fejl: "Brugerfunktionen mangler.", profiler: [] };
  }

  const bruger = hentLoggetIndBruger();

  if (!bruger) {
    return { fejl: "Ingen bruger er logget ind.", profiler: [] };
  }

  try {
    const response = await fetch(`/api/ejendomme?email=${encodeURIComponent(bruger.email)}`);
    const data = await response.json();

    if (!response.ok) {
      console.error("Fejl ved hentning af ejendomme:", data);
      return { fejl: "Kunne ikke hente ejendomsprofiler.", profiler: [] };
    }

    return { fejl: null, profiler: data };
  } catch (error) {
    console.error("Serverfejl ved hentning af ejendomme:", error);
    return { fejl: "Serverfejl ved hentning af ejendomsprofiler.", profiler: [] };
  }
}

async function visCaseDropdown() {
  const dropdown = document.getElementById("caseDropdown");
  const liste = document.getElementById("caseDropdownListe");

  if (!dropdown || !liste) {
    console.error("Dropdown-elementer blev ikke fundet.");
    return;
  }

  liste.innerHTML = "<p class='case-dropdown-empty'>Loader ejendomsprofiler...</p>";
  dropdown.classList.remove("skjult");

  const resultat = await hentEjendomsprofilerTilDropdown();
  const profiler = resultat.profiler;

  liste.innerHTML = "";

  if (resultat.fejl) {
    liste.innerHTML = `<p class="case-dropdown-empty">${resultat.fejl}</p>`;
    return;
  }

  if (profiler.length === 0) {
    liste.innerHTML = `
      <p class="case-dropdown-empty">
        Du har ingen gemte ejendomsprofiler endnu.
      </p>
    `;
    return;
  }

  profiler.forEach((profil, index) => {
    const knap = document.createElement("button");
    knap.type = "button";
    knap.className = "case-dropdown-item";

    knap.innerHTML = `
      <h4>${profil.adresse || `Ejendomsprofil ${index + 1}`}</h4>
      <p>
        Oprettet: ${
          profil.oprettetTidspunkt
            ? new Date(profil.oprettetTidspunkt).toLocaleDateString("da-DK")
            : "Ukendt"
        } · Cases: ${profil.antalCases ?? 0}
      </p>
    `;

    knap.addEventListener("click", function () {
  localStorage.setItem("valgtEjendomsprofilTilCase", JSON.stringify(profil));
  window.location.href = "opretInvesteringscase.html";
});

    liste.appendChild(knap);
  });
}

function opretCaseFraProfil(profil) {
  const cases = hentInvesteringscases();

  if (cases.length >= 3) {
    alert("Du har allerede 3 investeringscases på siden.");
    return;
  }

  const nyCase = {
    navn: `Case for ${profil.adresse || "valgt ejendom"}`,
    beskrivelse: "Ny investeringscase oprettet fra ejendomsprofil.",
    ejendom: profil.adresse || "Ikke angivet",
    caseId: `CASE-${1000 + cases.length + 1}`,
    oprettet: new Date().toLocaleDateString("da-DK"),
    boligareal: profil.boligareal || "Ikke angivet",
    etager: profil.etager || "Ikke angivet",
    byggeaar: profil.byggeaar || "Ikke angivet",
    opdateret: new Date().toLocaleDateString("da-DK")
  };

  cases.push(nyCase);
  gemInvesteringscases(cases);
  visInvesteringscases();
}

function bindOpretCaseDropdown() {
  const opretKnap = document.getElementById("opretCaseKnap");
  const dropdown = document.getElementById("caseDropdown");

  if (!opretKnap || !dropdown) {
    console.error("Opret-knap eller dropdown blev ikke fundet.");
    return;
  }

  opretKnap.addEventListener("click", async function (event) {
    event.preventDefault();
    event.stopPropagation();

    const erSkjult = dropdown.classList.contains("skjult");

    if (erSkjult) {
      await visCaseDropdown();
    } else {
      dropdown.classList.add("skjult");
    }
  });

  document.addEventListener("click", function (event) {
    const klikIndeIWrapper = dropdown.contains(event.target) || opretKnap.contains(event.target);

    if (!klikIndeIWrapper) {
      dropdown.classList.add("skjult");
    }
  });
}

function bindCaseKnapper() {
  document.addEventListener("click", function (event) {
    const hentKnap = event.target.closest(".case-hent-knap");
    const redigerKnap = event.target.closest(".case-rediger-knap");

    if (hentKnap && !hentKnap.disabled) {
      const index = Number(hentKnap.dataset.index);
      const cases = hentInvesteringscases();
      const valgtCase = cases[index];

      if (!valgtCase) {
        return;
      }

      alert(
        `Case: ${valgtCase.navn}\n\nAdresse: ${valgtCase.ejendom}\nCase-ID: ${valgtCase.caseId}\nOprettelsesdato: ${valgtCase.oprettet}\nBoligareal: ${valgtCase.boligareal}\nEtager: ${valgtCase.etager}\nByggeår: ${valgtCase.byggeaar}`
      );
    }

    if (redigerKnap && !redigerKnap.disabled) {
      const index = Number(redigerKnap.dataset.index);
      const cases = hentInvesteringscases();
      const valgtCase = cases[index];

      if (!valgtCase) {
        return;
      }

      const nytNavn = prompt("Redigér navn:", valgtCase.navn);
      if (!nytNavn) {
        return;
      }

      const nyBeskrivelse = prompt("Redigér beskrivelse:", valgtCase.beskrivelse || "");
      const nyEjendom = prompt("Redigér adresse:", valgtCase.ejendom || "");
      const nytBoligareal = prompt("Redigér boligareal:", valgtCase.boligareal || "");
      const nyeEtager = prompt("Redigér antal etager:", valgtCase.etager || "");
      const nytByggeaar = prompt("Redigér byggeår:", valgtCase.byggeaar || "");

      cases[index] = {
        ...valgtCase,
        navn: nytNavn,
        beskrivelse: nyBeskrivelse || "Ingen beskrivelse endnu.",
        ejendom: nyEjendom || "Ikke angivet",
        boligareal: nytBoligareal || "Ikke angivet",
        etager: nyeEtager || "Ikke angivet",
        byggeaar: nytByggeaar || "Ikke angivet",
        opdateret: new Date().toLocaleDateString("da-DK")
      };

      gemInvesteringscases(cases);
      visInvesteringscases();
    }
  });
}

function initInvesteringscaseSide() {
  const casesGrid = document.getElementById("casesGrid");

  if (!casesGrid) {
    return;
  }

  visInvesteringscases();
  bindOpretCaseDropdown();
  bindCaseKnapper();
}