/**
 * ====================================================================
 * ARCHIVES SECRÈTES DU HIBOU — MOTEUR D'ÉMULATION RÉTRO MULTI-CONSOLES
 * Déclenchement furtif : Mot secret cryptographique (SHA-256)
 *                      OU URL Hash (#hibouemulator)
 *                      OU Drag & Drop d'un fichier ROM
 * Mode Mobile First : Manette tactile virtuelle intégrée & Haptique
 * Respect strict de la charte Dark Fantasy / Grimoire & Hardware Rétro
 * ====================================================================
 */
(function () {
  "use strict";

  const VAULT_ROMS = [
    {
      nom: "Super Mario 64 DS (Europe) (En,Fr,De,Es,It).nds",
      titre: "Super Mario 64 DS",
      console: "nds",
      desc: "L'épopée 3D culte de la Nintendo DS avec Mario, Yoshi, Luigi et Wario (contrôles 360° actifs)."
    },
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
      nom: "Super Mario Bros. 2 (USA) (Rev 1).nes",
      titre: "Super Mario Bros. 2",
      console: "nes",
      desc: "L'aventure onirique de Subcon avec Mario, Luigi, Peach et Toad (1988)."
    },
    {
      nom: "Dragon Warrior 4 (U).nes",
      titre: "Dragon Quest IV : Chapters of the Chosen",
      console: "nes",
      desc: "L'épopée en cinq chapitres narratifs de Chunsoft et Yuji Horii sur NES (1990)."
    },
    {
      nom: "Dragon Warrior 3 (U) [T-Port1.1].nes",
      titre: "Dragon Quest III : Soshite Densetsu e...",
      console: "nes",
      desc: "Le mythe fondateur du J-RPG sur Famicom / NES (1988)."
    },
    {
      nom: "Dragon Warrior 2 (U).nes",
      titre: "Dragon Quest II : Akuryo no Kamigami",
      console: "nes",
      desc: "La suite légendaire et le périple des trois descendants de Roto (1987)."
    },
    {
      nom: "dq.nes",
      titre: "Dragon Quest I (Dragon Warrior)",
      console: "nes",
      desc: "La légende qui a tout commencé par Yuji Horii (1986)."
    },
    {
      nom: "Legend of Zelda, The (USA) (Rev 1).nes",
      titre: "The Legend of Zelda",
      console: "nes",
      desc: "Le commencement mythique de la quête d'Hyrule par Shigeru Miyamoto (1986)."
    },
    {
      nom: "Zelda II - The Adventure of Link (USA).nes",
      titre: "Zelda II : The Adventure of Link",
      console: "nes",
      desc: "L'aventure action-RPG culte et exigeante en vue de profil (1987)."
    },
    {
      nom: "console-nds-launcher",
      titre: "Nintendo DS — Double Écran Tactile",
      console: "nds",
      desc: "Moteur DeSmuME Desmond WebAssembly avec écran tactile stylet. Glissez ou insérez un fichier .nds."
    }
  ];

  const CONSOLES_CONF = {
    snes: { label: "Super Nintendo", core: "snes9x", tag: "tag-snes", hasExtra: true },
    gba: { label: "Game Boy Advance", core: "mgba", tag: "tag-gba", hasExtra: true },
    gb: { label: "Game Boy / GBC", core: "gambatte", tag: "tag-gb", hasExtra: false },
    nes: { label: "NES 8-bit", core: "fceumm", tag: "tag-nes", hasExtra: false },
    megadrive: { label: "Mega Drive", core: "genesis_plus_gx", tag: "tag-md", hasExtra: true },
    ps1: { label: "PlayStation 1", core: "pcsx_rearmed", tag: "tag-ps1", hasExtra: true },
    nds: { label: "Nintendo DS", core: "desmume", tag: "tag-nds", hasExtra: true },
    pce: { label: "PC Engine", core: "mednafen_pce_fast", tag: "tag-pce", hasExtra: false },
    arcade: { label: "Arcade", core: "fbneo", tag: "tag-arcade", hasExtra: true }
  };

  class RetroVault {
    constructor() {
      this.version = "8.4-mario64-analog";
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
        req.onupgradeneeded = (e) => {
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
      if (["nds"].includes(ext) || nom.includes("console-nds-launcher")) return "nds";
      if (["sfc", "smc"].includes(ext)) return "snes";
      if (["gba"].includes(ext)) return "gba";
      if (["gb", "gbc"].includes(ext)) return "gb";
      if (["md", "bin", "gen", "smd", "sms", "gg"].includes(ext)) return "megadrive";
      if (["pce"].includes(ext)) return "pce";
      if (["zip"].includes(ext)) return "arcade";
      if (["iso", "cue", "chd", "pbp", "img"].includes(ext)) return "ps1";
      return "nes";
    }

    // --- Injection HTML & CSS ---
    injectDOM() {
      const existing = document.getElementById("retro-vault-modal");
      if (existing) {
        if (existing.getAttribute("data-vault-version") === this.version) {
          this.modal = existing;
          return;
        }
        existing.remove();
        const oldStyle = document.getElementById("retro-vault-styles");
        if (oldStyle) oldStyle.remove();
      }

      const styles = document.createElement("style");
      styles.id = "retro-vault-styles";
      styles.textContent = `
        #retro-vault-modal {
          display: none;
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(5, 10, 7, 0.95);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          z-index: 999999;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 16px 12px 40px;
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
          padding: 20px;
          position: relative;
        }
        .rv-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
          padding-bottom: 14px;
          margin-bottom: 16px;
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
          font-size: 1.35rem;
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
          margin: 0 auto 12px;
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
          width: 100%;
          max-width: 760px;
          min-height: 220px;
        }
        #rv-game-container canvas {
          display: block !important;
          margin: 0 auto !important;
          width: 100% !important;
          max-width: 760px !important;
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
          gap: 8px;
          width: 100%;
          max-width: 760px;
          margin-top: 10px;
          background: #0e1d14;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 8px 12px;
          border-radius: 3px;
        }
        .rv-tool-group {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }
        .rv-btn {
          background: #14281c;
          border: 1px solid rgba(212, 175, 55, 0.25);
          color: #f0f4f1;
          padding: 6px 12px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          touch-action: manipulation;
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
          font-size: 0.82rem;
          color: #d4af37;
          min-height: 20px;
          margin-top: 6px;
          text-align: center;
        }

        /* ========================================================
           MANETTE TACTILE VIRTUELLE (MOBILE FIRST)
           ======================================================== */
        .rv-gamepad {
          width: 100%;
          max-width: 580px;
          margin: 10px auto 14px;
          padding: 12px 14px;
          background: #09130d;
          border: 1px solid rgba(212, 175, 55, 0.35);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          display: block;
        }
        .rv-gamepad.force-hidden { display: none !important; }

        .rv-pad-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .rv-pad-shoulder {
          background: #14281c;
          border: 1px solid rgba(212, 175, 55, 0.35);
          color: #d4af37;
          font-family: var(--font-heading, 'Cinzel', serif);
          font-weight: 700;
          font-size: 0.95rem;
          padding: 8px 22px;
          border-radius: 3px;
          cursor: pointer;
          touch-action: none;
          transition: all 0.1s;
        }
        .rv-pad-shoulder:active, .rv-pad-shoulder.pressed {
          background: #d4af37;
          color: #050a07;
          transform: translateY(1px);
        }
        .rv-pad-menu-cluster {
          display: flex;
          gap: 12px;
        }
        .rv-pad-pill {
          background: #0e1d14;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #a8b8ad;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 1px;
          padding: 6px 14px;
          border-radius: 3px;
          cursor: pointer;
          touch-action: none;
          transition: all 0.1s;
        }
        .rv-pad-pill:active, .rv-pad-pill.pressed {
          background: #d4af37;
          color: #050a07;
        }

        .rv-pad-main-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 4px 6px;
        }

        /* D-PAD */
        .rv-dpad {
          display: flex;
          flex-direction: column;
          align-items: center;
          touch-action: none;
        }
        .rv-dpad-mid {
          display: flex;
          align-items: center;
        }
        .rv-dpad-btn {
          width: 50px;
          height: 50px;
          background: #14281c;
          border: 1px solid rgba(212, 175, 55, 0.35);
          color: #d4af37;
          font-size: 1.15rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          touch-action: none;
          -webkit-user-select: none;
          user-select: none;
          transition: all 0.08s;
        }
        .rv-dpad-u { border-radius: 4px 4px 0 0; }
        .rv-dpad-d { border-radius: 0 0 4px 4px; }
        .rv-dpad-l { border-radius: 4px 0 0 4px; }
        .rv-dpad-r { border-radius: 0 4px 4px 0; }
        .rv-dpad-core {
          width: 50px;
          height: 50px;
          background: #0e1d14;
          border-top: 1px solid rgba(212, 175, 55, 0.1);
          border-bottom: 1px solid rgba(212, 175, 55, 0.1);
        }
        .rv-dpad-btn:active, .rv-dpad-btn.pressed {
          background: #d4af37;
          color: #050a07;
          box-shadow: 0 0 12px rgba(212, 175, 55, 0.6);
        }

        /* CLUSTER D'ACTIONS */
        .rv-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          touch-action: none;
        }
        .rv-act-mid {
          display: flex;
          align-items: center;
          gap: 26px;
          margin: 4px 0;
        }
        .rv-act-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          font-family: var(--font-heading, 'Cinzel', serif);
          font-size: 1.05rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          touch-action: none;
          -webkit-user-select: none;
          user-select: none;
          transition: all 0.08s;
        }
        .rv-act-b, .rv-act-a {
          background: rgba(212, 175, 55, 0.2);
          border: 2px solid #d4af37;
          color: #f3e5ab;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
        }
        .rv-act-y, .rv-act-x {
          background: rgba(42, 90, 58, 0.35);
          border: 2px solid rgba(42, 90, 58, 0.8);
          color: #a8b8ad;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
        }
        .rv-act-btn:active, .rv-act-btn.pressed {
          background: #d4af37 !important;
          color: #050a07 !important;
          transform: scale(0.92);
          box-shadow: 0 0 14px rgba(212, 175, 55, 0.7);
        }

        /* Guide des touches physique (clavier ordi) */
        .rv-controls-guide {
          background: rgba(6, 15, 9, 0.8);
          border: 1px solid rgba(212, 175, 55, 0.15);
          border-radius: 3px;
          padding: 10px 14px;
          margin: 10px auto 18px;
          max-width: 930px;
          font-size: 0.8rem;
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
        .tag-ps1 { background: rgba(59, 130, 246, 0.25); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.5); }
        .tag-psp { background: rgba(14, 165, 233, 0.25); color: #7dd3fc; border: 1px solid rgba(14, 165, 233, 0.5); }
        .tag-nds { background: rgba(244, 63, 94, 0.25); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.5); }
        .tag-pce { background: rgba(249, 115, 22, 0.25); color: #fdba74; border: 1px solid rgba(249, 115, 22, 0.5); }
        .tag-arcade { background: rgba(234, 179, 8, 0.2); color: #fde047; border: 1px solid rgba(234, 179, 8, 0.4); }
        .rv-embedded-frame {
          width: 100%;
          height: 560px;
          max-height: 75vh;
          border: none;
          display: block;
          background: #000;
        }
        .rv-nds-layout {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          background: #060e08;
          border: 2px solid rgba(212, 175, 55, 0.4);
          border-radius: 6px;
          padding: 14px 10px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), inset 0 0 15px rgba(0, 0, 0, 0.9);
          max-width: 440px;
          width: 100%;
          margin: 0 auto;
        }
        .rv-nds-screen-wrap {
          position: relative;
          background: #000;
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 4px;
          overflow: hidden;
          width: 100%;
          max-width: 320px;
          aspect-ratio: 256 / 192;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.7);
        }
        .rv-nds-screen-wrap canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }
        .rv-nds-bottom-wrap canvas {
          cursor: crosshair;
        }
        .rv-nds-badge {
          position: absolute;
          top: 4px;
          left: 6px;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: #d4af37;
          background: rgba(5, 10, 7, 0.8);
          padding: 1px 6px;
          border-radius: 2px;
          pointer-events: none;
          z-index: 5;
        }
        .rv-nds-hinge {
          width: 80px;
          height: 5px;
          background: rgba(212, 175, 55, 0.25);
          border-radius: 3px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .rv-nds-led {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }
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

        /* ========================================================
           RESPONSIVE MOBILE FIRST
           ======================================================== */
        @media (max-width: 768px) {
          #retro-vault-modal { padding: 8px 6px 30px; }
          .rv-container { padding: 12px 8px; }
          .rv-title { font-size: 1.05rem; letter-spacing: 1px; }
          .rv-subtitle { font-size: 0.68rem; }
          .rv-toolbar { justify-content: center; gap: 5px; padding: 6px 8px; }
          .rv-btn { padding: 5px 8px; font-size: 0.72rem; }
          .rv-controls-guide { display: none; }
          .rv-dpad-btn, .rv-dpad-core { width: 44px; height: 44px; }
          .rv-act-btn { width: 44px; height: 44px; font-size: 0.95rem; }
          .rv-act-mid { gap: 16px; }
          .rv-pad-shoulder { padding: 6px 14px; font-size: 0.85rem; }
          .rv-pad-pill { padding: 5px 10px; font-size: 0.68rem; }
          .rv-grid { grid-template-columns: 1fr; }
        }

        @media (max-height: 520px) and (orientation: landscape) {
          #retro-vault-modal { padding: 4px; }
          .rv-header { margin-bottom: 6px; padding-bottom: 6px; }
          .rv-screen-wrapper { margin-bottom: 6px; }
          .rv-gamepad { max-width: 100%; margin: 6px auto; padding: 6px 10px; }
          .rv-controls-guide { display: none; }
        }
      `;
      document.head.appendChild(styles);

      const modal = document.createElement("div");
      modal.id = "retro-vault-modal";
      modal.setAttribute("data-vault-version", this.version);
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
                <button class="rv-btn" id="rv-btn-pad-toggle">🎮 Manette</button>
                <button class="rv-btn" id="rv-btn-crt">📺 CRT</button>
                <button class="rv-btn" id="rv-btn-fullscreen">⛶ Plein Écran</button>
                <input type="file" id="rv-file-input" style="display: none;" accept=".nes,.sfc,.smc,.gba,.gb,.gbc,.md,.bin,.gen,.zip,.iso,.cue,.chd,.pbp,.img,.pce,.nds,.cso">
                <button class="rv-btn" id="rv-btn-upload">📁 Insérer ROM</button>
              </div>
            </div>
          </div>

          <!-- Manette Tactile Virtuelle Rétro (Mobile First) -->
          <div class="rv-gamepad" id="rv-gamepad">
            <div class="rv-pad-top-bar">
              <button class="rv-pad-shoulder rv-pad-l" data-btn="l" data-code="Numpad7" data-key="7" id="rv-touch-l">L</button>
              <div class="rv-pad-menu-cluster">
                <button class="rv-pad-pill" data-btn="select" data-code="KeyV" data-key="v">SELECT</button>
                <button class="rv-pad-pill" data-btn="start" data-code="KeyB" data-key="b">START</button>
              </div>
              <button class="rv-pad-shoulder rv-pad-r" data-btn="r" data-code="Numpad9" data-key="9" id="rv-touch-r">R</button>
            </div>

            <div class="rv-pad-main-row">
              <!-- D-Pad Directionnel tactile (Gauche) -->
              <div class="rv-dpad" id="rv-dpad">
                <button class="rv-dpad-btn rv-dpad-u" data-btn="up" data-code="KeyW" data-key="w" aria-label="Haut">▲</button>
                <div class="rv-dpad-mid">
                  <button class="rv-dpad-btn rv-dpad-l" data-btn="left" data-code="KeyA" data-key="a" aria-label="Gauche">◀</button>
                  <div class="rv-dpad-core"></div>
                  <button class="rv-dpad-btn rv-dpad-r" data-btn="right" data-code="KeyD" data-key="d" aria-label="Droite">▶</button>
                </div>
                <button class="rv-dpad-btn rv-dpad-d" data-btn="down" data-code="KeyS" data-key="s" aria-label="Bas">▼</button>
              </div>

              <!-- Cluster d'actions en losange (Droite) -->
              <div class="rv-actions" id="rv-actions">
                <button class="rv-act-btn rv-act-x" data-btn="x" data-code="Numpad8" data-key="8" id="rv-touch-x">X</button>
                <div class="rv-act-mid">
                  <button class="rv-act-btn rv-act-y" data-btn="y" data-code="Numpad4" data-key="4" id="rv-touch-y">Y</button>
                  <button class="rv-act-btn rv-act-a" data-btn="a" data-code="Numpad6" data-key="6" id="rv-touch-a">A</button>
                </div>
                <button class="rv-act-btn rv-act-b" data-btn="b" data-code="Numpad5" data-key="5" id="rv-touch-b">B</button>
              </div>
            </div>
          </div>

          <!-- Guide des touches physique (clavier ordi) -->
          <div class="rv-controls-guide">
            <div class="rv-ctrl-row">
              <div class="rv-ctrl-box">
                <span class="rv-ctrl-lbl">🕹️ Clavier :</span>
                <span><span class="rv-kbd">Z</span> Haut</span>
                <span><span class="rv-kbd">Q</span> Gauche</span>
                <span><span class="rv-kbd">S</span> Bas</span>
                <span><span class="rv-kbd">D</span> Droite</span>
                <span style="color:#778; font-size:0.75rem;">(ou Flèches)</span>
              </div>
              <div class="rv-ctrl-box" id="rv-ctrl-actions">
                <span class="rv-ctrl-lbl">🎮 Actions :</span>
                <span id="rv-badge-y"><span class="rv-kbd">4</span> Y</span>
                <span id="rv-badge-b"><span class="rv-kbd rv-kbd-pri">5</span> B</span>
                <span id="rv-badge-a"><span class="rv-kbd rv-kbd-pri">6</span> A</span>
                <span id="rv-badge-x"><span class="rv-kbd">8</span> X</span>
                <span id="rv-badge-triggers"><span class="rv-kbd">7</span> L / <span class="rv-kbd">9</span> R</span>
              </div>
              <div class="rv-ctrl-box">
                <span class="rv-ctrl-lbl">⏯️ :</span>
                <span>Start : <span class="rv-kbd">B</span></span>
                <span>Select : <span class="rv-kbd">V</span></span>
              </div>
            </div>
            <div class="rv-tip">
              💡 <em>Sur ordinateur, jouez à deux mains : main gauche sur ZSQD, main droite sur 8 5 4 6.</em>
            </div>
          </div>

          <!-- Bibliothèque de jeux -->
          <div class="rv-library-head">
            <div class="rv-lib-title">📚 Reliques Conservées</div>
            <div class="rv-tabs">
              <button class="rv-tab active" data-filter="all">TOUTES</button>
              <button class="rv-tab" data-filter="nds">NINTENDO DS</button>
              <button class="rv-tab" data-filter="ps1">PLAYSTATION 1</button>
              <button class="rv-tab" data-filter="snes">SUPER NINTENDO</button>
              <button class="rv-tab" data-filter="megadrive">MEGA DRIVE</button>
              <button class="rv-tab" data-filter="gba">GBA</button>
              <button class="rv-tab" data-filter="gb">GAME BOY</button>
              <button class="rv-tab" data-filter="nes">NES</button>
              <button class="rv-tab" data-filter="pce">PC ENGINE</button>
            </div>
          </div>
          <div class="rv-grid" id="rv-grid"></div>
        </div>
      `;
      document.body.appendChild(modal);
      this.modal = modal;
      this.bindModalEvents();
      this.bindVirtualGamepad();
    }

    bindVirtualGamepad() {
      const triggerKey = (btnName, code, key, isDown) => {
        if (isDown && navigator.vibrate) {
          try { navigator.vibrate(12); } catch (e) {}
        }

        // Si le moteur Nintendo DS (Desmond via iframe) est actif
        if (this.jeuEnCoursType === "nds") {
          const frame = document.getElementById("rv-nds-frame");
          if (frame && frame.contentWindow) {
            try {
              frame.contentWindow.postMessage({
                type: "KEY_STATE",
                btn: btnName,
                code: code,
                isDown: isDown
              }, "*");
            } catch (err) {}
          }
          return;
        }

        // Si un émulateur RetroArch / Nostalgist tourne (SNES, GBA, GB, NES, MD, PS1, PCE)
        if (this.partieEnCours) {
          if (btnName && typeof this.partieEnCours.pressDown === "function") {
            try {
              if (isDown) this.partieEnCours.pressDown(btnName);
              else this.partieEnCours.pressUp(btnName);
            } catch (err) {}
          }
          if (code && typeof this.partieEnCours.keyboardDown === "function") {
            try {
              if (isDown) this.partieEnCours.keyboardDown(code);
              else this.partieEnCours.keyboardUp(code);
            } catch (err) {}
          }
        }

        const canvas = document.getElementById("rv-canvas");
        if (canvas) {
          try {
            const synth = new KeyboardEvent(isDown ? "keydown" : "keyup", {
              code: code,
              key: key,
              bubbles: true,
              cancelable: true
            });
            synth._isRvBridge = true;
            canvas.dispatchEvent(synth);
          } catch (e) {}
        }
      };

      const bindBtn = (el) => {
        if (!el) return;
        const btn = (el.getAttribute("data-btn") || "").toLowerCase();
        const code = el.getAttribute("data-code") || "";
        const key = el.getAttribute("data-key") || "";

        let isTouchActive = false;

        const onTouchStart = (e) => {
          e.preventDefault();
          isTouchActive = true;
          el.classList.add("pressed");
          triggerKey(btn, code, key, true);
        };

        const onTouchEnd = (e) => {
          e.preventDefault();
          isTouchActive = false;
          el.classList.remove("pressed");
          triggerKey(btn, code, key, false);
        };

        const onMouseDown = (e) => {
          if (isTouchActive) return;
          e.preventDefault();
          el.classList.add("pressed");
          triggerKey(btn, code, key, true);
        };

        const onMouseUp = (e) => {
          if (isTouchActive) return;
          e.preventDefault();
          el.classList.remove("pressed");
          triggerKey(btn, code, key, false);
        };

        el.addEventListener("touchstart", onTouchStart, { passive: false });
        el.addEventListener("touchend", onTouchEnd, { passive: false });
        el.addEventListener("touchcancel", onTouchEnd, { passive: false });
        el.addEventListener("mousedown", onMouseDown);
        el.addEventListener("mouseup", onMouseUp);
        el.addEventListener("mouseleave", onMouseUp);
      };

      document.querySelectorAll("#rv-gamepad button").forEach(bindBtn);

      // Gestion fluide du glissement continu sur le D-Pad
      const dpad = document.getElementById("rv-dpad");
      if (dpad) {
        let currentDpadBtn = null;

        dpad.addEventListener("touchmove", (e) => {
          e.preventDefault();
          if (!e.touches || e.touches.length === 0) return;
          const touch = e.touches[0];
          const target = document.elementFromPoint(touch.clientX, touch.clientY);

          if (target && target.classList.contains("rv-dpad-btn")) {
            if (target !== currentDpadBtn) {
              if (currentDpadBtn) {
                currentDpadBtn.classList.remove("pressed");
                triggerKey(
                  (currentDpadBtn.getAttribute("data-btn") || "").toLowerCase(),
                  currentDpadBtn.getAttribute("data-code") || "",
                  currentDpadBtn.getAttribute("data-key") || "",
                  false
                );
              }
              currentDpadBtn = target;
              currentDpadBtn.classList.add("pressed");
              triggerKey(
                (currentDpadBtn.getAttribute("data-btn") || "").toLowerCase(),
                currentDpadBtn.getAttribute("data-code") || "",
                currentDpadBtn.getAttribute("data-key") || "",
                true
              );
            }
          } else if (currentDpadBtn) {
            currentDpadBtn.classList.remove("pressed");
            triggerKey(
              (currentDpadBtn.getAttribute("data-btn") || "").toLowerCase(),
              currentDpadBtn.getAttribute("data-code") || "",
              currentDpadBtn.getAttribute("data-key") || "",
              false
            );
            currentDpadBtn = null;
          }
        }, { passive: false });

        dpad.addEventListener("touchend", () => {
          if (currentDpadBtn) {
            currentDpadBtn.classList.remove("pressed");
            triggerKey(
              (currentDpadBtn.getAttribute("data-btn") || "").toLowerCase(),
              currentDpadBtn.getAttribute("data-code") || "",
              currentDpadBtn.getAttribute("data-key") || "",
              false
            );
            currentDpadBtn = null;
          }
        });
      }

      // Bouton pour afficher/masquer la manette
      const padToggleBtn = document.getElementById("rv-btn-pad-toggle");
      const gamepadEl = document.getElementById("rv-gamepad");
      if (padToggleBtn && gamepadEl) {
        padToggleBtn.addEventListener("click", () => {
          gamepadEl.classList.toggle("force-hidden");
          padToggleBtn.textContent = gamepadEl.classList.contains("force-hidden") ? "🎮 Manette : OFF" : "🎮 Manette : ON";
        });
      }
    }

    bindModalEvents() {
      // Fermeture
      document.getElementById("rv-close-btn").addEventListener("click", () => this.close());
      document.getElementById("rv-btn-pause").addEventListener("click", () => this.togglePause());
      document.getElementById("rv-btn-reset").addEventListener("click", () => {
        if (this.jeuEnCoursType === "nds") {
          const frame = document.getElementById("rv-nds-frame");
          if (frame && frame.contentWindow) {
            try { frame.contentWindow.postMessage({ type: "RESET" }, "*"); } catch (e) {}
          }
        } else if (this.partieEnCours) {
          this.partieEnCours.restart();
        }
      });
      document.getElementById("rv-btn-save").addEventListener("click", () => this.sauvegarderPartie());
      document.getElementById("rv-btn-load").addEventListener("click", () => this.chargerPartie());
      document.getElementById("rv-btn-fullscreen").addEventListener("click", () => {
        const c = document.getElementById("rv-game-container");
        if (!document.fullscreenElement) c.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      });

      // Écoute des messages venant de l'iframe DS
      window.addEventListener("message", (e) => {
        if (e.data && e.data.type === "NDS_READY") {
          if (this.pendingNdsRom) {
            const frame = document.getElementById("rv-nds-frame");
            if (frame && frame.contentWindow) {
              try {
                frame.contentWindow.postMessage({
                  type: "LOAD_ROM",
                  blob: this.pendingNdsRom.blob,
                  name: this.pendingNdsRom.name
                }, "*");
              } catch (err) {}
            }
          }
        }
      });
      document.getElementById("rv-btn-crt").addEventListener("click", () => {
        const crt = document.getElementById("rv-crt");
        const btn = document.getElementById("rv-btn-crt");
        crt.classList.toggle("disabled");
        btn.textContent = crt.classList.contains("disabled") ? "📺 CRT : OFF" : "📺 CRT : ON";
      });

      // Upload manuel (fonctionne sur ordinateur ET smartphones iOS/Android)
      const fileInput = document.getElementById("rv-file-input");
      document.getElementById("rv-btn-upload").addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", (e) => {
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
      document.querySelectorAll(".rv-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          document.querySelectorAll(".rv-tab").forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");
          this.filtreActuel = tab.getAttribute("data-filter");
          this.rendreGrille();
          this.adapterAideTouches(this.filtreActuel === "all" ? this.jeuEnCoursType : this.filtreActuel);
        });
      });

      // Glisser-déposer interne dans la modale
      this.modal.addEventListener("dragover", (e) => e.preventDefault());
      this.modal.addEventListener("drop", (e) => {
        e.preventDefault();
        if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
        const file = e.dataTransfer.files[0];
        const ext = file.name.split(".").pop().toLowerCase();
        if (["nes", "sfc", "smc", "gba", "gb", "gbc", "md", "bin", "gen", "zip", "iso", "cue", "chd", "pbp", "img", "pce", "nds", "cso"].includes(ext)) {
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
      // 1. Guide textuel
      const badgeY = document.getElementById("rv-badge-y");
      const badgeB = document.getElementById("rv-badge-b");
      const badgeA = document.getElementById("rv-badge-a");
      const badgeX = document.getElementById("rv-badge-x");
      const badgeTriggers = document.getElementById("rv-badge-triggers");

      if (badgeB && badgeA) {
        if (consoleType === "nes" || consoleType === "gb") {
          if (badgeY) badgeY.style.display = "none";
          if (badgeX) badgeX.style.display = "none";
          if (badgeTriggers) badgeTriggers.style.display = "none";
          badgeB.innerHTML = '<span class="rv-kbd rv-kbd-pri">5</span> : B';
          badgeA.innerHTML = '<span class="rv-kbd rv-kbd-pri">6</span> : A';
        } else if (consoleType === "pce") {
          if (badgeY) badgeY.style.display = "none";
          if (badgeX) badgeX.style.display = "none";
          if (badgeTriggers) badgeTriggers.style.display = "none";
          badgeB.innerHTML = '<span class="rv-kbd rv-kbd-pri">5</span> : II';
          badgeA.innerHTML = '<span class="rv-kbd rv-kbd-pri">6</span> : I';
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
        } else if (consoleType === "ps1" || consoleType === "psp") {
          if (badgeY) {
            badgeY.style.display = "inline";
            badgeY.innerHTML = '<span class="rv-kbd">4</span> : □ Carré';
          }
          if (badgeB) badgeB.innerHTML = '<span class="rv-kbd rv-kbd-pri">5</span> : ✕ Croix';
          if (badgeA) badgeA.innerHTML = '<span class="rv-kbd rv-kbd-pri">6</span> : ○ Rond';
          if (badgeX) {
            badgeX.style.display = "inline";
            badgeX.innerHTML = '<span class="rv-kbd">8</span> : △ Triangle';
          }
          if (badgeTriggers) {
            badgeTriggers.style.display = "inline";
            badgeTriggers.innerHTML = '<span class="rv-kbd">7</span> L / <span class="rv-kbd">9</span> R';
          }
        } else if (consoleType === "nds") {
          if (badgeY) {
            badgeY.style.display = "inline";
            badgeY.innerHTML = '<span class="rv-kbd">4</span> : Y';
          }
          if (badgeB) badgeB.innerHTML = '<span class="rv-kbd rv-kbd-pri">5</span> : B';
          if (badgeA) badgeA.innerHTML = '<span class="rv-kbd rv-kbd-pri">6</span> : A';
          if (badgeX) {
            badgeX.style.display = "inline";
            badgeX.innerHTML = '<span class="rv-kbd">8</span> : X';
          }
          if (badgeTriggers) {
            badgeTriggers.style.display = "inline";
            badgeTriggers.innerHTML = '<span class="rv-kbd">7</span> L / <span class="rv-kbd">9</span> R / 🖊️ Stylet';
          }
        } else {
          // SNES & Arcade
          if (badgeY) {
            badgeY.style.display = "inline";
            badgeY.innerHTML = '<span class="rv-kbd">4</span> : Y';
          }
          if (badgeB) badgeB.innerHTML = '<span class="rv-kbd rv-kbd-pri">5</span> : B';
          if (badgeA) badgeA.innerHTML = '<span class="rv-kbd rv-kbd-pri">6</span> : A';
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

      // 2. Boutons de la manette tactile
      const touchX = document.getElementById("rv-touch-x");
      const touchY = document.getElementById("rv-touch-y");
      const touchB = document.getElementById("rv-touch-b");
      const touchA = document.getElementById("rv-touch-a");
      const touchL = document.getElementById("rv-touch-l");
      const touchR = document.getElementById("rv-touch-r");

      const isPlayStation = consoleType === "ps1" || consoleType === "psp";
      if (touchX) touchX.textContent = isPlayStation ? "△" : "X";
      if (touchY) touchY.textContent = isPlayStation ? "□" : (consoleType === "megadrive" ? "A" : "Y");
      if (touchB) touchB.textContent = isPlayStation ? "✕" : (consoleType === "pce" ? "II" : "B");
      if (touchA) touchA.textContent = isPlayStation ? "○" : (consoleType === "pce" ? "I" : (consoleType === "megadrive" ? "C" : "A"));
      if (touchL) touchL.textContent = isPlayStation ? "L1" : "L";
      if (touchR) touchR.textContent = isPlayStation ? "R1" : "R";

      if (consoleType === "nes" || consoleType === "gb" || consoleType === "pce") {
        if (touchX) touchX.style.opacity = "0.15";
        if (touchY) touchY.style.opacity = "0.15";
        if (touchL) touchL.style.opacity = "0.15";
        if (touchR) touchR.style.opacity = "0.15";
      } else if (consoleType === "gba") {
        if (touchX) touchX.style.opacity = "0.15";
        if (touchY) touchY.style.opacity = "0.15";
        if (touchL) touchL.style.opacity = "1";
        if (touchR) touchR.style.opacity = "1";
      } else if (consoleType === "megadrive") {
        if (touchX) touchX.style.opacity = "0.15";
        if (touchY) touchY.style.opacity = "1";
        if (touchL) touchL.style.opacity = "0.15";
        if (touchR) touchR.style.opacity = "0.15";
      } else {
        if (touchX) touchX.style.opacity = "1";
        if (touchY) touchY.style.opacity = "1";
        if (touchL) touchL.style.opacity = "1";
        if (touchR) touchR.style.opacity = "1";
      }
    }

    async rendreGrille() {
      const grid = document.getElementById("rv-grid");
      if (!grid) return;
      grid.innerHTML = "";

      const liste = this.filtreActuel === "all"
        ? this.tousLesJeux
        : this.tousLesJeux.filter((j) => j.console === this.filtreActuel);

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
        await new Promise((r) => setTimeout(r, 600));
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

        if (cType === "nds") {
          const isLauncher = nomFichier.includes("console-nds-launcher");

          let romBlob = customBlob;
          if (!romBlob && !isLauncher) {
            try {
              const res = await fetch("assets/vault/" + encodeURI(nomFichier));
              if (res.ok) romBlob = await res.blob();
            } catch (e) {
              console.warn("Could not fetch ROM from vault:", e);
            }
          }

          container.innerHTML = `
            <div style="width: 100%; height: 600px; max-height: 80vh; display: flex; flex-direction: column; background: #000; position: relative;">
              <div style="position: absolute; top: 8px; right: 8px; z-index: 10;">
                <a href="emulators/ds/index.html?v=8.4" target="_blank" class="rv-btn" style="font-size: 0.72rem; padding: 4px 8px; text-decoration: none;">⛶ Plein Écran Dédié</a>
              </div>
              <iframe id="rv-nds-frame" class="rv-embedded-frame" src="emulators/ds/index.html?v=8.4" allow="autoplay; fullscreen; gamepad"></iframe>
            </div>
          `;

          const frame = document.getElementById("rv-nds-frame");
          this.pendingNdsRom = romBlob ? { blob: romBlob, name: nomFichier } : null;

          if (frame && this.pendingNdsRom) {
            const sendRom = () => {
              try {
                if (frame.contentWindow && this.pendingNdsRom) {
                  frame.contentWindow.postMessage({
                    type: "LOAD_ROM",
                    blob: this.pendingNdsRom.blob,
                    name: this.pendingNdsRom.name
                  }, "*");
                }
              } catch (e) {}
            };
            frame.onload = () => setTimeout(sendRom, 400);
          }

          status.textContent = isLauncher
            ? "🎮 Console Nintendo DS (DeSmuME Desmond) prête | Insérez une cartouche ou glissez un .nds !"
            : `🎮 Relique DS : "${nomFichier}". Émulateur Desmond actif (Stylet sur écran bas).`;
          status.style.color = "#d4af37";
          this.jeuEnCoursNom = nomFichier;
          this.rendreGrille();
          return;
        }

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

        // Configuration RetroArch ergonomique (ZSQD + Pavé Numérique 8546 + Start B / Select V)
        const retroConfig = {
          input_player1_up: "w",
          input_player1_down: "s",
          input_player1_left: "a",
          input_player1_right: "d",
          input_player1_b: "num5",
          input_player1_a: "num6",
          input_player1_y: "num4",
          input_player1_x: "num8",
          input_player1_l: "num7",
          input_player1_r: "num9",
          input_player1_start: "b",
          input_player1_select: "v",
          input_load_state_key: "f4",
          input_save_state_key: "f2",
          input_load_state_btn: "nul",
          input_save_state_btn: "nul",
          input_reset_key: "nul"
        };

        const canvasEl = document.getElementById("rv-canvas");

        const romFile = romBlob instanceof File ? romBlob : new File([romBlob], nomFichier);

        if (cType === "snes") {
          this.partieEnCours = await Nostalgist.snes({ element: canvasEl, rom: romFile, retroarchConfig: retroConfig });
        } else if (cType === "gba") {
          this.partieEnCours = await Nostalgist.gba({ element: canvasEl, rom: romFile, retroarchConfig: retroConfig });
        } else if (cType === "gb") {
          this.partieEnCours = await Nostalgist.gbc({ element: canvasEl, rom: romFile, retroarchConfig: retroConfig });
        } else if (cType === "megadrive") {
          this.partieEnCours = await Nostalgist.megadrive({ element: canvasEl, rom: romFile, retroarchConfig: retroConfig });
        } else if (cType === "nes") {
          this.partieEnCours = await Nostalgist.nes({ element: canvasEl, rom: romFile, retroarchConfig: retroConfig });
        } else if (cType === "ps1") {
          this.partieEnCours = await Nostalgist.launch({ core: "pcsx_rearmed", element: canvasEl, rom: romFile, retroarchConfig: retroConfig });
        } else if (cType === "pce") {
          this.partieEnCours = await Nostalgist.launch({ core: "mednafen_pce_fast", element: canvasEl, rom: romFile, retroarchConfig: retroConfig });
        } else {
          this.partieEnCours = await Nostalgist.launch({ core: conf.core, element: canvasEl, rom: romFile, retroarchConfig: retroConfig });
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
      const status = document.getElementById("rv-status");
      if (this.jeuEnCoursType === "nds") {
        const frame = document.getElementById("rv-nds-frame");
        if (frame && frame.contentWindow) {
          try {
            frame.contentWindow.postMessage({ type: "SAVE_STATE" }, "*");
            if (status) {
              status.textContent = "💾 Sauvegarde DSV exportée depuis la console Nintendo DS";
              status.style.color = "#34d399";
            }
          } catch (e) {}
        }
        return;
      }

      if (!this.partieEnCours) {
        if (status) {
          status.textContent = "💡 Sauvegarde intégrée dans le menu de la console.";
          status.style.color = "#d4af37";
        }
        return;
      }
      status.textContent = "⏳ Sauvegarde de l'état...";
      try {
        const res = await this.partieEnCours.saveState();
        const stateObj = res.state;
        if (stateObj) {
          await this.saveStateDB(this.jeuEnCoursNom, stateObj);
          status.textContent = `✅ Sauvegarde réussie (${new Date().toLocaleTimeString()}) !`;
          status.style.color = "#34d399";
          this.rendreGrille();
        } else {
          status.textContent = "⚠️ Sauvegarde automatique active dans le jeu.";
          status.style.color = "#fbbf24";
        }
      } catch (e) {
        status.textContent = "❌ Erreur de sauvegarde : " + e.message;
        status.style.color = "#ef4444";
      }
    }

    async chargerPartie() {
      const status = document.getElementById("rv-status");
      if (this.jeuEnCoursType === "nds") {
        if (status) {
          status.textContent = "💡 Les cartouches DS gèrent automatiquement leur fichier de sauvegarde (.dsv).";
          status.style.color = "#d4af37";
        }
        return;
      }

      if (!this.partieEnCours) {
        if (status) {
          status.textContent = "💡 Chargement de sauvegarde intégré dans le menu de la console.";
          status.style.color = "#d4af37";
        }
        return;
      }
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
      if (this.jeuEnCoursType === "nds") return;
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
      if (!this.modal || !this.modal.classList.contains("active")) return;
      if (!this.partieEnCours && this.jeuEnCoursType !== "nds") return;
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

      // Désactiver le comportement par défaut d'Entrée pour éviter de déclencher les boutons ou recharger la sauvegarde
      if (e.code === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();
        return;
      }

      let btn = null;
      let targetCode = null;
      let targetKey = null;

      // Touches Start (B) et Select (V)
      if (e.code === "KeyB") { btn = "start"; targetCode = "KeyB"; targetKey = "b"; }
      else if (e.code === "KeyV") { btn = "select"; targetCode = "KeyV"; targetKey = "v"; }
      else if (e.code === "ArrowUp" || e.code === "KeyW") { btn = "up"; targetCode = "KeyW"; targetKey = "w"; }
      else if (e.code === "ArrowDown" || e.code === "KeyS") { btn = "down"; targetCode = "KeyS"; targetKey = "s"; }
      else if (e.code === "ArrowLeft" || e.code === "KeyA") { btn = "left"; targetCode = "KeyA"; targetKey = "a"; }
      else if (e.code === "ArrowRight" || e.code === "KeyD") { btn = "right"; targetCode = "KeyD"; targetKey = "d"; }
      else if (e.code === "KeyZ") { btn = "up"; targetCode = "KeyW"; targetKey = "w"; } // AZERTY Z
      else if (e.code === "KeyQ") { btn = "left"; targetCode = "KeyA"; targetKey = "a"; } // AZERTY Q
      else if (e.code === "Numpad8" || e.code === "Digit8") { btn = "x"; targetCode = "Numpad8"; targetKey = "8"; }
      else if (e.code === "Numpad5" || e.code === "Digit5") { btn = "b"; targetCode = "Numpad5"; targetKey = "5"; }
      else if (e.code === "Numpad4" || e.code === "Digit4") { btn = "y"; targetCode = "Numpad4"; targetKey = "4"; }
      else if (e.code === "Numpad6" || e.code === "Digit6") { btn = "a"; targetCode = "Numpad6"; targetKey = "6"; }
      else if (e.code === "Numpad7" || e.code === "Digit7") { btn = "l"; targetCode = "Numpad7"; targetKey = "7"; }
      else if (e.code === "Numpad9" || e.code === "Digit9") { btn = "r"; targetCode = "Numpad9"; targetKey = "9"; }
      else if ((e.code === "Numpad4" || e.code === "Digit4") && ["nes", "gb", "pce"].includes(this.jeuEnCoursType)) {
        btn = "b";
        targetCode = "Numpad5";
        targetKey = "5";
      }

      if (btn) {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyB", "KeyV"].includes(e.code)) {
          e.preventDefault();
        }

        const isDown = e.type === "keydown";

        // Si console Nintendo DS (dans l'iframe Desmond)
        if (this.jeuEnCoursType === "nds") {
          const frame = document.getElementById("rv-nds-frame");
          if (frame && frame.contentWindow) {
            try {
              frame.contentWindow.postMessage({
                type: "KEY_STATE",
                btn: btn,
                code: targetCode,
                keyCode: e.keyCode,
                isDown: isDown
              }, "*");
            } catch (err) {}
          }
          return;
        }

        // Si moteur Nostalgist
        if (this.partieEnCours) {
          if (typeof this.partieEnCours.pressDown === "function") {
            try {
              if (isDown) this.partieEnCours.pressDown(btn);
              else this.partieEnCours.pressUp(btn);
            } catch (err) {}
          }
          if (targetCode && typeof this.partieEnCours.keyboardDown === "function") {
            try {
              if (isDown) this.partieEnCours.keyboardDown(targetCode);
              else this.partieEnCours.keyboardUp(targetCode);
            } catch (err) {}
          }
        }

        const canvas = document.getElementById("rv-canvas");
        if (canvas) {
          try {
            const synth = new KeyboardEvent(e.type, {
              code: targetCode,
              key: targetKey,
              bubbles: true,
              cancelable: true
            });
            synth._isRvBridge = true;
            canvas.dispatchEvent(synth);
          } catch (e) {}
        }
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
        try { this.partieEnCours.pause(); } catch (e) {}
      }

      this.pendingNdsRom = null;

      const activeFrame = document.getElementById("rv-nds-frame");
      if (activeFrame) {
        activeFrame.src = "about:blank";
      }

      window.removeEventListener("keydown", this.boundKeyHandler);
      window.removeEventListener("keyup", this.boundKeyHandler);
    }
  }

  window.RetroVaultEngine = new RetroVault();
})();
