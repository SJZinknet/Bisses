/* global L */
"use strict";

console.log("Bisses build bisses-ui-clusters-2026-08-10-v6.1");

const VALAIS_CENTER = [46.22, 7.55];
const VALAIS_ZOOM = 17;
const MIN_ZOOM = 16;
const MAX_ZOOM = 26;

const SHOW_SYNTHETIC_TRACES_AT_ZOOM = 19;
const SHOW_DETAILED_SEGMENTS_AT_ZOOM = 20.5;
const SHOW_BICOLOR_SPLIT_AT_ZOOM = 23.5;
const SHOW_EXACT_SEGMENT_DETAIL_AT_ZOOM = 25;

// Option A : généralisation purement visuelle des plages de couleur.
// Les données GeoJSON sources ne sont jamais modifiées.
const ENABLE_SEGMENT_GENERALIZATION = true;
const SAME_NEIGHBORS_MAX_PX = 18;
const DIFFERENT_NEIGHBORS_MAX_PX = 9;

const MAP_SCALE_STEPS = [
  { min: 16, max: 16.5, label: "CN 1:1 million", layer: "ch.swisstopo.pixelkarte-farbe-pk1000.noscale", format: "jpeg", maxNativeZoom: 26, muted: false },
  { min: 17, max: 18, label: "CN 1:500k", layer: "ch.swisstopo.pixelkarte-farbe-pk500.noscale", format: "jpeg", maxNativeZoom: 26, muted: true },
  { min: 18.5, max: 18.5, label: "CN 1:200k", layer: "ch.swisstopo.pixelkarte-farbe-pk200.noscale", format: "jpeg", maxNativeZoom: 26, muted: true },
  { min: 19, max: 20, label: "CN 1:100k", layer: "ch.swisstopo.pixelkarte-farbe-pk100.noscale", format: "jpeg", maxNativeZoom: 26, muted: true },
  { min: 20.5, max: 21.5, label: "CN 1:50k", layer: "ch.swisstopo.pixelkarte-farbe-pk50.noscale", format: "jpeg", maxNativeZoom: 26, muted: true },
  { min: 22, max: 23, label: "CN 1:25k", layer: "ch.swisstopo.pixelkarte-farbe-pk25.noscale", format: "jpeg", maxNativeZoom: 26, muted: true },
  { min: 23.5, max: 26, label: "CN 1:10k", layer: "ch.swisstopo.landeskarte-farbe-10", format: "png", maxNativeZoom: 26, muted: true }
];

const SATELLITE_STEP = {
  label: "Satellite",
  layer: "ch.swisstopo.swissimage",
  format: "jpeg",
  maxNativeZoom: 26,
  muted: false
};

const WATER_LABELS = {
  in_water: "en eau",
  dry: "sec",
  intermittent: "intermittent",
  unknown: "inconnu"
};

const FALLBACK_CATEGORIES = {
  open: { id: "open", name: "À ciel ouvert", color: "#1e88e5" },
  canalized: { id: "canalized", name: "Canalisé", color: "#111111" },
  abandoned: { id: "abandoned", name: "Abandonné", color: "#ef6c00" },
  mixed: { id: "mixed", name: "Mixte", color: "#777777" },
  unknown: { id: "unknown", name: "Non classé", color: "#777777" }
};

// Décision métier : un segment bicolore est toujours canalisé + abandonné.
// En mode détaillé simplifié, avant le rendu bicolore complet, il est rendu en noir.
const BICOLOR_SIMPLIFIED_COLOR = "#111111";

// Retour au rendu stable v5.1 : traits et transitions arrondis.
const SEGMENT_LINE_CAP = "round";

// Les cibles invisibles de clic restent arrondies pour garder une zone de clic confortable.
const HIT_LINE_CAP = "round";

function clusterRadiusForZoom(zoom) {
  // Rayon en pixels : compromis entre v1 et v2.
  // z16.5 reste assez tolérant pour éviter les chevauchements visuels,
  // mais moins rassembleur que v2.
  if (zoom >= 18.5) return 15;
  if (zoom >= 18) return 24;
  if (zoom >= 17.5) return 35;
  if (zoom >= 17) return 47;
  if (zoom >= 16.5) return 66;
  return 80;
}

function createBisseMarkerLayer() {
  if (!L.markerClusterGroup) {
    console.warn("Leaflet.markercluster n'est pas chargé : fallback vers pastilles simples.");
    return L.layerGroup();
  }

  return L.markerClusterGroup({
    showCoverageOnHover: false,
    zoomToBoundsOnClick: false,
    spiderfyOnMaxZoom: false,
    spiderfyOnEveryZoom: false,
    removeOutsideVisibleBounds: true,
    disableClusteringAtZoom: SHOW_SYNTHETIC_TRACES_AT_ZOOM,
    maxClusterRadius: () => clusterRadiusForZoom(roundedZoom()),
    iconCreateFunction: (cluster) => L.divIcon({
      className: "",
      html: `<div class="bisse-cluster">${cluster.getChildCount()}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    })
  });
}

const state = {
  index: [],
  cache: new Map(),
  selectedId: null,
  selectedData: null,
  photoMarkersVisible: false,
  bisseActionMarker: null,
  base: "carto",
  currentStepKey: "",
  currentSegmentsKey: "",
  currentVisibleSegmentCount: 0,
  segmentRefreshToken: 0,
  listHtml: "",
  legendHtml: "",
  baseLayer: null,
  bisseMarkers: createBisseMarkerLayer(),
  segmentOutlineLayer: null,
  segmentColorLayer: null,
  photoLayer: L.layerGroup()
};

const $ = (id) => document.getElementById(id);

function elementWithinLeaflet(el) {
  let node = el;

  while (node) {
    if (node.classList && node.classList.contains("leaflet-container")) {
      return true;
    }
    node = node.parentElement || node.parentNode;
  }

  return false;
}

function blurIfPossible(el) {
  if (el && typeof el.blur === "function") {
    el.blur();
  }
}

function clearLeafletFocus() {
  window.setTimeout(() => {
    const active = document.activeElement;

    if (elementWithinLeaflet(active)) {
      blurIfPossible(active);
    }

    document
      .querySelectorAll(".leaflet-interactive, .leaflet-marker-icon, .leaflet-marker-shadow, .leaflet-overlay-pane svg, .leaflet-overlay-pane path")
      .forEach((el) => blurIfPossible(el));
  }, 0);
}

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
  maxZoom: MAX_ZOOM,
  zoomSnap: 0.5,
  zoomDelta: 0.5
});

L.control.zoom({ position: "bottomright" }).addTo(map);

map.createPane("segmentOutlinePane");
map.getPane("segmentOutlinePane").style.zIndex = 405;

map.createPane("segmentColorPane");
map.getPane("segmentColorPane").style.zIndex = 410;

map.createPane("segmentHitPane");
map.getPane("segmentHitPane").style.zIndex = 425;

map.createPane("photoPane");
map.getPane("photoPane").style.zIndex = 430;

state.bisseMarkers.addTo(map);
state.photoLayer.addTo(map);

if (L.markerClusterGroup && state.bisseMarkers.on) {
  state.bisseMarkers.on("clusterclick", (event) => {
    clearLeafletFocus();

    if (event.originalEvent) {
      L.DomEvent.stop(event.originalEvent);
    }

    const nextZoom = Math.min(SHOW_SYNTHETIC_TRACES_AT_ZOOM, roundedZoom() + 0.5);
    map.setView(event.latlng, nextZoom, { animate: true });
  });
}

function roundedZoom() {
  return Math.round(map.getZoom() * 2) / 2;
}

function segmentRenderMode() {
  const zoom = roundedZoom();

  if (zoom < SHOW_SYNTHETIC_TRACES_AT_ZOOM) {
    return "markers";
  }

  if (zoom < SHOW_DETAILED_SEGMENTS_AT_ZOOM) {
    return "synthetic";
  }

  return "detailed";
}

function segmentStyleForZoom() {
  const zoom = roundedZoom();

  if (zoom < SHOW_DETAILED_SEGMENTS_AT_ZOOM) {
    return { key: "synthetic", outlineWeight: 9, colorWeight: 6, opacity: 0.96, clickWeight: 16 };
  }

  if (zoom <= 22.5) {
    return { key: "detail-light", outlineWeight: 11, colorWeight: 7, opacity: 0.98, clickWeight: 18 };
  }

  if (zoom <= 24.5) {
    return { key: "detail-medium", outlineWeight: 12, colorWeight: 8, opacity: 0.99, clickWeight: 19 };
  }

  return { key: "detail-final", outlineWeight: 13, colorWeight: 9, opacity: 0.99, clickWeight: 20 };
}

function bicolorStyleForZoom() {
  const base = segmentStyleForZoom();
  const zoom = roundedZoom();

  if (zoom < SHOW_BICOLOR_SPLIT_AT_ZOOM) {
    return {
      ...base,
      mode: "simplified"
    };
  }

  return {
    ...base,
    mode: "split",
    outlineWeight: 13,
    flankWeight: 5.8,
    offset: 2.35,
    opacity: 0.99,
    clickWeight: 20
  };
}

function stepForZoom(zoom) {
  const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  return MAP_SCALE_STEPS.find((step) => clampedZoom >= step.min && clampedZoom <= step.max) || MAP_SCALE_STEPS[0];
}

function makeSwissLayer(step) {
  return L.tileLayer.swiss({
    layer: step.layer,
    format: step.format || "jpeg",
    maxNativeZoom: step.maxNativeZoom || MAX_ZOOM,
    pluginAttribution: false
  });
}

function refreshBasemapFilter(step) {
  const mapEl = $("map");
  if (step.muted) {
    mapEl.classList.add("basemap-muted");
  } else {
    mapEl.classList.remove("basemap-muted");
  }
}

function setBaseLayer(step) {
  const key = `${state.base}:${step.layer}:${step.format}`;

  refreshBasemapFilter(step);

  if (state.currentStepKey === key && state.baseLayer) {
    updateScalePill();
    return;
  }

  state.currentStepKey = key;

  if (state.baseLayer) {
    map.removeLayer(state.baseLayer);
  }

  state.baseLayer = makeSwissLayer(step);
  state.baseLayer.addTo(map);
  state.baseLayer.bringToBack();

  updateScalePill();
}

function refreshBaseLayer() {
  if (state.base === "satellite") {
    setBaseLayer(SATELLITE_STEP);
  } else {
    setBaseLayer(stepForZoom(roundedZoom()));
  }
}

function toggleBase() {
  state.base = state.base === "carto" ? "satellite" : "carto";
  $("btn-basemap").textContent = state.base === "carto" ? "Satellite" : "Carte";
  state.currentStepKey = "";
  refreshBaseLayer();
}

function updateScalePill(count = null, unit = "segments") {
  const zoom = roundedZoom();
  const step = state.base === "satellite" ? SATELLITE_STEP : stepForZoom(zoom);
  const extra = count === null ? "" : ` · ${count} ${unit}`;
  showScale(`${step.label} · z${zoom}${extra}`);
}

function invalidateMapSoon() {
  map.invalidateSize({ pan: false });
  window.setTimeout(() => map.invalidateSize({ pan: false }), 260);
}

function openPanel() {
  document.body.classList.add("side-panel-open");
  $("side-panel").classList.add("is-open");
  invalidateMapSoon();
}

function closePanel() {
  document.body.classList.remove("side-panel-open");
  $("side-panel").classList.remove("is-open");
  invalidateMapSoon();
}

function openContext() {
  // Ancien panneau contextuel supprimé : les détails courts passent par des popups Leaflet.
}

function closeContext() {
  map.closePopup();
}

function openList() {
  $("panel-kicker").textContent = "Vue alternative";
  $("panel-title").textContent = "Liste des bisses";
  $("panel-content").innerHTML = state.listHtml || `<p class="muted">Aucun bisse chargé.</p>`;
  bindListButtons();
  openPanel();
}

function closeList() {
  closePanel();
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

function normalizeStructureType(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  if (["open", "ciel_ouvert", "a_ciel_ouvert", "à_ciel_ouvert"].includes(raw)) return "open";
  if (["canalized", "canalise", "canalise_couvert", "canalized_covered"].includes(raw)) return "canalized";
  if (["abandoned", "abandonne", "abandoned_dry"].includes(raw)) return "abandoned";
  if (["mixed", "mixte"].includes(raw)) return "mixed";
  if (["unknown", "non_classe", "non_classee"].includes(raw)) return "unknown";

  return raw || "unknown";
}

function isBicolorFeature(feature) {
  return String(feature?.properties?.display_mode || "").toLowerCase() === "bicolor";
}

function normalizedStructureTypes(feature) {
  const p = feature.properties || {};
  const arr = Array.isArray(p.structure_types) && p.structure_types.length
    ? p.structure_types
    : [p.structure_type];

  return arr.map(normalizeStructureType).filter(Boolean);
}

function selectedPhotos(catalogue) {
  return (catalogue.photos || [])
    .filter((p) => p.filename_web)
    .sort((a, b) => Number(a.platform_order || 999999) - Number(b.platform_order || 999999));
}

function categories(catalogue) {
  const result = {};

  for (const cat of catalogue.segment_categories || []) {
    const id = normalizeStructureType(cat.id);
    result[id] = {
      ...cat,
      id,
      name: cat.name || cat.label || FALLBACK_CATEGORIES[id]?.name || id,
      color: cat.color || FALLBACK_CATEGORIES[id]?.color || "#777777"
    };
  }

  return result;
}

function categoryForType(type, cats) {
  const norm = normalizeStructureType(type);
  return cats[norm] || FALLBACK_CATEGORIES[norm] || { id: norm, name: norm, color: "#777777" };
}

function categoryFor(feature, cats) {
  const type = normalizeStructureType(feature?.properties?.structure_type);
  return categoryForType(type, cats);
}

function bicolorColors(feature, cats) {
  const p = feature.properties || {};
  const explicit = Array.isArray(p.bicolor_colors) ? p.bicolor_colors.filter(Boolean) : [];

  if (explicit.length >= 2) {
    return [explicit[0], explicit[1]];
  }

  const types = normalizedStructureTypes(feature);
  const c1 = categoryForType(types[0], cats).color || "#777777";
  const c2 = categoryForType(types[1], cats).color || "#333333";
  return [c1, c2];
}

function segmentDisplayName(feature, cats) {
  if (isBicolorFeature(feature)) {
    const names = normalizedStructureTypes(feature)
      .map((t) => categoryForType(t, cats).name)
      .filter(Boolean);
    return names.length ? names.join(" + ") : "Segment mixte";
  }

  return categoryFor(feature, cats).name || "Segment";
}

function featureCoords(feature) {
  const g = feature.geometry || {};
  if (g.type === "LineString") return g.coordinates || [];
  if (g.type === "MultiLineString") return (g.coordinates || []).flat();
  return [];
}

function latlngPartsFromGeometry(geometry) {
  if (!geometry) return [];

  if (geometry.type === "LineString") {
    return [(geometry.coordinates || []).map((c) => [c[1], c[0]])];
  }

  if (geometry.type === "MultiLineString") {
    return (geometry.coordinates || []).map((line) => line.map((c) => [c[1], c[0]]));
  }

  return [];
}

function approximateLineLength(coords) {
  let length = 0;

  for (let i = 1; i < coords.length; i += 1) {
    const a = coords[i - 1];
    const b = coords[i];
    if (!Array.isArray(a) || !Array.isArray(b) || a.length < 2 || b.length < 2) continue;

    const latMean = ((a[1] + b[1]) / 2) * Math.PI / 180;
    const dx = (b[0] - a[0]) * Math.cos(latMean);
    const dy = b[1] - a[1];
    length += Math.sqrt((dx * dx) + (dy * dy));
  }

  return length;
}

function approximateFeatureLength(feature) {
  const g = feature.geometry || {};
  if (g.type === "LineString") return approximateLineLength(g.coordinates || []);
  if (g.type === "MultiLineString") {
    return (g.coordinates || []).reduce((sum, line) => sum + approximateLineLength(line), 0);
  }
  return 0;
}

function dominantCategoryForData(data) {
  const cats = categories(data.catalogue);
  const totals = { open: 0, canalized: 0, abandoned: 0, mixed: 0, unknown: 0 };

  for (const feature of data.geojson.features || []) {
    const len = approximateFeatureLength(feature) || 1;

    if (isBicolorFeature(feature)) {
      const types = normalizedStructureTypes(feature);
      if (!types.length) {
        totals.mixed += len;
      } else {
        const share = len / types.length;
        for (const type of types) {
          const norm = normalizeStructureType(type);
          totals[norm] = (totals[norm] || 0) + share;
        }
      }
    } else {
      const type = normalizeStructureType(feature?.properties?.structure_type);
      totals[type] = (totals[type] || 0) + len;
    }
  }

  const priority = ["open", "canalized", "abandoned", "mixed", "unknown"];
  let bestType = "unknown";
  let bestValue = -1;

  for (const type of priority) {
    const value = totals[type] || 0;
    if (value > bestValue) {
      bestType = type;
      bestValue = value;
    }
  }

  return categoryForType(bestType, cats);
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

function mappablePhotos(catalogue) {
  return selectedPhotos(catalogue).filter((p) => isNum(p.lat) && isNum(p.lon));
}

function interpolateLinePoint(coords, fraction = 0.5) {
  if (!coords.length) return null;
  if (coords.length === 1) return L.latLng(coords[0][1], coords[0][0]);

  const total = approximateLineLength(coords);
  if (!total) {
    const first = coords[0];
    return L.latLng(first[1], first[0]);
  }

  const target = total * fraction;
  let passed = 0;

  for (let i = 1; i < coords.length; i += 1) {
    const a = coords[i - 1];
    const b = coords[i];
    const length = approximateLineLength([a, b]);

    if (!length) continue;

    if (passed + length >= target) {
      const ratio = (target - passed) / length;
      const lon = a[0] + ((b[0] - a[0]) * ratio);
      const lat = a[1] + ((b[1] - a[1]) * ratio);
      return L.latLng(lat, lon);
    }

    passed += length;
  }

  const last = coords[coords.length - 1];
  return L.latLng(last[1], last[0]);
}

function representativePointForBisse(geojson) {
  let bestLine = null;
  let bestLength = -1;

  for (const feature of geojson.features || []) {
    const geometry = feature.geometry || {};
    const lines = geometry.type === "LineString"
      ? [geometry.coordinates || []]
      : (geometry.type === "MultiLineString" ? (geometry.coordinates || []) : []);

    for (const line of lines) {
      const length = approximateLineLength(line);
      if (length > bestLength) {
        bestLength = length;
        bestLine = line;
      }
    }
  }

  const point = bestLine ? interpolateLinePoint(bestLine, 0.52) : null;
  if (point) return point;

  const b = geoBounds(geojson);
  return b.isValid() ? b.getCenter() : null;
}

function bisseActionChipPoint(geojson) {
  const b = geoBounds(geojson);
  if (b.isValid()) {
    const size = map.getSize();
    const nw = map.latLngToContainerPoint(b.getNorthWest());
    const ne = map.latLngToContainerPoint(b.getNorthEast());

    const x = Math.max(52, Math.min(size.x - 52, (nw.x + ne.x) / 2));
    const y = Math.max(76, Math.min(size.y - 80, nw.y - 6));

    return map.containerPointToLatLng(L.point(x, y));
  }

  return representativePointForBisse(geojson);
}

function selectedBisseTitle(data) {
  const info = data.catalogue.bisse_info || {};
  return info.title || data.item.title || "Bisse";
}

function removeBisseActionChip() {
  if (state.bisseActionMarker) {
    map.removeLayer(state.bisseActionMarker);
    state.bisseActionMarker = null;
  }
}

function bisseActionChipHtml(data) {
  const title = selectedBisseTitle(data);
  const count = mappablePhotos(data.catalogue).length;
  const photoButton = count ? `
    <button class="bisse-action-button ${state.photoMarkersVisible ? "is-active" : ""}" type="button" data-action="toggle-photos">
      ${state.photoMarkersVisible ? "Masquer photos" : `Photos · ${count}`}
    </button>
  ` : "";

  return `
    <div class="bisse-action-chip">
      <span class="bisse-action-title">${escapeHtml(title)}</span>
      ${photoButton}
    </div>
  `;
}

function bindBisseActionChipEvents() {
  if (!state.bisseActionMarker) return;

  const el = state.bisseActionMarker.getElement();
  if (!el) return;

  L.DomEvent.disableClickPropagation(el);
  L.DomEvent.disableScrollPropagation(el);

  const button = el.querySelector('[data-action="toggle-photos"]');
  if (!button) return;

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearLeafletFocus();
    toggleSelectedPhotos();
  });
}

function showBisseActionChip(data) {
  removeBisseActionChip();

  const point = bisseActionChipPoint(data.geojson);
  if (!point) return;

  state.bisseActionMarker = L.marker(point, {
    interactive: true,
    keyboard: false,
    zIndexOffset: 1200,
    icon: L.divIcon({
      className: "",
      html: bisseActionChipHtml(data),
      iconSize: [1, 1],
      iconAnchor: [0, 0]
    })
  }).addTo(map);

  window.setTimeout(bindBisseActionChipEvents, 0);
}

function refreshBisseActionChip() {
  if (state.selectedData) {
    showBisseActionChip(state.selectedData);
  }
}

function setSelectedPhotosVisible(visible) {
  if (!state.selectedData) return;

  state.photoMarkersVisible = Boolean(visible) && roundedZoom() >= SHOW_SYNTHETIC_TRACES_AT_ZOOM;
  state.photoLayer.clearLayers();
  map.closePopup();

  if (state.photoMarkersVisible) {
    renderPhotos(state.selectedData);
  }

  refreshBisseActionChip();
}

function toggleSelectedPhotos() {
  setSelectedPhotosVisible(!state.photoMarkersVisible);
}

function clearSelectedBisseMapControls() {
  state.selectedData = null;
  state.photoMarkersVisible = false;
  state.photoLayer.clearLayers();
  removeBisseActionChip();
}

function fitBisseData(data) {
  const b = boundsWithPhotos(geoBounds(data.geojson), selectedPhotos(data.catalogue));
  if (!b.isValid()) return;

  map.invalidateSize({ pan: false });
  map.fitBounds(b, {
    paddingTopLeft: [80, 90],
    paddingBottomRight: [80, 90],
    maxZoom: MAX_ZOOM
  });
}

function fitBisseDataAfterPanel(data) {
  // Le panneau droit redimensionne la zone de carte avec une transition CSS.
  // On attend donc la fin du mouvement avant de cadrer le bisse entier.
  window.setTimeout(() => fitBisseData(data), 300);
  window.setTimeout(() => fitBisseData(data), 560);
}

function refreshMarkerVisibility() {
  const tracesMode = roundedZoom() >= SHOW_SYNTHETIC_TRACES_AT_ZOOM;
  const mapEl = $("map");

  if (tracesMode) {
    mapEl.classList.add("segments-mode");
    if (map.hasLayer(state.bisseMarkers)) {
      map.removeLayer(state.bisseMarkers);
    }
  } else {
    mapEl.classList.remove("segments-mode");
    if (state.photoMarkersVisible) {
      state.photoMarkersVisible = false;
      state.photoLayer.clearLayers();
      refreshBisseActionChip();
    } else {
      state.photoLayer.clearLayers();
    }
    if (!map.hasLayer(state.bisseMarkers)) {
      state.bisseMarkers.addTo(map);
    }
  }

  refreshLegendVisibility();
}

function removeVisibleSegments() {
  if (state.segmentOutlineLayer) {
    map.removeLayer(state.segmentOutlineLayer);
    state.segmentOutlineLayer = null;
  }

  if (state.segmentColorLayer) {
    map.removeLayer(state.segmentColorLayer);
    state.segmentColorLayer = null;
  }
}

function buildSyntheticFeatureCollection(dataList) {
  const features = [];

  for (const data of dataList) {
    const dominant = dominantCategoryForData(data);
    const info = data.catalogue.bisse_info || {};
    const bisseTitle = info.title || data.item.title || "Bisse";

    for (const feature of data.geojson.features || []) {
      const cloned = JSON.parse(JSON.stringify(feature));
      cloned.properties = cloned.properties || {};
      cloned.properties.__display_mode = "synthetic";
      cloned.properties.__bisse_id = data.item.id;
      cloned.properties.__bisse_title = bisseTitle;
      cloned.properties.__category_name = dominant.name || "Tracé synthétique";
      cloned.properties.__category_color = dominant.color || "#1e88e5";
      features.push(cloned);
    }
  }

  return { type: "FeatureCollection", features };
}

function buildDetailedFeatureCollection(dataList) {
  const features = [];

  for (const data of dataList) {
    const cats = categories(data.catalogue);
    const dominant = dominantCategoryForData(data);
    const info = data.catalogue.bisse_info || {};
    const bisseTitle = info.title || data.item.title || "Bisse";

    for (const feature of data.geojson.features || []) {
      const cloned = JSON.parse(JSON.stringify(feature));
      cloned.properties = cloned.properties || {};
      cloned.properties.structure_type = normalizeStructureType(cloned.properties.structure_type);
      cloned.properties.__bisse_id = data.item.id;
      cloned.properties.__bisse_title = bisseTitle;
      cloned.properties.__category_name = segmentDisplayName(cloned, cats);

      if (isBicolorFeature(cloned)) {
        const bstyle = bicolorStyleForZoom();

        if (bstyle.mode === "split") {
          cloned.properties.__display_mode = "bicolor";
          cloned.properties.__bicolor_colors = bicolorColors(cloned, cats);
        } else {
          cloned.properties.__display_mode = "single";
          cloned.properties.__category_color = BICOLOR_SIMPLIFIED_COLOR;
        }
      } else {
        const cat = categoryFor(cloned, cats);
        cloned.properties.__display_mode = "single";
        cloned.properties.__category_color = cat.color;
      }

      features.push(cloned);
    }
  }

  return { type: "FeatureCollection", features };
}

function coordinateKey(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return "";
  return `${Number(coord[0]).toFixed(7)}:${Number(coord[1]).toFixed(7)}`;
}

function displayStyleForFeature(feature) {
  const properties = feature.properties || {};
  const name = properties.__category_name || "Segment";

  if (properties.__display_mode === "bicolor") {
    const colors = Array.isArray(properties.__bicolor_colors)
      ? properties.__bicolor_colors.slice(0, 2)
      : ["#ef6c00", "#111111"];

    return {
      key: `bicolor:${colors.join("|")}:${name}`,
      mode: "bicolor",
      colors,
      color: null,
      name,
      protected: true
    };
  }

  const color = properties.__category_color || "#777777";
  return {
    key: `single:${color}:${name}`,
    mode: "single",
    colors: null,
    color,
    name,
    protected: false
  };
}

function applyDisplayStyle(properties, style) {
  properties.__display_mode = style.mode;
  properties.__category_name = style.name;

  if (style.mode === "bicolor") {
    properties.__bicolor_colors = style.colors.slice();
    delete properties.__category_color;
  } else {
    properties.__category_color = style.color;
    delete properties.__bicolor_colors;
  }
}

function displayRecordOrder(feature, featureIndex, partIndex) {
  const raw = Number(feature?.properties?.order);
  const order = Number.isFinite(raw) ? raw : featureIndex;
  return (order * 1000) + partIndex;
}

function makeDisplayPartRecord(feature, coordinates, featureIndex, partIndex) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const clonedCoordinates = coordinates.map((coord) => coord.slice());
  const properties = { ...(feature.properties || {}) };

  return {
    feature,
    properties,
    coordinates: clonedCoordinates,
    startKey: coordinateKey(clonedCoordinates[0]),
    endKey: coordinateKey(clonedCoordinates[clonedCoordinates.length - 1]),
    style: displayStyleForFeature(feature),
    order: displayRecordOrder(feature, featureIndex, partIndex),
    sourceCount: 1,
    generalized: false
  };
}

function displayPartRecords(featureCollection) {
  const byBisse = new Map();

  (featureCollection.features || []).forEach((feature, featureIndex) => {
    const geometry = feature.geometry || {};
    const parts = geometry.type === "LineString"
      ? [geometry.coordinates || []]
      : (geometry.type === "MultiLineString" ? (geometry.coordinates || []) : []);
    const bisseId = feature.properties?.__bisse_id || `__feature_${featureIndex}`;

    if (!byBisse.has(bisseId)) byBisse.set(bisseId, []);

    parts.forEach((coordinates, partIndex) => {
      const record = makeDisplayPartRecord(feature, coordinates, featureIndex, partIndex);
      if (record) byBisse.get(bisseId).push(record);
    });
  });

  for (const records of byBisse.values()) {
    records.sort((a, b) => a.order - b.order);
  }

  return byBisse;
}

function reverseDisplayRecord(record) {
  const coordinates = record.coordinates.slice().reverse();
  return {
    ...record,
    coordinates,
    startKey: coordinateKey(coordinates[0]),
    endKey: coordinateKey(coordinates[coordinates.length - 1])
  };
}

function buildConnectedDisplayChains(featureCollection) {
  const chains = [];
  const byBisse = displayPartRecords(featureCollection);

  for (const [bisseId, sourceRecords] of byBisse.entries()) {
    const remaining = sourceRecords.slice();

    while (remaining.length) {
      const chain = [remaining.shift()];
      let changed = true;

      while (changed) {
        changed = false;
        const chainStart = chain[0].startKey;
        const chainEnd = chain[chain.length - 1].endKey;

        for (let index = 0; index < remaining.length; index += 1) {
          const candidate = remaining[index];

          if (chainEnd === candidate.startKey) {
            chain.push(candidate);
          } else if (chainEnd === candidate.endKey) {
            chain.push(reverseDisplayRecord(candidate));
          } else if (chainStart === candidate.endKey) {
            chain.unshift(candidate);
          } else if (chainStart === candidate.startKey) {
            chain.unshift(reverseDisplayRecord(candidate));
          } else {
            continue;
          }

          remaining.splice(index, 1);
          changed = true;
          break;
        }
      }

      chains.push({ bisseId, records: chain });
    }
  }

  return chains;
}

function mergeRunCoordinates(left, right) {
  if (coordinateKey(left[left.length - 1]) === coordinateKey(right[0])) {
    return left.concat(right.slice(1));
  }
  return left.concat(right);
}

function mergeTwoDisplayRuns(left, right) {
  return {
    ...left,
    coordinates: mergeRunCoordinates(left.coordinates, right.coordinates),
    sourceCount: left.sourceCount + right.sourceCount,
    generalized: left.generalized || right.generalized
  };
}

function mergeAdjacentDisplayRuns(runs) {
  const merged = [];

  for (const run of runs) {
    const previous = merged[merged.length - 1];

    if (previous && previous.style.key === run.style.key) {
      merged[merged.length - 1] = mergeTwoDisplayRuns(previous, run);
    } else {
      merged.push({
        ...run,
        coordinates: run.coordinates.map((coord) => coord.slice()),
        style: { ...run.style, colors: run.style.colors ? run.style.colors.slice() : null }
      });
    }
  }

  return merged;
}

function buildDisplayColorRuns(records) {
  const runs = records.map((record) => ({
    properties: { ...record.properties },
    coordinates: record.coordinates.map((coord) => coord.slice()),
    style: { ...record.style, colors: record.style.colors ? record.style.colors.slice() : null },
    sourceCount: record.sourceCount,
    generalized: record.generalized
  }));

  return mergeAdjacentDisplayRuns(runs);
}

function displayRunPixelLength(run) {
  let length = 0;
  const coordinates = run.coordinates || [];

  for (let index = 1; index < coordinates.length; index += 1) {
    const a = coordinates[index - 1];
    const b = coordinates[index];
    const pointA = map.latLngToLayerPoint([a[1], a[0]]);
    const pointB = map.latLngToLayerPoint([b[1], b[0]]);
    length += pointA.distanceTo(pointB);
  }

  return length;
}

function availableGeneralizationNeighbor(runs, index) {
  if (index < 0 || index >= runs.length) return null;
  return runs[index].style.protected ? null : runs[index];
}

function generalizationThreshold(runs, index) {
  const run = runs[index];
  if (!run || run.style.protected) return 0;

  const left = availableGeneralizationNeighbor(runs, index - 1);
  const right = availableGeneralizationNeighbor(runs, index + 1);
  if (!left && !right) return 0;

  if (left && right && left.style.key === right.style.key) {
    return SAME_NEIGHBORS_MAX_PX;
  }

  return DIFFERENT_NEIGHBORS_MAX_PX;
}

function generalizationTargetIndex(runs, index) {
  const left = availableGeneralizationNeighbor(runs, index - 1);
  const right = availableGeneralizationNeighbor(runs, index + 1);

  if (left && right && left.style.key === right.style.key) return index - 1;
  if (left && !right) return index - 1;
  if (!left && right) return index + 1;
  if (!left && !right) return -1;

  const leftLength = displayRunPixelLength(left);
  const rightLength = displayRunPixelLength(right);
  return leftLength >= rightLength ? index - 1 : index + 1;
}

function copyRunDisplayStyle(run, target) {
  return {
    ...run,
    style: {
      ...target.style,
      colors: target.style.colors ? target.style.colors.slice() : null
    },
    generalized: true
  };
}

function generalizeDisplayRuns(sourceRuns, zoom) {
  let runs = mergeAdjacentDisplayRuns(sourceRuns);

  if (!ENABLE_SEGMENT_GENERALIZATION || zoom >= SHOW_EXACT_SEGMENT_DETAIL_AT_ZOOM) {
    return runs;
  }

  let guard = 0;

  while (guard < 1000) {
    guard += 1;
    let candidateIndex = -1;
    let candidateRatio = Number.POSITIVE_INFINITY;

    for (let index = 0; index < runs.length; index += 1) {
      const threshold = generalizationThreshold(runs, index);
      if (!threshold) continue;

      const length = displayRunPixelLength(runs[index]);
      if (length > threshold) continue;

      const ratio = length / threshold;
      if (ratio < candidateRatio) {
        candidateRatio = ratio;
        candidateIndex = index;
      }
    }

    if (candidateIndex < 0) break;

    const targetIndex = generalizationTargetIndex(runs, candidateIndex);
    if (targetIndex < 0) break;

    runs[candidateIndex] = copyRunDisplayStyle(runs[candidateIndex], runs[targetIndex]);
    runs = mergeAdjacentDisplayRuns(runs);
  }

  return runs;
}

function displayRunFeature(run, chainId, runIndex) {
  const properties = {
    ...run.properties,
    __display_chain_id: chainId,
    __display_run_index: runIndex,
    __source_feature_count: run.sourceCount,
    __generalized: Boolean(run.generalized)
  };

  applyDisplayStyle(properties, run.style);

  return {
    type: "Feature",
    properties,
    geometry: {
      type: "LineString",
      coordinates: run.coordinates.map((coord) => coord.slice())
    }
  };
}

function buildGeneralizedDisplayFeatureCollection(featureCollection, allowAbsorption) {
  const features = [];
  const zoom = allowAbsorption ? roundedZoom() : SHOW_EXACT_SEGMENT_DETAIL_AT_ZOOM;
  const chains = buildConnectedDisplayChains(featureCollection);

  chains.forEach((chain, chainIndex) => {
    const chainId = `${chain.bisseId}:${chainIndex}`;
    const colorRuns = buildDisplayColorRuns(chain.records);
    const displayRuns = generalizeDisplayRuns(colorRuns, zoom);

    displayRuns.forEach((run, runIndex) => {
      features.push(displayRunFeature(run, chainId, runIndex));
    });
  });

  return { type: "FeatureCollection", features };
}

function bindSegmentInteraction(layer, feature) {
  const title = feature.properties.__bisse_title || "Bisse";
  const baseType = feature.properties.__category_name || "Segment";
  const type = feature.properties.__generalized
    ? `${baseType} (vue simplifiée)`
    : baseType;

  layer.bindTooltip(`${escapeHtml(title)} — ${escapeHtml(type)}`, {
    className: "segment-tooltip",
    sticky: true
  });

  // Clic sur n’importe quelle trace visible = même action qu’une pastille :
  // ouvrir la fiche du bisse dans le panneau droit et recadrer le bisse entier.
  layer.on("click", () => {
    clearLeafletFocus();

    const id = feature.properties.__bisse_id;
    if (id) {
      map.closePopup();
      selectBisse(id, { fit: true });
    }
  });
}

function addHaloForPart(layerGroup, latlngs, style) {
  if (!latlngs.length) return;

  L.polyline(latlngs, {
    pane: "segmentOutlinePane",
    color: "#ffffff",
    weight: style.outlineWeight,
    opacity: style.opacity,
    lineCap: SEGMENT_LINE_CAP,
    lineJoin: "round",
    interactive: false
  }).addTo(layerGroup);
}

function addClickTarget(layerGroup, latlngs, feature, style) {
  if (!latlngs.length) return;

  const target = L.polyline(latlngs, {
    pane: "segmentHitPane",
    color: "#000000",
    weight: style.clickWeight,
    opacity: 0,
    lineCap: HIT_LINE_CAP,
    lineJoin: "round",
    interactive: true
  }).addTo(layerGroup);

  bindSegmentInteraction(target, feature);
}

function continuousHaloCoordinateParts(features) {
  const parts = [];
  let current = [];

  const ordered = features.slice().sort((a, b) => (
    Number(a.properties.__display_run_index || 0) - Number(b.properties.__display_run_index || 0)
  ));

  for (const feature of ordered) {
    const geometry = feature.geometry || {};
    const geometryParts = geometry.type === "LineString"
      ? [geometry.coordinates || []]
      : (geometry.type === "MultiLineString" ? (geometry.coordinates || []) : []);

    for (const coordinates of geometryParts) {
      if (!coordinates.length) continue;

      if (!current.length) {
        current = coordinates.map((coord) => coord.slice());
        continue;
      }

      const currentEnd = coordinateKey(current[current.length - 1]);
      const partStart = coordinateKey(coordinates[0]);
      const partEnd = coordinateKey(coordinates[coordinates.length - 1]);

      if (currentEnd === partStart) {
        current = current.concat(coordinates.slice(1).map((coord) => coord.slice()));
      } else if (currentEnd === partEnd) {
        current = current.concat(coordinates.slice().reverse().slice(1).map((coord) => coord.slice()));
      } else {
        parts.push(current);
        current = coordinates.map((coord) => coord.slice());
      }
    }
  }

  if (current.length) parts.push(current);
  return parts;
}

function addContinuousSegmentHalos(outlineGroup, featureCollection) {
  const byChain = new Map();

  for (const feature of featureCollection.features || []) {
    const chainId = feature.properties.__display_chain_id
      || `${feature.properties.__bisse_id || "bisse"}:${byChain.size}`;
    if (!byChain.has(chainId)) byChain.set(chainId, []);
    byChain.get(chainId).push(feature);
  }

  for (const features of byChain.values()) {
    const baseStyle = segmentStyleForZoom();
    const hasBicolor = features.some((feature) => feature.properties.__display_mode === "bicolor");
    const style = hasBicolor
      ? { ...baseStyle, outlineWeight: Math.max(baseStyle.outlineWeight, bicolorStyleForZoom().outlineWeight) }
      : baseStyle;

    for (const coordinates of continuousHaloCoordinateParts(features)) {
      const latlngs = coordinates.map((coord) => [coord[1], coord[0]]);
      addHaloForPart(outlineGroup, latlngs, style);
    }
  }
}

function addSingleSegment(layerGroup, feature) {
  const parts = latlngPartsFromGeometry(feature.geometry);
  const style = segmentStyleForZoom();
  const color = feature.properties.__category_color || "#777777";

  for (const latlngs of parts) {
    const line = L.polyline(latlngs, {
      pane: "segmentColorPane",
      color,
      weight: style.colorWeight,
      opacity: style.opacity,
      lineCap: SEGMENT_LINE_CAP,
      lineJoin: "round",
      interactive: true
    }).addTo(layerGroup);

    bindSegmentInteraction(line, feature);
    addClickTarget(layerGroup, latlngs, feature, style);
  }
}

function addBicolorSegment(layerGroup, feature) {
  const parts = latlngPartsFromGeometry(feature.geometry);
  const style = bicolorStyleForZoom();
  const colors = Array.isArray(feature.properties.__bicolor_colors)
    ? feature.properties.__bicolor_colors
    : ["#ef6c00", "#111111"];

  const colorA = colors[0] || "#ef6c00";
  const colorB = colors[1] || "#111111";

  for (const latlngs of parts) {
    const left = L.polyline(latlngs, {
      pane: "segmentColorPane",
      color: colorA,
      weight: style.flankWeight,
      opacity: style.opacity,
      lineCap: SEGMENT_LINE_CAP,
      lineJoin: "round",
      offset: -style.offset,
      interactive: true
    }).addTo(layerGroup);

    const right = L.polyline(latlngs, {
      pane: "segmentColorPane",
      color: colorB,
      weight: style.flankWeight,
      opacity: style.opacity,
      lineCap: SEGMENT_LINE_CAP,
      lineJoin: "round",
      offset: style.offset,
      interactive: true
    }).addTo(layerGroup);

    bindSegmentInteraction(left, feature);
    bindSegmentInteraction(right, feature);
    addClickTarget(layerGroup, latlngs, feature, style);
  }
}

function drawVisibleSegments(featureCollection) {
  const outlineGroup = L.layerGroup();
  const colorGroup = L.layerGroup();

  addContinuousSegmentHalos(outlineGroup, featureCollection);

  for (const feature of featureCollection.features || []) {
    if (feature.properties.__display_mode === "bicolor") {
      addBicolorSegment(colorGroup, feature);
    } else {
      addSingleSegment(colorGroup, feature);
    }
  }

  state.segmentOutlineLayer = outlineGroup.addTo(map);
  state.segmentColorLayer = colorGroup.addTo(map);
}

async function refreshVisibleSegments() {
  refreshMarkerVisibility();

  const token = state.segmentRefreshToken + 1;
  state.segmentRefreshToken = token;

  const mode = segmentRenderMode();
  const style = segmentStyleForZoom();
  const bstyle = bicolorStyleForZoom();
  const zoom = roundedZoom();
  const key = `${mode}:${style.key}:${bstyle.mode}:${zoom}:${ENABLE_SEGMENT_GENERALIZATION}:${state.index.length}:${state.cache.size}`;

  if (mode === "markers") {
    state.currentSegmentsKey = key;
    state.currentVisibleSegmentCount = 0;
    removeVisibleSegments();
    updateScalePill(0);
    return;
  }

  if (state.currentSegmentsKey === key && state.segmentColorLayer) {
    updateScalePill(state.currentVisibleSegmentCount, mode === "synthetic" ? "tracés" : "segments");
    return;
  }

  state.currentSegmentsKey = key;
  removeVisibleSegments();

  const dataList = [];

  for (const item of state.index) {
    try {
      dataList.push(await loadBisse(item));
    } catch (error) {
      console.warn("Bisse non chargé pour la vue segments", item, error);
    }

    if (token !== state.segmentRefreshToken) {
      return;
    }
  }

  if (token !== state.segmentRefreshToken || segmentRenderMode() !== mode) {
    return;
  }

  const sourceGeojson = mode === "synthetic"
    ? buildSyntheticFeatureCollection(dataList)
    : buildDetailedFeatureCollection(dataList);

  const visibleGeojson = buildGeneralizedDisplayFeatureCollection(
    sourceGeojson,
    mode === "detailed"
  );

  if (token !== state.segmentRefreshToken || segmentRenderMode() !== mode) {
    return;
  }

  drawVisibleSegments(visibleGeojson);
  state.currentVisibleSegmentCount = visibleGeojson.features.length;

  const unit = mode === "synthetic" ? "tracés" : "segments";
  updateScalePill(visibleGeojson.features.length, unit);
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

function photoPopupWidth() {
  const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  return Math.max(240, Math.min(320, viewportWidth - 76));
}

function photoPopupOptions() {
  const width = photoPopupWidth();

  return {
    minWidth: width,
    maxWidth: width,
    autoPan: true,
    closeButton: true,
    className: "photo-leaflet-popup"
  };
}

function photoPopupContent(photo) {
  return `
    <div class="map-popup photo-popup">
      ${photo.filename_web ? `
        <div class="photo-popup-media">
          <img src="${escapeHtml(photo.filename_web)}" alt="">
        </div>
      ` : ""}
      <h3>${escapeHtml(photo.title || "Photo")}</h3>
      ${photo.description ? `<p class="popup-muted">${escapeHtml(photo.description)}</p>` : ""}
    </div>
  `;
}

function bindListButtons() {
  document.querySelectorAll(".bisse-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectBisse(btn.dataset.id);
    });
  });
}

function renderList() {
  state.listHtml = state.index.map((item) => `
    <button class="bisse-button" type="button" data-id="${escapeHtml(item.id)}">
      <strong>${escapeHtml(item.title || item.id)}</strong>
      <span>${escapeHtml([item.region, item.commune].filter(Boolean).join(" · "))}</span>
    </button>
  `).join("");
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

      marker.on("click", () => {
        clearLeafletFocus();
        selectBisse(item.id);
      });
      marker.addTo(state.bisseMarkers);
    } catch (error) {
      console.warn("Bisse non chargé", item, error);
    }
  }

  refreshMarkerVisibility();
}

function clearSelectedPhotosAndLegend() {
  state.photoLayer.clearLayers();
  refreshLegendVisibility();
}

function shouldShowCategoryInLegend(cat) {
  const id = normalizeStructureType(cat.id || cat.name || cat.label);
  const label = String(cat.name || cat.label || cat.id || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (id === "unknown") return false;
  if (label.includes("non classe")) return false;
  if (label.includes("non class")) return false;

  return true;
}

function collectLegendCategories() {
  const byId = new Map();

  for (const data of state.cache.values()) {
    for (const cat of data.catalogue.segment_categories || []) {
      const id = normalizeStructureType(cat.id || cat.name || cat.label);
      if (!id || !shouldShowCategoryInLegend(cat)) continue;

      byId.set(id, {
        id,
        name: cat.name || cat.label || FALLBACK_CATEGORIES[id]?.name || id,
        color: cat.color || FALLBACK_CATEGORIES[id]?.color || "#777777"
      });
    }
  }

  // Fallback stable si certains catalogues ne sont pas encore chargés.
  for (const id of ["open", "canalized", "abandoned"]) {
    if (!byId.has(id)) {
      byId.set(id, FALLBACK_CATEGORIES[id]);
    }
  }

  const preferredOrder = ["open", "canalized", "abandoned"];
  const ordered = preferredOrder
    .map((id) => byId.get(id))
    .filter(Boolean);

  const extras = [...byId.values()]
    .filter((cat) => !preferredOrder.includes(cat.id))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "fr"));

  return [...ordered, ...extras];
}

function refreshLegend() {
  const cats = collectLegendCategories();

  state.legendHtml = cats.map((cat) => `
    <span class="legend-item">
      <span class="legend-swatch" style="background:${escapeHtml(cat.color || "#777")}"></span>
      ${escapeHtml(cat.name || cat.label || cat.id)}
    </span>
  `).join("");

  $("legend").innerHTML = state.legendHtml;
  refreshLegendVisibility();
}

function refreshLegendVisibility() {
  const legend = $("legend");
  const showLegend = roundedZoom() >= SHOW_SYNTHETIC_TRACES_AT_ZOOM && Boolean(state.legendHtml);

  legend.classList.toggle("is-hidden", !showLegend);
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

    marker.bindPopup(photoPopupContent(photo), photoPopupOptions());

    marker.on("click", () => {
      clearLeafletFocus();
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

  $("panel-kicker").textContent = "Fiche bisse";
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
      clearLeafletFocus();

      const photo = photos[Number(btn.dataset.photo)];
      if (!photo) return;

      if (isNum(photo.lat) && isNum(photo.lon)) {
        map.flyTo(
          [photo.lat, photo.lon],
          Math.min(MAX_ZOOM, Math.max(map.getZoom(), 23)),
          { duration: 0.45 }
        );
      }

      if (isNum(photo.lat) && isNum(photo.lon)) {
        L.popup(photoPopupOptions())
          .setLatLng([photo.lat, photo.lon])
          .setContent(photoPopupContent(photo))
          .openOn(map);
      }
    });
  });

  openPanel();
}

async function selectBisse(id, options = {}) {
  const item = state.index.find((x) => x.id === id);
  if (!item) return;

  state.selectedId = id;
  state.selectedData = null;
  state.photoMarkersVisible = false;
  clearSelectedPhotosAndLegend();
  removeBisseActionChip();
  showStatus("Chargement du bisse…");

  try {
    const data = await loadBisse(item);
    state.selectedData = data;
    renderPanel(data);
    refreshLegend();
    state.photoLayer.clearLayers();
    showBisseActionChip(data);

    if (options.showPhotos === true) {
      setSelectedPhotosVisible(true);
    }

    if (options.fit !== false) {
      fitBisseDataAfterPanel(data);
    }

    hideStatus();
    refreshVisibleSegments();
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
  state.selectedId = null;
  clearSelectedBisseMapControls();
  clearSelectedPhotosAndLegend();
  closeContext();
  closePanel();

  map.setView(VALAIS_CENTER, VALAIS_ZOOM);
  refreshVisibleSegments();
}

async function init() {
  try {
    showStatus("Chargement des bisses…");

    state.index = await loadJson("data/bisses_index.json");
    renderList();
    await renderMarkers();
    refreshLegend();
    resetValais();
    await refreshVisibleSegments();

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

map.on("zoom", refreshMarkerVisibility);

map.on("zoomend", () => {
  refreshBaseLayer();
  refreshMarkerVisibility();
  refreshVisibleSegments();
});

$("btn-basemap").addEventListener("click", toggleBase);
$("btn-valais").addEventListener("click", resetValais);
$("btn-list").addEventListener("click", openList);
$("btn-close-panel").addEventListener("click", closePanel);

map.setView(VALAIS_CENTER, VALAIS_ZOOM);
refreshBaseLayer();
init();
