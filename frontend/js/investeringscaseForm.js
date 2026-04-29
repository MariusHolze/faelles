let currentStep = 0;
let simulationResult = null;

const moneyFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 0
});

function kroner(value) {
  return moneyFormatter.format(Number(value) || 0);
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
  form.addEventListener("submit", saveInvestmentCase);

  document.querySelector("#addPurchaseRowButton").addEventListener("click", () => addPurchaseRow("", 0, true));
  document.querySelector("#addRenovationRowButton").addEventListener("click", () => addRenovationRow("", 0, ""));
  document.querySelector("#addOperationRowButton").addEventListener("click", () => addOperationRow("", 0, "maanedligt"));
  document.querySelector("#addRentalCostRowButton").addEventListener("click", () => addRentalCostRow("", 0, "maanedligt"));
  document.querySelector("#renovationYesButton").addEventListener("click", () => setRenovationActive(true));
  document.querySelector("#renovationNoButton").addEventListener("click", () => setRenovationActive(false));
  document.querySelector("#rentalYesButton").addEventListener("click", () => setRentalActive(true));
  document.querySelector("#rentalNoButton").addEventListener("click", () => setRentalActive(false));

  addPurchaseRow("Ejendomspris", 0, false);
  addPurchaseRow("Omkostninger ved køb", 0, false);
  addPurchaseRow("Udgifter til advokat", 0, false);
  addPurchaseRow("Tinglysning", 0, false);
  addPurchaseRow("Køberrådgivning", 0, false);
  addOperationRow("Ejendomsskat/fællesudgifter", 0, "maanedligt");

  loadProperties();
  loadInvestmentCases();
  showStep(0);
}

function addPurchaseRow(name, amount, canRemove) {
  const row = createMoneyRow("purchase-row", name, amount, canRemove);
  document.querySelector("#purchaseRows").appendChild(row);
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
  amountInput.className = "row-amount";
  amountInput.type = "number";
  amountInput.min = "0";
  amountInput.step = "100";
  amountInput.value = amount;

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
    laanebeloeb: Number(form.laanebeloeb.value),
    egenbetaling: Number(form.egenbetaling.value),
    rente: Number(form.rente.value),
    loebetid: Number(form.loebetid.value),
    driftsposter: collectRows(".operation-row", false, true),
    udlejningAktiv: form.udlejningAktiv.value === "ja",
    maanedligLeje: form.udlejningAktiv.value === "ja" ? Number(form.maanedligLeje.value) : 0,
    tomgangProcent: form.udlejningAktiv.value === "ja" ? Number(form.tomgangProcent.value) : 0,
    udlejningsudgifter: form.udlejningAktiv.value === "ja" ? collectRows(".rental-cost-row", false, true) : [],
    vaekstProcent: Number(form.vaekstProcent.value),
    periodeAar: Number(form.periodeAar.value)
  };

  return data;
}

function collectRows(selector, includeTime = false, includePeriod = false) {
  return Array.from(document.querySelectorAll(selector))
    .map((row) => ({
      navn: row.querySelector(".row-name").value.trim(),
      beloeb: Number(row.querySelector(".row-amount").value) || 0,
      tidspunkt: includeTime ? row.querySelector(".row-time").value.trim() : "",
      periode: includePeriod ? row.querySelector(".row-period").value : "engang"
    }))
    .filter((post) => post.navn || post.beloeb > 0);
}

function validateCurrentStep() {
  const section = document.querySelector(`.form-step[data-step="${currentStep}"]`);
  const fields = section.querySelectorAll("input:not([type='hidden']), select, textarea");

  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      showError("Udfyld de markerede felter, før du går videre.");
      return false;
    }
  }

  if (currentStep === 1 && !loanMatchesPrice()) {
    showError("Lånebeløb + egenbetaling skal være lig med ejendomsprisen.");
    return false;
  }

  clearMessage();
  return true;
}

function loanMatchesPrice() {
  const input = collectFormData();
  const price = getPostTotal(input.koebsposter, "Ejendomspris");
  return Math.abs((input.laanebeloeb + input.egenbetaling) - price) < 1;
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
  const lejeIndtaegtMaanedligt = input.maanedligLeje * (1 - input.tomgangProcent / 100);
  const lejeUdgifterMaanedligt = monthlyTotal(input.udlejningsudgifter);
  const maanedligeUdgifter = driftMaanedligt + lejeUdgifterMaanedligt + maanedligYdelse;
  const maanedligtCashflow = lejeIndtaegtMaanedligt - maanedligeUdgifter;
  const aarligtCashflow = maanedligtCashflow * 12;
  const totalRenteomkostning = Math.max(0, maanedligYdelse * antalMaaneder - input.laanebeloeb);
  const estimeretVaerdiEfterPeriode = koebspris * Math.pow(1 + input.vaekstProcent / 100, input.periodeAar);
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
    belaaning: koebspris > 0 ? (input.laanebeloeb / koebspris) * 100 : 0,
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
    ${resultCard("Belåning", `${result.belaaning.toFixed(1)} %`)}
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

    const response = await fetch("/api/investeringscases", {
      method: "POST",
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
    await loadInvestmentCases();
  } catch (error) {
    console.error("Fejl ved gem af investeringscase:", error);
    showError("Serverfejl ved gem af case.");
  }
}

async function loadProperties() {
  const select = document.querySelector("#ejendomSelect");
  const url = new URL(window.location.href);
  const selectedId = url.searchParams.get("ejendomID");

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
    });

    if (selectedId) {
      select.value = selectedId;
    }
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
        <dl class="case-card-numbers">
          <div><dt>Månedligt cashflow</dt><dd>${kroner(caseData.resultat.maanedligtCashflow)}</dd></div>
          <div><dt>Startinvestering</dt><dd>${kroner(caseData.resultat.startInvestering)}</dd></div>
          <div><dt>Belåning</dt><dd>${caseData.resultat.belaaning.toFixed(1)} %</dd></div>
        </dl>
        <button class="sekundaer-knap" type="button">Slet</button>
      `;

      card.querySelector("button").addEventListener("click", async () => {
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
