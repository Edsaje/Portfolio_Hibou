// Initialisation des modules, navigation et formulaires

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // 1. Initialisation des sous-systèmes modulaires
    if (window.portfolioTracker) window.portfolioTracker.init();
    if (window.audioManager) window.audioManager.init();
    if (window.firefliesEngine) window.firefliesEngine.init();
    if (window.easterEggsManager) window.easterEggsManager.init();
    if (window.arcadeEngine) window.arcadeEngine.init();
    if (window.vectrexEngine) window.vectrexEngine.init();
    if (window.idleGame) window.idleGame.init();

    // 2. Navigation Mobile & En-tête Dynamique
    const navHeader = document.querySelector('.glass-nav');
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('open');
            menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            menuToggle.innerHTML = isOpen ? '✕' : '☰';
        });

        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('open');
                if (menuToggle) {
                    menuToggle.setAttribute('aria-expanded', 'false');
                    menuToggle.innerHTML = '☰';
                }
            });
        });
    }

    // Effet d'en-tête transparent -> opaque au défilement
    const handleNavScroll = () => {
        if (!navHeader) return;
        if (window.scrollY > 40) {
            navHeader.classList.add('scrolled');
        } else {
            navHeader.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', handleNavScroll, { passive: true });
    handleNavScroll();

    // 3. Animations d'apparition fluide au défilement (IntersectionObserver)
    const revealElements = document.querySelectorAll('.reveal-on-scroll, .skill-card, .repo-card, .portfolio-card, .timeline-item, .principle-card');
    
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -40px 0px'
        });

        revealElements.forEach(el => observer.observe(el));
    } else {
        // Fallback pour anciens navigateurs
        revealElements.forEach(el => el.classList.add('is-visible'));
    }

    // 4. Gestionnaire du Formulaire de Contact
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');

    if (contactForm && formStatus) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const messageInput = document.getElementById('message');
            const submitBtn = contactForm.querySelector('button[type="submit"]');

            const name = nameInput ? nameInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const message = messageInput ? messageInput.value.trim() : '';

            if (!name || !email || !message) {
                formStatus.textContent = 'Veuillez renseigner tous les champs obligatoires.';
                formStatus.className = 'form-status error';
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                formStatus.textContent = 'Veuillez saisir une adresse email valide.';
                formStatus.className = 'form-status error';
                return;
            }

            formStatus.textContent = 'Envoi de votre message en cours...';
            formStatus.className = 'form-status pending';
            if (submitBtn) submitBtn.disabled = true;

            try {
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: new FormData(contactForm),
                    headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    formStatus.textContent = '✨ Message envoyé avec succès ! Je vous répondrai dans les plus brefs délais.';
                    formStatus.className = 'form-status success';
                    contactForm.reset();
                    if (window.audioManager) window.audioManager.play('coin');
                } else {
                    formStatus.textContent = 'Une erreur est survenue lors de l\'envoi. Veuillez réessayer ou me contacter directement par email.';
                    formStatus.className = 'form-status error';
                }
            } catch (err) {
                formStatus.textContent = 'Erreur réseau. Veuillez vérifier votre connexion ou m\'envoyer un email direct.';
                formStatus.className = 'form-status error';
            } finally {
                if (submitBtn) submitBtn.disabled = false;
                setTimeout(() => {
                    if (formStatus.classList.contains('success')) {
                        formStatus.textContent = '';
                        formStatus.className = 'form-status';
                    }
                }, 6000);
            }
        });
    }
});
