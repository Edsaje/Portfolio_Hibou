// Émulateur vectoriel inspiré du jeu Mine Storm sur console Vectrex (1982)

(function () {
    'use strict';

    class VectrexEngine {
        constructor() {
            this.modal = null;
            this.closeBtn = null;
            this.canvas = null;
            this.ctx = null;
            this.scoreEl = null;
            this.livesEl = null;
            this.restartBtn = null;

            this.isRunning = false;
            this.gameLoop = null;

            this.score = 0;
            this.lives = 3;
            this.wave = 1;

            this.left = false;
            this.right = false;
            this.up = false;
            this.shoot = false;
            this.shootCooldown = 0;

            this.ship = {
                x: 200, y: 200,
                vx: 0, vy: 0,
                angle: -Math.PI / 2,
                invincible: 0,
                alive: true
            };

            this.lasers = [];
            this.mines = [];
            this.particles = [];
        }

        /**
         * Initialisation des références DOM et écouteurs d'événements.
         */
        init() {
            this.modal = document.getElementById('vectrex-modal');
            this.closeBtn = document.getElementById('close-vectrex');
            this.canvas = document.getElementById('vectrex-canvas');
            if (this.canvas) this.ctx = this.canvas.getContext('2d');

            this.scoreEl = document.getElementById('vectrex-score');
            this.livesEl = document.getElementById('vectrex-lives');
            this.restartBtn = document.getElementById('restart-vectrex-btn');

            this.bindEvents();
            this.bindVirtualGamepad();
        }

        bindEvents() {
            if (this.closeBtn) {
                this.closeBtn.addEventListener('click', () => this.close());
            }

            if (this.restartBtn) {
                this.restartBtn.addEventListener('click', () => this.start());
            }

            document.addEventListener('keydown', (e) => {
                if (!this.modal || !this.modal.classList.contains('active')) return;

                if (!this.isRunning) {
                    if (e.keyCode === 32 && !this.ship.alive) this.start();
                    return;
                }

                if (e.keyCode === 37) { e.preventDefault(); this.left = true; }
                if (e.keyCode === 39) { e.preventDefault(); this.right = true; }
                if (e.keyCode === 38) { e.preventDefault(); this.up = true; }
                if (e.keyCode === 32) { e.preventDefault(); this.shoot = true; }
            });

            document.addEventListener('keyup', (e) => {
                if (!this.isRunning) return;
                if (e.keyCode === 37) this.left = false;
                if (e.keyCode === 39) this.right = false;
                if (e.keyCode === 38) this.up = false;
                if (e.keyCode === 32) this.shoot = false;
            });
        }

        bindVirtualGamepad() {
            const bindBtn = (id, action) => {
                const btn = document.getElementById(id);
                if (!btn) return;

                const setAction = (val) => {
                    if (action === 'left') this.left = val;
                    if (action === 'right') this.right = val;
                    if (action === 'up') this.up = val;
                    if (action === 'shoot') {
                        this.shoot = val;
                        if (val && !this.isRunning && !this.ship.alive && this.modal && this.modal.classList.contains('active')) {
                            this.start();
                        }
                    }
                };

                btn.addEventListener('touchstart', (e) => { e.preventDefault(); setAction(true); }, { passive: false });
                btn.addEventListener('touchend', (e) => { e.preventDefault(); setAction(false); }, { passive: false });
                btn.addEventListener('touchcancel', (e) => { e.preventDefault(); setAction(false); }, { passive: false });

                btn.addEventListener('mousedown', (e) => { e.preventDefault(); setAction(true); });
                btn.addEventListener('mouseup', (e) => { e.preventDefault(); setAction(false); });
                btn.addEventListener('mouseleave', (e) => { e.preventDefault(); setAction(false); });
            };

            bindBtn('vbtn-left', 'left');
            bindBtn('vbtn-right', 'right');
            bindBtn('vbtn-up', 'up');
            bindBtn('vbtn-action', 'shoot');
        }

        open() {
            if (!this.modal) return;
            if (window.arcadeEngine) window.arcadeEngine.close();

            this.modal.classList.add('active');
            this.start();
        }

        close() {
            if (this.modal) this.modal.classList.remove('active');
            this.isRunning = false;
            cancelAnimationFrame(this.gameLoop);
        }

        start() {
            this.score = 0;
            this.lives = 3;
            this.wave = 1;

            if (window.leaderboardManager) {
                window.leaderboardManager.startSession('vectrex');
            }

            if (window.portfolioTracker) {
                window.portfolioTracker.track('easter_egg', { egg: 'vectrex' });
                window.portfolioTracker.track('game_start', { game: 'vectrex' });
            }

            if (this.scoreEl) this.scoreEl.textContent = '0';
            if (this.livesEl) this.livesEl.textContent = '3';
            if (this.restartBtn) this.restartBtn.style.display = 'none';

            this.resetShip();
            this.spawnWave();

            this.isRunning = true;
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = requestAnimationFrame(() => this.update());
        }

        resetShip() {
            this.ship.x = 200;
            this.ship.y = 200;
            this.ship.vx = 0;
            this.ship.vy = 0;
            this.ship.angle = -Math.PI / 2;
            this.ship.invincible = 150;
            this.ship.alive = true;
            this.lasers = [];
        }

        spawnWave() {
            this.mines = [];
            const count = Math.min(4 + (this.wave - 1), 8);
            for (let i = 0; i < count; i++) {
                let x, y;
                do {
                    x = Math.random() * 400;
                    y = Math.random() * 400;
                } while (Math.hypot(x - 200, y - 200) < 100);

                const angle = Math.random() * Math.PI * 2;
                const speed = 0.8 + Math.random() * 0.8 + (this.wave * 0.2);
                this.mines.push(this.createMine(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 30));
            }
        }

        createMine(x, y, vx, vy, size) {
            const points = [];
            const vertices = size === 30 ? 10 : (size === 18 ? 8 : 6);
            for (let i = 0; i < vertices; i++) {
                const a = (i / vertices) * Math.PI * 2;
                const r = size * (0.7 + Math.random() * 0.5);
                points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
            return { x, y, vx, vy, size, points };
        }

        addScore(pts) {
            this.score += pts;
            if (this.scoreEl) this.scoreEl.textContent = Math.floor(this.score);
        }

        createParticles(x, y, count, color = '#00ffcc') {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 3.5;
                this.particles.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 20 + Math.random() * 20,
                    color
                });
            }
        }

        update() {
            if (!this.isRunning || !this.ctx) return;
            const ctx = this.ctx;

            ctx.fillStyle = '#020504';
            ctx.fillRect(0, 0, 400, 400);

            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ffcc';
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 2;

            if (this.ship.alive) {
                if (this.left) this.ship.angle -= 0.07;
                if (this.right) this.ship.angle += 0.07;

                if (this.up) {
                    this.ship.vx += Math.cos(this.ship.angle) * 0.25;
                    this.ship.vy += Math.sin(this.ship.angle) * 0.25;
                    const speed = Math.hypot(this.ship.vx, this.ship.vy);
                    if (speed > 5) {
                        this.ship.vx = (this.ship.vx / speed) * 5;
                        this.ship.vy = (this.ship.vy / speed) * 5;
                    }
                    if (Math.random() < 0.3) {
                        if (window.audioManager) window.audioManager.play('jump');
                        this.createParticles(
                            this.ship.x - Math.cos(this.ship.angle) * 12,
                            this.ship.y - Math.sin(this.ship.angle) * 12,
                            1, '#ffffff'
                        );
                    }
                }

                this.ship.vx *= 0.985;
                this.ship.vy *= 0.985;

                this.ship.x += this.ship.vx;
                this.ship.y += this.ship.vy;

                if (this.ship.x < 0) this.ship.x = 400;
                if (this.ship.x > 400) this.ship.x = 0;
                if (this.ship.y < 0) this.ship.y = 400;
                if (this.ship.y > 400) this.ship.y = 0;

                if (this.shootCooldown > 0) this.shootCooldown--;
                if (this.shoot && this.shootCooldown === 0) {
                    if (window.audioManager) window.audioManager.play('laser');
                    this.lasers.push({
                        x: this.ship.x + Math.cos(this.ship.angle) * 15,
                        y: this.ship.y + Math.sin(this.ship.angle) * 15,
                        vx: this.ship.vx + Math.cos(this.ship.angle) * 8,
                        vy: this.ship.vy + Math.sin(this.ship.angle) * 8,
                        life: 55
                    });
                    this.shootCooldown = 12;
                }

                if (this.ship.invincible > 0) this.ship.invincible--;

                if (this.ship.invincible === 0 || Math.floor(this.ship.invincible / 5) % 2 === 0) {
                    ctx.save();
                    ctx.translate(this.ship.x, this.ship.y);
                    ctx.rotate(this.ship.angle);
                    ctx.beginPath();
                    ctx.moveTo(15, 0);
                    ctx.lineTo(-12, -10);
                    ctx.lineTo(-7, 0);
                    ctx.lineTo(-12, 10);
                    ctx.closePath();
                    ctx.stroke();

                    if (this.up) {
                        ctx.beginPath();
                        ctx.moveTo(-10, -5);
                        ctx.lineTo(-20 + (Math.random() * 5 - 2.5), 0);
                        ctx.lineTo(-10, 5);
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            }

            // Lasers
            for (let i = this.lasers.length - 1; i >= 0; i--) {
                const l = this.lasers[i];
                l.x += l.vx;
                l.y += l.vy;
                l.life--;

                if (l.x < 0) l.x = 400;
                if (l.x > 400) l.x = 0;
                if (l.y < 0) l.y = 400;
                if (l.y > 400) l.y = 0;

                if (l.life <= 0) {
                    this.lasers.splice(i, 1);
                    continue;
                }

                ctx.beginPath();
                ctx.arc(l.x, l.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            }

            // Particules
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life--;

                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }

                ctx.shadowBlur = 5;
                ctx.shadowColor = p.color;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, 2, 2);
            }

            ctx.shadowBlur = 12;
            ctx.shadowColor = '#00ffcc';
            ctx.strokeStyle = '#00ffcc';

            // Mines
            for (let i = this.mines.length - 1; i >= 0; i--) {
                const m = this.mines[i];
                m.x += m.vx;
                m.y += m.vy;

                if (m.x < -30) m.x = 430;
                if (m.x > 430) m.x = -30;
                if (m.y < -30) m.y = 430;
                if (m.y > 430) m.y = -30;

                ctx.save();
                ctx.translate(m.x, m.y);
                ctx.beginPath();
                for (let j = 0; j < m.points.length; j++) {
                    const pt = m.points[j];
                    if (j === 0) ctx.moveTo(pt.x, pt.y);
                    else ctx.lineTo(pt.x, pt.y);
                }
                ctx.closePath();
                ctx.stroke();
                ctx.restore();

                let mineDestroyed = false;
                for (let j = this.lasers.length - 1; j >= 0; j--) {
                    const l = this.lasers[j];
                    if (Math.hypot(l.x - m.x, l.y - m.y) < m.size) {
                        this.lasers.splice(j, 1);
                        mineDestroyed = true;
                        break;
                    }
                }

                if (mineDestroyed) {
                    if (window.audioManager) window.audioManager.play('explosion');
                    this.createParticles(m.x, m.y, 15, '#00ffcc');

                    if (m.size === 30) {
                        this.addScore(20);
                        this.mines.push(this.createMine(m.x, m.y, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 18));
                        this.mines.push(this.createMine(m.x, m.y, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 18));
                    } else if (m.size === 18) {
                        this.addScore(50);
                        this.mines.push(this.createMine(m.x, m.y, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 10));
                        this.mines.push(this.createMine(m.x, m.y, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 10));
                    } else {
                        this.addScore(100);
                    }

                    this.mines.splice(i, 1);
                    continue;
                }

                if (this.ship.alive && this.ship.invincible === 0 && Math.hypot(this.ship.x - m.x, this.ship.y - m.y) < m.size + 10) {
                    if (window.audioManager) window.audioManager.play('explosion');
                    this.createParticles(this.ship.x, this.ship.y, 30, '#ffffff');
                    this.ship.alive = false;
                    this.lives--;
                    if (this.livesEl) this.livesEl.textContent = this.lives;

                    if (this.lives > 0) {
                        setTimeout(() => {
                            if (this.isRunning) this.resetShip();
                        }, 1500);
                    } else {
                        if (window.audioManager) window.audioManager.play('gameover');
                        if (this.restartBtn) this.restartBtn.style.display = 'inline-block';
                        this.isRunning = false;
                        ctx.fillStyle = '#00ffcc';
                        ctx.font = "600 26px 'Cinzel', serif";
                        ctx.textAlign = 'center';
                        ctx.fillText('GAME OVER', 200, 190);
                        ctx.font = '14px monospace';
                        ctx.fillText('SCORE FINAL : ' + Math.floor(this.score), 200, 220);

                        const finalScore = Math.floor(this.score);
                        if (window.leaderboardManager && finalScore > 0) {
                            setTimeout(() => {
                                window.leaderboardManager.promptHighScore('vectrex', finalScore, () => {});
                            }, 1200);
                        }
                        return;
                    }
                }
            }

            if (this.mines.length === 0) {
                this.wave++;
                if (window.audioManager) window.audioManager.play('coin');
                this.spawnWave();
            }

            if (this.isRunning) {
                this.gameLoop = requestAnimationFrame(() => this.update());
            }
        }
    }

    window.vectrexEngine = new VectrexEngine();
    window.openVectrexModal = () => window.vectrexEngine.open();
})();
