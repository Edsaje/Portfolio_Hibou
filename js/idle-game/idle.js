// Mini-jeu incrémental : Hibou Clicker 2.0 (Vanilla JS / LocalStorage)
// Fonctionnalités : Multi-achat (x1/x10/x100/MAX), Clics Critiques, Sorts Actifs, 
// Lucioles Dorées Aléatoires, Arbre de Talents Célestes, Gains Hors-Ligne & 18 Succès.

(function () {
    'use strict';

    class IdleGame {
        constructor() {
            this.idleScore = 0;
            this.feathersPerClick = 1;
            this.autoFeathersPerSec = 0;
            this.prestigeMult = 1;
            this.celestialFeathers = 0;
            this.celestialFeathersEarned = 0;
            
            // Statistiques détaillées
            this.totalClicks = 0;
            this.totalCrits = 0;
            this.totalFireflies = 0;
            this.totalSpellsCast = 0;
            this.totalFeathers = 0;
            this.playTimeSeconds = 0;
            this.rebirthCount = 0;
            this.lastSaveTime = Date.now();

            // Mode d'achat multiple ('1', '10', '100', 'max')
            this.buyMode = '1';

            // Améliorations (4 clics + 7 automatiques)
            this.upgrades = {
                click:  { baseCost: 10,       baseAdd: 1,      count: 0, ratio: 1.20, type: 'click' },
                click2: { baseCost: 1000,     baseAdd: 10,     count: 0, ratio: 1.20, type: 'click' },
                click3: { baseCost: 20000,    baseAdd: 100,    count: 0, ratio: 1.20, type: 'click' },
                click4: { baseCost: 500000,   baseAdd: 1500,   count: 0, ratio: 1.20, type: 'click' },
                auto1:  { baseCost: 50,       baseAdd: 1,      count: 0, ratio: 1.15, type: 'auto' },
                auto2:  { baseCost: 500,      baseAdd: 15,     count: 0, ratio: 1.15, type: 'auto' },
                auto3:  { baseCost: 5000,     baseAdd: 100,    count: 0, ratio: 1.15, type: 'auto' },
                auto4:  { baseCost: 25000,    baseAdd: 800,    count: 0, ratio: 1.15, type: 'auto' },
                auto5:  { baseCost: 150000,   baseAdd: 5000,   count: 0, ratio: 1.15, type: 'auto' },
                auto6:  { baseCost: 1000000,  baseAdd: 35000,  count: 0, ratio: 1.15, type: 'auto' },
                auto7:  { baseCost: 10000000, baseAdd: 250000, count: 0, ratio: 1.15, type: 'auto' }
            };

            // Talents Célestes (Dépense permanente de Plumes Célestes)
            this.talents = {
                'crit-chance': { level: 0, max: 5, costs: [1, 2, 4, 8, 16] },
                'crit-mult':   { level: 0, max: 5, costs: [2, 5, 10, 20, 40] },
                'discount':    { level: 0, max: 5, costs: [1, 3, 6, 12, 24] },
                'offline':     { level: 0, max: 4, costs: [2, 4, 8, 16] },
                'offline-cap': { level: 0, max: 4, costs: [2, 5, 10, 20] },
                'firefly':     { level: 0, max: 3, costs: [3, 8, 15] }
            };

            // Sorts Actifs & Scripts
            this.spells = {
                coffee: { id: 'coffee', name: 'Caféine Pure', cdMax: 120, duration: 25, cd: 0, active: 0, icon: '☕', desc: 'Clics x2' },
                deploy: { id: 'deploy', name: 'Déploiement Vendredi 17h', cdMax: 240, duration: 0, cd: 0, active: 0, icon: '🚀', desc: 'Burst 10m' },
                godot:  { id: 'godot',  name: 'Moteur Turbo C# Godot', cdMax: 420, duration: 15, cd: 0, active: 0, icon: '🎮', desc: 'Auto x5' }
            };

            // Buffs temporaires (Lucioles dorées, etc.)
            this.buffs = {
                frenzy: { duration: 0, mult: 7, name: '⚡ Frénésie de Clics (x7)' },
                boost:  { duration: 0, mult: 4, name: '🚀 Boost Compilation (x4)' }
            };

            // 18 Succès
            this.achievements = {
                first_click:     { unlocked: false, title: "Premier Clic (1 clic)", desc: "Faire ton 1er clic sur le hibou." },
                clicks_100:      { unlocked: false, title: "Spam Débutant (100 clics)", desc: "Faire 100 clics manuels." },
                clicks_1000:     { unlocked: false, title: "Doigts d'Acier (1 000 clics)", desc: "Faire 1 000 clics manuels." },
                clicks_10k:      { unlocked: false, title: "Frénésie Manuelle (10k clics)", desc: "Faire 10 000 clics manuels." },
                feathers_100:    { unlocked: false, title: "Plumes Débutant (100 plumes)", desc: "Récolter 100 plumes au total." },
                feathers_10k:    { unlocked: false, title: "Plumes d'Argent (10k plumes)", desc: "Récolter 10 000 plumes au total." },
                feathers_1m:     { unlocked: false, title: "Millionnaire Nocturne (1M plumes)", desc: "Récolter 1 000 000 de plumes." },
                feathers_1b:     { unlocked: false, title: "Milliardaire Céleste (1B plumes)", desc: "Récolter 1 Milliard de plumes." },
                feathers_1t:     { unlocked: false, title: "Trillionnaire Galactique (1T plumes)", desc: "Récolter 1 Trillion de plumes." },
                pps_100:         { unlocked: false, title: "Usine à Plumes (100/sec)", desc: "Production de 100 plumes/sec." },
                pps_10k:         { unlocked: false, title: "Industrie Mystique (10k/sec)", desc: "Production de 10 000 plumes/sec." },
                pps_1m:          { unlocked: false, title: "Supercalculateur (1M/sec)", desc: "Production de 1 000 000 plumes/sec." },
                click_god:       { unlocked: false, title: "Clic Divin (100/clic)", desc: "Puissance de 100 plumes par clic." },
                first_crit:      { unlocked: false, title: "Coup de Maître", desc: "Déclencher son 1er coup critique." },
                firefly_catcher: { unlocked: false, title: "Chasseur de Lucioles", desc: "Attraper sa 1ère Luciole Dorée." },
                firefly_master:  { unlocked: false, title: "Maître des Étoiles", desc: "Attraper 10 Lucioles Dorées." },
                spell_caster:    { unlocked: false, title: "Mage du Code", desc: "Lancer 5 sorts actifs." },
                first_prestige:  { unlocked: false, title: "Renaissance Stellaire", desc: "Effectuer sa 1ère Renaissance Céleste." }
            };

            this.fireflyTimer = 45; // Secondes avant prochaine luciole
            this.intervalId = null;
        }

        /**
         * Formate les grands nombres de manière lisible (K, M, B, T, Qa, Qi).
         */
        static formatNum(num) {
            if (num === undefined || isNaN(num)) return "0";
            if (num < 10000) return Math.floor(num).toLocaleString('fr-FR');
            if (num < 1000000) return (num / 1000).toFixed(1) + ' K';
            if (num < 1000000000) return (num / 1000000).toFixed(2) + ' M';
            if (num < 1e12) return (num / 1e9).toFixed(2) + ' B';
            if (num < 1e15) return (num / 1e12).toFixed(2) + ' T';
            if (num < 1e18) return (num / 1e15).toFixed(2) + ' Qa';
            if (num < 1e21) return (num / 1e18).toFixed(2) + ' Qi';
            if (num < 1e24) return (num / 1e21).toFixed(2) + ' Sx';
            if (num < 1e27) return (num / 1e24).toFixed(2) + ' Sp';
            return num.toExponential(2);
        }

        static getMilestoneMult(count) {
            let mult = 1;
            if (count >= 25) mult *= 2;
            if (count >= 50) mult *= 2;
            if (count >= 100) mult *= 2;
            if (count >= 250) mult *= 2;
            return mult;
        }

        static getMilestoneStars(count) {
            if (count >= 250) return "⭐⭐⭐⭐ (x16)";
            if (count >= 100) return "⭐⭐⭐ (x8)";
            if (count >= 50) return "⭐⭐ (x4)";
            if (count >= 25) return "⭐ (x2)";
            return "";
        }

        init() {
            this.loadSave();
            this.offlineEarningsProcessed = false;
            this.cacheDOMElements();
            this.bindEvents();
            this.recalculateRates();
            this.updateUI();

            // Boucle principale de jeu (1 seconde)
            if (this.intervalId) clearInterval(this.intervalId);
            this.intervalId = setInterval(() => this.tick(), 1000);
        }

        cacheDOMElements() {
            this.dom = {
                toggle: document.getElementById('idle-toggle'),
                panel: document.getElementById('idle-panel'),
                close: document.getElementById('close-idle'),
                logo: document.getElementById('idle-logo'),
                score: document.getElementById('idle-score-val'),
                pps: document.getElementById('idle-pps-val'),
                cpc: document.getElementById('idle-cpc-val'),
                critBadge: document.getElementById('crit-chance-display'),
                buffsContainer: document.getElementById('idle-active-buffs'),
                feedback: document.getElementById('idle-click-feedback-container'),
                prestigeBadge: document.getElementById('idle-prestige-badge'),
                prestigeContainer: document.getElementById('prestige-container'),
                achievCount: document.getElementById('achiev-count'),
                achievBonus: document.getElementById('achiev-bonus-display'),
                celOwned: document.getElementById('celestial-owned-val'),
                celBonus: document.getElementById('celestial-bonus-val'),
                celGain: document.getElementById('celestial-gain-val'),
                btnPrestige: document.getElementById('btn-trigger-prestige'),
                
                // Stats
                statClicks: document.getElementById('stat-clicks'),
                statCrits: document.getElementById('stat-crits'),
                statFireflies: document.getElementById('stat-fireflies'),
                statSpells: document.getElementById('stat-spells'),
                statTotal: document.getElementById('stat-total-feathers'),
                statTime: document.getElementById('stat-time'),
                statPrestige: document.getElementById('stat-prestige'),
                statRebirths: document.getElementById('stat-rebirths'),

                // Modale hors-ligne
                offlineModal: document.getElementById('offline-gains-modal'),
                offlineDuration: document.getElementById('offline-duration-val'),
                offlineFeathers: document.getElementById('offline-feathers-val'),
                btnClaimOffline: document.getElementById('btn-claim-offline'),
                closeOfflineBtn: document.getElementById('close-offline-modal'),

                // Toast
                toast: document.getElementById('achievement-toast'),
                toastTitle: document.getElementById('toast-title')
            };

            // Cache améliorations
            for (const key in this.upgrades) {
                const u = this.upgrades[key];
                u.btn = document.getElementById(`upg-${key}`);
                u.costEl = document.getElementById(`cost-${key}`);
                u.countEl = document.getElementById(`count-${key}`);
                u.starsEl = document.getElementById(`stars-${key}`);
                u.descEl = document.getElementById(`desc-${key}`);
            }

            // Cache succès
            for (const key in this.achievements) {
                this.achievements[key].el = document.getElementById(`ach-${key}`);
            }
        }

        bindEvents() {
            if (this.dom.toggle && this.dom.panel) {
                this.dom.toggle.addEventListener('click', () => {
                    this.dom.panel.classList.add('active');
                    this.dom.toggle.classList.add('hidden');
                    
                    if (!this.offlineEarningsProcessed) {
                        this.offlineEarningsProcessed = true;
                        this.checkOfflineEarnings();
                    }

                    this.updateUI();
                });

                if (this.dom.close) {
                    this.dom.close.addEventListener('click', () => {
                        this.dom.panel.classList.remove('active');
                        this.dom.toggle.classList.remove('hidden');
                    });
                }
            }

            if (this.dom.logo) {
                this.dom.logo.addEventListener('click', (e) => this.handleManualClick(e));
            }

            if (this.dom.btnPrestige) {
                this.dom.btnPrestige.addEventListener('click', () => this.triggerPrestige());
            }

            // Sélecteur d'achat multiple
            const buyModeBtns = document.querySelectorAll('.buy-mode-btn');
            buyModeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    buyModeBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.buyMode = btn.dataset.mode || '1';
                    this.updateUI();
                });
            });

            // Sorts Actifs
            for (const key in this.spells) {
                const btn = document.getElementById(`btn-cast-${key}`);
                if (btn) {
                    btn.addEventListener('click', () => this.castSpell(key));
                }
            }

            // Talents Célestes
            for (const key in this.talents) {
                const btn = document.getElementById(`btn-talent-${key}`);
                if (btn) {
                    btn.addEventListener('click', () => this.buyTalent(key));
                }
            }

            // Modale hors-ligne : fermeture
            const closeOffline = () => {
                if (this.dom.offlineModal) {
                    this.dom.offlineModal.classList.remove('active');
                    this.dom.offlineModal.classList.add('hidden-view');
                }
            };

            if (this.dom.btnClaimOffline) {
                this.dom.btnClaimOffline.addEventListener('click', () => {
                    closeOffline();
                    if (window.audioManager) window.audioManager.play('trophy');
                });
            }

            if (this.dom.closeOfflineBtn) {
                this.dom.closeOfflineBtn.addEventListener('click', () => closeOffline());
            }

            if (this.dom.offlineModal) {
                this.dom.offlineModal.addEventListener('click', (e) => {
                    if (e.target === this.dom.offlineModal) closeOffline();
                });
            }

            const resetBtn = document.getElementById('btn-reset-idle');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => this.resetGame());
            }

            const submitScoreBtn = document.getElementById('btn-submit-idle-score');
            if (submitScoreBtn) {
                submitScoreBtn.addEventListener('click', () => {
                    const scoreToSend = Math.floor(Math.max(Number(this.totalFeathers) || 0, Number(this.idleScore) || 0));
                    if (scoreToSend <= 0) {
                        alert("Récoltez au moins une plume avant d'enregistrer votre score !");
                        return;
                    }
                    if (window.leaderboardManager) {
                        window.leaderboardManager.promptHighScore('clicker', scoreToSend, () => {});
                    }
                });
            }

            // Onglets
            const tabButtons = document.querySelectorAll('.idle-tab-btn');
            tabButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tab = btn.getAttribute('data-tab');
                    if (tab) this.showTab(tab);
                });
            });

            // Boutons boutique
            for (const key in this.upgrades) {
                if (this.upgrades[key].btn) {
                    this.upgrades[key].btn.addEventListener('click', () => this.buyUpgrade(key));
                }
            }
        }

        /**
         * Gestion du clic manuel avec calcul critique, vibration haptique et animations
         */
        handleManualClick(e) {
            let baseCpc = this.feathersPerClick * this.prestigeMult * this.getAchievementMultiplier();

            // Buff Sort Caféine
            if (this.spells.coffee.active > 0) baseCpc *= 2;
            // Buff Frénésie Luciole
            if (this.buffs.frenzy.duration > 0) baseCpc *= this.buffs.frenzy.mult;

            // Chance de Coup Critique
            const critChance = 0.06 + (this.talents['crit-chance'].level * 0.02);
            const critMultiplier = 10 + (this.talents['crit-mult'].level * 3);
            const isCrit = Math.random() < critChance;

            const finalGain = isCrit ? (baseCpc * critMultiplier) : baseCpc;
            this.idleScore += finalGain;
            this.totalFeathers += finalGain;
            this.totalClicks++;
            if (isCrit) this.totalCrits++;

            this.updateUI();
            this.checkAchievements();

            const textFeedback = isCrit 
                ? `💥 +${IdleGame.formatNum(finalGain)} CRIT !` 
                : `+${IdleGame.formatNum(finalGain)}`;

            this.createFeedback(e, textFeedback, isCrit);

            // Squash & Stretch du hibou
            if (this.dom.logo) {
                const scaleVal = isCrit ? 'scale(0.85)' : 'scale(0.92)';
                this.dom.logo.style.transform = `${scaleVal} rotate(${(Math.random() - 0.5) * 16}deg)`;
                setTimeout(() => {
                    if (this.dom.logo) this.dom.logo.style.transform = 'scale(1) rotate(0deg)';
                }, 100);
            }

            // Haptique mobile & son
            if (isCrit && navigator.vibrate) {
                try { navigator.vibrate([15, 30, 15]); } catch (err) {}
            }
            if (window.audioManager) {
                window.audioManager.play(isCrit ? 'trophy' : 'jump');
            }
        }

        /**
         * Boucle principale de jeu
         */
        tick() {
            this.playTimeSeconds++;
            if (this.offlineEarningsProcessed) {
                this.lastSaveTime = Date.now();
            }

            // Gestion des cooldowns et durées de sorts
            for (const key in this.spells) {
                const sp = this.spells[key];
                if (sp.cd > 0) sp.cd--;
                if (sp.active > 0) sp.active--;
            }

            // Gestion des buffs de lucioles
            if (this.buffs.frenzy.duration > 0) this.buffs.frenzy.duration--;
            if (this.buffs.boost.duration > 0) this.buffs.boost.duration--;

            // Production automatique par seconde
            if (this.autoFeathersPerSec > 0) {
                let autoGain = this.autoFeathersPerSec * this.prestigeMult * this.getAchievementMultiplier();
                
                // Sort Godot C# Turbo x5
                if (this.spells.godot.active > 0) autoGain *= 5;
                // Buff Compilation Boost x4
                if (this.buffs.boost.duration > 0) autoGain *= this.buffs.boost.mult;

                this.idleScore += autoGain;
                this.totalFeathers += autoGain;

                if (this.dom.panel && this.dom.panel.classList.contains('active') && this.dom.logo) {
                    const rect = this.dom.logo.getBoundingClientRect();
                    const fakeE = {
                        clientX: rect.left + rect.width / 2 + (Math.random() * 60 - 30),
                        clientY: rect.top + rect.height / 2 + (Math.random() * 60 - 30)
                    };
                    this.createFeedback(fakeE, `+${IdleGame.formatNum(autoGain)}/s`, false);
                }
            }

            // Spawn de Luciole Dorée
            this.fireflyTimer--;
            if (this.fireflyTimer <= 0) {
                const baseDelay = 60;
                const reduction = this.talents['firefly'].level * 10;
                this.fireflyTimer = Math.max(25, baseDelay - reduction + Math.floor(Math.random() * 20));
                
                if (this.dom.panel && this.dom.panel.classList.contains('active')) {
                    this.spawnGoldenFirefly();
                }
            }

            this.updateUI();
            this.checkAchievements();
        }

        /**
         * Fait apparaître une Luciole Dorée flottante
         */
        spawnGoldenFirefly() {
            if (!this.dom.panel) return;

            const firefly = document.createElement('div');
            firefly.className = 'golden-firefly';
            firefly.innerHTML = '✨🪶✨';
            firefly.title = 'Attrape la Luciole Dorée !';

            const panelRect = this.dom.panel.getBoundingClientRect();
            const startX = 20 + Math.random() * (panelRect.width - 90);
            const startY = 120 + Math.random() * (panelRect.height - 240);

            firefly.style.left = `${startX}px`;
            firefly.style.top = `${startY}px`;

            const timeoutId = setTimeout(() => {
                firefly.remove();
            }, 12000);

            firefly.addEventListener('click', (e) => {
                e.stopPropagation();
                clearTimeout(timeoutId);
                this.catchGoldenFirefly(firefly);
            });

            this.dom.panel.appendChild(firefly);
        }

        catchGoldenFirefly(fireflyEl) {
            this.totalFireflies++;
            fireflyEl.classList.add('caught');
            setTimeout(() => fireflyEl.remove(), 400);

            const roll = Math.random();
            let rewardText = '';

            if (roll < 0.35) {
                this.buffs.frenzy.duration = 15;
                rewardText = '⚡ FRÉNÉSIE DE CLICS (x7 pendant 15s) !';
            } else if (roll < 0.70) {
                this.buffs.boost.duration = 20;
                rewardText = '🚀 BOOST COMPILATION (x4 pendant 20s) !';
            } else if (roll < 0.95) {
                const instantReward = Math.max(500, this.autoFeathersPerSec * this.prestigeMult * 600);
                this.idleScore += instantReward;
                this.totalFeathers += instantReward;
                rewardText = `💰 PLUIE DE PLUMES (+${IdleGame.formatNum(instantReward)}) !`;
            } else {
                this.celestialFeathers += 1;
                this.celestialFeathersEarned += 1;
                rewardText = '🔮 ÉVEIL CÉLESTE (+1 Plume Céleste Gratuite) !';
            }

            if (window.audioManager) window.audioManager.play('coin');
            if (navigator.vibrate) try { navigator.vibrate([30, 50, 30]); } catch (e) {}

            this.showToastNotification('LUCIOLE DORÉE ATTRAPÉE !', rewardText);
            this.updateUI();
            this.checkAchievements();
        }

        /**
         * Lancement d'un sort actif
         */
        castSpell(spellKey) {
            const sp = this.spells[spellKey];
            if (!sp || sp.cd > 0) return;

            sp.cd = sp.cdMax;
            this.totalSpellsCast++;

            if (spellKey === 'coffee') {
                sp.active = sp.duration;
                this.showToastNotification('☕ CAFÉINE PURE ACTIVÉE', 'Clics doublés (x2) pendant 25 secondes !');
            } else if (spellKey === 'deploy') {
                const isJackpot = Math.random() < 0.15;
                const mult = isJackpot ? 5 : 1;
                const burstGain = Math.max(1000, this.autoFeathersPerSec * this.prestigeMult * 600 * mult);
                this.idleScore += burstGain;
                this.totalFeathers += burstGain;
                
                const title = isJackpot ? '🚀 JACKPOT DE VENDREDI (x5) !' : '🚀 DÉPLOIEMENT RÉUSSI !';
                this.showToastNotification(title, `+${IdleGame.formatNum(burstGain)} plumes récoltées instantanément !`);
            } else if (spellKey === 'godot') {
                sp.active = sp.duration;
                this.showToastNotification('🎮 MOTEUR GODOT C# TURBO', 'Production automatique multipliée par 5 pendant 15s !');
            }

            if (window.audioManager) window.audioManager.play('laser');
            this.updateUI();
            this.checkAchievements();
        }

        /**
         * Arbre de Talents Célestes (Achat avec Plumes Célestes)
         */
        buyTalent(talentKey) {
            const t = this.talents[talentKey];
            if (!t || t.level >= t.max) return;

            const cost = t.costs[t.level];
            if (this.celestialFeathers >= cost) {
                this.celestialFeathers -= cost;
                t.level++;
                this.recalculateRates();
                this.updateUI();
                if (window.audioManager) window.audioManager.play('trophy');
            }
        }

        getOfflineMaxHours() {
            const tiers = [2, 4, 8, 14, 24]; // Base 2h, up to 24h
            const lvl = (this.talents && this.talents['offline-cap']) ? this.talents['offline-cap'].level : 0;
            return tiers[Math.min(lvl, tiers.length - 1)];
        }

        /**
         * Calcul des gains hors-ligne au retour du joueur
         */
        checkOfflineEarnings() {
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - this.lastSaveTime) / 1000);

            if (elapsedSeconds >= 60 && this.autoFeathersPerSec > 0) {
                const maxHours = this.getOfflineMaxHours();
                const offlineCapSeconds = maxHours * 3600;
                const effectiveSeconds = Math.min(elapsedSeconds, offlineCapSeconds);
                const wasCapped = elapsedSeconds > offlineCapSeconds;
                
                const offlineRatio = 0.50 + (this.talents['offline'].level * 0.15); // De 50% à 110%
                const offlineGains = Math.floor(this.autoFeathersPerSec * this.prestigeMult * effectiveSeconds * offlineRatio);

                if (offlineGains > 0) {
                    this.idleScore += offlineGains;
                    this.totalFeathers += offlineGains;

                    if (this.dom.offlineModal && this.dom.offlineDuration && this.dom.offlineFeathers) {
                        const hrs = Math.floor(effectiveSeconds / 3600);
                        const mins = Math.floor((effectiveSeconds % 3600) / 60);
                        let timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                        if (wasCapped) {
                            timeStr += ` (Plafonné à ${maxHours}h)`;
                        }

                        this.dom.offlineDuration.textContent = timeStr;
                        this.dom.offlineFeathers.textContent = `+${IdleGame.formatNum(offlineGains)} 🪶`;
                        this.dom.offlineModal.classList.remove('hidden-view');
                        this.dom.offlineModal.classList.add('active');
                    }
                }
            }
            this.lastSaveTime = now;
        }

        getAchievementMultiplier() {
            let count = 0;
            for (const k in this.achievements) {
                if (this.achievements[k].unlocked) count++;
            }
            return 1 + (count * 0.01); // +1% par succès
        }

        recalculateRates() {
            this.prestigeMult = 1 + (this.celestialFeathersEarned * 0.02);

            let autoBase = 0;
            let clickBase = 1;

            for (const key in this.upgrades) {
                const u = this.upgrades[key];
                const totalProd = u.baseAdd * u.count * IdleGame.getMilestoneMult(u.count);
                if (u.type === 'auto') autoBase += totalProd;
                else if (u.type === 'click') clickBase += totalProd;
            }

            this.autoFeathersPerSec = autoBase;
            this.feathersPerClick = clickBase;
        }

        /**
         * Calcul du coût d'achat multiple avec réduction de talent
         */
        getUpgradeCostAndCount(type) {
            const u = this.upgrades[type];
            if (!u) return { cost: 0, count: 0 };

            const discount = this.talents['discount'].level * 0.04;
            const r = u.ratio;
            const currentCostBase = u.baseCost * Math.pow(r, u.count) * (1 - discount);

            let targetN = 1;
            if (this.buyMode === '10') targetN = 10;
            else if (this.buyMode === '100') targetN = 100;
            else if (this.buyMode === 'max') {
                if (this.idleScore < currentCostBase) {
                    return { cost: Math.floor(currentCostBase), count: 1 };
                }
                const maxN = Math.floor(Math.log( (this.idleScore * (r - 1) / currentCostBase) + 1 ) / Math.log(r));
                targetN = Math.max(1, maxN);
            }

            // Somme géométrique
            const totalCost = Math.floor(currentCostBase * (Math.pow(r, targetN) - 1) / (r - 1));
            return { cost: totalCost, count: targetN };
        }

        buyUpgrade(type) {
            const u = this.upgrades[type];
            if (!u) return;

            const { cost, count } = this.getUpgradeCostAndCount(type);
            if (this.idleScore >= cost && count > 0) {
                this.idleScore -= cost;
                u.count += count;
                this.recalculateRates();
                this.updateUI();
                this.checkAchievements();
                if (window.audioManager) window.audioManager.play('coin');
            }
        }

        triggerPrestige() {
            const earnableTotal = Math.floor(Math.sqrt(this.totalFeathers / 10000));
            const celestialGain = Math.max(0, earnableTotal - this.celestialFeathersEarned);

            if (celestialGain <= 0) return;

            const confirmed = window.confirm(
                `✨ RENAISSANCE CÉLESTE\n\nTu vas obtenir +${IdleGame.formatNum(celestialGain)} Plumes Célestes (+${Math.round(celestialGain * 2)}% de production permanente globale).\n\nTes plumes actuelles et bâtiments seront réinitialisés, mais tes Talents Célestes et Succès sont conservés !\n\nConfirmer la Renaissance ?`
            );

            if (confirmed) {
                this.celestialFeathers += celestialGain;
                this.celestialFeathersEarned += celestialGain;
                this.idleScore = 0;
                this.rebirthCount++;

                for (const key in this.upgrades) {
                    this.upgrades[key].count = 0;
                }

                this.recalculateRates();
                this.updateUI();
                this.checkAchievements();
                if (window.audioManager) window.audioManager.play('explosion');

                if (window.portfolioTracker) {
                    window.portfolioTracker.track('idle_milestone', { type: 'prestige', gain: celestialGain });
                }
            }
        }

        resetGame() {
            const confirmed = window.confirm('⚠️ Réinitialiser TOUTE ta progression Hibou Clicker (bâtiments, talents célestes et succès) ?');
            if (confirmed) {
                try {
                    localStorage.removeItem('hibouIdleSaveV4');
                    localStorage.removeItem('hibouIdleSaveV3');
                } catch (e) {}

                this.idleScore = 0;
                this.feathersPerClick = 1;
                this.autoFeathersPerSec = 0;
                this.prestigeMult = 1;
                this.celestialFeathers = 0;
                this.celestialFeathersEarned = 0;
                this.totalClicks = 0;
                this.totalCrits = 0;
                this.totalFireflies = 0;
                this.totalSpellsCast = 0;
                this.totalFeathers = 0;
                this.playTimeSeconds = 0;
                this.rebirthCount = 0;

                for (const key in this.upgrades) this.upgrades[key].count = 0;
                for (const key in this.talents) this.talents[key].level = 0;
                for (const key in this.achievements) this.achievements[key].unlocked = false;

                this.recalculateRates();
                this.updateUI();
                if (window.audioManager) window.audioManager.play('gameover');
            }
        }

        checkAchievements() {
            const totalProd = this.autoFeathersPerSec * this.prestigeMult * this.getAchievementMultiplier();
            const totalCpc = this.feathersPerClick * this.prestigeMult * this.getAchievementMultiplier();

            if (!this.achievements.first_click.unlocked && this.totalClicks >= 1) this.unlockAchievement('first_click');
            if (!this.achievements.clicks_100.unlocked && this.totalClicks >= 100) this.unlockAchievement('clicks_100');
            if (!this.achievements.clicks_1000.unlocked && this.totalClicks >= 1000) this.unlockAchievement('clicks_1000');
            if (!this.achievements.clicks_10k.unlocked && this.totalClicks >= 10000) this.unlockAchievement('clicks_10k');
            
            if (!this.achievements.feathers_100.unlocked && this.totalFeathers >= 100) this.unlockAchievement('feathers_100');
            if (!this.achievements.feathers_10k.unlocked && this.totalFeathers >= 10000) this.unlockAchievement('feathers_10k');
            if (!this.achievements.feathers_1m.unlocked && this.totalFeathers >= 1000000) this.unlockAchievement('feathers_1m');
            if (!this.achievements.feathers_1b.unlocked && this.totalFeathers >= 1e9) this.unlockAchievement('feathers_1b');
            if (!this.achievements.feathers_1t.unlocked && this.totalFeathers >= 1e12) this.unlockAchievement('feathers_1t');

            if (!this.achievements.pps_100.unlocked && totalProd >= 100) this.unlockAchievement('pps_100');
            if (!this.achievements.pps_10k.unlocked && totalProd >= 10000) this.unlockAchievement('pps_10k');
            if (!this.achievements.pps_1m.unlocked && totalProd >= 1000000) this.unlockAchievement('pps_1m');

            if (!this.achievements.click_god.unlocked && totalCpc >= 100) this.unlockAchievement('click_god');
            if (!this.achievements.first_crit.unlocked && this.totalCrits >= 1) this.unlockAchievement('first_crit');
            if (!this.achievements.firefly_catcher.unlocked && this.totalFireflies >= 1) this.unlockAchievement('firefly_catcher');
            if (!this.achievements.firefly_master.unlocked && this.totalFireflies >= 10) this.unlockAchievement('firefly_master');
            if (!this.achievements.spell_caster.unlocked && this.totalSpellsCast >= 5) this.unlockAchievement('spell_caster');
            if (!this.achievements.first_prestige.unlocked && this.rebirthCount >= 1) this.unlockAchievement('first_prestige');
        }

        unlockAchievement(id) {
            const ach = this.achievements[id];
            if (!ach || ach.unlocked) return;

            ach.unlocked = true;
            this.updateUI();
            if (window.audioManager) window.audioManager.play('coin');

            if (window.portfolioTracker) {
                window.portfolioTracker.track('idle_milestone', { type: 'achievement', id: id });
            }

            this.showToastNotification('SUCCÈS DÉBLOQUÉ !', ach.title);
        }

        showToastNotification(badge, text) {
            if (this.dom.toast && this.dom.toastTitle) {
                const badgeEl = this.dom.toast.querySelector('.toast-badge-title');
                if (badgeEl) badgeEl.textContent = badge;
                this.dom.toastTitle.textContent = text;
                this.dom.toast.classList.add('visible');

                setTimeout(() => {
                    if (this.dom.toast) this.dom.toast.classList.remove('visible');
                }, 4000);
            }
        }

        showTab(tabName) {
            document.querySelectorAll('.idle-tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
            });

            document.querySelectorAll('.idle-view').forEach(view => {
                const isActive = (view.id === `idle-view-${tabName}`);
                view.classList.toggle('hidden-view', !isActive);
                view.style.display = isActive ? 'block' : 'none';
            });
        }

        createFeedback(e, text, isCrit = false) {
            if (!this.dom.feedback || !this.dom.logo) return;

            const fb = document.createElement('div');
            fb.className = isCrit ? 'click-feedback crit-feedback' : 'click-feedback';
            fb.textContent = text;

            const rect = this.dom.logo.getBoundingClientRect();
            const clientX = e.clientX || rect.left + rect.width / 2;
            const clientY = e.clientY || rect.top + rect.height / 2;

            fb.style.left = `${clientX - rect.left}px`;
            fb.style.top = `${clientY - rect.top}px`;

            this.dom.feedback.appendChild(fb);
            setTimeout(() => fb.remove(), 1000);
        }

        updateUI() {
            const achMult = this.getAchievementMultiplier();
            const currentPps = this.autoFeathersPerSec * this.prestigeMult * achMult;
            const currentCpc = this.feathersPerClick * this.prestigeMult * achMult;

            if (this.dom.score) this.dom.score.textContent = IdleGame.formatNum(this.idleScore);
            if (this.dom.pps) this.dom.pps.textContent = IdleGame.formatNum(currentPps);
            if (this.dom.cpc) this.dom.cpc.textContent = IdleGame.formatNum(currentCpc);

            // Badge Crit
            if (this.dom.critBadge) {
                const critChancePct = Math.round((0.06 + (this.talents['crit-chance'].level * 0.02)) * 100);
                const critMultVal = 10 + (this.talents['crit-mult'].level * 3);
                this.dom.critBadge.textContent = `(${critChancePct}% Crit x${critMultVal})`;
            }

            // Buffs actifs
            if (this.dom.buffsContainer) {
                let buffsHtml = '';
                if (this.spells.coffee.active > 0) {
                    buffsHtml += `<span class="buff-badge">☕ Caféine : ${this.spells.coffee.active}s</span>`;
                }
                if (this.spells.godot.active > 0) {
                    buffsHtml += `<span class="buff-badge">🎮 Godot x5 : ${this.spells.godot.active}s</span>`;
                }
                if (this.buffs.frenzy.duration > 0) {
                    buffsHtml += `<span class="buff-badge gold-pulse">⚡ Frénésie : ${this.buffs.frenzy.duration}s</span>`;
                }
                if (this.buffs.boost.duration > 0) {
                    buffsHtml += `<span class="buff-badge gold-pulse">🚀 Compilation : ${this.buffs.boost.duration}s</span>`;
                }

                if (buffsHtml) {
                    this.dom.buffsContainer.innerHTML = buffsHtml;
                    this.dom.buffsContainer.classList.remove('hidden-view');
                } else {
                    this.dom.buffsContainer.classList.add('hidden-view');
                }
            }

            // Sorts UI
            for (const key in this.spells) {
                const sp = this.spells[key];
                const cdEl = document.getElementById(`cd-${key}`);
                const btnEl = document.getElementById(`btn-cast-${key}`);

                if (cdEl && btnEl) {
                    if (sp.cd > 0) {
                        const mins = Math.floor(sp.cd / 60);
                        const secs = sp.cd % 60;
                        cdEl.textContent = mins > 0 ? `Recharge: ${mins}m ${secs}s` : `Recharge: ${secs}s`;
                        btnEl.setAttribute('disabled', 'true');
                    } else {
                        cdEl.textContent = '⚡ Prêt !';
                        btnEl.removeAttribute('disabled');
                    }
                }
            }

            // Talents Célestes UI
            for (const key in this.talents) {
                const t = this.talents[key];
                const lvlEl = document.getElementById(`lvl-talent-${key}`);
                const costEl = document.getElementById(`cost-talent-${key}`);
                const btnEl = document.getElementById(`btn-talent-${key}`);

                if (lvlEl) lvlEl.textContent = `${t.level}/${t.max}`;
                if (t.level >= t.max) {
                    if (btnEl) {
                        btnEl.setAttribute('disabled', 'true');
                        btnEl.textContent = 'MAX';
                    }
                } else {
                    const cost = t.costs[t.level];
                    if (costEl) costEl.textContent = cost;
                    if (btnEl) {
                        if (this.celestialFeathers >= cost) btnEl.removeAttribute('disabled');
                        else btnEl.setAttribute('disabled', 'true');
                        btnEl.innerHTML = `Acheter (<span id="cost-talent-${key}">${cost}</span> 🔮)`;
                    }
                }
            }

            // Prestige UI
            if (this.dom.prestigeBadge) {
                this.dom.prestigeBadge.style.display = this.celestialFeathersEarned > 0 ? 'inline-block' : 'none';
                this.dom.prestigeBadge.textContent = `✨ +${Math.round(this.celestialFeathersEarned * 2)}% Céleste`;
            }

            const earnableTotal = Math.floor(Math.sqrt(this.totalFeathers / 10000));
            const celestialGain = Math.max(0, earnableTotal - this.celestialFeathersEarned);

            if (this.dom.celOwned) this.dom.celOwned.textContent = IdleGame.formatNum(this.celestialFeathers);
            if (this.dom.celBonus) this.dom.celBonus.textContent = `+${Math.round(this.celestialFeathersEarned * 2)}%`;
            if (this.dom.celGain) this.dom.celGain.textContent = `+${IdleGame.formatNum(celestialGain)}`;

            if (this.dom.btnPrestige) {
                if (celestialGain > 0) {
                    this.dom.btnPrestige.removeAttribute('disabled');
                    this.dom.btnPrestige.textContent = `🌟 Renaître (+${IdleGame.formatNum(celestialGain)} Plumes Célestes)`;
                    this.dom.btnPrestige.style.opacity = '1';
                    this.dom.btnPrestige.style.cursor = 'pointer';
                } else {
                    this.dom.btnPrestige.setAttribute('disabled', 'true');
                    this.dom.btnPrestige.textContent = `🌟 Prochain palier céleste en cours...`;
                    this.dom.btnPrestige.style.opacity = '0.5';
                    this.dom.btnPrestige.style.cursor = 'not-allowed';
                }
            }

            // Boutiques & Multi-achat
            for (const key in this.upgrades) {
                const u = this.upgrades[key];
                const { cost, count } = this.getUpgradeCostAndCount(key);

                if (u.btn) {
                    if (this.idleScore >= cost) u.btn.removeAttribute('disabled');
                    else u.btn.setAttribute('disabled', 'true');
                }
                if (u.costEl) {
                    const countLabel = (count > 1) ? ` (x${count})` : '';
                    u.costEl.textContent = `${IdleGame.formatNum(cost)}${countLabel}`;
                }
                if (u.countEl) u.countEl.textContent = u.count;
                if (u.starsEl) u.starsEl.textContent = IdleGame.getMilestoneStars(u.count);
                if (u.descEl) {
                    const totalProd = u.baseAdd * u.count * IdleGame.getMilestoneMult(u.count);
                    if (u.type === 'auto') {
                        u.descEl.textContent = `+${IdleGame.formatNum(u.baseAdd)}/s (Total: +${IdleGame.formatNum(totalProd)}/s)`;
                    } else {
                        u.descEl.textContent = `+${IdleGame.formatNum(u.baseAdd)}/clic (Total: +${IdleGame.formatNum(totalProd)}/clic)`;
                    }
                }
            }

            // Stats
            if (this.dom.statClicks) this.dom.statClicks.textContent = IdleGame.formatNum(this.totalClicks);
            if (this.dom.statCrits) this.dom.statCrits.textContent = IdleGame.formatNum(this.totalCrits);
            if (this.dom.statFireflies) this.dom.statFireflies.textContent = IdleGame.formatNum(this.totalFireflies);
            if (this.dom.statSpells) this.dom.statSpells.textContent = IdleGame.formatNum(this.totalSpellsCast);
            if (this.dom.statTotal) this.dom.statTotal.textContent = IdleGame.formatNum(this.totalFeathers);
            if (this.dom.statRebirths) this.dom.statRebirths.textContent = this.rebirthCount;
            if (this.dom.statTime) {
                const hrs = Math.floor(this.playTimeSeconds / 3600);
                const mins = Math.floor((this.playTimeSeconds % 3600) / 60);
                const secs = this.playTimeSeconds % 60;
                this.dom.statTime.textContent = hrs > 0 ? `${hrs}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;
            }
            if (this.dom.statPrestige) {
                this.dom.statPrestige.textContent = `${IdleGame.formatNum(this.celestialFeathers)} 🔮 (+${Math.round(this.celestialFeathersEarned * 2)}%)`;
            }

            // Succès
            let unlockedCount = 0;
            for (const key in this.achievements) {
                const ach = this.achievements[key];
                if (ach.unlocked) {
                    unlockedCount++;
                    if (ach.el) {
                        ach.el.classList.add('unlocked');
                        const icon = ach.el.querySelector('.ach-icon');
                        if (icon) icon.textContent = '🏆';
                    }
                }
            }
            if (this.dom.achievCount) this.dom.achievCount.textContent = `(${unlockedCount}/18)`;
            if (this.dom.achievBonus) this.dom.achievBonus.textContent = `+${unlockedCount}%`;

            this.saveData();
        }

        saveData() {
            try {
                const upgs = {};
                for (const k in this.upgrades) upgs[k] = { count: this.upgrades[k].count };
                
                const tal = {};
                for (const k in this.talents) tal[k] = this.talents[k].level;

                const achs = {};
                for (const k in this.achievements) achs[k] = this.achievements[k].unlocked;

                const payload = {
                    idleScore: this.idleScore,
                    celestialFeathers: this.celestialFeathers,
                    celestialFeathersEarned: this.celestialFeathersEarned,
                    totalClicks: this.totalClicks,
                    totalCrits: this.totalCrits,
                    totalFireflies: this.totalFireflies,
                    totalSpellsCast: this.totalSpellsCast,
                    totalFeathers: this.totalFeathers,
                    playTimeSeconds: this.playTimeSeconds,
                    rebirthCount: this.rebirthCount,
                    lastSaveTime: this.lastSaveTime,
                    upgrades: upgs,
                    talents: tal,
                    achievements: achs
                };
                localStorage.setItem('hibouIdleSaveV4', JSON.stringify(payload));
            } catch (e) {}
        }

        loadSave() {
            try {
                const saved = localStorage.getItem('hibouIdleSaveV4') || localStorage.getItem('hibouIdleSaveV3');
                if (!saved) return;
                const data = JSON.parse(saved);

                if (data.idleScore !== undefined) this.idleScore = data.idleScore;
                if (data.celestialFeathers !== undefined) this.celestialFeathers = data.celestialFeathers;
                if (data.celestialFeathersEarned !== undefined) this.celestialFeathersEarned = data.celestialFeathersEarned;
                if (data.totalClicks !== undefined) this.totalClicks = data.totalClicks;
                if (data.totalCrits !== undefined) this.totalCrits = data.totalCrits;
                if (data.totalFireflies !== undefined) this.totalFireflies = data.totalFireflies;
                if (data.totalSpellsCast !== undefined) this.totalSpellsCast = data.totalSpellsCast;
                if (data.totalFeathers !== undefined) this.totalFeathers = data.totalFeathers;
                if (data.playTimeSeconds !== undefined) this.playTimeSeconds = data.playTimeSeconds;
                if (data.rebirthCount !== undefined) this.rebirthCount = data.rebirthCount;
                if (data.lastSaveTime !== undefined) this.lastSaveTime = data.lastSaveTime;

                if (data.upgrades) {
                    for (const k in data.upgrades) {
                        if (this.upgrades[k]) this.upgrades[k].count = data.upgrades[k].count || 0;
                    }
                }
                if (data.talents) {
                    for (const k in data.talents) {
                        if (this.talents[k]) this.talents[k].level = data.talents[k] || 0;
                    }
                }
                if (data.achievements) {
                    for (const k in data.achievements) {
                        if (this.achievements[k]) this.achievements[k].unlocked = !!data.achievements[k];
                    }
                }
            } catch (e) {
                console.warn('[IdleGame] Échec du chargement de la sauvegarde', e);
            }
        }
    }

    window.idleGame = new IdleGame();
})();
