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
      nom: "Dragon Quest - The Chapters of the Chosen (E).nds",
      titre: "Dragon Quest IV : L'Épopée des Élus (DS)",
      console: "nds",
      desc: "Le remake culte sur Nintendo DS en 3D avec les cinq chapitres narratifs des élus (2008)."
    },
    {
      nom: "Dragon Quest V - The Hand of the Heavenly Bride (EU)(M5).nds",
      titre: "Dragon Quest V : La Fiancée Céleste (DS)",
      console: "nds",
      desc: "L'épopée magistrale sur trois générations adaptée en 3D sur Nintendo DS (2009)."
    },
    {
      nom: "Dragon Quest VI - Realms of Reverie (E).nds",
      titre: "Dragon Quest VI : Le Royaume des Songes (DS)",
      console: "nds",
      desc: "L'aventure entre le monde réel et le monde des songes sur Nintendo DS (2011)."
    },
    {
      nom: "Dragon Quest IX - Sentinels of the Starry Skies (Europe) (En,Fr,De,Es,It).nds",
      titre: "Dragon Quest IX : Les Sentinelles du Firmament (DS)",
      console: "nds",
      desc: "L'immense aventure RPG de Level-5 et Square Enix taillée pour la Nintendo DS (2010)."
    },
    {
      nom: "Tekken 3 (Europe).chd",
      titre: "Tekken 3",
      console: "ps1",
      desc: "Le titan absolu du jeu de combat 3D sur PlayStation 1 par Namco (1998)."
    },
    {
      nom: "MediEvil (France).chd",
      titre: "MediEvil",
      console: "ps1",
      desc: "L'épopée gothique et burlesque de Sir Daniel Fortesque à Gallowmere (1998)."
    },
    {
      nom: "Bomberman (Europe) (En,Fr,De,Es,It).iso",
      titre: "Bomberman World",
      console: "ps1",
      desc: "Le classique d'action explosive multijoueur sur PlayStation 1 (1998)."
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
      titre: "Dragon Quest V : La Fiancée Céleste (SNES)",
      console: "snes",
      desc: "L'épopée sur trois générations d'Horie, Toriyama et Sugiyama (1992)."
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
      titre: "Dragon Quest IV : Chapters of the Chosen (NES)",
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
      this.version = "8.9-vps-vault-cdn";
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
      this.volumeActuel = 0.8;
      this.volumePrecedent = 0.8;
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

      // Écoute des messages DS pour sauvegarde et synchronisation
      window.addEventListener("message", async (e) => {
        if (!e.data) return;
        if (e.data.type === "DS_SAVE_DATA" || e.data.type === "DS_AUTO_SAVE") {
          const saveBytes = e.data.data;
          const gameName = e.data.name || this.jeuEnCoursNom;
          if (saveBytes && gameName) {
            try {
              const uint8 = new Uint8Array(saveBytes);
              await this.saveStateDB(gameName, uint8);
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

    async saveStateDB(key, blob, customDate = null, skipCloudUpload = false) {
      const db = await this.getDB();
      const dateStr = customDate || new Date().toLocaleString();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        tx.objectStore(this.storeName).put({ state: blob, date: dateStr, timestamp: Date.now() }, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // Synchronisation furtive vers GitHub Gist si le Cloud personnel est connecté
      if (!skipCloudUpload && localStorage.getItem("rv_cloud_token")) {
        this.uploadSaveToCloud(key, blob, dateStr).catch(() => {});
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
    // SCEAU D'ARCHIVISTE — SYNCHRONISATION CLOUD PRIVÉE (GITHUB GIST)
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

    async connectGitHubGist(token) {
      const cleanToken = token.trim();
      if (!cleanToken) throw new Error("Veuillez renseigner un token GitHub valide.");

      // 1. Valider l'identité GitHub
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: "application/vnd.github+json"
        }
      });
      if (!userRes.ok) throw new Error("Token GitHub invalide ou expiré (Code HTTP " + userRes.status + ")");
      const userData = await userRes.json();

      // 2. Chercher un Gist existant pour les sauvegardes
      let gistId = null;
      const listRes = await fetch("https://api.github.com/gists?per_page=100", {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: "application/vnd.github+json"
        }
      });
      if (listRes.ok) {
        const gists = await listRes.json();
        const found = gists.find(g => 
          (g.description && g.description.includes("[Hibou RetroVault]")) ||
          (g.files && g.files["hibou_vault_saves.json"])
        );
        if (found) gistId = found.id;
      }

      // 3. Créer le Gist s'il n'existe pas encore
      if (!gistId) {
        const createRes = await fetch("https://api.github.com/gists", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            Accept: "application/vnd.github+json"
          },
          body: JSON.stringify({
            description: "[Hibou RetroVault] Archives secrètes des sauvegardes",
            public: false,
            files: {
              "hibou_vault_saves.json": {
                content: JSON.stringify({
                  owner: userData.login,
                  created_at: new Date().toISOString(),
                  saves: {}
                })
              }
            }
          })
        });
        if (!createRes.ok) throw new Error("Impossible de créer le Gist privé (vérifiez la permission 'gist' de votre token).");
        const newGist = await createRes.json();
        gistId = newGist.id;
      }

      localStorage.setItem("rv_cloud_token", cleanToken);
      localStorage.setItem("rv_cloud_gist_id", gistId);
      localStorage.setItem("rv_cloud_user", userData.login || "Archiviste");

      // Synchroniser immédiatement toutes les sauvegardes existantes
      await this.syncCloudSaves({ silent: false });
      return { user: userData.login, gistId };
    }

    async syncCloudSaves({ silent = false } = {}) {
      const token = localStorage.getItem("rv_cloud_token");
      const gistId = localStorage.getItem("rv_cloud_gist_id");
      if (!token || !gistId || this.cloudSyncing) return;

      this.cloudSyncing = true;
      const status = document.getElementById("rv-status");
      if (!silent && status) {
        status.textContent = "⏳ Synchronisation céleste avec GitHub Gist...";
        status.style.color = "#d4af37";
      }

      try {
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json"
          }
        });
        if (!res.ok) throw new Error("Échec de récupération du Gist Cloud.");
        const gist = await res.json();
        const file = gist.files && gist.files["hibou_vault_saves.json"];
        let cloudData = { saves: {} };
        if (file && file.content) {
          try { cloudData = JSON.parse(file.content); } catch (e) {}
        }
        cloudData.saves = cloudData.saves || {};

        const localSaves = await this.getAllStatesDB();
        let importedCount = 0;
        let exportedCount = 0;

        // 1. Cloud -> Local (importer les sauvegardes distantes si plus récentes ou absentes)
        for (const [key, cSave] of Object.entries(cloudData.saves)) {
          const lSave = localSaves[key];
          const cTime = cSave.timestamp || 0;
          const lTime = (lSave && lSave.timestamp) || 0;

          if (!lSave || cTime > lTime) {
            const cType = this.identifierConsole(key);
            const stateObj = this.base64ToState(cSave.data, cType);
            if (stateObj) {
              await this.saveStateDB(key, stateObj, cSave.date, true);
              importedCount++;
            }
          }
        }

        // 2. Local -> Cloud (exporter les sauvegardes locales si absentes du cloud ou plus récentes)
        let hasExportChanges = false;
        for (const [key, lSave] of Object.entries(localSaves)) {
          const cSave = cloudData.saves[key];
          const cTime = (cSave && cSave.timestamp) || 0;
          const lTime = lSave.timestamp || 0;

          if (!cSave || lTime > cTime) {
            const b64 = await this.stateToBase64(lSave.state);
            if (b64) {
              cloudData.saves[key] = {
                date: lSave.date || new Date().toLocaleString(),
                timestamp: lTime || Date.now(),
                data: b64
              };
              hasExportChanges = true;
              exportedCount++;
            }
          }
        }

        if (hasExportChanges) {
          cloudData.updated_at = new Date().toISOString();
          await fetch(`https://api.github.com/gists/${gistId}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json"
            },
            body: JSON.stringify({
              files: {
                "hibou_vault_saves.json": {
                  content: JSON.stringify(cloudData)
                }
              }
            })
          });
        }

        localStorage.setItem("rv_cloud_last_sync", new Date().toLocaleString());
        this.rendreGrille();

        if (status) {
          const totalGames = Object.keys(cloudData.saves).length;
          status.textContent = `☁️ Sanctuaire Cloud synchronisé (${totalGames} jeux archivés) !`;
          status.style.color = "#34d399";
        }
      } catch (err) {
        console.warn("Cloud sync error:", err);
        if (!silent && status) {
          status.textContent = `⚠️ Erreur Cloud : ${err.message}`;
          status.style.color = "#fbbf24";
        }
      } finally {
        this.cloudSyncing = false;
      }
    }

    async uploadSaveToCloud(nomFichier, stateObj, dateStr) {
      const token = localStorage.getItem("rv_cloud_token");
      const gistId = localStorage.getItem("rv_cloud_gist_id");
      if (!token || !gistId) return;

      try {
        const b64 = await this.stateToBase64(stateObj);
        if (!b64) return;

        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json"
          }
        });
        if (!res.ok) return;
        const gist = await res.json();
        const file = gist.files && gist.files["hibou_vault_saves.json"];
        let cloudData = { saves: {} };
        if (file && file.content) {
          try { cloudData = JSON.parse(file.content); } catch (e) {}
        }
        cloudData.saves = cloudData.saves || {};
        cloudData.saves[nomFichier] = {
          date: dateStr || new Date().toLocaleString(),
          timestamp: Date.now(),
          data: b64
        };
        cloudData.updated_at = new Date().toISOString();

        await fetch(`https://api.github.com/gists/${gistId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json"
          },
          body: JSON.stringify({
            files: {
              "hibou_vault_saves.json": {
                content: JSON.stringify(cloudData)
              }
            }
          })
        });

        localStorage.setItem("rv_cloud_last_sync", new Date().toLocaleString());
        const status = document.getElementById("rv-status");
        if (status) {
          status.textContent = `☁️ Sauvegarde synchronisée sur GitHub Gist (${new Date().toLocaleTimeString()})`;
          status.style.color = "#34d399";
        }
      } catch (err) {
        console.warn("Erreur envoi Cloud background:", err);
      }
    }

    disconnectCloud() {
      localStorage.removeItem("rv_cloud_token");
      localStorage.removeItem("rv_cloud_gist_id");
      localStorage.removeItem("rv_cloud_user");
      localStorage.removeItem("rv_cloud_last_sync");
      const status = document.getElementById("rv-status");
      if (status) {
        status.textContent = "🔌 Synchronisation Cloud déconnectée sur ce périphérique.";
        status.style.color = "#a8b8ad";
      }
    }

    openCloudArchivistModal() {
      let modal = document.getElementById("rv-cloud-modal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "rv-cloud-modal";
        document.body.appendChild(modal);
      }

      const token = localStorage.getItem("rv_cloud_token");
      const gistId = localStorage.getItem("rv_cloud_gist_id") || "";
      const user = localStorage.getItem("rv_cloud_user") || "Archiviste";
      const lastSync = localStorage.getItem("rv_cloud_last_sync") || "Jamais";
      const isConnected = !!token && !!gistId;

      modal.innerHTML = `
        <div class="rv-cloud-backdrop" id="rv-cloud-backdrop"></div>
        <div class="rv-cloud-dialog">
          <div class="rv-cloud-header">
            <div class="rv-cloud-title-wrap">
              <span class="rv-cloud-sigil">🦉</span>
              <div>
                <h3 class="rv-cloud-title">Sceau d'Archiviste</h3>
                <div class="rv-cloud-subtitle">Liaison Céleste Privée (GitHub Gist)</div>
              </div>
            </div>
            <button class="rv-cloud-close" id="rv-cloud-close-btn" title="Fermer">✖</button>
          </div>

          <div class="rv-cloud-body">
            ${isConnected ? `
              <div class="rv-cloud-status-box active">
                <div class="rv-cloud-status-icon">🟢</div>
                <div>
                  <div style="font-weight: 600; color: #34d399;">Sanctuaire Connecté à GitHub Gist</div>
                  <div style="font-size: 0.8rem; color: #a8b8ad; margin-top: 2px;">
                    Archiviste : <strong style="color: #d4af37;">${user}</strong> | Gist : <code>${gistId.substring(0, 10)}...</code>
                  </div>
                  <div style="font-size: 0.76rem; color: #778; margin-top: 2px;">
                    Dernière synchronisation : ${lastSync}
                  </div>
                </div>
              </div>

              <p style="font-size: 0.85rem; color: #c4d4c8; line-height: 1.5; margin: 16px 0 20px;">
                Toutes vos sauvegardes de jeux (DS, SNES, GBA, etc.) sont synchronisées en continu et de manière totalement invisible avec votre Gist privé. Les visiteurs réguliers ne voient rien et restent en local.
              </p>

              <div class="rv-cloud-actions">
                <button class="rv-btn rv-btn-gold" id="rv-cloud-btn-sync">🔄 Synchroniser Maintenant</button>
                <button class="rv-btn" id="rv-cloud-btn-disconnect" style="color: #f87171; border-color: rgba(248, 113, 113, 0.4);">🔌 Déconnecter</button>
              </div>
            ` : `
              <p style="font-size: 0.86rem; color: #c4d4c8; line-height: 1.5; margin-bottom: 16px;">
                Bienvenue Quentin. Pour synchroniser vos sauvegardes entre votre PC, Mac et mobile sans serveur ni visibilité pour les visiteurs, entrez votre <strong>GitHub Personal Access Token (PAT)</strong> avec le droit <code>gist</code> uniquement.
              </p>

              <div style="margin-bottom: 14px;">
                <label style="display: block; font-size: 0.78rem; color: #d4af37; margin-bottom: 6px; letter-spacing: 0.5px;">
                  🔑 Token Personnel GitHub (droit 'gist') :
                </label>
                <input type="password" id="rv-cloud-token-input" placeholder="ghp_... ou github_pat_..." class="rv-cloud-input" autocomplete="off">
              </div>

              <div class="rv-cloud-actions">
                <button class="rv-btn rv-btn-gold" id="rv-cloud-btn-connect">🔮 Lier le Sanctuaire au Cloud</button>
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
            font-family: monospace;
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
        `;
        document.head.appendChild(s);
      }

      const close = () => { modal.style.display = "none"; };
      document.getElementById("rv-cloud-close-btn").onclick = close;
      document.getElementById("rv-cloud-backdrop").onclick = close;

      const feedback = document.getElementById("rv-cloud-feedback");

      const btnConnect = document.getElementById("rv-cloud-btn-connect");
      if (btnConnect) {
        btnConnect.onclick = async () => {
          const inp = document.getElementById("rv-cloud-token-input");
          const val = (inp ? inp.value : "").trim();
          if (!val) {
            feedback.textContent = "⚠️ Veuillez coller votre token GitHub.";
            feedback.style.color = "#fbbf24";
            return;
          }
          btnConnect.disabled = true;
          btnConnect.textContent = "⏳ Vérification du Gist...";
          feedback.textContent = "Connexion à GitHub en cours...";
          feedback.style.color = "#d4af37";
          try {
            const res = await this.connectGitHubGist(val);
            feedback.textContent = `✅ Sanctuaire lié à GitHub Gist (${res.user}) ! Synchronisation active.`;
            feedback.style.color = "#34d399";
            setTimeout(() => this.openCloudArchivistModal(), 1500);
          } catch (err) {
            feedback.textContent = `❌ Erreur : ${err.message}`;
            feedback.style.color = "#ef4444";
            btnConnect.disabled = false;
            btnConnect.textContent = "🔮 Lier le Sanctuaire au Cloud";
          }
        };
      }

      const btnSync = document.getElementById("rv-cloud-btn-sync");
      if (btnSync) {
        btnSync.onclick = async () => {
          btnSync.disabled = true;
          btnSync.textContent = "⏳ Synchronisation...";
          feedback.textContent = "Synchronisation bidirectionnelle en cours...";
          feedback.style.color = "#d4af37";
          try {
            await this.syncCloudSaves({ silent: false });
            feedback.textContent = "✅ Synchronisation réussie avec GitHub Gist !";
            feedback.style.color = "#34d399";
            setTimeout(() => this.openCloudArchivistModal(), 1200);
          } catch(err) {
            feedback.textContent = `❌ Erreur : ${err.message}`;
            feedback.style.color = "#ef4444";
          } finally {
            btnSync.disabled = false;
            btnSync.textContent = "🔄 Synchroniser Maintenant";
          }
        };
      }

      const btnDisconnect = document.getElementById("rv-cloud-btn-disconnect");
      if (btnDisconnect) {
        btnDisconnect.onclick = () => {
          if (confirm("Déconnecter la synchronisation Cloud de cet appareil ? Vos sauvegardes locales seront conservées.")) {
            this.disconnectCloud();
            this.openCloudArchivistModal();
          }
        };
      }
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
                  <button class="rv-land-btn" id="rv-land-btn-pause" title="Pause / Reprendre">⏸️</button>
                  <button class="rv-land-btn" id="rv-land-btn-mute" title="Couper ou rétablir le son">🔊</button>
                  <button class="rv-land-btn" id="rv-land-btn-fs" title="Plein Écran unifié">⛶</button>
                  <button class="rv-land-btn rv-land-btn-close" id="rv-land-btn-close" title="Fermer le sanctuaire">✕</button>
                </div>
              </div>

              <!-- Écran de jeu -->
              <div class="rv-screen-wrapper">
                <div id="rv-game-container">
                  <div class="rv-crt-overlay" id="rv-crt"></div>
                  <canvas id="rv-canvas"></canvas>
                </div>
                <div class="rv-status" id="rv-status">Sélectionnez une relique ou déposez un fichier ROM pour démarrer</div>

                <!-- Barre d'actions standard (portrait / bureau) -->
                <div class="rv-toolbar">
                  <div class="rv-tool-group">
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

    // --- Téléchargement résilient de ROM (Local ou CDN VPS distant) avec jauge de progression ---
    async fetchRomBlob(nomFichier, onProgress) {
      const urls = [
        "assets/vault/" + encodeURI(nomFichier),
        "https://quentinbeaud.com/assets/vault/" + encodeURI(nomFichier),
        "https://roms.quentinbeaud.com/vault/" + encodeURI(nomFichier)
      ];

      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;

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
          // Si cette URL échoue (ex: CORS ou offline), essayer la suivante
        }
      }
      throw new Error(`Fichier ROM "${nomFichier}" introuvable dans le Sanctuaire.`);
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

        const isLauncher = nomFichier.includes("console-nds-launcher");
        let romBlob = customBlob;

        if (!romBlob && !isLauncher) {
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
            <div class="rv-nds-wrapper">
              <div class="rv-nds-ext-btn-wrap" style="position: absolute; top: 8px; right: 8px; z-index: 10;">
                <a href="emulators/ds/index.html?v=8.9" target="_blank" class="rv-btn rv-nds-ext-btn" style="font-size: 0.72rem; padding: 4px 8px; text-decoration: none;">⛶ Plein Écran Dédié</a>
              </div>
              <iframe id="rv-nds-frame" class="rv-embedded-frame" src="emulators/ds/index.html?v=8.9&embedded=1" allow="autoplay; fullscreen; gamepad"></iframe>
            </div>
          `;

          const frame = document.getElementById("rv-nds-frame");
          this.pendingNdsRom = romBlob ? { blob: romBlob, name: nomFichier } : null;

          // Charger la sauvegarde locale existante depuis IndexedDB
          try {
            const existingSave = await this.loadStateDB(nomFichier);
            this.pendingNdsSave = (existingSave && existingSave.state) ? existingSave.state : null;
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
          this.rendreGrille();
          return;
        }

        container.classList.remove("rv-is-nds");
        container.innerHTML = `
          <div class="rv-crt-overlay" id="rv-crt"></div>
          <canvas id="rv-canvas"></canvas>
        `;

        this.jeuEnCoursNom = nomFichier;

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
          audio_volume: String(this.volumeActuel === 0 ? -80 : Math.max(-80, Math.min(12, Math.round(20 * Math.log10(this.volumeActuel)))))
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

      // Si console DS (iframe)
      if (this.jeuEnCoursType === "nds") {
        const frame = document.getElementById("rv-nds-frame");
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
          const timeStr = new Date().toLocaleTimeString();
          this.setStatutMessage(`✅ Sauvegarde réussie (${timeStr}) !`, "#34d399", true);
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

        if (!this.partieEnCours) {
          this.setStatutMessage("💡 Chargement de sauvegarde intégré dans le menu de la console.", "#d4af37");
          return;
        }

        const data = await this.loadStateDB(this.jeuEnCoursNom);
        if (!data || !data.state) {
          this.setStatutMessage("⚠️ Aucune sauvegarde trouvée pour ce jeu.", "#fbbf24", true);
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

    // --- Ouverture & Fermeture du Sanctuaire ---
    open(bootFile = null) {
      this.injectDOM();
      this.modal.classList.add("active");
      document.body.style.overflow = "hidden";

      window.addEventListener("keydown", this.boundKeyHandler);
      window.addEventListener("keyup", this.boundKeyHandler);

      this.appliquerVolume(this.volumeActuel, false);
      this.demarrerGamepadLoop();
      this.rendreGrille();

      if (this.partieEnCours && !this.estEnPause) {
        try { this.partieEnCours.resume(); } catch (e) {}
      }

      // Synchronisation furtive automatique en arrière-plan si le Cloud est configuré
      if (localStorage.getItem("rv_cloud_token")) {
        this.syncCloudSaves({ silent: true }).catch(() => {});
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
      } else if (!this.partieEnCours && this.tousLesJeux.length > 0) {
        this.lancerPartie(this.tousLesJeux[0].nom);
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

      if (this.partieEnCours) {
        try { this.partieEnCours.pause(); } catch (e) {}
      }

      this.arreterGamepadLoop();
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
