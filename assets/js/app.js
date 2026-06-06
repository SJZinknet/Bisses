/* global L */
"use strict";

console.log("Bisses build swiss-epsg2056-zoom-table-2026-06-06-fixed-copy");

const VALAIS_CENTER = [46.22, 7.55];
const VALAIS_ZOOM = 17;
const MIN_ZOOM = 16;
const MAX_ZOOM = 27;

const MAP_SCALE_STEPS = [
  {
    min: 16,
    max: 16,
    label: "Fond général",
    layer: "ch.swisstopo.pixelkarte-farbe",
    format: "jpeg",
    maxNativeZoom: 27
  },
  {
    min: 17,
    max: 17,
    label: "CN 1:1 million",
    layer: "ch.swisstopo.pixelkarte-farbe-pk1000.noscale",
    format: "jpeg",
    maxNativeZoom: 27
  },
  {
    min: 18,
    max: 18,
    label: "CN 1:500k",
    layer: "ch.swisstopo.pixelkarte-farbe-pk500.noscale",
    format: "jpeg",
    maxNativeZoom: 27
  },
  {
    min: 19,
    max: 19,
    label: "CN 1:200k",
    layer: "ch.swisstopo.pixelkarte-farbe-pk200.noscale",
    format: "jpeg",
    maxNativeZoom: 27
  },
  {
    min: 20,
    max: 20,
    label: "CN 1:100k",
    layer: "ch.swisstopo.pixelkarte-farbe-pk100.noscale",
    format: "jpeg",
    maxNativeZoom: 27
  },
  {
    min: 21,
    max: 21,
    label: "CN 1:50k",
    layer: "ch.swisstopo.pixelkarte-farbe-pk50.noscale",
    format: "jpeg",
    maxNativeZoom: 27
  },
  {
    min: 22,
    max: 23,
    label: "CN 1:25k",
    layer: "ch.swisstopo.pixelkarte-farbe-pk25.noscale",
    format: "jpeg",
    maxNativeZoom: 27
  },
  {
    min: 24,
    max: 27,
    label: "CN 1:10k",
    layer: "ch.swisstopo.landeskarte-farbe-10",
    format: "png",
    maxNativeZoom: 27
  }
];

const SATELLITE_STEP = {
  label: "Satellite",
  layer: "ch.swisstopo.swissimage",
  format: "jpeg",
  maxNativeZoom: 27
};

const WATER_LABELS = {
  in_water: "en eau",
  dry: "sec",
  intermittent: "intermittent",
  unknown: "inconnu"
};

const FALLBACK_CATEGORIES = {
  open: { name: "À ciel ouvert", color: "#777777" },
  canalized: { name: "Canalisé", color: "#777777" },
  abandoned: { name: "Abandonné", color: "#777777" },
  unknown: { name: "Non classé", color: "#777777" }
};

const state = {
  index: [],
  cache: new Map(),
  base: "carto",
  currentStepKey: "",
  baseLayer: null,
  bisseMarkers: L.layerGroup(),
  outlineLayer: null,
  colorLayer: null,
  photoLayer: L.layerGroup()
};

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isNum(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function showStatus(text) {
  const pill = $("status-pill");
  pill.textContent = text;
  pill.classList.remove("is-hidden");
}

function hideStatus() {
  $("status-pill").classList.add("is-hidden");
}

function showScale(text) {
  const pill = $("scale-pill");
  pill.textContent = text;
  pill.classList.remove("is-hidden");
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Impossible de charger ${path}`);
  return response.json();
}

if (!L.CRS || !L.CRS.EPSG2056 || !L.tileLayer || !L.tileLayer.swiss) {
  throw new Error("Leaflet.TileLayer.Swiss n'est pas chargé correctement.");
}

const map = L.map("map", {
  crs: L.CRS.EPSG2056,
  zoomControl: false,
  scrollWheelZoom: true,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM
});

L.control.zoom({ position: "bottomright" }).addTo(map);

map.createPane("outlinePane");
map.getPane("outlinePane").style.zIndex = 410;

map.createPane("segmentPane");
map.getPane("segmentPane").style.zIndex = 420;

map.createPane("photoPane");
map.getPane("photoPane").style.zIndex = 430;

state.bisseMarkers.addTo(map);
state.photoLayer.addTo(map);

function stepForZoom(zoom) {
  const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

  return MAP_SCALE_STEPS.find((step) => clampedZoom >= step.min && clampedZoom <= step.max)
    || MAP_SCALE_STEPS[0];
}

function makeSwissLayer(step) {
  return L.tileLayer.swiss({
    layer: step.layer,
    format: step.format || "jpeg",
    maxNativeZoom: step.maxNativeZoom || MAX_ZOOM,
    pluginAttribution: false
  });
}

function setBaseLayer(step) {
  const key = `${state.base}:${step.layer}:${step.format}`;

  if (state.currentStepKey === key && state.baseLayer) {
    showScale(`${step.label} · z${map.getZoom()}`);
    return;
  }

  state.currentStepKey = key;

  if (state.baseLayer) {
    map.removeLayer(state.baseLayer);
  }

  state.baseLayer = makeSwissLayer(step);
  state.baseLayer.addTo(map);
  state.baseLayer.bringToBack();

  showScale(`${step.label} · z${map.getZoom()}`);
}

function refreshBaseLayer() {
  if (state.base === "satellite") {
    setBaseLayer(SATELLITE_STEP);
    return;
  }

  setBaseLayer(stepForZoom(map.getZoom()));
}

function toggleBase() {
  if (state.base === "carto") {
    state.base = "satellite";
    $("btn-basemap").textContent = "Carte";
  } else {
    state.base = "carto";
    $("btn-basemap").textContent = "Satellite";
  }

  state.currentStepKey = "";
  refreshBaseLayer();
}

map.on("zoomend", refreshBaseLayer);

map.setView(VALAIS_CENTER, VALAIS_ZOOM);
refreshBaseLayer();

function openPanel() {
  $("bisse-panel").classList.add("is-open");
}

function closePanel() {
  $("bisse-panel").classList.remove("is-open");
}

function openContext() {
  $("context-panel").classList.add("is-open");
}

function closeContext() {
  $("context-panel").classList.remove("is-open");
}

function openList() {
  $("list-panel").classList.add("is-open");
}

function closeList() {
  $("list-panel").classList.remove("is-open");
}

function cataloguePath(item) {
  return item.catalogue || `data/bisses/${item.id}/catalogue.json`;
}

function segmentsPath(item) {
  return item.segments || `data/bisses/${item.id}/segments.geojson`;
}

async function loadBisse(item) {
  if (state.cache.has(item.id)) return state.cache.get(item.id);

  const [catalogue, geojson] = await Promise.all([
    loadJson(cataloguePath(item)),
    loadJson(segmentsPath(item))
  ]);

  const data = { item, catalogue, geojson };
  state.cache.set(item.id, data);
  return data;
}

function selectedPhotos(catalogue) {
  return (catalogue.photos || [])
    .filter((p) => p.filename_web)
    .sort((a, b) => Number(a.platform_order || 999999) - Number(b.platform_order || 999999));
}

function categories(catalogue) {
  const result = {};
  for (const cat of catalogue.segment_categories || []) {
    result[cat.id] = cat;
  }
  return result;
}

function categoryFor(feature, cats) {
  const type = feature?.properties?.structure_type || "unknown";
  return cats[type] || FALLBACK_CATEGORIES[type] || { name: type, color: "#777777" };
}

function featureCoords(feature) {
  const g = feature.geometry || {};
  if (g.type === "LineString") return g.coordinates || [];
  if (g.type === "MultiLineString") return (g.coordinates || []).flat();
  return [];
}

function geoBounds(geojson) {
  const b = L.latLngBounds();
  for (const feature of geojson.features || []) {
    for (const c of featureCoords(feature)) {
      if (Array.isArray(c) && c.length >= 2) {
        b.extend([c[1], c[0]]);
      }
    }
  }
  return b;
}

function boundsWithPhotos(bounds, photos) {
  for (const p of photos || []) {
    if (isNum(p.lat) && isNum(p.lon)) {
      bounds.extend([p.lat, p.lon]);
    }
  }
  return bounds;
}

function markerIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="bisse-marker"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
}

function photoIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="photo-marker"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

function renderList() {
  $("bisse-list").innerHTML = state.index.map((item) => `
    <button class="bisse-button" type="button" data-id="${escapeHtml(item.id)}">
      <strong>${escapeHtml(item.title || item.id)}</strong>
      <span>${escapeHtml([item.region, item.commune].filter(Boolean).join(" · "))}</span>
    </button>
  `).join("");

  document.querySelectorAll(".bisse-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectBisse(btn.dataset.id);
      closeList();
    });
  });
}

async function renderMarkers() {
  state.bisseMarkers.clearLayers();

  for (const item of state.index) {
    try {
      const data = await loadBisse(item);
      const b = geoBounds(data.geojson);
      const center = item.center && item.center.length >= 2
        ? L.latLng(item.center[0], item.center[1])
        : (b.isValid() ? b.getCenter() : L.latLng(VALAIS_CENTER));

      const marker = L.marker(center, {
        icon: markerIcon(),
        title: item.title || item.id
      });

      marker.bindTooltip(escapeHtml(item.title || item.id), {
        className: "bisse-tooltip",
        direction: "top",
        offset: [0, -10]
      });

      marker.on("click", () => selectBisse(item.id));
      marker.addTo(state.bisseMarkers);
    } catch (error) {
      console.warn("Bisse non chargé", item, error);
    }
  }
}

function clearSelected() {
  if (state.outlineLayer) {
    map.removeLayer(state.outlineLayer);
    state.outlineLayer = null;
  }
  if (state.colorLayer) {
    map.removeLayer(state.colorLayer);
    state.colorLayer = null;
  }
  state.photoLayer.clearLayers();
  $("legend").innerHTML = "";
}

function renderLegend(catalogue) {
  $("legend").innerHTML = (catalogue.segment_categories || []).map((cat) => `
    <span class="legend-item">
      <span class="legend-swatch" style="background:${escapeHtml(cat.color || "#777")}"></span>
      ${escapeHtml(cat.name || cat.id)}
    </span>
  `).join("");
}

function renderSegments(data) {
  const cats = categories(data.catalogue);
  const info = data.catalogue.bisse_info || {};
  const title = info.title || data.item.title || "Bisse";

  state.outlineLayer = L.geoJSON(data.geojson, {
    pane: "outlinePane",
    style: {
      color: "#ffffff",
      weight: 9,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
      interactive: false
    }
  }).addTo(map);

  state.colorLayer = L.geoJSON(data.geojson, {
    pane: "segmentPane",
    style: (feature) => ({
      color: categoryFor(feature, cats).color || "#777777",
      weight: 5,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round"
    }),
    onEachFeature: (feature, layer) => {
      const cat = categoryFor(feature, cats);

      layer.bindTooltip(`${escapeHtml(title)} — ${escapeHtml(cat.name)}`, {
        className: "segment-tooltip",
        sticky: true
      });

      layer.on("click", () => {
        const p = feature.properties || {};
        $("context-content").innerHTML = `
          <h3>${escapeHtml(cat.name)}</h3>
          <div class="context-row">
            <strong>Bisse</strong>
            <span>${escapeHtml(title)}</span>
          </div>
          ${p.name ? `
          <div class="context-row">
            <strong>Tronçon</strong>
            <span>${escapeHtml(p.name)}</span>
          </div>` : ""}
          <div class="context-row">
            <strong>Type</strong>
            <span>${escapeHtml(cat.name)}</span>
          </div>
          <div class="context-row">
            <strong>État de l’eau</strong>
            <span>${escapeHtml(WATER_LABELS[p.water_status] || p.water_status || "inconnu")}</span>
          </div>
        `;
        openContext();
      });
    }
  }).addTo(map);
}

function renderPhotos(data) {
  const photos = selectedPhotos(data.catalogue);
  state.photoLayer.clearLayers();

  for (const photo of photos) {
    if (!isNum(photo.lat) || !isNum(photo.lon)) continue;

    const marker = L.marker([photo.lat, photo.lon], {
      pane: "photoPane",
      icon: photoIcon(),
      title: photo.title || "Photo"
    });

    marker.bindTooltip(escapeHtml(photo.title || "Photo"), {
      className: "bisse-tooltip",
      direction: "top",
      offset: [0, -8]
    });

    marker.on("click", () => {
      $("context-content").innerHTML = `
        ${photo.filename_web ? `<img class="context-photo" src="${escapeHtml(photo.filename_web)}" alt="">` : ""}
        <h3>${escapeHtml(photo.title || "Photo")}</h3>
        ${photo.description ? `
          <div class="context-row">
            <strong>Description</strong>
            <span>${escapeHtml(photo.description)}</span>
          </div>
        ` : ""}
      `;
      openContext();
    });

    marker.addTo(state.photoLayer);
  }
}

function boolLabel(value) {
  if (value === true) return "oui";
  if (value === false) return "non";
  return "—";
}

function distanceLabel(value) {
  return isNum(value) ? `${String(value).replace(".", ",")} km` : "—";
}

function altitudeLabel(min, max) {
  if (isNum(min) && isNum(max)) return `${min}–${max} m`;
  if (isNum(min)) return `${min} m`;
  if (isNum(max)) return `${max} m`;
  return "—";
}

function renderPanel(data) {
  const info = data.catalogue.bisse_info || {};
  const photos = selectedPhotos(data.catalogue);

  $("panel-title").textContent = info.title || data.item.title || "Bisse";

  $("panel-content").innerHTML = `
    <p class="lead">${escapeHtml(info.description || "Aucune description pour le moment.")}</p>

    ${info.itinerary ? `
      <div class="context-row">
        <strong>Itinéraire</strong>
        <span>${escapeHtml(info.itinerary)}</span>
      </div>
    ` : ""}

    <dl class="fact-grid">
      <div class="fact"><dt>Région</dt><dd>${escapeHtml(info.region || "—")}</dd></div>
      <div class="fact"><dt>Commune</dt><dd>${escapeHtml(info.commune || "—")}</dd></div>
      <div class="fact"><dt>Longueur</dt><dd>${escapeHtml(distanceLabel(info.length_km))}</dd></div>
      <div class="fact"><dt>Altitude</dt><dd>${escapeHtml(altitudeLabel(info.altitude_min_m, info.altitude_max_m))}</dd></div>
      <div class="fact"><dt>Cotation</dt><dd>${escapeHtml(info.difficulty || "—")}</dd></div>
      <div class="fact"><dt>Sentier balisé</dt><dd>${escapeHtml(boolLabel(info.marked_trail))}</dd></div>
      <div class="fact"><dt>État</dt><dd>${escapeHtml(info.state || "—")}</dd></div>
    </dl>

    ${(info.tags || []).length ? `
      <div class="tags">
        ${info.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
    ` : ""}

    ${photos.length ? `
      <h3 style="margin-top:18px;">Photos choisies</h3>
      <div class="gallery">
        ${photos.map((photo, i) => `
          <button class="photo-card" type="button" data-photo="${i}">
            <img src="${escapeHtml(photo.filename_web)}" alt="">
            <div>
              <strong>${escapeHtml(photo.title || "Photo")}</strong>
              <span>${escapeHtml(photo.description || "")}</span>
            </div>
          </button>
        `).join("")}
      </div>
    ` : `<p class="muted">Aucune photo choisie pour la plateforme.</p>`}
  `;

  document.querySelectorAll(".photo-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const photo = photos[Number(btn.dataset.photo)];
      if (!photo) return;

      if (isNum(photo.lat) && isNum(photo.lon)) {
        map.flyTo(
          [photo.lat, photo.lon],
          Math.min(MAX_ZOOM, Math.max(map.getZoom(), 23)),
          { duration: 0.45 }
        );
      }

      $("context-content").innerHTML = `
        ${photo.filename_web ? `<img class="context-photo" src="${escapeHtml(photo.filename_web)}" alt="">` : ""}
        <h3>${escapeHtml(photo.title || "Photo")}</h3>
        ${photo.description ? `
          <div class="context-row">
            <strong>Description</strong>
            <span>${escapeHtml(photo.description)}</span>
          </div>
        ` : ""}
      `;
      openContext();
    });
  });

  openPanel();
}

async function selectBisse(id) {
  const item = state.index.find((x) => x.id === id);
  if (!item) return;

  clearSelected();
  showStatus("Chargement du bisse…");

  try {
    const data = await loadBisse(item);
    renderPanel(data);
    renderLegend(data.catalogue);
    renderSegments(data);
    renderPhotos(data);

    const b = boundsWithPhotos(geoBounds(data.geojson), selectedPhotos(data.catalogue));
    if (b.isValid()) {
      map.fitBounds(b, { padding: [70, 70], maxZoom: MAX_ZOOM });
    }

    hideStatus();
  } catch (error) {
    $("panel-title").textContent = "Erreur";
    $("panel-content").innerHTML = `
      <div class="error-box">
        <strong>Chargement impossible</strong><br>
        ${escapeHtml(error.message)}
      </div>
    `;
    openPanel();
    showStatus("Erreur de chargement");
  }
}

function resetValais() {
  clearSelected();
  closeContext();

  map.setView(VALAIS_CENTER, VALAIS_ZOOM);

  $("panel-title").textContent = "Bisses du Valais";
  $("panel-content").innerHTML = `
    <p class="muted">
      Cliquez sur une pastille pour afficher le tracé détaillé d’un bisse.
    </p>
  `;

  openPanel();
}

async function init() {
  try {
    showStatus("Chargement des bisses…");

    state.index = await loadJson("data/bisses_index.json");
    renderList();
    await renderMarkers();
    resetValais();

    if (!state.index.length) {
      $("panel-content").innerHTML = `
        <div class="error-box">Aucun bisse trouvé dans data/bisses_index.json.</div>
      `;
      showStatus("Aucun bisse trouvé");
    } else {
      hideStatus();
    }
  } catch (error) {
    $("panel-title").textContent = "Erreur";
    $("panel-content").innerHTML = `
      <div class="error-box">
        <strong>Impossible d’initialiser la plateforme.</strong><br>
        ${escapeHtml(error.message)}
      </div>
    `;
    openPanel();
    showStatus("Erreur d’initialisation");
  }
}

$("btn-basemap").addEventListener("click", toggleBase);
$("btn-valais").addEventListener("click", resetValais);
$("btn-list").addEventListener("click", openList);
$("btn-close-list").addEventListener("click", closeList);
$("btn-close-panel").addEventListener("click", closePanel);
$("btn-close-context").addEventListener("click", closeContext);

init();
