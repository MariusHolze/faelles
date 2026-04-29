const caseTrinSide = {
  koebsudgifter: {
    label: "Ejendom",
    titel: "Købsudgifter",
    naeste: "lånedetaljer.html"
  },
  finansiering: {
    label: "Finansiering",
    titel: "Finansiering og lånedetaljer",
    forrige: "købsudgifter.html",
    naeste: "renovering.html"
  },
  renovering: {
    label: "Renovering",
    titel: "Renovering og forbedringer",
    forrige: "lånedetaljer.html",
    naeste: "driftsbudget.html"
  },
  driftsbudget: {
    label: "Driftsbudget",
    titel: "Driftsbudget",
    forrige: "renovering.html",
    naeste: "udlejning.html"
  },
  udlejning: {
    label: "Udlejning",
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

function visTrinsIndikator(aktivTrin) {
  const indikator = document.getElementById("caseTrinIndikator");

  if (!indikator) {
    return;
  }

  const trin = Object.keys(caseTrinSide);
  const aktivIndex = trin.indexOf(aktivTrin);

  const html = trin.map((key, i) => {
    const config = caseTrinSide[key];
    const faerdig = i < aktivIndex;
    const aktiv = i === aktivIndex;
    const cirkelKlasse = `trin-cirkel${faerdig ? " trin-faerdig" : aktiv ? " trin-aktiv" : ""}`;
    const cirkelIndhold = faerdig ? "✓" : String(i + 1);
    const punktKlasse = `trin-punkt${faerdig ? " faerdig" : aktiv ? " aktiv" : ""}`;
    const linje = i < trin.length - 1 ? `<span class="trin-linje"></span>` : "";

    return `<div class="${punktKlasse}"><span class="${cirkelKlasse}">${cirkelIndhold}</span><span class="trin-label">${config.label}</span></div>${linje}`;
  }).join("");

  indikator.innerHTML = html;
}

function visCaseHeader(caseData, trin) {
  const titel = document.getElementById("caseTrinTitel");
  const info = document.getElementById("caseTrinInfo");

  if (titel) {
    titel.textContent = caseTrinSide[trin].titel;
  }

  if (info) {
    info.innerHTML = `<span class="case-adresse-ikon">🏠</span> ${escapeHtml(caseData.adresse || "Ingen adresse")}`;
  }

  visTrinsIndikator(trin);
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
  return `${Math.round(Number(beloeb || 0)).toLocaleString("da-DK")} kr.`;
}

const formatteredeCaseFelter = {
  egenbetaling: "currency",
  laanebeloeb: "currency",
  rente: "percent",
  loebetid: "years",
  afdragsfrihed: "years",
  maanedligLeje: "currency",
  depositum: "currency",
  tomgangDage: "days",
  maanedligeUdlejningsudgifter: "currency",
  aarligeUdlejningsudgifter: "currency"
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

  if (formatType === "currency" || formatType === "years" || formatType === "days") {
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

  if (formatType === "days") {
    return `${nummer.toLocaleString("da-DK")} dage`;
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

const renoveringTidspunktMuligheder = {
  straks: { label: "Ved køb / straks", maaned: 1 },
  indenfor_1_aar: { label: "Inden for 1 år", maaned: 12 },
  aar_1_3: { label: "1-3 år", maaned: 24 },
  aar_3_5: { label: "3-5 år", maaned: 48 },
  aar_5_plus: { label: "5+ år", maaned: 72 }
};

const standardDriftsposter = [
  {
    navn: "Ejendomsskat",
    periode: "aarligt",
    beskrivelse: "Skriv den forventede årlige grundskyld/ejendomsskat. Find tallet i salgsopstillingen, på Vurderingsportalen eller brug seneste opkrævning som pejlemærke."
  },
  {
    navn: "Forsikring",
    periode: "aarligt",
    beskrivelse: "Skriv den forventede årlige bygningsforsikring. Har du ikke en pris endnu, så brug et overslag fra et forsikringsselskab."
  },
  {
    navn: "Vedligehold",
    periode: "aarligt",
    beskrivelse: "Sæt et årligt beløb af til løbende vedligehold, småreparationer og udskiftninger. Brug gerne et konservativt estimat, hvis ejendommen er ældre."
  },
  {
    navn: "Administration/fællesudgifter",
    periode: "maanedligt",
    beskrivelse: "Skriv månedlige udgifter til administration, ejerforening, vicevært, renovation eller anden fast drift."
  }
];

const driftPeriodeLabels = {
  maanedligt: "pr. måned",
  aarligt: "pr. år"
};

function findRenoveringTidspunktKey(post = {}) {
  if (post.tidspunktKey && renoveringTidspunktMuligheder[post.tidspunktKey]) {
    return post.tidspunktKey;
  }

  const maaned = Number(post.tidspunktMaaned);

  if (Number.isNaN(maaned)) {
    return "";
  }

  if (maaned <= 1) {
    return "straks";
  }

  if (maaned <= 12) {
    return "indenfor_1_aar";
  }

  if (maaned <= 36) {
    return "aar_1_3";
  }

  if (maaned <= 60) {
    return "aar_3_5";
  }

  return "aar_5_plus";
}

function lavRenoveringTidspunktOptions(valgtKey = "") {
  const start = '<option value="">Vælg tidspunkt</option>';
  const options = Object.entries(renoveringTidspunktMuligheder)
    .map(([key, mulighed]) => `<option value="${key}" ${key === valgtKey ? "selected" : ""}>${mulighed.label}</option>`)
    .join("");

  return `${start}${options}`;
}

function lavKoebspostRække(navn = "", beloeb = "") {
  const liste = document.getElementById("koebspostListe");

  if (!liste) {
    return;
  }

  const fast = fasteKoebsposter.includes(navn);
  const div = document.createElement("div");
  div.className = "koebspost-række";
  if (fast) {
    div.dataset.fast = "true";
  }
  const beskrivelse = fasteKoebspostBeskrivelser[navn] || "";
  div.innerHTML = `
    <div class="koebspost-navn-felt">
      <input class="koebspost-navn" type="text" maxlength="100" placeholder="Navn på udgift" value="${escapeHtml(navn)}"${fast ? " readonly" : ""}>
      ${beskrivelse ? `<small class="koebspost-beskrivelse">${escapeHtml(beskrivelse)}</small>` : ""}
    </div>
    <input class="koebspost-beloeb" type="text" inputmode="numeric" placeholder="Beløb i kr." value="${escapeHtml(formatKronerInputVaerdi(String(beloeb)))}">
    ${fast ? "" : `<button class="fjern-koebspost-knap" type="button" aria-label="Fjern udgift" title="Fjern udgift">×</button>`}
  `;

  liste.appendChild(div);
}

function udfyldFasteKoebsposter(data) {
  const poster = Array.isArray(data?.poster) ? data.poster : [];

  if (poster.length > 0) {
    poster.forEach((post) => lavKoebspostRække(post.navn, post.beloeb));
    return;
  }

  fasteKoebsposter.forEach((navn) => lavKoebspostRække(navn, ""));
}

function hentKoebsposter() {
  return Array.from(document.querySelectorAll(".koebspost-række"))
    .map((række) => ({
      navn: række.querySelector(".koebspost-navn").value.trim(),
      beloeb: parseKronerInputVaerdi(række.querySelector(".koebspost-beloeb").value)
    }))
    .filter((post) => post.navn || !Number.isNaN(post.beloeb));
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

function lavRenoveringspostRække(post = {}) {
  const liste = document.getElementById("renoveringspostListe");

  if (!liste) {
    return;
  }

  const div = document.createElement("div");
  div.className = "renoveringspost-række";
  const valgtTidspunkt = findRenoveringTidspunktKey(post);
  div.innerHTML = `
    <div class="koebspost-navn-felt">
      <input class="renoveringspost-navn" type="text" maxlength="100" placeholder="Forbedring" value="${escapeHtml(post.navn || "")}">
      <small class="koebspost-beskrivelse">Fx køkken, bad, maling eller energiforbedring.</small>
    </div>
    <input class="renoveringspost-beloeb" type="text" inputmode="numeric" placeholder="Beløb i kr." value="${escapeHtml(formatKronerInputVaerdi(String(post.beloeb ?? "")))}">
    <select class="renoveringspost-tidspunkt">
      ${lavRenoveringTidspunktOptions(valgtTidspunkt)}
    </select>
    <button class="fjern-renoveringspost-knap" type="button" aria-label="Fjern forbedring" title="Fjern forbedring">×</button>
  `;

  liste.appendChild(div);
}

function hentRenoveringsposter() {
  return Array.from(document.querySelectorAll(".renoveringspost-række"))
    .map((række) => {
      const tidspunktKey = række.querySelector(".renoveringspost-tidspunkt").value;
      const tidspunkt = renoveringTidspunktMuligheder[tidspunktKey] || {};

      return {
        navn: række.querySelector(".renoveringspost-navn").value.trim(),
        beloeb: parseKronerInputVaerdi(række.querySelector(".renoveringspost-beloeb").value),
        tidspunktKey,
        tidspunktLabel: tidspunkt.label || "",
        tidspunktMaaned: tidspunkt.maaned
      };
    })
    .filter((post) => post.navn || !Number.isNaN(post.beloeb) || post.tidspunktKey);
}

function hentRenoveringsDataFraForm() {
  const aktiv = document.getElementById("renoveringAktiv")?.checked || false;

  if (!aktiv) {
    return {
      aktiv: false,
      allePoster: [],
      poster: [],
      total: 0
    };
  }

  const allePoster = hentRenoveringsposter();
  const poster = allePoster
    .filter((post) =>
      post.navn &&
      !Number.isNaN(post.beloeb) &&
      post.beloeb >= 0 &&
      post.tidspunktKey
    );
  const total = poster.reduce((sum, post) => sum + post.beloeb, 0);

  return {
    aktiv: true,
    allePoster,
    poster,
    total
  };
}

function visRenoveringDetaljer(aktiv) {
  const detaljer = document.getElementById("renoveringDetaljer");

  if (detaljer) {
    detaljer.classList.toggle("skjult", !aktiv);
  }
}

function opdaterRenoveringTotal() {
  const totalElement = document.getElementById("renoveringTotal");

  if (!totalElement) {
    return;
  }

  totalElement.textContent = formatKroner(hentRenoveringsDataFraForm().total);
}

function syncRenoveringKort(aktiv) {
  document.getElementById("renoveringJaKort")?.classList.toggle("valg-kort-aktiv", aktiv);
  document.getElementById("renoveringNejKort")?.classList.toggle("valg-kort-aktiv", !aktiv);
}

function udfyldRenoveringsForm(data) {
  const checkbox = document.getElementById("renoveringAktiv");
  const liste = document.getElementById("renoveringspostListe");

  if (liste) {
    liste.innerHTML = "";
  }

  const poster = Array.isArray(data?.poster) ? data.poster : [];
  const aktiv = data?.aktiv === true || poster.length > 0 || Boolean(data?.renoveringsbudget);

  if (checkbox) {
    checkbox.checked = aktiv;
  }

  syncRenoveringKort(aktiv);
  visRenoveringDetaljer(aktiv);

  if (poster.length > 0) {
    poster.forEach((post) => lavRenoveringspostRække(post));
  } else if (data?.renoveringsbudget || data?.varighedMaaneder) {
    lavRenoveringspostRække({
      navn: "Renovering",
      beloeb: data.renoveringsbudget || "",
      tidspunktMaaned: data.varighedMaaneder || 1
    });
  } else {
    lavRenoveringspostRække();
  }

  opdaterRenoveringTotal();
}

function lavDriftPeriodeOptions(valgtPeriode = "aarligt") {
  return Object.entries(driftPeriodeLabels)
    .map(([key, label]) => `<option value="${key}" ${key === valgtPeriode ? "selected" : ""}>${label}</option>`)
    .join("");
}

function lavDriftspostRække(post = {}) {
  const liste = document.getElementById("driftspostListe");

  if (!liste) {
    return;
  }

  const div = document.createElement("div");
  div.className = "driftspost-række";
  div.innerHTML = `
    <div class="koebspost-navn-felt">
      <input class="driftspost-navn" type="text" maxlength="100" placeholder="Driftsomkostning" value="${escapeHtml(post.navn || "")}">
      ${post.beskrivelse ? `<small class="koebspost-beskrivelse">${escapeHtml(post.beskrivelse)}</small>` : ""}
    </div>
    <input class="driftspost-beloeb" type="text" inputmode="numeric" placeholder="Beløb i kr." value="${escapeHtml(formatKronerInputVaerdi(String(post.beloeb ?? "")))}">
    <select class="driftspost-periode">
      ${lavDriftPeriodeOptions(post.periode || "aarligt")}
    </select>
    <button class="fjern-driftspost-knap" type="button" aria-label="Fjern driftsomkostning" title="Fjern driftsomkostning">×</button>
  `;

  liste.appendChild(div);
}

function hentDriftsposter() {
  return Array.from(document.querySelectorAll(".driftspost-række"))
    .map((række) => ({
      navn: række.querySelector(".driftspost-navn").value.trim(),
      beloeb: parseKronerInputVaerdi(række.querySelector(".driftspost-beloeb").value),
      periode: række.querySelector(".driftspost-periode").value
    }));
}

function beregnDriftTotaler(poster) {
  return poster.reduce((totaler, post) => {
    if (!post.navn || Number.isNaN(post.beloeb) || post.beloeb <= 0) {
      return totaler;
    }

    if (post.periode === "maanedligt") {
      totaler.maanedligt += post.beloeb;
      totaler.aarligt += post.beloeb * 12;
    } else {
      totaler.aarligt += post.beloeb;
      totaler.maanedligt += post.beloeb / 12;
    }

    return totaler;
  }, { maanedligt: 0, aarligt: 0 });
}

function beregnDriftspostAarligt(post) {
  if (!post.navn || Number.isNaN(post.beloeb) || post.beloeb <= 0) {
    return 0;
  }

  return post.periode === "maanedligt" ? post.beloeb * 12 : post.beloeb;
}

function hentDriftsbudgetDataFraForm() {
  const allePoster = hentDriftsposter();
  const poster = allePoster
    .filter((post) =>
      post.navn &&
      !Number.isNaN(post.beloeb) &&
      post.beloeb > 0 &&
      (post.periode === "maanedligt" || post.periode === "aarligt")
    );
  const totaler = beregnDriftTotaler(poster);

  return {
    allePoster,
    poster,
    driftsudgifterMaanedligt: totaler.maanedligt,
    driftsudgifterAarligt: totaler.aarligt
  };
}

function opdaterDriftsbudgetTotal() {
  const maanedligTotalElement = document.getElementById("driftMaanedligTotal");
  const aarligTotalElement = document.getElementById("driftAarligTotal");
  const stoerstePostElement = document.getElementById("driftStoerstePost");
  const stoerstePostNoteElement = document.getElementById("driftStoerstePostNote");
  const fordelingElement = document.getElementById("driftFordeling");

  if (!maanedligTotalElement || !aarligTotalElement) {
    return;
  }

  const data = hentDriftsbudgetDataFraForm();
  maanedligTotalElement.textContent = formatKroner(data.driftsudgifterMaanedligt);
  aarligTotalElement.textContent = formatKroner(data.driftsudgifterAarligt);

  const posterMedAarligtBeloeb = data.poster
    .map((post) => ({
      ...post,
      aarligtBeloeb: beregnDriftspostAarligt(post)
    }))
    .filter((post) => post.aarligtBeloeb > 0)
    .sort((a, b) => b.aarligtBeloeb - a.aarligtBeloeb);
  const stoerstePost = posterMedAarligtBeloeb[0];

  if (stoerstePostElement) {
    stoerstePostElement.textContent = stoerstePost ? stoerstePost.navn : "Ingen endnu";
  }

  if (stoerstePostNoteElement) {
    stoerstePostNoteElement.textContent = stoerstePost
      ? `${formatKroner(stoerstePost.aarligtBeloeb)} pr. år`
      : "Udfyld beløb for at se den største udgift.";
  }

  if (fordelingElement) {
    if (!posterMedAarligtBeloeb.length || data.driftsudgifterAarligt <= 0) {
      fordelingElement.innerHTML = '<p>Fordelingen vises, når der er mindst én driftsomkostning med beløb.</p>';
      return;
    }

    const synligePoster = posterMedAarligtBeloeb.slice(0, 4);
    const oevrigeTotal = posterMedAarligtBeloeb
      .slice(4)
      .reduce((sum, post) => sum + post.aarligtBeloeb, 0);
    const fordelingsPoster = oevrigeTotal > 0
      ? [...synligePoster, { navn: "Øvrige", aarligtBeloeb: oevrigeTotal }]
      : synligePoster;

    fordelingElement.innerHTML = `
      <div class="drift-fordeling-bar">
        ${fordelingsPoster.map((post, index) => {
          const procent = Math.max(2, (post.aarligtBeloeb / data.driftsudgifterAarligt) * 100);
          return `<span class="drift-fordeling-segment drift-fordeling-segment-${index % 5}" style="width: ${procent}%"></span>`;
        }).join("")}
      </div>
      <div class="drift-fordeling-list">
        ${fordelingsPoster.map((post, index) => {
          const procent = Math.round((post.aarligtBeloeb / data.driftsudgifterAarligt) * 100);
          return `
            <span>
              <i class="drift-fordeling-prik drift-fordeling-prik-${index % 5}" aria-hidden="true"></i>
              ${escapeHtml(post.navn)} ${procent}%
            </span>
          `;
        }).join("")}
      </div>
    `;
  }
}

function lavLegacyDriftsposter(data = {}) {
  const felter = [
    { key: "ejendomsskat", navn: "Ejendomsskat", periode: "aarligt" },
    { key: "forsikring", navn: "Forsikring", periode: "aarligt" },
    { key: "vedligehold", navn: "Vedligehold", periode: "aarligt" },
    { key: "oevrigeUdgifter", navn: "Øvrige udgifter", periode: "aarligt" }
  ];

  return felter
    .filter((felt) => data[felt.key] !== undefined && data[felt.key] !== null && data[felt.key] !== "")
    .map((felt) => ({
      navn: felt.navn,
      beloeb: data[felt.key],
      periode: felt.periode
    }));
}

function udfyldDriftsbudgetForm(data) {
  const liste = document.getElementById("driftspostListe");

  if (liste) {
    liste.innerHTML = "";
  }

  const poster = Array.isArray(data?.poster) ? data.poster : lavLegacyDriftsposter(data);
  const vistePoster = poster.length > 0 ? poster : standardDriftsposter;

  vistePoster.forEach((post) => lavDriftspostRække(post));
  opdaterDriftsbudgetTotal();
}

function hentUdlejningDataFraForm() {
  const aktiv = document.getElementById("udlejningAktiv")?.checked || false;
  const maanedligLeje = hentUdlejningTalFelt("maanedligLeje");
  const depositum = hentUdlejningTalFelt("depositum");
  const tomgangDage = hentUdlejningTalFelt("tomgangDage");
  const maanedligeUdlejningsudgifter = hentUdlejningTalFelt("maanedligeUdlejningsudgifter");
  const aarligeUdlejningsudgifter = hentUdlejningTalFelt("aarligeUdlejningsudgifter");

  if (!aktiv) {
    return {
      aktiv: false,
      maanedligLeje: 0,
      depositum: 0,
      tomgangDage: 0,
      maanedligeUdlejningsudgifter: 0,
      aarligeUdlejningsudgifter: 0,
      lejeAarligt: 0,
      tomgangBeloeb: 0,
      lejeEfterTomgang: 0,
      lejeudgifterMaanedligt: 0,
      lejeudgifterAarligt: 0,
      nettoLejeMaanedligt: 0,
      nettoLejeAarligt: 0
    };
  }

  const overblik = beregnUdlejningOverblik({
    maanedligLeje,
    tomgangDage,
    maanedligeUdlejningsudgifter,
    aarligeUdlejningsudgifter
  });

  return {
    aktiv: true,
    maanedligLeje,
    depositum,
    tomgangDage,
    maanedligeUdlejningsudgifter,
    aarligeUdlejningsudgifter,
    ...overblik
  };
}

function hentUdlejningTalFelt(feltnavn) {
  const felt = document.querySelector(`[data-case-field="${feltnavn}"]`);

  if (!felt || felt.value === "") {
    return "";
  }

  const formatType = formatteredeCaseFelter[feltnavn];
  const value = formatType
    ? parseFormatteretFeltVaerdi(felt.value, formatType)
    : Number(felt.value || 0);

  return Number.isNaN(value) ? "" : value;
}

function beregnUdlejningOverblik(data = {}) {
  const maanedligLeje = Number(data.maanedligLeje || 0);
  const tomgangDage = Math.min(365, Math.max(0, Number(data.tomgangDage || 0)));
  const maanedligeUdlejningsudgifter = Number(data.maanedligeUdlejningsudgifter || 0);
  const aarligeUdlejningsudgifter = Number(data.aarligeUdlejningsudgifter || 0);
  const lejeAarligt = maanedligLeje * 12;
  const tomgangBeloeb = lejeAarligt * (tomgangDage / 365);
  const lejeEfterTomgang = Math.max(0, lejeAarligt - tomgangBeloeb);
  const lejeudgifterAarligt = (maanedligeUdlejningsudgifter * 12) + aarligeUdlejningsudgifter;
  const lejeudgifterMaanedligt = lejeudgifterAarligt / 12;
  const nettoLejeAarligt = lejeEfterTomgang - lejeudgifterAarligt;
  const nettoLejeMaanedligt = nettoLejeAarligt / 12;
  // Skatteestimatet følger skat.dk's princip om 40% fradrag på lejeindtægt og beskattes her som kapitalindkomst.
  const skattefritBeloeb = Math.max(0, nettoLejeAarligt) * 0.4;
  const skattepligtigtBeloeb = Math.max(0, nettoLejeAarligt - skattefritBeloeb);
  const skatBeloeb = skattepligtigtBeloeb * 0.42;
  const lejeEfterSkatAarligt = nettoLejeAarligt - skatBeloeb;
  const lejeEfterSkatMaanedligt = lejeEfterSkatAarligt / 12;

  return {
    lejeAarligt,
    tomgangBeloeb,
    lejeEfterTomgang,
    lejeudgifterMaanedligt,
    lejeudgifterAarligt,
    nettoLejeMaanedligt,
    nettoLejeAarligt,
    skattefritBeloeb,
    skattepligtigtBeloeb,
    skatBeloeb,
    lejeEfterSkatMaanedligt,
    lejeEfterSkatAarligt
  };
}

function opdaterUdlejningOverblik() {
  const bruttoAarligtElement = document.getElementById("udlejningAarligBrutto");
  const bruttoMaanedligtElement = document.getElementById("udlejningMaanedligBrutto");
  const nettoAarligtElement = document.getElementById("udlejningNettoAarligt");
  const nettoMaanedligtElement = document.getElementById("udlejningNettoMaanedligt");
  const efterSkatAarligtElement = document.getElementById("udlejningEfterSkatAarligt");
  const skatNoteElement = document.getElementById("udlejningSkatNote");

  if (!bruttoAarligtElement || !nettoAarligtElement || !efterSkatAarligtElement) {
    return;
  }

  const data = hentUdlejningDataFraForm();

  bruttoAarligtElement.textContent = formatKroner(data.lejeAarligt);
  nettoAarligtElement.textContent = formatKroner(data.nettoLejeAarligt);
  efterSkatAarligtElement.textContent = formatKroner(data.lejeEfterSkatAarligt);

  if (bruttoMaanedligtElement) {
    bruttoMaanedligtElement.textContent = `${formatKroner(data.maanedligLeje)} pr. måned før tomgang og udgifter.`;
  }

  if (nettoMaanedligtElement) {
    nettoMaanedligtElement.textContent = `${formatKroner(data.nettoLejeMaanedligt)} pr. måned efter tomgang og udgifter.`;
  }

  if (skatNoteElement) {
    skatNoteElement.textContent = `Estimeret skat af udlejning: ca. ${formatKroner(data.skatBeloeb)}. Kilde: skat.dk.`;
  }
}

function visUdlejningDetaljer(aktiv) {
  const detaljer = document.getElementById("udlejningDetaljer");

  if (detaljer) {
    detaljer.classList.toggle("skjult", !aktiv);
  }
}

function syncUdlejningKort(aktiv) {
  document.getElementById("udlejningJaKort")?.classList.toggle("valg-kort-aktiv", aktiv);
  document.getElementById("udlejningNejKort")?.classList.toggle("valg-kort-aktiv", !aktiv);
}

function udfyldUdlejningForm(data) {
  const checkbox = document.getElementById("udlejningAktiv");
  const aktiv = data?.aktiv === true || Boolean(
    data?.maanedligLeje ||
    data?.depositum ||
    data?.tomgangDage ||
    data?.tomgangProcent ||
    data?.maanedligeUdlejningsudgifter ||
    data?.aarligeUdlejningsudgifter
  );

  if (checkbox) {
    checkbox.checked = aktiv;
  }

  syncUdlejningKort(aktiv);
  visUdlejningDetaljer(aktiv);

  document.querySelectorAll("[data-case-field]").forEach((felt) => {
    const navn = felt.dataset.caseField;
    const formatType = formatteredeCaseFelter[navn];
    const value = navn === "tomgangDage" && data?.tomgangDage === undefined && data?.tomgangProcent !== undefined
      ? Math.round((Number(data.tomgangProcent || 0) / 100) * 365)
      : data?.[navn];

    if (value !== undefined && value !== null) {
      felt.value = formatType ? formatFormatteretFeltVaerdi(value, formatType) : value;
    }
  });

  opdaterUdlejningOverblik();
}

function hentFormData(trin) {
  if (trin === "koebsudgifter") {
    const poster = hentKoebsposter()
      .filter((post) => post.navn && !Number.isNaN(post.beloeb) && post.beloeb >= 0);
    const total = poster.reduce((sum, post) => sum + post.beloeb, 0);

    return { poster, total };
  }

  if (trin === "renovering") {
    return hentRenoveringsDataFraForm();
  }

  if (trin === "driftsbudget") {
    return hentDriftsbudgetDataFraForm();
  }

  if (trin === "udlejning") {
    return hentUdlejningDataFraForm();
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

    if (trin === "driftsbudget") {
      udfyldDriftsbudgetForm(null);
    }

    return;
  }

  if (trin === "koebsudgifter") {
    udfyldFasteKoebsposter(data);
    opdaterKoebspostTotal();
    return;
  }

  if (trin === "renovering") {
    udfyldRenoveringsForm(data);
    return;
  }

  if (trin === "driftsbudget") {
    udfyldDriftsbudgetForm(data);
    return;
  }

  if (trin === "udlejning") {
    udfyldUdlejningForm(data);
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
    if (data.poster.length === 0) {
      return "Tilføj mindst én købs- eller renoveringsudgift.";
    }

    const ugyldigPost = data.poster.find((post) => !post.navn || Number.isNaN(post.beloeb) || post.beloeb < 0);

    if (ugyldigPost) {
      return "Alle udgiftsposter skal have navn og et beløb på 0 kr. eller mere.";
    }

    return "";
  }

  if (trin === "renovering") {
    if (!data.aktiv) {
      return "";
    }

    if (data.poster.length === 0) {
      return "Tilføj mindst én renovering eller forbedring.";
    }

    const ugyldigPost = data.allePoster.find((post) =>
      !post.navn ||
      Number.isNaN(post.beloeb) ||
      post.beloeb < 0 ||
      !post.tidspunktKey
    );

    if (ugyldigPost) {
      return "Alle forbedringer skal have navn, beløb og et planlagt tidspunkt.";
    }

    return "";
  }

  if (trin === "driftsbudget") {
    const ugyldigPost = data.allePoster.find((post) =>
      !Number.isNaN(post.beloeb) &&
      (!post.navn || post.beloeb <= 0 || !["maanedligt", "aarligt"].includes(post.periode))
    );

    if (ugyldigPost) {
      return "Driftsomkostninger med beløb skal have navn, et beløb over 0 kr. og periode.";
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

    if (finansieringKoebsudgifterTotal !== null && Number(data.egenbetaling || 0) > finansieringKoebsudgifterTotal) {
      return "Egenbetaling kan ikke være højere end samlet investering.";
    }

    if (Number(data.loebetid) > 50) {
      return "Løbetid kan maks være 50 år.";
    }

    if (data.afdragsfrihed !== "" && Number(data.afdragsfrihed) > 10) {
      return "Afdragsfri periode kan maks være 10 år.";
    }

    if (data.afdragsfrihed !== "" && Number(data.afdragsfrihed) > Number(data.loebetid)) {
      return "Afdragsfrihed kan ikke være længere end lånets løbetid.";
    }
  }

  if (trin === "udlejning" && data.aktiv && data.maanedligLeje === "") {
    return "Angiv forventet månedlig leje, også selvom tallet er 0.";
  }

  if (trin === "udlejning" && data.aktiv && Number(data.tomgangDage || 0) > 365) {
    return "Tomgang kan maks være 365 dage.";
  }

  return "";
}

function beregnFinansieringsOverblik(data) {
  const laanebeloeb = Number(data.laanebeloeb || 0);
  const hovedstol = Math.max(0, laanebeloeb);
  const rente = Number(data.rente || 0);
  const loebetid = Number(data.loebetid || 0);
  const afdragsfrihed = Math.max(0, Number(data.afdragsfrihed || 0));
  const antalMaaneder = loebetid * 12;

  if (hovedstol <= 0 || loebetid <= 0 || antalMaaneder <= 0) {
    return {
      maanedligYdelse: 0,
      maanedligYdelseEfterAfdragsfrihed: 0,
      samletRenteomkostning: 0,
      maanedligNote: "Beregnes når lånebeløb, rente og løbetid er udfyldt."
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
      maanedligYdelseEfterAfdragsfrihed: amortiseretYdelse,
      samletRenteomkostning: Math.max(0, samletRenteomkostning),
      maanedligNote: tilbagebetalingsMaaneder > 0
        ? `Beregnet ud fra lånebeløbet. Viser første ydelse i perioden med afdragsfrihed. Efter ${afdragsfrihed} år beregnes ydelsen ud fra restløbetiden.`
        : "Lånet er sat til fuld afdragsfrihed i hele perioden."
    };
  }

  const maanedligYdelse = maanedligRente === 0
    ? hovedstol / antalMaaneder
    : hovedstol * (maanedligRente / (1 - Math.pow(1 + maanedligRente, -antalMaaneder)));
  const samletRenteomkostning = (maanedligYdelse * antalMaaneder) - hovedstol;

  return {
    maanedligYdelse,
    maanedligYdelseEfterAfdragsfrihed: maanedligYdelse,
    samletRenteomkostning: Math.max(0, samletRenteomkostning),
    maanedligNote: "Viser den beregnede månedlige ydelse ud fra lånebeløb, rente, løbetid og afdragsfrihed."
  };
}

function opdaterFinansieringsBeregning() {
  const maanedligYdelseElement = document.getElementById("finansieringMaanedligYdelse");
  const efterAfdragsfrihedElement = document.getElementById("finansieringEfterAfdragsfrihed");
  const samletRenteElement = document.getElementById("finansieringSamletRente");
  const maanedligNoteElement = document.getElementById("finansieringMaanedligNote");
  const efterAfdragsfrihedNoteElement = document.getElementById("finansieringEfterAfdragsfrihedNote");
  const samletRenteNoteElement = document.getElementById("finansieringSamletRenteNote");

  if (!maanedligYdelseElement || !samletRenteElement || !efterAfdragsfrihedElement) {
    return;
  }

  const data = hentFormData("finansiering");
  const resultat = beregnFinansieringsOverblik(data);

  maanedligYdelseElement.textContent = formatKroner(resultat.maanedligYdelse);
  efterAfdragsfrihedElement.textContent = formatKroner(resultat.maanedligYdelseEfterAfdragsfrihed);
  samletRenteElement.textContent = formatKroner(resultat.samletRenteomkostning);

  if (maanedligNoteElement) {
    maanedligNoteElement.textContent = resultat.maanedligNote;
  }

  if (samletRenteNoteElement) {
    samletRenteNoteElement.textContent = "Viser den samlede renteudgift over hele lånets periode.";
  }

  if (efterAfdragsfrihedNoteElement) {
    efterAfdragsfrihedNoteElement.textContent = Number(hentFormData("finansiering").afdragsfrihed || 0) > 0
      ? "Viser den månedlige ydelse, når afdragene starter."
      : "Der er ingen afdragsfri periode i dette scenarie.";
  }
}

const standardVaerdierForLaanetype = {
  realkredit: {
    rente: 4.2,
    loebetid: 30,
    afdragsfrihed: 0
  },
  banklaan: {
    rente: 8,
    loebetid: 10,
    afdragsfrihed: 0
  },
  privat: {
    rente: "",
    loebetid: "",
    afdragsfrihed: ""
  }
};

let finansieringKoebsudgifterTotal = null;
let loebetidBlevBegraenset = false;
let afdragsfrihedBlevBegraenset = false;

function visEgenbetalingFejl(besked) {
  const fejl = document.getElementById("egenbetalingFejl");

  if (fejl) {
    fejl.textContent = besked || "";
  }
}

function visFeltFejl(id, besked) {
  const fejl = document.getElementById(id);

  if (fejl) {
    fejl.textContent = besked || "";
  }
}

function begrænsFinansieringAarFelt(felt) {
  const formatType = formatteredeCaseFelter[felt.dataset.caseField];
  const værdi = parseFormatteretFeltVaerdi(felt.value, formatType);

  if (Number.isNaN(værdi)) {
    return;
  }

  if (felt.dataset.caseField === "loebetid" && værdi > 50) {
    felt.value = formatFormatteretFeltVaerdi(50, "years");
    loebetidBlevBegraenset = true;
    visFeltFejl("loebetidFejl", "Løbetid kan maks være 50 år.");
  }

  if (felt.dataset.caseField === "afdragsfrihed" && værdi > 10) {
    felt.value = formatFormatteretFeltVaerdi(10, "years");
    afdragsfrihedBlevBegraenset = true;
    visFeltFejl("afdragsfrihedFejl", "Afdragsfri periode kan maks være 10 år.");
  }
}

function validerFinansieringAarInline() {
  const loebetidFelt = document.querySelector('[data-case-field="loebetid"]');
  const afdragsfrihedFelt = document.querySelector('[data-case-field="afdragsfrihed"]');

  if (!loebetidFelt || !afdragsfrihedFelt) {
    return;
  }

  const loebetid = parseFormatteretFeltVaerdi(loebetidFelt.value, "years");
  const afdragsfrihed = parseFormatteretFeltVaerdi(afdragsfrihedFelt.value, "years");

  if (!Number.isNaN(loebetid) && loebetid <= 50 && !loebetidBlevBegraenset) {
    visFeltFejl("loebetidFejl", "");
  }

  if (!Number.isNaN(afdragsfrihed) && afdragsfrihed <= 10 && !afdragsfrihedBlevBegraenset) {
    visFeltFejl("afdragsfrihedFejl", "");
  }

  if (!Number.isNaN(loebetid) && !Number.isNaN(afdragsfrihed) && afdragsfrihed > loebetid) {
    visFeltFejl("afdragsfrihedFejl", "Afdragsfri periode kan ikke være længere end løbetiden.");
  }

  loebetidBlevBegraenset = false;
  afdragsfrihedBlevBegraenset = false;
}

function hentKoebsudgifterTotal(data) {
  if (!data || typeof data !== "object") {
    return 0;
  }

  if (typeof data.total === "number" && !Number.isNaN(data.total)) {
    return data.total;
  }

  const poster = Array.isArray(data.poster) ? data.poster : [];
  return poster.reduce((sum, post) => sum + Number(post.beloeb || 0), 0);
}

function hentRenoveringTotal(data) {
  if (!data || typeof data !== "object" || data.aktiv === false) {
    return 0;
  }

  if (typeof data.total === "number" && !Number.isNaN(data.total)) {
    return data.total;
  }

  const poster = Array.isArray(data.poster) ? data.poster : [];
  return poster.reduce((sum, post) => sum + Number(post.beloeb || 0), 0);
}

function opdaterLaanebeloebFraEgenbetaling() {
  if (finansieringKoebsudgifterTotal === null) {
    return;
  }

  const egenbetalingFelt = document.querySelector('[data-case-field="egenbetaling"]');
  const laanebeloebFelt = document.querySelector('[data-case-field="laanebeloeb"]');

  if (!egenbetalingFelt || !laanebeloebFelt) {
    return;
  }

  const egenbetaling = parseFormatteretFeltVaerdi(egenbetalingFelt.value, "currency");
  const begrænsetEgenbetaling = Math.min(
    finansieringKoebsudgifterTotal,
    Math.max(0, Number.isNaN(egenbetaling) ? 0 : egenbetaling)
  );

  if (!Number.isNaN(egenbetaling) && egenbetaling !== begrænsetEgenbetaling) {
    egenbetalingFelt.value = formatFormatteretFeltVaerdi(begrænsetEgenbetaling, "currency");
    visEgenbetalingFejl("Egenbetaling kan ikke være højere end samlet investering.");
  } else {
    visEgenbetalingFejl("");
  }

  const laanebeloeb = Math.max(0, finansieringKoebsudgifterTotal - begrænsetEgenbetaling);
  laanebeloebFelt.value = formatFormatteretFeltVaerdi(laanebeloeb, "currency");
}

function anvendStandardVaerdierForLaanetype() {
  const laanetypeFelt = document.querySelector('[data-case-field="laanetype"]');
  const renteFelt = document.querySelector('[data-case-field="rente"]');
  const loebetidFelt = document.querySelector('[data-case-field="loebetid"]');
  const afdragsfrihedFelt = document.querySelector('[data-case-field="afdragsfrihed"]');

  if (!laanetypeFelt || !renteFelt || !loebetidFelt || !afdragsfrihedFelt) {
    return;
  }

  const standard = standardVaerdierForLaanetype[laanetypeFelt.value];

  if (!standard) {
    opdaterFinansieringsBeregning();
    return;
  }

  renteFelt.value = standard.rente === "" ? "" : formatFormatteretFeltVaerdi(standard.rente, "percent");
  loebetidFelt.value = standard.loebetid === "" ? "" : formatFormatteretFeltVaerdi(standard.loebetid, "years");
  afdragsfrihedFelt.value = standard.afdragsfrihed === "" ? "" : formatFormatteretFeltVaerdi(standard.afdragsfrihed, "years");
  opdaterFinansieringsBeregning();
}

async function hentGemtTrinData(caseID, trin) {
  const response = await fetch(`/api/investeringscases/${caseID}/trin/${trin}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Kunne ikke hente trindata.");
  }

  return result.data;
}

async function gemTrinData(caseID, trin, data) {
  const response = await fetch(`/api/investeringscases/${caseID}/trin/${trin}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      data
    })
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Kunne ikke gemme trindata.");
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

function bindDriftsbudgetInteraktioner() {
  const driftspostListe = document.getElementById("driftspostListe");
  const tilfoejDriftspost = document.getElementById("tilfoejDriftspostKnap");

  if (driftspostListe && !driftspostListe.dataset.bound) {
    driftspostListe.dataset.bound = "true";

    driftspostListe.addEventListener("input", (event) => {
      const beloebInput = event.target.closest(".driftspost-beloeb");

      if (beloebInput) {
        formatterKronerInput(beloebInput);
      }

      opdaterDriftsbudgetTotal();
    });

    driftspostListe.addEventListener("change", (event) => {
      if (event.target.closest(".driftspost-periode")) {
        opdaterDriftsbudgetTotal();
      }
    });

    driftspostListe.addEventListener("focusout", (event) => {
      const beloebInput = event.target.closest(".driftspost-beloeb");

      if (beloebInput) {
        formatterKronerInput(beloebInput);
      }

      opdaterDriftsbudgetTotal();
    });

    driftspostListe.addEventListener("click", (event) => {
      const knap = event.target.closest(".fjern-driftspost-knap");

      if (!knap) {
        return;
      }

      knap.closest(".driftspost-række").remove();
      opdaterDriftsbudgetTotal();
    });
  }

  if (tilfoejDriftspost && !tilfoejDriftspost.dataset.bound) {
    tilfoejDriftspost.dataset.bound = "true";
    tilfoejDriftspost.addEventListener("click", () => {
      lavDriftspostRække({ periode: "maanedligt" });
      opdaterDriftsbudgetTotal();
    });
  }
}

function bindCaseTrinSubmit(form, trin, valgtCase) {
  if (form.dataset.submitBound) {
    return;
  }

  form.dataset.submitBound = "true";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    visFormFejl("");
    visFormStatus("Gemmer...");

    const trykketKnap = event.submitter || document.activeElement || form.querySelector('[type="submit"]');
    const handling = trykketKnap?.dataset?.action || "save";
    const data = hentFormData(trin);
    const fejl = validerForm(trin, data);

    if (fejl) {
      visFormStatus("");
      visFormFejl(fejl);
      return;
    }

    try {
      await gemTrinData(valgtCase.caseID, trin, data);
      visFormStatus("Gemt.");

      if (handling === "next") {
        window.location.href = trykketKnap?.dataset?.href || caseTrinSide[trin]?.naeste || "caseOverblik.html";
        return;
      }

      if (handling === "overview" || handling === "save") {
        window.location.href = "caseOverblik.html";
      }
    } catch (error) {
      console.error("Fejl ved gem af trindata:", error);
      visFormStatus("");
      visFormFejl(error.message);
    }
  });
}

async function bindInvesteringscaseTrinForm() {
  const form = document.getElementById("caseTrinForm");

  if (!form) {
    return;
  }

  const trin = form.dataset.trin;
  const valgtCase = hentValgtInvesteringscase();

  if (!valgtCase || !valgtCase.caseID) {
    window.location.href = "/investeringscase.html";
    return;
  }

  visCaseHeader(valgtCase, trin);
  bindTrinNavigation(trin);
  bindCaseTrinSubmit(form, trin, valgtCase);

  if (trin === "driftsbudget") {
    bindDriftsbudgetInteraktioner();
  }

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
        if (felt.dataset.caseField === "egenbetaling") {
          opdaterLaanebeloebFraEgenbetaling();
        }
        if (felt.dataset.caseField === "loebetid" || felt.dataset.caseField === "afdragsfrihed") {
          begrænsFinansieringAarFelt(felt);
          validerFinansieringAarInline();
        }
        opdaterFinansieringsBeregning();
      }
    });

    felt.addEventListener("focusout", () => {
      formatterCaseFeltInput(felt);
      if (trin === "finansiering") {
        if (felt.dataset.caseField === "egenbetaling") {
          opdaterLaanebeloebFraEgenbetaling();
        }
        if (felt.dataset.caseField === "loebetid" || felt.dataset.caseField === "afdragsfrihed") {
          begrænsFinansieringAarFelt(felt);
          validerFinansieringAarInline();
        }
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
    const gemtData = await hentGemtTrinData(valgtCase.caseID, trin);
    udfyldForm(trin, gemtData);

    if (trin === "finansiering") {
      const koebsudgifterData = await hentGemtTrinData(valgtCase.caseID, "koebsudgifter");
      const renoveringData = await hentGemtTrinData(valgtCase.caseID, "renovering");
      finansieringKoebsudgifterTotal = hentKoebsudgifterTotal(koebsudgifterData) + hentRenoveringTotal(renoveringData);
      opdaterLaanebeloebFraEgenbetaling();
    }

  } catch (error) {
    console.error("Fejl ved hentning af trindata:", error);
    udfyldForm(trin, null);
    visFormFejl(error.message);
  }

  const liste = document.getElementById("koebspostListe");
  const tilfoej = document.getElementById("tilfoejKoebspostKnap");
  const renoveringsliste = document.getElementById("renoveringspostListe");
  const tilfoejRenovering = document.getElementById("tilfoejRenoveringspostKnap");
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

      const række = knap.closest(".koebspost-række");

      if (række.dataset.fast === "true") {
        return;
      }

      række.remove();
      opdaterKoebspostTotal();
    });
  }

  if (tilfoej) {
    tilfoej.addEventListener("click", () => {
      lavKoebspostRække();
      opdaterKoebspostTotal();
    });
  }

  if (renoveringsliste) {
    renoveringsliste.addEventListener("input", (event) => {
      const beloebInput = event.target.closest(".renoveringspost-beloeb");

      if (beloebInput) {
        formatterKronerInput(beloebInput);
      }

      opdaterRenoveringTotal();
    });

    renoveringsliste.addEventListener("focusout", (event) => {
      const beloebInput = event.target.closest(".renoveringspost-beloeb");

      if (beloebInput) {
        formatterKronerInput(beloebInput);
      }

      opdaterRenoveringTotal();
    });

    renoveringsliste.addEventListener("click", (event) => {
      const knap = event.target.closest(".fjern-renoveringspost-knap");

      if (!knap) {
        return;
      }

      knap.closest(".renoveringspost-række").remove();
      opdaterRenoveringTotal();
    });
  }

  if (tilfoejRenovering) {
    tilfoejRenovering.addEventListener("click", () => {
      lavRenoveringspostRække();
      opdaterRenoveringTotal();
    });
  }

  const renoveringAktiv = document.getElementById("renoveringAktiv");

  if (trin === "renovering" && renoveringAktiv) {
    renoveringAktiv.addEventListener("change", () => {
      syncRenoveringKort(renoveringAktiv.checked);
      visRenoveringDetaljer(renoveringAktiv.checked);
      opdaterRenoveringTotal();
    });

    const jaKort = document.getElementById("renoveringJaKort");
    const nejKort = document.getElementById("renoveringNejKort");

    jaKort?.addEventListener("click", () => {
      renoveringAktiv.checked = true;
      syncRenoveringKort(true);
      visRenoveringDetaljer(true);
      opdaterRenoveringTotal();
    });

    nejKort?.addEventListener("click", () => {
      renoveringAktiv.checked = false;
      syncRenoveringKort(false);
      visRenoveringDetaljer(false);
      opdaterRenoveringTotal();
    });
  }

  const udlejningAktiv = document.getElementById("udlejningAktiv");

  if (trin === "udlejning" && udlejningAktiv) {
    document.querySelectorAll("[data-case-field]").forEach((felt) => {
      felt.addEventListener("input", opdaterUdlejningOverblik);
      felt.addEventListener("focusout", opdaterUdlejningOverblik);
    });

    udlejningAktiv.addEventListener("change", () => {
      syncUdlejningKort(udlejningAktiv.checked);
      visUdlejningDetaljer(udlejningAktiv.checked);
      opdaterUdlejningOverblik();
    });

    const udlejningJaKort = document.getElementById("udlejningJaKort");
    const udlejningNejKort = document.getElementById("udlejningNejKort");

    udlejningJaKort?.addEventListener("click", () => {
      udlejningAktiv.checked = true;
      syncUdlejningKort(true);
      visUdlejningDetaljer(true);
      opdaterUdlejningOverblik();
    });

    udlejningNejKort?.addEventListener("click", () => {
      udlejningAktiv.checked = false;
      syncUdlejningKort(false);
      visUdlejningDetaljer(false);
      opdaterUdlejningOverblik();
    });
  }

  const laanetypeFelt = document.querySelector('[data-case-field="laanetype"]');

  if (trin === "finansiering" && laanetypeFelt) {
    laanetypeFelt.addEventListener("change", () => {
      anvendStandardVaerdierForLaanetype();
    });
  }

  if (trin === "finansiering") {
    opdaterLaanebeloebFraEgenbetaling();
    validerFinansieringAarInline();
    opdaterFinansieringsBeregning();
  }

  if (forrigeLink) {
    forrigeLink.addEventListener("click", async (event) => {
      event.preventDefault();

      try {
        const data = hentFormData(trin);
        await gemTrinData(valgtCase.caseID, trin, data);
        window.location.href = forrigeLink.href;
      } catch (error) {
        console.error("Fejl ved gem før navigation til forrige trin:", error);
        visFormFejl("Kunne ikke gemme dine oplysninger før navigation til forrige trin.");
      }
    });
  }

}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
