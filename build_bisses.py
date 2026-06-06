#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# BUILD_VERSION = "swiss-scale-steps-2026-06-06-copy"

"""
build_bisses.py — générateur unique de la plateforme GitHub Pages « Bisses ».

Version :
- Leaflet
- Leaflet.TileLayer.Swiss
- CRS suisse EPSG:2056
- bascule artificielle des fonds Swisstopo par niveaux de zoom
- données externes lues depuis data/ et media/

Ce script génère uniquement les fichiers fixes du site :
- index.html
- .nojekyll
- assets/css/styles.css
- assets/js/app.js
- README.md

Il ne modifie pas :
- data/
- media/
"""

from __future__ import annotations

import argparse
from pathlib import Path


INDEX_HTML = r'''<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bisses du Valais</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css">
  <link rel="stylesheet" href="assets/css/styles.css">
</head>

<body>
  <div id="map"></div>

  <header class="topbar">
    <div class="brand">
      <div class="eyebrow">Inventaire cartographique</div>
      <h1>Bisses du Valais</h1>
      <div class="build-version">swiss-scale-steps-2026-06-06-copy</div>
    </div>

    <div class="toolbar" aria-label="Contrôles de la carte">
      <button id="btn-valais" type="button">Vue Valais</button>
      <button id="btn-list" type="button">Liste</button>
      <button id="btn-basemap" type="button">Satellite</button>
    </div>
  </header>

  <aside id="bisse-panel" class="panel panel-main">
    <button id="btn-close-panel" class="close-button" type="button" aria-label="Fermer">×</button>
    <div class="panel-kicker">Bisse sélectionné</div>
    <h2 id="panel-title">Bisses du Valais</h2>
    <div id="panel-content">
      <p class="muted">Cliquez sur une pastille pour afficher un bisse.</p>
    </div>
  </aside>

  <aside id="context-panel" class="panel panel-context">
    <button id="btn-close-context" class="close-button" type="button" aria-label="Fermer">×</button>
    <div class="panel-kicker">Détail</div>
    <div id="context-content">
      <p class="muted">Cliquez sur une trace ou une photo.</p>
    </div>
  </aside>

  <aside id="list-panel" class="panel panel-list">
    <button id="btn-close-list" class="close-button" type="button" aria-label="Fermer">×</button>
    <div class="panel-kicker">Vue alternative</div>
    <h2>Liste des bisses</h2>
    <div id="bisse-list"></div>
  </aside>

  <div id="legend" class="legend"></div>
  <div id="scale-pill" class="scale-pill">Fond carte</div>
  <div id="status-pill" class="status-pill">Chargement…</div>

  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/leaflet-tilelayer-swiss@2.4.0/dist/Leaflet.TileLayer.Swiss.umd.js"></script>
  <script src="assets/js/app.js"></script>
</body>
</html>
'''


STYLES_CSS = r'''html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  overflow: hidden;
  font-family: Candara, "Segoe UI", system-ui, sans-serif;
  color: #1f2d24;
  background: #dfe5da;
}

#map {
  position: fixed;
  inset: 0;
  z-index: 1;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: #dfe5da;
}

button {
  font: inherit;
}

.topbar {
  position: fixed;
  z-index: 700;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  pointer-events: none;
}

.brand,
.toolbar,
.panel,
.legend,
.status-pill,
.scale-pill {
  pointer-events: auto;
}

.brand {
  max-width: min(430px, calc(100vw - 32px));
  padding: 14px 18px;
  border-radius: 22px;
  color: #fff;
  background:
    radial-gradient(circle at 15% 20%, rgba(255,255,255,.16), transparent 34%),
    linear-gradient(135deg, rgba(31,47,37,.96), rgba(77,99,70,.93));
  box-shadow: 0 16px 42px rgba(20, 30, 22, .22);
  backdrop-filter: blur(8px);
}

.eyebrow,
.panel-kicker {
  margin: 0 0 5px;
  text-transform: uppercase;
  letter-spacing: .14em;
  font-size: .72rem;
  font-weight: 700;
  opacity: .72;
}

.build-version {
  margin-top: 6px;
  font-size: .72rem;
  opacity: .55;
}

h1,
h2,
h3 {
  margin: 0;
  line-height: 1.08;
}

h1 {
  font-size: clamp(1.7rem, 3vw, 2.55rem);
}

h2 {
  font-size: 1.45rem;
}

h3 {
  font-size: 1.13rem;
}

.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.toolbar button,
.close-button {
  border: 1px solid rgba(66, 58, 43, .18);
  background: rgba(255, 250, 241, .96);
  color: #1f2d24;
  box-shadow: 0 10px 28px rgba(20, 30, 22, .14);
  cursor: pointer;
}

.toolbar button {
  min-height: 40px;
  padding: 9px 14px;
  border-radius: 999px;
}

.toolbar button:hover,
.close-button:hover {
  background: #fff;
}

.panel {
  position: fixed;
  z-index: 650;
  border: 1px solid rgba(66, 58, 43, .18);
  border-radius: 24px;
  background: rgba(255, 250, 241, .96);
  box-shadow: 0 18px 52px rgba(20, 30, 22, .22);
  backdrop-filter: blur(10px);
  overflow: auto;
}

.panel-main {
  left: 16px;
  bottom: 16px;
  width: min(390px, calc(100vw - 32px));
  max-height: calc(100dvh - 155px);
  padding: 20px;
  transform: translateX(0);
  transition: transform .22s ease, opacity .22s ease;
}

.panel-main:not(.is-open) {
  transform: translateX(calc(-100% - 28px));
  opacity: .1;
  pointer-events: none;
}

.panel-context {
  right: 16px;
  bottom: 16px;
  width: min(340px, calc(100vw - 32px));
  max-height: min(56dvh, 520px);
  padding: 18px;
  transform: translateY(0);
  transition: transform .18s ease, opacity .18s ease;
}

.panel-context:not(.is-open) {
  transform: translateY(18px);
  opacity: 0;
  pointer-events: none;
}

.panel-list {
  right: 16px;
  top: 82px;
  width: min(360px, calc(100vw - 32px));
  max-height: calc(100dvh - 106px);
  padding: 18px;
  transform: translateX(0);
  transition: transform .2s ease, opacity .2s ease;
}

.panel-list:not(.is-open) {
  transform: translateX(calc(100% + 28px));
  opacity: 0;
  pointer-events: none;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  font-size: 1.25rem;
  line-height: 1;
}

.muted {
  color: #657064;
}

.lead {
  margin: 12px 0 14px;
  line-height: 1.5;
}

.fact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
  margin-top: 14px;
}

.fact {
  padding-top: 9px;
  border-top: 1px solid rgba(66, 58, 43, .17);
}

.fact dt {
  color: #657064;
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.fact dd {
  margin: 3px 0 0;
  font-weight: 700;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 14px;
}

.tag {
  display: inline-flex;
  border: 1px solid rgba(66, 58, 43, .17);
  border-radius: 999px;
  padding: 5px 9px;
  background: #fff;
  font-size: .86rem;
}

.gallery {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin-top: 14px;
}

.photo-card {
  border: 1px solid rgba(66, 58, 43, .17);
  border-radius: 15px;
  overflow: hidden;
  background: #fff;
  cursor: pointer;
  text-align: left;
  padding: 0;
}

.photo-card img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
}

.photo-card div {
  padding: 8px;
}

.photo-card strong {
  display: block;
  font-size: .9rem;
}

.photo-card span {
  display: block;
  margin-top: 3px;
  color: #657064;
  font-size: .78rem;
  line-height: 1.25;
}

#bisse-list {
  display: grid;
  gap: 9px;
  margin-top: 12px;
}

.bisse-button {
  width: 100%;
  border: 1px solid rgba(66, 58, 43, .17);
  border-radius: 16px;
  background: #fff;
  color: #1f2d24;
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

.bisse-button:hover {
  border-color: rgba(63, 98, 69, .55);
}

.bisse-button strong {
  display: block;
}

.bisse-button span {
  display: block;
  margin-top: 3px;
  color: #657064;
  font-size: .86rem;
}

.legend {
  position: fixed;
  z-index: 620;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 7px;
  max-width: min(760px, calc(100vw - 40px));
  padding: 8px;
  border: 1px solid rgba(66, 58, 43, .18);
  border-radius: 999px;
  background: rgba(255, 250, 241, .94);
  box-shadow: 0 12px 34px rgba(20, 30, 22, .18);
  backdrop-filter: blur(8px);
}

.legend:empty {
  display: none;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 27px;
  padding: 4px 9px;
  border: 1px solid rgba(66, 58, 43, .17);
  border-radius: 999px;
  background: #fff;
  font-size: .86rem;
}

.legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-pill,
.scale-pill {
  position: fixed;
  z-index: 620;
  max-width: min(360px, calc(100vw - 32px));
  padding: 8px 11px;
  border-radius: 999px;
  color: #fff;
  font-size: .84rem;
  box-shadow: 0 10px 30px rgba(20, 30, 22, .22);
}

.status-pill {
  left: 16px;
  bottom: 16px;
  background: rgba(31, 45, 36, .88);
}

.scale-pill {
  right: 16px;
  bottom: 16px;
  background: rgba(31, 45, 36, .78);
}

.status-pill.is-hidden,
.scale-pill.is-hidden {
  display: none;
}

.bisse-marker {
  width: 30px;
  height: 30px;
  border: 3px solid #fff;
  border-radius: 50%;
  background: #365f40;
  box-shadow: 0 4px 15px rgba(0,0,0,.35);
}

.photo-marker {
  width: 18px;
  height: 18px;
  border: 2px solid #fff;
  border-radius: 50%;
  background:
    radial-gradient(circle at center, #fff 0 2px, transparent 3px),
    #1f2d24;
  box-shadow: 0 4px 12px rgba(0,0,0,.3);
}

.leaflet-tooltip.bisse-tooltip,
.leaflet-tooltip.segment-tooltip {
  border: 0;
  border-radius: 999px;
  padding: 6px 9px;
  background: rgba(31, 45, 36, .94);
  color: #fff;
  box-shadow: 0 8px 22px rgba(0,0,0,.20);
  font-family: Candara, "Segoe UI", system-ui, sans-serif;
  font-size: .88rem;
}

.context-row {
  padding: 9px 0;
  border-top: 1px solid rgba(66, 58, 43, .17);
}

.context-row strong {
  display: block;
  color: #657064;
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.context-row span {
  display: block;
  margin-top: 3px;
}

.context-photo {
  width: 100%;
  border-radius: 16px;
  margin-bottom: 12px;
  display: block;
}

.error-box {
  padding: 12px;
  border: 1px solid rgba(150, 62, 48, .35);
  border-radius: 16px;
  color: #76382f;
  background: rgba(150, 62, 48, .08);
}

@media (max-width: 760px) {
  .topbar {
    display: block;
  }

  .brand {
    width: fit-content;
    margin-bottom: 8px;
  }

  .toolbar {
    justify-content: flex-start;
  }

  .panel-main {
    width: calc(100vw - 32px);
    max-height: 48dvh;
  }

  .panel-context {
    left: 16px;
    right: 16px;
    width: auto;
  }

  .legend {
    display: none;
  }

  .fact-grid,
  .gallery {
    grid-template-columns: 1fr;
  }
}
'''


APP_JS = r'''/* global L */
"use strict";

console.log("Bisses build swiss-scale-steps-2026-06-06-copy");

const VALAIS_CENTER = [46.22, 7.55];
const VALAIS_ZOOM = 17;

/*
  Table expérimentale de niveaux cartographiques.

  But :
  - rester en EPSG:2056 avec Leaflet.TileLayer.Swiss ;
  - forcer des couches de détail différentes selon le zoom ;
  - se rapprocher progressivement du comportement map.geo.admin.

  Les seuils devront probablement être ajustés après test réel.
*/
const MAP_SCALE_STEPS = [
  {
    min: 0,
    max: 15,
    label: "Aperçu",
    layer: "ch.swisstopo.pixelkarte-farbe",
    format: "jpeg",
    maxNativeZoom: 27
  },
  {
    min: 16,
    max: 16,
    label: "CN 1:500k",
    layer: "ch.swisstopo.pixelkarte-farbe-pk500.noscale",
    format: "jpeg",
    maxNativeZoom: 27
  },
  {
    min: 17,
    max: 17,
    label: "CN 1:200k",
    layer: "ch.swisstopo.pixelkarte-farbe-pk200.noscale",
    format: "jpeg",
    maxNativeZoom: 27
  },
  {
    min: 18,
    max: 19,
    label: "CN 1:100k",
    layer: "ch.swisstopo.pixelkarte-farbe-pk100.noscale",
    format: "jpeg",
    maxNativeZoom: 27
  },
  {
    min: 20,
    max: 21,
    label: "CN 1:50k",
    layer: "ch.swisstopo.pixelkarte-farbe-pk50.noscale",
    format: "jpeg",
    maxNativeZoom: 27
  },
  {
    min: 22,
    max: 24,
    label: "CN 1:25k",
    layer: "ch.swisstopo.pixelkarte-farbe-pk25.noscale",
    format: "jpeg",
    maxNativeZoom: 27
  },
  {
    min: 25,
    max: 28,
    label: "CN 1:10k",
    layer: "ch.swisstopo.landeskarte-farbe-10",
    format: "png",
    maxNativeZoom: 28
  }
];

const SATELLITE_STEP = {
  label: "Satellite",
  layer: "ch.swisstopo.swissimage",
  format: "jpeg",
  maxNativeZoom: 28
};

const WATER_LABELS = {
  in_water: "en eau",
  dry: "sec",
  intermittent: "intermittent",
  unknown: "inconnu"
};

/*
  Ces couleurs ne sont utilisées qu'en secours.
  Les vraies couleurs doivent venir de catalogue.segment_categories.
*/
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
  scrollWheelZoom: true
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
  return MAP_SCALE_STEPS.find((step) => zoom >= step.min && zoom <= step.max)
    || MAP_SCALE_STEPS[MAP_SCALE_STEPS.length - 1];
}

function makeSwissLayer(step) {
  return L.tileLayer.swiss({
    layer: step.layer,
    format: step.format || "jpeg",
    maxNativeZoom: step.maxNativeZoom || 27,
    pluginAttribution: false
  });
}

function setBaseLayer(step) {
  const key = `${state.base}:${step.layer}:${step.format}`;

  if (state.currentStepKey === key && state.baseLayer) {
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

  const step = stepForZoom(map.getZoom());
  setBaseLayer(step);
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
        map.flyTo([photo.lat, photo.lon], Math.max(map.getZoom(), 23), { duration: 0.45 });
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
      map.fitBounds(b, { padding: [70, 70], maxZoom: 23 });
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
'''


README = r'''# Bisses

Plateforme statique GitHub Pages pour l’inventaire cartographique des bisses du Valais.

Version générée par :
build_bisses.py
swiss-scale-steps-2026-06-06-copy

Générer le site :
python build_bisses.py

Le script génère :
- index.html
- .nojekyll
- assets/css/styles.css
- assets/js/app.js

Il ne modifie pas :
- data/
- media/

Tester localement :
python -m http.server 8000

Puis ouvrir :
http://localhost:8000

Données attendues :
data/
- bisses_index.json
- bisses/<slug>/catalogue.json
- bisses/<slug>/segments.geojson

media/
- <slug>/photo_001_web.jpg

Les coordonnées GeoJSON restent en ordre standard :
[longitude, latitude]
'''


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def build(out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    write(out_dir / "index.html", INDEX_HTML)
    write(out_dir / ".nojekyll", "")
    write(out_dir / "assets" / "css" / "styles.css", STYLES_CSS)
    write(out_dir / "assets" / "js" / "app.js", APP_JS)
    write(out_dir / "README.md", README)

    (out_dir / "data" / "bisses").mkdir(parents=True, exist_ok=True)
    (out_dir / "media").mkdir(parents=True, exist_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Génère la plateforme GitHub Pages Bisses.")
    parser.add_argument("--out", default=".", help="Dossier de sortie, par défaut le dossier courant.")
    args = parser.parse_args()

    out_dir = Path(args.out).expanduser().resolve()
    build(out_dir)

    print("Plateforme Bisses générée.")
    print("Version : swiss-scale-steps-2026-06-06-copy")
    print(f"Dossier : {out_dir}")
    print("Fichiers générés :")
    print("  - index.html")
    print("  - .nojekyll")
    print("  - assets/css/styles.css")
    print("  - assets/js/app.js")
    print("Données préservées : data/ et media/")


if __name__ == "__main__":
    main()
