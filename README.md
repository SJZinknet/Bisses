# Bisses

Plateforme statique GitHub Pages pour l’inventaire cartographique des bisses du Valais.

Version générée par :
build_bisses.py
bisses-ui-clusters-2026-08-11-v6.3

Rendu des tronçons — coupes droites partagées :
- halo blanc continu par chaîne connectée ;
- regroupement des tronçons contigus de même style ;
- absorption visuelle prudente des micro-plages selon leur longueur en pixels ;
- tangente commune calculée à chaque transition, y compris dans les angles ;
- coupes colorées droites, jointives et perpendiculaires à cette tangente ;
- recalage visuel des extrémités quasi identiques sur un point commun ;
- léger recouvrement sous-pixel pour supprimer les coutures d'anticrénelage ;
- extrémités réelles du bisse conservées arrondies ;
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
