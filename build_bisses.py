#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# BUILD_VERSION = "bisses-ui-panels-2026-06-08-c"

from __future__ import annotations

import argparse
from pathlib import Path


INDEX_HTML = r"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bisses du Valais</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css">
  <link rel="stylesheet" href="assets/css/styles.css">
</head>

<body>
  <div id="app-shell">
    <main id="map-region" aria-label="Carte des bisses du Valais">
      <div id="map"></div>

      <header class="topbar">
        <div class="brand">
          <div class="eyebrow">Inventaire cartographique</div>
          <h1>Bisses du Valais</h1>
          <div class="build-version">bisses-ui-panels-2026-06-08-c</div>
        </div>

        <div class="toolbar">
          <button id="btn-valais" type="button">Vue Valais</button>
          <button id="btn-list" type="button">Liste</button>
          <button id="btn-basemap" type="button">Satellite</button>
        </div>
      </header>

      <div id="legend" class="legend"></div>
      <div id="scale-pill" class="scale-pill">Fond carte</div>
      <div id="status-pill" class="status-pill">Chargement…</div>
    </main>

    <aside id="side-panel" class="side-panel" aria-label="Informations">
      <button id="btn-close-panel" class="close-button" type="button" aria-label="Fermer">×</button>
      <div class="panel-kicker" id="panel-kicker">Fiche bisse</div>
      <h2 id="panel-title">Bisses du Valais</h2>
      <div id="panel-content">
        <p class="muted">Sélectionnez un bisse pour afficher sa fiche.</p>
      </div>
    </aside>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/leaflet-tilelayer-swiss@2.4.0/dist/Leaflet.TileLayer.Swiss.umd.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/leaflet-polylineoffset@1.1.1/leaflet.polylineoffset.js"></script>
  <script src="assets/js/app.js"></script>
</body>
</html>
"""


STYLES_CSS = r"""html,
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

/* Fond Swisstopo : la CN 1:1 million reste non blanchie.
   Les fonds plus détaillés sont légèrement blanchis pour laisser respirer les tracés. */
.leaflet-tile-pane {
  filter: none;
}

#map.basemap-muted .leaflet-tile-pane {
  filter: brightness(1.10) saturate(0.82) contrast(0.90);
}

/* Sécurité : les pastilles disparaissent dès que la carte passe en mode traces. */
#map.segments-mode .bisse-marker {
  display: none;
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
  max-width: min(430px, calc(100vw - 32px));
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
  background: #1e88e5;
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



/* Réforme UI : panneau latéral non flottant.
   La fiche ne recouvre plus la carte : elle réduit la largeur utile de la carte. */
#app-shell {
  position: fixed;
  inset: 0;
  overflow: hidden;
}

#map-region {
  position: fixed;
  inset: 0;
  transition: right .24s ease;
}

#map {
  position: absolute;
  inset: 0;
  width: auto;
  height: auto;
}

body.side-panel-open #map-region {
  right: 430px;
}

body.side-panel-open .topbar {
  right: 446px;
}

.side-panel {
  position: fixed;
  z-index: 760;
  top: 0;
  right: 0;
  bottom: 0;
  width: 430px;
  max-width: min(430px, 42vw);
  box-sizing: border-box;
  padding: 24px 24px 28px;
  border-left: 1px solid rgba(66, 58, 43, .18);
  background: rgba(255, 250, 241, .98);
  box-shadow: -18px 0 52px rgba(20, 30, 22, .18);
  overflow: auto;
  transform: translateX(100%);
  transition: transform .24s ease;
}

body.side-panel-open .side-panel {
  transform: translateX(0);
}

.side-panel .close-button {
  top: 14px;
  right: 14px;
}

.leaflet-popup-content-wrapper {
  border-radius: 16px;
  background: rgba(255, 250, 241, .98);
  box-shadow: 0 14px 42px rgba(20, 30, 22, .24);
}

.leaflet-popup-content {
  margin: 12px 14px;
  font-family: Candara, "Segoe UI", system-ui, sans-serif;
  color: #1f2d24;
}

.map-popup h3 {
  margin: 0 0 7px;
  font-size: 1rem;
}

.map-popup p {
  margin: 4px 0;
  line-height: 1.35;
}

.map-popup .popup-muted {
  color: #657064;
  font-size: .88rem;
}

.map-popup img {
  display: block;
  width: 180px;
  max-width: 100%;
  border-radius: 12px;
  margin-bottom: 9px;
}

@media (max-width: 900px) {
  body.side-panel-open #map-region {
    right: 0;
  }

  body.side-panel-open .topbar {
    right: 16px;
  }

  .side-panel {
    top: auto;
    left: 0;
    width: 100vw;
    max-width: none;
    height: min(58dvh, 560px);
    border-left: 0;
    border-top: 1px solid rgba(66, 58, 43, .18);
    border-radius: 24px 24px 0 0;
    transform: translateY(100%);
  }

  body.side-panel-open .side-panel {
    transform: translateY(0);
  }
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
"""


APP_JS = r"""/* global L */
"use strict";

console.log("Bisses build bisses-ui-panels-2026-06-08-c");

const VALAIS_CENTER = [46.22, 7.55];
const VALAIS_ZOOM = 17;
const MIN_ZOOM = 16;
const MAX_ZOOM = 26;

const SHOW_SYNTHETIC_TRACES_AT_ZOOM = 19;
const SHOW_DETAILED_SEGMENTS_AT_ZOOM = 20.5;
const SHOW_BICOLOR_SPLIT_AT_ZOOM = 23.5;

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

const state = {
  index: [],
  cache: new Map(),
  selectedId: null,
  base: "carto",
  currentStepKey: "",
  currentSegmentsKey: "",
  segmentRefreshToken: 0,
  listHtml: "",
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

function bindSegmentInteraction(layer, feature) {
  const title = feature.properties.__bisse_title || "Bisse";
  const type = feature.properties.__category_name || "Segment";
  const water = WATER_LABELS[feature.properties.water_status] || feature.properties.water_status || "inconnu";
  const modeLabel = feature.properties.__display_mode === "bicolor" ? "Segment bicolore" : type;

  layer.bindTooltip(`${escapeHtml(title)} — ${escapeHtml(type)}`, {
    className: "segment-tooltip",
    sticky: true
  });

  layer.bindPopup(`
    <div class="map-popup">
      <h3>${escapeHtml(modeLabel)}</h3>
      <p><strong>${escapeHtml(title)}</strong></p>
      <p class="popup-muted">Type : ${escapeHtml(type)}</p>
      <p class="popup-muted">État de l’eau : ${escapeHtml(water)}</p>
    </div>
  `, {
    maxWidth: 260,
    autoPan: true,
    closeButton: true
  });
}

function addHaloForPart(layerGroup, latlngs, style) {
  if (!latlngs.length) return;

  L.polyline(latlngs, {
    pane: "segmentOutlinePane",
    color: "#ffffff",
    weight: style.outlineWeight,
    opacity: style.opacity,
    lineCap: "round",
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
    lineCap: "round",
    lineJoin: "round",
    interactive: true
  }).addTo(layerGroup);

  bindSegmentInteraction(target, feature);
}

function addSingleSegment(layerGroup, outlineGroup, feature) {
  const parts = latlngPartsFromGeometry(feature.geometry);
  const style = segmentStyleForZoom();
  const color = feature.properties.__category_color || "#777777";

  for (const latlngs of parts) {
    addHaloForPart(outlineGroup, latlngs, style);

    const line = L.polyline(latlngs, {
      pane: "segmentColorPane",
      color,
      weight: style.colorWeight,
      opacity: style.opacity,
      lineCap: "round",
      lineJoin: "round",
      interactive: true
    }).addTo(layerGroup);

    bindSegmentInteraction(line, feature);
    addClickTarget(layerGroup, latlngs, feature, style);
  }
}

function addBicolorSegment(layerGroup, outlineGroup, feature) {
  const parts = latlngPartsFromGeometry(feature.geometry);
  const style = bicolorStyleForZoom();
  const colors = Array.isArray(feature.properties.__bicolor_colors)
    ? feature.properties.__bicolor_colors
    : ["#ef6c00", "#111111"];

  const colorA = colors[0] || "#ef6c00";
  const colorB = colors[1] || "#111111";

  for (const latlngs of parts) {
    addHaloForPart(outlineGroup, latlngs, style);

    const left = L.polyline(latlngs, {
      pane: "segmentColorPane",
      color: colorA,
      weight: style.flankWeight,
      opacity: style.opacity,
      lineCap: "round",
      lineJoin: "round",
      offset: -style.offset,
      interactive: true
    }).addTo(layerGroup);

    const right = L.polyline(latlngs, {
      pane: "segmentColorPane",
      color: colorB,
      weight: style.flankWeight,
      opacity: style.opacity,
      lineCap: "round",
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

  const token = state.segmentRefreshToken + 1;
  state.segmentRefreshToken = token;

  const mode = segmentRenderMode();
  const style = segmentStyleForZoom();
  const bstyle = bicolorStyleForZoom();
  const zoom = roundedZoom();
  const key = `${mode}:${style.key}:${bstyle.mode}:${zoom}:${state.index.length}:${state.cache.size}`;

  if (mode === "markers") {
    state.currentSegmentsKey = key;
    removeVisibleSegments();
    updateScalePill(0);
    return;
  }

  if (state.currentSegmentsKey === key && state.segmentColorLayer) {
    const count = state.segmentColorLayer.getLayers().length;
    updateScalePill(count, mode === "synthetic" ? "tracés" : "segments");
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

  const visibleGeojson = mode === "synthetic"
    ? buildSyntheticFeatureCollection(dataList)
    : buildDetailedFeatureCollection(dataList);

  if (token !== state.segmentRefreshToken || segmentRenderMode() !== mode) {
    return;
  }

  drawVisibleSegments(visibleGeojson);

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

    marker.bindPopup(`
      <div class="map-popup">
        ${photo.filename_web ? `<img src="${escapeHtml(photo.filename_web)}" alt="">` : ""}
        <h3>${escapeHtml(photo.title || "Photo")}</h3>
        ${photo.description ? `<p class="popup-muted">${escapeHtml(photo.description)}</p>` : ""}
      </div>
    `, {
      maxWidth: 230,
      autoPan: true,
      closeButton: true
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
        L.popup({ maxWidth: 230, autoPan: true, closeButton: true })
          .setLatLng([photo.lat, photo.lon])
          .setContent(`
            <div class="map-popup">
              ${photo.filename_web ? `<img src="${escapeHtml(photo.filename_web)}" alt="">` : ""}
              <h3>${escapeHtml(photo.title || "Photo")}</h3>
              ${photo.description ? `<p class="popup-muted">${escapeHtml(photo.description)}</p>` : ""}
            </div>
          `)
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
"""



README = r"""# Bisses

Plateforme statique GitHub Pages pour l’inventaire cartographique des bisses du Valais.

Version générée par :
build_bisses.py
bisses-ui-panels-2026-06-08-c

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
"""


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
    print("Version : bisses-ui-panels-2026-06-08-c")
    print(f"Dossier : {out_dir}")
    print("Fichiers générés : index.html, .nojekyll, assets/css/styles.css, assets/js/app.js")
    print("Données préservées : data/ et media/")


if __name__ == "__main__":
    main()
