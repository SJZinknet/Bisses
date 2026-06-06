/* global L */
"use strict";

const VALAIS_CENTER = [46.22, 7.55];
const VALAIS_ZOOM = 9;

const AUTO_MAP_LAYERS = [
  { id: "overview", minZoom: 0, maxZoom: 10, name: "Carte nationale", url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg" },
  { id: "pk25", minZoom: 11, maxZoom: 14, name: "Carte nationale 1:25 000", url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe-pk25.noscale/default/current/3857/{z}/{x}/{y}.jpeg" },
  { id: "pk10", minZoom: 15, maxZoom: 20, name: "Carte nationale 1:10 000", url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe-pk10.noscale/default/current/3857/{z}/{x}/{y}.jpeg" }
];

const SATELLITE_LAYER = { id: "satellite", name: "Satellite", url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg" };

const WATER_STATUS_LABELS = { in_water: "en eau", dry: "sec", intermittent: "intermittent", unknown: "inconnu" };
const STRUCTURE_FALLBACK_LABELS = { open: "À ciel ouvert", canalized: "Canalisé", abandoned: "Abandonné", unknown: "Non classé" };

const state = {
  index: [], cache: new Map(), selectedId: null, baseMode: "map",
  currentBaseLayer: null, currentAutoLayerId: null,
  bisseMarkers: L.layerGroup(), selectedOutlineLayer: null, selectedColorLayer: null,
  photoLayer: L.layerGroup(), allBounds: null
};

const el = id => document.getElementById(id);
const map = L.map("map", { zoomControl: false, scrollWheelZoom: true });
L.control.zoom({ position: "bottomright" }).addTo(map);
map.createPane("segmentOutline"); map.getPane("segmentOutline").style.zIndex = 410;
map.createPane("segmentColor"); map.getPane("segmentColor").style.zIndex = 420;
map.createPane("photoMarkers"); map.getPane("photoMarkers").style.zIndex = 430;
state.bisseMarkers.addTo(map); state.photoLayer.addTo(map);
map.setView(VALAIS_CENTER, VALAIS_ZOOM);

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function isNumber(value) { return typeof value === "number" && Number.isFinite(value); }
function loadJson(path) { return fetch(path).then(r => { if (!r.ok) throw new Error(`Impossible de charger ${path}`); return r.json(); }); }
function layerForZoom(zoom) { return AUTO_MAP_LAYERS.find(l => zoom >= l.minZoom && zoom <= l.maxZoom) || AUTO_MAP_LAYERS[0]; }
function setBaseLayerFromUrl(layerDef) {
  if (state.currentBaseLayer) map.removeLayer(state.currentBaseLayer);
  state.currentBaseLayer = L.tileLayer(layerDef.url, { minZoom: 0, maxZoom: 20, maxNativeZoom: 20, attribution: "© swisstopo" }).addTo(map);
  state.currentBaseLayer.bringToBack();
}
function refreshAutomaticBaseLayer() {
  if (state.baseMode !== "map") return;
  const layerDef = layerForZoom(map.getZoom());
  if (layerDef.id === state.currentAutoLayerId) return;
  state.currentAutoLayerId = layerDef.id;
  setBaseLayerFromUrl(layerDef);
}
function toggleBaseMap() {
  if (state.baseMode === "map") {
    state.baseMode = "satellite"; state.currentAutoLayerId = null; setBaseLayerFromUrl(SATELLITE_LAYER); el("btn-basemap").textContent = "Carte";
  } else {
    state.baseMode = "map"; el("btn-basemap").textContent = "Satellite"; refreshAutomaticBaseLayer();
  }
}
function getCataloguePath(item) { return item.catalogue || `data/bisses/${item.id}/catalogue.json`; }
function getSegmentsPath(item) { return item.segments || `data/bisses/${item.id}/segments.geojson`; }
async function loadBisseData(item) {
  if (state.cache.has(item.id)) return state.cache.get(item.id);
  const [catalogue, geojson] = await Promise.all([loadJson(getCataloguePath(item)), loadJson(getSegmentsPath(item))]);
  const data = { item, catalogue, geojson };
  state.cache.set(item.id, data);
  return data;
}
function categoryMap(catalogue) { const out = {}; for (const c of catalogue.segment_categories || []) out[c.id] = c; return out; }
function categoryForFeature(feature, categories) {
  const type = feature?.properties?.structure_type || "unknown";
  return categories[type] || { id: type, name: STRUCTURE_FALLBACK_LABELS[type] || type || "Non classé", color: "#666666" };
}
function featureCoordinates(feature) {
  const g = feature.geometry || {};
  if (g.type === "LineString") return g.coordinates || [];
  if (g.type === "MultiLineString") return (g.coordinates || []).flat();
  return [];
}
function boundsFromGeojson(geojson) {
  const bounds = L.latLngBounds();
  for (const f of geojson.features || []) for (const c of featureCoordinates(f)) if (Array.isArray(c) && c.length >= 2) bounds.extend([c[1], c[0]]);
  return bounds;
}
function extendBoundsWithPhotos(bounds, photos) { for (const p of photos || []) if (isNumber(p.lat) && isNumber(p.lon)) bounds.extend([p.lat, p.lon]); return bounds; }
function centerFromBounds(bounds) { return bounds && bounds.isValid() ? bounds.getCenter() : L.latLng(VALAIS_CENTER[0], VALAIS_CENTER[1]); }
function selectedPhotos(catalogue) {
  return (catalogue.photos || []).filter(p => p.filename_web).sort((a, b) => {
    const ao = Number(a.platform_order || 999999), bo = Number(b.platform_order || 999999);
    if (ao !== bo) return ao - bo;
    return String(a.title || "").localeCompare(String(b.title || ""), "fr");
  });
}
function renderList() {
  el("bisse-list").innerHTML = state.index.map(item => `<button class="bisse-button" type="button" data-bisse-id="${escapeHtml(item.id)}"><strong>${escapeHtml(item.title || item.id)}</strong><span>${escapeHtml([item.region, item.commune].filter(Boolean).join(" · "))}</span></button>`).join("");
  for (const button of document.querySelectorAll(".bisse-button")) button.addEventListener("click", () => { selectBisse(button.dataset.bisseId); closeList(); });
}
function bisseMarkerIcon(item) {
  const title = item.title || item.id;
  const short = title.replace(/^bisse\s+de\s+/i, "").replace(/^bisse\s+du\s+/i, "").replace(/^bisse\s+d['’]/i, "").trim();
  return L.divIcon({ className: "", html: `<div class="bisse-marker">${escapeHtml(short || "Bisse")}</div>`, iconSize: null, iconAnchor: [16, 16] });
}
async function renderBisseMarkers() {
  state.bisseMarkers.clearLayers();
  const allBounds = L.latLngBounds();
  for (const item of state.index) {
    try {
      const data = await loadBisseData(item);
      const geoBounds = boundsFromGeojson(data.geojson);
      const center = item.center && item.center.length >= 2 ? L.latLng(item.center[0], item.center[1]) : centerFromBounds(geoBounds);
      if (geoBounds.isValid()) allBounds.extend(geoBounds);
      const marker = L.marker(center, { icon: bisseMarkerIcon(item), title: item.title || item.id });
      marker.bindTooltip(escapeHtml(item.title || item.id), { className: "bisse-tooltip", direction: "top", offset: [0, -10] });
      marker.on("click", () => selectBisse(item.id));
      marker.addTo(state.bisseMarkers);
    } catch (error) { console.warn(error); }
  }
  state.allBounds = allBounds.isValid() ? allBounds : null;
}
function removeSelectedLayers() {
  if (state.selectedOutlineLayer) { map.removeLayer(state.selectedOutlineLayer); state.selectedOutlineLayer = null; }
  if (state.selectedColorLayer) { map.removeLayer(state.selectedColorLayer); state.selectedColorLayer = null; }
  state.photoLayer.clearLayers();
}
function outlineStyle() { return { pane: "segmentOutline", color: "#ffffff", weight: 9, opacity: .95, lineCap: "round", lineJoin: "round", interactive: false }; }
function colorStyle(feature, categories) {
  const c = categoryForFeature(feature, categories);
  return { pane: "segmentColor", color: c.color || "#666666", weight: 5, opacity: .95, lineCap: "round", lineJoin: "round" };
}
function structureLabel(feature, categories) { return categoryForFeature(feature, categories).name || "Non classé"; }
function waterStatusLabel(value) { return WATER_STATUS_LABELS[value] || value || "inconnu"; }
function bindSegmentInteraction(layer, feature, data, categories) {
  const info = data.catalogue.bisse_info || {};
  const bisseTitle = info.title || data.item.title || "Bisse";
  const typeLabel = structureLabel(feature, categories);
  layer.bindTooltip(`${escapeHtml(bisseTitle)} — ${escapeHtml(typeLabel)}`, { className: "segment-tooltip", sticky: true, direction: "top" });
  layer.on("click", () => { renderSegmentContext(feature, data, categories); openContext(); });
}
function renderSelectedSegments(data) {
  const categories = categoryMap(data.catalogue);
  state.selectedOutlineLayer = L.geoJSON(data.geojson, { pane: "segmentOutline", style: outlineStyle }).addTo(map);
  state.selectedColorLayer = L.geoJSON(data.geojson, { pane: "segmentColor", style: f => colorStyle(f, categories), onEachFeature: (f, layer) => bindSegmentInteraction(layer, f, data, categories) }).addTo(map);
}
function photoIcon() { return L.divIcon({ className: "", html: `<div class="photo-marker"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] }); }
function renderPhotosOnMap(data) {
  state.photoLayer.clearLayers();
  for (const photo of selectedPhotos(data.catalogue)) {
    if (!isNumber(photo.lat) || !isNumber(photo.lon)) continue;
    const marker = L.marker([photo.lat, photo.lon], { pane: "photoMarkers", icon: photoIcon(), title: photo.title || "Photo" });
    marker.bindTooltip(escapeHtml(photo.title || "Photo"), { className: "bisse-tooltip", direction: "top", offset: [0, -8] });
    marker.on("click", () => { renderPhotoContext(photo, data); openContext(); });
    marker.addTo(state.photoLayer);
  }
}
function renderLegend(catalogue) {
  el("map-legend").innerHTML = (catalogue.segment_categories || []).map(c => `<span class="legend-item"><span class="legend-swatch" style="background:${escapeHtml(c.color || "#666")}"></span>${escapeHtml(c.name || c.id)}</span>`).join("");
}
function formatBool(value) { if (value === true) return "oui"; if (value === false) return "non"; return "—"; }
function formatDistance(value) { return isNumber(value) ? `${String(value).replace(".", ",")} km` : "—"; }
function formatAltitude(min, max) { if (isNumber(min) && isNumber(max)) return `${min}–${max} m`; if (isNumber(min)) return `${min} m`; if (isNumber(max)) return `${max} m`; return "—"; }
function renderBissePanel(data) {
  const info = data.catalogue.bisse_info || {};
  const photos = selectedPhotos(data.catalogue);
  el("panel-title").textContent = info.title || data.item.title || "Bisse";
  el("panel-content").innerHTML = `<article><p class="lead">${escapeHtml(info.description || "Aucune description pour le moment.")}</p>${info.itinerary ? `<div class="context-row"><strong>Itinéraire</strong><span>${escapeHtml(info.itinerary)}</span></div>` : ""}<dl class="fact-grid"><div class="fact"><dt>Région</dt><dd>${escapeHtml(info.region || "—")}</dd></div><div class="fact"><dt>Commune</dt><dd>${escapeHtml(info.commune || "—")}</dd></div><div class="fact"><dt>Longueur</dt><dd>${escapeHtml(formatDistance(info.length_km))}</dd></div><div class="fact"><dt>Altitude</dt><dd>${escapeHtml(formatAltitude(info.altitude_min_m, info.altitude_max_m))}</dd></div><div class="fact"><dt>Cotation</dt><dd>${escapeHtml(info.difficulty || "—")}</dd></div><div class="fact"><dt>Sentier balisé</dt><dd>${escapeHtml(formatBool(info.marked_trail))}</dd></div><div class="fact"><dt>État</dt><dd>${escapeHtml(info.state || "—")}</dd></div></dl>${(info.tags || []).length ? `<div class="tags">${info.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>` : ""}${photos.length ? `<h3>Photos choisies</h3><div class="gallery">${photos.map((p, i) => `<button class="photo-card" type="button" data-photo-index="${i}"><img src="${escapeHtml(p.filename_web)}" alt=""><div><strong>${escapeHtml(p.title || "Photo")}</strong><span>${escapeHtml(p.description || "")}</span></div></button>`).join("")}</div>` : `<p class="muted">Aucune photo choisie pour la plateforme pour le moment.</p>`}</article>`;
  for (const button of document.querySelectorAll(".photo-card")) button.addEventListener("click", () => { const photo = photos[Number(button.dataset.photoIndex)]; if (photo) { renderPhotoContext(photo, data); openContext(); if (isNumber(photo.lat) && isNumber(photo.lon)) map.flyTo([photo.lat, photo.lon], Math.max(map.getZoom(), 15), { duration: .5 }); } });
  openBissePanel();
}
function renderSegmentContext(feature, data, categories) {
  const p = feature.properties || {}, info = data.catalogue.bisse_info || {};
  const typeLabel = structureLabel(feature, categories);
  const segmentName = p.name && !/^segment\s+\d+/i.test(p.name) ? p.name : "";
  el("context-content").innerHTML = `<h3 class="context-title">${escapeHtml(typeLabel)}</h3><div class="context-row"><strong>Bisse</strong><span>${escapeHtml(info.title || data.item.title || "—")}</span></div>${segmentName ? `<div class="context-row"><strong>Tronçon</strong><span>${escapeHtml(segmentName)}</span></div>` : ""}<div class="context-row"><strong>Type</strong><span>${escapeHtml(typeLabel)}</span></div><div class="context-row"><strong>État de l’eau</strong><span>${escapeHtml(waterStatusLabel(p.water_status))}</span></div>`;
}
function renderPhotoContext(photo, data) {
  const info = data.catalogue.bisse_info || {};
  el("context-content").innerHTML = `${photo.filename_web ? `<img class="context-photo" src="${escapeHtml(photo.filename_web)}" alt="">` : ""}<h3 class="context-title">${escapeHtml(photo.title || "Photo")}</h3><div class="context-row"><strong>Bisse</strong><span>${escapeHtml(info.title || data.item.title || "—")}</span></div>${photo.description ? `<div class="context-row"><strong>Description</strong><span>${escapeHtml(photo.description)}</span></div>` : ""}${photo.date ? `<div class="context-row"><strong>Date</strong><span>${escapeHtml(photo.date)}</span></div>` : ""}`;
}
async function selectBisse(id) {
  const item = state.index.find(e => e.id === id);
  if (!item) return;
  state.selectedId = id; removeSelectedLayers();
  try {
    const data = await loadBisseData(item);
    renderBissePanel(data); renderLegend(data.catalogue); renderSelectedSegments(data); renderPhotosOnMap(data);
    const bounds = boundsFromGeojson(data.geojson); extendBoundsWithPhotos(bounds, selectedPhotos(data.catalogue));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
  } catch (error) {
    console.error(error);
    el("panel-content").innerHTML = `<div class="error-box"><strong>Erreur de chargement</strong><br>${escapeHtml(error.message)}</div>`;
    openBissePanel();
  }
}
function openBissePanel() { el("bisse-panel").classList.add("is-open"); }
function closeBissePanel() { el("bisse-panel").classList.remove("is-open"); }
function openContext() { el("context-panel").classList.add("is-open"); }
function closeContext() { el("context-panel").classList.remove("is-open"); }
function openList() { el("list-panel").classList.add("is-open"); }
function closeList() { el("list-panel").classList.remove("is-open"); }
function resetValaisView() {
  removeSelectedLayers(); state.selectedId = null; closeContext(); el("map-legend").innerHTML = "";
  map.setView(VALAIS_CENTER, VALAIS_ZOOM);
  el("panel-title").textContent = "Bisses du Valais";
  el("panel-content").innerHTML = `<p class="muted">Cliquez sur une pastille pour afficher le tracé détaillé d’un bisse. La liste des bisses reste disponible comme vue alternative.</p>`;
  openBissePanel();
}
async function init() {
  refreshAutomaticBaseLayer();
  state.index = await loadJson("data/bisses_index.json");
  renderList();
  await renderBisseMarkers();
  resetValaisView();
  if (!state.index.length) el("panel-content").innerHTML = `<div class="error-box">Aucun bisse trouvé dans <code>data/bisses_index.json</code>.</div>`;
}
map.on("zoomend", refreshAutomaticBaseLayer);
el("btn-basemap").addEventListener("click", toggleBaseMap);
el("btn-valais").addEventListener("click", resetValaisView);
el("btn-list").addEventListener("click", openList);
el("btn-close-list").addEventListener("click", closeList);
el("btn-close-panel").addEventListener("click", closeBissePanel);
el("btn-close-context").addEventListener("click", closeContext);
init().catch(error => {
  console.error(error);
  el("panel-title").textContent = "Erreur";
  el("panel-content").innerHTML = `<div class="error-box"><strong>Impossible d’initialiser la plateforme.</strong><br>${escapeHtml(error.message)}<br><br>Vérifiez la présence de <code>data/bisses_index.json</code>.</div>`;
});
