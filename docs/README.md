# 📚 Documentation & Archives — Portfolio Quentin Beaud

Ce répertoire regroupe les spécifications, directives de conception et archives de l'ancien code du portfolio.

---

## 📑 Structure du dossier

- **[`GEMINI.md`](./GEMINI.md)** : Charte de conception, principes invariants (anti-slop IA, dark fantasy, typographie, sécurité et robustesse).
- **`archive/`** : Fichiers historiques conservés pour traçabilité :
  - `style.css` : Feuille de style initiale avant inlining direct dans `<style>` au sein de `index.html` pour optimisation des performances (0 round-trip CSS).
  - `script.js` : Ancien stub d'initialisation remplacé par les modules spécialisés dans `js/`.
  - `.ovhconfig` : Ancienne configuration d'hébergement mutualisé OVH (le site tournant désormais sous conteneur Docker autonome).
