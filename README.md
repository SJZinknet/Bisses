# Bisses

Plateforme statique GitHub Pages pour l’inventaire cartographique des bisses du Valais.

Version générée par :
build_bisses.py
swiss-epsg2056-zoom-table-2026-06-06-fixed-copy

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
