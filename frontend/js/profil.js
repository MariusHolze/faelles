function visProfil() {
  const fornavnElement = document.getElementById("profilFornavn");
  const efternavnElement = document.getElementById("profilEfternavn");
  const emailElement = document.getElementById("profilEmail");

  if (!fornavnElement || !efternavnElement || !emailElement) {
    return; // stop hvis det ikke er profilsiden
  }

  const bruger = hentLoggetIndBruger(); // henter gemt bruger

  if (!bruger) {
    window.location.href = "login.html"; // sender til login hvis ingen bruger findes
    return;
  }

  fornavnElement.textContent = bruger.fornavn || ""; // viser fornavn
  efternavnElement.textContent = bruger.efternavn || ""; // viser efternavn
  emailElement.textContent = bruger.email || ""; // viser email
}

async function hentProfilEjendomme() {
  const liste = document.getElementById("profilEjendomListe"); // område til ejendomme på profilsiden

  if (!liste) {
    return;
  }

  const bruger = hentLoggetIndBruger(); // henter logget ind bruger

  if (!bruger) {
    return;
  }

  liste.innerHTML = "Loader..."; // tekst mens data hentes

  try {
    const response = await fetch(`/api/ejendomme?email=${encodeURIComponent(bruger.email)}`); // henter brugerens ejendomme
    const data = await response.json();

    if (!response.ok) {
      liste.innerHTML = "Fejl ved hentning";
      return;
    }

    if (data.length === 0) {
      liste.innerHTML = "<p>Ingen ejendomme endnu</p>"; // besked hvis ingen findes
      return;
    }

    liste.innerHTML = ""; // rydder området

    data.forEach((ejendom) => {
      const div = document.createElement("div"); // laver en boks til hver ejendom
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