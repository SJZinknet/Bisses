# Bisses

Plateforme statique GitHub Pages pour l’inventaire cartographique des bisses du Valais.

Version générée par :
build_bisses.py
bisses-work-band-2026-08-10-v6-prototype

Moteurs de rendu des segments :
- `polyline` : rendu stable v5.1, conservé comme fallback ;
- `band` : prototype Work Option C, activé dans cette version.

Le prototype Band construit les couleurs comme des surfaces à largeur constante en pixels,
dessine un halo continu par bisse et garde une couche de clic invisible indépendante.
Les segments bicolores restent temporairement rendus par le moteur polyline stable.

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
