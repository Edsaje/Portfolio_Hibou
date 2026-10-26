/**
 * ====================================================================
 * ARCHIVES SECRÈTES DU HIBOU — MOTEUR D'ÉMULATION RÉTRO MULTI-CONSOLES
 * Déclenchement furtif : Mot secret cryptographique (SHA-256)
 *                      OU Drag & Drop d'un fichier ROM
 * Respect strict de la charte Dark Fantasy / Grimoire & Hardware Rétro
 * ====================================================================
 */
(function () {
  "use strict";

  const VAULT_ROMS = [
    {
      nom: "Super Mario World (Europe) (Rev 1).sfc",
      titre: "Super Mario World",
      console: "snes",
      desc: "Le chef-d'œuvre de plateforme de la Super Nintendo (1990)."
    },
    {
      nom: "CHRONO.SMC",
      titre: "Chrono Trigger",
      console: "snes",
      desc: "L'apogée du RPG narratif par la Dream Team de Square (1995)."
    },
    {
      nom: "Dragon Quest 5 (tr).sfc",
      titre: "Dragon Quest V : La Fiancée Céleste",
      console: "snes",
      desc: "L'épopée sur trois générations d'Horie, Toriyama et Sugiyama."
    },
    {
      nom: "Legend of Zelda, The - Link's Awakening DX (France) (Rev 1) (SGB Enhanced) (GB Compatible).gbc",
      titre: "The Legend of Zelda: Link's Awakening DX",
      console: "gb",
      desc: "L'aventure onirique sur l'île Cocolint (Game Boy Color, 1998)."
    },
    {
      nom: "Pokemon - Version Jaune - Edition Speciale Pikachu (France) (CGB+SGB Enhanced).gb",
      titre: "Pokémon Version Jaune : Édition Spéciale Pikachu",
      console: "gb",
      desc: "L'aventure culte de Kanto avec Pikachu à vos côtés (1998)."
    },
    {
      nom: "Pokémon Emeraude FULL.gba",
      titre: "Pokémon Version Émeraude",
      console: "gba",
      desc: "Le summum de la Game Boy Advance dans la région de Hoenn (2004)."
    },
    {
      nom: "Super Mario Bros. 3 (USA) (Rev 1).nes",
      titre: "Super Mario Bros. 3",
      console: "nes",
      desc: "Le sommet technique et ludique de la NES 8-bit (1988)."
    },
    {
      nom: "Dragon Warrior 3 (U) [T-Port1.1].nes",
      titre: "Dragon Quest III : Soshite Densetsu e...",
      console: "nes",
      desc: "Le mythe fondateur du J-RPG sur Famicom / NES (1988)."
    },
    {
      nom: "dq.nes",
      titre: "Dragon Quest I (Dragon Warrior)",
      console: "nes",
      desc: "La légende qui a tout commencé par Yuji Horii (1986)."
    }
  ];

  const CONSOLES_CONF = {
    snes: { label: "Super Nintendo", core: "snes9x", tag: "tag-snes", hasExtra: true },
    gba: { label: "Game Boy Advance", core: "mgba", tag: "tag-gba", hasExtra: true },
    gb: { label: "Game Boy / GBC", core: "gambatte", tag: "tag-gb", hasExtra: false },
    nes: { label: "NES 8-bit", core: "fceumm", tag: "tag-nes", hasExtra: false },
    megadrive: { label: "Mega Drive", core: "genesis_plus_gx", tag: "tag-md", hasExtra: true },
    arcade: { label: "Arcade", core: "fbneo", tag: "tag-arcade", hasExtra: true }
  };

  class RetroVault {
    constructor() {
      this.modal = null;
      this.partieEnCours = null;
      this.jeuEnCoursNom = "";
      this.jeuEnCoursType = "snes";
      this.filtreActuel = "all";
      this.tousLesJeux = [...VAULT_ROMS];
      this.estEnPause = false;
      this.dbName = "HibouRetroVaultDB";
      this.storeName = "saves";
      this.db = null;
      this.boundKeyHandler = this.bridgeClavier.bind(this);
    }

    // --- Initialisation de la Base IndexedDB ---
    async getDB() {
      if (this.db) return this.db;
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = e => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        req.onsuccess = () => {
          this.db = req.result;
          resolve(this.db);
        };
        req.onerror = () => reject(req.error);
      });
    }

    async saveStateDB(key, blob) {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        tx.objectStore(this.storeName).put({ state: blob, date: new Date().toLocaleString() }, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    async loadStateDB(key) {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readonly");
        const req = tx.objectStore(this.storeName).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }

    // --- Détection console par extension ---
    identifierConsole(nom) {
      const ext = nom.split(".").pop().toLowerCase();
      if (["sfc", "smc"].includes(ext)) return "snes";
      if (["gba"].includes(ext)) return "gba";
      if (["gb", "gbc"].includes(ext)) return "gb";
      if (["md", "bin", "gen"].includes(ext)) return "megadrive";
      if (["zip"].includes(ext)) return "arcade";
      return "nes";
    }

    // --- Injection HTML & CSS ---
    injectDOM() {
      if (document.getElementById("retro-vault-modal")) return;

      const styles = document.createElement("style");
      styles.id = "retro-vault-styles";
      styles.textContent = `
        #retro-vault-modal {
          display: none;
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(5, 10, 7, 0.94);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          z-index: 999999;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 20px 14px 40px;
          box-sizing: border-box;
          color: #f0f4f1;
          font-family: var(--font-body, 'Outfit', sans-serif);
        }
        #retro-vault-modal.active {
          display: block !important;
          animation: rvFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes rvFadeIn {
          from { opacity: 0; transform: scale(0.985); }
          to { opacity: 1; transform: scale(1); }
        }
        .rv-container {
          max-width: 980px;
          margin: 0 auto;
          background: #09130d;
          border: 1px solid rgba(212, 175, 55, 0.35);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(42, 90, 58, 0.25);
          border-radius: 4px;
          padding: 24px;
          position: relative;
        }
        .rv-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .rv-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .rv-sigil {
          font-size: 1.8rem;
          color: #d4af37;
          filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.5));
        }
        .rv-title {
          font-family: var(--font-heading, 'Cinzel', serif);
          font-size: 1.4rem;
          font-weight: 700;
          color: #d4af37;
          letter-spacing: 2px;
          margin: 0;
          text-transform: uppercase;
        }
        .rv-subtitle {
          font-size: 0.78rem;
          color: #a8b8ad;
          letter-spacing: 1px;
        }
        .rv-close-btn {
          background: #0e1d14;
          border: 1px solid rgba(212, 175, 55, 0.3);
          color: #d4af37;
          font-size: 1.2rem;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.2s;
        }
        .rv-close-btn:hover {
          background: #d4af37;
          color: #050a07;
          transform: translateY(-1px);
        }
        /* Zone d'écran */
        .rv-screen-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 0 auto 18px;
        }
        #rv-game-container {
          position: relative;
          background: #000;
          border: 2px solid rgba(212, 175, 55, 0.4);
          box-shadow: 0 0 35px rgba(42, 90, 58, 0.4), inset 0 0 20px rgba(0, 0, 0, 0.9);
          border-radius: 4px;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
          min-width: 320px;
          min-height: 240px;
        }
        #rv-game-container canvas {
          display: block !important;
          margin: 0 auto !important;
          width: min(85vw, 760px) !important;
          height: auto !important;
          aspect-ratio: 4 / 3;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }
        .rv-crt-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.32) 50%),
                      linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
          background-size: 100% 3px, 6px 100%;
          pointer-events: none;
          z-index: 10;
        }
        .rv-crt-overlay.disabled { display: none; }
        /* Barre d'action */
        .rv-toolbar {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          width: 100%;
          max-width: 760px;
          margin-top: 12px;
          background: #0e1d14;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 8px 14px;
          border-radius: 3px;
        }
        .rv-tool-group {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }
        .rv-btn {
          background: #14281c;
          border: 1px solid rgba(212, 175, 55, 0.25);
          color: #f0f4f1;
          padding: 6px 12px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .rv-btn:hover {
          background: rgba(212, 175, 55, 0.15);
          color: #f3e5ab;
          border-color: #d4af37;
        }
        .rv-btn-save { background: #10b981; border-color: #059669; color: #fff; }
        .rv-btn-save:hover { background: #059669; }
        .rv-btn-load { background: #0284c7; border-color: #0369a1; color: #fff; }
        .rv-btn-load:hover { background: #0369a1; }
        .rv-status {
          font-family: monospace;
          font-size: 0.85rem;
          color: #d4af37;
          min-height: 20px;
          margin-top: 8px;
          text-align: center;
        }
        /* Guide des touches ZSQD + 8546 */
        .rv-controls-guide {
          background: rgba(6, 15, 9, 0.8);
          border: 1px solid rgba(212, 175, 55, 0.15);
          border-radius: 3px;
          padding: 12px 16px;
          margin: 12px auto 22px;
          max-width: 930px;
          font-size: 0.82rem;
        }
        .rv-ctrl-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 12px;
        }
        .rv-ctrl-box {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0e1d14;
          padding: 5px 10px;
          border-radius: 3px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .rv-ctrl-lbl { color: #d4af37; font-weight: 700; margin-right: 2px; }
        .rv-kbd {
          background: rgba(212, 175, 55, 0.12);
          border: 1px solid rgba(212, 175, 55, 0.35);
          color: #f3e5ab;
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: 700;
          font-family: monospace;
        }
        .rv-kbd-pri { background: #d4af37; color: #050a07; }
        .rv-tip {
          text-align: center;
          font-size: 0.74rem;
          color: #8b9d90;
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1px dashed rgba(255, 255, 255, 0.06);
        }
        /* Bibliothèque de jeux */
        .rv-library-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          padding-top: 12px;
          border-top: 1px solid rgba(212, 175, 55, 0.2);
        }
        .rv-lib-title {
          font-family: var(--font-heading, 'Cinzel', serif);
          font-size: 1.15rem;
          color: #f3e5ab;
          letter-spacing: 1px;
        }
        .rv-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .rv-tab {
          background: #0e1d14;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #a8b8ad;
          padding: 5px 12px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.2s;
        }
        .rv-tab:hover, .rv-tab.active {
          background: rgba(212, 175, 55, 0.15);
          color: #d4af37;
          border-color: #d4af37;
        }
        .rv-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
          gap: 14px;
        }
        .rv-card {
          background: #0e1d14;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.25s;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 10px;
        }
        .rv-card:hover {
          border-color: #d4af37;
          background: #14281c;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
        }
        .rv-card.playing {
          border-color: #10b981;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
        }
        .rv-card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .rv-tag {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 7px;
          border-radius: 2px;
          letter-spacing: 0.5px;
        }
        .tag-snes { background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); }
        .tag-gba { background: rgba(234, 88, 12, 0.2); color: #fb923c; border: 1px solid rgba(234, 88, 12, 0.4); }
        .tag-gb { background: rgba(132, 204, 22, 0.2); color: #a3e635; border: 1px solid rgba(132, 204, 22, 0.4); }
        .tag-nes { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
        .tag-md { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); }
        .tag-arcade { background: rgba(234, 179, 8, 0.2); color: #fde047; border: 1px solid rgba(234, 179, 8, 0.4); }
        .rv-save-badge {
          font-size: 0.7rem;
          color: #34d399;
          font-weight: 600;
        }
        .rv-game-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #f0f4f1;
        }
        .rv-game-desc {
          font-size: 0.78rem;
          color: #8b9d90;
          line-height: 1.4;
        }
        .rv-card-foot {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          font-size: 0.76rem;
          font-weight: 700;
          color: #d4af37;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 8px;
        }
      `;
      document.head.appendChild(styles);

      const modal = document.createElement("div");
      modal.id = "retro-vault-modal";
      modal.innerHTML = `
        <div class="rv-container">
          <div class="rv-header">
            <div class="rv-title-wrap">
              <span class="rv-sigil">🦉</span>
              <div>
                <h2 class="rv-title">Archives Interdites du Hibou</h2>
                <span class="rv-subtitle">Émulateur Rétro WebAssembly — Sanctuaire Secret</span>
              </div>
            </div>
            <button class="rv-close-btn" id="rv-close-btn" title="Fermer le sanctuaire">✕</button>
          </div>

          <!-- Écran de jeu -->
          <div class="rv-screen-wrapper">
            <div id="rv-game-container">
              <div class="rv-crt-overlay" id="rv-crt"></div>
              <canvas id="rv-canvas"></canvas>
            </div>
            <div class="rv-status" id="rv-status">Sélectionnez une relique ou déposez un fichier ROM pour démarrer</div>

            <!-- Barre d'actions -->
            <div class="rv-toolbar">
              <div class="rv-tool-group">
                <button class="rv-btn rv-btn-save" id="rv-btn-save">💾 Sauver (F2)</button>
                <button class="rv-btn rv-btn-load" id="rv-btn-load">📂 Charger (F4)</button>
                <button class="rv-btn" id="rv-btn-pause">⏸️ Pause</button>
                <button class="rv-btn" id="rv-btn-reset">🔄 Reset</button>
              </div>
              <div class="rv-tool-group">
                <button class="rv-btn" id="rv-btn-crt">📺 CRT : ON</button>
                <button class="rv-btn" id="rv-btn-fullscreen">⛶ Plein Écran</button>
                <input type="file" id="rv-file-input" style="display: none;" accept=".nes,.sfc,.smc,.gba,.gb,.gbc,.md,.bin,.gen,.zip">
                <button class="rv-btn" id="rv-btn-upload">📁 Insérer ROM</button>
              </div>
            </div>
          </div>

          <!-- Guide des touches ZSQD + 8546 -->
          <div class="rv-controls-guide">
            <div class="rv-ctrl-row">
              <div class="rv-ctrl-box">
                <span class="rv-ctrl-lbl">🕹️ Déplacement :</span>
                <span><span class="rv-kbd">Z</span> Haut</span>
                <span><span class="rv-kbd">Q</span> Gauche</span>
                <span><span class="rv-kbd">S</span> Bas</span>
                <span><span class="rv-kbd">D</span> Droite</span>
                <span style="color:#778; font-size:0.75rem;">(ou Flèches)</span>
              </div>
              <div class="rv-ctrl-box" id="rv-ctrl-actions">
                <span class="rv-ctrl-lbl">🎮 Actions (Pavé Num.) :</span>
                <span id="rv-badge-y"><span class="rv-kbd">4</span> Y (Course)</span>
                <span id="rv-badge-b"><span class="rv-kbd rv-kbd-pri">5</span> B (Saut / Valider)</span>
                <span id="rv-badge-a"><span class="rv-kbd rv-kbd-pri">6</span> A (Action)</span>
                <span id="rv-badge-x"><span class="rv-kbd">8</span> X</span>
                <span id="rv-badge-triggers"><span class="rv-kbd">7</span> L / <span class="rv-kbd">9</span> R</span>
              </div>
              <div class="rv-ctrl-box">
                <span class="rv-ctrl-lbl">⏯️ Menus :</span>
                <span>Start : <span class="rv-kbd">Entrée</span></span>
                <span>Select : <span class="rv-kbd">0</span> / <span class="rv-kbd">Espace</span></span>
              </div>
            </div>
            <div class="rv-tip">
              💡 <strong>Ergonomie :</strong> Main gauche sur <strong>Z S Q D</strong> pour bouger, main droite sur <strong>8 5 4 6</strong> (pavé numérique en losange).<br>
              <em>Activez la touche <strong>Verr Num</strong>. Sur ordinateur portable sans pavé numérique, les chiffres <strong>8, 5, 4, 6</strong> du haut fonctionnent aussi.</em>
            </div>
          </div>

          <!-- Bibliothèque de jeux -->
          <div class="rv-library-head">
            <div class="rv-lib-title">📚 Reliques Conservées</div>
            <div class="rv-tabs">
              <button class="rv-tab active" data-filter="all">TOUTES</button>
              <button class="rv-tab" data-filter="snes">SUPER NINTENDO</button>
              <button class="rv-tab" data-filter="gba">GBA</button>
              <button class="rv-tab" data-filter="gb">GAME BOY</button>
              <button class="rv-tab" data-filter="nes">NES</button>
            </div>
          </div>
          <div class="rv-grid" id="rv-grid"></div>
        </div>
      `;
      document.body.appendChild(modal);
      this.modal = modal;
      this.bindModalEvents();
    }

    bindModalEvents() {
      // Fermeture
      document.getElementById("rv-close-btn").addEventListener("click", () => this.close());
      document.getElementById("rv-btn-pause").addEventListener("click", () => this.togglePause());
      document.getElementById("rv-btn-reset").addEventListener("click", () => {
        if (this.partieEnCours) this.partieEnCours.restart();
      });
      document.getElementById("rv-btn-save").addEventListener("click", () => this.sauvegarderPartie());
      document.getElementById("rv-btn-load").addEventListener("click", () => this.chargerPartie());
      document.getElementById("rv-btn-fullscreen").addEventListener("click", () => {
        const c = document.getElementById("rv-game-container");
        if (!document.fullscreenElement) c.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      });
      document.getElementById("rv-btn-crt").addEventListener("click", () => {
        const crt = document.getElementById("rv-crt");
        const btn = document.getElementById("rv-btn-crt");
        crt.classList.toggle("disabled");
        btn.textContent = crt.classList.contains("disabled") ? "📺 CRT : OFF" : "📺 CRT : ON";
      });

      // Upload manuel
      const fileInput = document.getElementById("rv-file-input");
      document.getElementById("rv-btn-upload").addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", e => {
        const file = e.target.files[0];
        if (file) {
          this.tousLesJeux.unshift({
            nom: file.name,
            titre: file.name.replace(/\.[^/.]+$/, ""),
            console: this.identifierConsole(file.name),
            desc: "Cartouche externe insérée via le sanctuaire.",
            blob: file
          });
          this.lancerPartie(file.name, file);
        }
      });

      // Filtres par console
      document.querySelectorAll(".rv-tab").forEach(tab => {
        tab.addEventListener("click", () => {
          document.querySelectorAll(".rv-tab").forEach(t => t.classList.remove("active"));
          tab.classList.add("active");
          this.filtreActuel = tab.getAttribute("data-filter");
          this.rendreGrille();
          this.adapterAideTouches(this.filtreActuel === "all" ? this.jeuEnCoursType : this.filtreActuel);
        });
      });

      // Glisser-déposer interne dans la modale
      this.modal.addEventListener("dragover", e => e.preventDefault());
      this.modal.addEventListener("drop", e => {
        if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
        const file = e.dataTransfer.files[0];
        const ext = file.name.split(".").pop().toLowerCase();
        if (["nes", "sfc", "smc", "gba", "gb", "gbc", "md", "bin", "gen", "zip"].includes(ext)) {
          e.preventDefault();
          this.tousLesJeux.unshift({
            nom: file.name,
            titre: file.name.replace(/\.[^/.]+$/, ""),
            console: this.identifierConsole(file.name),
            desc: "Cartouche externe insérée via Drag & Drop.",
            blob: file
          });
          this.lancerPartie(file.name, file);
        }
      });
    }

    adapterAideTouches(consoleType) {
      const badgeY = document.getElementById("rv-badge-y");
      const badgeB = document.getElementById("rv-badge-b");
      const badgeA = document.getElementById("rv-badge-a");
      const badgeX = document.getElementById("rv-badge-x");
      const badgeTriggers = document.getElementById("rv-badge-triggers");
      if (!badgeB || !badgeA) return;

      if (consoleType === "nes" || consoleType === "gb") {
        if (badgeY) badgeY.style.display = "none";
        if (badgeX) badgeX.style.display = "none";
        if (badgeTriggers) badgeTriggers.style.display = "none";
        badgeB.innerHTML = '<span class="rv-kbd rv-kbd-pri">5</span> (ou <span class="rv-kbd">4</span>) : B';
        badgeA.innerHTML = '<span class="rv-kbd rv-kbd-pri">6</span> : A';
      } else if (consoleType === "gba") {
        if (badgeY) badgeY.style.display = "none";
        if (badgeX) badgeX.style.display = "none";
        if (badgeTriggers) {
          badgeTriggers.style.display = "inline";
          badgeTriggers.innerHTML = '<span class="rv-kbd">7</span> L / <span class="rv-kbd">9</span> R';
        }
        badgeB.innerHTML = '<span class="rv-kbd rv-kbd-pri">5</span> : B';
        badgeA.innerHTML = '<span class="rv-kbd rv-kbd-pri">6</span> : A';
      } else if (consoleType === "megadrive") {
        if (badgeY) {
          badgeY.style.display = "inline";
          badgeY.innerHTML = '<span class="rv-kbd">4</span> : A';
        }
        if (badgeX) badgeX.style.display = "none";
        if (badgeTriggers) badgeTriggers.style.display = "none";
        badgeB.innerHTML = '<span class="rv-kbd rv-kbd-pri">5</span> : B';
        badgeA.innerHTML = '<span class="rv-kbd rv-kbd-pri">6</span> : C';
      } else {
        // SNES & Arcade
        if (badgeY) {
          badgeY.style.display = "inline";
          badgeY.innerHTML = '<span class="rv-kbd">4</span> : Y (Course)';
        }
        if (badgeB) badgeB.innerHTML = '<span class="rv-kbd rv-kbd-pri">5</span> : B (Saut / Valider)';
        if (badgeA) badgeA.innerHTML = '<span class="rv-kbd rv-kbd-pri">6</span> : A (Action)';
        if (badgeX) {
          badgeX.style.display = "inline";
          badgeX.innerHTML = '<span class="rv-kbd">8</span> : X';
        }
        if (badgeTriggers) {
          badgeTriggers.style.display = "inline";
          badgeTriggers.innerHTML = '<span class="rv-kbd">7</span> L / <span class="rv-kbd">9</span> R';
        }
      }
    }

    async rendreGrille() {
      const grid = document.getElementById("rv-grid");
      if (!grid) return;
      grid.innerHTML = "";

      const liste = this.filtreActuel === "all"
        ? this.tousLesJeux
        : this.tousLesJeux.filter(j => j.console === this.filtreActuel);

      for (const jeu of liste) {
        const card = document.createElement("div");
        card.className = "rv-card" + (jeu.nom === this.jeuEnCoursNom ? " playing" : "");
        card.onclick = () => this.lancerPartie(jeu.nom, jeu.blob);

        let saveBadgeHtml = "";
        try {
          const save = await this.loadStateDB(jeu.nom);
          if (save) saveBadgeHtml = `<span class="rv-save-badge">💾 Sauvegarde</span>`;
        } catch (e) {}

        const conf = CONSOLES_CONF[jeu.console] || CONSOLES_CONF.nes;

        card.innerHTML = `
          <div>
            <div class="rv-card-head">
              <span class="rv-tag ${conf.tag}">${conf.label}</span>
              ${saveBadgeHtml}
            </div>
            <div class="rv-game-title">${jeu.titre || jeu.nom}</div>
            <div class="rv-game-desc">${jeu.desc || "Relique prête à être invoquée."}</div>
          </div>
          <div class="rv-card-foot">
            <span>▶ LANCER</span>
          </div>
        `;
        grid.appendChild(card);
      }
    }

    // --- Lancement de l'émulateur ---
    async lancerPartie(nomFichier, customBlob = null) {
      if (typeof Nostalgist === "undefined") {
        document.getElementById("rv-status").textContent = "⏳ Chargement du moteur WebAssembly...";
        await new Promise(r => setTimeout(r, 600));
      }

      const status = document.getElementById("rv-status");
      const cType = this.identifierConsole(nomFichier);
      const conf = CONSOLES_CONF[cType] || CONSOLES_CONF.nes;
      this.jeuEnCoursType = cType;
      this.adapterAideTouches(cType);

      status.textContent = `⏳ Invocation de "${nomFichier}" (${conf.label})...`;

      try {
        if (this.partieEnCours) {
          await this.partieEnCours.exit();
          this.partieEnCours = null;
        }

        const container = document.getElementById("rv-game-container");
        container.innerHTML = `
          <div class="rv-crt-overlay" id="rv-crt"></div>
          <canvas id="rv-canvas"></canvas>
        `;

        let romBlob = customBlob;
        if (!romBlob) {
          const res = await fetch("assets/vault/" + encodeURI(nomFichier));
          if (!res.ok) throw new Error("Fichier ROM introuvable dans le sanctuaire.");
          romBlob = await res.blob();
        }

        this.jeuEnCoursNom = nomFichier;

        // Configuration RetroArch ergonomique (ZSQD + Pavé Numérique 8546)
        const retroConfig = {
          input_player1_up: "w",
          input_player1_down: "s",
          input_player1_left: "a",
          input_player1_right: "d",
          input_player1_b: "keypad5",
          input_player1_a: "keypad6",
          input_player1_y: "keypad4",
          input_player1_x: "keypad8",
          input_player1_l: "keypad7",
          input_player1_r: "keypad9",
          input_player1_start: "kp_enter",
          input_player1_select: "keypad0"
        };

        const canvasEl = document.getElementById("rv-canvas");

        if (cType === "snes") {
          this.partieEnCours = await Nostalgist.snes({ element: canvasEl, rom: romBlob, retroarchConfig: retroConfig });
        } else if (cType === "gba") {
          this.partieEnCours = await Nostalgist.gba({ element: canvasEl, rom: romBlob, retroarchConfig: retroConfig });
        } else if (cType === "gb") {
          this.partieEnCours = await Nostalgist.gbc({ element: canvasEl, rom: romBlob, retroarchConfig: retroConfig });
        } else if (cType === "megadrive") {
          this.partieEnCours = await Nostalgist.megadrive({ element: canvasEl, rom: romBlob, retroarchConfig: retroConfig });
        } else if (cType === "nes") {
          this.partieEnCours = await Nostalgist.nes({ element: canvasEl, rom: romBlob, retroarchConfig: retroConfig });
        } else {
          this.partieEnCours = await Nostalgist.launch({ core: conf.core, element: canvasEl, rom: romBlob, retroarchConfig: retroConfig });
        }

        const saveInfo = await this.loadStateDB(this.jeuEnCoursNom);
        if (saveInfo) {
          status.textContent = `🎮 En cours : ${nomFichier} | 💾 Sauvegarde disponible (F4 pour charger)`;
          status.style.color = "#34d399";
        } else {
          status.textContent = `🎮 En cours : ${nomFichier} (${conf.label}) | Bon jeu !`;
          status.style.color = "#d4af37";
        }

        this.rendreGrille();
      } catch (err) {
        console.error(err);
        status.textContent = `❌ Erreur : ${err.message}`;
        status.style.color = "#ef4444";
      }
    }

    // --- Sauvegarde & Restauration rapides ---
    async sauvegarderPartie() {
      if (!this.partieEnCours) return;
      const status = document.getElementById("rv-status");
      status.textContent = "⏳ Sauvegarde de l'état...";
      try {
        const res = await this.partieEnCours.saveState();
        await this.saveStateDB(this.jeuEnCoursNom, res.state);
        status.textContent = `✅ Sauvegarde réussie (${new Date().toLocaleTimeString()}) !`;
        status.style.color = "#34d399";
        this.rendreGrille();
      } catch (e) {
        status.textContent = "❌ Erreur de sauvegarde : " + e.message;
        status.style.color = "#ef4444";
      }
    }

    async chargerPartie() {
      if (!this.partieEnCours) return;
      const status = document.getElementById("rv-status");
      try {
        const data = await this.loadStateDB(this.jeuEnCoursNom);
        if (!data || !data.state) {
          status.textContent = "⚠️ Aucune sauvegarde trouvée pour ce jeu.";
          status.style.color = "#fbbf24";
          return;
        }
        await this.partieEnCours.loadState(data.state);
        status.textContent = `📂 Sauvegarde restaurée ! (${data.date})`;
        status.style.color = "#34d399";
      } catch (e) {
        status.textContent = "❌ Échec du chargement : " + e.message;
        status.style.color = "#ef4444";
      }
    }

    togglePause() {
      if (!this.partieEnCours) return;
      const btn = document.getElementById("rv-btn-pause");
      if (this.estEnPause) {
        this.partieEnCours.resume();
        this.estEnPause = false;
        btn.textContent = "⏸️ Pause";
      } else {
        this.partieEnCours.pause();
        this.estEnPause = true;
        btn.textContent = "▶️ Reprendre";
      }
    }

    // --- Pont Clavier Intelligent (ZSQD, 8546, Flèches, Chiffres portables) ---
    bridgeClavier(e) {
      if (!this.modal || !this.modal.classList.contains("active") || !this.partieEnCours) return;
      if (e._isRvBridge) return;

      // F2 et F4 pour sauvegarde/chargement rapide
      if (e.key === "F2") {
        e.preventDefault();
        this.sauvegarderPartie();
        return;
      }
      if (e.key === "F4") {
        e.preventDefault();
        this.chargerPartie();
        return;
      }

      const canvas = document.getElementById("rv-canvas");
      if (!canvas) return;

      let targetCode = null;
      let targetKey = null;

      if (e.code === "Enter") { targetCode = "NumpadEnter"; targetKey = "Enter"; }
      else if (e.code === "Space") { targetCode = "Numpad0"; targetKey = "0"; }
      else if (e.code === "ArrowUp") { targetCode = "KeyW"; targetKey = "w"; }
      else if (e.code === "ArrowDown") { targetCode = "KeyS"; targetKey = "s"; }
      else if (e.code === "ArrowLeft") { targetCode = "KeyA"; targetKey = "a"; }
      else if (e.code === "ArrowRight") { targetCode = "KeyD"; targetKey = "d"; }
      else if (e.code === "Digit8") { targetCode = "Numpad8"; targetKey = "8"; }
      else if (e.code === "Digit5") { targetCode = "Numpad5"; targetKey = "5"; }
      else if (e.code === "Digit4") { targetCode = "Numpad4"; targetKey = "4"; }
      else if (e.code === "Digit6") { targetCode = "Numpad6"; targetKey = "6"; }
      else if (e.code === "Digit7") { targetCode = "Numpad7"; targetKey = "7"; }
      else if (e.code === "Digit9") { targetCode = "Numpad9"; targetKey = "9"; }
      else if (e.code === "Digit0") { targetCode = "Numpad0"; targetKey = "0"; }
      else if (e.code === "KeyZ") { targetCode = "KeyW"; targetKey = "w"; }
      else if (e.code === "KeyQ") { targetCode = "KeyA"; targetKey = "a"; }
      else if ((e.code === "Numpad4" || e.code === "Digit4") && ["nes", "gb"].includes(this.jeuEnCoursType)) {
        targetCode = "Numpad5";
        targetKey = "5";
      }

      if (targetCode) {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
          e.preventDefault();
        }
        const synth = new KeyboardEvent(e.type, {
          code: targetCode,
          key: targetKey,
          bubbles: true,
          cancelable: true
        });
        synth._isRvBridge = true;
        canvas.dispatchEvent(synth);
      }
    }

    // --- Ouverture & Fermeture du Sanctuaire ---
    open(bootFile = null) {
      this.injectDOM();
      this.modal.classList.add("active");
      document.body.style.overflow = "hidden";

      window.addEventListener("keydown", this.boundKeyHandler);
      window.addEventListener("keyup", this.boundKeyHandler);

      this.rendreGrille();

      if (bootFile) {
        this.tousLesJeux.unshift({
          nom: bootFile.name,
          titre: bootFile.name.replace(/\.[^/.]+$/, ""),
          console: this.identifierConsole(bootFile.name),
          desc: "Cartouche insérée furtivement dans le sanctuaire.",
          blob: bootFile
        });
        this.lancerPartie(bootFile.name, bootFile);
      } else if (!this.partieEnCours && this.tousLesJeux.length > 0) {
        this.lancerPartie(this.tousLesJeux[0].nom);
      }
    }

    close() {
      if (this.modal) {
        this.modal.classList.remove("active");
      }
      document.body.style.overflow = "";

      if (this.partieEnCours) {
        this.partieEnCours.pause();
      }

      window.removeEventListener("keydown", this.boundKeyHandler);
      window.removeEventListener("keyup", this.boundKeyHandler);
    }
  }

  window.RetroVaultEngine = new RetroVault();
})();
