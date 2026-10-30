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

  // --- Reliques Publiques (Mode Invité / Sandbox Légal) ---
  // En mode non connecté (Invité), aucune ROM ni catalogue n'est exposé.
  const PUBLIC_ROMS = [];

  const CONSOLES_CONF = {
    snes: { label: "Super Nintendo", core: "snes9x", tag: "tag-snes", hasExtra: true },
    gba: { label: "Game Boy Advance", core: "mgba", tag: "tag-gba", hasExtra: true },
    gb: { label: "Game Boy / GBC", core: "gambatte", tag: "tag-gb", hasExtra: false },
    nes: { label: "NES 8-bit", core: "fceumm", tag: "tag-nes", hasExtra: false },
    megadrive: { label: "Mega Drive", core: "genesis_plus_gx", tag: "tag-md", hasExtra: true },
    ps1: { label: "PlayStation 1", core: "pcsx_rearmed", tag: "tag-ps1", hasExtra: true },
    nds: { label: "Nintendo DS", core: "desmume", tag: "tag-nds", hasExtra: true },
    psp: { label: "PlayStation Portable", core: "ppsspp", tag: "tag-psp", hasExtra: true },
    pce: { label: "PC Engine", core: "mednafen_pce_fast", tag: "tag-pce", hasExtra: false },
    arcade: { label: "Arcade", core: "fbneo", tag: "tag-arcade", hasExtra: true }
  };

  // Base de sortilèges préconfigurés (Cheats par relique)
  const PREDEFINED_CHEATS = {
    "Pokémon Emeraude": [
      { code: "02025840 00010001", description: "Master Ball infinies (PC slot 1)", enabled: false },
      { code: "02025840 00440001", description: "Super Bonbons infinis (PC slot 1)", enabled: false },
      { code: "02024F4C 000F423F", description: "Argent Maximum 999 999 ₽", enabled: false },
      { code: "02037006 0000", description: "Repousse infinie (Zéro combat sauvage)", enabled: false }
    ],
    "Spider-Man - Mysterio": [
      { code: "03001858:64", description: "Santé Infinie (100 HP)", enabled: false },
      { code: "0300185A:64", description: "Fluide de Toile Infini", enabled: false },
      { code: "03001856:09", description: "Vies Infinies (9 Vies)", enabled: false }
    ],
    "Super Mario World": [
      { code: "7E0DBE63", description: "Vies Infinies (99 Vies)", enabled: false },
      { code: "7E149010", description: "Invincibilité continue", enabled: false },
      { code: "7E001902", description: "Mario Capé permanent", enabled: false }
    ],
    "CHRONO": [
      { code: "7E2C537F", description: "Argent Max (Partie 1)", enabled: false },
      { code: "7E2C5496", description: "Argent Max (Partie 2)", enabled: false },
      { code: "7E5E6E03", description: "HP Infinis Crono en Combat", enabled: false }
    ],
    "Pokemon - Version Jaune": [
      { code: "019946D3", description: "Argent Maximum (Partie 1)", enabled: false },
      { code: "019947D3", description: "Argent Maximum (Partie 2)", enabled: false },
      { code: "01011ED3", description: "Master Ball x99 slot 1 sac", enabled: false },
      { code: "01033CD1", description: "Pas de combats sauvages", enabled: false }
    ],
    "Link's Awakening DX": [
      { code: "010CD4DB", description: "Santé Infinie (14 Cœurs)", enabled: false },
      { code: "01035DDB", description: "Rubis Maximum (999)", enabled: false }
    ],
    "Super Mario Bros. 3": [
      { code: "SLXPLOVS", description: "Vies Infinies", enabled: false },
      { code: "PEUZSIAA", description: "Toujours Mario Tanuki", enabled: false }
    ],
    "Super Mario Bros. 2": [
      { code: "SLXULLVS", description: "Vies Infinies", enabled: false }
    ],
    "Legend of Zelda": [
      { code: "SZVZZZVG", description: "Vies Infinies", enabled: false },
      { code: "066D:FF", description: "Rubis Maximum (255)", enabled: false }
    ],
    "Tekken 3": [
      { code: "800A9E70 FFFF", description: "Débloquer tous les combattants", enabled: false },
      { code: "800AAB0E 0082", description: "Santé Joueur 1 Infinie", enabled: false }
    ],
    "MediEvil": [
      { code: "800D16B4 012C", description: "Santé Infinie Sir Dan", enabled: false }
    ]
  };

  class RetroVault {
    constructor() {
      this.version = "10.2-options-perf";
      this.modal = null;
      this.partieEnCours = null;
      this.jeuEnCoursNom = "";
      this.jeuEnCoursType = "snes";
      this.filtreActuel = "all";
      this.rechercheTexte = "";
      this.tousLesJeux = [];
      this.estEnPause = false;
      this.vitesseActuelle = 1.0;
      this.isFastForward = false;
      this.afficherPerfFps = localStorage.getItem("rv_show_fps") === "true";
      this.autoFullscreenPaysage = localStorage.getItem("rv_auto_landscape_fs") !== "false";
      this.fpsAnimId = null;
      this.cheatsLocaux = JSON.parse(localStorage.getItem("rv_custom_cheats") || "{}");
      this.dbName = "HibouRetroVaultDB";
      this.storeName = "saves";
      this.db = null;
      this.boundKeyHandler = this.bridgeClavier.bind(this);
      this.volumeActuel = 0.8;
      this.volumePrecedent = 0.8;

      // Nettoyage préventif des anciens jetons et caches résiduels si non connecté
      if (!localStorage.getItem("rv_vps_token")) {
        try {
          localStorage.removeItem("rv_cloud_token");
          localStorage.removeItem("rv_cached_library");
          localStorage.removeItem("rv_cloud_gist_id");
        } catch (e) {}
      }
      this.pendingNdsSave = null;
      this.isSavingState = false;
      this.isLoadingState = false;
      this._landStatusTimer = null;
      try {
        const sv = localStorage.getItem("rv_volume");
        if (sv !== null) {
          const pv = parseFloat(sv);
          if (!isNaN(pv) && pv >= 0 && pv <= 1) this.volumeActuel = pv;
        }
      } catch(e) {}
      this.gamepadLoopId = null;
      this.lastGamepadBrand = "";
      this.cloudKeyBuffer = "";
      this.cloudSha256 = "e4d8de0fcd22fe4e48bf23e6e8a1d97db92c980a668abc32d1977466e362339e";
      this.cloudSyncing = false;
      this.sramLoopId = null;
      this.isSavingSram = false;
      this.lastSramHash = {};

      // Sauvegarde réflexe lors de la fermeture ou du rafraîchissement d'onglet
      window.addEventListener("beforeunload", () => {
        if (this.partieEnCours && this.jeuEnCoursNom) {
          this.extraireEtSauvegarderSRAM(this.jeuEnCoursNom, true);
        }
      });
      window.addEventListener("pagehide", () => {
        if (this.partieEnCours && this.jeuEnCoursNom) {
          this.extraireEtSauvegarderSRAM(this.jeuEnCoursNom, true);
        }
      });

      // Écoute des messages DS pour sauvegarde et synchronisation
      window.addEventListener("message", async (e) => {
        if (!e.data) return;
        if (e.data.type === "DS_SAVE_DATA" || e.data.type === "DS_AUTO_SAVE") {
          const saveBytes = e.data.data;
          const gameName = e.data.name || this.jeuEnCoursNom;
          if (saveBytes && gameName) {
            try {
              const uint8 = new Uint8Array(saveBytes);
              await this.saveSramDB(gameName, uint8);
              await this.saveStateDB(gameName, uint8, null, true);
              const status = document.getElementById("rv-status");
              if (status && e.data.type === "DS_SAVE_DATA") {
                status.textContent = `💾 Sauvegarde DS enregistrée dans le Sanctuaire (${new Date().toLocaleTimeString()}) !`;
                status.style.color = "#34d399";
              }
              this.rendreGrille();
            } catch (err) {
              console.warn("Failed to persist DS save to IndexedDB:", err);
            }
          }
        } else if (e.data.type === "PSP_SAVE_DATA" || e.data.type === "PSP_AUTO_SAVE") {
          const saveBytes = e.data.data;
          const gameName = e.data.name || this.jeuEnCoursNom;
          if (saveBytes && gameName) {
            try {
              const uint8 = new Uint8Array(saveBytes);
              await this.saveSramDB(gameName, uint8);
              await this.saveStateDB(gameName, uint8, null, true);
              const status = document.getElementById("rv-status");
              if (status && e.data.type === "PSP_SAVE_DATA") {
                status.textContent = `💾 Sauvegarde PSP enregistrée dans le Sanctuaire (${new Date().toLocaleTimeString()}) !`;
                status.style.color = "#34d399";
              }
              this.rendreGrille();
            } catch (err) {
              console.warn("Failed to persist PSP save to IndexedDB:", err);
            }
          }
        } else if (e.data.type === "PSP_READY" || e.data.type === "PSP_RUNNER_READY") {
          const frame = document.getElementById("rv-psp-frame");
          if (frame && frame.contentWindow) {
            try {
              frame.contentWindow.postMessage({
                type: "SET_VOLUME",
                volume: this.volumeActuel
              }, "*");
              if (this.pendingPspSave) {
                frame.contentWindow.postMessage({
                  type: "LOAD_PSP_SAVE",
                  data: Array.from(this.pendingPspSave)
                }, "*");
              }
              if (this.pendingPspRom) {
                frame.contentWindow.postMessage({
                  type: "LOAD_ROM",
                  blob: this.pendingPspRom.blob,
                  name: this.pendingPspRom.name
                }, "*");
              }
            } catch(err) {}
          }
        } else if (e.data.type === "NDS_READY") {
          if (this.pendingNdsSave) {
            const frame = document.getElementById("rv-nds-frame");
            if (frame && frame.contentWindow) {
              try {
                frame.contentWindow.postMessage({
                  type: "LOAD_DS_SAVE",
                  data: Array.from(this.pendingNdsSave)
                }, "*");
              } catch(err) {}
            }
          }
        }
      });
    }

    setStatus(text, color = "#d4af37") {
      const status = document.getElementById("rv-status");
      if (status) {
        status.textContent = text;
        status.style.color = color;
      }
      const landStatus = document.getElementById("rv-land-status");
      if (landStatus) {
        const clean = text.replace(/^[🎮⏳✅⚠️❌💡📂💾☁️🔌]\s*/, "");
        landStatus.textContent = clean.length > 28 ? clean.substring(0, 26) + "..." : clean;
        landStatus.style.color = color;
      }
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

    isCloudConnected() {
      return !!localStorage.getItem("rv_vps_token");
    }

    getCloudToken() {
      return localStorage.getItem("rv_vps_token") || "";
    }

    // --- Chargement dynamique selon le compte (Invité vs Connecté) ---
    async chargerBibliotheque() {
      if (this.isCloudConnected()) {
        const token = this.getCloudToken();
        try {
          const res = await fetch(`api/saves.php?action=library&token=${encodeURIComponent(token)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.ok && Array.isArray(data.roms)) {
              this.tousLesJeux = [...data.roms];
              try { localStorage.setItem("rv_cached_library", JSON.stringify(data.roms)); } catch (e) {}
              return;
            }
          } else if (res.status === 401 || res.status === 403) {
            // Session révoquée ou expirée -> déconnexion immédiate et purge
            this.disconnectVPSCloud();
            this.tousLesJeux = [];
            return;
          }
        } catch (e) {
          console.warn("[RetroVault] Erreur chargement bibliothèque privée:", e);
        }

        // Repli cache local uniquement si authentifié et valide
        const cached = localStorage.getItem("rv_cached_library");
        if (cached && this.isCloudConnected()) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.tousLesJeux = parsed;
              return;
            }
          } catch(e) {}
        }
      }

      // Si non connecté : zéro relique privée exposée
      this.tousLesJeux = [];
    }

    // --- Synchronisation visuelle de l'état du Compte (Boutons, Badges & Visibilité Bibliothèque) ---
    mettreAJourInterfaceCompte() {
      const isConnected = this.isCloudConnected();
      const user = localStorage.getItem("rv_vps_user") || "Hibouxe";

      const btnAccount = document.getElementById("rv-btn-account");
      if (btnAccount) {
        if (isConnected) {
          btnAccount.innerHTML = `🟢 Mon Compte (${user})`;
          btnAccount.title = `Compte connecté (${user}) — Gérer les sauvegardes ou se déconnecter`;
          btnAccount.classList.add("rv-btn-account-active");
          btnAccount.style.display = "inline-flex";
        } else {
          btnAccount.style.display = "none";
          btnAccount.classList.remove("rv-btn-account-active");
        }
      }

      const landAccount = document.getElementById("rv-land-btn-account");
      if (landAccount) {
        if (isConnected) {
          landAccount.textContent = "🟢";
          landAccount.title = `Compte ${user} connecté`;
          landAccount.style.display = "inline-flex";
        } else {
          landAccount.style.display = "none";
        }
      }

      // Masquer / Afficher le bouton "Changer de jeu" selon la connexion
      const btnHubNav = document.getElementById("rv-btn-hub-nav");
      if (btnHubNav) {
        btnHubNav.style.display = isConnected ? "inline-flex" : "none";
      }

      // Masquer / Afficher la Sélection des Consoles & Reliques selon la connexion
      const libHead = document.getElementById("rv-library");
      if (libHead) {
        libHead.style.display = isConnected ? "block" : "none";
      }
      const grid = document.getElementById("rv-grid");
      if (grid) {
        grid.style.display = isConnected ? "grid" : "none";
      }
    }

    async saveStateDB(key, blob, customDate = null, skipCloudUpload = false, customTimestamp = null) {
      const db = await this.getDB();
      const dateStr = customDate || new Date().toLocaleString();
      const ts = customTimestamp || Date.now();
      const existing = (await this.loadStateDB(key)) || {};
      existing.state = blob;
      existing.stateDate = dateStr;
      existing.stateTimestamp = ts;
      if (ts >= (existing.timestamp || 0)) {
        existing.date = dateStr;
        existing.timestamp = ts;
      }

      await new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        tx.objectStore(this.storeName).put(existing, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // Synchronisation furtive vers le Cloud VPS Souverain si connecté
      if (!skipCloudUpload && this.isCloudConnected()) {
        this.uploadSaveToVPS(key, blob, dateStr, ts, false, "state").catch(() => {});
      }
    }

    async saveSramDB(key, blob, customDate = null, skipCloudUpload = false, customTimestamp = null) {
      const db = await this.getDB();
      const dateStr = customDate || new Date().toLocaleString();
      const ts = customTimestamp || Date.now();
      const existing = (await this.loadStateDB(key)) || {};
      existing.sram = blob;
      existing.sramDate = dateStr;
      existing.sramTimestamp = ts;
      if (ts >= (existing.timestamp || 0)) {
        existing.date = dateStr;
        existing.timestamp = ts;
      }

      await new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        tx.objectStore(this.storeName).put(existing, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // Synchronisation furtive vers le Cloud VPS Souverain si connecté
      if (!skipCloudUpload && this.isCloudConnected()) {
        this.uploadSaveToVPS(key, blob, dateStr, ts, true, "sram").catch(() => {});
      }
    }

    demarrerSramLoop() {
      if (this.sramLoopId) return;
      this.sramLoopId = setInterval(() => {
        if (this.partieEnCours && !this.estEnPause && this.jeuEnCoursNom) {
          this.extraireEtSauvegarderSRAM(this.jeuEnCoursNom, true);
        }
      }, 10000);
    }

    arreterSramLoop() {
      if (this.sramLoopId) {
        clearInterval(this.sramLoopId);
        this.sramLoopId = null;
      }
    }

    async extraireEtSauvegarderSRAM(nomJeu, silent = true) {
      if (!this.partieEnCours || !nomJeu || this.isSavingSram) return;
      this.isSavingSram = true;
      try {
        let sramBlob = null;
        try {
          sramBlob = await this.partieEnCours.saveSRAM();
        } catch (err) {
          // Secours FS Emscripten si RetroArch a écrit le fichier mais Nostalgist a timeout
          try {
            const emulator = this.partieEnCours.getEmulator ? this.partieEnCours.getEmulator() : null;
            if (emulator && emulator.fs && emulator.sramFilePath) {
              const stats = emulator.fs.stat(emulator.sramFilePath);
              if (stats && stats.size > 0) {
                const buffer = emulator.fs.readFile(emulator.sramFilePath, "binary").buffer;
                if (buffer && buffer.byteLength > 0) {
                  sramBlob = new Blob([buffer], { type: "application/octet-stream" });
                }
              }
            }
          } catch (fsErr) {}
        }

        if (!sramBlob || sramBlob.size === 0) return;

        let hashHex = "";
        try {
          const ab = await sramBlob.arrayBuffer();
          const hashBuf = await crypto.subtle.digest("SHA-1", ab);
          hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
        } catch (e) {
          hashHex = String(sramBlob.size);
        }

        if (this.lastSramHash[nomJeu] === hashHex) {
          return;
        }

        this.lastSramHash[nomJeu] = hashHex;
        const dateStr = new Date().toLocaleString();
        const ts = Date.now();

        await this.saveSramDB(nomJeu, sramBlob, dateStr, false, ts);

        if (!silent) {
          this.setStatus(`💾 Carte mémoire sauvegardée (${new Date().toLocaleTimeString()}) !`, "#34d399");
        }
      } catch (err) {
        console.debug("[RetroVault] SRAM flush info:", err);
      } finally {
        this.isSavingSram = false;
      }
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

    async getAllStatesDB() {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const req = store.openCursor();
        const results = {};
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            results[cursor.key] = cursor.value;
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        req.onerror = () => reject(req.error);
      });
    }

    async stateToBase64(stateObj) {
      try {
        let u8 = null;
        if (stateObj instanceof Uint8Array) {
          u8 = stateObj;
        } else if (stateObj instanceof Blob) {
          const ab = await stateObj.arrayBuffer();
          u8 = new Uint8Array(ab);
        } else if (stateObj instanceof ArrayBuffer) {
          u8 = new Uint8Array(stateObj);
        } else if (Array.isArray(stateObj)) {
          u8 = new Uint8Array(stateObj);
        } else {
          return null;
        }

        let binary = "";
        const chunkSize = 0x8000;
        for (let i = 0; i < u8.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunkSize));
        }
        return btoa(binary);
      } catch (e) {
        console.warn("Erreur encodage base64:", e);
        return null;
      }
    }

    base64ToState(b64, consoleType) {
      try {
        const binary = atob(b64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        if (consoleType === "nds") {
          return bytes;
        }
        return new Blob([bytes], { type: "application/octet-stream" });
      } catch (e) {
        console.warn("Erreur décodage base64:", e);
        return null;
      }
    }

    // =========================================================================
    // SCEAU D'ARCHIVISTE — SYNCHRONISATION CLOUD SOUVERAINE (VPS PRIVÉ)
    // =========================================================================
    async verifyCloudHash(str) {
      try {
        const msgUint8 = new TextEncoder().encode(str);
        const hashBuf = await crypto.subtle.digest("SHA-256", msgUint8);
        const hashHex = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        if (hashHex === this.cloudSha256) {
          this.openCloudArchivistModal();
        }
      } catch (e) {}
    }

    async connectVPSCloud(username, password) {
      const cleanUser = (username || "").trim();
      if (!cleanUser) throw new Error("Veuillez renseigner un identifiant d'Archiviste.");
      if (!password) throw new Error("Veuillez renseigner le mot de passe du Sanctuaire.");

      const res = await fetch("api/saves.php?action=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUser, password })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || ("Échec de connexion (Code HTTP " + res.status + ")"));
      }

      localStorage.setItem("rv_vps_token", data.token);
      localStorage.setItem("rv_vps_user", data.user || "Hibouxe");
      localStorage.removeItem("rv_cloud_token");
      localStorage.removeItem("rv_cloud_gist_id");

      // Déverrouiller immédiatement les reliques privées du compte
      await this.chargerBibliotheque();
      this.mettreAJourInterfaceCompte();
      this.rendreGrille();
      if (!this.partieEnCours) {
        this.afficherEcranHub();
      }

      // Synchronisation immédiate des sauvegardes
      await this.syncVPSCloud({ silent: false });
      return data;
    }

    async syncVPSCloud({ silent = false } = {}) {
      const token = this.getCloudToken();
      if (!token || this.cloudSyncing) return;

      this.cloudSyncing = true;
      const status = document.getElementById("rv-status");
      if (!silent && status) {
        status.textContent = "⏳ Synchronisation céleste avec le VPS Souverain...";
        status.style.color = "#d4af37";
      }

      try {
        // 1. Récupérer l'inventaire des sauvegardes distantes sur le VPS
        const listRes = await fetch(`api/saves.php?action=list&token=${encodeURIComponent(token)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!listRes.ok) {
          if (listRes.status === 401) {
            this.disconnectVPSCloud();
            throw new Error("Session expirée. Veuillez vous reconnecter.");
          }
          throw new Error("Impossible de joindre le stockage VPS (Code " + listRes.status + ")");
        }

        const listData = await listRes.json();
        const remoteSaves = (listData && listData.saves) || {};
        const localSaves = await this.getAllStatesDB();

        let importedCount = 0;
        let exportedCount = 0;

        // 2. VPS -> Local : importer les sauvegardes distantes si absentes ou plus récentes
        for (const [key, rMeta] of Object.entries(remoteSaves)) {
          const lSave = localSaves[key] || {};
          const cType = this.identifierConsole(key);

          // Rapatriement SRAM
          const remoteHasSram = !!rMeta.has_sram || (!rMeta.has_state && !!rMeta.timestamp);
          const rSramTime = rMeta.sram_timestamp || (!rMeta.has_state ? rMeta.timestamp : 0);
          const lSramTime = lSave.sramTimestamp || (lSave.sram ? (lSave.timestamp || 0) : 0);

          if (remoteHasSram && (!lSave.sram || rSramTime > lSramTime)) {
            try {
              const loadRes = await fetch(`api/saves.php?action=load&game=${encodeURIComponent(key)}&type=sram&token=${encodeURIComponent(token)}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (loadRes.ok) {
                const buf = await loadRes.arrayBuffer();
                const sramObj = (cType === "nds" || cType === "psp") ? new Uint8Array(buf) : new Blob([buf], { type: "application/octet-stream" });
                await this.saveSramDB(key, sramObj, rMeta.sram_date || rMeta.date, true, rSramTime);
                importedCount++;
              }
            } catch (dlErr) {
              console.warn("[RetroVault Cloud] Erreur rapatriement SRAM " + key, dlErr);
            }
          }

          // Rapatriement State instantané
          const remoteHasState = !!rMeta.has_state;
          const rStateTime = rMeta.state_timestamp || 0;
          const lStateTime = lSave.stateTimestamp || 0;

          if (remoteHasState && (!lSave.state || rStateTime > lStateTime)) {
            try {
              const loadRes = await fetch(`api/saves.php?action=load&game=${encodeURIComponent(key)}&type=state&token=${encodeURIComponent(token)}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (loadRes.ok) {
                const buf = await loadRes.arrayBuffer();
                const stateObj = (cType === "nds" || cType === "psp") ? new Uint8Array(buf) : new Blob([buf], { type: "application/octet-stream" });
                await this.saveStateDB(key, stateObj, rMeta.state_date || rMeta.date, true, rStateTime);
                importedCount++;
              }
            } catch (dlErr) {
              console.warn("[RetroVault Cloud] Erreur rapatriement State " + key, dlErr);
            }
          }
        }

        // 3. Local -> VPS : téléverser les sauvegardes locales si absentes du VPS ou plus récentes
        for (const [key, lSave] of Object.entries(localSaves)) {
          const rMeta = remoteSaves[key];

          // Upload SRAM local si plus récent
          if (lSave.sram) {
            const lSramTime = lSave.sramTimestamp || (lSave.timestamp || 0);
            const rSramTime = (rMeta && (rMeta.sram_timestamp || (!rMeta.has_state ? rMeta.timestamp : 0))) || 0;
            if (!rMeta || !rMeta.has_sram || lSramTime > rSramTime) {
              try {
                await this.uploadSaveToVPS(key, lSave.sram, lSave.sramDate || lSave.date, lSramTime, true, "sram");
                exportedCount++;
              } catch (upErr) {
                console.warn("[RetroVault Cloud] Erreur envoi SRAM " + key, upErr);
              }
            }
          }

          // Upload State local si plus récent
          if (lSave.state) {
            const lStateTime = lSave.stateTimestamp || 0;
            const rStateTime = (rMeta && rMeta.state_timestamp) || 0;
            if (lStateTime > 0 && (!rMeta || !rMeta.has_state || lStateTime > rStateTime)) {
              try {
                await this.uploadSaveToVPS(key, lSave.state, lSave.stateDate || lSave.date, lStateTime, true, "state");
                exportedCount++;
              } catch (upErr) {
                console.warn("[RetroVault Cloud] Erreur envoi State " + key, upErr);
              }
            }
          }
        }

        const nowStr = new Date().toLocaleString();
        localStorage.setItem("rv_vps_last_sync", nowStr);
        this.rendreGrille();

        if (status) {
          const totalReliques = Object.keys(remoteSaves).length + exportedCount;
          status.textContent = `☁️ Sanctuaire synchronisé (${totalReliques} reliques souveraines) !`;
          status.style.color = "#34d399";
        }
      } catch (err) {
        console.warn("[RetroVault Cloud] Erreur synchronisation VPS:", err);
        if (!silent && status) {
          status.textContent = `⚠️ Erreur Cloud VPS : ${err.message}`;
          status.style.color = "#fbbf24";
        }
      } finally {
        this.cloudSyncing = false;
      }
    }

    async uploadSaveToVPS(nomFichier, saveObj, dateStr, timestamp = Date.now(), silent = false, saveType = "state") {
      const token = this.getCloudToken();
      if (!token) return;

      try {
        let bodyData = null;
        if (saveObj instanceof Blob) {
          bodyData = saveObj;
        } else if (saveObj instanceof Uint8Array || saveObj instanceof ArrayBuffer) {
          bodyData = saveObj;
        } else if (Array.isArray(saveObj)) {
          bodyData = new Uint8Array(saveObj);
        } else {
          return;
        }

        const res = await fetch(`api/saves.php?action=save&token=${encodeURIComponent(token)}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Game-Name": encodeURIComponent(nomFichier),
            "X-Save-Type": saveType,
            "X-Save-Timestamp": String(timestamp),
            "Content-Type": "application/octet-stream"
          },
          body: bodyData
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || ("Code " + res.status));
        }

        const nowStr = new Date().toLocaleString();
        localStorage.setItem("rv_vps_last_sync", nowStr);
        if (!silent) {
          const status = document.getElementById("rv-status");
          if (status) {
            const typeLabel = saveType === "sram" ? "Carte mémoire" : "Sauvegarde rapide";
            status.textContent = `☁️ ${typeLabel} synchronisée sur le VPS (${new Date().toLocaleTimeString()})`;
            status.style.color = "#34d399";
          }
        }
      } catch (err) {
        console.warn("[RetroVault Cloud] Erreur téléversement:", err);
      }
    }

    async verifierSauvegardeDistante(nomFichier) {
      const token = this.getCloudToken();
      if (!token) return;
      try {
        const listRes = await fetch(`api/saves.php?action=list&token=${encodeURIComponent(token)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!listRes.ok) return;
        const listData = await listRes.json();
        const rMeta = listData?.saves?.[nomFichier];
        if (!rMeta) return;

        const lSave = (await this.loadStateDB(nomFichier)) || {};
        const cType = this.identifierConsole(nomFichier);
        let updated = false;

        // 1. Rapatrier SRAM distante si plus récente
        const remoteHasSram = !!rMeta.has_sram || (!rMeta.has_state && !!rMeta.timestamp);
        const rSramTime = rMeta.sram_timestamp || (!rMeta.has_state ? rMeta.timestamp : 0);
        const lSramTime = lSave.sramTimestamp || (lSave.sram ? (lSave.timestamp || 0) : 0);

        if (remoteHasSram && (!lSave.sram || rSramTime > lSramTime)) {
          const loadRes = await fetch(`api/saves.php?action=load&game=${encodeURIComponent(nomFichier)}&type=sram&token=${encodeURIComponent(token)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (loadRes.ok) {
            const buf = await loadRes.arrayBuffer();
            const sramObj = (cType === "nds" || cType === "psp") ? new Uint8Array(buf) : new Blob([buf], { type: "application/octet-stream" });
            await this.saveSramDB(nomFichier, sramObj, rMeta.sram_date || rMeta.date, true, rSramTime);
            updated = true;
          }
        }

        // 2. Rapatrier State distante si plus récente
        const remoteHasState = !!rMeta.has_state;
        const rStateTime = rMeta.state_timestamp || 0;
        const lStateTime = lSave.stateTimestamp || 0;

        if (remoteHasState && (!lSave.state || rStateTime > lStateTime)) {
          const loadRes = await fetch(`api/saves.php?action=load&game=${encodeURIComponent(nomFichier)}&type=state&token=${encodeURIComponent(token)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (loadRes.ok) {
            const buf = await loadRes.arrayBuffer();
            const stateObj = (cType === "nds" || cType === "psp") ? new Uint8Array(buf) : new Blob([buf], { type: "application/octet-stream" });
            await this.saveStateDB(nomFichier, stateObj, rMeta.state_date || rMeta.date, true, rStateTime);
            updated = true;
          }
        }

        if (updated) {
          this.setStatus(`☁️ Sauvegarde VPS restaurée (${rMeta.date}) !`, "#34d399");
          this.rendreGrille();
        }
      } catch (e) {
        console.warn("[RetroVault Cloud] Erreur vérification distante:", e);
      }
    }

    disconnectVPSCloud() {
      localStorage.removeItem("rv_vps_token");
      localStorage.removeItem("rv_vps_user");
      localStorage.removeItem("rv_vps_last_sync");
      localStorage.removeItem("rv_cached_library");
      localStorage.removeItem("rv_cloud_token");
      localStorage.removeItem("rv_cloud_gist_id");
      localStorage.removeItem("rv_cloud_user");

      this.tousLesJeux = [];
      this.mettreAJourInterfaceCompte();
      this.rendreGrille();
      if (!this.partieEnCours) {
        this.afficherEcranHub();
      }

      const status = document.getElementById("rv-status");
      if (status) {
        status.textContent = "🔌 Déconnecté. Mode invité actif.";
        status.style.color = "#a8b8ad";
      }
    }

    // Compatibilité rétroactive
    syncCloudSaves(opts) { return this.syncVPSCloud(opts); }
    disconnectCloud() { return this.disconnectVPSCloud(); }

    openCloudArchivistModal() {
      let modal = document.getElementById("rv-cloud-modal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "rv-cloud-modal";
        document.body.appendChild(modal);
      }

      const isConnected = this.isCloudConnected();
      const user = localStorage.getItem("rv_vps_user") || "Hibouxe";
      const lastSync = localStorage.getItem("rv_vps_last_sync") || "Jamais";

      modal.innerHTML = `
        <div class="rv-cloud-backdrop" id="rv-cloud-backdrop"></div>
        <div class="rv-cloud-dialog">
          <div class="rv-cloud-header">
            <div class="rv-cloud-title-wrap">
              <span class="rv-cloud-sigil">🦉</span>
              <div>
                <h3 class="rv-cloud-title">${isConnected ? "Mon Compte" : "Authentification"}</h3>
                <div class="rv-cloud-subtitle">${isConnected ? "Gestion des Sauvegardes Cloud" : "Accès Privé"}</div>
              </div>
            </div>
            <button class="rv-cloud-close" id="rv-cloud-close-btn" title="Fermer">✖</button>
          </div>

          <div class="rv-cloud-body">
            ${isConnected ? `
              <div class="rv-cloud-status-box active">
                <div class="rv-cloud-status-icon">🟢</div>
                <div>
                  <div style="font-weight: 600; color: #34d399;">Sanctuaire Relié au VPS Souverain</div>
                  <div style="font-size: 0.8rem; color: #a8b8ad; margin-top: 2px;">
                    Compte : <strong style="color: #d4af37;">${user}</strong> | Serveur : <code>quentinbeaud.com</code>
                  </div>
                  <div style="font-size: 0.76rem; color: #778; margin-top: 2px;">
                    Dernière synchronisation : ${lastSync}
                  </div>
                </div>
              </div>

              <div style="margin-top: 14px;">
                <div style="font-size: 0.78rem; color: #d4af37; margin-bottom: 6px; font-weight: 600;">
                  📦 Sauvegardes archivées sur le VPS :
                </div>
                <div id="rv-cloud-saves-list" style="max-height: 160px; overflow-y: auto; background: #050a07; border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 4px; padding: 8px 12px; font-size: 0.78rem; color: #c4d4c8;">
                  <div style="color: #a8b8ad; text-align: center; padding: 6px;">⏳ Consultation du coffre fort...</div>
                </div>
              </div>

              <p style="font-size: 0.82rem; color: #a8b8ad; line-height: 1.4; margin: 12px 0 16px;">
                Vos sauvegardes (NDS, PS1, GBA, SNES...) sont transférées directement sur votre volume Docker sécurisé.
              </p>

              <div class="rv-cloud-actions">
                <button class="rv-btn rv-btn-gold" id="rv-cloud-btn-sync">🔄 Synchroniser Tout</button>
                <button class="rv-btn" id="rv-cloud-btn-disconnect" style="color: #f87171; border-color: rgba(248, 113, 113, 0.4);">🔌 Se déconnecter</button>
              </div>
            ` : `
              <p style="font-size: 0.86rem; color: #c4d4c8; line-height: 1.5; margin-bottom: 16px;">
                Veuillez vous authentifier pour déverrouiller vos archives personnelles et synchroniser vos sauvegardes.
              </p>

              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 0.78rem; color: #d4af37; margin-bottom: 5px;">
                  Identifiant :
                </label>
                <input type="text" id="rv-cloud-user-input" placeholder="Identifiant" class="rv-cloud-input" autocomplete="username">
              </div>

              <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 0.78rem; color: #d4af37; margin-bottom: 5px;">
                  Mot de passe :
                </label>
                <input type="password" id="rv-cloud-pass-input" placeholder="••••••••••••" class="rv-cloud-input" autocomplete="current-password">
              </div>

              <div class="rv-cloud-actions">
                <button class="rv-btn rv-btn-gold" id="rv-cloud-btn-connect">🔮 Se connecter</button>
              </div>
            `}

            <div id="rv-cloud-feedback" style="margin-top: 14px; font-size: 0.84rem; min-height: 20px;"></div>
          </div>
        </div>
      `;

      modal.style.display = "flex";

      if (!document.getElementById("rv-cloud-modal-styles")) {
        const s = document.createElement("style");
        s.id = "rv-cloud-modal-styles";
        s.textContent = `
          #rv-cloud-modal {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: 10000000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            box-sizing: border-box;
            font-family: var(--font-body, 'Outfit', sans-serif);
          }
          .rv-cloud-backdrop {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(3, 8, 5, 0.85);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }
          .rv-cloud-dialog {
            position: relative;
            background: #09130d;
            border: 1px solid rgba(212, 175, 55, 0.45);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.95), 0 0 40px rgba(52, 211, 153, 0.15);
            border-radius: 6px;
            width: 100%;
            max-width: 520px;
            padding: 22px 24px;
            color: #f0f4f1;
            box-sizing: border-box;
            animation: rvCloudPop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          @keyframes rvCloudPop {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .rv-cloud-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(212, 175, 55, 0.25);
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .rv-cloud-title-wrap {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .rv-cloud-sigil {
            font-size: 1.8rem;
            filter: drop-shadow(0 0 10px rgba(212, 175, 55, 0.6));
          }
          .rv-cloud-title {
            font-family: var(--font-heading, 'Cinzel', serif);
            font-size: 1.2rem;
            font-weight: 700;
            color: #d4af37;
            margin: 0;
            letter-spacing: 1px;
          }
          .rv-cloud-subtitle {
            font-size: 0.78rem;
            color: #a8b8ad;
          }
          .rv-cloud-close {
            background: none;
            border: none;
            color: #d4af37;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 4px 8px;
            transition: transform 0.15s;
          }
          .rv-cloud-close:hover {
            transform: scale(1.2);
            color: #f0f4f1;
          }
          .rv-cloud-status-box {
            display: flex;
            align-items: center;
            gap: 12px;
            background: #0e1d14;
            border: 1px solid rgba(52, 211, 153, 0.4);
            border-radius: 4px;
            padding: 10px 14px;
          }
          .rv-cloud-status-icon {
            font-size: 1.4rem;
          }
          .rv-cloud-input {
            width: 100%;
            background: #050a07;
            border: 1px solid rgba(212, 175, 55, 0.35);
            color: #f0f4f1;
            padding: 10px 12px;
            border-radius: 4px;
            font-size: 0.9rem;
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.2s;
          }
          .rv-cloud-input:focus {
            border-color: #d4af37;
            box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
          }
          .rv-cloud-actions {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
          }
          .rv-btn-gold {
            background: linear-gradient(135deg, #d4af37 0%, #b8972f 100%) !important;
            color: #050a07 !important;
            font-weight: 700 !important;
            border: none !important;
            box-shadow: 0 4px 14px rgba(212, 175, 55, 0.35) !important;
          }
          .rv-btn-gold:hover {
            transform: translateY(-1px) !important;
            box-shadow: 0 6px 18px rgba(212, 175, 55, 0.5) !important;
          }
          .rv-cloud-save-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
            border-bottom: 1px solid rgba(212, 175, 55, 0.1);
          }
          .rv-cloud-save-item:last-child { border-bottom: none; }
        `;
        document.head.appendChild(s);
      }

      const close = () => { modal.style.display = "none"; };
      document.getElementById("rv-cloud-close-btn").onclick = close;
      document.getElementById("rv-cloud-backdrop").onclick = close;

      const feedback = document.getElementById("rv-cloud-feedback");

      // Charger l'inventaire des sauvegardes si connecté
      if (isConnected) {
        const token = this.getCloudToken();
        const listContainer = document.getElementById("rv-cloud-saves-list");
        fetch(`api/saves.php?action=list&token=${encodeURIComponent(token)}`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.json())
          .then((data) => {
            if (!listContainer) return;
            const saves = data?.saves || {};
            const keys = Object.keys(saves);
            if (keys.length === 0) {
              listContainer.innerHTML = '<div style="color: #a8b8ad; text-align: center; padding: 6px;">Aucune sauvegarde sur le VPS. Lancez une partie pour inaugurer le Cloud !</div>';
            } else {
              listContainer.innerHTML = keys.map((k) => {
                const s = saves[k];
                const sizeKb = s.size ? (s.size > 1048576 ? (s.size / 1048576).toFixed(1) + ' Mo' : Math.round(s.size / 1024) + ' Ko') : '';
                return `
                  <div class="rv-cloud-save-item">
                    <span style="font-weight: 500; color: #f0f4f1;">🎮 ${s.game || k}</span>
                    <span style="color: #a8b8ad; font-size: 0.74rem;">${sizeKb} • ${s.date || ''}</span>
                  </div>
                `;
              }).join('');
            }
          })
          .catch(() => {
            if (listContainer) listContainer.innerHTML = '<div style="color: #f87171; text-align: center;">Erreur lecture inventaire.</div>';
          });
      }

      const btnConnect = document.getElementById("rv-cloud-btn-connect");
      if (btnConnect) {
        const passInp = document.getElementById("rv-cloud-pass-input");
        const doConnect = async () => {
          const userInp = document.getElementById("rv-cloud-user-input");
          const uVal = (userInp ? userInp.value : "").trim();
          const pVal = passInp ? passInp.value : "";
          if (!pVal) {
            feedback.textContent = "⚠️ Veuillez renseigner le mot de passe.";
            feedback.style.color = "#fbbf24";
            return;
          }
          btnConnect.disabled = true;
          btnConnect.textContent = "⏳ Connexion...";
          feedback.textContent = "Vérification des identifiants...";
          feedback.style.color = "#d4af37";
          try {
            const res = await this.connectVPSCloud(uVal, pVal);
            feedback.textContent = `✅ Connexion réussie ! Bienvenue ${res.user}.`;
            feedback.style.color = "#34d399";
            setTimeout(() => this.openCloudArchivistModal(), 1200);
          } catch (err) {
            feedback.textContent = `❌ ${err.message}`;
            feedback.style.color = "#ef4444";
            btnConnect.disabled = false;
            btnConnect.textContent = "🔮 Se connecter";
          }
        };

        btnConnect.onclick = doConnect;
        if (passInp) {
          passInp.addEventListener("keydown", (e) => {
            if (e.key === "Enter") doConnect();
          });
        }
      }

      const btnSync = document.getElementById("rv-cloud-btn-sync");
      if (btnSync) {
        btnSync.onclick = async () => {
          btnSync.disabled = true;
          btnSync.textContent = "⏳ Synchronisation...";
          feedback.textContent = "Synchronisation bidirectionnelle en cours...";
          feedback.style.color = "#d4af37";
          try {
            await this.syncVPSCloud({ silent: false });
            feedback.textContent = "✅ Synchronisation réussie avec le VPS Souverain !";
            feedback.style.color = "#34d399";
            setTimeout(() => this.openCloudArchivistModal(), 1000);
          } catch (err) {
            feedback.textContent = `❌ Erreur : ${err.message}`;
            feedback.style.color = "#ef4444";
          } finally {
            btnSync.disabled = false;
            btnSync.textContent = "🔄 Synchroniser Tout";
          }
        };
      }

      const btnDisconnect = document.getElementById("rv-cloud-btn-disconnect");
      if (btnDisconnect) {
        btnDisconnect.onclick = () => {
          if (confirm("Rompre le Sceau d'Archiviste sur cet appareil ? Vos sauvegardes locales resteront intactes.")) {
            this.disconnectVPSCloud();
            this.openCloudArchivistModal();
          }
        };
      }
    }

    // --- GESTION DES OPTIONS DU SANCTUAIRE (Vitesse, Cheats, FPS, Plein Écran) ---
    openOptionsModal() {
      let modal = document.getElementById("rv-options-modal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "rv-options-modal";
        document.body.appendChild(modal);
      }

      const nomJeu = this.jeuEnCoursNom || "";
      const cType = nomJeu ? this.identifierConsole(nomJeu) : "";
      const cheats = nomJeu ? this.obtenirCheatsPourJeu(nomJeu) : [];
      const speeds = [0.5, 1.0, 1.5, 2.0, 4.0];

      modal.innerHTML = `
        <div class="rv-opt-backdrop" id="rv-opt-backdrop"></div>
        <div class="rv-opt-dialog">
          <div class="rv-opt-header">
            <div class="rv-opt-title-wrap">
              <span class="rv-opt-sigil">⚙️</span>
              <div>
                <h3 class="rv-opt-title">Grimoire des Options</h3>
                <div style="font-size: 0.78rem; color: #a8b8ad;">Configuration d'émulation & Sortilèges</div>
              </div>
            </div>
            <button class="rv-opt-close" id="rv-opt-close-btn" title="Fermer les options">✕</button>
          </div>

          <!-- Section 1 : Vitesse de Jeu -->
          <div class="rv-opt-section">
            <div class="rv-opt-section-title">⚡ Vitesse d'Émulation</div>
            <div class="rv-opt-speed-grid">
              ${speeds.map(s => `
                <button class="rv-opt-speed-btn ${this.vitesseActuelle === s ? 'active' : ''}" data-speed="${s}">
                  ${s === 0.5 ? '0.5x' : s === 1.0 ? '1.0x Normal' : s === 2.0 ? '2.0x Turbo' : `${s}x`}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Section 2 : Performance & Fluidité (FPS) -->
          <div class="rv-opt-section">
            <div class="rv-opt-section-title">📊 Performance & Affichage</div>
            <label class="rv-opt-check-row">
              <input type="checkbox" id="rv-opt-check-fps" ${this.afficherPerfFps ? 'checked' : ''}>
              <span class="rv-opt-check-label">
                Afficher le compteur FPS & temps de trame (HUD en direct)
                <span class="rv-opt-check-sub">Incrustation discrète : vert si 60 FPS stable, ambre si saccades.</span>
              </span>
            </label>
          </div>

          <!-- Section 3 : Mobile & Immersion -->
          <div class="rv-opt-section">
            <div class="rv-opt-section-title">📱 Immersion Mobile (Mode Paysage)</div>
            <label class="rv-opt-check-row">
              <input type="checkbox" id="rv-opt-check-auto-landscape" ${this.autoFullscreenPaysage ? 'checked' : ''}>
              <span class="rv-opt-check-label">
                Plein écran automatique dès rotation en mode paysage
                <span class="rv-opt-check-sub">Adapte instantanément les boutons latéraux et l'écran à l'horizontale.</span>
              </span>
            </label>
          </div>

          <!-- Section 4 : Codes de Triche / Sortilèges -->
          <div class="rv-opt-section">
            <div class="rv-opt-section-title">🔮 Sortilèges & Codes de Triche (Cheats)</div>
            ${!nomJeu ? `
              <div style="font-size: 0.8rem; color: #a8b8ad; font-style: italic; text-align: center; padding: 12px 0;">
                🦉 Lancez une relique dans le sanctuaire pour afficher ou configurer ses sortilèges.
              </div>
            ` : cType === 'nds' ? `
              <div style="font-size: 0.8rem; color: #d4af37; padding: 6px 0; line-height: 1.4;">
                🎮 <strong>${nomJeu}</strong> (Nintendo DS DeSmuME)
                <div style="color: #a8b8ad; font-size: 0.74rem; margin-top: 4px;">
                  La vitesse de jeu (0.5x à 4x) et le compteur de FPS sont actifs pour cette console.
                </div>
              </div>
            ` : `
              <div style="margin-bottom: 8px; font-size: 0.78rem; color: #d4af37; font-weight: 600;">
                Relique active : <span style="color: #34d399;">${nomJeu}</span>
              </div>
              <div id="rv-opt-cheats-list" style="max-height: 180px; overflow-y: auto;">
                ${cheats.length === 0 ? `
                  <div style="font-size: 0.78rem; color: #a8b8ad; font-style: italic; padding: 6px 0;">
                    Aucun sortilège pour l'instant. Ajoutez-en un ci-dessous !
                  </div>
                ` : cheats.map((c, idx) => `
                  <div class="rv-opt-cheat-item">
                    <input type="checkbox" class="rv-opt-cheat-check" data-idx="${idx}" ${c.enabled ? 'checked' : ''}>
                    <div class="rv-opt-cheat-info">
                      <div class="rv-opt-cheat-name">${c.description || c.desc || 'Sortilège'}</div>
                      <div class="rv-opt-cheat-code">${c.code}</div>
                    </div>
                    ${c.isCustom ? `<button class="rv-opt-cheat-del" data-idx="${idx}" title="Supprimer ce sortilège">🗑️</button>` : ''}
                  </div>
                `).join('')}
              </div>

              <!-- Formulaire d'ajout de cheat code -->
              <div class="rv-opt-add-box">
                <div style="font-size: 0.76rem; color: #d4af37; font-weight: 600;">➕ Invoquer un nouveau sortilège personnalisé :</div>
                <input type="text" id="rv-opt-new-cheat-desc" placeholder="Nom (ex: Vies Infinies, Argent Max...)" class="rv-opt-input">
                <input type="text" id="rv-opt-new-cheat-code" placeholder="Code (ex: 02025840 00010001 ou SLXPLOVS)" class="rv-opt-input" style="font-family: monospace;">
                <button class="rv-btn rv-btn-gold" id="rv-opt-btn-add-cheat" style="font-size: 0.78rem; padding: 6px 12px; margin-top: 4px;">✨ Activer le Sortilège</button>
              </div>
              <div id="rv-opt-cheat-feedback" style="font-size: 0.76rem; margin-top: 6px; min-height: 16px;"></div>
            `}
          </div>
        </div>
      `;

      const close = () => {
        if (modal) modal.remove();
      };
      document.getElementById("rv-opt-close-btn")?.addEventListener("click", close);
      document.getElementById("rv-opt-backdrop")?.addEventListener("click", close);

      // Gestion des vitesses
      modal.querySelectorAll(".rv-opt-speed-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const spd = parseFloat(e.currentTarget.getAttribute("data-speed"));
          this.changerVitesse(spd);
          modal.querySelectorAll(".rv-opt-speed-btn").forEach(b => b.classList.remove("active"));
          e.currentTarget.classList.add("active");
        });
      });

      // Gestion de la case à cocher FPS
      const chkFps = document.getElementById("rv-opt-check-fps");
      if (chkFps) {
        chkFps.addEventListener("change", (e) => {
          this.togglePerfFps(e.target.checked);
        });
      }

      // Gestion de la case à cocher Paysage Auto
      const chkLandscape = document.getElementById("rv-opt-check-auto-landscape");
      if (chkLandscape) {
        chkLandscape.addEventListener("change", (e) => {
          this.autoFullscreenPaysage = e.target.checked;
          try {
            localStorage.setItem("rv_auto_landscape_fs", this.autoFullscreenPaysage ? "true" : "false");
          } catch (err) {}
        });
      }

      // Gestion des checkboxes cheats
      modal.querySelectorAll(".rv-opt-cheat-check").forEach(chk => {
        chk.addEventListener("change", (e) => {
          const idx = parseInt(e.target.getAttribute("data-idx"), 10);
          this.toggleCheat(nomJeu, idx, e.target.checked);
          const fb = document.getElementById("rv-opt-cheat-feedback");
          if (fb) {
            fb.textContent = e.target.checked ? "✨ Sortilège activé dans le jeu !" : "⚪ Sortilège désactivé.";
            fb.style.color = e.target.checked ? "#34d399" : "#a8b8ad";
          }
        });
      });

      // Gestion de suppression de cheat custom
      modal.querySelectorAll(".rv-opt-cheat-del").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(e.currentTarget.getAttribute("data-idx"), 10);
          this.supprimerCheatCustom(nomJeu, idx);
          this.openOptionsModal();
        });
      });

      // Ajout d'un nouveau cheat
      const btnAddCheat = document.getElementById("rv-opt-btn-add-cheat");
      if (btnAddCheat) {
        btnAddCheat.addEventListener("click", () => {
          const descInput = document.getElementById("rv-opt-new-cheat-desc");
          const codeInput = document.getElementById("rv-opt-new-cheat-code");
          const desc = (descInput?.value || "").trim();
          const code = (codeInput?.value || "").trim();
          const fb = document.getElementById("rv-opt-cheat-feedback");

          if (!code) {
            if (fb) {
              fb.textContent = "❌ Veuillez saisir au moins un code de triche.";
              fb.style.color = "#ef4444";
            }
            return;
          }

          this.ajouterCheatCustom(nomJeu, desc || "Sortilège Personnalisé", code);
          this.openOptionsModal();
        });
      }
    }

    closeOptionsModal() {
      const modal = document.getElementById("rv-options-modal");
      if (modal) modal.remove();
    }

    changerVitesse(nouvelleVitesse) {
      const spd = parseFloat(nouvelleVitesse) || 1.0;
      this.vitesseActuelle = spd;

      const speedBtn = document.getElementById("rv-btn-speed");
      if (speedBtn) {
        speedBtn.textContent = `⚡ ${spd}x`;
        speedBtn.title = `Vitesse actuelle : ${spd}x (Cliquez pour accélérer)`;
        if (spd > 1) speedBtn.classList.add("rv-btn-active-speed");
        else speedBtn.classList.remove("rv-btn-active-speed");
      }
      const landSpeedBtn = document.getElementById("rv-land-btn-speed");
      if (landSpeedBtn) {
        landSpeedBtn.textContent = `⚡ ${spd}x`;
        if (spd > 1) landSpeedBtn.classList.add("rv-btn-active-speed");
        else landSpeedBtn.classList.remove("rv-btn-active-speed");
      }

      if (this.jeuEnCoursType === "nds" || this.jeuEnCoursType === "psp") {
        const frame = document.getElementById(this.jeuEnCoursType === "nds" ? "rv-nds-frame" : "rv-psp-frame");
        if (frame && frame.contentWindow) {
          try {
            frame.contentWindow.postMessage({
              type: "SET_SPEED",
              speed: spd
            }, "*");
          } catch (e) {}
        }
        return;
      }

      if (this.partieEnCours && typeof this.partieEnCours.sendCommand === "function") {
        try {
          if (spd > 1 && !this.isFastForward) {
            this.partieEnCours.sendCommand("FAST_FORWARD");
            this.isFastForward = true;
          } else if (spd <= 1 && this.isFastForward) {
            this.partieEnCours.sendCommand("FAST_FORWARD");
            this.isFastForward = false;
          }
        } catch (e) {}
      }
    }

    toggleVitesseRapide() {
      const vitesses = [1.0, 1.5, 2.0, 4.0];
      const idx = vitesses.indexOf(this.vitesseActuelle);
      const nextIdx = (idx + 1) % vitesses.length;
      this.changerVitesse(vitesses[nextIdx]);
    }

    togglePerfFps(forceState = null) {
      this.afficherPerfFps = forceState !== null ? !!forceState : !this.afficherPerfFps;
      try {
        localStorage.setItem("rv_show_fps", this.afficherPerfFps ? "true" : "false");
      } catch (e) {}

      const btn = document.getElementById("rv-btn-fps");
      if (btn) {
        btn.textContent = `📊 FPS : ${this.afficherPerfFps ? "ON" : "OFF"}`;
        if (this.afficherPerfFps) btn.classList.add("rv-btn-active-fps");
        else btn.classList.remove("rv-btn-active-fps");
      }
      const landFpsBtn = document.getElementById("rv-land-btn-fps");
      if (landFpsBtn) {
        if (this.afficherPerfFps) landFpsBtn.classList.add("rv-btn-active-fps");
        else landFpsBtn.classList.remove("rv-btn-active-fps");
      }

      if (this.afficherPerfFps) {
        this.demarrerMesurePerf();
      } else {
        this.arreterMesurePerf();
      }
    }

    demarrerMesurePerf() {
      this.arreterMesurePerf();
      if (!this.afficherPerfFps) return;
      const hud = document.getElementById("rv-perf-hud");
      if (!hud) return;
      hud.classList.add("active");

      let lastTime = performance.now();
      let frames = 0;
      const dotEl = document.getElementById("rv-perf-dot");
      const textEl = document.getElementById("rv-perf-text");

      const loop = () => {
        frames++;
        const now = performance.now();
        const elapsed = now - lastTime;
        if (elapsed >= 500) {
          const fps = Math.round((frames * 1000) / elapsed);
          const ms = (1000 / Math.max(1, fps)).toFixed(1);
          if (textEl) textEl.textContent = `${fps} FPS | ${ms} ms`;
          if (dotEl) {
            if (fps >= 52) {
              dotEl.textContent = "🟢";
              hud.style.color = "#34d399";
              hud.style.borderColor = "rgba(52, 211, 153, 0.4)";
            } else if (fps >= 30) {
              dotEl.textContent = "🟡";
              hud.style.color = "#fbbf24";
              hud.style.borderColor = "rgba(251, 191, 36, 0.4)";
            } else {
              dotEl.textContent = "🔴";
              hud.style.color = "#f87171";
              hud.style.borderColor = "rgba(248, 113, 113, 0.4)";
            }
          }
          frames = 0;
          lastTime = now;
        }
        this.fpsAnimId = requestAnimationFrame(loop);
      };
      this.fpsAnimId = requestAnimationFrame(loop);
    }

    arreterMesurePerf() {
      if (this.fpsAnimId) {
        cancelAnimationFrame(this.fpsAnimId);
        this.fpsAnimId = null;
      }
      const hud = document.getElementById("rv-perf-hud");
      if (hud) hud.classList.remove("active");
    }

    obtenirCheatsPourJeu(nomFichier) {
      if (!nomFichier) return [];
      const nomLower = nomFichier.toLowerCase();
      let predefined = [];
      for (const [key, list] of Object.entries(PREDEFINED_CHEATS)) {
        if (nomLower.includes(key.toLowerCase()) || key.toLowerCase().includes(nomLower)) {
          predefined = list.map(c => ({ ...c, isCustom: false }));
          break;
        }
      }

      const custom = (this.cheatsLocaux && this.cheatsLocaux[nomFichier]) || [];
      const customList = custom.map(c => ({ ...c, isCustom: true }));
      const activeState = JSON.parse(localStorage.getItem(`rv_cheat_state_${nomFichier}`) || "{}");

      const all = [...predefined, ...customList];
      return all.map(c => ({
        ...c,
        enabled: activeState[c.code] !== undefined ? !!activeState[c.code] : (c.enabled || false)
      }));
    }

    obtenirCheatsActifsPourJeu(nomFichier) {
      const cheats = this.obtenirCheatsPourJeu(nomFichier);
      return cheats.filter(c => c.enabled);
    }

    toggleCheat(nomFichier, cheatIndex, isEnabled) {
      const cheats = this.obtenirCheatsPourJeu(nomFichier);
      if (!cheats[cheatIndex]) return;

      const targetCheat = cheats[cheatIndex];
      targetCheat.enabled = !!isEnabled;

      const activeState = JSON.parse(localStorage.getItem(`rv_cheat_state_${nomFichier}`) || "{}");
      activeState[targetCheat.code] = !!isEnabled;
      try {
        localStorage.setItem(`rv_cheat_state_${nomFichier}`, JSON.stringify(activeState));
      } catch (e) {}

      this.appliquerCheatsJeu(nomFichier);
    }

    ajouterCheatCustom(nomFichier, description, code) {
      if (!this.cheatsLocaux) this.cheatsLocaux = {};
      if (!this.cheatsLocaux[nomFichier]) this.cheatsLocaux[nomFichier] = [];

      this.cheatsLocaux[nomFichier].push({
        description,
        code,
        enabled: true
      });

      try {
        localStorage.setItem("rv_custom_cheats", JSON.stringify(this.cheatsLocaux));
        const activeState = JSON.parse(localStorage.getItem(`rv_cheat_state_${nomFichier}`) || "{}");
        activeState[code] = true;
        localStorage.setItem(`rv_cheat_state_${nomFichier}`, JSON.stringify(activeState));
      } catch (e) {}

      this.appliquerCheatsJeu(nomFichier);
    }

    supprimerCheatCustom(nomFichier, cheatIndex) {
      const allCheats = this.obtenirCheatsPourJeu(nomFichier);
      const target = allCheats[cheatIndex];
      if (!target || !target.isCustom) return;

      if (this.cheatsLocaux && this.cheatsLocaux[nomFichier]) {
        this.cheatsLocaux[nomFichier] = this.cheatsLocaux[nomFichier].filter(c => c.code !== target.code);
        try {
          localStorage.setItem("rv_custom_cheats", JSON.stringify(this.cheatsLocaux));
        } catch (e) {}
      }

      this.appliquerCheatsJeu(nomFichier);
    }

    appliquerCheatsJeu(nomFichier) {
      if (!this.partieEnCours) return;
      const activeCheats = this.obtenirCheatsActifsPourJeu(nomFichier);

      if (typeof this.partieEnCours.setCheats === "function") {
        try {
          this.partieEnCours.setCheats(activeCheats.map(c => ({
            code: c.code,
            description: c.description || c.desc || "",
            enabled: true
          })));
        } catch (e) {
          console.warn("[RetroVault] Erreur setCheats:", e);
        }
      }
    }

    // --- Détection console par extension ---
    identifierConsole(nom) {
      if (this.tousLesJeux && Array.isArray(this.tousLesJeux)) {
        const found = this.tousLesJeux.find(j => j.nom === nom);
        if (found && found.console) return found.console;
      }
      const ext = nom.split(".").pop().toLowerCase();
      if (["nds"].includes(ext) || nom.includes("console-nds-launcher")) return "nds";
      if (["cso"].includes(ext) || nom.includes("console-psp-launcher") || /locoroco/i.test(nom)) return "psp";
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

        /* Contrôle du Volume Sanctuaire */
        .rv-vol-wrap {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0e1d14;
          border: 1px solid rgba(212, 175, 55, 0.45);
          border-radius: 4px;
          padding: 3px 8px;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .rv-vol-wrap:hover, .rv-vol-wrap:focus-within {
          border-color: #d4af37;
          background: #14281c;
        }
        .rv-vol-btn {
          background: none !important;
          border: none !important;
          color: #d4af37 !important;
          font-size: 0.88rem !important;
          padding: 0 2px !important;
          cursor: pointer;
          display: flex;
          align-items: center;
          line-height: 1;
          box-shadow: none !important;
          transform: none !important;
        }
        .rv-vol-btn:hover {
          filter: brightness(1.2);
        }
        .rv-vol-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 65px;
          height: 4px;
          border-radius: 2px;
          background: rgba(212, 175, 55, 0.3);
          outline: none;
          cursor: pointer;
        }
        .rv-vol-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #d4af37;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(212, 175, 55, 0.6);
        }
        .rv-vol-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #d4af37;
          border: none;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(212, 175, 55, 0.6);
        }
        .rv-vol-val {
          font-size: 0.74rem;
          font-weight: 700;
          color: #d4af37;
          min-width: 28px;
        }

        /* Badge Manette Physique Connectée */
        .rv-gp-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #0e1d14;
          border: 1px solid rgba(212, 175, 55, 0.35);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 0.74rem;
          font-weight: 600;
          color: #a8b8ad;
          transition: all 0.2s ease;
        }
        .rv-gp-badge.connected {
          border-color: rgba(52, 211, 153, 0.65);
          color: #34d399;
          background: #0d2218;
          box-shadow: 0 0 10px rgba(52, 211, 153, 0.3);
        }
        .rv-gp-icon {
          font-size: 0.85rem;
        }

        /* ========================================================
           ZONE DE JEU UNIFIÉE & AILES LATÉRALES (MOBILE FIRST)
           ======================================================== */
        .rv-play-zone {
          display: grid;
          grid-template-areas:
            "screen screen"
            "wing-left wing-right";
          grid-template-columns: 1fr 1fr;
          width: 100%;
          max-width: 780px;
          margin: 0 auto 14px;
          gap: 12px;
          align-items: start;
        }
        .rv-play-zone.force-hidden-wings .rv-wing {
          display: none !important;
        }
        .rv-play-zone.force-hidden-wings {
          grid-template-areas: "screen" !important;
          grid-template-columns: 1fr !important;
        }

        .rv-center-stage {
          grid-area: screen;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .rv-wing {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #09130d;
          border: 1px solid rgba(212, 175, 55, 0.35);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          padding: 12px 14px;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          gap: 10px;
          box-sizing: border-box;
        }
        .rv-wing-left {
          grid-area: wing-left;
        }
        .rv-wing-right {
          grid-area: wing-right;
        }

        .rv-wing-shoulder {
          width: 100%;
          display: flex;
          justify-content: center;
        }
        .rv-wing-center {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 125px;
        }
        .rv-wing-menu {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .rv-pad-shoulder {
          background: #14281c;
          border: 1px solid rgba(212, 175, 55, 0.35);
          color: #d4af37;
          font-family: var(--font-heading, 'Cinzel', serif);
          font-weight: 700;
          font-size: 0.95rem;
          padding: 8px 26px;
          border-radius: 4px;
          cursor: pointer;
          touch-action: none;
          transition: all 0.1s;
          user-select: none;
          -webkit-user-select: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }
        .rv-pad-shoulder:active, .rv-pad-shoulder.pressed {
          background: #d4af37 !important;
          color: #050a07 !important;
          transform: translateY(1px);
          box-shadow: 0 0 12px rgba(212, 175, 55, 0.6);
        }

        .rv-pad-pill {
          background: #0e1d14;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #a8b8ad;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 1px;
          padding: 6px 16px;
          border-radius: 14px;
          cursor: pointer;
          touch-action: none;
          transition: all 0.1s;
          user-select: none;
          -webkit-user-select: none;
        }
        .rv-pad-pill:active, .rv-pad-pill.pressed {
          background: #d4af37 !important;
          color: #050a07 !important;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
        }

        /* D-PAD DIRECTIONNEL (GAUCHE) */
        .rv-dpad {
          display: flex;
          flex-direction: column;
          align-items: center;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
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
        .rv-dpad-u { border-radius: 5px 5px 0 0; }
        .rv-dpad-d { border-radius: 0 0 5px 5px; }
        .rv-dpad-l { border-radius: 5px 0 0 5px; }
        .rv-dpad-r { border-radius: 0 5px 5px 0; }
        .rv-dpad-core {
          width: 50px;
          height: 50px;
          background: #0e1d14;
          border-top: 1px solid rgba(212, 175, 55, 0.1);
          border-bottom: 1px solid rgba(212, 175, 55, 0.1);
        }
        .rv-dpad-btn:active, .rv-dpad-btn.pressed {
          background: #d4af37 !important;
          color: #050a07 !important;
          box-shadow: 0 0 14px rgba(212, 175, 55, 0.7);
        }

        /* CLUSTER D'ACTIONS EN LOSANGE (DROITE) */
        .rv-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        .rv-act-mid {
          display: flex;
          align-items: center;
          gap: 24px;
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

        /* BARRE RAPIDE DISCRÈTE (PAYSAGE) */
        .rv-landscape-bar {
          display: none;
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
        .rv-lib-title-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }
        .rv-search-wrap {
          flex: 1;
          max-width: 380px;
        }
        .rv-search-input {
          width: 100%;
          background: #09130d;
          border: 1px solid rgba(212, 175, 55, 0.35);
          border-radius: 3px;
          color: #f0f4f1;
          padding: 8px 14px;
          font-size: 0.82rem;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .rv-search-input:focus {
          border-color: #d4af37;
          box-shadow: 0 0 12px rgba(212, 175, 55, 0.35);
          background: #0d1a12;
        }
        .rv-hub-standby {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 36px 20px;
          background: radial-gradient(circle at center, #102418 0%, #060e09 100%);
          width: 100%;
          min-height: 280px;
          box-sizing: border-box;
        }
        .rv-hub-crest {
          font-size: 3rem;
          margin-bottom: 10px;
          filter: drop-shadow(0 0 16px rgba(212, 175, 55, 0.6));
          animation: rvPulse 3.5s ease-in-out infinite;
        }
        @keyframes rvPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.08); opacity: 1; filter: drop-shadow(0 0 24px rgba(212, 175, 55, 0.95)); }
        }
        .rv-hub-title {
          font-family: var(--font-heading, 'Cinzel', serif);
          font-size: 1.35rem;
          font-weight: 700;
          color: #d4af37;
          letter-spacing: 2px;
          margin: 0 0 8px 0;
          text-transform: uppercase;
        }
        .rv-hub-desc {
          font-size: 0.88rem;
          color: #a8b8ad;
          max-width: 540px;
          margin: 0 0 16px 0;
          line-height: 1.5;
        }
        .rv-hub-badges {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .rv-hub-badge-item {
          font-size: 0.74rem;
          font-weight: 600;
          color: #34d399;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.35);
          padding: 4px 10px;
          border-radius: 3px;
          letter-spacing: 0.5px;
        }
        .rv-hub-actions {
          display: flex;
          justify-content: center;
          gap: 10px;
        }
        .rv-btn-hub-nav {
          background: #1e3a2b !important;
          border-color: #34d399 !important;
          color: #34d399 !important;
        }
        .rv-btn-hub-nav:hover {
          background: #34d399 !important;
          color: #060e09 !important;
        }
        .rv-btn-account {
          background: #14281c !important;
          border-color: #d4af37 !important;
          color: #d4af37 !important;
          font-weight: 600 !important;
        }
        .rv-btn-account:hover {
          background: #d4af37 !important;
          color: #060e09 !important;
        }
        .rv-btn-account-active {
          background: #0d281a !important;
          border-color: #34d399 !important;
          color: #34d399 !important;
        }
        .rv-btn-account-active:hover {
          background: #34d399 !important;
          color: #060e09 !important;
        }
        .rv-btn-gold {
          background: linear-gradient(135deg, #d4af37 0%, #b8972f 100%) !important;
          color: #050a07 !important;
          font-weight: 700 !important;
          border: none !important;
          box-shadow: 0 4px 14px rgba(212, 175, 55, 0.35) !important;
        }
        .rv-btn-gold:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 18px rgba(212, 175, 55, 0.5) !important;
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
        .rv-nds-wrapper {
          width: 100%;
          height: 100%;
          min-height: 200px;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #000;
        }
        .rv-embedded-frame {
          width: 100%;
          height: 560px;
          max-height: 75vh;
          border: none;
          display: block;
          background: #000;
        }
        #rv-game-container.rv-is-nds {
          width: 100%;
          max-width: 520px;
          height: 580px;
          max-height: 75vh;
          aspect-ratio: auto;
        }
        #rv-game-container.rv-is-psp {
          width: 100%;
          max-width: 920px;
          aspect-ratio: 16 / 9;
          height: auto;
          max-height: 80vh;
        }
        .rv-psp-wrapper {
          width: 100%;
          height: 100%;
          min-height: 200px;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #000;
        }
        #rv-game-container.rv-is-psp .rv-embedded-frame {
          width: 100%;
          height: 100%;
          max-height: 100%;
          aspect-ratio: 16 / 9;
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
           RESPONSIVE MOBILE FIRST & AILES LATÉRALES EN PAYSAGE
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

        /* MODE PAYSAGE SUR MOBILE / ÉCRANS RESTREINTS EN HAUTEUR */
        @media (orientation: landscape) and (max-height: 620px) {
          #retro-vault-modal {
            padding: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
            background: #050a07 !important;
          }
          .rv-container {
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: stretch !important;
          }
          .rv-header {
            display: none !important;
          }
          .rv-controls-guide, .rv-catalog-section, .rv-save-indicator {
            display: none !important;
          }
          .rv-play-zone {
            display: grid !important;
            grid-template-areas: "wing-left screen wing-right" !important;
            grid-template-columns: minmax(105px, 16vw) 1fr minmax(105px, 16vw) !important;
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            gap: 0 !important;
            position: fixed !important;
            inset: 0 !important;
            z-index: 1000000 !important;
            background: #050a07 !important;
            align-items: stretch !important;
            padding-left: max(6px, env(safe-area-inset-left, 0px)) !important;
            padding-right: max(6px, env(safe-area-inset-right, 0px)) !important;
            padding-top: max(4px, env(safe-area-inset-top, 0px)) !important;
            padding-bottom: max(6px, env(safe-area-inset-bottom, 0px)) !important;
            box-sizing: border-box !important;
          }

          /* FLANC GAUCHE (Landscape) */
          .rv-wing-left {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            align-items: center !important;
            height: 100% !important;
            max-height: 100% !important;
            background: linear-gradient(90deg, rgba(9, 19, 13, 0.98) 0%, rgba(5, 10, 7, 0.88) 100%) !important;
            border: none !important;
            border-right: 1px solid rgba(212, 175, 55, 0.25) !important;
            border-radius: 0 !important;
            padding: 8px 6px 12px !important;
            z-index: 20 !important;
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.8) !important;
            box-sizing: border-box !important;
          }
          /* FLANC DROIT (Landscape) */
          .rv-wing-right {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            align-items: center !important;
            height: 100% !important;
            max-height: 100% !important;
            background: linear-gradient(270deg, rgba(9, 19, 13, 0.98) 0%, rgba(5, 10, 7, 0.88) 100%) !important;
            border: none !important;
            border-left: 1px solid rgba(212, 175, 55, 0.25) !important;
            border-radius: 0 !important;
            padding: 8px 6px 12px !important;
            z-index: 20 !important;
            box-shadow: -4px 0 20px rgba(0, 0, 0, 0.8) !important;
            box-sizing: border-box !important;
          }

          /* GÂCHETTES L / R ERGONOMIQUES */
          .rv-pad-shoulder {
            width: 90% !important;
            max-width: 120px !important;
            padding: 8px 0 !important;
            font-size: 0.95rem !important;
            border-radius: 6px !important;
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.6) !important;
          }

          /* D-PAD ERGONOMIQUE FLANC GAUCHE */
          .rv-dpad {
            margin: auto 0 !important;
          }
          .rv-dpad-btn, .rv-dpad-core {
            width: 44px !important;
            height: 44px !important;
          }

          /* ACTIONS ERGONOMIQUES FLANC DROIT */
          .rv-actions {
            margin: auto 0 !important;
          }
          .rv-act-btn {
            width: 46px !important;
            height: 46px !important;
            font-size: 1.05rem !important;
          }
          .rv-act-mid {
            gap: 18px !important;
            margin: 2px 0 !important;
          }

          /* PILL BUTTONS (SELECT & START) */
          .rv-pad-pill {
            padding: 6px 14px !important;
            font-size: 0.72rem !important;
            letter-spacing: 1px !important;
            border-radius: 12px !important;
          }

          /* ZONE CENTRALE (ÉCRAN) */
          .rv-center-stage {
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            height: 100% !important;
            max-height: 100% !important;
            position: relative !important;
            overflow: hidden !important;
            background: #000 !important;
          }
          .rv-screen-wrapper {
            width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            margin: 0 !important;
          }
          #rv-game-container {
            width: auto !important;
            height: auto !important;
            max-width: 100% !important;
            max-height: calc(100vh - 28px) !important;
            aspect-ratio: 4 / 3 !important;
            border-radius: 2px !important;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(212, 175, 55, 0.25) !important;
          }
          #rv-game-container.rv-is-nds {
            aspect-ratio: 8 / 3 !important;
            width: 100% !important;
            max-width: calc((100vh - 28px) * (8 / 3)) !important;
            height: 100% !important;
            max-height: calc(100vh - 28px) !important;
            background: #000 !important;
          }
          #rv-game-container canvas {
            max-height: calc(100vh - 28px) !important;
            width: auto !important;
            height: 100% !important;
          }
          #rv-game-container > div,
          .rv-nds-wrapper {
            width: 100% !important;
            height: 100% !important;
            max-height: calc(100vh - 28px) !important;
          }
          .rv-embedded-frame {
            width: 100% !important;
            height: 100% !important;
            max-height: calc(100vh - 28px) !important;
          }
          .rv-nds-ext-btn-wrap {
            display: none !important;
          }
          .rv-toolbar, .rv-status {
            display: none !important;
          }

          /* BARRE DISCRÈTE PAYSAGE */
          .rv-landscape-bar {
            display: flex !important;
            position: absolute !important;
            top: 6px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            z-index: 50 !important;
            background: rgba(9, 19, 13, 0.88) !important;
            border: 1px solid rgba(212, 175, 55, 0.35) !important;
            border-radius: 20px !important;
            padding: 3px 12px !important;
            gap: 12px !important;
            align-items: center !important;
            backdrop-filter: blur(10px) !important;
            -webkit-backdrop-filter: blur(10px) !important;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.8) !important;
            transition: opacity 0.3s ease !important;
          }
          .rv-land-left {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.76rem;
            color: #d4af37;
            font-weight: 600;
          }
          .rv-land-tools {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .rv-land-btn {
            background: none !important;
            border: none !important;
            color: #d4af37 !important;
            font-size: 0.85rem !important;
            padding: 2px 4px !important;
            cursor: pointer !important;
            line-height: 1 !important;
            transition: transform 0.1s ease, filter 0.1s ease !important;
          }
          .rv-land-btn:hover {
            filter: brightness(1.3) !important;
            transform: scale(1.15) !important;
          }
          .rv-land-btn:active {
            transform: scale(0.9) !important;
          }
          .rv-land-btn-close {
            color: #ef4444 !important;
            font-weight: bold !important;
            margin-left: 4px !important;
          }
        }

        /* MODE PLEIN ÉCRAN UNIFIÉ (NAVIGATEUR) */
        :fullscreen #rv-play-zone,
        :-webkit-full-screen #rv-play-zone {
          display: grid !important;
          grid-template-areas: "wing-left screen wing-right" !important;
          grid-template-columns: minmax(110px, 16vw) 1fr minmax(110px, 16vw) !important;
          width: 100vw !important;
          max-width: 100vw !important;
          height: 100vh !important;
          margin: 0 !important;
          gap: 0 !important;
          position: fixed !important;
          inset: 0 !important;
          z-index: 1000000 !important;
          background: #050a07 !important;
          align-items: stretch !important;
          padding-left: max(6px, env(safe-area-inset-left, 0px)) !important;
          padding-right: max(6px, env(safe-area-inset-right, 0px)) !important;
          padding-top: max(4px, env(safe-area-inset-top, 0px)) !important;
          padding-bottom: max(6px, env(safe-area-inset-bottom, 0px)) !important;
          box-sizing: border-box !important;
        }
        :fullscreen .rv-wing-left, :-webkit-full-screen .rv-wing-left {
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          align-items: center !important;
          height: 100% !important;
          max-height: 100% !important;
          background: linear-gradient(90deg, rgba(9, 19, 13, 0.98) 0%, rgba(5, 10, 7, 0.88) 100%) !important;
          border: none !important;
          border-right: 1px solid rgba(212, 175, 55, 0.25) !important;
          padding: 8px 6px 12px !important;
          z-index: 20 !important;
          box-sizing: border-box !important;
        }
        :fullscreen .rv-wing-right, :-webkit-full-screen .rv-wing-right {
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          align-items: center !important;
          height: 100% !important;
          max-height: 100% !important;
          background: linear-gradient(270deg, rgba(9, 19, 13, 0.98) 0%, rgba(5, 10, 7, 0.88) 100%) !important;
          border: none !important;
          border-left: 1px solid rgba(212, 175, 55, 0.25) !important;
          padding: 8px 6px 12px !important;
          z-index: 20 !important;
          box-sizing: border-box !important;
        }
        :fullscreen .rv-center-stage, :-webkit-full-screen .rv-center-stage {
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          align-items: center !important;
          height: 100% !important;
          position: relative !important;
          overflow: hidden !important;
          background: #000 !important;
        }
        :fullscreen .rv-toolbar, :-webkit-full-screen .rv-toolbar,
        :fullscreen .rv-status, :-webkit-full-screen .rv-status {
          display: none !important;
        }
        :fullscreen .rv-landscape-bar, :-webkit-full-screen .rv-landscape-bar {
          display: flex !important;
        }
        :fullscreen #rv-game-container, :-webkit-full-screen #rv-game-container {
          max-height: calc(100vh - 28px) !important;
          width: auto !important;
          height: auto !important;
          aspect-ratio: 4 / 3 !important;
        }
        :fullscreen #rv-game-container.rv-is-nds, :-webkit-full-screen #rv-game-container.rv-is-nds {
          aspect-ratio: 8 / 3 !important;
          width: 100% !important;
          max-width: calc((100vh - 28px) * (8 / 3)) !important;
          height: 100% !important;
          max-height: calc(100vh - 28px) !important;
        }
        :fullscreen #rv-game-container.rv-is-nds .rv-nds-wrapper,
        :-webkit-full-screen #rv-game-container.rv-is-nds .rv-nds-wrapper,
        :fullscreen #rv-game-container.rv-is-nds .rv-embedded-frame,
        :-webkit-full-screen #rv-game-container.rv-is-nds .rv-embedded-frame {
          width: 100% !important;
          height: 100% !important;
          max-height: calc(100vh - 28px) !important;
        }
        :fullscreen .rv-nds-ext-btn-wrap, :-webkit-full-screen .rv-nds-ext-btn-wrap {
          display: none !important;
        }
        :fullscreen #rv-game-container canvas, :-webkit-full-screen #rv-game-container canvas {
          max-height: calc(100vh - 28px) !important;
          width: auto !important;
          height: 100% !important;
        }

        /* ========================================================
           HUD PERFORMANCE & FPS (INCRUSTATION DIRECTE ÉCRAN)
           ======================================================== */
        .rv-perf-hud {
          position: absolute;
          top: 8px;
          left: 8px;
          z-index: 80;
          display: none;
          align-items: center;
          gap: 6px;
          background: rgba(5, 10, 7, 0.88);
          border: 1px solid rgba(52, 211, 153, 0.45);
          border-radius: 4px;
          padding: 3px 8px;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 0.72rem;
          font-weight: 700;
          color: #34d399;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          pointer-events: none;
          user-select: none;
          transition: border-color 0.2s ease, color 0.2s ease;
        }
        .rv-perf-hud.active {
          display: inline-flex !important;
        }
        .rv-btn-active-fps {
          border-color: rgba(52, 211, 153, 0.75) !important;
          color: #34d399 !important;
          box-shadow: 0 0 10px rgba(52, 211, 153, 0.3) !important;
        }
        .rv-btn-active-speed {
          border-color: rgba(212, 175, 55, 0.85) !important;
          color: #fde047 !important;
          box-shadow: 0 0 12px rgba(212, 175, 55, 0.4) !important;
        }

        /* ========================================================
           MODAL OPTIONS DU SANCTUAIRE (VITESSE, CHEATS, FPS...)
           ======================================================== */
        #rv-options-modal {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          z-index: 10000005;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
          box-sizing: border-box;
          font-family: var(--font-body, 'Outfit', sans-serif);
        }
        .rv-opt-backdrop {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(3, 8, 5, 0.88);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .rv-opt-dialog {
          position: relative;
          background: #09130d;
          border: 1px solid rgba(212, 175, 55, 0.45);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.95), 0 0 40px rgba(212, 175, 55, 0.15);
          border-radius: 6px;
          width: 100%;
          max-width: 580px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 20px 22px;
          color: #f0f4f1;
          box-sizing: border-box;
          animation: rvCloudPop 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .rv-opt-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(212, 175, 55, 0.25);
          padding-bottom: 12px;
          margin-bottom: 14px;
        }
        .rv-opt-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .rv-opt-sigil {
          font-size: 1.6rem;
          filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.6));
        }
        .rv-opt-title {
          font-family: var(--font-heading, 'Cinzel', serif);
          font-size: 1.15rem;
          font-weight: 700;
          color: #d4af37;
          margin: 0;
          letter-spacing: 0.5px;
        }
        .rv-opt-close {
          background: none;
          border: 1px solid rgba(212, 175, 55, 0.3);
          color: #d4af37;
          font-size: 0.95rem;
          width: 32px;
          height: 32px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .rv-opt-close:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: #ef4444;
          color: #ef4444;
        }
        .rv-opt-section {
          background: #050a07;
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 6px;
          padding: 12px 14px;
          margin-bottom: 14px;
        }
        .rv-opt-section-title {
          font-family: var(--font-heading, 'Cinzel', serif);
          font-size: 0.88rem;
          font-weight: 700;
          color: #d4af37;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rv-opt-speed-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
        }
        .rv-opt-speed-btn {
          background: #0d2218;
          border: 1px solid rgba(212, 175, 55, 0.3);
          color: #c4d4c8;
          padding: 8px 4px;
          border-radius: 4px;
          font-size: 0.78rem;
          cursor: pointer;
          text-align: center;
          transition: all 0.15s ease;
        }
        .rv-opt-speed-btn:hover {
          border-color: #d4af37;
          color: #fff;
        }
        .rv-opt-speed-btn.active {
          background: linear-gradient(180deg, #193826 0%, #0d2218 100%);
          border-color: #34d399;
          color: #34d399;
          font-weight: 700;
          box-shadow: 0 0 10px rgba(52, 211, 153, 0.3);
        }
        .rv-opt-check-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 6px 0;
          cursor: pointer;
          user-select: none;
        }
        .rv-opt-check-row input[type="checkbox"] {
          width: 17px;
          height: 17px;
          margin-top: 2px;
          accent-color: #34d399;
          cursor: pointer;
        }
        .rv-opt-check-label {
          font-size: 0.82rem;
          color: #e2ece5;
          line-height: 1.35;
        }
        .rv-opt-check-sub {
          font-size: 0.72rem;
          color: #88998e;
          display: block;
          margin-top: 2px;
        }
        .rv-opt-cheat-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: #0d2218;
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 4px;
          padding: 7px 10px;
          margin-bottom: 6px;
        }
        .rv-opt-cheat-info {
          flex: 1 1 auto;
          min-width: 0;
        }
        .rv-opt-cheat-name {
          font-size: 0.82rem;
          font-weight: 600;
          color: #f0f4f1;
        }
        .rv-opt-cheat-code {
          font-family: monospace;
          font-size: 0.72rem;
          color: #d4af37;
        }
        .rv-opt-cheat-del {
          background: none;
          border: none;
          color: #f87171;
          cursor: pointer;
          font-size: 0.9rem;
          padding: 2px 6px;
        }
        .rv-opt-cheat-del:hover {
          filter: brightness(1.3);
        }
        .rv-opt-add-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px dashed rgba(212, 175, 55, 0.2);
        }
        .rv-opt-input {
          background: #020503;
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 4px;
          color: #f0f4f1;
          font-size: 0.8rem;
          padding: 6px 10px;
          outline: none;
          box-sizing: border-box;
          width: 100%;
        }
        .rv-opt-input:focus {
          border-color: #34d399;
          box-shadow: 0 0 6px rgba(52, 211, 153, 0.3);
        }

        /* ========================================================
           IMMERSION MOBILE PAYSAGE (PLEIN ÉCRAN AUTOMATIQUE)
           ======================================================== */
        #retro-vault-modal.rv-mobile-landscape-fullscreen {
          padding: 0 !important;
          margin: 0 !important;
          overflow: hidden !important;
          background: #000 !important;
          width: 100vw !important;
          height: 100vh !important;
          height: 100dvh !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 2147483647 !important;
        }
        #retro-vault-modal.rv-mobile-landscape-fullscreen .rv-container {
          max-width: none !important;
          width: 100vw !important;
          height: 100vh !important;
          height: 100dvh !important;
          border: none !important;
          border-radius: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          display: flex !important;
          flex-direction: column !important;
        }
        #retro-vault-modal.rv-mobile-landscape-fullscreen .rv-header,
        #retro-vault-modal.rv-mobile-landscape-fullscreen .rv-toolbar,
        #retro-vault-modal.rv-mobile-landscape-fullscreen .rv-status,
        #retro-vault-modal.rv-mobile-landscape-fullscreen .rv-controls-guide,
        #retro-vault-modal.rv-mobile-landscape-fullscreen .rv-catalog-section,
        #retro-vault-modal.rv-mobile-landscape-fullscreen .rv-save-indicator,
        #retro-vault-modal.rv-mobile-landscape-fullscreen .rv-cloud-status-banner,
        #retro-vault-modal.rv-mobile-landscape-fullscreen #rv-library {
          display: none !important;
        }
        #retro-vault-modal.rv-mobile-landscape-fullscreen .rv-landscape-bar {
          display: flex !important;
          height: 32px !important;
          padding: 2px 10px !important;
        }
        #retro-vault-modal.rv-mobile-landscape-fullscreen .rv-play-zone {
          flex: 1 1 auto !important;
          width: 100vw !important;
          height: calc(100vh - 32px) !important;
          height: calc(100dvh - 32px) !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: space-between !important;
        }
        #retro-vault-modal.rv-mobile-landscape-fullscreen .rv-wing {
          display: flex !important;
          height: 100% !important;
          z-index: 20 !important;
        }
        #retro-vault-modal.rv-mobile-landscape-fullscreen .rv-center-stage {
          flex: 1 1 auto !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
        }
        #retro-vault-modal.rv-mobile-landscape-fullscreen .rv-screen-wrapper {
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        #retro-vault-modal.rv-mobile-landscape-fullscreen #rv-game-container {
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        #retro-vault-modal.rv-mobile-landscape-fullscreen #rv-canvas {
          max-height: calc(100vh - 32px) !important;
          max-height: calc(100dvh - 32px) !important;
          max-width: calc(100vw - 230px) !important;
          object-fit: contain !important;
        }
        #retro-vault-modal.rv-mobile-landscape-fullscreen.force-hidden-wings #rv-canvas {
          max-width: 100vw !important;
        }
        #retro-vault-modal.rv-mobile-landscape-fullscreen #rv-game-container.rv-is-nds .rv-nds-wrapper,
        #retro-vault-modal.rv-mobile-landscape-fullscreen #rv-game-container.rv-is-nds .rv-embedded-frame {
          width: 100% !important;
          height: 100% !important;
          max-height: calc(100vh - 32px) !important;
          max-height: calc(100dvh - 32px) !important;
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

          <!-- Zone de Jeu Unifiée (Écran + Flancs Manette Ailes Latérales) -->
          <div class="rv-play-zone" id="rv-play-zone">
            <!-- Flanc Gauche (D-Pad & L) -->
            <div class="rv-wing rv-wing-left" id="rv-wing-left">
              <div class="rv-wing-shoulder">
                <button class="rv-pad-shoulder rv-pad-l" data-btn="l" data-code="KeyU" data-key="u" id="rv-touch-l" aria-label="Gâchette L">L</button>
              </div>
              <div class="rv-wing-center">
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
              </div>
              <div class="rv-wing-menu">
                <button class="rv-pad-pill rv-pad-select" data-btn="select" data-code="KeyV" data-key="v">SELECT</button>
              </div>
            </div>

            <!-- Scène Centrale (Écran de jeu + Outils) -->
            <div class="rv-center-stage" id="rv-center-stage">
              <!-- Barre rapide discrète pour mode paysage -->
              <div class="rv-landscape-bar" id="rv-landscape-bar">
                <div class="rv-land-left">
                  <span class="rv-land-logo">🦉</span>
                  <span class="rv-land-status" id="rv-land-status">Sanctuaire</span>
                </div>
                <div class="rv-land-tools">
                  <button class="rv-land-btn" id="rv-land-btn-save" title="Sauvegarder l'état">💾</button>
                  <button class="rv-land-btn" id="rv-land-btn-load" title="Charger l'état">📂</button>
                  <button class="rv-land-btn" id="rv-land-btn-speed" title="Changer la vitesse (Actuelle: 1x)">⚡ 1x</button>
                  <button class="rv-land-btn" id="rv-land-btn-options" title="Options d'émulation & Sortilèges">⚙️</button>
                  <button class="rv-land-btn" id="rv-land-btn-fps" title="Afficher ou masquer les FPS">📊</button>
                  <button class="rv-land-btn" id="rv-land-btn-pause" title="Pause / Reprendre">⏸️</button>
                  <button class="rv-land-btn" id="rv-land-btn-mute" title="Couper ou rétablir le son">🔊</button>
                  <button class="rv-land-btn" id="rv-land-btn-account" style="display: none;" title="Mon Compte">🟢</button>
                  <button class="rv-land-btn" id="rv-land-btn-fs" title="Plein Écran unifié">⛶</button>
                  <button class="rv-land-btn rv-land-btn-close" id="rv-land-btn-close" title="Fermer le sanctuaire">✕</button>
                </div>
              </div>

              <!-- Écran de jeu -->
              <div class="rv-screen-wrapper">
                <div id="rv-game-container">
                  <div class="rv-perf-hud" id="rv-perf-hud">
                    <span class="rv-perf-dot" id="rv-perf-dot">🟢</span>
                    <span class="rv-perf-text" id="rv-perf-text">60 FPS | 16.6 ms</span>
                  </div>
                  <div class="rv-crt-overlay" id="rv-crt"></div>
                  <canvas id="rv-canvas"></canvas>
                </div>
                <div class="rv-status" id="rv-status">Insérez une cartouche ou déposez un fichier ROM pour démarrer</div>

                <!-- Barre d'actions standard (portrait / bureau) -->
                <div class="rv-toolbar">
                  <div class="rv-tool-group">
                    <button class="rv-btn rv-btn-account" id="rv-btn-account" style="display: none;" title="Mon Compte">🟢 Mon Compte</button>
                    <button class="rv-btn rv-btn-hub-nav" id="rv-btn-hub-nav" style="display: none;" title="Revenir au choix des jeux">📚 Changer de jeu</button>
                    <button class="rv-btn" id="rv-btn-options" title="Options d'émulation (Vitesse, Cheat codes, FPS...)">⚙️ Options</button>
                    <button class="rv-btn" id="rv-btn-speed" title="Changer la vitesse de jeu (1x, 1.5x, 2x, 4x)">⚡ 1x</button>
                    <button class="rv-btn" id="rv-btn-fps" title="Afficher ou masquer les FPS et la performance">📊 FPS : OFF</button>
                    <button class="rv-btn rv-btn-save" id="rv-btn-save">💾 Sauver (F2)</button>
                    <button class="rv-btn rv-btn-load" id="rv-btn-load">📂 Charger (F4)</button>
                    <button class="rv-btn" id="rv-btn-pause">⏸️ Pause</button>
                    <button class="rv-btn" id="rv-btn-reset">🔄 Reset</button>
                  </div>
                  <div class="rv-tool-group">
                    <div class="rv-vol-wrap" title="Volume sonore général du sanctuaire">
                      <button class="rv-btn rv-vol-btn" id="rv-btn-mute" title="Couper / Rétablir le son" aria-label="Couper ou rétablir le son">🔊</button>
                      <input type="range" class="rv-vol-slider" id="rv-vol-slider" min="0" max="1" step="0.02" value="0.8" aria-label="Contrôle du volume sonore">
                      <span class="rv-vol-val" id="rv-vol-val">80%</span>
                    </div>
                    <div class="rv-gp-badge" id="rv-gp-badge" title="État de la manette physique (PS5 DualSense / Xbox / Switch)">
                      <span class="rv-gp-icon">🎮</span>
                      <span id="rv-gp-name">Aucune manette</span>
                    </div>
                    <button class="rv-btn" id="rv-btn-pad-toggle">📱 Manette Virtuelle</button>
                    <button class="rv-btn" id="rv-btn-crt">📺 CRT</button>
                    <button class="rv-btn" id="rv-btn-fullscreen">⛶ Plein Écran</button>
                    <input type="file" id="rv-file-input" style="display: none;" accept=".nes,.sfc,.smc,.gba,.gb,.gbc,.md,.bin,.gen,.zip,.iso,.cue,.chd,.pbp,.img,.pce,.nds,.cso">
                    <button class="rv-btn" id="rv-btn-upload">📁 Insérer ROM</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Flanc Droit (Actions A/B/X/Y & R) -->
            <div class="rv-wing rv-wing-right" id="rv-wing-right">
              <div class="rv-wing-shoulder">
                <button class="rv-pad-shoulder rv-pad-r" data-btn="r" data-code="KeyP" data-key="p" id="rv-touch-r" aria-label="Gâchette R">R</button>
              </div>
              <div class="rv-wing-center">
                <!-- Cluster d'actions en losange (Droite) -->
                <div class="rv-actions" id="rv-actions">
                  <button class="rv-act-btn rv-act-x" data-btn="x" data-code="KeyO" data-key="o" id="rv-touch-x">X</button>
                  <div class="rv-act-mid">
                    <button class="rv-act-btn rv-act-y" data-btn="y" data-code="KeyI" data-key="i" id="rv-touch-y">Y</button>
                    <button class="rv-act-btn rv-act-a" data-btn="a" data-code="KeyL" data-key="l" id="rv-touch-a">A</button>
                  </div>
                  <button class="rv-act-btn rv-act-b" data-btn="b" data-code="KeyK" data-key="k" id="rv-touch-b">B</button>
                </div>
              </div>
              <div class="rv-wing-menu">
                <button class="rv-pad-pill rv-pad-start" data-btn="start" data-code="KeyB" data-key="b">START</button>
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

          <!-- Hub & Bibliothèque des Consoles (Uniquement visible si connecté) -->
          <div class="rv-library-head" id="rv-library" style="display: none;">
            <div class="rv-lib-title-row">
              <div class="rv-lib-title">📚 Sélection des Consoles & Reliques</div>
              <div class="rv-search-wrap">
                <input type="text" id="rv-search-input" class="rv-search-input" placeholder="🔍 Rechercher une relique..." autocomplete="off" />
              </div>
            </div>
            <div class="rv-tabs" id="rv-tabs">
              <button class="rv-tab active" data-filter="all">🔮 TOUTES</button>
              <button class="rv-tab" data-filter="psp">🔴 PSP</button>
              <button class="rv-tab" data-filter="ps1">⚔️ PLAYSTATION 1</button>
              <button class="rv-tab" data-filter="nds">🕹️ NINTENDO DS</button>
              <button class="rv-tab" data-filter="snes">🍄 SUPER NINTENDO</button>
              <button class="rv-tab" data-filter="gba">⚡ GBA</button>
              <button class="rv-tab" data-filter="gb">🟡 GAME BOY / GBC</button>
              <button class="rv-tab" data-filter="nes">🏰 NES 8-BIT</button>
              <button class="rv-tab" data-filter="megadrive">🌪️ MEGA DRIVE</button>
              <button class="rv-tab" data-filter="pce">🚀 PC ENGINE</button>
            </div>
          </div>
          <div class="rv-grid" id="rv-grid" style="display: none;"></div>
        </div>
      `;
      document.body.appendChild(modal);
      this.modal = modal;
      this.bindModalEvents();
      this.bindVirtualGamepad();
      this.mettreAJourInterfaceCompte();
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

        let isDown = false;

        const press = (e) => {
          if (e && e.cancelable) e.preventDefault();
          if (isDown) return;
          isDown = true;
          el.classList.add("pressed");
          triggerKey(btn, code, key, true);
        };

        const release = (e) => {
          if (e && e.cancelable) e.preventDefault();
          if (!isDown) return;
          isDown = false;
          el.classList.remove("pressed");
          triggerKey(btn, code, key, false);
        };

        // Pointer Events (Touch, Mouse, Stylet) avec capture pour maintenir l'appui même si le doigt bouge
        el.addEventListener("pointerdown", (e) => {
          try { el.setPointerCapture(e.pointerId); } catch(err) {}
          press(e);
        });
        el.addEventListener("pointerup", (e) => {
          try { el.releasePointerCapture(e.pointerId); } catch(err) {}
          release(e);
        });
        el.addEventListener("pointercancel", (e) => {
          try { el.releasePointerCapture(e.pointerId); } catch(err) {}
          release(e);
        });

        // Événements tactiles directs de secours (mobile)
        el.addEventListener("touchstart", press, { passive: false });
        el.addEventListener("touchend", release, { passive: false });
        el.addEventListener("touchcancel", release, { passive: false });
      };

      // Liaison des boutons de la manette (ailes gauche et droite)
      document.querySelectorAll(".rv-wing button[data-btn]").forEach(bindBtn);

      // Gestion haute précision du D-Pad avec support des 8 directions (diagonales) et multi-touch
      const dpad = document.getElementById("rv-dpad");
      if (dpad) {
        let activeDirs = { up: false, down: false, left: false, right: false };
        let dpadTouchId = null;

        const updateDpadVector = (clientX, clientY) => {
          const rect = dpad.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = clientX - cx;
          const dy = clientY - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const deadzone = rect.width * 0.16; // 16% de zone morte au centre

          const newDirs = { up: false, down: false, left: false, right: false };

          if (dist > deadzone) {
            const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 à +180

            // 8 secteurs ergonomiques de 45°
            if (angle >= -157.5 && angle <= -112.5) {
              newDirs.up = true; newDirs.left = true;
            } else if (angle > -112.5 && angle < -67.5) {
              newDirs.up = true;
            } else if (angle >= -67.5 && angle <= -22.5) {
              newDirs.up = true; newDirs.right = true;
            } else if (angle > -22.5 && angle < 22.5) {
              newDirs.right = true;
            } else if (angle >= 22.5 && angle <= 67.5) {
              newDirs.down = true; newDirs.right = true;
            } else if (angle > 67.5 && angle < 112.5) {
              newDirs.down = true;
            } else if (angle >= 112.5 && angle <= 157.5) {
              newDirs.down = true; newDirs.left = true;
            } else {
              newDirs.left = true;
            }
          }

          const btnMap = {
            up: dpad.querySelector(".rv-dpad-u"),
            down: dpad.querySelector(".rv-dpad-d"),
            left: dpad.querySelector(".rv-dpad-l"),
            right: dpad.querySelector(".rv-dpad-r")
          };

          for (const d of ["up", "down", "left", "right"]) {
            if (newDirs[d] !== activeDirs[d]) {
              activeDirs[d] = newDirs[d];
              const btnEl = btnMap[d];
              if (btnEl) {
                if (newDirs[d]) btnEl.classList.add("pressed");
                else btnEl.classList.remove("pressed");
                triggerKey(
                  d,
                  btnEl.getAttribute("data-code") || "",
                  btnEl.getAttribute("data-key") || "",
                  newDirs[d]
                );
              }
            }
          }
        };

        const releaseDpad = () => {
          dpadTouchId = null;
          const btnMap = {
            up: dpad.querySelector(".rv-dpad-u"),
            down: dpad.querySelector(".rv-dpad-d"),
            left: dpad.querySelector(".rv-dpad-l"),
            right: dpad.querySelector(".rv-dpad-r")
          };
          for (const d of ["up", "down", "left", "right"]) {
            if (activeDirs[d]) {
              activeDirs[d] = false;
              const btnEl = btnMap[d];
              if (btnEl) {
                btnEl.classList.remove("pressed");
                triggerKey(
                  d,
                  btnEl.getAttribute("data-code") || "",
                  btnEl.getAttribute("data-key") || "",
                  false
                );
              }
            }
          }
        };

        dpad.addEventListener("touchstart", (e) => {
          e.preventDefault();
          if (e.targetTouches.length > 0) {
            const t = e.targetTouches[0];
            dpadTouchId = t.identifier;
            updateDpadVector(t.clientX, t.clientY);
          }
        }, { passive: false });

        dpad.addEventListener("touchmove", (e) => {
          e.preventDefault();
          for (let i = 0; i < e.targetTouches.length; i++) {
            const t = e.targetTouches[i];
            if (dpadTouchId === null || t.identifier === dpadTouchId) {
              updateDpadVector(t.clientX, t.clientY);
              break;
            }
          }
        }, { passive: false });

        dpad.addEventListener("touchend", (e) => {
          let found = false;
          for (let i = 0; i < e.targetTouches.length; i++) {
            if (e.targetTouches[i].identifier === dpadTouchId) {
              found = true;
              break;
            }
          }
          if (!found) releaseDpad();
        }, { passive: false });

        dpad.addEventListener("touchcancel", releaseDpad, { passive: false });

        // Support souris / glissé sur desktop
        let dpadMouseDown = false;
        dpad.addEventListener("mousedown", (e) => {
          dpadMouseDown = true;
          updateDpadVector(e.clientX, e.clientY);
        });
        window.addEventListener("mousemove", (e) => {
          if (dpadMouseDown) updateDpadVector(e.clientX, e.clientY);
        });
        window.addEventListener("mouseup", () => {
          if (dpadMouseDown) {
            dpadMouseDown = false;
            releaseDpad();
          }
        });
      }

      // Glissement tactile fluide sur les boutons d'action A / B / X / Y (roulement du pouce)
      const actionsCluster = document.getElementById("rv-actions");
      if (actionsCluster) {
        let currentTouchActBtn = null;
        actionsCluster.addEventListener("touchmove", (e) => {
          e.preventDefault();
          for (let i = 0; i < e.targetTouches.length; i++) {
            const t = e.targetTouches[i];
            const target = document.elementFromPoint(t.clientX, t.clientY);
            const btn = target ? target.closest(".rv-act-btn") : null;
            if (btn && btn !== currentTouchActBtn) {
              if (currentTouchActBtn) {
                currentTouchActBtn.classList.remove("pressed");
                triggerKey(
                  (currentTouchActBtn.getAttribute("data-btn") || "").toLowerCase(),
                  currentTouchActBtn.getAttribute("data-code") || "",
                  currentTouchActBtn.getAttribute("data-key") || "",
                  false
                );
              }
              currentTouchActBtn = btn;
              currentTouchActBtn.classList.add("pressed");
              triggerKey(
                (currentTouchActBtn.getAttribute("data-btn") || "").toLowerCase(),
                currentTouchActBtn.getAttribute("data-code") || "",
                currentTouchActBtn.getAttribute("data-key") || "",
                true
              );
            }
          }
        }, { passive: false });

        actionsCluster.addEventListener("touchend", () => {
          if (currentTouchActBtn) {
            currentTouchActBtn.classList.remove("pressed");
            triggerKey(
              (currentTouchActBtn.getAttribute("data-btn") || "").toLowerCase(),
              currentTouchActBtn.getAttribute("data-code") || "",
              currentTouchActBtn.getAttribute("data-key") || "",
              false
            );
            currentTouchActBtn = null;
          }
        });
      }

      // Bouton pour afficher/masquer la manette (ailes latérales)
      const padToggleBtn = document.getElementById("rv-btn-pad-toggle");
      const playZoneEl = document.getElementById("rv-play-zone");
      if (padToggleBtn && playZoneEl) {
        padToggleBtn.addEventListener("click", () => {
          playZoneEl.classList.toggle("force-hidden-wings");
          padToggleBtn.textContent = playZoneEl.classList.contains("force-hidden-wings") ? "🎮 Manette : OFF" : "🎮 Manette : ON";
        });
      }
    }

    bindModalEvents() {
      // Fermeture
      document.getElementById("rv-close-btn").addEventListener("click", () => this.close());

      // Sceau d'Archiviste (accessible sur Mobile & Desktop via le Hibou)
      const handleSigilClick = () => {
        this.sigilClickCount = (this.sigilClickCount || 0) + 1;
        clearTimeout(this.sigilClickTimer);
        this.sigilClickTimer = setTimeout(() => { this.sigilClickCount = 0; }, 1500);
        if (this.isCloudConnected() || this.sigilClickCount >= 3) {
          this.sigilClickCount = 0;
          this.openCloudArchivistModal();
        }
      };

      document.querySelectorAll(".rv-sigil, .rv-land-logo").forEach((el) => {
        el.style.cursor = "pointer";
        el.setAttribute("title", "Sceau d'Archiviste");
        el.addEventListener("click", handleSigilClick);
      });

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

      // Bouton Mon Compte (Archiviste / VPS)
      const btnAccount = document.getElementById("rv-btn-account");
      if (btnAccount) {
        btnAccount.addEventListener("click", () => this.openCloudArchivistModal());
      }
      const landAccount = document.getElementById("rv-land-btn-account");
      if (landAccount) {
        landAccount.addEventListener("click", () => this.openCloudArchivistModal());
      }

      // Bouton Revenir au Hub / Changer de jeu
      const btnHubNav = document.getElementById("rv-btn-hub-nav");
      if (btnHubNav) {
        btnHubNav.addEventListener("click", async () => {
          if (this.partieEnCours && this.jeuEnCoursNom) {
            try { await this.extraireEtSauvegarderSRAM(this.jeuEnCoursNom, true); } catch (e) {}
            if (!this.estEnPause) this.togglePause();
          }
          const libEl = document.getElementById("rv-library");
          if (libEl) {
            libEl.scrollIntoView({ behavior: "smooth" });
          }
        });
      }

      // Recherche dynamique en direct dans le grimoire
      const searchInput = document.getElementById("rv-search-input");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          this.rechercheTexte = e.target.value;
          this.rendreGrille();
        });
      }

      // Bascule Plein Écran unifié (englobe la zone de jeu ET les commandes virtuelles)
      const toggleFullscreen = () => {
        const target = document.getElementById("rv-play-zone") || document.getElementById("rv-game-container") || this.modal;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          if (target.requestFullscreen) target.requestFullscreen().catch(() => {});
          else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen().catch(() => {});
        } else {
          if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => {});
        }
      };

      const fsBtn = document.getElementById("rv-btn-fullscreen");
      if (fsBtn) fsBtn.addEventListener("click", toggleFullscreen);
      const landFsBtn = document.getElementById("rv-land-btn-fs");
      if (landFsBtn) landFsBtn.addEventListener("click", toggleFullscreen);

      const landCloseBtn = document.getElementById("rv-land-btn-close");
      if (landCloseBtn) landCloseBtn.addEventListener("click", () => this.close());

      const landSaveBtn = document.getElementById("rv-land-btn-save");
      if (landSaveBtn) landSaveBtn.addEventListener("click", () => this.sauvegarderPartie());

      const landLoadBtn = document.getElementById("rv-land-btn-load");
      if (landLoadBtn) landLoadBtn.addEventListener("click", () => this.chargerPartie());

      const landPauseBtn = document.getElementById("rv-land-btn-pause");
      if (landPauseBtn) landPauseBtn.addEventListener("click", () => this.togglePause());

      const landMuteBtn = document.getElementById("rv-land-btn-mute");
      if (landMuteBtn) {
        landMuteBtn.addEventListener("click", () => {
          if (this.volumeActuel > 0) {
            this.volumePrecedent = this.volumeActuel;
            this.appliquerVolume(0);
          } else {
            this.appliquerVolume(this.volumePrecedent > 0 ? this.volumePrecedent : 0.8);
          }
        });
      }

      // Gestion du volume sonore
      const rvVolSlider = document.getElementById("rv-vol-slider");
      const rvVolBtn = document.getElementById("rv-btn-mute");
      if (rvVolSlider) {
        rvVolSlider.addEventListener("input", (e) => {
          this.appliquerVolume(parseFloat(e.target.value));
        });
      }
      if (rvVolBtn) {
        rvVolBtn.addEventListener("click", () => {
          if (this.volumeActuel > 0) {
            this.volumePrecedent = this.volumeActuel;
            this.appliquerVolume(0);
          } else {
            this.appliquerVolume(this.volumePrecedent > 0 ? this.volumePrecedent : 0.8);
          }
        });
      }

      // Bouton Options & Sortilèges
      const btnOptions = document.getElementById("rv-btn-options");
      if (btnOptions) btnOptions.addEventListener("click", () => this.openOptionsModal());
      const landBtnOptions = document.getElementById("rv-land-btn-options");
      if (landBtnOptions) landBtnOptions.addEventListener("click", () => this.openOptionsModal());

      // Bouton Vitesse d'Émulation
      const btnSpeed = document.getElementById("rv-btn-speed");
      if (btnSpeed) btnSpeed.addEventListener("click", () => this.toggleVitesseRapide());
      const landBtnSpeed = document.getElementById("rv-land-btn-speed");
      if (landBtnSpeed) landBtnSpeed.addEventListener("click", () => this.toggleVitesseRapide());

      // Bouton FPS & Performance
      const btnFps = document.getElementById("rv-btn-fps");
      if (btnFps) {
        btnFps.textContent = `📊 FPS : ${this.afficherPerfFps ? "ON" : "OFF"}`;
        btnFps.addEventListener("click", () => this.togglePerfFps());
      }
      const landBtnFps = document.getElementById("rv-land-btn-fps");
      if (landBtnFps) landBtnFps.addEventListener("click", () => this.togglePerfFps());

      // Bascule automatique plein écran en mode paysage sur mobile / tactile
      const handleMobileOrientation = () => {
        if (!this.autoFullscreenPaysage) return;
        const isMobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 900 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (!isMobile) return;

        const isLandscape = (window.innerWidth > window.innerHeight) || (screen.orientation && screen.orientation.type && screen.orientation.type.includes("landscape"));
        const isModalOpen = this.modal && (this.modal.classList.contains("active") || this.modal.style.display === "block");

        if (isLandscape && isModalOpen) {
          this.modal.classList.add("rv-mobile-landscape-fullscreen");
          const target = document.getElementById("rv-play-zone") || this.modal;
          if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (target.requestFullscreen) target.requestFullscreen().catch(() => {});
            else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen().catch(() => {});
          }
        } else if (this.modal) {
          this.modal.classList.remove("rv-mobile-landscape-fullscreen");
          if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => {});
          }
        }
      };

      if (screen.orientation) {
        screen.orientation.addEventListener("change", handleMobileOrientation);
      }
      window.addEventListener("orientationchange", handleMobileOrientation);
      window.addEventListener("resize", () => {
        clearTimeout(this._orientationResizeTimer);
        this._orientationResizeTimer = setTimeout(handleMobileOrientation, 150);
      });

      // Écoute des messages venant de l'iframe DS
      window.addEventListener("message", (e) => {
        if (e.data && e.data.type === "NDS_READY") {
          const frame = document.getElementById("rv-nds-frame");
          if (frame && frame.contentWindow) {
            try {
              frame.contentWindow.postMessage({
                type: "SET_VOLUME",
                volume: this.volumeActuel
              }, "*");
            } catch(e) {}
            if (this.pendingNdsRom) {
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
      const isConnected = this.isCloudConnected();
      const libHead = document.getElementById("rv-library");
      const grid = document.getElementById("rv-grid");
      if (!grid) return;

      if (!isConnected) {
        if (libHead) libHead.style.display = "none";
        grid.style.display = "none";
        grid.innerHTML = "";
        return;
      }

      if (libHead) libHead.style.display = "block";
      grid.style.display = "grid";
      grid.innerHTML = "";

      // Mise à jour dynamique des compteurs dans les onglets de consoles
      const counts = { all: this.tousLesJeux.length, psp: 0, ps1: 0, nds: 0, snes: 0, gba: 0, gb: 0, nes: 0, megadrive: 0, pce: 0 };
      for (const j of this.tousLesJeux) {
        if (counts[j.console] !== undefined) counts[j.console]++;
      }
      const updateTab = (filter, label) => {
        const tab = document.querySelector(`.rv-tab[data-filter="${filter}"]`);
        if (tab) {
          const c = counts[filter] || 0;
          tab.textContent = c > 0 ? `${label} (${c})` : label;
        }
      };
      updateTab("all", "🔮 TOUTES");
      updateTab("psp", "🔴 PSP");
      updateTab("ps1", "⚔️ PLAYSTATION 1");
      updateTab("nds", "🕹️ NINTENDO DS");
      updateTab("snes", "🍄 SUPER NINTENDO");
      updateTab("gba", "⚡ GBA");
      updateTab("gb", "🟡 GAME BOY / GBC");
      updateTab("nes", "🏰 NES 8-BIT");
      updateTab("megadrive", "🌪️ MEGA DRIVE");
      updateTab("pce", "🚀 PC ENGINE");

      const query = (this.rechercheTexte || "").toLowerCase().trim();

      const liste = this.tousLesJeux.filter((j) => {
        const matchesConsole = this.filtreActuel === "all" || j.console === this.filtreActuel;
        if (!matchesConsole) return false;
        if (!query) return true;
        const titre = (j.titre || "").toLowerCase();
        const nom = (j.nom || "").toLowerCase();
        const desc = (j.desc || "").toLowerCase();
        return titre.includes(query) || nom.includes(query) || desc.includes(query);
      });

      if (liste.length === 0) {
        grid.innerHTML = `
          <div class="rv-empty-search" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #a8b8ad; font-style: italic;">
            🦉 Aucune relique trouvée pour "${this.rechercheTexte}". Essayez un autre terme ou changez de console.
          </div>
        `;
      } else {
        for (const jeu of liste) {
          const card = document.createElement("div");
          card.className = "rv-card" + (jeu.nom === this.jeuEnCoursNom ? " playing" : "");
          card.onclick = () => {
            this.lancerPartie(jeu.nom, jeu.blob);
            const playZone = document.getElementById("rv-play-zone");
            if (playZone) playZone.scrollIntoView({ behavior: "smooth" });
          };

          let saveBadgeHtml = "";
          try {
            const save = await this.loadStateDB(jeu.nom);
            if (save && (save.sram || save.state)) {
              const badgeLabel = save.sram ? "💾 Carte Mémoire" : "💾 Sauvegarde";
              saveBadgeHtml = `<span class="rv-save-badge">${badgeLabel}</span>`;
            }
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
              <span>▶ ${jeu.nom === this.jeuEnCoursNom ? "EN COURS" : "INVOQUER"}</span>
            </div>
          `;
          grid.appendChild(card);
        }
      }
    }

    // --- Téléchargement résilient de ROM (Local ou CDN VPS distant) avec jauge de progression ---
    async fetchRomBlob(nomFichier, onProgress) {
      const token = this.getCloudToken();
      if (!token) {
        throw new Error("Authentification requise pour télécharger cette relique.");
      }
      const tokenParam = `?token=${encodeURIComponent(token)}`;
      const urls = [
        `assets/vault/${encodeURI(nomFichier)}${tokenParam}`,
        `https://quentinbeaud.com/assets/vault/${encodeURI(nomFichier)}${tokenParam}`,
        `https://roms.quentinbeaud.com/vault/${encodeURI(nomFichier)}`
      ];
      const headers = { "Authorization": `Bearer ${token}` };

      let lastError = null;
      for (const url of urls) {
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              this.disconnectVPSCloud();
              throw new Error("Session expirée ou non autorisée. Veuillez vous reconnecter.");
            }
            lastError = `Code HTTP ${res.status}`;
            continue;
          }

          const total = parseInt(res.headers.get("content-length") || "0", 10);
          if (!total || !res.body) {
            return await res.blob();
          }

          const reader = res.body.getReader();
          const chunks = [];
          let received = 0;
          let lastTick = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            const now = Date.now();
            if (onProgress && now - lastTick > 120) {
              lastTick = now;
              onProgress(received, total);
            }
          }
          if (onProgress) onProgress(received, total);
          return new Blob(chunks);
        } catch (err) {
          if (err.message && err.message.includes("Session expirée")) {
            throw err;
          }
          lastError = err.message || err;
        }
      }
      throw new Error(`Échec de récupération de la relique "${nomFichier}" (${lastError || "introuvable"}).`);
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
          if (this.jeuEnCoursNom) {
            try { await this.extraireEtSauvegarderSRAM(this.jeuEnCoursNom, true); } catch (e) {}
          }
          this.arreterSramLoop();
          this.arreterMesurePerf();
          await this.partieEnCours.exit();
          this.partieEnCours = null;
        }

        const isLauncher = nomFichier.includes("console-nds-launcher") || nomFichier.includes("console-psp-launcher");
        let romBlob = customBlob;

        if (!romBlob && !isLauncher) {
          if (!this.isCloudConnected()) {
            throw new Error("Relique inaccessible en mode invité.");
          }

          status.textContent = `⏳ Récupération de la relique : "${nomFichier}"...`;
          status.style.color = "#d4af37";

          romBlob = await this.fetchRomBlob(nomFichier, (received, total) => {
            const pct = Math.round((received / total) * 100);
            const mbRec = (received / 1048576).toFixed(1);
            const mbTot = (total / 1048576).toFixed(1);
            status.textContent = `⏳ Téléchargement de la relique : ${pct}% (${mbRec} / ${mbTot} Mo)...`;
          });
        }

        const container = document.getElementById("rv-game-container");

        if (cType === "nds") {
          container.classList.add("rv-is-nds");

          container.innerHTML = `
            <div class="rv-perf-hud" id="rv-perf-hud">
              <span class="rv-perf-dot" id="rv-perf-dot">🟢</span>
              <span class="rv-perf-text" id="rv-perf-text">60 FPS | 16.6 ms</span>
            </div>
            <div class="rv-nds-wrapper">
              <div class="rv-nds-ext-btn-wrap" style="position: absolute; top: 8px; right: 8px; z-index: 10;">
                <a href="emulators/ds/index.html?v=8.9" target="_blank" class="rv-btn rv-nds-ext-btn" style="font-size: 0.72rem; padding: 4px 8px; text-decoration: none;">⛶ Plein Écran Dédié</a>
              </div>
              <iframe id="rv-nds-frame" class="rv-embedded-frame" src="emulators/ds/index.html?v=8.9&embedded=1" allow="autoplay; fullscreen; gamepad"></iframe>
            </div>
          `;

          const frame = document.getElementById("rv-nds-frame");
          this.pendingNdsRom = romBlob ? { blob: romBlob, name: nomFichier } : null;

          // Si connecté au Cloud VPS, rapatrier la dernière sauvegarde si disponible
          if (this.isCloudConnected()) {
            await this.verifierSauvegardeDistante(nomFichier);
          }

          // Charger la sauvegarde locale existante depuis IndexedDB
          try {
            const existingSave = await this.loadStateDB(nomFichier);
            this.pendingNdsSave = (existingSave && (existingSave.sram || existingSave.state)) ? (existingSave.sram || existingSave.state) : null;
          } catch(e) {
            this.pendingNdsSave = null;
          }

          if (frame) {
            const sendRomAndVolume = () => {
              try {
                if (frame.contentWindow) {
                  frame.contentWindow.postMessage({
                    type: "SET_VOLUME",
                    volume: this.volumeActuel
                  }, "*");
                  if (this.pendingNdsSave) {
                    frame.contentWindow.postMessage({
                      type: "LOAD_DS_SAVE",
                      data: Array.from(this.pendingNdsSave)
                    }, "*");
                  }
                  if (this.pendingNdsRom) {
                    frame.contentWindow.postMessage({
                      type: "LOAD_ROM",
                      blob: this.pendingNdsRom.blob,
                      name: this.pendingNdsRom.name
                    }, "*");
                  }
                }
              } catch (e) {}
            };
            frame.onload = () => setTimeout(sendRomAndVolume, 400);
          }

          status.textContent = isLauncher
            ? "🎮 Console Nintendo DS (DeSmuME Desmond) prête | Insérez une cartouche ou glissez un .nds !"
            : `🎮 Relique DS : "${nomFichier}". Émulateur Desmond actif (Stylet sur écran bas).`;
          status.style.color = "#d4af37";
          this.jeuEnCoursNom = nomFichier;
          if (this.vitesseActuelle !== 1.0) {
            this.changerVitesse(this.vitesseActuelle);
          }
          if (this.afficherPerfFps) {
            this.demarrerMesurePerf();
          }
          this.rendreGrille();
          return;
        }

        if (cType === "psp") {
          container.classList.add("rv-is-psp");
          container.classList.remove("rv-is-nds");

          container.innerHTML = `
            <div class="rv-perf-hud" id="rv-perf-hud">
              <span class="rv-perf-dot" id="rv-perf-dot">🟢</span>
              <span class="rv-perf-text" id="rv-perf-text">60 FPS | 16.6 ms</span>
            </div>
            <div class="rv-psp-wrapper">
              <div class="rv-psp-ext-btn-wrap" style="position: absolute; top: 8px; right: 8px; z-index: 10;">
                <a href="emulators/psp/index.html?v=1.0" target="_blank" class="rv-btn rv-psp-ext-btn" style="font-size: 0.72rem; padding: 4px 8px; text-decoration: none;">⛶ Plein Écran Dédié</a>
              </div>
              <iframe id="rv-psp-frame" class="rv-embedded-frame" src="emulators/psp/index.html?v=1.0&embedded=1" allow="autoplay; fullscreen; gamepad; cross-origin-isolated" credentialless></iframe>
            </div>
          `;

          const frame = document.getElementById("rv-psp-frame");
          this.pendingPspRom = romBlob ? { blob: romBlob, name: nomFichier } : null;

          // Si connecté au Cloud VPS, rapatrier la dernière sauvegarde si disponible
          if (this.isCloudConnected()) {
            await this.verifierSauvegardeDistante(nomFichier);
          }

          // Charger la sauvegarde locale existante depuis IndexedDB
          try {
            const existingSave = await this.loadStateDB(nomFichier);
            this.pendingPspSave = (existingSave && (existingSave.sram || existingSave.state)) ? (existingSave.sram || existingSave.state) : null;
          } catch(e) {
            this.pendingPspSave = null;
          }

          if (frame) {
            const sendRomAndVolume = () => {
              try {
                if (frame.contentWindow) {
                  frame.contentWindow.postMessage({
                    type: "SET_VOLUME",
                    volume: this.volumeActuel
                  }, "*");
                  if (this.pendingPspSave) {
                    frame.contentWindow.postMessage({
                      type: "LOAD_PSP_SAVE",
                      data: Array.from(this.pendingPspSave)
                    }, "*");
                  }
                  if (this.pendingPspRom) {
                    frame.contentWindow.postMessage({
                      type: "LOAD_ROM",
                      blob: this.pendingPspRom.blob,
                      name: this.pendingPspRom.name
                    }, "*");
                  }
                }
              } catch (e) {}
            };
            frame.onload = () => setTimeout(sendRomAndVolume, 400);
          }

          status.textContent = isLauncher
            ? "🎮 Console PlayStation Portable (PPSSPP) prête | Insérez un disque ou glissez un .chd/.iso !"
            : `🎮 Relique PSP : "${nomFichier}". Moteur PPSSPP 60 FPS actif.`;
          status.style.color = "#d4af37";
          this.jeuEnCoursNom = nomFichier;
          if (this.vitesseActuelle !== 1.0) {
            this.changerVitesse(this.vitesseActuelle);
          }
          if (this.afficherPerfFps) {
            this.demarrerMesurePerf();
          }
          this.rendreGrille();
          return;
        }

        container.classList.remove("rv-is-nds");
        container.classList.remove("rv-is-psp");
        container.innerHTML = `
          <div class="rv-perf-hud" id="rv-perf-hud">
            <span class="rv-perf-dot" id="rv-perf-dot">🟢</span>
            <span class="rv-perf-text" id="rv-perf-text">60 FPS | 16.6 ms</span>
          </div>
          <div class="rv-crt-overlay" id="rv-crt"></div>
          <canvas id="rv-canvas"></canvas>
        `;

        this.jeuEnCoursNom = nomFichier;

        // Si connecté au Cloud VPS, rapatrier la dernière sauvegarde (SRAM & State) AVANT le lancement
        if (this.isCloudConnected()) {
          await this.verifierSauvegardeDistante(nomFichier);
        }

        const existingSave = await this.loadStateDB(nomFichier);
        const sramToInject = existingSave?.sram || (existingSave?.state && cType === "nds" ? existingSave.state : null);

        // Configuration RetroArch ergonomique (ZSQD + Pavé Numérique 8546 + Start B / Select V)
        const retroConfig = {
          input_player1_up: "w",
          input_player1_down: "s",
          input_player1_left: "a",
          input_player1_right: "d",
          input_player1_b: "k",
          input_player1_a: "l",
          input_player1_y: "i",
          input_player1_x: "o",
          input_player1_l: "u",
          input_player1_r: "p",
          input_player1_start: "b",
          input_player1_select: "v",
          input_load_state_key: "nul",
          input_save_state_key: "nul",
          input_load_state_btn: "nul",
          input_save_state_btn: "nul",
          input_reset_key: "nul",
          savestate_thumbnail_enable: false,
          savestate_auto_save: false,
          savestate_auto_load: false,
          autosave_interval: 5,
          fast_forward_ratio: 2.0,
          audio_volume: String(this.volumeActuel === 0 ? -80 : Math.max(-80, Math.min(12, Math.round(20 * Math.log10(this.volumeActuel)))))
        };

        const canvasEl = document.getElementById("rv-canvas");
        const romFile = romBlob instanceof File ? romBlob : new File([romBlob], nomFichier);

        const activeCheats = this.obtenirCheatsActifsPourJeu(nomFichier);
        const nostalgistOptions = {
          element: canvasEl,
          rom: romFile,
          retroarchConfig: retroConfig
        };
        if (activeCheats.length > 0) {
          nostalgistOptions.cheats = activeCheats.map(c => ({
            code: c.code,
            description: c.description || c.desc || "",
            enabled: true
          }));
        }
        if (sramToInject) {
          nostalgistOptions.sram = sramToInject;
        }

        if (cType === "snes") {
          this.partieEnCours = await Nostalgist.snes(nostalgistOptions);
        } else if (cType === "gba") {
          this.partieEnCours = await Nostalgist.gba(nostalgistOptions);
        } else if (cType === "gb") {
          this.partieEnCours = await Nostalgist.gbc(nostalgistOptions);
        } else if (cType === "megadrive") {
          this.partieEnCours = await Nostalgist.megadrive(nostalgistOptions);
        } else if (cType === "nes") {
          this.partieEnCours = await Nostalgist.nes(nostalgistOptions);
        } else if (cType === "ps1") {
          this.partieEnCours = await Nostalgist.launch({ core: "pcsx_rearmed", ...nostalgistOptions });
        } else if (cType === "pce") {
          this.partieEnCours = await Nostalgist.launch({ core: "mednafen_pce_fast", ...nostalgistOptions });
        } else {
          this.partieEnCours = await Nostalgist.launch({ core: conf.core, ...nostalgistOptions });
        }

        this.demarrerSramLoop();
        if (this.vitesseActuelle !== 1.0) {
          this.changerVitesse(this.vitesseActuelle);
        }
        if (this.afficherPerfFps) {
          this.demarrerMesurePerf();
        }

        const hasSram = !!(existingSave && existingSave.sram);
        const hasState = !!(existingSave && existingSave.state);
        if (hasSram && hasState) {
          status.textContent = `🎮 En cours : ${nomFichier} | 💾 Carte Mémoire chargée & État rapide prêt (F4)`;
          status.style.color = "#34d399";
        } else if (hasSram) {
          status.textContent = `🎮 En cours : ${nomFichier} | 💾 Carte Mémoire chargée (sauvegarde en jeu active)`;
          status.style.color = "#34d399";
        } else if (hasState) {
          status.textContent = `🎮 En cours : ${nomFichier} | 💾 Sauvegarde rapide disponible (F4 pour charger)`;
          status.style.color = "#34d399";
        } else {
          status.textContent = `🎮 En cours : ${nomFichier} (${conf.label}) | Sauvegarde automatique en jeu active !`;
          status.style.color = "#d4af37";
        }

        this.rendreGrille();
        setTimeout(() => this.appliquerVolume(this.volumeActuel, false), 500);
      } catch (err) {
        console.error(err);
        status.textContent = `❌ Erreur : ${err.message}`;
        status.style.color = "#ef4444";
      }
    }

    // --- Contrôle du Volume & Détection Manette ---
    appliquerVolume(vol, sauvegarder = true) {
      this.volumeActuel = Math.max(0, Math.min(1, Number(vol)));
      const slider = document.getElementById("rv-vol-slider");
      const valEl = document.getElementById("rv-vol-val");
      const btnMute = document.getElementById("rv-btn-mute");

      if (slider) slider.value = String(this.volumeActuel);
      if (valEl) valEl.textContent = Math.round(this.volumeActuel * 100) + "%";
      if (btnMute) btnMute.textContent = this.volumeActuel === 0 ? "🔇" : "🔊";
      const landMute = document.getElementById("rv-land-btn-mute");
      if (landMute) landMute.textContent = this.volumeActuel === 0 ? "🔇" : "🔊";

      if (sauvegarder) {
        try { localStorage.setItem("rv_volume", String(this.volumeActuel)); } catch(e) {}
      }

      // Si console DS ou PSP (iframe)
      if (this.jeuEnCoursType === "nds" || this.jeuEnCoursType === "psp") {
        const frame = document.getElementById(this.jeuEnCoursType === "nds" ? "rv-nds-frame" : "rv-psp-frame");
        if (frame && frame.contentWindow) {
          try {
            frame.contentWindow.postMessage({
              type: "SET_VOLUME",
              volume: this.volumeActuel
            }, "*");
          } catch(e) {}
        }
      }

      // Si console Nostalgist (OpenAL gain)
      try {
        const al = this.partieEnCours?.getEmscriptenAL?.();
        if (al && al.currentCtx && al.currentCtx.gain) {
          al.currentCtx.gain.gain.value = this.volumeActuel;
        }
      } catch(e) {}
    }

    demarrerGamepadLoop() {
      if (this.gamepadLoopId) return;

      const scan = () => {
        if (!this.modal || !this.modal.classList.contains("active")) {
          this.gamepadLoopId = null;
          return;
        }

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i] && gamepads[i].connected) {
            gp = gamepads[i];
            break;
          }
        }

        const gpBadge = document.getElementById("rv-gp-badge");
        const gpNameEl = document.getElementById("rv-gp-name");

        if (gp) {
          const id = (gp.id || "").toLowerCase();
          let brand = "Manette Connectée";
          if (id.includes("dualsense") || id.includes("054c") || id.includes("ps5") || (id.includes("wireless controller") && !id.includes("xbox"))) {
            brand = "PS5 DualSense";
          } else if (id.includes("dualshock") || id.includes("ps4") || id.includes("playstation")) {
            brand = "PlayStation";
          } else if (id.includes("xbox") || id.includes("x-box") || id.includes("045e")) {
            brand = "Xbox";
          } else if (id.includes("switch") || id.includes("pro controller") || id.includes("joy-con")) {
            brand = "Switch Pro";
          } else if (gp.id.length > 20) {
            brand = gp.id.substring(0, 18) + "...";
          }

          if (gpBadge && gpNameEl) {
            gpBadge.classList.add("connected");
            gpNameEl.textContent = brand;
          }

          if (brand !== this.lastGamepadBrand) {
            this.lastGamepadBrand = brand;
            const status = document.getElementById("rv-status");
            if (status) {
              status.textContent = `🎮 Manette physique détectée : ${brand} (Prête à jouer)`;
              status.style.color = "#34d399";
            }
          }

          // Si le focus est sur la fenêtre principale et qu'un jeu DS tourne dans l'iframe:
          // Transférer les inputs manette à l'iframe pour pallier la restriction de focus de Chrome!
          if (this.jeuEnCoursType === "nds") {
            const frame = document.getElementById("rv-nds-frame");
            if (frame && frame.contentWindow && document.hasFocus() && document.activeElement !== frame) {
              const b = {};
              if (gp.buttons) {
                for (let bi = 0; bi < gp.buttons.length; bi++) {
                  b[bi] = !!(gp.buttons[bi] && gp.buttons[bi].pressed);
                }
              }
              const ax = gp.axes ? [gp.axes[0] || 0, gp.axes[1] || 0, gp.axes[2] || 0, gp.axes[3] || 0] : [0, 0, 0, 0];
              try {
                frame.contentWindow.postMessage({
                  type: "GAMEPAD_FRAME",
                  gamepad: { id: gp.id, connected: true, buttons: b, axes: ax }
                }, "*");
              } catch(e) {}
            }
          }
        } else {
          if (gpBadge && gpNameEl) {
            gpBadge.classList.remove("connected");
            gpNameEl.textContent = "Aucune manette";
          }
          this.lastGamepadBrand = "";
        }

        this.gamepadLoopId = requestAnimationFrame(scan);
      };

      this.gamepadLoopId = requestAnimationFrame(scan);
    }

    arreterGamepadLoop() {
      if (this.gamepadLoopId) {
        cancelAnimationFrame(this.gamepadLoopId);
        this.gamepadLoopId = null;
      }
    }

    // --- Statut Unifié (Portrait, Paysage & Plein Écran) ---
    setStatutMessage(message, color = "#d4af37", tempReset = false) {
      const status = document.getElementById("rv-status");
      if (status) {
        status.textContent = message;
        status.style.color = color;
      }
      const landStatus = document.getElementById("rv-land-status");
      if (landStatus) {
        landStatus.textContent = message;
        landStatus.style.color = color;
        if (tempReset) {
          clearTimeout(this._landStatusTimer);
          this._landStatusTimer = setTimeout(() => {
            const ls = document.getElementById("rv-land-status");
            if (ls) {
              ls.textContent = "Sanctuaire";
              ls.style.color = "";
            }
          }, 3500);
        }
      }
    }

    // --- Sauvegarde & Restauration rapides avec Verrouillage Anti-Collision & Secours FS Direct ---
    async sauvegarderPartie() {
      if (this.isSavingState) return;
      this.isSavingState = true;

      const saveBtn = document.getElementById("rv-btn-save");
      const landSaveBtn = document.getElementById("rv-land-btn-save");
      if (saveBtn) { saveBtn.style.opacity = "0.5"; saveBtn.style.pointerEvents = "none"; }
      if (landSaveBtn) { landSaveBtn.style.opacity = "0.5"; landSaveBtn.style.pointerEvents = "none"; }

      try {
        if (this.jeuEnCoursType === "nds") {
          const frame = document.getElementById("rv-nds-frame");
          if (frame && frame.contentWindow) {
            try {
              frame.contentWindow.postMessage({ type: "REQUEST_DS_SAVE" }, "*");
              this.setStatutMessage("⏳ Sauvegarde de la cartouche DS vers le Sanctuaire...", "#d4af37");
            } catch (e) {}
          }
          return;
        }

        if (this.jeuEnCoursType === "psp") {
          const frame = document.getElementById("rv-psp-frame");
          if (frame && frame.contentWindow) {
            try {
              frame.contentWindow.postMessage({ type: "REQUEST_SAVE" }, "*");
              this.setStatutMessage("⏳ Sauvegarde du disque PSP vers le Sanctuaire...", "#d4af37");
            } catch (e) {}
          }
          return;
        }

        if (!this.partieEnCours) {
          this.setStatutMessage("💡 Sauvegarde intégrée dans le menu de la console.", "#d4af37");
          return;
        }

        this.setStatutMessage("⏳ Sauvegarde de l'état...", "#d4af37");

        // Si le jeu était en pause, reprendre temporairement pour permettre au moteur WASM d'écrire l'état
        const wasPaused = this.estEnPause;
        if (wasPaused && this.partieEnCours) {
          try { this.partieEnCours.resume(); } catch (e) {}
        }

        let stateObj = null;
        let lastError = null;

        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const res = await this.partieEnCours.saveState();
            if (res && res.state) {
              stateObj = res.state;
              break;
            }
          } catch (err) {
            lastError = err;
            // Secours FS Direct : si Nostalgist waitForFile a expiré mais que le fichier a bien été écrit par RetroArch
            try {
              const emulator = this.partieEnCours.getEmulator ? this.partieEnCours.getEmulator() : null;
              if (emulator && emulator.fs && emulator.stateFilePath) {
                const stats = emulator.fs.stat(emulator.stateFilePath);
                if (stats && stats.size > 0) {
                  const buffer = emulator.fs.readFile(emulator.stateFilePath, "binary").buffer;
                  if (buffer && buffer.byteLength > 0) {
                    stateObj = new Blob([buffer], { type: "application/octet-stream" });
                    emulator.clearStateFile();
                    break;
                  }
                }
              }
            } catch (fsErr) {}

            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, 200));
            }
          }
        }

        if (wasPaused && this.partieEnCours) {
          try { this.partieEnCours.pause(); } catch (e) {}
        }

        if (stateObj) {
          await this.saveStateDB(this.jeuEnCoursNom, stateObj);
          await this.extraireEtSauvegarderSRAM(this.jeuEnCoursNom, true);
          const timeStr = new Date().toLocaleTimeString();
          this.setStatutMessage(`✅ Sauvegarde d'état & Carte mémoire réussies (${timeStr}) !`, "#34d399", true);
          this.rendreGrille();
        } else {
          throw lastError || new Error("Délai de sauvegarde dépassé");
        }
      } catch (e) {
        this.setStatutMessage("❌ Erreur de sauvegarde : " + (e.message || "délai dépassé"), "#ef4444", true);
      } finally {
        setTimeout(() => {
          this.isSavingState = false;
          if (saveBtn) { saveBtn.style.opacity = ""; saveBtn.style.pointerEvents = ""; }
          if (landSaveBtn) { landSaveBtn.style.opacity = ""; landSaveBtn.style.pointerEvents = ""; }
        }, 300);
      }
    }

    async chargerPartie() {
      if (this.isLoadingState) return;
      this.isLoadingState = true;

      const loadBtn = document.getElementById("rv-btn-load");
      const landLoadBtn = document.getElementById("rv-land-btn-load");
      if (loadBtn) { loadBtn.style.opacity = "0.5"; loadBtn.style.pointerEvents = "none"; }
      if (landLoadBtn) { landLoadBtn.style.opacity = "0.5"; landLoadBtn.style.pointerEvents = "none"; }

      try {
        if (this.jeuEnCoursType === "nds") {
          try {
            const data = await this.loadStateDB(this.jeuEnCoursNom);
            if (!data || !data.state) {
              this.setStatutMessage("⚠️ Aucune sauvegarde trouvée pour cette cartouche DS dans le Sanctuaire.", "#fbbf24", true);
              return;
            }
            const frame = document.getElementById("rv-nds-frame");
            if (frame && frame.contentWindow) {
              frame.contentWindow.postMessage({
                type: "LOAD_DS_SAVE",
                data: Array.from(data.state)
              }, "*");
              this.setStatutMessage(`📂 Sauvegarde DS restaurée ! (${data.date})`, "#34d399", true);
            }
          } catch (e) {
            this.setStatutMessage("❌ Échec du chargement DS : " + e.message, "#ef4444", true);
          }
          return;
        }

        if (this.jeuEnCoursType === "psp") {
          try {
            const data = await this.loadStateDB(this.jeuEnCoursNom);
            if (!data || !data.state) {
              this.setStatutMessage("⚠️ Aucune sauvegarde trouvée pour cette relique PSP dans le Sanctuaire.", "#fbbf24", true);
              return;
            }
            const frame = document.getElementById("rv-psp-frame");
            if (frame && frame.contentWindow) {
              frame.contentWindow.postMessage({
                type: "LOAD_PSP_SAVE",
                data: Array.from(data.state)
              }, "*");
              this.setStatutMessage(`📂 Sauvegarde PSP restaurée ! (${data.date})`, "#34d399", true);
            }
          } catch (e) {
            this.setStatutMessage("❌ Échec du chargement PSP : " + e.message, "#ef4444", true);
          }
          return;
        }

        if (!this.partieEnCours) {
          this.setStatutMessage("💡 Chargement de sauvegarde intégré dans le menu de la console.", "#d4af37");
          return;
        }

        const data = await this.loadStateDB(this.jeuEnCoursNom);
        if (!data || (!data.state && !data.sram)) {
          this.setStatutMessage("⚠️ Aucune sauvegarde trouvée pour ce jeu.", "#fbbf24", true);
          return;
        }

        if (!data.state && data.sram) {
          this.setStatutMessage("💡 Carte mémoire en jeu active ! Chargez votre partie directement depuis le menu du jeu.", "#34d399", true);
          return;
        }

        this.setStatutMessage("⏳ Restauration de l'état...", "#d4af37");

        const wasPaused = this.estEnPause;
        if (wasPaused && this.partieEnCours) {
          try { this.partieEnCours.resume(); } catch (e) {}
        }

        let loaded = false;
        let lastErr = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            await this.partieEnCours.loadState(data.state);
            loaded = true;
            break;
          } catch (err) {
            lastErr = err;
            if (attempt < 2) await new Promise((r) => setTimeout(r, 200));
          }
        }

        if (wasPaused && this.partieEnCours) {
          try { this.partieEnCours.pause(); } catch (e) {}
        }

        if (loaded) {
          this.setStatutMessage(`📂 Sauvegarde restaurée ! (${data.date})`, "#34d399", true);
        } else {
          throw lastErr || new Error("Échec du chargement");
        }
      } catch (e) {
        this.setStatutMessage("❌ Échec du chargement : " + e.message, "#ef4444", true);
      } finally {
        setTimeout(() => {
          this.isLoadingState = false;
          if (loadBtn) { loadBtn.style.opacity = ""; loadBtn.style.pointerEvents = ""; }
          if (landLoadBtn) { landLoadBtn.style.opacity = ""; landLoadBtn.style.pointerEvents = ""; }
        }, 300);
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

      // Détection secrète Cloud Archiviste pendant la partie
      if (e.type === "keydown") {
        const lKey = (e.key || "").toLowerCase();
        if (lKey.length === 1 && lKey >= "a" && lKey <= "z") {
          this.cloudKeyBuffer = (this.cloudKeyBuffer + lKey).slice(-18);
          if (this.cloudKeyBuffer.length === 18) {
            this.verifyCloudHash(this.cloudKeyBuffer);
          }
        }
      }

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
      else if (e.code === "Numpad8" || e.code === "Digit8" || e.code === "KeyO") { btn = "x"; targetCode = "KeyO"; targetKey = "o"; }
      else if (e.code === "Numpad5" || e.code === "Digit5" || e.code === "KeyK") { btn = "b"; targetCode = "KeyK"; targetKey = "k"; }
      else if (e.code === "Numpad4" || e.code === "Digit4" || e.code === "KeyI") { btn = "y"; targetCode = "KeyI"; targetKey = "i"; }
      else if (e.code === "Numpad6" || e.code === "Digit6" || e.code === "KeyL") { btn = "a"; targetCode = "KeyL"; targetKey = "l"; }
      else if (e.code === "Numpad7" || e.code === "Digit7" || e.code === "KeyU") { btn = "l"; targetCode = "KeyU"; targetKey = "u"; }
      else if (e.code === "Numpad9" || e.code === "Digit9" || e.code === "KeyP") { btn = "r"; targetCode = "KeyP"; targetKey = "p"; }
      else if ((e.code === "Numpad4" || e.code === "Digit4" || e.code === "KeyI") && ["nes", "gb", "pce"].includes(this.jeuEnCoursType)) {
        btn = "b";
        targetCode = "KeyK";
        targetKey = "k";
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

    // --- Écran d'accueil du Sanctuaire (Hub de sélection des reliques) ---
    afficherEcranHub() {
      const container = document.getElementById("rv-game-container");
      if (!container) return;
      container.classList.remove("rv-is-nds");

      const isConnected = this.isCloudConnected();
      const user = localStorage.getItem("rv_vps_user") || "Hibouxe";
      const totalRoms = this.tousLesJeux.length;

      if (isConnected) {
        container.innerHTML = `
          <div class="rv-hub-standby" id="rv-hub-standby">
            <div class="rv-hub-crest">🦉</div>
            <h3 class="rv-hub-title">Sanctuaire des Reliques Privées</h3>
            <p class="rv-hub-desc">Bienvenue <strong>${user}</strong>. Votre coffre contient <strong>${totalRoms} reliques</strong> synchronisées avec votre VPS.</p>
            <div class="rv-hub-badges">
              <span class="rv-hub-badge-item">👑 Compte ${user}</span>
              <span class="rv-hub-badge-item">⚔️ Multi-Systèmes</span>
              <span class="rv-hub-badge-item">💾 Carte Mémoire Active</span>
              <span class="rv-hub-badge-item">☁️ Cloud VPS Souverain</span>
            </div>
            <div class="rv-hub-actions">
              <button class="rv-btn rv-btn-gold" id="rv-btn-hub-browse">📚 Choisir une relique</button>
              <button class="rv-btn" id="rv-btn-hub-cloud">⚙️ Coffre & Sauvegardes</button>
              <button class="rv-btn" id="rv-btn-hub-upload">📁 Insérer une ROM externe</button>
            </div>
          </div>
        `;
        const btnBrowse = document.getElementById("rv-btn-hub-browse");
        if (btnBrowse) {
          btnBrowse.addEventListener("click", () => {
            const lib = document.getElementById("rv-library");
            if (lib) lib.scrollIntoView({ behavior: "smooth" });
          });
        }
        const btnCloud = document.getElementById("rv-btn-hub-cloud");
        if (btnCloud) {
          btnCloud.addEventListener("click", () => this.openCloudArchivistModal());
        }
        this.setStatus(`👑 Sanctuaire Déverrouillé (${user}) | ${totalRoms} reliques prêtes`, "#34d399");
      } else {
        container.innerHTML = `
          <div class="rv-hub-standby" id="rv-hub-standby">
            <div class="rv-hub-crest">🦉</div>
            <h3 class="rv-hub-title">Sanctuaire Rétro WebAssembly</h3>
            <p class="rv-hub-desc">Glissez-déposez un fichier de jeu ou insérez votre cartouche pour lancer l'émulation.</p>
            <div class="rv-hub-actions">
              <button class="rv-btn rv-btn-gold" id="rv-btn-hub-upload">📁 Insérer une ROM (.nds, .sfc, .gba, .chd...)</button>
            </div>
          </div>
        `;
        this.setStatus("🎮 Prêt | Glissez un fichier ROM ou insérez une cartouche", "#d4af37");
      }

      const btnUpload = document.getElementById("rv-btn-hub-upload");
      if (btnUpload) {
        btnUpload.addEventListener("click", () => {
          const fileInput = document.getElementById("rv-file-input");
          if (fileInput) fileInput.click();
        });
      }
    }

    // --- Ouverture & Fermeture du Sanctuaire ---
    async open(bootFile = null) {
      this.injectDOM();
      this.modal.classList.add("active");
      document.body.style.overflow = "hidden";

      window.addEventListener("keydown", this.boundKeyHandler);
      window.addEventListener("keyup", this.boundKeyHandler);

      this.appliquerVolume(this.volumeActuel, false);
      this.demarrerGamepadLoop();

      // Charger la bibliothèque dynamique selon le compte actif (Invité vs Archiviste)
      await this.chargerBibliotheque();
      this.mettreAJourInterfaceCompte();
      this.rendreGrille();

      if (this.partieEnCours && !this.estEnPause) {
        try { this.partieEnCours.resume(); } catch (e) {}
      }

      if (this.afficherPerfFps) {
        this.demarrerMesurePerf();
      }

      // Synchronisation furtive automatique en arrière-plan si le Cloud est configuré
      if (this.isCloudConnected()) {
        this.syncVPSCloud({ silent: true }).catch(() => {});
      }

      if (bootFile) {
        this.tousLesJeux.unshift({
          nom: bootFile.name,
          titre: bootFile.name.replace(/\.[^/.]+$/, ""),
          console: this.identifierConsole(bootFile.name),
          desc: "Cartouche insérée furtivement dans le sanctuaire.",
          blob: bootFile
        });
        this.lancerPartie(bootFile.name, bootFile);
      } else {
        if (!this.partieEnCours) {
          this.afficherEcranHub();
        }
      }
    }

    close() {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch(e) {}
      }
      if (this.modal) {
        this.modal.classList.remove("active");
      }
      document.body.style.overflow = "";

      if (this.partieEnCours && this.jeuEnCoursNom) {
        this.extraireEtSauvegarderSRAM(this.jeuEnCoursNom, true).catch(() => {});
      }
      this.arreterSramLoop();

      if (this.partieEnCours) {
        try { this.partieEnCours.pause(); } catch (e) {}
      }

      this.arreterGamepadLoop();
      this.arreterMesurePerf();
      this.closeOptionsModal();
      if (this.modal) {
        this.modal.classList.remove("rv-mobile-landscape-fullscreen");
      }
      this.pendingNdsRom = null;

      if (this.jeuEnCoursType === "nds") {
        const frame = document.getElementById("rv-nds-frame");
        if (frame && frame.contentWindow) {
          try { frame.contentWindow.postMessage({ type: "REQUEST_DS_SAVE" }, "*"); } catch (e) {}
        }
      }

      const activeFrame = document.getElementById("rv-nds-frame");
      if (activeFrame) {
        setTimeout(() => {
          try { activeFrame.src = "about:blank"; } catch(e) {}
        }, 250);
      }

      window.removeEventListener("keydown", this.boundKeyHandler);
      window.removeEventListener("keyup", this.boundKeyHandler);
    }
  }

  window.RetroVaultEngine = new RetroVault();
})();
