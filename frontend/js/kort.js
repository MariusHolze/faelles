let kortInstans = null;
let valgtKortBaggrund = "orto_foraar";
let okapiErIndlaest = false;

function hentKortdataKnapHtml({
  adresseID = "",
  adgangsadresseID = "",
  adresse = "",
  disabled = false
} = {}) {
  const disabledAttr = disabled ? "disabled" : "";
  const sikkerAdresse = escapeHtml(adresse || "");

  return `
    <button
      type="button"
      class="knap kortdata-knap"
      data-kort-adresse-id="${adresseID}"
      data-kort-adgangsadresse-id="${adgangsadresseID}"
      data-kort-adresse="${sikkerAdresse}"
      ${disabledAttr}
    >
      Kortdata
    </button>
  `;
}

function opretKortModalHvisMangler() {
  if (document.getElementById("kortdataModal")) {
    return;
  }

  const modal = document.createElement("div");
  modal.id = "kortdataModal";
  modal.className = "kortdata-modal skjult";
  modal.innerHTML = `
    <div class="kortdata-backdrop" data-kort-close="true"></div>
    <div class="kortdata-panel" role="dialog" aria-modal="true" aria-labelledby="kortdataTitel">
      <button type="button" class="kortdata-luk" id="kortdataLukKnap" aria-label="Luk kortvisning">×</button>
      <div class="kortdata-header">
        <div>
          <p class="eyebrow">Kort data</p>
          <h2 id="kortdataTitel">Satellitkort og matrikelkort</h2>
          <p id="kortdataAdresse" class="kortdata-adresse"></p>
        </div>
        <div class="kortdata-skift">
          <button type="button" class="kortdata-visning aktiv" data-kort-visning="orto_foraar">Satellitkort</button>
          <button type="button" class="kortdata-visning" data-kort-visning="dtk_skaermkort_daempet">Matrikelkort</button>
        </div>
      </div>
      <div id="kortdataFeedback" class="kortdata-feedback">Henter kortdata...</div>
      <div id="kortdataMapWrapper" class="kortdata-map-wrapper skjult">
        <div id="kortdataMap" class="kortdata-map"></div>
        <div id="kortdataMeta" class="kortdata-meta"></div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function visKortFeedback(besked, erFejl = false) {
  const feedback = document.getElementById("kortdataFeedback");
  const wrapper = document.getElementById("kortdataMapWrapper");

  if (!feedback || !wrapper) {
    return;
  }

  feedback.textContent = besked;
  feedback.classList.toggle("fejl", erFejl);
  feedback.classList.remove("skjult");
  wrapper.classList.add("skjult");
}

function visKortOmraade() {
  const feedback = document.getElementById("kortdataFeedback");
  const wrapper = document.getElementById("kortdataMapWrapper");

  if (!feedback || !wrapper) {
    return;
  }

  feedback.classList.add("skjult");
  feedback.classList.remove("fejl");
  wrapper.classList.remove("skjult");
}

function opdaterKortMeta(data) {
  const meta = document.getElementById("kortdataMeta");

  if (!meta) {
    return;
  }

  const matrikelnr = data.jordstykke?.matrikelnr || "Ikke fundet";
  const ejerlav = data.jordstykke?.ejerlavnavn || "Ikke fundet";
  const koordinater = Array.isArray(data.koordinater)
    ? `${data.koordinater[1].toFixed(6)}, ${data.koordinater[0].toFixed(6)}`
    : "Ikke fundet";

  meta.innerHTML = `
    <div class="kortdata-meta-kort">
      <span>Matrikelnummer</span>
      <strong>${escapeHtml(matrikelnr)}</strong>
    </div>
    <div class="kortdata-meta-kort">
      <span>Ejerlav</span>
      <strong>${escapeHtml(ejerlav)}</strong>
    </div>
    <div class="kortdata-meta-kort">
      <span>Koordinater</span>
      <strong>${escapeHtml(koordinater)}</strong>
    </div>
  `;
}

function opdaterVisningsKnapper() {
  const knapper = document.querySelectorAll("[data-kort-visning]");

  knapper.forEach((knap) => {
    knap.classList.toggle("aktiv", knap.dataset.kortVisning === valgtKortBaggrund);
  });
}

async function indlaesOkapiHvisNoedvendigt() {
  if (okapiErIndlaest && window.okapi && window.ol) {
    return;
  }

  if (!document.querySelector('link[data-kort-okapi="true"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://okapi.dataforsyningen.dk/lib/okapi-1.6.0.min.css";
    link.dataset.kortOkapi = "true";
    document.head.appendChild(link);
  }

  await new Promise((resolve, reject) => {
    if (window.okapi && window.ol) {
      okapiErIndlaest = true;
      resolve();
      return;
    }

    const eksisterendeScript = document.querySelector('script[data-kort-okapi="true"]');

    if (eksisterendeScript) {
      eksisterendeScript.addEventListener("load", () => {
        okapiErIndlaest = true;
        resolve();
      }, { once: true });
      eksisterendeScript.addEventListener("error", () => {
        reject(new Error("Kunne ikke indlæse kortbiblioteket"));
      }, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://okapi.dataforsyningen.dk/lib/okapi-1.6.0.min.js";
    script.async = true;
    script.dataset.kortOkapi = "true";
    script.onload = () => {
      okapiErIndlaest = true;
      resolve();
    };
    script.onerror = () => {
      reject(new Error("Kunne ikke indlæse kortbiblioteket"));
    };
    document.head.appendChild(script);
  });
}

async function hentKortData(adresseID, adgangsadresseID) {
  const params = new URLSearchParams();

  if (adresseID) {
    params.set("adresseID", adresseID);
  }

  if (adgangsadresseID) {
    params.set("adgangsadresseID", adgangsadresseID);
  }

  const response = await fetch(`/api/kort/ejendom?${params.toString()}`);
  const tekst = await response.text();
  let data = {};

  try {
    data = tekst ? JSON.parse(tekst) : {};
  } catch (error) {
    throw new Error("Backend svarede ikke med JSON");
  }

  if (!response.ok) {
    throw new Error(data.message || "Kunne ikke hente kortdata");
  }

  return data;
}

function opretKort(token, koordinater) {
  const mapElement = document.getElementById("kortdataMap");

  if (!mapElement) {
    return null;
  }

  mapElement.innerHTML = `
    <div
      id="kortdataMapCanvas"
      class="geomap"
      data-token="${escapeHtml(token)}"
      data-center-lat="${koordinater[1]}"
      data-center-lon="${koordinater[0]}"
      data-zoom="18"
      data-background="${valgtKortBaggrund}"
      data-mylocation="false"
      data-fullscreen="false"
      data-zoomslider="true"
      data-layerswitcher="false"
      data-scaleline="false"
      data-mousewheelzoom="true"
      style="height: 100%; width: 100%;"
    ></div>
  `;

  const maps = new window.okapi.Initialize({});
  return maps.maps[0];
}

function tegnMatrikel(kort, data) {
  if (!kort || !window.ol) {
    return;
  }

  const geojson = {
    type: "FeatureCollection",
    features: []
  };

  if (data.jordstykke?.geojson) {
    geojson.features.push(data.jordstykke.geojson);
  }

  if (Array.isArray(data.koordinater)) {
    geojson.features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: data.koordinater
      }
    });
  }

  const format = new window.ol.format.GeoJSON();
  const features = format.readFeatures(geojson, {
    dataProjection: "EPSG:4326",
    featureProjection: "EPSG:25832"
  });

  const source = new window.ol.source.Vector({
    features
  });

  const style = (feature) => {
    if (feature.getGeometry()?.getType() === "Point") {
      return new window.ol.style.Style({
        image: new window.ol.style.Circle({
          radius: 7,
          fill: new window.ol.style.Fill({ color: "#1f6b4a" }),
          stroke: new window.ol.style.Stroke({ color: "#ffffff", width: 2 })
        })
      });
    }

    return new window.ol.style.Style({
      stroke: new window.ol.style.Stroke({
        color: "#0f4c81",
        width: 3
      }),
      fill: new window.ol.style.Fill({
        color: "rgba(47, 111, 168, 0.12)"
      })
    });
  };

  kort.addVectorLayer(source, style, "matrikelafgraensning");

  if (!source.isEmpty()) {
    kort.olMap.getView().fit(source.getExtent(), {
      padding: [48, 48, 48, 48],
      maxZoom: 19,
      duration: 250
    });
  }
}

function lukKortdataModal() {
  const modal = document.getElementById("kortdataModal");
  const mapElement = document.getElementById("kortdataMap");

  if (modal) {
    modal.classList.add("skjult");
  }

  if (mapElement) {
    mapElement.innerHTML = "";
  }

  document.body.classList.remove("modal-aaben");
  kortInstans = null;
}

async function visKortdataModal(adresseID, adgangsadresseID, adresse) {
  const modal = document.getElementById("kortdataModal");
  const adresseElement = document.getElementById("kortdataAdresse");

  if (!modal || (!adresseID && !adgangsadresseID)) {
    return;
  }

  valgtKortBaggrund = "orto_foraar";
  opdaterVisningsKnapper();
  if (adresseElement) {
    adresseElement.textContent = adresse || "";
  }

  modal.classList.remove("skjult");
  document.body.classList.add("modal-aaben");
  visKortFeedback("Henter kortdata...");

  try {
    const data = await hentKortData(adresseID, adgangsadresseID);

    if (!data.kort?.dataforsyningenToken) {
      visKortFeedback("Korttoken mangler i backend/.env. Tilfoej DATAFORSYNINGEN_MAP_TOKEN for at vise kortet.", true);
      return;
    }

    if (!Array.isArray(data.koordinater)) {
      visKortFeedback("Der blev ikke fundet koordinater for adressen.", true);
      return;
    }

    await indlaesOkapiHvisNoedvendigt();
    visKortOmraade();
    opdaterKortMeta(data);

    await new Promise((resolve) => {
      window.requestAnimationFrame(resolve);
    });

    kortInstans = opretKort(data.kort.dataforsyningenToken, data.koordinater);
    tegnMatrikel(kortInstans, data);

    if (kortInstans?.olMap) {
      kortInstans.olMap.updateSize();
    }
  } catch (error) {
    console.error("Fejl ved visning af kortdata:", error);
    visKortFeedback(error.message || "Server fejl ved hentning af kortdata.", true);
  }
}

function bindKortdataKnapper() {
  document.addEventListener("click", async (event) => {
    const kortKnap = event.target.closest(".kortdata-knap");
    const lukKnap = event.target.closest("[data-kort-close='true'], #kortdataLukKnap");
    const visningsKnap = event.target.closest("[data-kort-visning]");

    if (kortKnap && !kortKnap.disabled) {
      await visKortdataModal(
        kortKnap.dataset.kortAdresseId,
        kortKnap.dataset.kortAdgangsadresseId,
        kortKnap.dataset.kortAdresse
      );
      return;
    }

    if (lukKnap) {
      lukKortdataModal();
      return;
    }

    if (visningsKnap && kortInstans) {
      valgtKortBaggrund = visningsKnap.dataset.kortVisning;
      opdaterVisningsKnapper();
      kortInstans.toggleBackground(valgtKortBaggrund);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      lukKortdataModal();
    }
  });
}

function initKortdata() {
  opretKortModalHvisMangler();
  bindKortdataKnapper();
}
