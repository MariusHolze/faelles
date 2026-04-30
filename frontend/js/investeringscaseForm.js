let currentStep = 0;
let simulationResult = null;
let currentCaseID = null;

const moneyFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 0
});

function kroner(value) {
  return moneyFormatter.format(Number(value) || 0);
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

  document.querySelector("#addPurchaseRowButton").addEventListener("click", () => addPurchaseRow("", 0, false));
  document.querySelector("#addRenovationRowButton").addEventListener("click", () => addRenovationRow("", 0, ""));
  document.querySelector("#addOperationRowButton").addEventListener("click", () => addOperationRow("", 0, "maanedligt"));
  document.querySelector("#addRentalCostRowButton").addEventListener("click", () => addRentalCostRow("", 0, "maanedligt"));
  document.querySelector("#renovationYesButton").addEventListener("click", () => setRenovationActive(true));
  document.querySelector("#renovationNoButton").addEventListener("click", () => setRenovationActive(false));
  document.querySelector("#rentalYesButton").addEventListener("click", () => setRentalActive(true));
  document.querySelector("#rentalNoButton").addEventListener("click", () => setRentalActive(false));
  document.querySelectorAll(".kroner-input").forEach(aktiverKronerFelt);

  addPurchaseRow("Ejendomspris", 0, true);
  addPurchaseRow("Omkostninger ved køb", 0, true);
  addPurchaseRow("Udgifter til advokat", 0, true);
  addPurchaseRow("Tinglysning", 0, true);
  addPurchaseRow("Køberrådgivning", 0, true);
  addOperationRow("Ejendomsskat/fællesudgifter", 0, "maanedligt");

  loadProperties();
  showOverview();
  showStep(0);
}

function showOverview() {
  document.querySelector("#overviewSection").classList.remove("hidden");
  document.querySelector("#createCaseSection").classList.add("hidden");
  document.querySelector("#formSection").classList.add("hidden");
  loadInvestmentCases();
}

function showCreateCase() {
  document.querySelector("#overviewSection").classList.add("hidden");
  document.querySelector("#createCaseSection").classList.remove("hidden");
  document.querySelector("#formSection").classList.add("hidden");
  document.querySelector("#createCaseError").textContent = "";
  document.querySelector("#createEjendomSelect").value = "";
}

function showForm() {
  document.querySelector("#overviewSection").classList.add("hidden");
  document.querySelector("#createCaseSection").classList.add("hidden");
  document.querySelector("#formSection").classList.remove("hidden");
  showStep(0);
}

function startNewCase() {
  const ejendomID = document.querySelector("#createEjendomSelect").value;
  const navn = document.querySelector("#createCaseName").value.trim();
  const beskrivelse = document.querySelector("#createCaseDescription").value.trim();

  if (!ejendomID || !navn) {
    document.querySelector("#createCaseError").textContent = "Vælg ejendom og skriv casenavn.";
    return;
  }

  currentCaseID = null;
  resetInvestmentForm();
  const form = document.querySelector("#investmentCaseForm");
  form.ejendomID.value = ejendomID;
  form.navn.value = navn;
  form.beskrivelse.value = beskrivelse;
  showForm();
}

function addPurchaseRow(name, amount, fast) {
  const row = createMoneyRow("purchase-row", name, amount, !fast);

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
  document.querySelector("#renovationActive").value = "nej";
  document.querySelector("#rentalActive").value = "nej";
  document.querySelector("#renovationFields").classList.add("hidden");
  document.querySelector("#rentalFields").classList.add("hidden");

  addPurchaseRow("Ejendomspris", 0, true);
  addPurchaseRow("Omkostninger ved køb", 0, true);
  addPurchaseRow("Udgifter til advokat", 0, true);
  addPurchaseRow("Tinglysning", 0, true);
  addPurchaseRow("Køberrådgivning", 0, true);
  addOperationRow("Ejendomsskat/fællesudgifter", 0, "maanedligt");
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
}

function fillInvestmentForm(caseData) {
  resetInvestmentForm();
  const form = document.querySelector("#investmentCaseForm");
  const input = caseData.input || {};

  form.ejendomID.value = caseData.ejendomID || "";
  form.navn.value = caseData.navn || "";
  form.beskrivelse.value = caseData.beskrivelse || "";
  fillPurchaseRows(input.koebsposter || []);

  form.laanebeloeb.value = kroner(input.laanebeloeb || 0);
  form.egenbetaling.value = kroner(input.egenbetaling || 0);
  form.rente.value = input.rente || 0;
  form.loebetid.value = input.loebetid || 30;

  if (input.renoveringAktiv) {
    setRenovationActive(true);
    document.querySelector("#renovationRows").innerHTML = "";
    (input.renoveringer || []).forEach((post) => addRenovationRow(post.navn, post.beloeb, post.tidspunkt || ""));
  }

  document.querySelector("#operationRows").innerHTML = "";
  (input.driftsposter || []).forEach((post) => addOperationRow(post.navn, post.beloeb, post.periode || "maanedligt"));

  if (input.udlejningAktiv) {
    setRentalActive(true);
    form.maanedligLeje.value = kroner(input.maanedligLeje || 0);
    form.tomgangDage.value = input.tomgangDage || 0;
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

function addRenovationRow(name, amount, time) {
  const row = createMoneyRow("renovation-row", name, amount, true);
  const timeInput = document.createElement("input");
  timeInput.className = "row-time";
  timeInput.type = "text";
  timeInput.placeholder = "Tidspunkt, fx måned 6";
  timeInput.value = time;
  row.insertBefore(timeInput, row.querySelector("button"));
  document.querySelector("#renovationRows").appendChild(row);
}

function addOperationRow(name, amount, period) {
  const row = createMoneyRow("operation-row", name, amount, true);
  row.insertBefore(createPeriodSelect(period), row.querySelector("button"));
  document.querySelector("#operationRows").appendChild(row);
}

function addRentalCostRow(name, amount, period) {
  const row = createMoneyRow("rental-cost-row", name, amount, true);
  row.insertBefore(createPeriodSelect(period), row.querySelector("button"));
  document.querySelector("#rentalCostRows").appendChild(row);
}

function createMoneyRow(className, name, amount, canRemove) {
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
  amountInput.type = "text";
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

  if (isActive && document.querySelectorAll(".renovation-row").length === 0) {
    addRenovationRow("Renovering", 0, "");
  }
}

function setRentalActive(isActive) {
  document.querySelector("#rentalActive").value = isActive ? "ja" : "nej";
  document.querySelector("#rentalFields").classList.toggle("hidden", !isActive);

  if (isActive && document.querySelectorAll(".rental-cost-row").length === 0) {
    addRentalCostRow("Administration", 0, "maanedligt");
  }
}

function showStep(step) {
  const steps = document.querySelectorAll(".form-step");
  const indicators = document.querySelectorAll("#stepIndicator li");

  currentStep = step;
  simulationResult = currentStep === steps.length - 1 ? simulationResult : null;

  steps.forEach((section, index) => {
    section.classList.toggle("hidden", index !== currentStep);
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
    tomgangDage: form.udlejningAktiv.value === "ja" ? Number(form.tomgangDage.value) : 0,
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
      tidspunkt: includeTime ? row.querySelector(".row-time").value.trim() : "",
      periode: includePeriod ? row.querySelector(".row-period").value : "engang"
    }))
    .filter((post) => post.navn || post.beloeb > 0);
}

function validateCurrentStep() {
  const section = document.querySelector(`.form-step[data-step="${currentStep}"]`);
  const fields = section.querySelectorAll("input:not([type='hidden']), select, textarea");

  for (const field of fields) {
    if (field.classList.contains("kroner-input") && field.value.includes(",")) {
      showError("Brug hele tal uden komma.");
      return false;
    }

    if (!field.checkValidity()) {
      field.reportValidity();
      showError("Udfyld de markerede felter, før du går videre.");
      return false;
    }
  }

  const input = collectFormData();
  const ejendomspris = getPostTotal(input.koebsposter, "Ejendomspris");

  if (currentStep === 0 && ejendomspris <= 0) {
    showError("Ejendomspris skal udfyldes og være større end 0");
    return false;
  }

  if (currentStep === 1 && !loanMatchesPrice()) {
    showError("Lånebeløb + egenbetaling skal være lig med samlede købs- og omkostningsposter.");
    return false;
  }

  if (currentStep === 2 && input.renoveringAktiv) {
    for (const row of document.querySelectorAll(".renovation-row")) {
      const navn = row.querySelector(".row-name").value.trim();
      const beloeb = talFraKroner(row.querySelector(".row-amount").value);

      if (!navn || beloeb <= 0) {
        showError("Alle renoveringsfelter skal udfyldes");
        return false;
      }
    }
  }

  if (currentStep === 3) {
    for (const row of document.querySelectorAll(".operation-row")) {
      const navn = row.querySelector(".row-name").value.trim();
      const beloeb = talFraKroner(row.querySelector(".row-amount").value);

      if (!navn || beloeb <= 0) {
        showError("Alle driftsfelter skal udfyldes");
        return false;
      }
    }
  }

  if (currentStep === 4 && input.udlejningAktiv) {
    if (input.maanedligLeje <= 0) {
      showError("Udlejningsfelter skal udfyldes");
      return false;
    }

    for (const row of document.querySelectorAll(".rental-cost-row")) {
      const navn = row.querySelector(".row-name").value.trim();
      const beloeb = talFraKroner(row.querySelector(".row-amount").value);

      if (!navn || beloeb <= 0) {
        showError("Udlejningsfelter skal udfyldes");
        return false;
      }
    }
  }

  clearMessage();
  return true;
}

function loanMatchesPrice() {
  const input = collectFormData();
  const samletKoebssum = sumPosts(input.koebsposter);
  const totalFinansiering = input.laanebeloeb + input.egenbetaling;
  return Math.round(totalFinansiering) === Math.round(samletKoebssum);
}

function runSimulation() {
  const input = collectFormData();
  simulationResult = calculateInvestmentCase(input);
  renderResult(simulationResult);
  showStatus("Simuleringen er kørt. Du kan nu gemme casen.");
}

function calculateInvestmentCase(input) {
  const koebspris = getPostTotal(input.koebsposter, "Ejendomspris");
  const koebsomkostninger = sumPosts(input.koebsposter) - koebspris;
  const renoveringIAlt = sumPosts(input.renoveringer);
  const startInvestering = koebspris + koebsomkostninger + renoveringIAlt;
  const maanedligRente = (input.rente / 100) / 12;
  const antalMaaneder = input.loebetid * 12;
  let maanedligYdelse = 0;

  if (input.laanebeloeb > 0 && antalMaaneder > 0) {
    maanedligYdelse = maanedligRente === 0
      ? input.laanebeloeb / antalMaaneder
      : input.laanebeloeb * (maanedligRente / (1 - Math.pow(1 + maanedligRente, -antalMaaneder)));
  }

  // Simpel model: alle månedlige beløb samles og påvirker cashflowet.
  const driftMaanedligt = monthlyTotal(input.driftsposter);
  const lejeAarligt = input.maanedligLeje * 12;
  const tomgangBeloeb = lejeAarligt * (input.tomgangDage / 365);
  const lejeIndtaegtMaanedligt = (lejeAarligt - tomgangBeloeb) / 12;
  const lejeUdgifterMaanedligt = monthlyTotal(input.udlejningsudgifter);
  const maanedligeUdgifter = driftMaanedligt + lejeUdgifterMaanedligt + maanedligYdelse;
  const maanedligtCashflow = lejeIndtaegtMaanedligt - maanedligeUdgifter;
  const aarligtCashflow = maanedligtCashflow * 12;
  const totalRenteomkostning = Math.max(0, maanedligYdelse * antalMaaneder - input.laanebeloeb);
  const estimeretVaerdiEfterPeriode = koebspris * Math.pow(1.02, 30);
  const samletResultat = (estimeretVaerdiEfterPeriode - koebspris) + (aarligtCashflow * input.periodeAar) - renoveringIAlt;

  return {
    koebspris,
    koebsomkostninger,
    renoveringIAlt,
    startInvestering,
    maanedligYdelse,
    totalRenteomkostning,
    maanedligIndtaegt: lejeIndtaegtMaanedligt,
    lejeUdgifterMaanedligt,
    driftMaanedligt,
    maanedligeUdgifter,
    maanedligtCashflow,
    aarligtCashflow,
    simpelROI: input.egenbetaling > 0 ? (aarligtCashflow / input.egenbetaling) * 100 : 0,
    estimeretVaerdiEfterPeriode,
    samletResultat
  };
}

function renderOverview(input) {
  const overview = document.querySelector("#inputOverview");

  overview.innerHTML = `
    <h3>Det brugeren har indtastet</h3>
    <p><strong>Køb:</strong> ${kroner(sumPosts(input.koebsposter))}</p>
    <p><strong>Lån:</strong> ${kroner(input.laanebeloeb)} og egenbetaling ${kroner(input.egenbetaling)}</p>
    <p><strong>Renovering:</strong> ${kroner(sumPosts(input.renoveringer))}</p>
    <p><strong>Drift pr. måned:</strong> ${kroner(monthlyTotal(input.driftsposter))}</p>
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
    ${resultCard("Simpel ROI", `${result.simpelROI.toFixed(1)} %`)}
    ${resultCard("Værdi efter periode", kroner(result.estimeretVaerdiEfterPeriode))}
    ${resultCard("Samlet resultat", kroner(result.samletResultat))}
  `;
}

function resultCard(label, value) {
  return `
    <article class="result-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `;
}

async function saveInvestmentCase(event) {
  event.preventDefault();

  if (!validateCurrentStep()) {
    return;
  }

  if (!simulationResult) {
    showError("Klik på Kør simulering, før du gemmer casen.");
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

    showStatus("Casen er gemt.");
    currentCaseID = data.caseID || currentCaseID;
    await loadInvestmentCases();
  } catch (error) {
    console.error("Fejl ved gem af investeringscase:", error);
    showError("Serverfejl ved gem af case.");
  }
}

async function loadProperties() {
  const select = document.querySelector("#ejendomSelect");
  const createSelect = document.querySelector("#createEjendomSelect");

  try {
    const response = await fetch("/api/ejendomme");
    const properties = await response.json();

    if (!response.ok) {
      showError("Ejendomsprofiler kunne ikke hentes.");
      return;
    }

    properties.forEach((property) => {
      const option = document.createElement("option");
      option.value = property.id;
      option.textContent = property.adresse;
      select.appendChild(option);

      const createOption = document.createElement("option");
      createOption.value = property.id;
      createOption.textContent = property.adresse;
      createSelect.appendChild(createOption);
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
      return;
    }

    if (cases.length === 0) {
      grid.innerHTML = "<p>Der er endnu ikke gemt nogen investeringscases.</p>";
      return;
    }

    grid.innerHTML = "";
    cases.forEach((caseData) => {
      const card = document.createElement("article");
      card.className = "case-card";
      card.innerHTML = `
        <h3>${escapeHtml(caseData.navn)}</h3>
        <p>${escapeHtml(caseData.adresse || "Ingen adresse")}</p>
        <p>${caseData.oprettetTidspunkt ? new Date(caseData.oprettetTidspunkt).toLocaleDateString("da-DK") : ""}</p>
        <dl class="case-card-numbers">
          <div><dt>Månedligt cashflow</dt><dd>${kroner(caseData.resultat.maanedligtCashflow)}</dd></div>
          <div><dt>Startinvestering</dt><dd>${kroner(caseData.resultat.startInvestering)}</dd></div>
          <div><dt>Værdi efter 30 år</dt><dd>${kroner(caseData.resultat.estimeretVaerdiEfterPeriode)}</dd></div>
        </dl>
        <button class="sekundaer-knap rediger-case-knap" type="button">Rediger</button>
        <button class="sekundaer-knap" type="button">Slet</button>
      `;

      card.querySelector(".rediger-case-knap").addEventListener("click", async () => {
        await openExistingCase(caseData.caseID);
      });

      card.querySelector("button:last-of-type").addEventListener("click", async () => {
        await deleteInvestmentCase(caseData.caseID);
      });

      grid.appendChild(card);
    });
  } catch (error) {
    console.error("Fejl ved hentning af investeringscases:", error);
    grid.innerHTML = "<p>Serverfejl ved hentning af cases.</p>";
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

function monthlyTotal(posts) {
  return posts.reduce((sum, post) => {
    const amount = Number(post.beloeb) || 0;
    return sum + (post.periode === "aarligt" ? amount / 12 : amount);
  }, 0);
}

function getPostTotal(posts, name) {
  return posts
    .filter((post) => post.navn.toLowerCase() === name.toLowerCase())
    .reduce((sum, post) => sum + (Number(post.beloeb) || 0), 0);
}

function aktiverKronerFelt(input) {
  input.addEventListener("focus", () => {
    input.value = talFraKroner(input.value) || "";
  });

  input.addEventListener("blur", () => {
    if (input.value.trim() !== "") {
      input.value = kroner(talFraKroner(input.value));
    }
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
