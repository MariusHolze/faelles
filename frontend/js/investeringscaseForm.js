const caseTrinSide = {
  koebsudgifter: {
    titel: "Køb og renoveringsudgifter",
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

  if (titel) {
    titel.textContent = caseTrinSide[trin].titel;
  }

  if (info) {
    info.textContent = `${caseData.navn || "Valgt case"} · ${caseData.adresse || "Ingen adresse"}`;
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

function lavKoebspostRække(navn = "", beloeb = "") {
  const liste = document.getElementById("koebspostListe");

  if (!liste) {
    return;
  }

  const div = document.createElement("div");
  div.className = "koebspost-række";
  div.innerHTML = `
    <input class="koebspost-navn" type="text" maxlength="100" placeholder="Navn på udgift" value="${escapeHtml(navn)}">
    <input class="koebspost-beloeb" type="number" min="0" step="100" placeholder="Beløb i kr." value="${escapeHtml(String(beloeb))}">
    <button class="fjern-koebspost-knap" type="button">Fjern</button>
  `;

  liste.appendChild(div);
}

function hentKoebsposter() {
  return Array.from(document.querySelectorAll(".koebspost-række"))
    .map((række) => ({
      navn: række.querySelector(".koebspost-navn").value.trim(),
      beloeb: Number(række.querySelector(".koebspost-beloeb").value)
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

    if (felt.type === "number") {
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
      lavKoebspostRække("Ejendomspris", "");
      lavKoebspostRække("Advokat", "");
      lavKoebspostRække("Tinglysning", "");
      opdaterKoebspostTotal();
    }
    return;
  }

  if (trin === "koebsudgifter") {
    const poster = Array.isArray(data.poster) ? data.poster : [];

    if (poster.length === 0) {
      lavKoebspostRække("Ejendomspris", "");
    } else {
      poster.forEach((post) => lavKoebspostRække(post.navn, post.beloeb));
    }

    opdaterKoebspostTotal();
    return;
  }

  document.querySelectorAll("[data-case-field]").forEach((felt) => {
    const navn = felt.dataset.caseField;

    if (data[navn] !== undefined && data[navn] !== null) {
      felt.value = data[navn];
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

  if (liste) {
    liste.addEventListener("input", opdaterKoebspostTotal);
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
