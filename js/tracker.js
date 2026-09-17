/**
 * Module de Tracking Événementiel Sécurisé - Portfolio Quentin Beaud
 * - Envoie asynchrone non-bloquant (navigator.sendBeacon / fetch keepalive)
 * - Compatible avec l'API interne (api/track.php), Umami, Plausible et Microsoft Clarity
 * - Capture automatique des téléchargements de CV, clics de contact et navigation
 */

(function () {
    'use strict';

    class PortfolioTracker {
        constructor() {
            this.endpoint = 'api/track.php';
            this.initialized = false;
            this.sessionTracked = new Set();
            this.sessionSource = this.detectSource();
        }

        /**
         * Détecte la source de trafic : paramètres d'URL personnalisés (?from=, ?ref=, etc.) ou HTTP Referrer.
         */
        detectSource() {
            try {
                const params = new URLSearchParams(window.location.search);
                const customParam = params.get('from') || params.get('ref') || params.get('recruteur') || params.get('source') || params.get('utm_source');
                if (customParam) {
                    const clean = 'lien_' + customParam.toLowerCase().replace(/[^a-z0-9_-]/g, '').substring(0, 32);
                    try { sessionStorage.setItem('portfolio_traffic_source', clean); } catch (e) {}
                    return clean;
                }
                const saved = sessionStorage.getItem('portfolio_traffic_source');
                if (saved && saved !== 'direct') return saved;
            } catch (e) {}

            const ref = document.referrer || '';
            if (ref) {
                try { sessionStorage.setItem('portfolio_traffic_source', ref); } catch (e) {}
                return ref;
            }
            return 'Direct';
        }

        /**
         * Initialise le tracker et attache les écouteurs automatiques.
         */
        init() {
            if (this.initialized) return;
            this.initialized = true;

            // 1. Tracker la vue de page initiale
            this.trackPageView();

            // 2. Attacher les écouteurs d'interaction utilisateur
            this.bindGlobalListeners();
        }

        /**
         * Enregistre un événement de consultation de page avec le Referrer ou le tag personnalisé.
         */
        trackPageView() {
            this.track('page_view', {
                url: window.location.pathname,
                source: this.detectSource()
            });
        }

        /**
         * Envoie un événement personnalisé vers l'API interne et les analytics tiers.
         * @param {string} eventName - Nom de l'événement (ex: 'cv_download', 'game_start')
         * @param {Object} [props={}] - Propriétés associées
         */
        track(eventName, props = {}) {
            if (!eventName) return;

            const source = this.detectSource();
            const payload = {
                event: eventName,
                props: props,
                referrer: source,
                timestamp: Math.floor(Date.now() / 1000)
            };

            // 1. Envoi vers le backend interne PHP (api/track.php)
            try {
                const dataString = JSON.stringify(payload);
                if (navigator.sendBeacon) {
                    const blob = new Blob([dataString], { type: 'application/json' });
                    navigator.sendBeacon(this.endpoint, blob);
                } else {
                    fetch(this.endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: dataString,
                        keepalive: true
                    }).catch(() => {});
                }
            } catch (e) {
                // Échec silencieux pour ne jamais impacter l'expérience utilisateur
            }

            // 2. Dispatch vers Umami si présent
            if (window.umami && typeof window.umami.track === 'function') {
                try {
                    window.umami.track(eventName, props);
                } catch (e) {}
            }

            // 3. Dispatch vers Plausible si présent
            if (window.plausible && typeof window.plausible === 'function') {
                try {
                    window.plausible(eventName, { props });
                } catch (e) {}
            }

            // 4. Dispatch vers Microsoft Clarity si présent
            if (window.clarity && typeof window.clarity === 'function') {
                try {
                    window.clarity('event', eventName);
                } catch (e) {}
            }
        }

        /**
         * Attache les écouteurs automatiques sur les liens et boutons stratégiques.
         */
        bindGlobalListeners() {
            document.addEventListener('click', (e) => {
                const target = e.target.closest('a, button');
                if (!target) return;

                const href = target.getAttribute('href') || '';
                const downloadAttr = target.getAttribute('download');

                // A. Téléchargement ou Consultation du CV
                if (href.includes('cv.html') || target.id === 'btn-view-cv') {
                    this.track('cv_view', { format: 'theme_modal' });
                } else if (href.includes('.pdf') || downloadAttr !== null || href.includes('CV_Quentin_Beaud')) {
                    const format = href.includes('Soft') ? 'soft_pdf' : 'standard_pdf';
                    this.track('cv_download', { format });
                }

                // B. Clics sur les cartes de projets GitHub
                const repoCard = target.closest('.repo-card');
                if (repoCard) {
                    const h3 = repoCard.querySelector('h3');
                    const title = h3 ? h3.textContent.trim() : 'projet';
                    this.track('project_click', { project: title.substring(0, 40) });
                }

                // C. Clics sur les liens de contact
                if (href.startsWith('mailto:')) {
                    const isPro = href.includes('pro') || href.includes('hibouxe');
                    this.track('contact_click', { target: isPro ? 'email_pro' : 'email_perso' });
                } else if (href.startsWith('tel:')) {
                    this.track('contact_click', { target: 'phone' });
                } else if (href.includes('linkedin.com')) {
                    this.track('social_click', { target: 'linkedin' });
                } else if (href.includes('github.com') && !repoCard) {
                    this.track('social_click', { target: 'github' });
                } else if (href.includes('youtube.com')) {
                    this.track('social_click', { target: 'youtube' });
                }
            }, { passive: true });
        }
    }

    // Exposition globale
    window.portfolioTracker = new PortfolioTracker();
})();
