const map = L.map("map", {
  scrollWheelZoom: true
});

const swisstopoLayer = L.tileLayer(
  "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg",
  {
    attribution: "© swisstopo",
    maxZoom: 18
  }
);

swisstopoLayer.addTo(map);

const fallbackCenter = [46.23, 7.38];
map.setView(fallbackCenter, 11);

let currentLayer = null;
let currentBounds = null;

function el(id) {
  return document.getElementById(id);
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Impossible de charger ${path}`);
  }
  return response.json();
}

function categoryMap(catalogue) {
  const map = {};
  for (const category of catalogue.segment_categories || []) {
    map[category.id] = category;
  }
  return map;
}

function styleSegment(feature, categories) {
  const type = feature.properties.structure_type;
  const category = categories[type] || {};
  const isContinuous = feature.properties.continuous !== false;

  return {
    color: category.color || "#555555",
    weight: 6,
    opacity: 0.9,
    dashArray: isContinuous ? null : "8 8"
  };
}

function popupContent(feature, categories) {
  const p = feature.properties;
  const category = categories[p.structure_type] || {};

  return `
    <strong>${p.name || "Segment"}</strong><br>
    Type : ${category.name || p.structure_type || "inconnu"}<br>
    État eau : ${p.water_status || "inconnu"}<br>
    Continuité : ${p.continuous === false ? "discontinu" : "continu"}
  `;
}

function renderLegend(catalogue) {
  const categories = catalogue.segment_categories || [];

  return `
    <div class="legend">
      ${categories.map(category => `
        <span class="legend-item">
          <span class="legend-color" style="background:${category.color}"></span>
          ${category.name}
        </span>
      `).join("")}
    </div>
  `;
}

function renderDetail(catalogue) {
  const info = catalogue.bisse_info;

  el("bisse-detail").innerHTML = `
    <div class="detail-grid">
      <div>
        <h2>${info.title}</h2>
        <p>${info.description}</p>
        <p><strong>Itinéraire :</strong> ${info.itinerary}</p>

        <div class="tags">
          ${(info.tags || []).map(tag => `<span class="tag">${tag}</span>`).join("")}
        </div>

        ${renderLegend(catalogue)}
      </div>

      <dl class="facts">
        <div class="fact">
          <dt>Région</dt>
          <dd>${info.region || ""}</dd>
        </div>
        <div class="fact">
          <dt>Commune</dt>
          <dd>${info.commune || ""}</dd>
        </div>
        <div class="fact">
          <dt>Longueur</dt>
          <dd>${info.length_km ? `${info.length_km} km` : ""}</dd>
        </div>
        <div class="fact">
          <dt>Altitude</dt>
          <dd>${info.altitude_min_m || "?"}–${info.altitude_max_m || "?"} m</dd>
        </div>
        <div class="fact">
          <dt>Cotation</dt>
          <dd>${info.difficulty || ""}</dd>
        </div>
        <div class="fact">
          <dt>Sentier balisé</dt>
          <dd>${info.marked_trail ? "oui" : "non"}</dd>
        </div>
        <div class="fact">
          <dt>État</dt>
          <dd>${info.state || ""}</dd>
        </div>
      </dl>
    </div>
  `;
}

async function loadBisse(item) {
  const catalogue = await loadJson(item.catalogue);
  const geojson = await loadJson(item.segments);
  const categories = categoryMap(catalogue);

  renderDetail(catalogue);

  if (currentLayer) {
    map.removeLayer(currentLayer);
  }

  currentLayer = L.geoJSON(geojson, {
    style: feature => styleSegment(feature, categories),
    onEachFeature: (feature, layer) => {
      layer.bindPopup(popupContent(feature, categories));
    }
  }).addTo(map);

  currentBounds = currentLayer.getBounds();

  if (currentBounds.isValid()) {
    map.fitBounds(currentBounds, {
      padding: [32, 32]
    });
  }
}

function renderBisseList(index) {
  el("bisse-list").innerHTML = index.map((item, i) => `
    <button class="bisse-button" data-index="${i}">
      <strong>${item.title}</strong>
      <span>${item.region || ""}${item.commune ? " · " + item.commune : ""}</span>
    </button>
  `).join("");

  document.querySelectorAll(".bisse-button").forEach(button => {
    button.addEventListener("click", () => {
      const item = index[Number(button.dataset.index)];
      loadBisse(item);
    });
  });
}

async function init() {
  const index = await loadJson("data/bisses_index.json");
  renderBisseList(index);

  if (index.length > 0) {
    await loadBisse(index[0]);
  }
}

init().catch(error => {
  console.error(error);
  el("bisse-detail").innerHTML = `
    <p><strong>Erreur :</strong> ${error.message}</p>
    <p class="muted">
      Vérifie que les fichiers JSON existent et que le site est servi par GitHub Pages
      ou par un serveur local.
    </p>
  `;
});
