// Salle d'arcade rétro en Canvas 2D (Snake, Pong, Casse-Briques, Flappy, Invaders, Run, Tetris)

(function () {
    'use strict';

    class ArcadeEngine {
        constructor() {
            this.modal = null;
            this.menu = null;
            this.gameView = null;
            this.canvas = null;
            this.ctx = null;
            this.scoreEl = null;
            this.titleEl = null;
            this.instructionsEl = null;

            this.currentGame = null;
            this.gameLoop = null;
            this.isGameRunning = false;

            this.owlLogo = new Image();
            this.owlLogo.src = 'assets/logo-hibouxe.png';
        }

        /**
         * Initialisation des éléments DOM et écouteurs d'événements.
         */
        init() {
            this.modal = document.getElementById('arcade-modal');
            this.menu = document.getElementById('arcade-menu');
            this.gameView = document.getElementById('arcade-game-view');
            this.canvas = document.getElementById('arcade-canvas');
            if (this.canvas) {
                this.ctx = this.canvas.getContext('2d');
                this.canvas.addEventListener('click', () => {
                    if (!this.isGameRunning && this.currentGame) {
                        this.launchGame(this.currentGame);
                    }
                });
            }

            this.scoreEl = document.getElementById('arcade-score-val');
            this.titleEl = document.getElementById('arcade-game-title');
            this.instructionsEl = document.getElementById('arcade-instructions');

            this.bindEvents();
            this.bindVirtualGamepad();
        }

        /**
         * Attache les écouteurs de fermeture et de navigation clavier.
         */
        bindEvents() {
            const closeBtn = document.querySelector('.close-arcade');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.close());
            }

            document.addEventListener('keydown', (e) => {
                if (!this.modal || !this.modal.classList.contains('active') || !this.currentGame) return;

                // Bloquer le scroll lors du jeu
                if ([32, 37, 38, 39, 40].includes(e.keyCode)) {
                    e.preventDefault();
                }

                this.handleKeyDown(e);
            });

            document.addEventListener('keyup', (e) => {
                if (!this.modal || !this.modal.classList.contains('active') || !this.currentGame) return;
                this.handleKeyUp(e);
            });
        }

        /**
         * Ouvre la modale d'arcade et affiche le catalogue des jeux.
         */
        openMenu() {
            if (!this.modal) return;
            this.modal.classList.add('active');
            this.showMenu();
        }

        /**
         * Ferme la modale et arrête le jeu en cours.
         */
        close() {
            if (this.modal) this.modal.classList.remove('active');
            this.stopCurrentGame();
        }

        /**
         * Affiche le menu de sélection des jeux.
         */
        showMenu() {
            this.stopCurrentGame();
            if (this.gameView) {
                this.gameView.classList.add('hidden-view');
                this.gameView.style.display = 'none';
            }
            if (this.menu) {
                this.menu.classList.remove('hidden-view');
                this.menu.style.display = 'block';
            }
        }

        /**
         * Déclenche la fin de partie et propose d'enregistrer le score dans le Hall of Fame.
         */
        triggerGameOver(gameName, score) {
            this.isGameRunning = false;
            if (this.gameLoop) {
                clearInterval(this.gameLoop);
                cancelAnimationFrame(this.gameLoop);
                this.gameLoop = null;
            }
            if (window.audioManager) window.audioManager.play('gameover');
            const finalScore = Math.floor(score);
            if (window.leaderboardManager && finalScore > 0) {
                setTimeout(() => {
                    if (this.modal && this.modal.classList.contains('active')) {
                        window.leaderboardManager.promptHighScore(gameName, finalScore, () => {});
                    }
                }, 800);
            }
        }

        /**
         * Arrête les boucles de jeu actives.
         */
        stopCurrentGame() {
            this.isGameRunning = false;
            this.currentGame = null;
            if (this.gameLoop) {
                clearInterval(this.gameLoop);
                cancelAnimationFrame(this.gameLoop);
                this.gameLoop = null;
            }
        }

        /**
         * Lance un jeu spécifique par son nom.
         * @param {string} gameName - Identifiant du jeu
         */
        launchGame(gameName) {
            if (!this.modal) return;
            this.modal.classList.add('active');
            if (this.menu) {
                this.menu.classList.add('hidden-view');
                this.menu.style.display = 'none';
            }
            if (this.gameView) {
                this.gameView.classList.remove('hidden-view');
                this.gameView.style.display = 'block';
            }

            this.stopCurrentGame();
            this.currentGame = gameName;

            if (window.leaderboardManager) {
                window.leaderboardManager.startSession(gameName);
            }

            if (window.portfolioTracker) {
                window.portfolioTracker.track('game_start', { game: gameName });
            }

            if (this.canvas) {
                this.canvas.width = 400;
                this.canvas.height = 400;
            }

            switch (gameName) {
                case 'snake': this.initSnake(); break;
                case 'pong': this.initPong(); break;
                case 'breakout': this.initBreakout(); break;
                case 'flappy': this.initFlappy(); break;
                case 'invaders': this.initInvaders(); break;
                case 'run': this.initRun(); break;
                case 'tetris': this.initTetris(); break;
            }
        }

        /**
         * Manette virtuelle tactile (Mobile D-pad).
         */
        bindVirtualGamepad() {
            const bindBtn = (id, keyCode) => {
                const btn = document.getElementById(id);
                if (!btn) return;

                const trigger = (isDown) => {
                    if (!this.currentGame) return;
                    const event = { keyCode };
                    if (isDown) this.handleKeyDown(event);
                    else this.handleKeyUp(event);
                };

                btn.addEventListener('touchstart', (e) => { e.preventDefault(); trigger(true); }, { passive: false });
                btn.addEventListener('touchend', (e) => { e.preventDefault(); trigger(false); }, { passive: false });
                btn.addEventListener('touchcancel', (e) => { e.preventDefault(); trigger(false); }, { passive: false });

                btn.addEventListener('mousedown', (e) => { e.preventDefault(); trigger(true); });
                btn.addEventListener('mouseup', (e) => { e.preventDefault(); trigger(false); });
                btn.addEventListener('mouseleave', (e) => { e.preventDefault(); trigger(false); });
            };

            bindBtn('btn-up', 38);
            bindBtn('btn-down', 40);
            bindBtn('btn-left', 37);
            bindBtn('btn-right', 39);
            bindBtn('btn-action', 32); // Espace
        }

        handleKeyDown(e) {
            switch (this.currentGame) {
                case 'snake': this.handleSnakeKey(e); break;
                case 'pong': this.handlePongKey(e, true); break;
                case 'breakout': this.handleBreakoutKey(e, true); break;
                case 'flappy': this.handleFlappyKey(e); break;
                case 'invaders': this.handleInvadersKey(e, true); break;
                case 'run': this.handleRunKey(e); break;
                case 'tetris': this.handleTetrisKey(e); break;
            }
        }

        handleKeyUp(e) {
            switch (this.currentGame) {
                case 'pong': this.handlePongKey(e, false); break;
                case 'breakout': this.handleBreakoutKey(e, false); break;
                case 'invaders': this.handleInvadersKey(e, false); break;
            }
        }

        /* ==========================================================================
           1. 🐍 SNAKE DORÉ
           ========================================================================== */
        initSnake() {
            this.titleEl.textContent = '🐍 Snake Doré';
            this.instructionsEl.innerHTML = 'Utilise les flèches ou la croix directionnelle.<br>Mange les lucioles sans toucher les bords ni ta queue !';
            this.startSnake();
        }

        startSnake() {
            const canvas = this.canvas;
            this.gridSize = 20;
            this.snake = [
                { x: 10 * this.gridSize, y: 10 * this.gridSize },
                { x: 9 * this.gridSize, y: 10 * this.gridSize }
            ];
            this.snakeDir = 'RIGHT';
            this.nextSnakeDir = 'RIGHT';
            this.snakeScore = 0;
            this.scoreEl.textContent = this.snakeScore;

            this.spawnSnakeFood();
            this.isGameRunning = true;

            clearInterval(this.gameLoop);
            this.gameLoop = setInterval(() => this.updateSnake(), 100);
        }

        spawnSnakeFood() {
            const maxX = (this.canvas.width / this.gridSize) - 1;
            const maxY = (this.canvas.height / this.gridSize) - 1;
            this.snakeFood = {
                x: Math.floor(Math.random() * maxX) * this.gridSize,
                y: Math.floor(Math.random() * maxY) * this.gridSize
            };
        }

        handleSnakeKey(e) {
            const key = e.keyCode;
            if (key === 37 && this.snakeDir !== 'RIGHT') this.nextSnakeDir = 'LEFT';
            else if (key === 38 && this.snakeDir !== 'DOWN') this.nextSnakeDir = 'UP';
            else if (key === 39 && this.snakeDir !== 'LEFT') this.nextSnakeDir = 'RIGHT';
            else if (key === 40 && this.snakeDir !== 'UP') this.nextSnakeDir = 'DOWN';
            else if (key === 32 && !this.isGameRunning) this.startSnake();
        }

        updateSnake() {
            if (!this.isGameRunning) return;
            this.snakeDir = this.nextSnakeDir;

            const ctx = this.ctx;
            const canvas = this.canvas;

            ctx.fillStyle = '#060f09';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Dessin de la nourriture (Luciole dorée)
            ctx.fillStyle = '#d4af37';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#d4af37';
            ctx.beginPath();
            ctx.arc(this.snakeFood.x + 10, this.snakeFood.y + 10, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Dessin du serpent
            this.snake.forEach((segment, index) => {
                if (index === 0) {
                    ctx.drawImage(this.owlLogo, segment.x, segment.y, this.gridSize, this.gridSize);
                } else {
                    ctx.fillStyle = index % 2 === 0 ? '#1e462c' : '#2a5a3a';
                    ctx.fillRect(segment.x + 1, segment.y + 1, this.gridSize - 2, this.gridSize - 2);
                }
            });

            let snakeX = this.snake[0].x;
            let snakeY = this.snake[0].y;

            if (this.snakeDir === 'LEFT') snakeX -= this.gridSize;
            if (this.snakeDir === 'UP') snakeY -= this.gridSize;
            if (this.snakeDir === 'RIGHT') snakeX += this.gridSize;
            if (this.snakeDir === 'DOWN') snakeY += this.gridSize;

            if (snakeX === this.snakeFood.x && snakeY === this.snakeFood.y) {
                this.snakeScore++;
                this.scoreEl.textContent = this.snakeScore;
                if (window.audioManager) window.audioManager.play('coin');
                this.spawnSnakeFood();
            } else {
                if (this.snakeDir) this.snake.pop();
            }

            const newHead = { x: snakeX, y: snakeY };

            const hasCollision = (head, array) => {
                for (let i = 0; i < array.length; i++) {
                    if (head.x === array[i].x && head.y === array[i].y) return true;
                }
                return false;
            };

            if (snakeX < 0 || snakeX >= canvas.width || snakeY < 0 || snakeY >= canvas.height || (this.snakeDir && hasCollision(newHead, this.snake))) {
                clearInterval(this.gameLoop);
                this.triggerGameOver('snake', this.snakeScore);
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.font = "600 24px 'Cinzel', serif";
                ctx.fillText('PARTIE TERMINÉE', canvas.width / 2, canvas.height / 2 - 10);
                ctx.font = "14px 'Outfit', sans-serif";
                ctx.fillText('Appuie sur ESPACE pour rejouer', canvas.width / 2, canvas.height / 2 + 25);
                return;
            }

            if (this.snakeDir || this.snake.length === 0) {
                this.snake.unshift(newHead);
            } else if (!this.snakeDir && this.snake.length > 0) {
                this.snake.unshift(newHead);
                this.snake.pop();
            }
        }

        /* ==========================================================================
           2. 🏓 PONG MAGIQUE
           ========================================================================== */
        initPong() {
            this.titleEl.textContent = '🏓 Pong Magique';
            this.instructionsEl.innerHTML = 'Flèches HAUT / BAS pour déplacer ta raquette.<br>ESPACE pour engager la balle.';
            this.startPong();
        }

        startPong() {
            this.pongPad = { left: { y: 160, score: 0 }, right: { y: 160, score: 0 }, w: 10, h: 80 };
            this.pongBall = { x: 200, y: 200, r: 7, vx: 4.5, vy: 4.5 };
            this.pongUp = false;
            this.pongDown = false;
            this.scoreEl.textContent = '0 - 0';
            this.isGameRunning = false;

            cancelAnimationFrame(this.gameLoop);
            this.drawPong();
        }

        handlePongKey(e, isDown) {
            if (e.keyCode === 38) this.pongUp = isDown;
            if (e.keyCode === 40) this.pongDown = isDown;
            if (isDown && e.keyCode === 32) {
                if (this.pongPad.right.score >= 5 || this.pongPad.left.score >= 10) {
                    this.startPong();
                }
                if (!this.isGameRunning) {
                    this.isGameRunning = true;
                    this.gameLoop = requestAnimationFrame(() => this.updatePong());
                }
            }
        }

        drawPong() {
            const ctx = this.ctx;
            const canvas = this.canvas;
            ctx.fillStyle = '#060f09';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Filet central
            ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
            ctx.setLineDash([5, 12]);
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, 0);
            ctx.lineTo(canvas.width / 2, canvas.height);
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
            ctx.stroke();
            ctx.setLineDash([]);

            // Raquettes
            ctx.fillStyle = '#d4af37';
            ctx.fillRect(20, this.pongPad.left.y, this.pongPad.w, this.pongPad.h);
            ctx.fillStyle = '#294c34';
            ctx.fillRect(canvas.width - 30, this.pongPad.right.y, this.pongPad.w, this.pongPad.h);

            // Balle magique
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#d4af37';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.pongBall.x, this.pongBall.y, this.pongBall.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        updatePong() {
            if (!this.isGameRunning) return;

            if (this.pongUp && this.pongPad.left.y > 0) this.pongPad.left.y -= 7;
            if (this.pongDown && this.pongPad.left.y < this.canvas.height - this.pongPad.h) this.pongPad.left.y += 7;

            // IA adaptative
            const iaSpeed = 4.2 + (this.pongPad.left.score * 0.4);
            if (this.pongBall.y < this.pongPad.right.y + this.pongPad.h / 2) this.pongPad.right.y -= iaSpeed;
            if (this.pongBall.y > this.pongPad.right.y + this.pongPad.h / 2) this.pongPad.right.y += iaSpeed;

            this.pongBall.x += this.pongBall.vx;
            this.pongBall.y += this.pongBall.vy;

            if (this.pongBall.y - this.pongBall.r < 0 || this.pongBall.y + this.pongBall.r > this.canvas.height) {
                this.pongBall.vy *= -1;
            }

            // Collisions raquettes
            if (this.pongBall.x - this.pongBall.r < 30 && this.pongBall.y > this.pongPad.left.y && this.pongBall.y < this.pongPad.left.y + this.pongPad.h) {
                if (window.audioManager) window.audioManager.play('jump');
                this.pongBall.vx *= -1.04;
                this.pongBall.x = 30 + this.pongBall.r;
            }
            if (this.pongBall.x + this.pongBall.r > this.canvas.width - 30 && this.pongBall.y > this.pongPad.right.y && this.pongBall.y < this.pongPad.right.y + this.pongPad.h) {
                if (window.audioManager) window.audioManager.play('jump');
                this.pongBall.vx *= -1.04;
                this.pongBall.x = this.canvas.width - 30 - this.pongBall.r;
            }

            if (this.pongBall.x < 0) {
                if (window.audioManager) window.audioManager.play('coin');
                this.pongPad.right.score++;
                if (this.pongPad.right.score >= 5) {
                    this.triggerGameOver('pong', this.pongPad.left.score);
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.textAlign = 'center';
                    this.ctx.font = "600 24px 'Cinzel', serif";
                    this.ctx.fillText('MATCH TERMINÉ', this.canvas.width / 2, this.canvas.height / 2 - 10);
                    this.ctx.font = "14px 'Outfit', sans-serif";
                    this.ctx.fillText('Appuie sur ESPACE pour rejouer', this.canvas.width / 2, this.canvas.height / 2 + 25);
                    return;
                }
                this.resetPongBall();
            } else if (this.pongBall.x > this.canvas.width) {
                if (window.audioManager) window.audioManager.play('coin');
                this.pongPad.left.score++;
                if (this.pongPad.left.score >= 10) {
                    this.triggerGameOver('pong', this.pongPad.left.score);
                    this.ctx.fillStyle = '#d4af37';
                    this.ctx.textAlign = 'center';
                    this.ctx.font = "600 26px 'Cinzel', serif";
                    this.ctx.fillText('VICTOIRE !', this.canvas.width / 2, this.canvas.height / 2 - 10);
                    return;
                }
                this.resetPongBall();
            }

            this.scoreEl.textContent = `${this.pongPad.left.score} - ${this.pongPad.right.score}`;
            this.drawPong();

            if (this.isGameRunning) {
                this.gameLoop = requestAnimationFrame(() => this.updatePong());
            }
        }

        resetPongBall() {
            this.pongBall.x = this.canvas.width / 2;
            this.pongBall.y = this.canvas.height / 2;
            this.pongBall.vx = (Math.random() > 0.5 ? 4.5 : -4.5);
            this.pongBall.vy = (Math.random() > 0.5 ? 4.5 : -4.5);
            this.isGameRunning = false;
            this.drawPong();
        }

        /* ==========================================================================
           3. 🧱 CASSE-BRIQUES
           ========================================================================== */
        initBreakout() {
            this.titleEl.textContent = '🧱 Casse-Briques';
            this.instructionsEl.innerHTML = 'Flèches GAUCHE / DROITE pour déplacer la barre.<br>ESPACE pour lancer/relancer.';
            this.startBreakout();
        }

        startBreakout() {
            this.brkPad = { w: 80, h: 10, x: 160, y: 380 };
            this.brkBall = { x: 200, y: 370, r: 6, vx: 4, vy: -4 };
            this.brkLeft = false;
            this.brkRight = false;
            this.brkScore = 0;
            this.brkRows = 5;
            this.brkCols = 6;
            this.bricks = [];

            for (let c = 0; c < this.brkCols; c++) {
                this.bricks[c] = [];
                for (let r = 0; r < this.brkRows; r++) {
                    this.bricks[c][r] = { x: 0, y: 0, status: 1 };
                }
            }

            this.scoreEl.textContent = this.brkScore;
            this.isGameRunning = false;
            cancelAnimationFrame(this.gameLoop);
            this.drawBreakout();
        }

        handleBreakoutKey(e, isDown) {
            if (e.keyCode === 37) this.brkLeft = isDown;
            if (e.keyCode === 39) this.brkRight = isDown;
            if (isDown && e.keyCode === 32 && !this.isGameRunning) {
                this.isGameRunning = true;
                this.gameLoop = requestAnimationFrame(() => this.updateBreakout());
            }
        }

        drawBreakout() {
            const ctx = this.ctx;
            const canvas = this.canvas;
            ctx.fillStyle = '#060f09';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Raquette
            ctx.fillStyle = '#d4af37';
            ctx.fillRect(this.brkPad.x, this.brkPad.y, this.brkPad.w, this.brkPad.h);

            // Balle
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#d4af37';
            ctx.beginPath();
            ctx.arc(this.brkBall.x, this.brkBall.y, this.brkBall.r, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.shadowBlur = 0;

            const bw = 55, bh = 20, p = 10, offT = 30, offL = 15;
            for (let c = 0; c < this.brkCols; c++) {
                for (let r = 0; r < this.brkRows; r++) {
                    if (this.bricks[c][r].status === 1) {
                        const bx = (c * (bw + p)) + offL;
                        const by = (r * (bh + p)) + offT;
                        this.bricks[c][r].x = bx;
                        this.bricks[c][r].y = by;
                        ctx.fillStyle = (r % 2 === 0) ? '#294c34' : '#d4af37';
                        ctx.fillRect(bx, by, bw, bh);
                    }
                }
            }
        }

        updateBreakout() {
            if (!this.isGameRunning) return;

            if (this.brkLeft && this.brkPad.x > 0) this.brkPad.x -= 7;
            if (this.brkRight && this.brkPad.x < this.canvas.width - this.brkPad.w) this.brkPad.x += 7;

            this.brkBall.x += this.brkBall.vx;
            this.brkBall.y += this.brkBall.vy;

            // Rebord murs
            if (this.brkBall.x - this.brkBall.r <= 0) {
                this.brkBall.x = this.brkBall.r;
                this.brkBall.vx = Math.abs(this.brkBall.vx);
            } else if (this.brkBall.x + this.brkBall.r >= this.canvas.width) {
                this.brkBall.x = this.canvas.width - this.brkBall.r;
                this.brkBall.vx = -Math.abs(this.brkBall.vx);
            }

            if (this.brkBall.y - this.brkBall.r <= 0) {
                this.brkBall.y = this.brkBall.r;
                this.brkBall.vy = Math.abs(this.brkBall.vy);
            } else if (this.brkBall.y - this.brkBall.r > this.canvas.height) {
                this.triggerGameOver('breakout', this.brkScore);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.textAlign = 'center';
                this.ctx.font = "600 24px 'Cinzel', serif";
                this.ctx.fillText('PARTIE TERMINÉE', this.canvas.width / 2, 240);
                this.ctx.font = "14px 'Outfit', sans-serif";
                this.ctx.fillText('Appuie sur ESPACE pour rejouer', this.canvas.width / 2, 275);
                return;
            }

            // Collision Raquette
            if (
                this.brkBall.y + this.brkBall.r >= this.brkPad.y &&
                this.brkBall.y - this.brkBall.r <= this.brkPad.y + this.brkPad.h &&
                this.brkBall.x + this.brkBall.r >= this.brkPad.x &&
                this.brkBall.x - this.brkBall.r <= this.brkPad.x + this.brkPad.w &&
                this.brkBall.vy > 0
            ) {
                if (window.audioManager) window.audioManager.play('jump');
                this.brkBall.vy = -Math.abs(this.brkBall.vy);
                const hit = (this.brkBall.x - (this.brkPad.x + this.brkPad.w / 2)) / (this.brkPad.w / 2);
                this.brkBall.vx = hit * 5;
                this.brkBall.y = this.brkPad.y - this.brkBall.r;
            }

            const bw = 55, bh = 20;
            let won = true;
            let brickHit = false;

            const prevX = this.brkBall.x - this.brkBall.vx;
            const prevY = this.brkBall.y - this.brkBall.vy;

            for (let c = 0; c < this.brkCols; c++) {
                for (let r = 0; r < this.brkRows; r++) {
                    const b = this.bricks[c][r];
                    if (b.status === 1) {
                        won = false;
                        if (!brickHit &&
                            this.brkBall.x + this.brkBall.r > b.x &&
                            this.brkBall.x - this.brkBall.r < b.x + bw &&
                            this.brkBall.y + this.brkBall.r > b.y &&
                            this.brkBall.y - this.brkBall.r < b.y + bh
                        ) {
                            if (window.audioManager) window.audioManager.play('explosion');
                            b.status = 0;
                            this.brkScore += 10;
                            this.scoreEl.textContent = this.brkScore;
                            brickHit = true;

                            // Détection de la face d'impact (Côté Gauche/Droit vs Haut/Bas)
                            if (prevX + this.brkBall.r <= b.x) {
                                // Impact Côté Gauche
                                this.brkBall.vx = -Math.abs(this.brkBall.vx);
                                this.brkBall.x = b.x - this.brkBall.r;
                            } else if (prevX - this.brkBall.r >= b.x + bw) {
                                // Impact Côté Droit
                                this.brkBall.vx = Math.abs(this.brkBall.vx);
                                this.brkBall.x = b.x + bw + this.brkBall.r;
                            } else if (prevY + this.brkBall.r <= b.y) {
                                // Impact Face Supérieure
                                this.brkBall.vy = -Math.abs(this.brkBall.vy);
                                this.brkBall.y = b.y - this.brkBall.r;
                            } else if (prevY - this.brkBall.r >= b.y + bh) {
                                // Impact Face Inférieure
                                this.brkBall.vy = Math.abs(this.brkBall.vy);
                                this.brkBall.y = b.y + bh + this.brkBall.r;
                            } else {
                                // Fallback géométrique par profondeur d'intersection minimale
                                const overlapLeft = (this.brkBall.x + this.brkBall.r) - b.x;
                                const overlapRight = (b.x + bw) - (this.brkBall.x - this.brkBall.r);
                                const overlapTop = (this.brkBall.y + this.brkBall.r) - b.y;
                                const overlapBottom = (b.y + bh) - (this.brkBall.y - this.brkBall.r);

                                const minOverlapX = Math.min(overlapLeft, overlapRight);
                                const minOverlapY = Math.min(overlapTop, overlapBottom);

                                if (minOverlapX < minOverlapY) {
                                    this.brkBall.vx *= -1;
                                } else {
                                    this.brkBall.vy *= -1;
                                }
                            }
                        }
                    }
                }
            }

            if (won) {
                if (window.audioManager) window.audioManager.play('coin');
                this.isGameRunning = false;
                this.ctx.fillStyle = '#d4af37';
                this.ctx.textAlign = 'center';
                this.ctx.font = "600 26px 'Cinzel', serif";
                this.ctx.fillText('VICTOIRE !', this.canvas.width / 2, 240);
                if (window.leaderboardManager && this.brkScore > 0) {
                    setTimeout(() => {
                        window.leaderboardManager.promptHighScore('breakout', this.brkScore, () => {});
                    }, 1200);
                }
                return;
            }

            this.drawBreakout();
            if (this.isGameRunning) {
                this.gameLoop = requestAnimationFrame(() => this.updateBreakout());
            }
        }

        /* ==========================================================================
           4. 🦅 FLAPPY HIBOU
           ========================================================================== */
        initFlappy() {
            this.titleEl.textContent = '🦅 Flappy Hibou';
            this.instructionsEl.innerHTML = 'Appuie sur ESPACE ou clique pour faire voler le hibou.';
            this.startFlappy();
        }

        startFlappy() {
            this.flapBird = { x: 60, y: 200, vy: 0, gravity: 0.55, jump: -7.5 };
            this.flapPipes = [];
            this.flapFrame = 0;
            this.flapScore = 0;
            this.isGameRunning = true;
            this.scoreEl.textContent = this.flapScore;

            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = requestAnimationFrame(() => this.updateFlappy());
        }

        handleFlappyKey(e) {
            if (e.keyCode === 32) {
                if (!this.isGameRunning) {
                    this.startFlappy();
                } else {
                    this.flapBird.vy = this.flapBird.jump;
                    if (window.audioManager) window.audioManager.play('jump');
                }
            }
        }

        updateFlappy() {
            if (!this.isGameRunning) return;
            this.flapFrame++;
            const ctx = this.ctx;
            const canvas = this.canvas;

            ctx.fillStyle = '#060f09';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            this.flapBird.vy += this.flapBird.gravity;
            this.flapBird.y += this.flapBird.vy;

            // Dessin du Hibou
            ctx.drawImage(this.owlLogo, this.flapBird.x - 18, this.flapBird.y - 18, 36, 36);

            if (this.flapFrame % 90 === 0) {
                const gap = 125;
                const topHeight = Math.random() * (canvas.height - gap - 60) + 30;
                this.flapPipes.push({ x: canvas.width, w: 45, top: topHeight, gap, passed: false });
            }

            ctx.fillStyle = '#1e462c';
            for (let i = this.flapPipes.length - 1; i >= 0; i--) {
                const p = this.flapPipes[i];
                p.x -= 2.8;

                // Tuyaux
                ctx.fillRect(p.x, 0, p.w, p.top);
                ctx.fillRect(p.x, p.top + p.gap, p.w, canvas.height - (p.top + p.gap));

                // Bordures stylisées
                ctx.strokeStyle = '#d4af37';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(p.x, 0, p.w, p.top);
                ctx.strokeRect(p.x, p.top + p.gap, p.w, canvas.height - (p.top + p.gap));

                if (p.x + p.w < this.flapBird.x && !p.passed) {
                    if (window.audioManager) window.audioManager.play('coin');
                    p.passed = true;
                    this.flapScore++;
                    this.scoreEl.textContent = this.flapScore;
                }

                const bx = this.flapBird.x, by = this.flapBird.y;
                if (bx + 12 > p.x && bx - 12 < p.x + p.w) {
                    if (by - 12 < p.top || by + 12 > p.top + p.gap) {
                        this.gameOverFlappy();
                        return;
                    }
                }

                if (p.x + p.w < 0) this.flapPipes.splice(i, 1);
            }

            if (this.flapBird.y > canvas.height || this.flapBird.y < 0) {
                this.gameOverFlappy();
                return;
            }

            if (this.isGameRunning) {
                this.gameLoop = requestAnimationFrame(() => this.updateFlappy());
            }
        }

        gameOverFlappy() {
            this.triggerGameOver('flappy', this.flapScore);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'center';
            this.ctx.font = "600 24px 'Cinzel', serif";
            this.ctx.fillText('PARTIE TERMINÉE', this.canvas.width / 2, this.canvas.height / 2 - 10);
            this.ctx.font = "14px 'Outfit', sans-serif";
            this.ctx.fillText('Appuie sur ESPACE pour voler à nouveau', this.canvas.width / 2, this.canvas.height / 2 + 25);
        }

        /* ==========================================================================
           5. 🚀 HIBOU INVADERS
           ========================================================================== */
        initInvaders() {
            this.titleEl.textContent = '🚀 Hibou Invaders';
            this.instructionsEl.innerHTML = 'Flèches GAUCHE/DROITE pour bouger.<br>ESPACE pour tirer des lasers dorés.';
            this.startInvaders();
        }

        startInvaders() {
            this.invPlayer = { x: 185, y: 350, w: 30, speed: 5.5 };
            this.invBullets = [];
            this.invEnemies = [];
            this.invLeft = false;
            this.invRight = false;
            this.invScore = 0;
            this.invShootTimer = 0;
            this.invDirection = 1;
            this.isGameRunning = true;
            this.scoreEl.textContent = this.invScore;

            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 7; c++) {
                    this.invEnemies.push({ x: 40 + c * 45, y: 35 + r * 38, alive: true, type: (r % 2 === 0 ? '👾' : '🛸') });
                }
            }

            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = requestAnimationFrame(() => this.updateInvaders());
        }

        handleInvadersKey(e, isDown) {
            if (e.keyCode === 37) this.invLeft = isDown;
            if (e.keyCode === 39) this.invRight = isDown;
            if (e.keyCode === 32) {
                if (!this.isGameRunning && isDown) {
                    this.startInvaders();
                } else if (this.isGameRunning && isDown && this.invShootTimer <= 0) {
                    if (window.audioManager) window.audioManager.play('laser');
                    this.invBullets.push({ x: this.invPlayer.x, y: this.invPlayer.y - 15, vy: -7 });
                    this.invShootTimer = 14;
                }
            }
        }

        updateInvaders() {
            if (!this.isGameRunning) return;
            const ctx = this.ctx;
            const canvas = this.canvas;

            ctx.fillStyle = '#060f09';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            this.invShootTimer--;

            if (this.invLeft && this.invPlayer.x > 20) this.invPlayer.x -= this.invPlayer.speed;
            if (this.invRight && this.invPlayer.x < canvas.width - 20) this.invPlayer.x += this.invPlayer.speed;

            // Dessin du vaisseau
            ctx.drawImage(this.owlLogo, this.invPlayer.x - 18, this.invPlayer.y - 18, 36, 36);

            // Lasers
            ctx.fillStyle = '#d4af37';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#d4af37';
            for (let i = this.invBullets.length - 1; i >= 0; i--) {
                const b = this.invBullets[i];
                b.y += b.vy;
                ctx.fillRect(b.x - 2, b.y, 4, 14);
                if (b.y < 0) this.invBullets.splice(i, 1);
            }
            ctx.shadowBlur = 0;

            let hitEdge = false, aliveCount = 0;
            ctx.font = '22px Arial';
            ctx.textAlign = 'center';

            for (const e of this.invEnemies) {
                if (!e.alive) continue;
                aliveCount++;
                e.x += this.invDirection * 0.75;
                if (e.x > canvas.width - 25 || e.x < 25) hitEdge = true;

                ctx.fillText(e.type, e.x, e.y);

                for (let i = this.invBullets.length - 1; i >= 0; i--) {
                    const b = this.invBullets[i];
                    if (b.x > e.x - 15 && b.x < e.x + 15 && b.y > e.y - 15 && b.y < e.y + 15) {
                        if (window.audioManager) window.audioManager.play('explosion');
                        e.alive = false;
                        this.invBullets.splice(i, 1);
                        this.invScore += 10;
                        this.scoreEl.textContent = this.invScore;
                        break;
                    }
                }

                if (e.y > 330) {
                    this.triggerGameOver('invaders', this.invScore);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = "600 24px 'Cinzel', serif";
                    ctx.fillText('INVASION RÉUSSIE', canvas.width / 2, canvas.height / 2);
                    ctx.font = "14px 'Outfit', sans-serif";
                    ctx.fillText('Appuie sur ESPACE pour défendre à nouveau', canvas.width / 2, canvas.height / 2 + 30);
                    return;
                }
            }

            if (hitEdge) {
                this.invDirection *= -1;
                for (const e of this.invEnemies) e.y += 14;
            }

            if (aliveCount === 0) {
                for (let r = 0; r < 4; r++) {
                    for (let c = 0; c < 7; c++) {
                        this.invEnemies.push({ x: 40 + c * 45, y: 35 + r * 38, alive: true, type: (r % 2 === 0 ? '👾' : '🛸') });
                    }
                }
            }

            if (this.isGameRunning) {
                this.gameLoop = requestAnimationFrame(() => this.updateInvaders());
            }
        }

        /* ==========================================================================
           6. 🦘 FOREST RUN
           ========================================================================== */
        initRun() {
            this.titleEl.textContent = '🦘 Forest Run';
            this.instructionsEl.innerHTML = 'ESPACE ou clic pour sauter par-dessus les obstacles.';
            this.startRun();
        }

        startRun() {
            this.runPlayer = { x: 50, y: 350, vy: 0, gravity: 0.8, jump: -12, onGround: true };
            this.runObs = [];
            this.runFrame = 0;
            this.runScore = 0;
            this.isGameRunning = true;
            this.scoreEl.textContent = this.runScore;

            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = requestAnimationFrame(() => this.updateRun());
        }

        handleRunKey(e) {
            if (e.keyCode === 32) {
                if (!this.isGameRunning) {
                    this.startRun();
                } else if (this.runPlayer.onGround) {
                    if (window.audioManager) window.audioManager.play('jump');
                    this.runPlayer.vy = this.runPlayer.jump;
                    this.runPlayer.onGround = false;
                }
            }
        }

        updateRun() {
            if (!this.isGameRunning) return;
            this.runFrame++;
            this.runScore++;
            if (this.runFrame % 10 === 0) this.scoreEl.textContent = Math.floor(this.runScore / 10);

            const ctx = this.ctx;
            const canvas = this.canvas;

            ctx.fillStyle = '#060f09';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Sol de la forêt
            ctx.strokeStyle = '#294c34';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 365);
            ctx.lineTo(400, 365);
            ctx.stroke();

            this.runPlayer.vy += this.runPlayer.gravity;
            this.runPlayer.y += this.runPlayer.vy;

            if (this.runPlayer.y >= 350) {
                this.runPlayer.y = 350;
                this.runPlayer.vy = 0;
                this.runPlayer.onGround = true;
            }

            ctx.drawImage(this.owlLogo, this.runPlayer.x - 18, this.runPlayer.y - 18, 36, 36);

            if (this.runFrame % 80 === 0 || (this.runFrame > 300 && Math.random() < 0.02 && this.runFrame % 30 !== 0)) {
                this.runObs.push({ x: 400, y: 350, w: 22, h: 32 });
            }

            ctx.fillStyle = '#8b7327';
            for (let i = this.runObs.length - 1; i >= 0; i--) {
                const o = this.runObs[i];
                o.x -= (4.8 + this.runScore / 1400);
                ctx.fillRect(o.x, o.y - o.h / 2 + 15, o.w, o.h);

                if (this.runPlayer.x + 10 > o.x && this.runPlayer.x - 10 < o.x + o.w && this.runPlayer.y + 10 > o.y - o.h / 2 + 15) {
                    this.triggerGameOver('run', Math.floor(this.runScore / 10));
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.font = "600 24px 'Cinzel', serif";
                    ctx.fillText('PARTIE TERMINÉE', canvas.width / 2, canvas.height / 2 - 10);
                    ctx.font = "14px 'Outfit', sans-serif";
                    ctx.fillText('Appuie sur ESPACE pour courir à nouveau', canvas.width / 2, canvas.height / 2 + 25);
                    return;
                }

                if (o.x + o.w < 0) this.runObs.splice(i, 1);
            }

            if (this.isGameRunning) {
                this.gameLoop = requestAnimationFrame(() => this.updateRun());
            }
        }

        /* ==========================================================================
           7. 🧩 TETRIS MYSTIQUE
           ========================================================================== */
        initTetris() {
            this.titleEl.textContent = '🧩 Tetris Mystique';
            this.instructionsEl.innerHTML = 'Flèches GAUCHE/DROITE pour bouger. HAUT pour tourner. BAS accélère.<br>ESPACE pour relancer.';
            this.tCols = 10;
            this.tRows = 20;
            this.tBlock = 20;
            this.tColors = [null, '#d4af37', '#294c34', '#4CAF50', '#8b7327', '#1a3322', '#f1c40f', '#2ecc71'];
            this.tetrominos = [
                [],
                [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
                [[2,0,0],[2,2,2],[0,0,0]],                   // J
                [[0,0,3],[3,3,3],[0,0,0]],                   // L
                [[4,4],[4,4]],                               // O
                [[0,5,5],[5,5,0],[0,0,0]],                   // S
                [[0,6,0],[6,6,6],[0,0,0]],                   // T
                [[7,7,0],[0,7,7],[0,0,0]]                    // Z
            ];
            this.startTetris();
        }

        startTetris() {
            this.tBoard = Array.from({ length: this.tRows }, () => Array(this.tCols).fill(0));
            this.tScore = 0;
            this.scoreEl.textContent = this.tScore;
            this.spawnTetrisPiece();
            this.tDropCounter = 0;
            this.tLastTime = performance.now();
            this.isGameRunning = true;

            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = requestAnimationFrame((t) => this.updateTetris(t));
        }

        spawnTetrisPiece() {
            const typeId = Math.floor(Math.random() * 7) + 1;
            const matrix = this.tetrominos[typeId].map(row => [...row]);
            this.tPiece = {
                matrix,
                pos: { x: Math.floor(this.tCols / 2) - Math.floor(matrix[0].length / 2), y: 0 }
            };

            if (this.tCollide(this.tBoard, this.tPiece)) {
                this.triggerGameOver('tetris', this.tScore);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.textAlign = 'center';
                this.ctx.font = "600 24px 'Cinzel', serif";
                this.ctx.fillText('PARTIE TERMINÉE', this.canvas.width / 2, this.canvas.height / 2 - 10);
                this.ctx.font = "14px 'Outfit', sans-serif";
                this.ctx.fillText('Appuie sur ESPACE pour rejouer', this.canvas.width / 2, this.canvas.height / 2 + 25);
            }
        }

        handleTetrisKey(e) {
            if (!this.isGameRunning && e.keyCode === 32) {
                this.startTetris();
                return;
            }
            if (!this.isGameRunning) return;

            if (e.keyCode === 37) {
                this.tPiece.pos.x--;
                if (this.tCollide(this.tBoard, this.tPiece)) this.tPiece.pos.x++;
            }
            if (e.keyCode === 39) {
                this.tPiece.pos.x++;
                if (this.tCollide(this.tBoard, this.tPiece)) this.tPiece.pos.x--;
            }
            if (e.keyCode === 40) {
                this.tPlayerDrop();
            }
            if (e.keyCode === 38) {
                if (window.audioManager) window.audioManager.play('jump');
                const pos = this.tPiece.pos.x;
                let offset = 1;
                this.tRotate(this.tPiece.matrix);
                while (this.tCollide(this.tBoard, this.tPiece)) {
                    this.tPiece.pos.x += offset;
                    offset = -(offset + (offset > 0 ? 1 : -1));
                    if (offset > this.tPiece.matrix[0].length) {
                        this.tRotate(this.tPiece.matrix, -1);
                        this.tPiece.pos.x = pos;
                        return;
                    }
                }
            }
        }

        tRotate(matrix, dir = 1) {
            for (let y = 0; y < matrix.length; y++) {
                for (let x = 0; x < y; x++) {
                    [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
                }
            }
            if (dir > 0) matrix.forEach(row => row.reverse());
            else matrix.reverse();
        }

        tCollide(board, player) {
            const [m, o] = [player.matrix, player.pos];
            for (let y = 0; y < m.length; ++y) {
                for (let x = 0; x < m[y].length; ++x) {
                    if (m[y][x] !== 0 && (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) return true;
                }
            }
            return false;
        }

        tPlayerDrop() {
            this.tPiece.pos.y++;
            if (this.tCollide(this.tBoard, this.tPiece)) {
                if (window.audioManager) window.audioManager.play('jump');
                this.tPiece.pos.y--;
                this.tMerge(this.tBoard, this.tPiece);
                this.tSweep();
                this.spawnTetrisPiece();
            }
            this.tDropCounter = 0;
        }

        tMerge(board, player) {
            player.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) board[y + player.pos.y][x + player.pos.x] = value;
                });
            });
        }

        tSweep() {
            outer: for (let y = this.tBoard.length - 1; y >= 0; --y) {
                for (let x = 0; x < this.tBoard[y].length; ++x) {
                    if (this.tBoard[y][x] === 0) continue outer;
                }
                const row = this.tBoard.splice(y, 1)[0].fill(0);
                this.tBoard.unshift(row);
                if (window.audioManager) window.audioManager.play('coin');
                ++y;
                this.tScore += 100;
                this.scoreEl.textContent = this.tScore;
            }
        }

        updateTetris(time = 0) {
            if (!this.isGameRunning) return;
            const deltaTime = time - this.tLastTime;
            this.tLastTime = time;
            this.tDropCounter += deltaTime;
            if (this.tDropCounter > 1000) this.tPlayerDrop();

            const ctx = this.ctx;
            const canvas = this.canvas;
            ctx.fillStyle = '#060f09';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.translate(100, 0);
            ctx.strokeStyle = 'rgba(41, 76, 52, 0.6)';
            ctx.strokeRect(0, 0, this.tCols * this.tBlock, this.tRows * this.tBlock);

            this.tDrawMatrix(this.tBoard, { x: 0, y: 0 });
            this.tDrawMatrix(this.tPiece.matrix, this.tPiece.pos);
            ctx.restore();

            this.gameLoop = requestAnimationFrame((t) => this.updateTetris(t));
        }

        tDrawMatrix(matrix, offset) {
            matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        this.ctx.fillStyle = this.tColors[value];
                        this.ctx.fillRect((x + offset.x) * this.tBlock, (y + offset.y) * this.tBlock, this.tBlock, this.tBlock);
                        this.ctx.strokeStyle = '#050a07';
                        this.ctx.strokeRect((x + offset.x) * this.tBlock, (y + offset.y) * this.tBlock, this.tBlock, this.tBlock);
                    }
                });
            });
        }
    }

    window.arcadeEngine = new ArcadeEngine();
    // Expositions globales pour compatibilité inline (si boutons existants)
    window.launchGame = (name) => window.arcadeEngine.launchGame(name);
    window.showArcadeMenu = () => window.arcadeEngine.showMenu();
    window.openArcadeMenu = () => window.arcadeEngine.openMenu();
})();
