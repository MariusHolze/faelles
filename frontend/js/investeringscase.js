let visteInvesteringscases = [];

function hentCaseVisningFraUrl() {
  const params = new URLSearchParams(window.location.search);

  return {
    ejendomID: params.get("ejendomID") || "",
    visning: params.get("visning") || "",
    adresse: params.get("adresse") || ""
  };
}

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
  return `${Math.round(Number(beloeb || 0)).toLocaleString("da-DK")} kr.`;
}

function findRedigerSide(caseData) {
  // Brugeren sendes til det første trin, der mangler data.
  // Hvis alle trin er udfyldt, starter redigering fra købsudgifter.
  const sider = {
    koebsudgifter: "købsudgifter.html",
    finansiering: "lånedetaljer.html",
    renovering: "renovering.html",
    driftsbudget: "driftsbudget.html",
    udlejning: "udlejning.html"
  };

  return sider[caseData.naesteTrin] || "købsudgifter.html";
}

function hentValgtCaseFraStorage() {
  const tekst = localStorage.getItem("valgtInvesteringscase");

  if (!tekst) {
    return null;
  }

  try {
    return JSON.parse(tekst);
  } catch (error) {
    console.error("Fejl ved valgt investeringscase:", error);
    localStorage.removeItem("valgtInvesteringscase");
    return null;
  }
}

function formatProcent(value) {
  return `${Number(value || 0).toLocaleString("da-DK")} %`;
}

function formatTekst(value) {
  return value || "Ikke udfyldt";
}

function formatLaanetype(value) {
  const typer = {
    realkredit: "Realkreditlån",
    banklaan: "Banklån",
    privat: "Privat finansiering"
  };

  return typer[value] || "Ikke udfyldt";
}

function formatRenoveringTidspunkt(post) {
  if (post.tidspunktLabel) {
    return post.tidspunktLabel;
  }

  if (post.tidspunktMaaned) {
    return `måned ${formatTekst(post.tidspunktMaaned)}`;
  }

  return "Tidspunkt mangler";
}

function formatDriftPeriode(value) {
  return value === "maanedligt" ? "pr. måned" : "pr. år";
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

function lavTomOffentligCaseBesked(adresse) {
  return `
    <article class="case-card case-card-bred">
      <div class="case-card-top">
        <span class="case-status tom">Ingen offentlige cases endnu</span>
      </div>
      <h2>${escapeHtml(adresse || "Ingen cases fundet")}</h2>
      <p class="case-description">
        Der er endnu ikke oprettet investeringscases på denne ejendom. Du kan søge videre på en anden adresse.
      </p>
    </article>
  `;
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
  const udfyldteTrin = Number(caseData.antalUdfyldteTrin || 0);
  const statusTekst = udfyldteTrin >= 5 ? "Udfyldt" : `${udfyldteTrin}/5 trin udfyldt`;

  return `
    <article class="case-card">
      <div class="case-card-top">
        <span class="case-status aktiv">${statusTekst}</span>
      </div>

      <h2>${escapeHtml(caseData.navn || `Investeringscase ${index + 1}`)}</h2>

      <p class="case-description">
        ${escapeHtml(caseData.beskrivelse || "Ingen beskrivelse endnu.")}
      </p>

      <div class="case-noegletal">
        <div>
          <span>Samlet investering</span>
          <strong>${formatKroner(caseData.samletInvestering)}</strong>
        </div>
        <div>
          <span>Årlig cashflow</span>
          <strong>${formatKroner(caseData.resultatEfterFinansiering)}</strong>
        </div>
        <div>
          <span>Månedlig ydelse</span>
          <strong>${formatKroner(caseData.maanedligYdelse)}</strong>
        </div>
        <div>
          <span>Egenkapital</span>
          <strong>${formatKroner(caseData.egenkapitalBehov)}</strong>
        </div>
      </div>

      <div class="case-meta">
        <div><span>Adresse:</span> ${escapeHtml(caseData.adresse || "Ikke angivet")}</div>
        <div><span>Case-ID:</span> CASE-${caseData.caseID}</div>
        <div><span>Oprettelsesdato:</span> ${formatDato(caseData.oprettetTidspunkt)}</div>
        <div><span>Boligareal:</span> ${caseData.boligareal ? `${caseData.boligareal} m²` : "Ikke angivet"}</div>
        <div><span>Byggeår:</span> ${caseData.byggeaar || "Ikke angivet"}</div>
        <div><span>Leje efter tomgang:</span> ${formatKroner(caseData.lejeEfterTomgang)}</div>
      </div>

      <div class="case-actions">
        <button class="case-hent-knap" type="button" data-index="${index}">Åbn</button>
        <button class="case-rediger-knap" type="button" data-index="${index}">Rediger</button>
        <button class="case-slet-knap" type="button" data-index="${index}">Slet</button>
      </div>
    </article>
  `;
}

async function hentInvesteringscasesFraApi() {
  const visning = hentCaseVisningFraUrl();

  if (visning.visning === "offentlig" && visning.ejendomID) {
    try {
      const response = await fetch(`/api/investeringscases?ejendomID=${encodeURIComponent(visning.ejendomID)}`);
      const data = await response.json();

      if (!response.ok) {
        return { fejl: data.message || "Kunne ikke hente investeringscases.", cases: [] };
      }

      return { fejl: null, cases: data, offentlig: true, adresse: visning.adresse };
    } catch (error) {
      console.error("Serverfejl ved hentning af offentlige investeringscases:", error);
      return { fejl: "Serverfejl ved hentning af investeringscases.", cases: [], offentlig: true, adresse: visning.adresse };
    }
  }

  if (typeof hentLoggetIndBruger !== "function") {
    return { fejl: "Brugerfunktionen mangler.", cases: [] };
  }

  const bruger = hentLoggetIndBruger();

  if (!bruger) {
    return { fejl: "Du skal være logget ind for at se dine egne investeringscases.", cases: [] };
  }

  try {
    const response = await fetch(`/api/investeringscases?email=${encodeURIComponent(bruger.email)}`);
    const data = await response.json();

    if (!response.ok) {
      return { fejl: data.message || "Kunne ikke hente investeringscases.", cases: [] };
    }

    return { fejl: null, cases: data, offentlig: false, adresse: "" };
  } catch (error) {
    console.error("Serverfejl ved hentning af investeringscases:", error);
    return { fejl: "Serverfejl ved hentning af investeringscases.", cases: [], offentlig: false, adresse: "" };
  }
}

async function visInvesteringscases() {
  const casesGrid = document.getElementById("casesGrid");
  const opretCaseKnap = document.getElementById("opretCaseKnap");
  const heroTitel = document.querySelector(".cases-hero-text h1");
  const heroTekst = document.querySelector(".cases-hero-text p");
  const sectionTitel = document.querySelector(".case-section-title");

  if (!casesGrid) {
    return;
  }

  casesGrid.innerHTML = "<p class='case-dropdown-empty'>Loader investeringscases...</p>";

  const resultat = await hentInvesteringscasesFraApi();
  visteInvesteringscases = resultat.cases;

  if (resultat.offentlig) {
    if (opretCaseKnap) {
      opretCaseKnap.classList.add("skjult");
    }

    if (heroTitel) {
      heroTitel.textContent = "Cases for valgt ejendom";
    }

    if (heroTekst) {
      heroTekst.textContent = resultat.adresse
        ? `Her kan du se investeringscases, der allerede er oprettet for ${resultat.adresse}.`
        : "Her kan du se investeringscases, der allerede er oprettet for den valgte ejendom.";
    }

    if (sectionTitel) {
      sectionTitel.textContent = "Offentlige cases";
    }

  } else if (opretCaseKnap) {
    opretCaseKnap.classList.remove("skjult");
  }

  if (resultat.fejl) {
    casesGrid.innerHTML = `<p class="case-dropdown-empty">${escapeHtml(resultat.fejl)}</p>`;
    return;
  }

  if (visteInvesteringscases.length === 0) {
    casesGrid.innerHTML = resultat.offentlig
      ? lavTomOffentligCaseBesked(resultat.adresse)
      : lavTomCaseBesked();
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
  document.addEventListener("click", async (event) => {
    const hentKnap = event.target.closest(".case-hent-knap");
    const redigerKnap = event.target.closest(".case-rediger-knap");
    const sletKnap = event.target.closest(".case-slet-knap");
    const visning = hentCaseVisningFraUrl();

    if ((!hentKnap && !redigerKnap && !sletKnap) || event.target.disabled) {
      return;
    }

    const knap = hentKnap || redigerKnap || sletKnap;
    const valgtCase = visteInvesteringscases[Number(knap.dataset.index)];

    if (!valgtCase) {
      return;
    }

    if (visning.visning === "offentlig") {
      alert("Offentlige cases kan ses som inspiration på oversigten, men kun ejeren kan åbne og redigere formulartrinene.");
      return;
    }

    if (sletKnap) {
      await sletInvesteringscase(valgtCase, sletKnap);
      return;
    }

    localStorage.setItem("valgtInvesteringscase", JSON.stringify(valgtCase));
    window.location.href = redigerKnap ? findRedigerSide(valgtCase) : "caseOverblik.html";
  });
}

async function sletInvesteringscase(caseData, knapElement) {
  const bruger = typeof hentLoggetIndBruger === "function" ? hentLoggetIndBruger() : null;

  if (!bruger || !bruger.email) {
    alert("Du skal være logget ind for at slette en investeringscase.");
    return;
  }

  const erBekraeftet = window.confirm(
    `Vil du slette investeringscasen "${caseData.navn || `CASE-${caseData.caseID}`}"? Denne handling kan ikke fortrydes.`
  );

  if (!erBekraeftet) {
    return;
  }

  const oprindeligTekst = knapElement.textContent;

  try {
    knapElement.disabled = true;
    knapElement.textContent = "Sletter...";

    const response = await fetch(`/api/investeringscases/${caseData.caseID}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ownerEmail: bruger.email })
    });

    const responseTekst = await response.text();
    let data = {};

    try {
      data = responseTekst ? JSON.parse(responseTekst) : {};
    } catch {
      data = { message: responseTekst };
    }

    if (!response.ok) {
      if (responseTekst.includes("<!DOCTYPE") || responseTekst.includes("<html")) {
        throw new Error("Sletning fejlede, fordi backend ikke returnerede JSON. Genstart serveren og prøv igen.");
      }

      throw new Error(data.message || "Kunne ikke slette investeringscase.");
    }

    const valgtCase = hentValgtCaseFraStorage();

    if (valgtCase?.caseID === caseData.caseID) {
      localStorage.removeItem("valgtInvesteringscase");
    }

    await visInvesteringscases();
    alert(data.message || "Investeringscase slettet.");
  } catch (error) {
    console.error("Fejl ved sletning af investeringscase:", error);
    alert(error.message || "Serverfejl ved sletning af investeringscase.");
  } finally {
    knapElement.disabled = false;
    knapElement.textContent = oprindeligTekst;
  }
}

async function hentCaseAnalyseFraApi(caseID, email) {
  const response = await fetch(`/api/investeringscases/${caseID}/analyse?email=${encodeURIComponent(email)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Kunne ikke hente caseoverblik.");
  }

  return data;
}

function lavOverblikNoegletal(analyse) {
  return `
    <div>
      <span>Samlet investering</span>
      <strong>${formatKroner(analyse.samletInvestering)}</strong>
      <small>Køb plus renovering</small>
    </div>
    <div>
      <span>Årlig cashflow</span>
      <strong>${formatKroner(analyse.resultatEfterFinansiering)}</strong>
      <small>Efter drift og låneydelse</small>
    </div>
    <div>
      <span>Månedlig drift</span>
      <strong>${formatKroner(analyse.driftsudgifterMaanedligt)}</strong>
      <small>${formatKroner(analyse.driftsudgifterAarligt)} pr. år</small>
    </div>
    <div>
      <span>Månedlig ydelse</span>
      <strong>${formatKroner(analyse.maanedligYdelse)}</strong>
      <small>Beregnet ud fra lånet</small>
    </div>
    <div>
      <span>Samlet renteomkostning</span>
      <strong>${formatKroner(analyse.samletRenteomkostning)}</strong>
      <small>Over hele lånets løbetid</small>
    </div>
    <div>
      <span>Egenkapitalbehov</span>
      <strong>${formatKroner(analyse.egenkapitalBehov)}</strong>
      <small>Investering minus lån</small>
    </div>
  `;
}

function lavTrinOverblik(trinData, analyse = {}) {
  // Trindata ligger samlet som JSON i databasen.
  // Her deler vi det op igen, så overblikssiden kan vise hvert trin tydeligt.
  const koeb = trinData.koebsudgifter || {};
  const finansiering = trinData.finansiering || {};
  const renovering = trinData.renovering || {};
  const drift = trinData.driftsbudget || {};
  const udlejning = trinData.udlejning || {};
  const poster = Array.isArray(koeb.poster) ? koeb.poster : [];
  const renoveringsposter = renovering.aktiv === false ? [] : (Array.isArray(renovering.poster) ? renovering.poster : []);
  const driftsposter = Array.isArray(drift.poster) ? drift.poster : [];
  const laanebeloeb = analyse.finansieringsbehov ?? finansiering.laanebeloeb;

  const posterHtml = poster.length
    ? poster.map((post) => `<li>${escapeHtml(post.navn)}: ${formatKroner(post.beloeb)}</li>`).join("")
    : "<li>Ingen købsudgifter gemt endnu.</li>";
  const renoveringsHtml = renoveringsposter.length
    ? renoveringsposter
      .map((post) => `<li>${escapeHtml(post.navn)}: ${formatKroner(post.beloeb)} - ${escapeHtml(formatRenoveringTidspunkt(post))}</li>`)
      .join("")
    : "<li>Ingen renoveringer gemt endnu.</li>";
  const driftHtml = driftsposter.length
    ? driftsposter
      .map((post) => `<li>${escapeHtml(post.navn)}: ${formatKroner(post.beloeb)} ${formatDriftPeriode(post.periode)}</li>`)
      .join("")
    : `
      <li>Ejendomsskat: ${formatKroner(drift.ejendomsskat)}</li>
      <li>Forsikring: ${formatKroner(drift.forsikring)}</li>
      <li>Vedligehold: ${formatKroner(drift.vedligehold)}</li>
      <li>Øvrige udgifter: ${formatKroner(drift.oevrigeUdgifter)}</li>
    `;

  return `
    <article class="case-overblik-section">
      <h2>Købsudgifter</h2>
      <ul>${posterHtml}</ul>
    </article>

    <article class="case-overblik-section">
      <h2>Finansiering</h2>
      <p><span>Lånetype:</span> ${formatLaanetype(finansiering.laanetype)}</p>
      <p><span>Lånebeløb:</span> ${formatKroner(laanebeloeb)}</p>
      <p><span>Egenbetaling:</span> ${formatKroner(finansiering.egenbetaling)}</p>
      <p><span>Rente:</span> ${formatProcent(finansiering.rente)}</p>
      <p><span>Løbetid:</span> ${formatTekst(finansiering.loebetid ? `${finansiering.loebetid} år` : "")}</p>
      <p><span>Afdragsfrihed:</span> ${formatTekst(finansiering.afdragsfrihed ? `${finansiering.afdragsfrihed} år` : "0 år")}</p>
    </article>

    <article class="case-overblik-section">
      <h2>Renovering</h2>
      <ul>${renoveringsHtml}</ul>
      <p><span>Total:</span> ${formatKroner(analyse.renoveringIAlt)}</p>
    </article>

    <article class="case-overblik-section">
      <h2>Driftsbudget</h2>
      <ul>${driftHtml}</ul>
      <p><span>Månedligt:</span> ${formatKroner(analyse.driftsudgifterMaanedligt)}</p>
      <p><span>Årligt:</span> ${formatKroner(analyse.driftsudgifterAarligt)}</p>
    </article>

    <article class="case-overblik-section">
      <h2>Udlejning</h2>
      <p><span>Udlejning:</span> ${udlejning.aktiv === false ? "Nej" : "Ja"}</p>
      <p><span>Månedlig leje:</span> ${formatKroner(udlejning.maanedligLeje)}</p>
      <p><span>Depositum:</span> ${formatKroner(udlejning.depositum)}</p>
      <p><span>Tomgang:</span> ${formatProcent(udlejning.tomgangProcent)}</p>
      <p><span>Noter:</span> ${escapeHtml(formatTekst(udlejning.udlejningsNoter))}</p>
    </article>
  `;
}

async function initCaseOverblikSide() {
  const overblikGrid = document.getElementById("caseOverblikGrid");
  const trinGrid = document.getElementById("caseOverblikTrin");

  if (!overblikGrid || !trinGrid) {
    return;
  }

  const bruger = hentLoggetIndBruger();
  const valgtCase = hentValgtCaseFraStorage();

  if (!bruger) {
    window.location.href = "login.html";
    return;
  }

  if (!valgtCase || !valgtCase.caseID) {
    window.location.href = "investeringscase.html";
    return;
  }

  document.getElementById("caseOverblikTitel").textContent = valgtCase.navn || "Investeringscase";
  document.getElementById("caseOverblikMeta").textContent = valgtCase.adresse || "Ingen adresse valgt";

  try {
    // Overblikssiden henter frisk analyse fra backend, så den ikke viser gamle tal fra localStorage.
    const data = await hentCaseAnalyseFraApi(valgtCase.caseID, bruger.email);
    const analyse = data.analyse || {};
    const trinData = data.trinData || {};

    overblikGrid.innerHTML = lavOverblikNoegletal(analyse);
    trinGrid.innerHTML = lavTrinOverblik(trinData, analyse);

    // Opdaterer localStorage, så Rediger-knappen fortsætter fra første manglende trin.
    localStorage.setItem("valgtInvesteringscase", JSON.stringify({
      ...valgtCase,
      naesteTrin: analyse.naesteTrin,
      antalUdfyldteTrin: analyse.antalUdfyldteTrin
    }));

    const status = document.getElementById("caseOverblikStatus");
    const rediger = document.getElementById("caseOverblikRediger");

    if (status) {
      status.textContent = `${analyse.antalUdfyldteTrin || 0}/5 trin udfyldt`;
    }

    if (rediger) {
      rediger.href = findRedigerSide({ ...valgtCase, naesteTrin: analyse.naesteTrin });
    }
  } catch (error) {
    console.error("Fejl ved caseoverblik:", error);
    overblikGrid.innerHTML = `<p class="case-dropdown-empty">${escapeHtml(error.message)}</p>`;
  }
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
