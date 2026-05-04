let currentStep = 0;
let simulationResult = null;
let currentCaseID = null;
let investmentChart = null;
let comparisonCases = [];

const moneyFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 0
});

function kroner(value) {
  return moneyFormatter.format(Number(value) || 0);
}

function cashflowKlasse(value) {
  return Number(value) < 0 ? "tal-negativ" : "tal-positiv";
}

function talFraKroner(value) {
  return Number(
    String(value)
      .replaceAll(".", "")
      .replace("kr.", "")
      .replace("kr", "")
      .trim()
  ) || 0;
}

function bindInvesteringscaseForm() {
  const form = document.querySelector("#investmentCaseForm");

  if (!form) {
    return;
  }

  document.querySelector("#previousStepButton").addEventListener("click", previousStep);
  document.querySelector("#nextStepButton").addEventListener("click", nextStep);
  document.querySelector("#reloadCasesButton").addEventListener("click", loadInvestmentCases);
  document.querySelector("#runSimulationButton").addEventListener("click", runSimulation);
  document.querySelector("#showCreateCaseButton").addEventListener("click", showCreateCase);
  document.querySelector("#cancelCreateCaseButton").addEventListener("click", showOverview);
  document.querySelector("#startCaseButton").addEventListener("click", startNewCase);
  form.addEventListener("submit", saveInvestmentCase);

  document.querySelector("#addPurchaseRowButton").addEventListener("click", () => addPurchaseRow("", "", false));
  document.querySelector("#addRenovationRowButton").addEventListener("click", () => addRenovationRow("", "", ""));
  document.querySelector("#addOperationRowButton").addEventListener("click", () => addOperationRow("", "", "maanedligt"));
  document.querySelector("#addRentalCostRowButton").addEventListener("click", () => addRentalCostRow("", "", "maanedligt"));
  document.querySelector("#renovationYesButton").addEventListener("click", () => setRenovationActive(true));
  document.querySelector("#renovationNoButton").addEventListener("click", () => setRenovationActive(false));
  document.querySelector("#rentalYesButton").addEventListener("click", () => setRentalActive(true));
  document.querySelector("#rentalNoButton").addEventListener("click", () => setRentalActive(false));
  document.querySelectorAll(".kroner-input").forEach(aktiverKronerFelt);

  addPurchaseRow("Ejendomspris", "", true);
  addPurchaseRow("Omkostninger ved køb", "", true);
  addPurchaseRow("Udgifter til advokat", "", true);
  addPurchaseRow("Tinglysning", "", true);
  addPurchaseRow("Køberrådgivning", "", true);
  addOperationRow("Ejendomsskat/fællesudgifter", "", "maanedligt");

  loadProperties().then(() => {
    const params = new URLSearchParams(window.location.search);
    const ejendomID = params.get("ejendomID");
    if (ejendomID) {
      document.querySelector("#createEjendomSelect").value = ejendomID;
    }
  });
  showOverview();
  showStep(0);
}

function showOverview() {
  document.querySelector("#overviewSection").classList.remove("hidden");
  document.querySelector("#createCaseSection").classList.add("hidden");
  document.querySelector("#formSection").classList.add("hidden");
  document.querySelector("#showCreateCaseButton").classList.remove("hidden");
  loadInvestmentCases();
}

function showCreateCase() {
  document.querySelector("#overviewSection").classList.add("hidden");
  document.querySelector("#createCaseSection").classList.remove("hidden");
  document.querySelector("#formSection").classList.add("hidden");
  document.querySelector("#showCreateCaseButton").classList.add("hidden");
  document.querySelector("#createCaseError").textContent = "";
}

function showForm() {
  document.querySelector("#overviewSection").classList.add("hidden");
  document.querySelector("#createCaseSection").classList.add("hidden");
  document.querySelector("#formSection").classList.remove("hidden");
  document.querySelector("#showCreateCaseButton").classList.add("hidden");
  showStep(0);
}

function startNewCase() {
  const fields = document.querySelector("#createCaseSection").querySelectorAll("input, select, textarea");

  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return;
    }
  }

  const navn = document.querySelector("#createCaseName").value.trim();
  const beskrivelse = document.querySelector("#createCaseDescription").value.trim();
  const ejendomID = document.querySelector("#createEjendomSelect").value;

  currentCaseID = null;
  resetInvestmentForm();
  const form = document.querySelector("#investmentCaseForm");
  form.navn.value = navn;
  form.beskrivelse.value = beskrivelse;
  if (ejendomID) {
    form.ejendomID.value = ejendomID;
  }
  showForm();
}

function addPurchaseRow(name, amount, fast) {
  const row = createMoneyRow("purchase-row", name, amount, !fast, 0);

  if (fast) {
    row.querySelector(".row-name").readOnly = true;
    row.querySelector("button").classList.add("hidden");
  }

  document.querySelector("#purchaseRows").appendChild(row);
}

function resetInvestmentForm() {
  const form = document.querySelector("#investmentCaseForm");
  form.reset();
  currentStep = 0;
  simulationResult = null;

  document.querySelector("#purchaseRows").innerHTML = "";
  document.querySelector("#renovationRows").innerHTML = "";
  document.querySelector("#operationRows").innerHTML = "";
  document.querySelector("#rentalCostRows").innerHTML = "";
  document.querySelector("#renovationActive").value = "";
  document.querySelector("#rentalActive").value = "";
  document.querySelector("#renovationFields").classList.add("hidden");
  document.querySelector("#rentalFields").classList.add("hidden");

  addPurchaseRow("Ejendomspris", "", true);
  addPurchaseRow("Omkostninger ved køb", "", true);
  addPurchaseRow("Udgifter til advokat", "", true);
  addPurchaseRow("Tinglysning", "", true);
  addPurchaseRow("Køberrådgivning", "", true);
  addOperationRow("Ejendomsskat/fællesudgifter", "", "maanedligt");
  clearMessage();
}

async function openExistingCase(caseID) {
  const response = await fetch(`/api/investeringscases/${caseID}`);
  const caseData = await response.json();

  if (!response.ok) {
    showError(caseData.message || "Casen kunne ikke hentes.");
    return;
  }

  currentCaseID = caseID;
  fillInvestmentForm(caseData);
  showForm();
  return caseData;
}

function fillInvestmentForm(caseData) {
  resetInvestmentForm();
  const form = document.querySelector("#investmentCaseForm");
  const input = caseData.input || {};

  form.ejendomID.value = caseData.ejendomID || "";
  form.navn.value = caseData.navn || "";
  form.beskrivelse.value = caseData.beskrivelse || "";
  fillPurchaseRows(input.koebsposter || []);

  form.laanebeloeb.value = input.laanebeloeb || 0;
  form.egenbetaling.value = input.egenbetaling || 0;
  form.rente.value = input.rente || 0;
  form.loebetid.value = input.loebetid || 30;

  setRenovationActive(input.renoveringAktiv === true);
  if (input.renoveringAktiv) {
    document.querySelector("#renovationRows").innerHTML = "";
    (input.renoveringer || []).forEach((post) => addRenovationRow(post.navn, post.beloeb, post.tidspunktAar ?? ""));
  }

  document.querySelector("#operationRows").innerHTML = "";
  (input.driftsposter || []).forEach((post) => addOperationRow(post.navn, post.beloeb, post.periode || "maanedligt"));

  setRentalActive(input.udlejningAktiv === true);
  if (input.udlejningAktiv) {
    form.maanedligLeje.value = input.maanedligLeje || 0;
    document.querySelector("#rentalCostRows").innerHTML = "";
    (input.udlejningsudgifter || []).forEach((post) => addRentalCostRow(post.navn, post.beloeb, post.periode || "maanedligt"));
  }
}

function fillPurchaseRows(posts) {
  const fastePoster = [
    "Ejendomspris",
    "Omkostninger ved køb",
    "Udgifter til advokat",
    "Tinglysning",
    "Køberrådgivning"
  ];

  document.querySelector("#purchaseRows").innerHTML = "";
  fastePoster.forEach((navn) => {
    const post = posts.find((item) => item.navn === navn);
    addPurchaseRow(navn, post ? post.beloeb : 0, true);
  });

  posts
    .filter((post) => !fastePoster.includes(post.navn))
    .forEach((post) => addPurchaseRow(post.navn, post.beloeb, false));
}

function addRenovationRow(name, amount, year) {
  const row = createMoneyRow("renovation-row", name, amount, true, 1);
  const timeInput = document.createElement("input");
  timeInput.className = "row-time";
  timeInput.type = "number";
  timeInput.min = "0";
  timeInput.step = "1";
  timeInput.required = true;
  timeInput.placeholder = "År, fx 1";
  timeInput.addEventListener("input", () => { timeInput.value = timeInput.value.replace(/[^0-9]/g, ""); });
  timeInput.value = year;
  row.insertBefore(timeInput, row.querySelector("button"));
  document.querySelector("#renovationRows").appendChild(row);
}

function addOperationRow(name, amount, period) {
  const row = createMoneyRow("operation-row", name, amount, true, 1);
  row.insertBefore(createPeriodSelect(period), row.querySelector("button"));
  document.querySelector("#operationRows").appendChild(row);
}

function addRentalCostRow(name, amount, period) {
  const row = createMoneyRow("rental-cost-row", name, amount, true, 1);
  row.insertBefore(createPeriodSelect(period), row.querySelector("button"));
  document.querySelector("#rentalCostRows").appendChild(row);
}

function createMoneyRow(className, name, amount, canRemove, minAmount = 0) {
  const row = document.createElement("div");
  row.className = `simple-row ${className}`;

  const nameInput = document.createElement("input");
  nameInput.className = "row-name";
  nameInput.type = "text";
  nameInput.placeholder = "Navn";
  nameInput.required = true;
  nameInput.value = name;

  const amountInput = document.createElement("input");
  amountInput.className = "row-amount kroner-input";
  amountInput.type = "number";
  amountInput.required = true;
  amountInput.min = String(minAmount);
  amountInput.step = "0.01";
  amountInput.placeholder = "Beløb i kr.";
  amountInput.value = amount;
  aktiverKronerFelt(amountInput);

  const removeButton = document.createElement("button");
  removeButton.className = "sekundaer-knap";
  removeButton.type = "button";
  removeButton.textContent = "Fjern";
  removeButton.disabled = !canRemove;
  removeButton.addEventListener("click", () => row.remove());

  row.appendChild(nameInput);
  row.appendChild(amountInput);
  row.appendChild(removeButton);
  return row;
}

function createPeriodSelect(period) {
  const select = document.createElement("select");
  select.className = "row-period";
  select.innerHTML = `
    <option value="maanedligt">Månedligt</option>
    <option value="aarligt">Årligt</option>
  `;
  select.value = period;
  return select;
}

function setRenovationActive(isActive) {
  document.querySelector("#renovationActive").value = isActive ? "ja" : "nej";
  document.querySelector("#renovationFields").classList.toggle("hidden", !isActive);
  document.querySelectorAll("#renovationFields input, #renovationFields select, #renovationFields textarea")
    .forEach((field) => {
      field.disabled = !isActive;
    });

  if (isActive && document.querySelectorAll(".renovation-row").length === 0) {
    addRenovationRow("Renovering", "", "");
  }
}

function setRentalActive(isActive) {
  document.querySelector("#rentalActive").value = isActive ? "ja" : "nej";
  document.querySelector("#rentalFields").classList.toggle("hidden", !isActive);
  document.querySelectorAll("#rentalFields input, #rentalFields select, #rentalFields textarea")
    .forEach((field) => {
      field.disabled = !isActive;
    });

  if (isActive && document.querySelectorAll(".rental-cost-row").length === 0) {
    addRentalCostRow("Administration", "", "maanedligt");
  }
}

function showStep(step) {
  const steps = document.querySelectorAll(".form-step");
  const indicators = document.querySelectorAll("#stepIndicator li");

  currentStep = step;
  simulationResult = currentStep === steps.length - 1 ? simulationResult : null;

  steps.forEach((section, index) => {
    section.classList.toggle("hidden", index !== currentStep);
    section.querySelectorAll("input:not([type='hidden']), select, textarea").forEach((field) => {
      const inRenovationFields = field.closest("#renovationFields");
      const inRentalFields = field.closest("#rentalFields");
      const disabledByChoice =
        (inRenovationFields && document.querySelector("#renovationActive").value !== "ja") ||
        (inRentalFields && document.querySelector("#rentalActive").value !== "ja");

      field.disabled = index !== currentStep || disabledByChoice;
    });
  });

  indicators.forEach((item, index) => {
    item.classList.toggle("active", index === currentStep);
    item.classList.toggle("done", index < currentStep);
  });

  document.querySelector("#previousStepButton").disabled = currentStep === 0;
  document.querySelector("#nextStepButton").classList.toggle("hidden", currentStep === steps.length - 1);
  document.querySelector("#saveCaseButton").classList.toggle("hidden", currentStep !== steps.length - 1);
  clearMessage();

  if (currentStep === steps.length - 1) {
    renderOverview(collectFormData());
    document.querySelector("#resultGrid").innerHTML = "";
    if (investmentChart) {
      investmentChart.destroy();
      investmentChart = null;
      document.querySelector("#investmentChart").style.display = "none";
    }
  }

  if (currentStep === 1) {
    updatePurchaseTotalText();
  }
}

function nextStep() {
  if (!validateCurrentStep()) {
    return;
  }
  showStep(Math.min(currentStep + 1, document.querySelectorAll(".form-step").length - 1));
}

function previousStep() {
  if (!validateCurrentStep()) {
    return;
  }
  showStep(Math.max(currentStep - 1, 0));
}

function collectFormData() {
  const form = document.querySelector("#investmentCaseForm");
  const data = {
    ejendomID: form.ejendomID.value,
    navn: form.navn.value.trim(),
    beskrivelse: form.beskrivelse.value.trim(),
    koebsposter: collectRows(".purchase-row"),
    renoveringAktiv: form.renoveringAktiv.value === "ja",
    renoveringer: form.renoveringAktiv.value === "ja" ? collectRows(".renovation-row", true) : [],
    laanebeloeb: talFraKroner(form.laanebeloeb.value),
    egenbetaling: talFraKroner(form.egenbetaling.value),
    rente: Number(form.rente.value),
    loebetid: Number(form.loebetid.value),
    driftsposter: collectRows(".operation-row", false, true),
    udlejningAktiv: form.udlejningAktiv.value === "ja",
    maanedligLeje: form.udlejningAktiv.value === "ja" ? talFraKroner(form.maanedligLeje.value) : 0,
    tomgangDage: 0,
    udlejningsudgifter: form.udlejningAktiv.value === "ja" ? collectRows(".rental-cost-row", false, true) : [],
    vaekstProcent: 2,
    periodeAar: 30
  };

  return data;
}

function collectRows(selector, includeTime = false, includePeriod = false) {
  return Array.from(document.querySelectorAll(selector))
    .map((row) => ({
      navn: row.querySelector(".row-name").value.trim(),
      beloeb: talFraKroner(row.querySelector(".row-amount").value),
      tidspunktAar: includeTime && row.querySelector(".row-time").value !== "" ? Number(row.querySelector(".row-time").value) : null,
      periode: includePeriod ? row.querySelector(".row-period").value : "engang"
    }))
    .filter((post) => post.navn || post.beloeb > 0);
}

function validateCurrentStep() {
  const section = document.querySelector(`.form-step[data-step="${currentStep}"]`);
  const fields = section.querySelectorAll("input:not([type='hidden']), select, textarea");
  const egenbetaling = document.querySelector("[name='egenbetaling']");

  if (egenbetaling) {
    egenbetaling.setCustomValidity("");
  }

  if (currentStep === 1 && !loanMatchesPrice()) {
    egenbetaling.setCustomValidity("Lånebeløb + egenbetaling skal være lig med samlede købs- og omkostningsposter.");
  }

  if (currentStep === 2 && document.querySelector("#renovationActive").value === "") {
    showError("Vælg om der er renovering (Ja eller Nej).");
    return false;
  }

  if (currentStep === 2 && document.querySelector("#renovationActive").value === "ja" && document.querySelectorAll(".renovation-row").length === 0) {
    showError("Tilføj mindst én renovering.");
    return false;
  }

  if (currentStep === 4 && document.querySelector("#rentalActive").value === "") {
    showError("Vælg om der er udlejning (Ja eller Nej).");
    return false;
  }

  for (const field of fields) {
    if (field.closest(".hidden") || field.disabled) {
      continue;
    }

    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }

  clearMessage();
  return true;
}

function validateAllSteps() {
  const originalStep = currentStep;
  const steps = document.querySelectorAll(".form-step");

  for (let step = 0; step < steps.length; step += 1) {
    showStep(step);

    if (!validateCurrentStep()) {
      return false;
    }
  }

  showStep(originalStep);
  return true;
}

function loanMatchesPrice() {
  const input = collectFormData();
  const samletKoebssum = sumPosts(input.koebsposter);
  const totalFinansiering = input.laanebeloeb + input.egenbetaling;
  return Math.round(totalFinansiering) === Math.round(samletKoebssum);
}

async function runSimulation() {
  const input = collectFormData();

  try {
    showStatus("Kører simulering...");

    const response = await fetch("/api/investeringscases/beregn", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : null;

    if (!response.ok) {
      showError(data?.message || "Simuleringen kunne ikke køres. Genstart backend-serveren og prøv igen.");
      return;
    }

    simulationResult = data.resultat;
    renderChart(simulationResult);
    renderResult(simulationResult);
    showStatus("Simuleringen er kørt.");
  } catch (error) {
    console.error("Fejl ved simulering:", error);
    showError("Serverfejl ved simulering.");
  }
}

// Gør backendens 30-årsserie klar til Chart.js.
// Returnerer arrays klar til Chart.js datasets.
function buildTimeSeriesData(result) {
  const noegletal = result.noegletalOverTid || [];
  const labels = noegletal.map((punkt) => punkt.aar);
  const cashflowData = noegletal.map((punkt) => Math.round(punkt.akkumuleretCashflow));
  const gaeldData = noegletal.map((punkt) => Math.round(punkt.restgaeld));
  const egenkapitalData = noegletal.map((punkt) => Math.round(punkt.egenkapitalIEjendom));

  return { labels, cashflowData, gaeldData, egenkapitalData };
}

// Opretter eller genopretter Chart.js-diagrammet på #investmentChart.
// Destroy kaldes først så canvas ikke akkumulerer flere instanser.
function renderChart(result) {
  const canvas = document.querySelector("#investmentChart");
  const { labels, cashflowData, gaeldData, egenkapitalData } = buildTimeSeriesData(result);

  if (investmentChart) {
    investmentChart.destroy();
  }

  canvas.style.display = "block";

  investmentChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Akkumuleret cashflow",
          data: cashflowData,
          borderColor: "#2ecc71",
          backgroundColor: "transparent",
          tension: 0.1
        },
        {
          label: "Restgæld",
          data: gaeldData,
          borderColor: "#e74c3c",
          backgroundColor: "transparent",
          tension: 0.1
        },
        {
          label: "Egenkapital",
          data: egenkapitalData,
          borderColor: "#3498db",
          backgroundColor: "transparent",
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        tooltip: {
          // Formatér tooltip-værdier som kr. via den eksisterende moneyFormatter
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${moneyFormatter.format(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: { title: { display: true, text: "År" } },
        y: {
          title: { display: true, text: "kr." },
          ticks: { callback: (v) => moneyFormatter.format(v) }
        }
      }
    }
  });
}

function renderOverview(input) {
  const overview = document.querySelector("#inputOverview");

  overview.innerHTML = `
    <h3>Det brugeren har indtastet</h3>
    <p><strong>Køb:</strong> ${kroner(sumPosts(input.koebsposter))}</p>
    <p><strong>Lån:</strong> ${kroner(input.laanebeloeb)} og egenbetaling ${kroner(input.egenbetaling)}</p>
    <p><strong>Renovering:</strong> ${kroner(sumPosts(input.renoveringer))}</p>
    <p><strong>Driftsposter:</strong> ${input.driftsposter.length}</p>
    <p><strong>Udlejning:</strong> ${input.udlejningAktiv ? `${kroner(input.maanedligLeje)} pr. måned` : "Nej"}</p>
  `;
}

function updatePurchaseTotalText() {
  document.querySelector("#purchaseTotalText").textContent = kroner(sumPosts(collectFormData().koebsposter));
}

function renderResult(result) {
  const grid = document.querySelector("#resultGrid");

  grid.innerHTML = `
    ${resultCard("Månedlig lejeindtægt", kroner(result.maanedligIndtaegt))}
    ${resultCard("Månedlige udgifter", kroner(result.maanedligeUdgifter))}
    ${resultCard("Månedlig låneydelse", kroner(result.maanedligYdelse))}
    ${resultCard("Total renteomkostning", kroner(result.totalRenteomkostning))}
    ${resultCard("Månedligt cashflow", kroner(result.maanedligtCashflow))}
    ${resultCard("Årligt cashflow", kroner(result.aarligtCashflow))}
    ${resultCard("Startinvestering", kroner(result.startInvestering))}
    ${resultCard("Værdi efter periode", kroner(result.estimeretVaerdiEfterPeriode))}
    ${resultCard("Samlet resultat", kroner(result.samletResultat))}
  `;
}

function resultCard(label, value, klasse = "") {
  return `
    <article class="result-card">
      <span>${label}</span>
      <strong${klasse ? ` class="${klasse}"` : ""}>${value}</strong>
    </article>
  `;
}

async function saveInvestmentCase(event) {
  event.preventDefault();

  if (!validateAllSteps()) {
    return;
  }

  try {
    showStatus("Gemmer case...");

    const url = currentCaseID ? `/api/investeringscases/${currentCaseID}` : "/api/investeringscases";
    const response = await fetch(url, {
      method: currentCaseID ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(collectFormData())
    });
    const data = await response.json();

    if (!response.ok) {
      showError(data.message || "Casen kunne ikke gemmes.");
      return;
    }

    currentCaseID = data.caseID || currentCaseID;
    showOverview();
  } catch (error) {
    console.error("Fejl ved gem af investeringscase:", error);
    showError("Serverfejl ved gem af case.");
  }
}

async function loadProperties() {
  const selects = [
    document.querySelector("#createEjendomSelect"),
    document.querySelector("#ejendomSelect")
  ].filter(Boolean);

  try {
    const response = await fetch("/api/ejendomme");
    const properties = await response.json();

    if (!response.ok) {
      showError("Ejendomsprofiler kunne ikke hentes.");
      return;
    }

    selects.forEach((select) => {
      properties.forEach((property) => {
        const option = document.createElement("option");
        option.value = property.id;
        option.textContent = property.adresse;
        select.appendChild(option);
      });
    });
  } catch (error) {
    console.error("Fejl ved hentning af ejendomsprofiler:", error);
    showError("Serverfejl ved hentning af ejendomsprofiler.");
  }
}

async function loadInvestmentCases() {
  const grid = document.querySelector("#casesGrid");

  if (!grid) {
    return;
  }

  grid.innerHTML = "<p>Henter cases...</p>";

  try {
    const response = await fetch("/api/investeringscases");
    const cases = await response.json();

    if (!response.ok) {
      grid.innerHTML = `<p>${cases.message || "Cases kunne ikke hentes."}</p>`;
      comparisonCases = [];
      return;
    }

    comparisonCases = cases;

    if (cases.length === 0) {
      grid.innerHTML = "<p>Der er endnu ikke gemt nogen investeringscases.</p>";
      return;
    }

    grid.innerHTML = "";
    cases.forEach((caseData) => {
      const card = document.createElement("article");
      card.className = "case-card";
      card.innerHTML = `
        <div class="case-card-top">
          <div>
            <h3>${escapeHtml(caseData.navn)}</h3>
            <p>${escapeHtml(caseData.adresse || "Ingen adresse")}</p>
            <p>${caseData.oprettetTidspunkt ? new Date(caseData.oprettetTidspunkt).toLocaleDateString("da-DK") : ""}</p>
          </div>
          <div class="case-card-actions">
            <button class="sekundaer-knap rediger-case-knap" type="button">Rediger</button>
            <button class="sekundaer-knap resultat-case-knap" type="button">Resultat</button>
            <button class="sekundaer-knap dupliker-case-knap" type="button">Duplikér</button>
            <button class="sekundaer-knap slet-case-knap" type="button">Slet</button>
          </div>
        </div>
        <dl class="case-card-numbers">
          <div><dt>Månedligt cashflow</dt><dd class="${cashflowKlasse(caseData.resultat.maanedligtCashflow)}">${kroner(caseData.resultat.maanedligtCashflow)}</dd></div>
          <div><dt>Startinvestering</dt><dd>${kroner(caseData.resultat.startInvestering)}</dd></div>
          <div><dt>Værdi efter 30 år</dt><dd>${kroner(caseData.resultat.estimeretVaerdiEfterPeriode)}</dd></div>
        </dl>
        <div class="case-card-bottom">
          <label class="case-compare-choice">
            <input class="case-compare-checkbox" type="checkbox" value="${caseData.caseID}">
            Sammenlign
          </label>
        </div>
      `;

      const compareCheckbox = card.querySelector(".case-compare-checkbox");
      compareCheckbox.addEventListener("change", opdaterSammenlignKnap);

      card.querySelector(".rediger-case-knap").addEventListener("click", async () => {
        await openExistingCase(caseData.caseID);
      });

      card.querySelector(".resultat-case-knap").addEventListener("click", async () => {
        const hentetCase = await openExistingCase(caseData.caseID);
        if (!hentetCase) {
          return;
        }

        showStep(5);
        if (hentetCase?.resultat) {
          simulationResult = hentetCase.resultat;
          renderChart(simulationResult);
          renderResult(simulationResult);
        }
      });

      card.querySelector(".dupliker-case-knap").addEventListener("click", () => duplicateInvestmentCase(caseData.caseID));

      card.querySelector(".slet-case-knap").addEventListener("click", async () => {
        await deleteInvestmentCase(caseData.caseID);
      });

      grid.appendChild(card);
    });
  } catch (error) {
    console.error("Fejl ved hentning af investeringscases:", error);
    grid.innerHTML = "<p>Serverfejl ved hentning af cases.</p>";
    comparisonCases = [];
  }
}

function opdaterSammenlignKnap() {
  const antalValgt = document.querySelectorAll(".case-compare-checkbox:checked").length;
  const knap = document.querySelector("#sammenlignButton");
  if (knap) {
    knap.disabled = antalValgt < 2;
  }
}

function renderComparisonTable() {
  const container = document.querySelector("#comparisonTableContainer");
  if (!container) return;

  const selectedIDs = Array.from(document.querySelectorAll(".case-compare-checkbox:checked"))
    .map((checkbox) => checkbox.value);
  const selectedCases = comparisonCases.filter((caseData) => selectedIDs.includes(String(caseData.caseID)));

  container.innerHTML = `
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Case-navn</th>
          <th>Ejendom/adresse</th>
          <th>Ejendomspris</th>
          <th>Månedligt cashflow</th>
          <th>Årligt cashflow</th>
          <th>Gæld efter 30 år</th>
          <th>Egenkapital efter 30 år</th>
        </tr>
      </thead>
      <tbody>
        ${selectedCases.map(comparisonRow).join("")}
      </tbody>
    </table>
  `;

  document.querySelector("#sammenlignModal").classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#sammenlignButton")?.addEventListener("click", renderComparisonTable);
  document.querySelector("#lukModalButton")?.addEventListener("click", () => {
    document.querySelector("#sammenlignModal").classList.add("hidden");
  });
  document.querySelector("#sammenlignModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add("hidden");
    }
  });
});

function comparisonRow(caseData) {
  const result = caseData.resultat || {};
  const lastYear = Array.isArray(result.noegletalOverTid) && result.noegletalOverTid.length > 0
    ? result.noegletalOverTid[result.noegletalOverTid.length - 1]
    : {};

  return `
    <tr>
      <td>${escapeHtml(caseData.navn || "-")}</td>
      <td>${escapeHtml(caseData.adresse || "-")}</td>
      <td>${formatComparisonMoney(result.koebspris ?? result.ejendomspris)}</td>
      <td>${formatComparisonMoney(result.maanedligtCashflow)}</td>
      <td>${formatComparisonMoney(result.aarligtCashflow)}</td>
      <td>${formatComparisonMoney(lastYear.restgaeld ?? lastYear.gaeld)}</td>
      <td>${formatComparisonMoney(lastYear.egenkapitalIEjendom)}</td>
    </tr>
  `;
}

function formatComparisonMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? kroner(number) : "Ikke beregnet";
}

async function duplicateInvestmentCase(caseID) {
  showCasesOverviewMessage("Duplikerer case...");

  try {
    const response = await fetch(`/api/investeringscases/${caseID}/duplicate`, {
      method: "POST"
    });
    const data = await response.json();

    if (!response.ok) {
      showCasesOverviewMessage(data.message || "Casen kunne ikke duplikeres.", true);
      return;
    }

    await loadInvestmentCases();
    showCasesOverviewMessage(data.message || "Casen er duplikeret.");
  } catch (error) {
    console.error("Fejl ved duplikering af investeringscase:", error);
    showCasesOverviewMessage("Serverfejl ved duplikering af case.", true);
  }
}

async function deleteInvestmentCase(caseID) {
  if (!confirm("Vil du slette denne investeringscase?")) {
    return;
  }

  const response = await fetch(`/api/investeringscases/${caseID}`, {
    method: "DELETE"
  });
  const data = await response.json();

  if (!response.ok) {
    showError(data.message || "Casen kunne ikke slettes.");
    return;
  }

  showStatus("Casen er slettet.");
  await loadInvestmentCases();
}

function sumPosts(posts) {
  return posts.reduce((sum, post) => sum + (Number(post.beloeb) || 0), 0);
}

function aktiverKronerFelt(input) {
  input.type = "text";
  input.inputMode = "numeric";

  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^0-9]/g, "");
  });

  input.addEventListener("blur", () => {
    const raw = input.value.replace(/\./g, "");
    if (raw !== "") {
      input.value = Number(raw).toLocaleString("da-DK");
    }
  });

  input.addEventListener("focus", () => {
    input.value = input.value.replace(/\./g, "");
  });
}

function showError(message) {
  document.querySelector("#caseFormError").textContent = message;
  document.querySelector("#caseFormStatus").textContent = "";
}

function showStatus(message) {
  document.querySelector("#caseFormStatus").textContent = message;
  document.querySelector("#caseFormError").textContent = "";
}

function clearMessage() {
  document.querySelector("#caseFormError").textContent = "";
  document.querySelector("#caseFormStatus").textContent = "";
}

function showCasesOverviewMessage(message, isError = false) {
  const status = document.querySelector("#casesOverviewStatus");

  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.toggle("case-form-fejl", isError);
  status.classList.toggle("case-form-status", !isError);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
