let visteInvesteringscases = [];

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDato(dato) {
  if (!dato) {
    return "Ikke angivet";
  }

  return new Date(dato).toLocaleDateString("da-DK");
}

function formatKroner(beloeb) {
  return `${Number(beloeb || 0).toLocaleString("da-DK")} kr.`;
}

function lavTomCaseBesked() {
  return `
    <article class="case-card case-card-bred">
      <div class="case-card-top">
        <span class="case-status tom">Ingen cases endnu</span>
      </div>
      <h2>Opret din første investeringscase</h2>
      <p class="case-description">
        Vælg en ejendom og giv casen et navn. Derefter kan du tilføje køb og renoveringsudgifter.
      </p>
    </article>
  `;
}

function lavEksempelCase(nummer) {
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
        Dette er en eksempelvisning af, hvordan en investeringscase kan se ud.
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

function lavEksempelCasesHtml(antal) {
  let html = "";

  for (let i = 1; i <= antal; i += 1) {
    html += lavEksempelCase(i);
  }

  return html;
}

async function opretInvesteringscaseFraProfil(profil) {
  const bruger = hentLoggetIndBruger();

  if (!bruger) {
    window.location.href = "login.html";
    return;
  }

  const navn = prompt("Navn på investeringscase:", `Case for ${profil.adresse || "valgt ejendom"}`);

  if (!navn || !navn.trim()) {
    return;
  }

  const beskrivelse = prompt("Kort beskrivelse af casen:", "Ny investeringscase oprettet fra ejendomsprofil.") || "";

  try {
    const response = await fetch("/api/investeringscases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ejendomID: profil.id,
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
      adresse: profil.adresse || ""
    }));

    await visInvesteringscases();
  } catch (error) {
    console.error("Fejl ved oprettelse af investeringscase:", error);
    alert("Serverfejl ved oprettelse af investeringscase.");
  }
}

function lavCaseHtml(caseData, index) {
  return `
    <article class="case-card">
      <div class="case-card-top">
        <span class="case-status aktiv">Aktiv case</span>
      </div>

      <h2>${escapeHtml(caseData.navn || `Investeringscase ${index + 1}`)}</h2>

      <p class="case-description">
        ${escapeHtml(caseData.beskrivelse || "Ingen beskrivelse endnu.")}
      </p>

      <div class="case-meta">
        <div><span>Adresse:</span> ${escapeHtml(caseData.adresse || "Ikke angivet")}</div>
        <div><span>Case-ID:</span> CASE-${caseData.caseID}</div>
        <div><span>Oprettelsesdato:</span> ${formatDato(caseData.oprettetTidspunkt)}</div>
        <div><span>Boligareal:</span> ${caseData.boligareal ? `${caseData.boligareal} m²` : "Ikke angivet"}</div>
        <div><span>Byggeår:</span> ${caseData.byggeaar || "Ikke angivet"}</div>
        <div><span>Køb og udgifter:</span> ${formatKroner(caseData.koebsudgifterIAlt)}</div>
      </div>

      <div class="case-actions">
        <button class="case-hent-knap" type="button" data-index="${index}">Hent</button>
        <button class="case-rediger-knap" type="button" data-index="${index}" disabled>Rediger senere</button>
      </div>
    </article>
  `;
}

async function hentInvesteringscasesFraApi() {
  if (typeof hentLoggetIndBruger !== "function") {
    return { fejl: "Brugerfunktionen mangler.", cases: [] };
  }

  const bruger = hentLoggetIndBruger();

  if (!bruger) {
    return { fejl: "Du skal være logget ind for at se investeringscases.", cases: [] };
  }

  try {
    const response = await fetch(`/api/investeringscases?email=${encodeURIComponent(bruger.email)}`);
    const data = await response.json();

    if (!response.ok) {
      return { fejl: data.message || "Kunne ikke hente investeringscases.", cases: [] };
    }

    return { fejl: null, cases: data };
  } catch (error) {
    console.error("Serverfejl ved hentning af investeringscases:", error);
    return { fejl: "Serverfejl ved hentning af investeringscases.", cases: [] };
  }
}

async function visInvesteringscases() {
  const casesGrid = document.getElementById("casesGrid");
  const eksempelCasesGrid = document.getElementById("eksempelCasesGrid");

  if (!casesGrid) {
    return;
  }

  casesGrid.innerHTML = "<p class='case-dropdown-empty'>Loader investeringscases...</p>";

  if (eksempelCasesGrid) {
    eksempelCasesGrid.innerHTML = lavEksempelCasesHtml(3);
  }

  const resultat = await hentInvesteringscasesFraApi();
  visteInvesteringscases = resultat.cases;

  if (resultat.fejl) {
    casesGrid.innerHTML = `<p class="case-dropdown-empty">${escapeHtml(resultat.fejl)}</p>`;
    return;
  }

  if (visteInvesteringscases.length === 0) {
    casesGrid.innerHTML = lavTomCaseBesked();
    return;
  }

  casesGrid.innerHTML = visteInvesteringscases
    .map((caseData, index) => lavCaseHtml(caseData, index))
    .join("");
}

async function hentEjendomsprofilerTilDropdown() {
  if (typeof hentLoggetIndBruger !== "function") {
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
      return { fejl: data.message || "Kunne ikke hente ejendomsprofiler.", profiler: [] };
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
    return;
  }

  liste.innerHTML = "<p class='case-dropdown-empty'>Loader ejendomsprofiler...</p>";
  dropdown.classList.remove("skjult");

  const resultat = await hentEjendomsprofilerTilDropdown();
  const profiler = resultat.profiler;

  if (resultat.fejl) {
    liste.innerHTML = `<p class="case-dropdown-empty">${escapeHtml(resultat.fejl)}</p>`;
    return;
  }

  if (profiler.length === 0) {
    liste.innerHTML = "<p class='case-dropdown-empty'>Du har ingen gemte ejendomsprofiler endnu.</p>";
    return;
  }

  liste.innerHTML = "";

  profiler.forEach((profil, index) => {
    const knap = document.createElement("button");
    knap.type = "button";
    knap.className = "case-dropdown-item";

    knap.innerHTML = `
      <h4>${escapeHtml(profil.adresse || `Ejendomsprofil ${index + 1}`)}</h4>
      <p>
        Oprettet: ${formatDato(profil.oprettetTidspunkt)}
        · Cases: ${profil.antalCases ?? 0}
      </p>
    `;

    knap.addEventListener("click", async () => {
      await opretInvesteringscaseFraProfil(profil);
      dropdown.classList.add("skjult");
    });

    liste.appendChild(knap);
  });
}

function bindOpretCaseDropdown() {
  const opretKnap = document.getElementById("opretCaseKnap");
  const dropdown = document.getElementById("caseDropdown");

  if (!opretKnap || !dropdown) {
    return;
  }

  opretKnap.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (dropdown.classList.contains("skjult")) {
      await visCaseDropdown();
    } else {
      dropdown.classList.add("skjult");
    }
  });

  document.addEventListener("click", (event) => {
    const klikIndeIWrapper = dropdown.contains(event.target) || opretKnap.contains(event.target);

    if (!klikIndeIWrapper) {
      dropdown.classList.add("skjult");
    }
  });
}

function bindCaseKnapper() {
  document.addEventListener("click", (event) => {
    const hentKnap = event.target.closest(".case-hent-knap");

    if (!hentKnap || hentKnap.disabled) {
      return;
    }

    const valgtCase = visteInvesteringscases[Number(hentKnap.dataset.index)];

    if (!valgtCase) {
      return;
    }

    localStorage.setItem("valgtInvesteringscase", JSON.stringify(valgtCase));
    window.location.href = "købsudgifter.html";
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
