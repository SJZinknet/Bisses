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
