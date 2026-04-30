async function hentProfilEjendomme(
  liste = document.getElementById("profilEjendomListe"),
  antalElement = document.getElementById("profilEjendomAntal")
) {
  if (!liste) {
    return;
  }

  liste.innerHTML = "Loader...";

  if (antalElement) {
    antalElement.textContent = "Henter...";
  }

  try {
    const response = await fetch("/api/ejendomme");
    const ejendomme = await response.json();

    if (!response.ok) {
      visProfilEjendomFejl(liste, antalElement);
      return;
    }

    if (ejendomme.length === 0) {
      visTomProfilEjendomme(liste, antalElement);
      return;
    }

    liste.innerHTML = "";
    opdaterProfilEjendomAntal(antalElement, ejendomme.length);

    ejendomme.forEach((ejendom) => {
      const kort = lavEjendomKort(ejendom);
      bindEjendomKort(kort, ejendom);
      liste.appendChild(kort);
    });
  } catch (error) {
    console.error("Fejl ved hentning af profil-ejendomme:", error);
    visProfilEjendomFejl(liste, antalElement);
  }
}

function visTomProfilEjendomme(liste, antalElement) {
  liste.innerHTML = `
    <div class="tom-tilstand">
      <h3>Ingen ejendomsprofiler endnu</h3>
      <p>Søg efter en dansk adresse på forsiden for at oprette din første ejendomsprofil.</p>
      <a class="knap" href="index.html">Find ejendom</a>
    </div>
  `;

  if (antalElement) {
    antalElement.textContent = "0 ejendomme";
  }
}

function visProfilEjendomFejl(liste, antalElement) {
  liste.innerHTML = "Fejl ved hentning";

  if (antalElement) {
    antalElement.textContent = "Kunne ikke hente";
  }
}

function opdaterProfilEjendomAntal(antalElement, antal) {
  if (!antalElement) {
    return;
  }

  antalElement.textContent = `${antal} ${antal === 1 ? "ejendom" : "ejendomme"}`;
}

function lavEjendomKort(ejendom) {
  const div = document.createElement("div");
  div.classList.add("ejendom-kort");
  div.innerHTML = hentEjendomKortHtml(ejendom);
  return div;
}

function hentEjendomKortHtml(ejendom) {
  return `
    <div class="ejendom-kort-top">
      <div>
        <p class="eyebrow">${formatAdresseDel(ejendom.postnr, ejendom.bynavn)}</p>
        <h3>${formatVaerdi(ejendom.adresse)}</h3>
      </div>
      <span class="case-badge">${ejendom.antalCases || 0} ${Number(ejendom.antalCases) === 1 ? "case" : "cases"}</span>
    </div>

    <dl class="ejendom-data-grid">
      <div>
        <dt>Boligtype</dt>
        <dd>${formatVaerdi(ejendom.boligtype)}</dd>
      </div>
      <div>
        <dt>Byggeår</dt>
        <dd>${formatVaerdi(ejendom.byggeaar)}</dd>
      </div>
      <div>
        <dt>Boligareal</dt>
        <dd>${formatAreal(ejendom.boligareal)}</dd>
      </div>
      <div>
        <dt>Grundareal</dt>
        <dd>${formatAreal(ejendom.grundareal)}</dd>
      </div>
      <div>
        <dt>Værelser</dt>
        <dd>${formatVaerdi(ejendom.antalVaerelser)}</dd>
      </div>
      <div>
        <dt>Oprettet</dt>
        <dd>${formatDato(ejendom.oprettetTidspunkt)}</dd>
      </div>
      <div>
        <dt>Sidst hentet</dt>
        <dd>${formatDato(ejendom.sidstOpdateret)}</dd>
      </div>
    </dl>

    <div class="ejendom-kort-footer">
      ${hentKortdataKnapHtml({
        adresseID: ejendom.adresseID,
        adgangsadresseID: ejendom.adgangsadresseID,
        adresse: ejendom.adresse,
        disabled: !ejendom.adresseID && !ejendom.adgangsadresseID
      })}
    </div>

    <div class="ejendom-knapper">
      <button class="knap slet-knap slet-ejendom-fra-profil" type="button">Slet ejendom</button>
    </div>
  `;
}

function bindEjendomKort(kort, ejendom) {
  const sletEjendomKnap = kort.querySelector(".slet-ejendom-fra-profil");
  sletEjendomKnap.addEventListener("click", async () => {
    await sletEjendomFraProfil(ejendom);
  });
}

// Sletter en ejendomsprofil fra profilsiden.
async function sletEjendomFraProfil(ejendom) {
  const erSikker = confirm("Er du sikker på, at du vil slette denne ejendomsprofil? Alle tilknyttede investeringscases bliver også slettet.");

  if (!erSikker) {
    return;
  }

  try {
    const response = await fetch(`/api/ejendomme/${ejendom.id}`, {
      method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Kunne ikke slette ejendom.");
      return;
    }

    await hentProfilEjendomme();
    alert(data.message || "Ejendom slettet.");
  } catch (error) {
    console.error("Fejl ved sletning af ejendom:", error);
    alert("Serverfejl ved sletning af ejendom.");
  }
}

function formatVaerdi(value) {
  if (value === null || value === undefined || value === "") {
    return '<span class="mangler-data">Mangler data</span>';
  }

  return escapeHtml(String(value));
}

function formatAreal(value) {
  if (value === null || value === undefined || value === "") {
    return '<span class="mangler-data">Mangler data</span>';
  }

  return `${Number(value).toLocaleString("da-DK")} m2`;
}

function formatDato(value) {
  if (!value) {
    return '<span class="mangler-data">Mangler data</span>';
  }

  return new Date(value).toLocaleDateString("da-DK");
}

function formatAdresseDel(postnr, bynavn) {
  const post = [postnr, bynavn].filter(Boolean).join(" ");
  return escapeHtml(post || "Adresse");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
