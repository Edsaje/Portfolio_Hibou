# Directives & Charte de Conception — Portfolio Quentin Beaud (Hibouxe / Edsaje)

Ce document consigne les principes et contraintes invariants régissant le développement, le design et le contenu du portfolio.

---

## 1. Anti-"IA Slop" & Identité Visuelle Unique

Pour éviter à tout prix l'effet "site généré par IA" ou "template SaaS Dribbble 2024" :
- **Bannir les rondeurs molles et les pilules :** Ne jamais utiliser de `border-radius: 9999px` ou de gros arrondis (> 16px) sur les cartes et boutons principaux. Préférer des angles francs, nets et ciselés (`0px` à `4px`), ou des découpes à 45° (`clip-path`).
- **Tuer le glassmorphism flou générique :** Remplacer le verre dépoli translucide grisâtre par des surfaces denses, sombres et profondes (`#050a07`, `#0d1a12`), texturées et cernées de filets dorés / laiton fins (`#d4af37`).
- **Casser les grilles rigides et répétitives (3x3) :** Privilégier des mises en page asymétriques et éditoriales (mise en avant d'un projet phare, fiches techniques, encadrés "notes de dev / coulisses").
- **Zéro spam d'emojis :** Pas d'emoji automatique devant chaque bouton, titre ou badge. Laisser respirer la typographie (notamment *Cinzel* pour les titres et *Outfit* pour le texte courant).
- **Sublimer la DA (Dark Fantasy, Grimoire & Hardware Rétro) :** Incarner l'univers d'Hibouxe (l'orbe nocturne, le lore sombre à la Dark Souls / Ueda, le vectoriel CRT façon Vectrex 1982, la rigueur de l'artisan Java/C#).

---

## 2. Ton & Voix Authentique (Humain d'abord)

- Écrire avec la voix de Quentin : direct, passionné, humble, précis et axé sur le concret.
- Bannir le jargon corporate ou LinkedIn ("synergie", "approche holistique", "d'un côté la rigueur, de l'autre la créativité...").
- Expliquer les choix techniques réels : pourquoi coder en *pur Vanilla JS / Canvas* sans framework, comment le montage vidéo forge un sens aigu du rythme et de l'UX instantanée.

---

## 3. Règle "Portfolio First" & Expérience Visiteur

- Le site est d'abord une vitrine professionnelle pour recruteurs et pairs.
- Les mini-jeux (Arcade, Vectrex, Clicker), easter eggs et popups ne doivent **jamais** s'imposer ou bloquer un visiteur à l'arrivée sur le site.
- Les modales de récompense ou notifications de jeu s'ouvrent **exclusivement** suite à une interaction explicite de l'utilisateur (ex: clic volontaire pour ouvrir le clicker).

---

## 4. Robustesse CSS & Architecture Web Vanilla

- **Zéro dépendance externe inutile :** Tout doit rester en pur Vanilla JS, Canvas 2D et CSS natif.
- **Spécificité et masquage :** Les classes utilitaires critiques comme `.hidden-view` doivent être garanties (`display: none !important;`) et les composants modaux masqués par défaut pour éviter tout conflit de cascade CSS.
