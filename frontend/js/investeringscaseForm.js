const caseTrinSide = {
  koebsudgifter: {
    titel: "Købsudgifter",
    naeste: "lånedetaljer.html"
  },
  finansiering: {
    titel: "Finansiering og lånedetaljer",
    forrige: "købsudgifter.html",
    naeste: "renovering.html"
  },
  renovering: {
    titel: "Renovering og forbedringer",
    forrige: "lånedetaljer.html",
    naeste: "driftsbudget.html"
  },
  driftsbudget: {
    titel: "Driftsbudget",
    forrige: "renovering.html",
    naeste: "udlejning.html"
  },
  udlejning: {
    titel: "Udlejning",
    forrige: "driftsbudget.html"
  }
};

function hentValgtInvesteringscase() {
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

function visCaseHeader(caseData, trin) {
  const titel = document.getElementById("caseTrinTitel");
  const info = document.getElementById("caseTrinInfo");
  const helpTekst = document.querySelector(".case-help p");

  if (titel) {
    titel.textContent = caseTrinSide[trin].titel;
  }

  if (info) {
    info.textContent = `${caseData.navn || "Valgt case"} · ${caseData.adresse || "Ingen adresse"}`;
  }

  if (trin === "koebsudgifter" && helpTekst) {
    helpTekst.textContent = 'Angiv beløb for de faste købsudgifter nedenfor. Felterne er tomme som standard, og værdien 0 kan anvendes, hvis en post ikke medfører en omkostning. Hvis der er yderligere udgifter, kan de tilføjes via "Tilføj udgift".';
  }
}

function visFormFejl(besked) {
  const fejl = document.getElementById("caseTrinFejl");

  if (fejl) {
    fejl.textContent = besked || "";
  }
}

function visFormStatus(besked) {
  const status = document.getElementById("caseTrinStatus");

  if (status) {
    status.textContent = besked || "";
  }
}

function formatKroner(beloeb) {
  return `${Number(beloeb || 0).toLocaleString("da-DK")} kr.`;
}

const formatteredeCaseFelter = {
  egenbetaling: "currency",
  laanebeloeb: "currency",
  rente: "percent",
  loebetid: "years",
  afdragsfrihed: "years"
};

function parseKronerInputVaerdi(value) {
  const tekst = String(value || "").trim();

  if (!tekst) {
    return Number.NaN;
  }

  const kunCifre = tekst.replace(/\D/g, "");

  if (!kunCifre) {
    return Number.NaN;
  }

  return Number(kunCifre);
}

function formatKronerInputVaerdi(value) {
  const beloeb = parseKronerInputVaerdi(value);
  return Number.isNaN(beloeb) ? "" : formatKroner(beloeb);
}

function parseFormatteretFeltVaerdi(value, formatType) {
  const tekst = String(value || "").trim();

  if (!tekst) {
    return Number.NaN;
  }

  if (formatType === "currency" || formatType === "years") {
    const kunCifre = tekst.replace(/\D/g, "");
    return kunCifre ? Number(kunCifre) : Number.NaN;
  }

  if (formatType === "percent") {
    const normaliseret = tekst
      .replace(",", ".")
      .replace(/[^0-9.]/g, "");

    if (!normaliseret) {
      return Number.NaN;
    }

    const dele = normaliseret.split(".");
    const samlet = dele.length > 1
      ? `${dele[0]}.${dele.slice(1).join("")}`
      : dele[0];

    return samlet ? Number(samlet) : Number.NaN;
  }

  return Number(tekst);
}

function formatFormatteretFeltVaerdi(value, formatType) {
  const nummer = parseFormatteretFeltVaerdi(value, formatType);

  if (Number.isNaN(nummer)) {
    return "";
  }

  if (formatType === "currency") {
    return formatKroner(nummer);
  }

  if (formatType === "years") {
    return `${nummer.toLocaleString("da-DK")} år`;
  }

  if (formatType === "percent") {
    return `${nummer.toLocaleString("da-DK")} %`;
  }

  return String(nummer);
}

function findCaretPositionForDigits(formateretVaerdi, antalCifreFoerCaret) {
  if (antalCifreFoerCaret <= 0) {
    return 0;
  }

  let antalFundneCifre = 0;

  for (let index = 0; index < formateretVaerdi.length; index += 1) {
    if (/\d/.test(formateretVaerdi[index])) {
      antalFundneCifre += 1;
    }

    if (antalFundneCifre >= antalCifreFoerCaret) {
      return index + 1;
    }
  }

  return Math.max(0, formateretVaerdi.length - 4);
}

function formatterKronerInput(input) {
  const selectionStart = input.selectionStart ?? input.value.length;
  const antalCifreFoerCaret = input.value.slice(0, selectionStart).replace(/\D/g, "").length;
  const formateretVaerdi = formatKronerInputVaerdi(input.value);

  input.value = formateretVaerdi;

  if (!formateretVaerdi) {
    return;
  }

  const nyCaretPosition = findCaretPositionForDigits(formateretVaerdi, antalCifreFoerCaret);
  input.setSelectionRange(nyCaretPosition, nyCaretPosition);
}

function formatterCaseFeltInput(input) {
  const formatType = formatteredeCaseFelter[input.dataset.caseField];

  if (!formatType) {
    return;
  }

  const selectionStart = input.selectionStart ?? input.value.length;
  const antalCifreFoerCaret = input.value.slice(0, selectionStart).replace(/\D/g, "").length;
  const formateretVaerdi = formatFormatteretFeltVaerdi(input.value, formatType);

  input.value = formateretVaerdi;

  if (!formateretVaerdi) {
    return;
  }

  const nyCaretPosition = findCaretPositionForDigits(formateretVaerdi, antalCifreFoerCaret);
  input.setSelectionRange(nyCaretPosition, nyCaretPosition);
}

const fasteKoebsposter = [
  "Ejendomspris",
  "Omkostninger ved køb",
  "Udgifter til advokat",
  "Tinglysning",
  "Køberrådgivning"
];

const fasteKoebspostBeskrivelser = {
  "Ejendomspris": "Brug den aftalte købspris for ejendommen, fx fra salgsopstilling eller købsaftale.",
  "Omkostninger ved køb": "Saml øvrige købsomkostninger her, hvis de ikke passer i felterne nedenfor.",
  "Udgifter til advokat": "Indtast det forventede honorar til advokat eller juridisk gennemgang.",
  "Tinglysning": "Brug de forventede tinglysningsafgifter for skøde og eventuelle dokumenter.",
  "Køberrådgivning": "Indtast prisen for køberrådgivning, hvis du bruger ekstern rådgiver."
};

function lavKoebspostRække(navn = "", beloeb = "", fastPost = false) {
  const liste = document.getElementById("koebspostListe");

  if (!liste) {
    return;
  }

  const div = document.createElement("div");
  div.className = `koebspost-række${fastPost ? " koebspost-fast" : ""}`;
  const beskrivelse = fasteKoebspostBeskrivelser[navn] || "";
  div.innerHTML = `
    <div class="koebspost-navn-felt">
      <input class="koebspost-navn" type="text" maxlength="100" placeholder="Navn på udgift" value="${escapeHtml(navn)}" ${fastPost ? "readonly" : ""}>
      ${fastPost && beskrivelse ? `<small class="koebspost-beskrivelse">${escapeHtml(beskrivelse)}</small>` : ""}
    </div>
    <input class="koebspost-beloeb" type="text" inputmode="numeric" placeholder="Beløb i kr." value="${escapeHtml(formatKronerInputVaerdi(String(beloeb)))}">
    ${fastPost ? '<span class="koebspost-fast-plads"></span>' : '<button class="fjern-koebspost-knap" type="button" aria-label="Fjern udgift" title="Fjern udgift">🗑</button>'}
  `;

  liste.appendChild(div);
}

function udfyldFasteKoebsposter(data) {
  const poster = Array.isArray(data?.poster) ? data.poster : [];

  fasteKoebsposter.forEach((navn) => {
    const eksisterendePost = poster.find((post) => post.navn === navn);
    lavKoebspostRække(navn, eksisterendePost?.beloeb ?? "", true);
  });

  poster
    .filter((post) => !fasteKoebsposter.includes(post.navn))
    .forEach((post) => lavKoebspostRække(post.navn, post.beloeb));
}

function hentKoebsposter() {
  return Array.from(document.querySelectorAll(".koebspost-række"))
    .map((række) => ({
      navn: række.querySelector(".koebspost-navn").value.trim(),
      beloeb: parseKronerInputVaerdi(række.querySelector(".koebspost-beloeb").value)
    }))
    .filter((post) => post.navn || !Number.isNaN(post.beloeb));
}

function hentManglendeFasteKoebsposter() {
  return Array.from(document.querySelectorAll(".koebspost-fast"))
    .map((række) => ({
      navn: række.querySelector(".koebspost-navn").value.trim(),
      beloebTekst: række.querySelector(".koebspost-beloeb").value.trim()
    }))
    .filter((post) => post.navn && post.beloebTekst === "")
    .map((post) => post.navn);
}

function opdaterKoebspostTotal() {
  const totalElement = document.getElementById("koebspostTotal");

  if (!totalElement) {
    return;
  }

  const total = hentKoebsposter()
    .filter((post) => post.navn && !Number.isNaN(post.beloeb) && post.beloeb >= 0)
    .reduce((sum, post) => sum + post.beloeb, 0);

  totalElement.textContent = formatKroner(total);
}

function hentFormData(trin) {
  if (trin === "koebsudgifter") {
    const poster = hentKoebsposter()
      .filter((post) => post.navn && !Number.isNaN(post.beloeb) && post.beloeb >= 0);
    const total = poster.reduce((sum, post) => sum + post.beloeb, 0);

    return { poster, total };
  }

  const data = {};
  document.querySelectorAll("[data-case-field]").forEach((felt) => {
    const navn = felt.dataset.caseField;
    const formatType = formatteredeCaseFelter[navn];

    if (formatType) {
      data[navn] = felt.value === "" ? "" : parseFormatteretFeltVaerdi(felt.value, formatType);
    } else if (felt.type === "number") {
      data[navn] = felt.value === "" ? "" : Number(felt.value);
    } else {
      data[navn] = felt.value.trim();
    }
  });

  return data;
}

function udfyldForm(trin, data) {
  if (!data) {
    if (trin === "koebsudgifter") {
      udfyldFasteKoebsposter(null);
      opdaterKoebspostTotal();
    }
    return;
  }

  if (trin === "koebsudgifter") {
    udfyldFasteKoebsposter(data);
    opdaterKoebspostTotal();
    return;
  }

  document.querySelectorAll("[data-case-field]").forEach((felt) => {
    const navn = felt.dataset.caseField;
    const formatType = formatteredeCaseFelter[navn];

    if (data[navn] !== undefined && data[navn] !== null) {
      felt.value = formatType ? formatFormatteretFeltVaerdi(data[navn], formatType) : data[navn];
    }
  });
}

function validerForm(trin, data) {
  if (trin === "koebsudgifter") {
    const manglendeFastePoster = hentManglendeFasteKoebsposter();

    if (manglendeFastePoster.length > 0) {
      return "Udfyld beløb for alle 5 faste købsudgifter, før du går videre.";
    }

    if (data.poster.length === 0) {
      return "Tilføj mindst én købs- eller renoveringsudgift.";
    }

    const ugyldigPost = data.poster.find((post) => !post.navn || Number.isNaN(post.beloeb) || post.beloeb < 0);

    if (ugyldigPost) {
      return "Alle udgiftsposter skal have navn og et beløb på 0 kr. eller mere.";
    }

    return "";
  }

  const ugyldigtTal = Array.from(document.querySelectorAll("[data-case-field][type='number']"))
    .find((felt) => felt.value !== "" && Number(felt.value) < 0);

  if (ugyldigtTal) {
    return "Tal må ikke være negative.";
  }

  if (trin === "finansiering" && data.rente !== "" && Number(data.rente) > 25) {
    return "Renten virker meget høj. Angiv renten som procent, fx 4.5.";
  }

  if (trin === "finansiering") {
    if (!data.laanetype || data.laanebeloeb === "" || data.rente === "" || data.loebetid === "") {
      return "Vælg lånetype og udfyld lånebeløb, rente og løbetid.";
    }

    if (data.afdragsfrihed !== "" && Number(data.afdragsfrihed) > Number(data.loebetid)) {
      return "Afdragsfrihed kan ikke være længere end lånets løbetid.";
    }
  }

  if (trin === "udlejning" && data.maanedligLeje === "") {
    return "Angiv forventet månedlig leje, også selvom tallet er 0.";
  }

  return "";
}

function beregnFinansieringsOverblik(data) {
  const laanebeloeb = Number(data.laanebeloeb || 0);
  const egenbetaling = Math.max(0, Number(data.egenbetaling || 0));
  const hovedstol = Math.max(0, laanebeloeb - egenbetaling);
  const rente = Number(data.rente || 0);
  const loebetid = Number(data.loebetid || 0);
  const afdragsfrihed = Math.max(0, Number(data.afdragsfrihed || 0));
  const antalMaaneder = loebetid * 12;

  if (hovedstol <= 0 || loebetid <= 0 || antalMaaneder <= 0) {
    return {
      maanedligYdelse: 0,
      samletRenteomkostning: 0,
      maanedligNote: "Beregnes når lånebeløb, egenbetaling, rente og løbetid er udfyldt."
    };
  }

  const maanedligRente = (rente / 100) / 12;
  const afdragsfriMaaneder = Math.min(antalMaaneder, afdragsfrihed * 12);
  const tilbagebetalingsMaaneder = Math.max(0, antalMaaneder - afdragsfriMaaneder);

  if (afdragsfriMaaneder > 0) {
    const renteOnlyYdelse = maanedligRente === 0 ? 0 : hovedstol * maanedligRente;
    const amortiseretYdelse = tilbagebetalingsMaaneder <= 0
      ? renteOnlyYdelse
      : maanedligRente === 0
        ? hovedstol / tilbagebetalingsMaaneder
        : hovedstol * (maanedligRente / (1 - Math.pow(1 + maanedligRente, -tilbagebetalingsMaaneder)));
    const samletRenteomkostning =
      (renteOnlyYdelse * afdragsfriMaaneder) +
      (amortiseretYdelse * tilbagebetalingsMaaneder) -
      hovedstol;

    return {
      maanedligYdelse: renteOnlyYdelse,
      samletRenteomkostning: Math.max(0, samletRenteomkostning),
      maanedligNote: tilbagebetalingsMaaneder > 0
        ? `Beregnet ud fra lånebeløb minus egenbetaling. Viser første ydelse i perioden med afdragsfrihed. Efter ${afdragsfrihed} år beregnes ydelsen ud fra restløbetiden.`
        : "Lånet er sat til fuld afdragsfrihed i hele perioden."
    };
  }

  const maanedligYdelse = maanedligRente === 0
    ? hovedstol / antalMaaneder
    : hovedstol * (maanedligRente / (1 - Math.pow(1 + maanedligRente, -antalMaaneder)));
  const samletRenteomkostning = (maanedligYdelse * antalMaaneder) - hovedstol;

  return {
    maanedligYdelse,
    samletRenteomkostning: Math.max(0, samletRenteomkostning),
    maanedligNote: "Viser den beregnede månedlige ydelse ud fra lånebeløb, egenbetaling, rente, løbetid og afdragsfrihed."
  };
}

function opdaterFinansieringsBeregning() {
  const maanedligYdelseElement = document.getElementById("finansieringMaanedligYdelse");
  const samletRenteElement = document.getElementById("finansieringSamletRente");
  const maanedligNoteElement = document.getElementById("finansieringMaanedligNote");
  const samletRenteNoteElement = document.getElementById("finansieringSamletRenteNote");

  if (!maanedligYdelseElement || !samletRenteElement) {
    return;
  }

  const data = hentFormData("finansiering");
  const resultat = beregnFinansieringsOverblik(data);

  maanedligYdelseElement.textContent = formatKroner(resultat.maanedligYdelse);
  samletRenteElement.textContent = formatKroner(resultat.samletRenteomkostning);

  if (maanedligNoteElement) {
    maanedligNoteElement.textContent = resultat.maanedligNote;
  }

  if (samletRenteNoteElement) {
    samletRenteNoteElement.textContent = "Viser den samlede renteudgift over hele lånets periode.";
  }
}

function anvendStandardVaerdierForLaanetype() {
  const laanetypeFelt = document.querySelector('[data-case-field="laanetype"]');
  const renteFelt = document.querySelector('[data-case-field="rente"]');
  const loebetidFelt = document.querySelector('[data-case-field="loebetid"]');

  if (!laanetypeFelt || !renteFelt || !loebetidFelt) {
    return;
  }

  renteFelt.readOnly = false;
  loebetidFelt.readOnly = false;

  if (laanetypeFelt.value === "realkredit") {
    renteFelt.value = formatFormatteretFeltVaerdi(4.2, "percent");
    loebetidFelt.value = formatFormatteretFeltVaerdi(30, "years");
    renteFelt.readOnly = true;
    loebetidFelt.readOnly = true;
    opdaterFinansieringsBeregning();
    return;
  }

  if (laanetypeFelt.value === "banklaan") {
    renteFelt.value = formatFormatteretFeltVaerdi(8, "percent");
    loebetidFelt.value = formatFormatteretFeltVaerdi(30, "years");
    renteFelt.readOnly = true;
    loebetidFelt.readOnly = true;
    opdaterFinansieringsBeregning();
    return;
  }

  opdaterFinansieringsBeregning();
}

async function hentGemtTrinData(caseID, trin, email) {
  const response = await fetch(`/api/investeringscases/${caseID}/trin/${trin}?email=${encodeURIComponent(email)}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Kunne ikke hente trindata.");
  }

  return result.data;
}

async function gemTrinData(caseID, trin, email, data) {
  const response = await fetch(`/api/investeringscases/${caseID}/trin/${trin}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ownerEmail: email,
      data
    })
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Kunne ikke gemme trindata.");
  }
}

async function hentAnalyse(caseID, email) {
  const response = await fetch(`/api/investeringscases/${caseID}/analyse?email=${encodeURIComponent(email)}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Kunne ikke hente analyse.");
  }

  return result.analyse;
}

function visAnalyse(analyse) {
  const grid = document.getElementById("caseAnalyseGrid");

  if (!grid || !analyse) {
    return;
  }

  grid.innerHTML = `
    <div>
      <span>Samlet investering</span>
      <strong>${formatKroner(analyse.samletInvestering)}</strong>
      <small>Køb og renovering</small>
    </div>
    <div>
      <span>Årlig leje efter tomgang</span>
      <strong>${formatKroner(analyse.lejeEfterTomgang)}</strong>
      <small>Før driftsudgifter</small>
    </div>
    <div>
      <span>Årlige driftsudgifter</span>
      <strong>${formatKroner(analyse.driftsudgifterAarligt)}</strong>
      <small>Skat, forsikring og drift</small>
    </div>
    <div>
      <span>Månedlig låneydelse</span>
      <strong>${formatKroner(analyse.maanedligYdelse)}</strong>
      <small>Beregnet fra lån, rente og løbetid</small>
    </div>
    <div>
      <span>Resultat før finansiering</span>
      <strong>${formatKroner(analyse.resultatFoerFinansiering)}</strong>
      <small>Leje minus drift</small>
    </div>
    <div>
      <span>Årlig cashflow</span>
      <strong>${formatKroner(analyse.resultatEfterFinansiering)}</strong>
      <small>Efter drift og låneydelse</small>
    </div>
  `;
}

async function opdaterAnalyseHvisMuligt(trin, caseID, email) {
  if (trin !== "udlejning") {
    return;
  }

  try {
    const analyse = await hentAnalyse(caseID, email);
    visAnalyse(analyse);
  } catch (error) {
    console.error("Fejl ved opdatering af analyse:", error);
  }
}

function bindTrinNavigation(trin) {
  const forrige = document.getElementById("forrigeTrinLink");
  const naeste = document.getElementById("naesteTrinKnap");
  const config = caseTrinSide[trin];

  if (forrige && config.forrige) {
    forrige.href = config.forrige;
    forrige.classList.remove("skjult");
  }

  if (naeste && config.naeste) {
    // Knappen er en submit-knap, så formularen bliver gemt før brugeren går videre.
    naeste.dataset.href = config.naeste;
    naeste.classList.remove("skjult");
  }
}

async function bindInvesteringscaseTrinForm() {
  const form = document.getElementById("caseTrinForm");

  if (!form) {
    return;
  }

  const trin = form.dataset.trin;
  const bruger = hentLoggetIndBruger();
  const valgtCase = hentValgtInvesteringscase();

  if (!bruger) {
    window.location.href = "login.html";
    return;
  }

  if (!valgtCase || !valgtCase.caseID) {
    window.location.href = "investeringscase.html";
    return;
  }

  visCaseHeader(valgtCase, trin);
  bindTrinNavigation(trin);

  document.querySelectorAll("[data-case-field]").forEach((felt) => {
    const formatType = formatteredeCaseFelter[felt.dataset.caseField];

    if (!formatType) {
      return;
    }

    felt.type = "text";

    if (!felt.inputMode) {
      felt.inputMode = formatType === "percent" ? "decimal" : "numeric";
    }

    felt.addEventListener("input", () => {
      formatterCaseFeltInput(felt);
      if (trin === "finansiering") {
        opdaterFinansieringsBeregning();
      }
    });

    felt.addEventListener("focusout", () => {
      formatterCaseFeltInput(felt);
      if (trin === "finansiering") {
        opdaterFinansieringsBeregning();
      }
    });

    felt.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      felt.blur();
    });
  });

  try {
    const gemtData = await hentGemtTrinData(valgtCase.caseID, trin, bruger.email);
    udfyldForm(trin, gemtData);
    await opdaterAnalyseHvisMuligt(trin, valgtCase.caseID, bruger.email);
  } catch (error) {
    console.error("Fejl ved hentning af trindata:", error);
    udfyldForm(trin, null);
    visFormFejl(error.message);
  }

  const liste = document.getElementById("koebspostListe");
  const tilfoej = document.getElementById("tilfoejKoebspostKnap");
  const forrigeLink = document.getElementById("forrigeTrinLink");

  if (liste) {
    liste.addEventListener("focusout", (event) => {
      const input = event.target.closest(".koebspost-beloeb");

      if (!input) {
        return;
      }

      formatterKronerInput(input);
      opdaterKoebspostTotal();
    });

    liste.addEventListener("input", (event) => {
      const input = event.target.closest(".koebspost-beloeb");

      if (input) {
        formatterKronerInput(input);
      }

      opdaterKoebspostTotal();
    });

    liste.addEventListener("keydown", (event) => {
      const felt = event.target.closest(".koebspost-beloeb, .koebspost-navn");

      if (!felt || event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      felt.blur();
    });

    liste.addEventListener("click", (event) => {
      const knap = event.target.closest(".fjern-koebspost-knap");

      if (!knap) {
        return;
      }

      knap.closest(".koebspost-række").remove();
      opdaterKoebspostTotal();
    });
  }

  if (tilfoej) {
    tilfoej.addEventListener("click", () => {
      lavKoebspostRække();
      opdaterKoebspostTotal();
    });
  }

  const laanetypeFelt = document.querySelector('[data-case-field="laanetype"]');

  if (trin === "finansiering" && laanetypeFelt) {
    laanetypeFelt.addEventListener("change", () => {
      anvendStandardVaerdierForLaanetype();
    });

    anvendStandardVaerdierForLaanetype();
  }

  if (trin === "finansiering") {
    opdaterFinansieringsBeregning();
  }

  if (forrigeLink) {
    forrigeLink.addEventListener("click", async (event) => {
      event.preventDefault();

      try {
        const data = hentFormData(trin);
        await gemTrinData(valgtCase.caseID, trin, bruger.email, data);
        window.location.href = forrigeLink.href;
      } catch (error) {
        console.error("Fejl ved gem før navigation til forrige trin:", error);
        visFormFejl("Kunne ikke gemme dine oplysninger før navigation til forrige trin.");
      }
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    visFormFejl("");
    visFormStatus("");

    const trykketKnap = event.submitter;
    const handling = trykketKnap?.dataset.action || "save";
    const data = hentFormData(trin);
    const fejl = validerForm(trin, data);

    if (fejl) {
      visFormFejl(fejl);
      return;
    }

    try {
      await gemTrinData(valgtCase.caseID, trin, bruger.email, data);
      visFormStatus("Gemt.");
      await opdaterAnalyseHvisMuligt(trin, valgtCase.caseID, bruger.email);

      // Efter gem vælger vi retning ud fra den knap brugeren trykkede på.
      if (handling === "next") {
        window.location.href = trykketKnap.dataset.href;
      }

      if (handling === "overview") {
        window.location.href = "caseOverblik.html";
      }

      if (handling === "save") {
        window.location.href = "caseOverblik.html";
      }
    } catch (error) {
      console.error("Fejl ved gem af trindata:", error);
      visFormFejl(error.message);
    }
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
