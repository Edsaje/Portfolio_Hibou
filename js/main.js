document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    if (window.portfolioTracker) window.portfolioTracker.init();
    if (window.audioManager) window.audioManager.init();
    if (window.firefliesEngine) window.firefliesEngine.init();
    if (window.easterEggsManager) window.easterEggsManager.init();
    if (window.arcadeEngine) window.arcadeEngine.init();
    if (window.vectrexEngine) window.vectrexEngine.init();
    if (window.idleGame) window.idleGame.init();

    // Navigation & Menu Mobile
    const navHeader = document.querySelector(".glass-nav");
    const menuToggle = document.getElementById("menu-toggle");
    const navMenu = document.getElementById("nav-menu");

    if (menuToggle && navMenu) {
        menuToggle.addEventListener("click", () => {
            const isOpen = navMenu.classList.toggle("open");
            menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
            menuToggle.innerHTML = isOpen ? "✕" : "☰";
        });
        navMenu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navMenu.classList.remove("open");
                if (menuToggle) {
                    menuToggle.setAttribute("aria-expanded", "false");
                    menuToggle.innerHTML = "☰";
                }
            });
        });
    }

    const handleNavScroll = () => {
        if (!navHeader) return;
        if (window.scrollY > 40) {
            navHeader.classList.add("scrolled");
        } else {
            navHeader.classList.remove("scrolled");
        }
    };
    window.addEventListener("scroll", handleNavScroll, { passive: true });
    handleNavScroll();

    // Effet d'apparition au défilement
    const revealElements = document.querySelectorAll(".reveal-on-scroll, .skill-card, .repo-card, .portfolio-card, .timeline-item, .principle-card");
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
        revealElements.forEach(el => observer.observe(el));
    } else {
        revealElements.forEach(el => el.classList.add("is-visible"));
    }

    // Gestion du Formulaire de Contact
    const contactForm = document.getElementById("contact-form");
    const formStatus = document.getElementById("form-status");

    if (contactForm && formStatus) {
        contactForm.addEventListener("submit", async e => {
            e.preventDefault();
            const nameInput = document.getElementById("name");
            const emailInput = document.getElementById("email");
            const messageInput = document.getElementById("message");
            const submitBtn = contactForm.querySelector('button[type="submit"]');

            const name = nameInput ? nameInput.value.trim() : "";
            const email = emailInput ? emailInput.value.trim() : "";
            const message = messageInput ? messageInput.value.trim() : "";

            if (!name || !email || !message) {
                formStatus.textContent = "Veuillez renseigner tous les champs obligatoires.";
                formStatus.className = "form-status error";
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                formStatus.textContent = "Veuillez saisir une adresse email valide.";
                formStatus.className = "form-status error";
                return;
            }

            formStatus.textContent = "Envoi de votre message en cours...";
            formStatus.className = "form-status pending";
            if (submitBtn) submitBtn.disabled = true;

            try {
                const response = await fetch(contactForm.action, {
                    method: "POST",
                    body: new FormData(contactForm),
                    headers: { Accept: "application/json" }
                });

                if (response.ok) {
                    formStatus.textContent = "Message envoyé avec succès ! Je vous répondrai dans les plus brefs délais.";
                    formStatus.className = "form-status success";
                    contactForm.reset();
                    if (window.audioManager) window.audioManager.play("coin");
                } else {
                    formStatus.textContent = "Une erreur est survenue lors de l'envoi. Veuillez réessayer ou me contacter directement.";
                    formStatus.className = "form-status error";
                }
            } catch (err) {
                formStatus.textContent = "Erreur réseau. Veuillez vérifier votre connexion ou m'envoyer un message direct.";
                formStatus.className = "form-status error";
            } finally {
                if (submitBtn) submitBtn.disabled = false;
                setTimeout(() => {
                    if (formStatus.classList.contains("success")) {
                        formStatus.textContent = "";
                        formStatus.className = "form-status";
                    }
                }, 6000);
            }
        });
    }

    // Gestion de la Modale Mentions Légales & Confidentialité RGPD
    const legalModal = document.getElementById("legal-modal");
    const btnOpenLegal = document.getElementById("btn-open-legal");
    const linkLegalForm = document.getElementById("link-legal-form");
    const closeLegalModal = document.getElementById("close-legal-modal");
    const btnCloseLegalFooter = document.getElementById("btn-close-legal-footer");

    const openLegal = (e) => {
        if (e) e.preventDefault();
        if (legalModal) {
            legalModal.classList.add("active");
            document.body.style.overflow = "hidden";
        }
    };

    const closeLegal = () => {
        if (legalModal) {
            legalModal.classList.remove("active");
            document.body.style.overflow = "";
        }
    };

    if (btnOpenLegal) btnOpenLegal.addEventListener("click", openLegal);
    if (linkLegalForm) linkLegalForm.addEventListener("click", openLegal);
    if (closeLegalModal) closeLegalModal.addEventListener("click", closeLegal);
    if (btnCloseLegalFooter) btnCloseLegalFooter.addEventListener("click", closeLegal);

    if (legalModal) {
        legalModal.addEventListener("click", (e) => {
            if (e.target === legalModal) closeLegal();
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && legalModal && legalModal.classList.contains("active")) {
            closeLegal();
        }
    });
});
