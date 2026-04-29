let visteInvesteringscases = [];
let valgteSammenligningscaseIDs = new Set();

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

function formatTal(value) {
  return Number(value || 0).toLocaleString("da-DK");
}

function parseCaseIDListe(value) {
  return String(value || "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function hentCaseFlowUrl(filnavn) {
  return window.location.pathname.includes("/investeringscase/")
    ? filnavn
    : `investeringscase/${filnavn}`;
}

function findRedigerSide(caseData) {
  // Casen sendes til det første trin, der mangler data.
  // Hvis alle trin er udfyldt, starter redigering fra købsudgifter.
  const sider = {
    koebsudgifter: "købsudgifter.html",
    finansiering: "lånedetaljer.html",
    renovering: "renovering.html",
    driftsbudget: "driftsbudget.html",
    udlejning: "udlejning.html"
  };

  return hentCaseFlowUrl(sider[caseData.naesteTrin] || "købsudgifter.html");
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

function beregnUdlejningOverblikLokalt(udlejning = {}, analyse = {}) {
  const maanedligLeje = Number(udlejning.maanedligLeje || 0);
  const lejeAarligt = maanedligLeje * 12;
  const tomgangDage = analyse.tomgangDage ?? udlejning.tomgangDage ?? Math.round((Number(udlejning.tomgangProcent || 0) / 100) * 365);
  const begrænsedeTomgangDage = Math.min(365, Math.max(0, Number(tomgangDage || 0)));
  const tomgangBeloeb = lejeAarligt * (begrænsedeTomgangDage / 365);
  const lejeEfterTomgang = lejeAarligt - tomgangBeloeb;
  const lejeudgifterAarligt =
    (Number(udlejning.maanedligeUdlejningsudgifter || 0) * 12) +
    Number(udlejning.aarligeUdlejningsudgifter || 0);

  return {
    lejeAarligt,
    tomgangDage: begrænsedeTomgangDage,
    tomgangBeloeb,
    lejeudgifterAarligt,
    nettoLejeAarligt: lejeEfterTomgang - lejeudgifterAarligt,
    lejeEfterSkatAarligt: (lejeEfterTomgang - lejeudgifterAarligt) - (Math.max(0, (lejeEfterTomgang - lejeudgifterAarligt) * 0.6) * 0.42)
  };
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
  const erValgt = valgteSammenligningscaseIDs.has(Number(caseData.caseID));

  return `
    <article class="case-card">
      <div class="case-card-top">
        <span class="case-status aktiv">${statusTekst}</span>
        <label class="case-sammenlign-valg">
          <input class="case-sammenlign-checkbox" type="checkbox" data-index="${index}" ${erValgt ? "checked" : ""}>
          <span>Sammenlign</span>
        </label>
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
          <span>Årligt cashflow efter låneydelse</span>
          <strong>${formatKroner(caseData.aarligtCashflowEfterLaaneydelse ?? caseData.resultatEfterFinansiering)}</strong>
        </div>
        <div>
          <span>Månedlig ydelse</span>
          <strong>${formatKroner(caseData.maanedligYdelse)}</strong>
        </div>
        <div>
          <span>Egenkapitalbehov</span>
          <strong>${formatKroner(caseData.egenkapitalBehov)}</strong>
        </div>
      </div>

      <div class="case-meta">
        <div><span>Adresse:</span> ${escapeHtml(caseData.adresse || "Ikke angivet")}</div>
        <div><span>Case-ID:</span> CASE-${caseData.caseID}</div>
        <div><span>Oprettelsesdato:</span> ${formatDato(caseData.oprettetTidspunkt)}</div>
        <div><span>Boligareal:</span> ${caseData.boligareal ? `${caseData.boligareal} m²` : "Ikke angivet"}</div>
        <div><span>Byggeår:</span> ${caseData.byggeaar || "Ikke angivet"}</div>
        <div><span>Nettoleje:</span> ${formatKroner(caseData.nettoLejeAarligt ?? caseData.lejeEfterTomgang)}</div>
      </div>

      <div class="case-actions">
        <button class="case-hent-knap" type="button" data-index="${index}">Åbn</button>
        <button class="case-rediger-knap" type="button" data-index="${index}">Rediger</button>
        <button class="case-dupliker-knap" type="button" data-index="${index}">Dupliker</button>
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

  try {
    const response = await fetch("/api/investeringscases");
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
  const sammenlignKnap = document.getElementById("sammenlignCasesKnap");
  const sammenlignStatus = document.getElementById("caseSammenlignStatus");

  if (!casesGrid) {
    return;
  }

  casesGrid.innerHTML = "<p class='case-dropdown-empty'>Loader investeringscases...</p>";

  const resultat = await hentInvesteringscasesFraApi();
  visteInvesteringscases = resultat.cases;
  const visteIds = new Set(visteInvesteringscases.map((caseData) => Number(caseData.caseID)));
  valgteSammenligningscaseIDs = new Set([...valgteSammenligningscaseIDs].filter((caseID) => visteIds.has(caseID)));

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
    opdaterSammenlignToolbar();
    return;
  }

  casesGrid.innerHTML = visteInvesteringscases
    .map((caseData, index) => lavCaseHtml(caseData, index))
    .join("");
  opdaterSammenlignToolbar();

  if (sammenlignKnap && sammenlignStatus && resultat.offentlig) {
    sammenlignStatus.textContent = "Vælg mindst to offentlige cases for at sammenligne dem.";
  }
}

function opdaterSammenlignToolbar() {
  const sammenlignKnap = document.getElementById("sammenlignCasesKnap");
  const sammenlignStatus = document.getElementById("caseSammenlignStatus");
  const antal = valgteSammenligningscaseIDs.size;

  if (sammenlignKnap) {
    sammenlignKnap.disabled = antal < 2;
  }

  if (sammenlignStatus) {
    sammenlignStatus.textContent = antal < 2
      ? "Vælg mindst to cases for at sammenligne scenarier."
      : `${antal} cases valgt til sammenligning.`;
  }
}

async function hentEjendomsprofilerTilDropdown() {
  try {
    const response = await fetch("/api/ejendomme");
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
    const duplikerKnap = event.target.closest(".case-dupliker-knap");
    const sletKnap = event.target.closest(".case-slet-knap");
    const visning = hentCaseVisningFraUrl();

    if ((!hentKnap && !redigerKnap && !duplikerKnap && !sletKnap) || event.target.disabled) {
      return;
    }

    const knap = hentKnap || redigerKnap || duplikerKnap || sletKnap;
    const valgtCase = visteInvesteringscases[Number(knap.dataset.index)];

    if (!valgtCase) {
      return;
    }

    if (visning.visning === "offentlig") {
      alert("Offentlige cases kan ses som inspiration og sammenlignes, men kun ejeren kan åbne, duplikere, redigere og slette formulartrinene.");
      return;
    }

    if (duplikerKnap) {
      await duplikerInvesteringscase(valgtCase, duplikerKnap);
      return;
    }

    if (sletKnap) {
      await sletInvesteringscase(valgtCase, sletKnap);
      return;
    }

    localStorage.setItem("valgtInvesteringscase", JSON.stringify(valgtCase));
    window.location.href = redigerKnap ? findRedigerSide(valgtCase) : hentCaseFlowUrl("caseOverblik.html");
  });
}

function bindSammenlignValg() {
  document.addEventListener("change", (event) => {
    const checkbox = event.target.closest(".case-sammenlign-checkbox");

    if (!checkbox) {
      return;
    }

    const valgtCase = visteInvesteringscases[Number(checkbox.dataset.index)];

    if (!valgtCase) {
      return;
    }

    const caseID = Number(valgtCase.caseID);

    if (checkbox.checked) {
      valgteSammenligningscaseIDs.add(caseID);
    } else {
      valgteSammenligningscaseIDs.delete(caseID);
    }

    opdaterSammenlignToolbar();
  });

  const sammenlignKnap = document.getElementById("sammenlignCasesKnap");

  if (sammenlignKnap) {
    sammenlignKnap.addEventListener("click", () => {
      const caseIDs = [...valgteSammenligningscaseIDs];

      if (caseIDs.length < 2) {
        opdaterSammenlignToolbar();
        return;
      }

      window.location.href = hentCaseFlowUrl(`sammenlign.html?caseIDs=${encodeURIComponent(caseIDs.join(","))}`);
    });
  }
}

async function duplikerInvesteringscase(caseData, knapElement) {
  const oprindeligTekst = knapElement.textContent;

  try {
    knapElement.disabled = true;
    knapElement.textContent = "Duplikerer...";

    const response = await fetch(`/api/investeringscases/${caseData.caseID}/dupliker`, {
      method: "POST"
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Kunne ikke duplikere investeringscase.");
    }

    if (data.case) {
      localStorage.setItem("valgtInvesteringscase", JSON.stringify(data.case));
    }

    await visInvesteringscases();
    alert(data.message || "Investeringscase duplikeret.");
  } catch (error) {
    console.error("Fejl ved duplikering af investeringscase:", error);
    alert(error.message || "Serverfejl ved duplikering af investeringscase.");
  } finally {
    knapElement.disabled = false;
    knapElement.textContent = oprindeligTekst;
  }
}

async function sletInvesteringscase(caseData, knapElement) {
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
      body: JSON.stringify({})
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

async function hentCaseAnalyseFraApi(caseID) {
  const response = await fetch(`/api/investeringscases/${caseID}/analyse`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Kunne ikke hente caseoverblik.");
  }

  return data;
}

function talVaerdi(value) {
  const nummer = Number(value);
  return Number.isNaN(nummer) ? 0 : nummer;
}

function beregnNoegletalUdvikling(analyse = {}) {
  // Backend beregner tidsserien, så frontend kun viser tallene.
  if (Array.isArray(analyse.noegletalOverTid) && analyse.noegletalOverTid.length > 0) {
    return analyse.noegletalOverTid.map((punkt) => ({
      aar: punkt.aar,
      egenkapitalIEjendom: talVaerdi(punkt.egenkapitalIEjendom),
      akkumuleretCashflow: talVaerdi(punkt.akkumuleretCashflow),
      gaeld: talVaerdi(punkt.gaeld ?? punkt.restgaeld),
      samletInvestorVaerdi: talVaerdi(punkt.samletInvestorVaerdi)
    }));
  }

  return [];
}

function lavSvgPunkter(punkter, felt, xForAar, yForVaerdi) {
  return punkter
    .map((punkt) => `${xForAar(punkt.aar).toFixed(1)},${yForVaerdi(punkt[felt]).toFixed(1)}`)
    .join(" ");
}

function lavUdviklingsGraf(punkter) {
  if (!punkter.length) {
    return "";
  }

  const bredde = 760;
  const hoejde = 260;
  const padding = 34;
  const vaerdier = punkter.flatMap((punkt) => [
    punkt.egenkapitalIEjendom,
    punkt.akkumuleretCashflow,
    punkt.gaeld
  ]);
  const min = Math.min(0, ...vaerdier);
  const max = Math.max(0, ...vaerdier);
  const spænd = max - min || 1;
  const xForAar = (aar) => padding + ((aar - 1) / 29) * (bredde - padding * 2);
  const yForVaerdi = (value) => hoejde - padding - ((value - min) / spænd) * (hoejde - padding * 2);
  const egenkapitalLinje = lavSvgPunkter(punkter, "egenkapitalIEjendom", xForAar, yForVaerdi);
  const cashflowLinje = lavSvgPunkter(punkter, "akkumuleretCashflow", xForAar, yForVaerdi);
  const gaeldLinje = lavSvgPunkter(punkter, "gaeld", xForAar, yForVaerdi);
  const nulY = yForVaerdi(0).toFixed(1);
  const sidste = punkter[punkter.length - 1];

  return `
    <div class="noegletal-graf">
      <div class="noegletal-graf-header">
        <p>Egenkapital i ejendom, cashflow og gæld baseret på investeringscasens parametre.</p>
      </div>
      <div class="noegletal-signatur">
        <span class="egenkapital">Egenkapital i ejendom</span>
        <span class="cashflow">Cashflow</span>
        <span class="gaeld">Gæld</span>
      </div>
      <svg viewBox="0 0 ${bredde} ${hoejde}" role="img" aria-label="Udvikling i egenkapital, cashflow og gæld over 30 år">
        <line x1="${padding}" y1="${nulY}" x2="${bredde - padding}" y2="${nulY}" class="noegletal-nul-linje"></line>
        <polyline points="${egenkapitalLinje}" class="noegletal-linje noegletal-linje-egenkapital"></polyline>
        <polyline points="${cashflowLinje}" class="noegletal-linje noegletal-linje-cashflow"></polyline>
        <polyline points="${gaeldLinje}" class="noegletal-linje noegletal-linje-gaeld"></polyline>
        <text x="${padding}" y="${hoejde - 8}">År 1</text>
        <text x="${bredde / 2}" y="${hoejde - 8}" text-anchor="middle">År 15</text>
        <text x="${bredde - padding}" y="${hoejde - 8}" text-anchor="end">År 30</text>
      </svg>
    </div>
  `;
}

function lavUdviklingsRækker(punkter) {
  const valgteAar = new Set([1, 5, 10, 20, 30]);

  return punkter
    .filter((punkt) => valgteAar.has(punkt.aar))
    .map((punkt) => `
      <tr>
        <td>År ${punkt.aar}</td>
        <td>${formatKroner(punkt.egenkapitalIEjendom)}</td>
        <td>${formatKroner(punkt.akkumuleretCashflow)}</td>
        <td>${formatKroner(punkt.gaeld)}</td>
        <td>${formatKroner(punkt.samletInvestorVaerdi)}</td>
      </tr>
    `)
    .join("");
}

function hentSammenlignCaseIDsFraUrl() {
  const params = new URLSearchParams(window.location.search);
  return parseCaseIDListe(params.get("caseIDs"));
}

async function hentCasesTilSammenligning(caseIDs) {
  const response = await fetch("/api/investeringscases");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Kunne ikke hente investeringscases.");
  }

  const valgteIDs = new Set(caseIDs.map(Number));
  const valgteCases = data.filter((caseData) => valgteIDs.has(Number(caseData.caseID)));

  if (valgteCases.length !== valgteIDs.size) {
    throw new Error("En eller flere valgte cases findes ikke længere.");
  }

  return valgteCases;
}

function lavSammenlignKort(cases) {
  return cases.map((caseData) => {
    const cashflow = Number(caseData.aarligtCashflowEfterLaaneydelse || 0);
    const egenkapital = Number(caseData.egenkapitalBehov || 0);

    return `
      <article class="sammenlign-case-kort">
        <div class="case-card-top">
          <span class="case-status aktiv">${caseData.antalUdfyldteTrin || 0}/5 trin</span>
          <span class="case-status">${escapeHtml(caseData.adresse || "Ingen adresse")}</span>
        </div>
        <h2>${escapeHtml(caseData.navn || `CASE-${caseData.caseID}`)}</h2>
        <div class="sammenlign-kort-tal">
          <div>
            <span>Samlet investering</span>
            <strong>${formatKroner(caseData.samletInvestering)}</strong>
          </div>
          <div>
            <span>Årligt cashflow</span>
            <strong>${formatKroner(cashflow)}</strong>
          </div>
          <div>
            <span>Egenkapitalbehov</span>
            <strong>${formatKroner(egenkapital)}</strong>
          </div>
          <div>
            <span>Finansieringsbehov / gæld</span>
            <strong>${formatKroner(caseData.finansieringsbehov)}</strong>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function lavSammenlignTabel(cases) {
  const rows = [
    ["Adresse", (caseData) => escapeHtml(caseData.adresse || "Ikke angivet")],
    ["Boligareal", (caseData) => caseData.boligareal ? `${formatTal(caseData.boligareal)} m²` : "Ikke angivet"],
    ["Byggeår", (caseData) => escapeHtml(caseData.byggeaar || "Ikke angivet")],
    ["Samlet investering", (caseData) => formatKroner(caseData.samletInvestering)],
    ["Finansieringsbehov / gæld", (caseData) => formatKroner(caseData.finansieringsbehov)],
    ["Egenkapitalbehov", (caseData) => formatKroner(caseData.egenkapitalBehov)],
    ["Månedlig ydelse", (caseData) => formatKroner(caseData.maanedligYdelse)],
    ["Nettoleje årligt", (caseData) => formatKroner(caseData.nettoLejeAarligt)],
    ["Leje efter skat årligt", (caseData) => formatKroner(caseData.lejeEfterSkatAarligt)],
    ["Driftsudgifter årligt", (caseData) => formatKroner(caseData.driftsudgifterAarligt)],
    ["Årligt cashflow", (caseData) => formatKroner(caseData.aarligtCashflowEfterLaaneydelse)]
  ];

  return `
    <div class="sammenlign-tabel-wrapper">
      <table class="sammenlign-tabel">
        <thead>
          <tr>
            <th>Nøgletal</th>
            ${cases.map((caseData) => `<th>${escapeHtml(caseData.navn || `CASE-${caseData.caseID}`)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map(([label, render]) => `
            <tr>
              <th>${label}</th>
              ${cases.map((caseData) => `<td>${render(caseData)}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function initSammenlignSide() {
  const sammenlignGrid = document.getElementById("sammenlignCasesGrid");
  const sammenlignTabel = document.getElementById("sammenlignTabel");
  const meta = document.getElementById("sammenlignMeta");

  if (!sammenlignGrid || !sammenlignTabel) {
    return;
  }

  const caseIDs = hentSammenlignCaseIDsFraUrl();

  if (caseIDs.length < 2) {
    sammenlignGrid.innerHTML = "<p class='case-dropdown-empty'>Vælg mindst to cases fra oversigten for at sammenligne dem.</p>";
    sammenlignTabel.innerHTML = "";
    return;
  }

  try {
    const cases = await hentCasesTilSammenligning(caseIDs);

    if (meta) {
      meta.textContent = `${cases.length} cases sammenlignes med de nøgletal, der allerede vises på caseoversigten.`;
    }

    sammenlignGrid.innerHTML = lavSammenlignKort(cases);
    sammenlignTabel.innerHTML = lavSammenlignTabel(cases);
  } catch (error) {
    console.error("Fejl ved sammenligning:", error);
    sammenlignGrid.innerHTML = `<p class="case-dropdown-empty">${escapeHtml(error.message)}</p>`;
    sammenlignTabel.innerHTML = "";
  }
}

function lavOverblikNoegletal(analyse, trinData = {}) {
  const udvikling = beregnNoegletalUdvikling(analyse);
  const aar30 = udvikling[29] || {};
  const finansiering = trinData.finansiering || {};
  const startGaeld = talVaerdi(analyse.finansieringsbehov ?? finansiering.laanebeloeb);

  return `
    <article class="noegletal-panel">
      <div class="noegletal-kort-grid">
        <div>
          <span>Egenkapital i ejendom</span>
          <strong>${formatKroner(aar30.egenkapitalIEjendom)}</strong>
          <small>Ejendomsværdi minus restgæld efter 30 år.</small>
        </div>
        <div>
          <span>Akkumuleret cashflow</span>
          <strong>${formatKroner(aar30.akkumuleretCashflow)}</strong>
          <small>Samlet likviditet fra casen over 30 år.</small>
        </div>
        <div>
          <span>Samlet investorværdi efter 30 år</span>
          <strong>${formatKroner(aar30.samletInvestorVaerdi)}</strong>
          <small>Egenkapital i ejendom plus akkumuleret cashflow.</small>
        </div>
        <div>
          <span>Lånebehov / startgæld</span>
          <strong>${formatKroner(startGaeld)}</strong>
          <small>Lånebehovet ved investeringens start.</small>
        </div>
      </div>

      ${lavUdviklingsGraf(udvikling)}

      <div class="noegletal-tabel-wrapper">
        <table class="noegletal-tabel">
          <thead>
            <tr>
              <th>År</th>
              <th>Egenkapital i ejendom</th>
              <th>Cashflow</th>
              <th>Gæld</th>
              <th>Samlet investorværdi</th>
            </tr>
          </thead>
          <tbody>
            ${lavUdviklingsRækker(udvikling)}
          </tbody>
        </table>
      </div>
    </article>
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
  const legacyDriftsposter = [
    { navn: "Ejendomsskat", beloeb: Number(drift.ejendomsskat || 0), periode: "aarligt" },
    { navn: "Forsikring", beloeb: Number(drift.forsikring || 0), periode: "aarligt" },
    { navn: "Vedligehold", beloeb: Number(drift.vedligehold || 0), periode: "aarligt" },
    { navn: "Øvrige udgifter", beloeb: Number(drift.oevrigeUdgifter || 0), periode: "aarligt" }
  ];
  const driftsposterTilNoegletal = driftsposter.length ? driftsposter : legacyDriftsposter.filter((post) => post.beloeb > 0);
  const koebsudgifterIAlt = analyse.koebsudgifterIAlt ?? poster.reduce((sum, post) => sum + Number(post.beloeb || 0), 0);
  const stoersteKoebspost = [...poster].sort((a, b) => Number(b.beloeb || 0) - Number(a.beloeb || 0))[0];
  const renoveringAktiv = renovering.aktiv === false ? false : Boolean(renovering.aktiv || renoveringsposter.length);
  const stoersteRenovering = [...renoveringsposter].sort((a, b) => Number(b.beloeb || 0) - Number(a.beloeb || 0))[0];
  const driftsposterMedAarligt = driftsposterTilNoegletal.map((post) => ({
    ...post,
    aarligtBeloeb: post.periode === "maanedligt" ? Number(post.beloeb || 0) * 12 : Number(post.beloeb || 0)
  }));
  const stoersteDriftspost = [...driftsposterMedAarligt].sort((a, b) => b.aarligtBeloeb - a.aarligtBeloeb)[0];
  const laanebeloeb = analyse.finansieringsbehov ?? finansiering.laanebeloeb;
  const udlejningLokalt = beregnUdlejningOverblikLokalt(udlejning, analyse);
  const udlejningAktiv = udlejning.aktiv === false ? false : Boolean(udlejning.aktiv || udlejning.maanedligLeje || udlejning.depositum);
  const lejeAarligt = analyse.lejeAarligt ?? udlejningLokalt.lejeAarligt;
  const tomgangDage = analyse.tomgangDage ?? udlejningLokalt.tomgangDage;
  const tomgangBeloeb = analyse.tomgangBeloeb ?? udlejningLokalt.tomgangBeloeb;
  const lejeudgifterAarligt = analyse.lejeudgifterAarligt ?? udlejningLokalt.lejeudgifterAarligt;
  const nettoLejeAarligt = analyse.nettoLejeAarligt ?? udlejningLokalt.nettoLejeAarligt;
  const lejeEfterSkatAarligt = analyse.lejeEfterSkatAarligt ?? udlejningLokalt.lejeEfterSkatAarligt;

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
    <article class="case-overblik-section overblik-trin-section overblik-trin-koeb">
      <h2>Købsudgifter</h2>
      <div class="overblik-card-top">
        <div class="overblik-resultat">
          <span>Total køb</span>
          <strong>${formatKroner(koebsudgifterIAlt)}</strong>
          <small>${poster.length} gemte købsposter</small>
        </div>
        <div class="overblik-status">
          <span>Største post</span>
          <strong>${escapeHtml(stoersteKoebspost?.navn || "Ingen endnu")}</strong>
          <small>${stoersteKoebspost ? formatKroner(stoersteKoebspost.beloeb) : "Udfyld købsposter for at se den."}</small>
        </div>
      </div>
      <ul class="overblik-liste">${posterHtml}</ul>
    </article>

    <article class="case-overblik-section overblik-trin-section overblik-trin-finansiering">
      <h2>Finansiering</h2>
      <div class="overblik-card-top">
        <div class="overblik-resultat">
          <span>Månedlig ydelse</span>
          <strong>${formatKroner(analyse.maanedligYdelse)}</strong>
          <small>${formatLaanetype(finansiering.laanetype)}</small>
        </div>
        <div class="overblik-status">
          <span>Lånebeløb</span>
          <strong>${formatKroner(laanebeloeb)}</strong>
          <small>${formatProcent(finansiering.rente)} i rente</small>
        </div>
      </div>
      <div class="overblik-talrække">
        <div>
          <span>Egenbetaling</span>
          <strong>${formatKroner(finansiering.egenbetaling)}</strong>
          <small>Indskud i casen</small>
        </div>
        <div>
          <span>Løbetid</span>
          <strong>${formatTekst(finansiering.loebetid ? `${finansiering.loebetid} år` : "")}</strong>
          <small>Samlet låneperiode</small>
        </div>
        <div>
          <span>Afdragsfrihed</span>
          <strong>${formatTekst(finansiering.afdragsfrihed ? `${finansiering.afdragsfrihed} år` : "0 år")}</strong>
          <small>Før normal afvikling</small>
        </div>
        <div>
          <span>Renteomkostning</span>
          <strong>${formatKroner(analyse.samletRenteomkostning)}</strong>
          <small>Over hele lånets løbetid</small>
        </div>
      </div>
    </article>

    <article class="case-overblik-section overblik-trin-section overblik-trin-renovering">
      <h2>Renovering</h2>
      <div class="overblik-card-top">
        <div class="overblik-resultat">
          <span>Renovering i alt</span>
          <strong>${formatKroner(analyse.renoveringIAlt)}</strong>
          <small>${renoveringAktiv ? `${renoveringsposter.length} renoveringsposter` : "Ingen aktiv renovering"}</small>
        </div>
        <div class="overblik-status">
          <span>Største post</span>
          <strong>${escapeHtml(stoersteRenovering?.navn || "Ingen endnu")}</strong>
          <small>${stoersteRenovering ? formatKroner(stoersteRenovering.beloeb) : "Tilføj poster, hvis der renoveres."}</small>
        </div>
      </div>
      <ul class="overblik-liste">${renoveringsHtml}</ul>
    </article>

    <article class="case-overblik-section overblik-trin-section overblik-trin-drift">
      <h2>Driftsbudget</h2>
      <div class="overblik-card-top">
        <div class="overblik-resultat">
          <span>Årlig drift</span>
          <strong>${formatKroner(analyse.driftsudgifterAarligt)}</strong>
          <small>${formatKroner(analyse.driftsudgifterMaanedligt)} pr. måned</small>
        </div>
        <div class="overblik-status">
          <span>Største driftspost</span>
          <strong>${escapeHtml(stoersteDriftspost?.navn || "Ingen endnu")}</strong>
          <small>${stoersteDriftspost ? `${formatKroner(stoersteDriftspost.aarligtBeloeb)} pr. år` : "Udfyld driftsbudgettet for at se den."}</small>
        </div>
      </div>
      <ul class="overblik-liste">${driftHtml}</ul>
    </article>

    <article class="case-overblik-section overblik-trin-section overblik-trin-udlejning">
      <h2>Udlejning</h2>
      <div class="overblik-card-top">
        <div class="overblik-resultat">
          <span>Estimeret leje efter skat</span>
          <strong>${formatKroner(lejeEfterSkatAarligt)}</strong>
          <small>Estimat: 40% fradrag og ca. 42% skat af resten. Kilde: skat.dk.</small>
        </div>
        <div class="overblik-status">
          <span>Status</span>
          <strong>${udlejningAktiv ? "Udlejes" : "Udlejes ikke"}</strong>
          <small>${formatKroner(udlejning.maanedligLeje)} pr. måned</small>
        </div>
      </div>

      <div class="overblik-talrække">
        <div>
          <span>Bruttoleje</span>
          <strong>${formatKroner(lejeAarligt)}</strong>
          <small>Før tomgang og udgifter</small>
        </div>
        <div>
          <span>Tomgang</span>
          <strong>${formatTekst(`${tomgangDage} dage`)}</strong>
          <small>${formatKroner(tomgangBeloeb)} pr. år</small>
        </div>
        <div>
          <span>Udgifter</span>
          <strong>${formatKroner(lejeudgifterAarligt)}</strong>
          <small>Udlejningsudgifter pr. år</small>
        </div>
        <div>
          <span>Nettoleje</span>
          <strong>${formatKroner(nettoLejeAarligt)}</strong>
          <small>Efter tomgang og udgifter</small>
        </div>
      </div>
    </article>
  `;
}

async function initCaseOverblikSide() {
  const overblikGrid = document.getElementById("caseOverblikGrid");
  const trinGrid = document.getElementById("caseOverblikTrin");

  if (!overblikGrid || !trinGrid) {
    return;
  }

  const valgtCase = hentValgtCaseFraStorage();

  if (!valgtCase || !valgtCase.caseID) {
    window.location.href = "/investeringscase.html";
    return;
  }

  document.getElementById("caseOverblikTitel").textContent = valgtCase.navn || "Investeringscase";
  document.getElementById("caseOverblikMeta").textContent = valgtCase.adresse || "Ingen adresse valgt";

  try {
    // Overblikssiden henter frisk analyse fra backend, så den ikke viser gamle tal fra localStorage.
    const data = await hentCaseAnalyseFraApi(valgtCase.caseID);
    const analyse = data.analyse || {};
    const trinData = data.trinData || {};

    overblikGrid.innerHTML = lavOverblikNoegletal(analyse, trinData);
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
  bindSammenlignValg();
}
