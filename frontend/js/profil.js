function visProfil() {
  const fornavnElement = document.getElementById("profilFornavn");
  const efternavnElement = document.getElementById("profilEfternavn");
  const emailElement = document.getElementById("profilEmail");

  if (!fornavnElement || !efternavnElement || !emailElement) {
    return;
  }

  const bruger = hentLoggetIndBruger();

  if (!bruger) {
    window.location.href = "login.html";
    return;
  }

  fornavnElement.textContent = bruger.fornavn || "";
  efternavnElement.textContent = bruger.efternavn || "";
  emailElement.textContent = bruger.email || "";
}

async function hentProfilEjendomme() {
  const liste = document.getElementById("profilEjendomListe");

  if (!liste) {
    return;
  }

  const bruger = hentLoggetIndBruger();

  if (!bruger) {
    return;
  }

  liste.innerHTML = "Loader...";

  try {
    const response = await fetch(`/api/ejendomme?email=${encodeURIComponent(bruger.email)}`);
    const data = await response.json();

    if (!response.ok) {
      liste.innerHTML = "Fejl ved hentning";
      return;
    }

    if (data.length === 0) {
      liste.innerHTML = "<p>Ingen ejendomme endnu</p>";
      return;
    }

    liste.innerHTML = "";

    data.forEach((ejendom) => {
      const div = document.createElement("div");
      div.classList.add("ejendom-kort");

      div.innerHTML = `
        <p><strong>${ejendom.adresse}</strong></p>
        <p>Oprettet: ${new Date(ejendom.oprettetTidspunkt).toLocaleDateString()}</p>
        <p>Cases: ${ejendom.antalCases}</p>
      `;

      liste.appendChild(div);
    });

  } catch (error) {
    console.error("Fejl ved hentning af profil-ejendomme:", error);
    liste.innerHTML = "Server fejl";
  }
}