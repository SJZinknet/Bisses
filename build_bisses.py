#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_bisses.py

Générateur unique des fichiers fixes de la plateforme GitHub Pages « Bisses ».

Rôle de ce script :
- générer index.html ;
- générer .nojekyll ;
- générer assets/css/styles.css ;
- générer assets/js/app.js.

Ce script NE génère PAS les données de bisses.
Les données doivent venir de gestion_bisses.py, sous la forme :

data/
├─ bisses_index.json
└─ bisses/
   └─ <slug>/
      ├─ catalogue.json
      └─ segments.geojson

media/
└─ <slug>/
   └─ photo_001_web.jpg

Utilisation depuis la racine du dépôt GitHub local « Bisses » :

    python build_bisses.py

Ou vers un autre dossier :

    python build_bisses.py --out /chemin/vers/Bisses
"""

from __future__ import annotations

import argparse
from pathlib import Path
from textwrap import dedent


INDEX_HTML = r'''<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bisses du Valais</title>
  <link rel="stylesheet" href="assets/css/styles.css">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
</head>
<body>
  <div id="app-shell">
    <header class="topbar">
      <div class="brand">
        <p class="eyebrow">Inventaire cartographique</p>
        <h1>Bisses du Valais</h1>
      </div>
      <nav class="top-actions" aria-label="Contrôles de la carte">
        <button id="btn-valais" class="ui-button" type="button">Vue Valais</button>
        <button id="btn-list" class="ui-button" type="button">Liste des bisses</button>
        <button id="btn-basemap" class="ui-button" type="button">Satellite</button>
      </nav>
    </header>
    <main class="map-stage">
      <div id="map" aria-label="Carte interactive des bisses du Valais"></div>
      <aside id="bisse-panel" class="side-panel is-open" aria-label="Informations du bisse">
        <div class="panel-header">
          <div>
            <p class="panel-kicker">Bisse sélectionné</p>
            <h2 id="panel-title">Bisses du Valais</h2>
          </div>
          <button id="btn-close-panel" class="icon-button" type="button" aria-label="Fermer le panneau">×</button>
        </div>
        <div id="panel-content" class="panel-content">
          <p class="muted">Cliquez sur une pastille pour afficher le tracé détaillé d’un bisse.</p>
        </div>
      </aside>
      <aside id="context-panel" class="context-panel" aria-label="Informations contextuelles">
        <div class="context-header">
          <p class="panel-kicker">Détail cartographique</p>
          <button id="btn-close-context" class="icon-button" type="button" aria-label="Fermer le détail">×</button>
        </div>
        <div id="context-content">
          <p class="muted">Cliquez sur une trace ou une photo pour afficher ses informations.</p>
        </div>
      </aside>
      <section id="list-panel" class="list-panel" aria-label="Liste des bisses">
        <div class="panel-header">
          <div>
            <p class="panel-kicker">Vue alternative</p>
            <h2>Liste des bisses</h2>
          </div>
          <button id="btn-close-list" class="icon-button" type="button" aria-label="Fermer la liste">×</button>
        </div>
        <div id="bisse-list" class="bisse-list"></div>
      </section>
      <div id="map-legend" class="map-legend" aria-label="Légende"></div>
    </main>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="assets/js/app.js"></script>
</body>
</html>
'''


STYLES_CSS = r''':root {
  --bg: #f3efe6;
  --panel: rgba(255, 250, 241, .96);
  --ink: #1e2b22;
  --muted: #657064;
  --line: rgba(75, 66, 48, .18);
  --shadow: 0 18px 48px rgba(25, 31, 24, .18);
}
* { box-sizing: border-box; }
html, body, #app-shell { width: 100%; height: 100%; margin: 0; }
body {
  overflow: hidden;
  font-family: Candara, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--ink);
  background: var(--bg);
}
button, input { font: inherit; }
.topbar {
  position: absolute;
  z-index: 900;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  pointer-events: none;
}
.brand, .top-actions { pointer-events: auto; }
.brand {
  min-width: 260px;
  padding: 14px 18px;
  border: 1px solid rgba(255, 255, 255, .22);
  border-radius: 22px;
  color: white;
  background: radial-gradient(circle at 15% 20%, rgba(255,255,255,.18), transparent 36%), linear-gradient(135deg, rgba(32,49,38,.96), rgba(86,108,78,.92));
  box-shadow: var(--shadow);
  backdrop-filter: blur(8px);
}
.eyebrow, .panel-kicker {
  margin: 0 0 5px;
  text-transform: uppercase;
  letter-spacing: .13em;
  font-size: .72rem;
  font-weight: 700;
  opacity: .72;
}
.brand h1, .panel-header h2, .panel-content h2, .list-panel h2 { margin: 0; line-height: 1.05; }
.brand h1 { font-size: clamp(1.55rem, 3vw, 2.35rem); }
.top-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: end; }
.ui-button, .icon-button {
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  box-shadow: 0 10px 28px rgba(25,31,24,.12);
  cursor: pointer;
}
.ui-button { min-height: 40px; padding: 9px 13px; border-radius: 999px; }
.ui-button:hover, .icon-button:hover { background: white; }
.icon-button { width: 34px; height: 34px; border-radius: 50%; font-size: 1.25rem; line-height: 1; }
.map-stage { width: 100%; height: 100%; position: relative; }
#map { width: 100%; height: 100%; background: #dfe5da; }
.side-panel, .context-panel, .list-panel, .map-legend {
  position: absolute;
  z-index: 850;
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  backdrop-filter: blur(10px);
}
.side-panel {
  left: 16px;
  bottom: 18px;
  width: min(430px, calc(100vw - 32px));
  max-height: calc(100vh - 170px);
  border-radius: 26px;
  transform: translateX(0);
  transition: transform .22s ease, opacity .22s ease;
  overflow: hidden;
}
.side-panel:not(.is-open) { transform: translateX(calc(-100% - 28px)); opacity: .2; pointer-events: none; }
.context-panel {
  right: 16px;
  bottom: 18px;
  width: min(360px, calc(100vw - 32px));
  max-height: min(58vh, 520px);
  border-radius: 24px;
  overflow: hidden;
  transform: translateY(0);
  transition: transform .18s ease, opacity .18s ease;
}
.context-panel:not(.is-open) { transform: translateY(18px); opacity: 0; pointer-events: none; }
.list-panel {
  right: 16px;
  top: 88px;
  width: min(380px, calc(100vw - 32px));
  max-height: calc(100vh - 118px);
  border-radius: 24px;
  overflow: hidden;
  transform: translateX(0);
  transition: transform .22s ease, opacity .22s ease;
}
.list-panel:not(.is-open) { transform: translateX(calc(100% + 28px)); opacity: 0; pointer-events: none; }
.panel-header, .context-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 13px;
  border-bottom: 1px solid var(--line);
}
.panel-content, #context-content { padding: 17px 18px 20px; overflow: auto; }
.panel-content { max-height: calc(100vh - 260px); }
#context-content { max-height: min(48vh, 430px); }
.muted { color: var(--muted); }
.lead { margin: 10px 0 14px; line-height: 1.5; font-size: 1.02rem; }
.fact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin: 14px 0; }
.fact { padding: 10px 0; border-top: 1px solid var(--line); }
.fact dt { color: var(--muted); font-size: .72rem; text-transform: uppercase; letter-spacing: .08em; }
.fact dd { margin: 4px 0 0; font-weight: 700; }
.tags { display: flex; flex-wrap: wrap; gap: 7px; margin: 13px 0 0; }
.tag { display: inline-flex; align-items: center; min-height: 26px; border: 1px solid var(--line); border-radius: 999px; padding: 4px 9px; background: white; font-size: .88rem; }
.gallery { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 16px; }
.photo-card { border: 1px solid var(--line); border-radius: 15px; overflow: hidden; background: white; cursor: pointer; padding: 0; text-align: left; color: inherit; }
.photo-card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
.photo-card div { padding: 8px; }
.photo-card strong { display: block; font-size: .9rem; }
.photo-card span { display: block; margin-top: 3px; color: var(--muted); font-size: .78rem; line-height: 1.25; }
.bisse-list { padding: 14px; overflow: auto; max-height: calc(100vh - 190px); display: grid; gap: 9px; }
.bisse-button { appearance: none; border: 1px solid var(--line); border-radius: 16px; background: white; color: var(--ink); padding: 12px 13px; text-align: left; cursor: pointer; }
.bisse-button:hover { border-color: rgba(63,98,69,.5); }
.bisse-button strong { display: block; }
.bisse-button span { display: block; margin-top: 4px; color: var(--muted); font-size: .86rem; }
.map-legend {
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: min(720px, calc(100vw - 40px));
  padding: 8px;
  border-radius: 999px;
}
.legend-item { display: inline-flex; align-items: center; gap: 6px; min-height: 28px; padding: 4px 9px; border: 1px solid var(--line); border-radius: 999px; background: white; font-size: .86rem; }
.legend-swatch { width: 12px; height: 12px; border-radius: 50%; }
.bisse-marker { display: grid; place-items: center; min-width: 28px; height: 28px; padding: 0 8px; border: 2px solid white; border-radius: 999px; background: #355f40; color: white; font-weight: 700; font-size: 12px; box-shadow: 0 5px 14px rgba(0,0,0,.28); white-space: nowrap; }
.photo-marker { width: 18px; height: 18px; border: 2px solid white; border-radius: 50%; background: radial-gradient(circle at 50% 50%, #ffffff 0 2px, transparent 3px), #243127; box-shadow: 0 4px 12px rgba(0,0,0,.30); }
.leaflet-tooltip.bisse-tooltip, .leaflet-tooltip.segment-tooltip { border: 0; border-radius: 999px; padding: 6px 9px; background: rgba(31,43,34,.92); color: white; box-shadow: 0 8px 22px rgba(0,0,0,.20); font-family: Candara, "Segoe UI", system-ui, sans-serif; font-size: .88rem; }
.context-title { margin: 0 0 8px; font-size: 1.2rem; }
.context-row { padding: 8px 0; border-top: 1px solid var(--line); }
.context-row strong { display: block; color: var(--muted); font-size: .74rem; text-transform: uppercase; letter-spacing: .08em; }
.context-row span { display: block; margin-top: 3px; }
.context-photo { width: 100%; border-radius: 16px; display: block; margin: 0 0 12px; }
.error-box { padding: 12px; border: 1px solid rgba(154,76,61,.35); border-radius: 16px; color: #733328; background: rgba(154,76,61,.08); }
@media (max-width: 820px) {
  .topbar { display: block; }
  .brand { width: max-content; max-width: calc(100vw - 32px); margin-bottom: 8px; }
  .top-actions { justify-content: start; }
  .side-panel { width: calc(100vw - 32px); max-height: 46vh; }
  .context-panel { right: 16px; left: 16px; width: auto; }
  .map-legend { display: none; }
  .fact-grid, .gallery { grid-template-columns: 1fr; }
}
'''


APP_JS = r'''/* global L */
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
'''


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def build_site(out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    write_file(out_dir / "index.html", INDEX_HTML)
    write_file(out_dir / ".nojekyll", "")
    write_file(out_dir / "assets" / "css" / "styles.css", STYLES_CSS)
    write_file(out_dir / "assets" / "js" / "app.js", APP_JS)
    (out_dir / "data" / "bisses").mkdir(parents=True, exist_ok=True)
    (out_dir / "media").mkdir(parents=True, exist_ok=True)
    readme = dedent("""\
    # Bisses

    Plateforme statique GitHub Pages pour l'inventaire cartographique des bisses du Valais.

    ## Générer les fichiers fixes du site

    ```bash
    python build_bisses.py
    ```

    Le script génère `index.html`, `.nojekyll`, `assets/css/styles.css` et `assets/js/app.js`.
    Il ne modifie pas les données `data/` ni les images `media/`.

    ## Tester localement

    ```bash
    python -m http.server 8000
    ```

    Puis ouvrir : http://localhost:8000
    """)
    write_file(out_dir / "README.md", readme)


def main() -> None:
    parser = argparse.ArgumentParser(description="Génère les fichiers fixes de la plateforme GitHub Pages Bisses.")
    parser.add_argument("--out", default=".", help="Dossier de sortie. Par défaut : dossier courant.")
    args = parser.parse_args()
    out_dir = Path(args.out).expanduser().resolve()
    build_site(out_dir)
    print("Plateforme Bisses générée.")
    print(f"Dossier : {out_dir}")
    print("Fichiers écrits : index.html, .nojekyll, assets/css/styles.css, assets/js/app.js")
    print("Données préservées : data/ et media/")


if __name__ == "__main__":
    main()
