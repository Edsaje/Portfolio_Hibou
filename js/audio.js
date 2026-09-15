// Gestionnaire audio pour l'ambiance et les effets sonores

(function () {
    'use strict';

    class AudioManager {
        constructor() {
            this.isMuted = true;
            this.volume = 0.5;
            this.sounds = new Map();
            this.bgm = null;
            this.initialized = false;
        }

        /**
         * Initialise les écouteurs d'interface et précharge la banque audio.
         */
        init() {
            if (this.initialized) return;
            this.initialized = true;

            this.load('jump', 'assets/audio/jump.mp3');
            this.load('laser', 'assets/audio/laser.mp3');
            this.load('explosion', 'assets/audio/explosion.mp3');
            this.load('gameover', 'assets/audio/gameover.mp3');
            this.load('coin', 'assets/audio/coin.mp3');
            this.loadBGM('assets/audio/bgm.mp3');

            this.bindUI();
        }

        /**
         * Charge un effet sonore.
         * @param {string} name - Identifiant du son
         * @param {string} path - Chemin relatif du fichier audio
         */
        load(name, path) {
            try {
                const audio = new Audio(path);
                audio.preload = 'auto';
                this.sounds.set(name, audio);
            } catch (err) {
                console.warn(`[AudioManager] Impossible de charger le son: ${name}`, err);
            }
        }

        /**
         * Charge la musique de fond.
         * @param {string} path - Chemin relatif de la musique
         */
        loadBGM(path) {
            try {
                this.bgm = new Audio(path);
                this.bgm.loop = true;
                this.bgm.volume = this.volume * 0.35;
            } catch (err) {
                console.warn('[AudioManager] Impossible de charger la musique de fond', err);
            }
        }

        /**
         * Joue un effet sonore par son identifiant.
         * @param {string} name - Identifiant du son
         */
        play(name) {
            if (this.isMuted || !this.sounds.has(name)) return;
            try {
                const source = this.sounds.get(name);
                const clone = source.cloneNode();
                clone.volume = this.volume;
                clone.play().catch(() => {
                    // Lecture automatique restreinte par le navigateur avant interaction
                });
            } catch (err) {
                console.warn(`[AudioManager] Erreur lors de la lecture de: ${name}`, err);
            }
        }

        /**
         * Démarre la lecture de la musique d'ambiance.
         */
        playBGM() {
            if (!this.isMuted && this.bgm) {
                this.bgm.volume = this.volume * 0.35;
                this.bgm.play().catch(() => {});
            }
        }

        /**
         * Met en pause la musique d'ambiance.
         */
        pauseBGM() {
            if (this.bgm) {
                this.bgm.pause();
            }
        }

        /**
         * Bascule l'état muet / actif.
         * @returns {boolean} Nouvel état du mute
         */
        toggleMute() {
            this.isMuted = !this.isMuted;
            if (this.isMuted) {
                this.pauseBGM();
            } else {
                this.playBGM();
            }
            this.updateUI();
            return this.isMuted;
        }

        /**
         * Modifie le volume général.
         * @param {number} val - Niveau de volume entre 0 et 1
         */
        setVolume(val) {
            this.volume = Math.max(0, Math.min(1, parseFloat(val) || 0));
            if (this.bgm) {
                this.bgm.volume = this.volume * 0.35;
            }

            if (this.volume > 0 && this.isMuted) {
                this.isMuted = false;
                this.playBGM();
            } else if (this.volume === 0 && !this.isMuted) {
                this.isMuted = true;
                this.pauseBGM();
            }
            this.updateUI();
        }

        /**
         * Synchronise les contrôles d'interface utilisateur (bouton et slider).
         */
        bindUI() {
            const muteBtn = document.getElementById('mute-btn');
            const volSlider = document.getElementById('volume-slider');

            if (muteBtn) {
                muteBtn.addEventListener('click', () => this.toggleMute());
            }

            if (volSlider) {
                volSlider.value = this.volume;
                volSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
            }

            this.updateUI();
        }

        /**
         * Met à jour les éléments visuels du contrôleur sonore.
         */
        updateUI() {
            const muteBtn = document.getElementById('mute-btn');
            const volSlider = document.getElementById('volume-slider');

            if (muteBtn) {
                muteBtn.textContent = this.isMuted ? '🔇' : '🔊';
                muteBtn.setAttribute('aria-label', this.isMuted ? 'Activer le son' : 'Couper le son');
            }

            if (volSlider && Math.abs(parseFloat(volSlider.value) - this.volume) > 0.05) {
                volSlider.value = this.volume;
            }
        }
    }

    window.audioManager = new AudioManager();
})();
