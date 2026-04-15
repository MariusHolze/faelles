function bindEjendomForm() {
  const form = document.getElementById("ejendomForm");

  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const bruger = hentLoggetIndBruger();

    if (!bruger) {
      window.location.href = "login.html";
      return;
    }

    const adresse = document.getElementById("adresse").value;
    const boligtype = document.getElementById("boligtype").value;
    const boligareal = document.getElementById("boligareal").value;
    const besked = document.getElementById("ejendomBesked");

    if (besked) {
      besked.textContent = "";
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
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (besked) {
          besked.textContent = data.message || "Fejl ved oprettelse";
        }
        return;
      }

      if (besked) {
        besked.textContent = "Ejendom oprettet";
      }

      form.reset();
      hentEjendomme();

    } catch (error) {
      console.error("Fejl ved oprettelse af ejendom:", error);

      if (besked) {
        besked.textContent = "Server fejl";
      }
    }
  });
}

async function hentEjendomme() {
  const bruger = hentLoggetIndBruger();
  const liste = document.getElementById("ejendomListe");

  if (!liste) return;

  if (!bruger) {
    liste.innerHTML = "<li>Du skal være logget ind</li>";
    return;
  }

  liste.innerHTML = "<li>Henter ejendomme...</li>";

  try {
    const response = await fetch(`/api/ejendomme?email=${encodeURIComponent(bruger.email)}`);
    const data = await response.json();

    if (!response.ok) {
      liste.innerHTML = "<li>Fejl ved hentning</li>";
      return;
    }

    if (data.length === 0) {
      liste.innerHTML = "<li>Ingen ejendomme endnu</li>";
      return;
    }

    liste.innerHTML = "";

    data.forEach((ejendom) => {
      const li = document.createElement("li");
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