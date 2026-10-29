(function () {
  "use strict";

  class EasterEggsManager {
    constructor() {
      this.konamiCode = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
      this.konamiIndex = 0;
      this.arcadeCode = ["a", "r", "c", "a", "d", "e"];
      this.snakeCode = ["s", "n", "a", "k", "e"];
      this.vectrexCode = ["v", "e", "c", "t", "r", "e", "x"];
      this.arcadeIndex = 0;
      this.snakeIndex = 0;
      this.vectrexIndex = 0;
      this.logoTapCount = 0;
      this.logoTapTimer = null;
      this.owlTapCount = 0;
      this.owlTapTimer = null;
      this.vectrexTapCount = 0;
      this.vectrexTapTimer = null;

      // Détecteur cryptographique furtif (tampon circulaire de 13 caractères)
      this.vaultKeyBuffer = "";
      // Empreinte SHA-256 secrète
      this.vaultSha256 = "96f91d14f1f678c058c24c447fc0605b4a13bbeec9e1111e65e5dfeb1cd31937";

      // Détecteur cryptographique Cloud Archiviste (tampon circulaire de 18 caractères)
      this.cloudKeyBuffer = "";
      this.cloudSha256 = "e4d8de0fcd22fe4e48bf23e6e8a1d97db92c980a668abc32d1977466e362339e";
    }

    init() {
      this.bindKeyboardSecrets();
      this.bindTouchSecrets();
      this.bindCartridgeDrop();
      this.checkUrlHashSecret();
      this.logConsoleHint();
    }

    checkUrlHashSecret() {
      const checkHash = async () => {
        const rawHash = (window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
        if (!rawHash) return;
        try {
          const msgUint8 = new TextEncoder().encode(rawHash);
          const hashBuf = await crypto.subtle.digest("SHA-256", msgUint8);
          const hashHex = Array.from(new Uint8Array(hashBuf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          if (hashHex === this.vaultSha256) {
            // Nettoyer discrètement l'URL sans recharger la page
            try {
              history.replaceState(null, document.title, window.location.pathname + window.location.search);
            } catch (e) {
              window.location.hash = "";
            }
            this.openRetroVault();
            return;
          }

          if (hashHex === this.cloudSha256) {
            try {
              history.replaceState(null, document.title, window.location.pathname + window.location.search);
            } catch (e) {
              window.location.hash = "";
            }
            this.triggerCloudArchivist();
            return;
          }
        } catch (e) {}
      };

      checkHash();
      window.addEventListener("hashchange", checkHash);
    }

    logConsoleHint() {
      console.log(
        "%c🦉 Bienvenue dans les archives du Hibou ! Secrets disponibles : A-R-C-A-D-E | V-E-C-T-R-E-X | Konami Code",
        "color: #d4af37; font-size: 13px; font-weight: bold; background: #0b1810; padding: 8px 12px; border: 1px solid #d4af37; border-radius: 4px;"
      );
    }

    bindKeyboardSecrets() {
      document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        const key = e.key;
        const lowerKey = key.toLowerCase();

        // 1. Détection cryptographique SHA-256 (aucun mot en clair dans le code)
        if (lowerKey.length === 1 && lowerKey >= "a" && lowerKey <= "z") {
          this.vaultKeyBuffer = (this.vaultKeyBuffer + lowerKey).slice(-13);
          if (this.vaultKeyBuffer.length === 13) {
            this.verifyVaultHash(this.vaultKeyBuffer);
          }

          this.cloudKeyBuffer = (this.cloudKeyBuffer + lowerKey).slice(-18);
          if (this.cloudKeyBuffer.length === 18) {
            this.verifyCloudHash(this.cloudKeyBuffer);
          }
        }

        // 2. Konami Code
        if (key === this.konamiCode[this.konamiIndex]) {
          this.konamiIndex++;
          if (this.konamiIndex === this.konamiCode.length) {
            if (window.portfolioTracker) window.portfolioTracker.track("easter_egg", { egg: "konami" });
            this.triggerSecretOwlAnimation(window.innerWidth / 2, window.innerHeight / 2);
            this.konamiIndex = 0;
          }
        } else {
          this.konamiIndex = 0;
        }

        // 3. Arcade
        if (lowerKey === this.arcadeCode[this.arcadeIndex]) {
          this.arcadeIndex++;
          if (this.arcadeIndex === this.arcadeCode.length) {
            if (window.portfolioTracker) window.portfolioTracker.track("easter_egg", { egg: "arcade_keyboard" });
            if (window.arcadeEngine) window.arcadeEngine.openMenu();
            this.arcadeIndex = 0;
          }
        } else {
          this.arcadeIndex = lowerKey === "a" ? 1 : 0;
        }

        // 4. Snake
        if (lowerKey === this.snakeCode[this.snakeIndex]) {
          this.snakeIndex++;
          if (this.snakeIndex === this.snakeCode.length) {
            if (window.portfolioTracker) window.portfolioTracker.track("easter_egg", { egg: "snake_keyboard" });
            if (window.arcadeEngine) window.arcadeEngine.launchGame("snake");
            this.snakeIndex = 0;
          }
        } else {
          this.snakeIndex = lowerKey === "s" ? 1 : 0;
        }

        // 5. Vectrex
        if (lowerKey === this.vectrexCode[this.vectrexIndex]) {
          this.vectrexIndex++;
          if (this.vectrexIndex === this.vectrexCode.length) {
            if (window.portfolioTracker) window.portfolioTracker.track("easter_egg", { egg: "vectrex_keyboard" });
            if (window.vectrexEngine) window.vectrexEngine.open();
            this.vectrexIndex = 0;
          }
        } else {
          this.vectrexIndex = lowerKey === "v" ? 1 : 0;
        }
      });
    }

    async verifyVaultHash(str) {
      try {
        const msgUint8 = new TextEncoder().encode(str);
        const hashBuf = await crypto.subtle.digest("SHA-256", msgUint8);
        const hashHex = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        if (hashHex === this.vaultSha256) {
          this.openRetroVault();
        }
      } catch (e) {}
    }

    async verifyCloudHash(str) {
      try {
        const msgUint8 = new TextEncoder().encode(str);
        const hashBuf = await crypto.subtle.digest("SHA-256", msgUint8);
        const hashHex = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        if (hashHex === this.cloudSha256) {
          this.triggerCloudArchivist();
        }
      } catch (e) {}
    }

    triggerCloudArchivist() {
      this.openRetroVault();
      const checkAndOpen = () => {
        if (window.RetroVaultEngine && typeof window.RetroVaultEngine.openCloudArchivistModal === "function") {
          window.RetroVaultEngine.openCloudArchivistModal();
        } else {
          setTimeout(checkAndOpen, 100);
        }
      };
      setTimeout(checkAndOpen, 300);
    }

    bindCartridgeDrop() {
      // Détection de glisser-déposer furtif de ROMs
      window.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      window.addEventListener("drop", (e) => {
        e.preventDefault();
        if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
        const file = e.dataTransfer.files[0];
        const ext = file.name.split(".").pop().toLowerCase();
        const validExtensions = ["nes", "sfc", "smc", "gba", "gb", "gbc", "md", "bin", "gen", "zip", "iso", "cue", "chd", "pbp", "img", "pce", "nds", "cso"];

        if (validExtensions.includes(ext)) {
          this.openRetroVault(file);
        }
      });
    }

    openRetroVault(bootFile = null) {
      if (window.portfolioTracker) {
        window.portfolioTracker.track("easter_egg", { egg: "retro_vault_unlocked" });
      }
      if (window.audioManager) {
        window.audioManager.play("coin");
      }

      if (window.RetroVaultEngine && typeof window.RetroVaultEngine.open === "function") {
        window.RetroVaultEngine.open(bootFile);
        return;
      }

      // Si une instance obsolète existe en mémoire, la détruire proprement
      if (window.RetroVaultEngine) {
        try {
          if (typeof window.RetroVaultEngine.close === "function") {
            window.RetroVaultEngine.close();
          }
        } catch (e) {}
        const oldModal = document.getElementById("retro-vault-modal");
        if (oldModal) oldModal.remove();
        window.RetroVaultEngine = null;
      }

      const oldScript = document.getElementById("retro-vault-script");
      if (oldScript) oldScript.remove();

      const loadScript = (id, src) =>
        new Promise((resolve, reject) => {
          const old = document.getElementById(id);
          if (old) old.remove();
          const s = document.createElement("script");
          s.id = id;
          s.src = src;
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });

      loadScript("nostalgist-script", "https://cdn.jsdelivr.net/npm/nostalgist/dist/nostalgist.umd.js")
        .then(() => loadScript("retro-vault-script", "js/retro-vault.js?v=9.0&t=" + Date.now()))
        .then(() => {
          if (window.RetroVaultEngine) {
            window.RetroVaultEngine.open(bootFile);
          }
        });
    }

    bindTouchSecrets() {
      const logo = document.querySelector(".logo");
      if (logo) {
        logo.addEventListener("click", (e) => {
          this.logoTapCount++;
          clearTimeout(this.logoTapTimer);
          if (this.logoTapCount >= 5) {
            if (window.portfolioTracker) window.portfolioTracker.track("easter_egg", { egg: "logo_tap" });
            this.triggerSecretOwlAnimation(e.clientX, e.clientY);
            this.logoTapCount = 0;
          }
          this.logoTapTimer = setTimeout(() => {
            this.logoTapCount = 0;
          }, 900);
        });
      }

      const footerOwl = document.getElementById("hidden-owl");
      if (footerOwl) {
        footerOwl.addEventListener("click", (e) => {
          this.owlTapCount++;
          clearTimeout(this.owlTapTimer);
          footerOwl.style.transform = `rotate(${360 * this.owlTapCount}deg)`;
          if (this.owlTapCount === 1) {
            this.showTemporaryHint(footerOwl, "3 clics rapides pour ouvrir la Salle d'Arcade !");
          } else if (this.owlTapCount >= 3) {
            this.owlTapCount = 0;
            if (window.portfolioTracker) window.portfolioTracker.track("easter_egg", { egg: "footer_owl" });
            if (window.arcadeEngine) window.arcadeEngine.openMenu();
          }
          this.owlTapTimer = setTimeout(() => {
            this.owlTapCount = 0;
          }, 800);
        });
      }

      const vectrexHint = document.getElementById("vectrex-secret-hint");
      if (vectrexHint) {
        vectrexHint.addEventListener("click", () => {
          this.vectrexTapCount++;
          clearTimeout(this.vectrexTapTimer);
          if (this.vectrexTapCount >= 3) {
            this.vectrexTapCount = 0;
            if (window.portfolioTracker) window.portfolioTracker.track("easter_egg", { egg: "vectrex_touch" });
            if (window.vectrexEngine) window.vectrexEngine.open();
          } else {
            this.vectrexTapTimer = setTimeout(() => {
              this.vectrexTapCount = 0;
            }, 900);
          }
        });
      }
    }

    showTemporaryHint(target, text) {
      const hint = document.createElement("div");
      hint.className = "secret-hint-toast";
      hint.textContent = text;
      document.body.appendChild(hint);
      const rect = target.getBoundingClientRect();
      hint.style.left = `${Math.max(15, rect.left - 100)}px`;
      hint.style.top = `${rect.top - 40}px`;
      requestAnimationFrame(() => {
        hint.classList.add("visible");
      });
      setTimeout(() => {
        hint.classList.remove("visible");
        setTimeout(() => hint.remove(), 400);
      }, 1800);
    }

    triggerSecretOwlAnimation(startX, startY) {
      if (document.body.classList.contains("mystic-active")) return;
      document.body.classList.add("mystic-active");
      if (window.audioManager) window.audioManager.play("jump");
      const pageY = window.scrollY + startY;
      const centerX = window.innerWidth / 2;
      const centerY = window.scrollY + window.innerHeight / 2;
      const giantOwl = document.createElement("img");
      giantOwl.src = "assets/logo-hibouxe-400.webp";
      giantOwl.alt = "Hibou Magique";
      giantOwl.className = "magical-flying-owl";
      giantOwl.style.left = `${startX}px`;
      giantOwl.style.top = `${pageY}px`;
      document.body.appendChild(giantOwl);
      const deltaX = centerX - startX;
      const deltaY = centerY - pageY;
      giantOwl.animate(
        [
          { transform: "translate(-50%, -50%) scale(0.1) rotate(-10deg)", opacity: 0 },
          { transform: "translate(-50%, -50%) scale(1.1) rotate(0deg)", opacity: 1, offset: 0.2 },
          { transform: `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(1.6) rotate(6deg)`, opacity: 1, offset: 0.6 },
          { transform: `translate(calc(-50% + ${deltaX}px), -${window.innerHeight * 0.8}px) scale(2.2) rotate(-12deg)`, opacity: 0, offset: 1 }
        ],
        { duration: 3200, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" }
      );
      for (let i = 0; i < 30; i++) {
        const spark = document.createElement("div");
        spark.className = "magical-spark";
        spark.style.left = `${startX + (Math.random() - 0.5) * 120}px`;
        spark.style.top = `${pageY + (Math.random() - 0.5) * 120}px`;
        document.body.appendChild(spark);
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 140;
        spark.animate(
          [
            { transform: "translate(0, 0) scale(1)", opacity: 1 },
            { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0)`, opacity: 0 }
          ],
          { duration: 800 + Math.random() * 800, easing: "ease-out", fill: "forwards" }
        );
        setTimeout(() => spark.remove(), 1800);
      }
      setTimeout(() => {
        giantOwl.remove();
        document.body.classList.remove("mystic-active");
      }, 3300);
    }
  }

  window.easterEggsManager = new EasterEggsManager();
})();
