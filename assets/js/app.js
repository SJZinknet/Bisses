/* global L */
"use strict";

console.log("Bisses build bisses-bicolor-polylineoffset-2026-06-07-a");

const VALAIS_CENTER = [46.22, 7.55];
const VALAIS_ZOOM = 17;
const MIN_ZOOM = 16;
const MAX_ZOOM = 27;

const SHOW_SEGMENTS_OPEN_CANALIZED_AT_ZOOM = 19;
const SHOW_SEGMENTS_ABANDONED_AT_ZOOM = 20;

const SEGMENT_STYLE = {
  outlineWeight: 13,
  colorWeight: 9,
  opacity: 0.99
};

const BICOLOR_STYLE = {
  outlineWeight: 13,
  flankWeight: 5.8,
  offset: 2.35,
  opacity: 0.99,
  clickWeight: 20
};

const MAP_SCALE_STEPS = [
  { min: 16, max: 16, label: "Fond général", layer: "ch.swisstopo.pixelkarte-farbe", format: "jpeg", maxNativeZoom: 27 },
  { min: 17, max: 17, label: "CN 1:1 million", layer: "ch.swisstopo.pixelkarte-farbe-pk1000.noscale", format: "jpeg", maxNativeZoom: 27 },
  { min: 18, max: 18, label: "CN 1:500k", layer: "ch.swisstopo.pixelkarte-farbe-pk500.noscale", format: "jpeg", maxNativeZoom: 27 },
  { min: 19, max: 19, label: "CN 1:200k", layer: "ch.swisstopo.pixelkarte-farbe-pk200.noscale", format: "jpeg", maxNativeZoom: 27 },
  { min: 20, max: 20, label: "CN 1:100k", layer: "ch.swisstopo.pixelkarte-farbe-pk100.noscale", format: "jpeg", maxNativeZoom: 27 },
  { min: 21, max: 21, label: "CN 1:50k", layer: "ch.swisstopo.pixelkarte-farbe-pk50.noscale", format: "jpeg", maxNativeZoom: 27 },
  { min: 22, max: 23, label: "CN 1:25k", layer: "ch.swisstopo.pixelkarte-farbe-pk25.noscale", format: "jpeg", maxNativeZoom: 27 },
  { min: 24, max: 27, label: "CN 1:10k", layer: "ch.swisstopo.landeskarte-farbe-10", format: "png", maxNativeZoom: 27 }
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
  open: { id: "open", name: "À ciel ouvert", color: "#1e88e5" },
  canalized: { id: "canalized", name: "Canalisé", color: "#111111" },
  abandoned: { id: "abandoned", name: "Abandonné", color: "#ef6c00" },
  mixed: { id: "mixed", name: "Mixte", color: "#777777" },
  unknown: { id: "unknown", name: "Non classé", color: "#777777" }
};

const state = {
  index: [],
  cache: new Map(),
  selectedId: null,
  base: "carto",
  currentStepKey: "",
  currentSegmentsKey: "",
  baseLayer: null,
  bisseMarkers: L.layerGroup(),
  segmentOutlineLayer: null,
  segmentColorLayer: null,
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

function setBaseLayer(step) {
  const key = `${state.base}:${step.layer}:${step.format}`;

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
    setBaseLayer(stepForZoom(map.getZoom()));
  }
}

function toggleBase() {
  state.base = state.base === "carto" ? "satellite" : "carto";
  $("btn-basemap").textContent = state.base === "carto" ? "Satellite" : "Carte";
  state.currentStepKey = "";
  refreshBaseLayer();
}

function updateScalePill(segmentCount = null) {
  const zoom = map.getZoom();
  const step = state.base === "satellite" ? SATELLITE_STEP : stepForZoom(zoom);
  const extra = segmentCount === null ? "" : ` · ${segmentCount} segments`;
  showScale(`${step.label} · z${zoom}${extra}`);
}

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

function typesForCurrentZoom() {
  const zoom = map.getZoom();

  if (zoom >= SHOW_SEGMENTS_ABANDONED_AT_ZOOM) {
    return ["open", "canalized", "abandoned", "mixed"];
  }

  if (zoom >= SHOW_SEGMENTS_OPEN_CANALIZED_AT_ZOOM) {
    return ["open", "canalized", "mixed"];
  }

  return [];
}

function shouldShowFeature(feature, allowedTypes) {
  if (!allowedTypes.length) return false;

  if (isBicolorFeature(feature)) {
    return normalizedStructureTypes(feature).some((type) => allowedTypes.includes(type));
  }

  const type = normalizeStructureType(feature?.properties?.structure_type);
  return allowedTypes.includes(type);
}

function refreshMarkerVisibility() {
  const segmentsMode = map.getZoom() >= SHOW_SEGMENTS_OPEN_CANALIZED_AT_ZOOM;
  const mapEl = $("map");

  if (segmentsMode) {
    mapEl.classList.add("segments-mode");
    if (map.hasLayer(state.bisseMarkers)) {
      map.removeLayer(state.bisseMarkers);
    }
  } else {
    mapEl.classList.remove("segments-mode");
    if (!map.hasLayer(state.bisseMarkers)) {
      state.bisseMarkers.addTo(map);
    }
  }
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

function buildVisibleSegmentsFeatureCollection(dataList, allowedTypes) {
  const features = [];

  for (const data of dataList) {
    const cats = categories(data.catalogue);
    const info = data.catalogue.bisse_info || {};
    const bisseTitle = info.title || data.item.title || "Bisse";

    for (const feature of data.geojson.features || []) {
      if (!shouldShowFeature(feature, allowedTypes)) continue;

      const cloned = JSON.parse(JSON.stringify(feature));
      cloned.properties = cloned.properties || {};
      cloned.properties.structure_type = normalizeStructureType(cloned.properties.structure_type);
      cloned.properties.__bisse_id = data.item.id;
      cloned.properties.__bisse_title = bisseTitle;
      cloned.properties.__category_name = segmentDisplayName(cloned, cats);

      if (isBicolorFeature(cloned)) {
        cloned.properties.__display_mode = "bicolor";
        cloned.properties.__bicolor_colors = bicolorColors(cloned, cats);
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

function bindSegmentInteraction(layer, feature) {
  const title = feature.properties.__bisse_title || "Bisse";
  const type = feature.properties.__category_name || "Segment";

  layer.bindTooltip(`${escapeHtml(title)} — ${escapeHtml(type)}`, {
    className: "segment-tooltip",
    sticky: true
  });

  layer.on("click", () => {
    const id = feature.properties.__bisse_id;
    if (id) {
      selectBisse(id, { fit: false });
    }

    const modeLabel = feature.properties.__display_mode === "bicolor" ? "Segment bicolore" : type;

    $("context-content").innerHTML = `
      <h3>${escapeHtml(modeLabel)}</h3>
      <div class="context-row">
        <strong>Bisse</strong>
        <span>${escapeHtml(title)}</span>
      </div>
      <div class="context-row">
        <strong>Type</strong>
        <span>${escapeHtml(type)}</span>
      </div>
      <div class="context-row">
        <strong>État de l’eau</strong>
        <span>${escapeHtml(WATER_LABELS[feature.properties.water_status] || feature.properties.water_status || "inconnu")}</span>
      </div>
    `;
    openContext();
  });
}

function addHaloForPart(layerGroup, latlngs, weight) {
  if (!latlngs.length) return;

  L.polyline(latlngs, {
    pane: "segmentOutlinePane",
    color: "#ffffff",
    weight,
    opacity: SEGMENT_STYLE.opacity,
    lineCap: "round",
    lineJoin: "round",
    interactive: false
  }).addTo(layerGroup);
}

function addClickTarget(layerGroup, latlngs, feature) {
  if (!latlngs.length) return;

  const target = L.polyline(latlngs, {
    pane: "segmentHitPane",
    color: "#000000",
    weight: BICOLOR_STYLE.clickWeight,
    opacity: 0,
    lineCap: "round",
    lineJoin: "round",
    interactive: true
  }).addTo(layerGroup);

  bindSegmentInteraction(target, feature);
}

function addSingleSegment(layerGroup, outlineGroup, feature) {
  const parts = latlngPartsFromGeometry(feature.geometry);
  const color = feature.properties.__category_color || "#777777";

  for (const latlngs of parts) {
    addHaloForPart(outlineGroup, latlngs, SEGMENT_STYLE.outlineWeight);

    const line = L.polyline(latlngs, {
      pane: "segmentColorPane",
      color,
      weight: SEGMENT_STYLE.colorWeight,
      opacity: SEGMENT_STYLE.opacity,
      lineCap: "round",
      lineJoin: "round",
      interactive: true
    }).addTo(layerGroup);

    bindSegmentInteraction(line, feature);
    addClickTarget(layerGroup, latlngs, feature);
  }
}

function addBicolorSegment(layerGroup, outlineGroup, feature) {
  const parts = latlngPartsFromGeometry(feature.geometry);
  const colors = Array.isArray(feature.properties.__bicolor_colors)
    ? feature.properties.__bicolor_colors
    : ["#ef6c00", "#111111"];

  const colorA = colors[0] || "#ef6c00";
  const colorB = colors[1] || "#111111";

  for (const latlngs of parts) {
    addHaloForPart(outlineGroup, latlngs, BICOLOR_STYLE.outlineWeight);

    const left = L.polyline(latlngs, {
      pane: "segmentColorPane",
      color: colorA,
      weight: BICOLOR_STYLE.flankWeight,
      opacity: BICOLOR_STYLE.opacity,
      lineCap: "round",
      lineJoin: "round",
      offset: -BICOLOR_STYLE.offset,
      interactive: true
    }).addTo(layerGroup);

    const right = L.polyline(latlngs, {
      pane: "segmentColorPane",
      color: colorB,
      weight: BICOLOR_STYLE.flankWeight,
      opacity: BICOLOR_STYLE.opacity,
      lineCap: "round",
      lineJoin: "round",
      offset: BICOLOR_STYLE.offset,
      interactive: true
    }).addTo(layerGroup);

    bindSegmentInteraction(left, feature);
    bindSegmentInteraction(right, feature);
    addClickTarget(layerGroup, latlngs, feature);
  }
}

function drawVisibleSegments(featureCollection) {
  const outlineGroup = L.layerGroup();
  const colorGroup = L.layerGroup();

  for (const feature of featureCollection.features || []) {
    if (feature.properties.__display_mode === "bicolor") {
      addBicolorSegment(colorGroup, outlineGroup, feature);
    } else {
      addSingleSegment(colorGroup, outlineGroup, feature);
    }
  }

  state.segmentOutlineLayer = outlineGroup.addTo(map);
  state.segmentColorLayer = colorGroup.addTo(map);
}

async function refreshVisibleSegments() {
  refreshMarkerVisibility();

  const allowedTypes = typesForCurrentZoom();
  const key = `${allowedTypes.join(",")}:${state.index.length}:${state.cache.size}`;

  if (!allowedTypes.length) {
    state.currentSegmentsKey = key;
    removeVisibleSegments();
    updateScalePill(0);
    return;
  }

  if (state.currentSegmentsKey === key && state.segmentColorLayer) {
    updateScalePill(state.segmentColorLayer.getLayers().length);
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
  }

  const visibleGeojson = buildVisibleSegmentsFeatureCollection(dataList, allowedTypes);
  drawVisibleSegments(visibleGeojson);
  updateScalePill(visibleGeojson.features.length);
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

  refreshMarkerVisibility();
}

function clearSelectedPhotosAndLegend() {
  state.photoLayer.clearLayers();
  $("legend").innerHTML = "";
}

function renderLegend(catalogue) {
  $("legend").innerHTML = (catalogue.segment_categories || []).map((cat) => `
    <span class="legend-item">
      <span class="legend-swatch" style="background:${escapeHtml(cat.color || "#777")}"></span>
      ${escapeHtml(cat.name || cat.label || cat.id)}
    </span>
  `).join("");
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

async function selectBisse(id, options = {}) {
  const item = state.index.find((x) => x.id === id);
  if (!item) return;

  state.selectedId = id;
  clearSelectedPhotosAndLegend();
  showStatus("Chargement du bisse…");

  try {
    const data = await loadBisse(item);
    renderPanel(data);
    renderLegend(data.catalogue);
    renderPhotos(data);

    if (options.fit !== false) {
      const b = boundsWithPhotos(geoBounds(data.geojson), selectedPhotos(data.catalogue));
      if (b.isValid()) {
        map.fitBounds(b, { padding: [70, 70], maxZoom: MAX_ZOOM });
      }
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
  clearSelectedPhotosAndLegend();
  closeContext();

  map.setView(VALAIS_CENTER, VALAIS_ZOOM);

  $("panel-title").textContent = "Bisses du Valais";
  $("panel-content").innerHTML = `
    <p class="muted">
      Cliquez sur une pastille pour afficher un bisse.
      Les traces apparaissent automatiquement à partir du zoom 19.
    </p>
  `;

  openPanel();
  refreshVisibleSegments();
}

async function init() {
  try {
    showStatus("Chargement des bisses…");

    state.index = await loadJson("data/bisses_index.json");
    renderList();
    await renderMarkers();
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
$("btn-close-list").addEventListener("click", closeList);
$("btn-close-panel").addEventListener("click", closePanel);
$("btn-close-context").addEventListener("click", closeContext);

map.setView(VALAIS_CENTER, VALAIS_ZOOM);
refreshBaseLayer();
init();
