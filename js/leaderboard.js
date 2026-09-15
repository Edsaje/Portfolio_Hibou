// Gestionnaire du Leaderboard en ligne & Saisie Rétro 3 Lettres
// Portfolio Quentin Beaud (Hibouxe / Edsaje)

(function () {
    'use strict';

    class LeaderboardManager {
        constructor() {
            this.apiUrl = 'api/scores.php';
            this.currentGame = 'snake';
            this.pendingScore = 0;
            this.pendingCallback = null;

            this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?_'.split('');
            this.currentLetters = ['A', 'A', 'A'];
            this.activeSlot = 0;

            this.gamesConfig = {
                'snake': { name: 'Snake Doré', icon: '🐍', unit: 'pts' },
                'pong': { name: 'Pong Magique', icon: '🏓', unit: 'pts' },
                'breakout': { name: 'Casse-Briques', icon: '🧱', unit: 'pts' },
                'flappy': { name: 'Flappy Hibou', icon: '🦉', unit: 'pts' },
                'invaders': { name: 'Hibou Invaders', icon: '👾', unit: 'pts' },
                'run': { name: 'Forest Run', icon: '🌲', unit: 'pts' },
                'tetris': { name: 'Tetris Mystique', icon: '🧩', unit: 'pts' },
                'vectrex': { name: 'Vectrex (Mine Storm)', icon: '⚡', unit: 'pts' },
                'clicker': { name: 'Hibou Clicker', icon: '🪶', unit: 'plumes' }
            };

            this.cache = {};
            this.loadSavedTag();
        }

        init() {
            this.createModals();
            this.bindGlobalEvents();
        }

        loadSavedTag() {
            const saved = localStorage.getItem('hibou_player_tag');
            if (saved && saved.length >= 3) {
                this.currentLetters = [
                    saved[0] ? saved[0].toUpperCase() : 'A',
                    saved[1] ? saved[1].toUpperCase() : 'A',
                    saved[2] ? saved[2].toUpperCase() : 'A'
                ];
            }
        }

        saveTag(tag) {
            localStorage.setItem('hibou_player_tag', tag.toUpperCase());
        }

        /**
         * Injecte dynamiquement les modales de score et de classement si non présentes
         */
        createModals() {
            if (!document.getElementById('score-entry-modal')) {
                const entryModal = document.createElement('div');
                entryModal.id = 'score-entry-modal';
                entryModal.className = 'arcade-modal score-entry-modal';
                entryModal.innerHTML = `
                    <div class="arcade-modal-content score-modal-box">
                        <button class="close-arcade close-score-entry" aria-label="Fermer">×</button>
                        <div class="score-entry-badge">🏆 NOUVEAU RECORD 🏆</div>
                        <h3 id="score-entry-game-title" class="score-game-name">Snake Doré</h3>
                        <div class="score-display-box">
                            <span class="score-label">SCORE RÉALISÉ</span>
                            <span id="score-entry-value" class="score-big-num">0</span>
                        </div>

                        <p class="score-instruction">Entrez vos 3 initiales pour le tableau d'honneur :</p>
                        
                        <!-- Sélecteur 3 Lettres Arcade -->
                        <div id="arcade-tag-picker" class="tag-picker-container">
                            <div class="letter-wheel" data-slot="0">
                                <button type="button" class="wheel-btn wheel-up" data-slot="0" aria-label="Lettre suivante">▲</button>
                                <div class="letter-box active" id="slot-0">A</div>
                                <button type="button" class="wheel-btn wheel-down" data-slot="0" aria-label="Lettre précédente">▼</button>
                            </div>
                            <div class="letter-wheel" data-slot="1">
                                <button type="button" class="wheel-btn wheel-up" data-slot="1" aria-label="Lettre suivante">▲</button>
                                <div class="letter-box" id="slot-1">A</div>
                                <button type="button" class="wheel-btn wheel-down" data-slot="1" aria-label="Lettre précédente">▼</button>
                            </div>
                            <div class="letter-wheel" data-slot="2">
                                <button type="button" class="wheel-btn wheel-up" data-slot="2" aria-label="Lettre suivante">▲</button>
                                <div class="letter-box" id="slot-2">A</div>
                                <button type="button" class="wheel-btn wheel-down" data-slot="2" aria-label="Lettre précédente">▼</button>
                            </div>
                        </div>

                        <!-- Input direct text pour clicker ou saisie clavier rapide -->
                        <div id="clicker-pseudo-container" class="clicker-pseudo-box" style="display: none;">
                            <input type="text" id="clicker-pseudo-input" maxlength="10" placeholder="VOTRE PSEUDO" class="arcade-text-input">
                        </div>

                        <!-- Input invisible pour capture clavier mobile fluide -->
                        <input type="text" id="arcade-tag-hidden-input" maxlength="3" class="hidden-mobile-input" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false">

                        <div class="score-actions">
                            <button type="button" id="btn-submit-score" class="btn btn-primary btn-save-score">
                                <span>💾</span> ENREGISTRER MON SCORE
                            </button>
                            <button type="button" id="btn-skip-score" class="btn btn-secondary btn-skip-score">Passer</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(entryModal);
            }

            if (!document.getElementById('leaderboard-modal')) {
                const lbModal = document.createElement('div');
                lbModal.id = 'leaderboard-modal';
                lbModal.className = 'arcade-modal leaderboard-modal';
                lbModal.innerHTML = `
                    <div class="arcade-modal-content lb-modal-box">
                        <button class="close-arcade close-lb-modal" aria-label="Fermer">×</button>
                        <div class="lb-header">
                            <div class="score-entry-badge">🏆 CLASSEMENT OFFICIEL 🏆</div>
                            <h3 class="lb-title">HALL OF FAME</h3>
                            <p class="lb-subtitle">Les meilleurs scores enregistrés sur le serveur</p>
                        </div>

                        <!-- Onglets des jeux -->
                        <div class="lb-tabs" id="lb-tabs-container"></div>

                        <!-- Table des scores -->
                        <div class="lb-table-container">
                            <table class="lb-table">
                                <thead>
                                    <tr>
                                        <th class="th-rank">RANG</th>
                                        <th class="th-tag">JOUEUR</th>
                                        <th class="th-score">SCORE</th>
                                        <th class="th-date">DATE</th>
                                    </tr>
                                </thead>
                                <tbody id="lb-table-body">
                                    <tr>
                                        <td colspan="4" class="lb-loading">Chargement des scores...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="lb-footer-actions">
                            <button type="button" class="btn btn-primary close-lb-btn">Fermer</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(lbModal);
            }
        }

        bindGlobalEvents() {
            // Fermeture modale saisie
            document.addEventListener('click', (e) => {
                if (e.target.matches('.close-score-entry, #btn-skip-score')) {
                    this.closeScoreEntry();
                }
                if (e.target.matches('.close-lb-modal, .close-lb-btn')) {
                    this.closeLeaderboard();
                }
            });

            // Bouton soumission score
            const submitBtn = document.getElementById('btn-submit-score');
            if (submitBtn) {
                submitBtn.addEventListener('click', () => this.submitCurrentScore());
            }

            // Boutons flèches pour les lettres
            document.addEventListener('click', (e) => {
                if (e.target.matches('.wheel-up')) {
                    const slot = parseInt(e.target.dataset.slot, 10);
                    this.changeLetter(slot, 1);
                } else if (e.target.matches('.wheel-down')) {
                    const slot = parseInt(e.target.dataset.slot, 10);
                    this.changeLetter(slot, -1);
                } else if (e.target.matches('.letter-box')) {
                    const slot = parseInt(e.target.parentElement.dataset.slot, 10);
                    this.setActiveSlot(slot);
                }
            });

            // Input caché pour saisie directe au clavier
            const hiddenInput = document.getElementById('arcade-tag-hidden-input');
            const picker = document.getElementById('arcade-tag-picker');
            if (picker && hiddenInput) {
                picker.addEventListener('click', () => {
                    hiddenInput.focus();
                });

                hiddenInput.addEventListener('input', (e) => {
                    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    for (let i = 0; i < 3; i++) {
                        this.currentLetters[i] = val[i] || 'A';
                    }
                    this.updateLetterBoxes();
                    if (val.length >= 3) {
                        hiddenInput.blur();
                    }
                });
            }

            // Clavier physique (flèches et touches lettres)
            document.addEventListener('keydown', (e) => {
                const entryModal = document.getElementById('score-entry-modal');
                if (!entryModal || !entryModal.classList.contains('active')) return;

                if (this.currentGame === 'clicker') return;

                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.changeLetter(this.activeSlot, 1);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.changeLetter(this.activeSlot, -1);
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.setActiveSlot((this.activeSlot + 1) % 3);
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.setActiveSlot((this.activeSlot + 2) % 3);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.submitCurrentScore();
                } else if (/^[a-zA-Z0-9]$/.test(e.key)) {
                    this.currentLetters[this.activeSlot] = e.key.toUpperCase();
                    this.updateLetterBoxes();
                    this.setActiveSlot((this.activeSlot + 1) % 3);
                }
            });
        }

        changeLetter(slot, direction) {
            let current = this.currentLetters[slot] || 'A';
            let idx = this.alphabet.indexOf(current);
            if (idx === -1) idx = 0;
            idx = (idx + direction + this.alphabet.length) % this.alphabet.length;
            this.currentLetters[slot] = this.alphabet[idx];
            this.updateLetterBoxes();
            this.setActiveSlot(slot);
            if (window.audioManager) window.audioManager.play('menu');
        }

        setActiveSlot(slot) {
            this.activeSlot = slot;
            for (let i = 0; i < 3; i++) {
                const box = document.getElementById(`slot-${i}`);
                if (box) {
                    box.classList.toggle('active', i === slot);
                }
            }
        }

        updateLetterBoxes() {
            for (let i = 0; i < 3; i++) {
                const box = document.getElementById(`slot-${i}`);
                if (box) {
                    box.textContent = this.currentLetters[i] || 'A';
                }
            }
        }

        /**
         * Ouvre la modale de saisie du score
         */
        promptHighScore(game, score, callback) {
            if (score <= 0) {
                if (callback) callback();
                return;
            }

            this.currentGame = game;
            this.pendingScore = score;
            this.pendingCallback = callback;

            const modal = document.getElementById('score-entry-modal');
            const titleEl = document.getElementById('score-entry-game-title');
            const scoreEl = document.getElementById('score-entry-value');
            const tagPicker = document.getElementById('arcade-tag-picker');
            const clickerBox = document.getElementById('clicker-pseudo-container');
            const clickerInput = document.getElementById('clicker-pseudo-input');

            if (!modal) return;

            const gameCfg = this.gamesConfig[game] || { name: game, icon: '🎮', unit: 'pts' };
            if (titleEl) titleEl.textContent = `${gameCfg.icon} ${gameCfg.name}`;
            if (scoreEl) scoreEl.textContent = `${Math.floor(score).toLocaleString('fr-FR')} ${gameCfg.unit}`;

            if (game === 'clicker') {
                if (tagPicker) tagPicker.style.display = 'none';
                if (clickerBox) clickerBox.style.display = 'block';
                if (clickerInput) {
                    clickerInput.value = localStorage.getItem('hibou_player_tag') || 'HIBOUXE';
                }
            } else {
                if (tagPicker) tagPicker.style.display = 'flex';
                if (clickerBox) clickerBox.style.display = 'none';
                this.updateLetterBoxes();
                this.setActiveSlot(0);
            }

            modal.classList.add('active');
            if (window.audioManager) window.audioManager.play('trophy');
        }

        closeScoreEntry() {
            const modal = document.getElementById('score-entry-modal');
            if (modal) modal.classList.remove('active');
            if (this.pendingCallback) {
                const cb = this.pendingCallback;
                this.pendingCallback = null;
                cb();
            }
        }

        /**
         * Démarre une session de jeu signée pour la vérification anti-triche
         */
        async startSession(gameName) {
            this.currentSession = null;
            if (gameName === 'clicker') return;
            try {
                const res = await fetch(`${this.apiUrl}?action=start_session&game=${encodeURIComponent(gameName)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success' && data.session) {
                        this.currentSession = {
                            game: gameName,
                            token: data.session,
                            startTime: Date.now()
                        };
                    }
                }
            } catch (e) {
                // Mode hors-ligne automatique
            }
        }

        async submitCurrentScore() {
            let tag = '';
            if (this.currentGame === 'clicker') {
                const input = document.getElementById('clicker-pseudo-input');
                tag = input ? input.value.trim().toUpperCase() : 'HIBOUXE';
                if (!tag) tag = 'JOUEUR';
                tag = tag.substring(0, 10);
            } else {
                tag = this.currentLetters.join('').toUpperCase();
            }

            this.saveTag(tag);

            const submitBtn = document.getElementById('btn-submit-score');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Envoi...';
            }

            const sessionToken = (this.currentSession && this.currentSession.game === this.currentGame) 
                ? this.currentSession.token 
                : '';

            try {
                const res = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game: this.currentGame,
                        tag: tag,
                        score: this.pendingScore,
                        session: sessionToken
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success') {
                        this.cache[this.currentGame] = data.data;
                    }
                } else {
                    const errData = await res.json().catch(() => null);
                    const msg = (errData && errData.message) ? errData.message : 'Erreur lors de la validation du score.';
                    console.warn('Rejet du score par le serveur :', msg);
                    alert(`⚠️ ${msg}\nVotre score a tout de même été sauvegardé localement sur ce navigateur.`);
                    this.saveScoreLocally(this.currentGame, tag, this.pendingScore);
                }
            } catch (err) {
                console.warn('Mode hors-ligne ou erreur serveur, sauvegarde en local :', err);
                this.saveScoreLocally(this.currentGame, tag, this.pendingScore);
            }

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>💾</span> ENREGISTRER MON SCORE';
            }

            this.closeScoreEntry();
            this.openLeaderboard(this.currentGame);
        }

        saveScoreLocally(game, tag, score) {
            const key = `hibou_local_scores_${game}`;
            let list = [];
            try {
                list = JSON.parse(localStorage.getItem(key)) || [];
            } catch (e) {
                list = [];
            }
            list.push({ tag, score, date: new Date().toISOString().split('T')[0] });
            list.sort((a, b) => b.score - a.score);
            list = list.slice(0, 10);
            localStorage.setItem(key, JSON.stringify(list));
            this.cache[game] = list;
        }

        /**
         * Ouvre le tableau des scores (Leaderboard / Hall of Fame)
         */
        async openLeaderboard(defaultGame = 'snake') {
            const modal = document.getElementById('leaderboard-modal');
            if (!modal) return;

            this.renderTabs(defaultGame);
            modal.classList.add('active');
            await this.loadScoresForGame(defaultGame);
        }

        closeLeaderboard() {
            const modal = document.getElementById('leaderboard-modal');
            if (modal) modal.classList.remove('active');
        }

        renderTabs(activeGame) {
            const container = document.getElementById('lb-tabs-container');
            if (!container) return;

            container.innerHTML = '';
            Object.keys(this.gamesConfig).forEach(gameKey => {
                const cfg = this.gamesConfig[gameKey];
                const tab = document.createElement('button');
                tab.type = 'button';
                tab.className = `lb-tab ${gameKey === activeGame ? 'active' : ''}`;
                tab.textContent = `${cfg.icon} ${cfg.name}`;
                tab.addEventListener('click', () => {
                    container.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    this.loadScoresForGame(gameKey);
                });
                container.appendChild(tab);
            });
        }

        async loadScoresForGame(game) {
            const tbody = document.getElementById('lb-table-body');
            if (!tbody) return;

            tbody.innerHTML = `<tr><td colspan="4" class="lb-loading">Chargement des scores...</td></tr>`;

            let scoresList = null;

            try {
                const res = await fetch(`${this.apiUrl}?game=${encodeURIComponent(game)}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.status === 'success') {
                        scoresList = json.data;
                        this.cache[game] = scoresList;
                    }
                }
            } catch (e) {
                console.warn('Récupération serveur impossible, utilisation du cache/local :', e);
            }

            if (!scoresList) {
                const key = `hibou_local_scores_${game}`;
                scoresList = this.cache[game] || JSON.parse(localStorage.getItem(key)) || this.getFallbackScores(game);
            }

            this.renderTable(game, scoresList);
        }

        getFallbackScores(game) {
            const defaults = {
                'snake': [{ tag: 'HIB', score: 280, date: '2026-08-25' }, { tag: 'QUB', score: 210, date: '2026-08-26' }, { tag: 'EDS', score: 150, date: '2026-08-27' }],
                'pong': [{ tag: 'HIB', score: 15, date: '2026-08-25' }, { tag: 'QUB', score: 11, date: '2026-08-26' }],
                'breakout': [{ tag: 'HIB', score: 540, date: '2026-08-25' }, { tag: 'QUB', score: 420, date: '2026-08-26' }],
                'flappy': [{ tag: 'HIB', score: 42, date: '2026-08-25' }, { tag: 'QUB', score: 31, date: '2026-08-26' }],
                'invaders': [{ tag: 'HIB', score: 1250, date: '2026-08-25' }, { tag: 'QUB', score: 980, date: '2026-08-26' }],
                'run': [{ tag: 'HIB', score: 890, date: '2026-08-25' }, { tag: 'QUB', score: 640, date: '2026-08-26' }],
                'tetris': [{ tag: 'HIB', score: 3200, date: '2026-08-25' }, { tag: 'QUB', score: 2450, date: '2026-08-26' }],
                'vectrex': [{ tag: 'HIB', score: 1840, date: '2026-08-25' }, { tag: 'QUB', score: 1420, date: '2026-08-26' }],
                'clicker': [{ tag: 'HIBOUXE', score: 5000000, date: '2026-08-25' }, { tag: 'EDSAJE', score: 1200000, date: '2026-08-26' }]
            };
            return defaults[game] || [{ tag: 'AAA', score: 100, date: '2026-08-25' }];
        }

        renderTable(game, scoresList) {
            const tbody = document.getElementById('lb-table-body');
            if (!tbody) return;

            if (!scoresList || scoresList.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="lb-empty">Aucun score enregistré pour le moment. Soyez le premier !</td></tr>`;
                return;
            }

            const cfg = this.gamesConfig[game] || { unit: 'pts' };
            const myTag = (localStorage.getItem('hibou_player_tag') || '').toUpperCase();

            tbody.innerHTML = scoresList.map((entry, index) => {
                const rank = index + 1;
                let rankBadge = `${rank}TH`;
                let rowClass = '';
                if (rank === 1) { rankBadge = '🥇 1ST'; rowClass = 'rank-gold'; }
                else if (rank === 2) { rankBadge = '🥈 2ND'; rowClass = 'rank-silver'; }
                else if (rank === 3) { rankBadge = '🥉 3RD'; rowClass = 'rank-bronze'; }

                const isMe = myTag && entry.tag.toUpperCase() === myTag;
                if (isMe) rowClass += ' rank-current-user';

                const formattedScore = Math.floor(entry.score).toLocaleString('fr-FR');

                return `
                    <tr class="${rowClass}">
                        <td class="td-rank"><span class="rank-pill">${rankBadge}</span></td>
                        <td class="td-tag"><strong>${escapeHtml(entry.tag)}</strong></td>
                        <td class="td-score">${formattedScore} <small>${cfg.unit}</small></td>
                        <td class="td-date">${entry.date || '-'}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, function (m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    }

    // Instanciation globale
    window.leaderboardManager = new LeaderboardManager();

    document.addEventListener('DOMContentLoaded', () => {
        window.leaderboardManager.init();
    });
})();
