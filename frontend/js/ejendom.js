function bindEjendomForm() {
  const form = document.getElementById("ejendomForm"); // finder formularen til opret ejendom

  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault(); // stopper reload

    const bruger = hentLoggetIndBruger(); // henter den loggede bruger

    if (!bruger) {
      window.location.href = "login.html"; // sender til login hvis ingen bruger findes
      return;
    }

    const adresse = document.getElementById("adresse").value;
    const boligtype = document.getElementById("boligtype").value;
    const boligareal = document.getElementById("boligareal").value;
    const besked = document.getElementById("ejendomBesked"); // sted til fejl eller succes

    if (besked) {
      besked.textContent = ""; // rydder gammel tekst
    }

    try {
      const response = await fetch("/api/ejendomme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          adresse,
          boligtype,
          boligareal,
          ownerEmail: bruger.email
        }) // sender ejendomsdata til backend
      });

      const data = await response.json();

      if (!response.ok) {
        if (besked) {
          besked.textContent = data.message || "Fejl ved oprettelse";
        }
        return;
      }

      if (besked) {
        besked.textContent = "Ejendom oprettet"; // viser succesbesked
      }

      form.reset(); // tømmer formularen
      hentEjendomme(); // opdaterer listen bagefter
    } catch (error) {
      console.error("Fejl ved oprettelse af ejendom:", error);

      if (besked) {
        besked.textContent = "Server fejl";
      }
    }
  });
}

async function hentEjendomme() {
  const bruger = hentLoggetIndBruger(); // henter bruger fra localStorage
  const liste = document.getElementById("ejendomListe"); // stedet hvor listen vises

  if (!liste) return;

  if (!bruger) {
    liste.innerHTML = "<li>Du skal være logget ind</li>"; // besked hvis ingen bruger er logget ind
    return;
  }

  liste.innerHTML = "<li>Henter ejendomme...</li>"; // midlertidig tekst mens data hentes

  try {
    const response = await fetch(`/api/ejendomme?email=${encodeURIComponent(bruger.email)}`); // henter brugerens ejendomme
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
        Oprettet: ${new Date(ejendom.oprettetTidspunkt).toLocaleDateString()}<br>
        Cases: ${ejendom.antalCases}
      `;
      liste.appendChild(li);
    });
  } catch (error) {
    console.error("Fejl ved hentning af ejendomme:", error);
    liste.innerHTML = "<li>Server fejl</li>";
  }
}