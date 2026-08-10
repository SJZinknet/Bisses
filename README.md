# Bisses

Plateforme statique GitHub Pages pour l’inventaire cartographique des bisses du Valais.

Version générée par :
build_bisses.py
bisses-ui-clusters-2026-08-10-v6.1

Rendu des tronçons — Option A :
- traits et transitions arrondis issus de la base stable v5.1 ;
- halo blanc continu par chaîne connectée ;
- regroupement des tronçons contigus de même style ;
- absorption visuelle prudente des micro-plages selon leur longueur en pixels ;
- détail original complet à partir de z25.

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
