// Animation Canvas 2D : Particules / Lucioles en arrière-plan

(function () {
    'use strict';

    class FirefliesEngine {
        constructor() {
            this.canvas = null;
            this.ctx = null;
            this.fireflies = [];
            this.animationFrameId = null;
            this.width = 0;
            this.height = 0;
            this.dpr = 1;
            this.isRunning = false;
            this.targetCount = 35;
        }

        /**
         * Initialise le canvas et démarre la boucle d'animation.
         */
        init() {
            this.canvas = document.getElementById('fireflies-canvas');
            if (!this.canvas) {
                this.canvas = document.createElement('canvas');
                this.canvas.id = 'fireflies-canvas';
                this.canvas.className = 'fireflies-canvas';
                document.body.prepend(this.canvas);
            }

            this.ctx = this.canvas.getContext('2d', { alpha: true });
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);

            this.resize();
            this.createFireflies();
            this.bindEvents();
            this.start();
        }

        /**
         * Ajuste les dimensions du canvas en fonction de la fenêtre.
         */
        resize() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;

            this.canvas.width = Math.floor(this.width * this.dpr);
            this.canvas.height = Math.floor(this.height * this.dpr);
            this.canvas.style.width = `${this.width}px`;
            this.canvas.style.height = `${this.height}px`;

            if (this.ctx) {
                this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            }

            // Adapter la densité de particules selon la résolution
            if (this.width < 600) {
                this.targetCount = 20;
            } else if (this.width < 1200) {
                this.targetCount = 30;
            } else {
                this.targetCount = 45;
            }
        }

        /**
         * Génère les particules initiales.
         */
        createFireflies() {
            this.fireflies = [];
            for (let i = 0; i < this.targetCount; i++) {
                this.fireflies.push(this.createFirefly(true));
            }
        }

        /**
         * Crée une luciole individuelle avec des caractéristiques physiques et lumineuses uniques.
         * @param {boolean} randomY - Positionnement vertical aléatoire ou en bas d'écran
         * @returns {Object} Objet particule
         */
        createFirefly(randomY = false) {
            return {
                x: Math.random() * this.width,
                y: randomY ? Math.random() * this.height : this.height + Math.random() * 20,
                radius: 1.2 + Math.random() * 2.2,
                baseAlpha: 0.2 + Math.random() * 0.6,
                alpha: 0,
                pulseSpeed: 0.015 + Math.random() * 0.03,
                pulseOffset: Math.random() * Math.PI * 2,
                vx: (Math.random() - 0.5) * 0.45,
                vy: -(0.2 + Math.random() * 0.55),
                sineFreq: 0.005 + Math.random() * 0.01,
                sineAmp: 0.5 + Math.random() * 1.5,
                hueShift: (Math.random() - 0.5) * 15 // Subtile nuance dorée
            };
        }

        /**
         * Attache les écouteurs de redimensionnement et de visibilité d'onglet.
         */
        bindEvents() {
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    this.resize();
                }, 150);
            }, { passive: true });

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.stop();
                } else {
                    this.start();
                }
            });
        }

        /**
         * Démarre la boucle d'animation.
         */
        start() {
            if (this.isRunning) return;
            this.isRunning = true;
            let lastTime = performance.now();

            const render = (currentTime) => {
                if (!this.isRunning) return;
                const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
                lastTime = currentTime;

                this.update(dt, currentTime);
                this.draw();

                this.animationFrameId = requestAnimationFrame(render);
            };

            this.animationFrameId = requestAnimationFrame(render);
        }

        /**
         * Arrête la boucle d'animation pour économiser les ressources.
         */
        stop() {
            this.isRunning = false;
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        }

        /**
         * Met à jour les positions et l'éclat des lucioles.
         * @param {number} dt - Delta time
         * @param {number} time - Temps global
         */
        update(dt, time) {
            const timeSec = time * 0.001;

            for (let i = 0; i < this.fireflies.length; i++) {
                const f = this.fireflies[i];

                f.y += f.vy * (dt * 60);
                f.x += (f.vx + Math.sin(timeSec * f.sineFreq + f.pulseOffset) * f.sineAmp * 0.15) * (dt * 60);

                // Scintillement organique
                f.alpha = f.baseAlpha * (0.5 + 0.5 * Math.sin(timeSec * 3 * f.pulseSpeed * 100 + f.pulseOffset));

                // Recyclage quand la luciole sort de l'écran
                if (f.y < -30 || f.x < -30 || f.x > this.width + 30) {
                    this.fireflies[i] = this.createFirefly(false);
                }
            }

            // Ajustement progressif du nombre de particules
            while (this.fireflies.length < this.targetCount) {
                this.fireflies.push(this.createFirefly(false));
            }
            if (this.fireflies.length > this.targetCount) {
                this.fireflies.pop();
            }
        }

        /**
         * Rendu graphique des lucioles avec halo lumineux doré.
         */
        draw() {
            this.ctx.clearRect(0, 0, this.width, this.height);

            for (let i = 0; i < this.fireflies.length; i++) {
                const f = this.fireflies[i];
                if (f.alpha <= 0.01) continue;

                const gradient = this.ctx.createRadialGradient(
                    f.x, f.y, 0,
                    f.x, f.y, f.radius * 3.5
                );

                gradient.addColorStop(0, `rgba(255, 235, 160, ${f.alpha})`);
                gradient.addColorStop(0.3, `rgba(212, 175, 55, ${f.alpha * 0.7})`);
                gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');

                this.ctx.beginPath();
                this.ctx.arc(f.x, f.y, f.radius * 3.5, 0, Math.PI * 2);
                this.ctx.fillStyle = gradient;
                this.ctx.fill();

                // Cœur brillant de la luciole
                this.ctx.beginPath();
                this.ctx.arc(f.x, f.y, f.radius * 0.6, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, f.alpha * 1.2)})`;
                this.ctx.fill();
            }
        }
    }

    window.firefliesEngine = new FirefliesEngine();
})();
