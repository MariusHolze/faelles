async function hentEjendomme() {
  const liste = document.getElementById("ejendomListe"); // stedet hvor listen vises

  if (!liste) return;

  liste.innerHTML = "<li>Henter ejendomme...</li>"; // midlertidig tekst mens data hentes

  try {
    const response = await fetch("/api/ejendomme"); // henter gemte ejendomme
    const data = await response.json();

    if (!response.ok) {
      liste.innerHTML = "<li>Fejl ved hentning</li>";
      return;
    }

    if (data.length === 0) {
      liste.innerHTML = "<li>Ingen ejendomme endnu</li>"; // besked hvis listen er tom
      return;
    }

    liste.innerHTML = ""; // rydder listen før nye elementer laves

    data.forEach((ejendom) => {
      const li = document.createElement("li"); // laver ét listepunkt pr. ejendom
      li.innerHTML = `
        <strong>${ejendom.adresse}</strong><br>
        Boligareal: ${ejendom.boligareal ? `${ejendom.boligareal} m2` : "Mangler data"}<br>
        Grundareal: ${ejendom.grundareal ? `${ejendom.grundareal} m2` : "Mangler data"}<br>
        Oprettet: ${new Date(ejendom.oprettetTidspunkt).toLocaleDateString()}<br>
        Cases: ${ejendom.antalCases}<br>
        ${hentKortdataKnapHtml({
          adresseID: ejendom.adresseID,
          adgangsadresseID: ejendom.adgangsadresseID,
          adresse: ejendom.adresse,
          disabled: !ejendom.adresseID && !ejendom.adgangsadresseID
        })}
      `;
      liste.appendChild(li);
    });
  } catch (error) {
    console.error("Fejl ved hentning af ejendomme:", error);
    liste.innerHTML = "<li>Server fejl</li>";
  }
}
