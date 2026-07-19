document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================================================
    // 1. Génération des lucioles (Fireflies) en arrière-plan
    // ==========================================================================
    const firefliesContainer = document.getElementById("fireflies-container");
    if (firefliesContainer) {
        const numFireflies = 30; // Nombre de particules organiques
        
        for (let i = 0; i < numFireflies; i++) {
            const firefly = document.createElement("div");
            firefly.classList.add("firefly");
            
            // Positionnement aléatoire dans le viewport
            firefly.style.left = `${Math.random() * 100}vw`;
            firefly.style.top = `${Math.random() * 100}vh`;
            
            // Délai et durée d'animation aléatoires pour un effet naturel non-répétitif
            firefly.style.animationDelay = `${Math.random() * 5}s, ${Math.random() * 3}s`;
            firefly.style.animationDuration = `${10 + Math.random() * 10}s, ${2 + Math.random() * 2}s`;
            
            firefliesContainer.appendChild(firefly);
        }
    }

    // ==========================================================================
    // 2. Menu Mobile (Hamburger)
    // ==========================================================================
    const menuToggle = document.getElementById("menu-toggle");
    const navMenu = document.querySelector("#nav-menu");

    if (menuToggle && navMenu) {
        menuToggle.addEventListener("click", () => {
            navMenu.classList.toggle("open");
        });

        // Fermeture automatique du menu lors du clic sur une ancre (sur mobile)
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove("open");
            });
        });
    }

    // ==========================================================================
    // 3. Accordéon de la section FAQ
    // ==========================================================================
    const accordionHeaders = document.querySelectorAll(".accordion-header");

    accordionHeaders.forEach(header => {
        header.addEventListener("click", function() {
            const content = this.nextElementSibling;
            const icon = this.querySelector(".icon");
            
            // Fermer tous les autres éléments de l'accordéon pour une navigation claire
            document.querySelectorAll(".accordion-content").forEach(item => {
                if (item !== content) {
                    item.style.maxHeight = null;
                    item.style.padding = "0 1.2rem";
                }
            });
            document.querySelectorAll(".accordion-header .icon").forEach(i => {
                if (i !== icon) i.textContent = "+";
            });

            // Basculer l'état de l'élément actuellement cliqué
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                content.style.padding = "0 1.2rem";
                icon.textContent = "+";
            } else {
                content.style.padding = "1rem 1.2rem 1.2rem 1.2rem";
                content.style.maxHeight = content.scrollHeight + 40 + "px"; // +40 pour le padding
                icon.textContent = "-";
            }
        });
    });

    // ==========================================================================
    // 4. Validation du Formulaire de Contact
    // ==========================================================================
    const contactForm = document.getElementById("contact-form");
    const formStatus = document.getElementById("form-status");

    if (contactForm) {
        contactForm.addEventListener("submit", (e) => {
            e.preventDefault(); // Empêcher le rechargement brutal de la page
            
            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const message = document.getElementById("message").value.trim();
            
            // Vérification basique des champs
            if (!name || !email || !message) {
                formStatus.textContent = "Veuillez remplir tous les champs obligatoires.";
                formStatus.className = "form-status error";
                return;
            }
            
            // Vérification du format de l'email via Regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                formStatus.textContent = "Veuillez saisir une adresse email valide.";
                formStatus.className = "form-status error";
                return;
            }

            formStatus.textContent = "Envoi en cours...";
            formStatus.className = "form-status";

            // Envoi des données via Formspree (AJAX) sans quitter la page
            fetch(contactForm.action, {
                method: 'POST',
                body: new FormData(contactForm),
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(response => {
                if (response.ok) {
                    formStatus.textContent = "Merci, votre message a été envoyé avec succès !";
                    formStatus.className = "form-status success";
                    contactForm.reset();
                } else {
                    formStatus.textContent = "Oups! Un problème est survenu lors de l'envoi.";
                    formStatus.className = "form-status error";
                }
            })
            .catch(error => {
                formStatus.textContent = "Erreur réseau, veuillez vérifier votre connexion.";
                formStatus.className = "form-status error";
            })
            .finally(() => {
                // Effacer le message de statut après 5 secondes
                setTimeout(() => {
                    formStatus.textContent = "";
                    formStatus.className = "form-status";
                }, 5000);
            });
        });
    }

    // ==========================================================================
    // 5. Easter Eggs (La Forêt du Hibou) - Architecture préparée
    // ==========================================================================
    
    // Easter Egg 1: Le hibou caché dans le footer (Au clic)
    const hiddenOwl = document.getElementById("hidden-owl");
    if (hiddenOwl) {
        hiddenOwl.addEventListener("click", () => {
            // TODO: Ajouter le déclencheur audio ici au clic
            // --- Exemple d'implémentation ---
            // const hootSound = new Audio('assets/sounds/hoot.mp3');
            // hootSound.play();
            
            alert("Hoot! Vous avez débusqué le hibou caché ! 🦉");
            hiddenOwl.style.transform = "rotate(360deg)";
        });
    }

    // Easter Egg 2: Konami Code pour déclencher une animation globale (Au clavier)
    // Code secret : Haut, Haut, Bas, Bas, Gauche, Droite, Gauche, Droite, B, A
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    document.addEventListener("keydown", (e) => {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                // Séquence réussie !
                triggerSecretOwlAnimation();
                konamiIndex = 0; // Réinitialisation après succès
            }
        } else {
            konamiIndex = 0; // Mauvaise touche, on réinitialise à zéro
        }
    });

    function triggerSecretOwlAnimation() {
        console.log("Konami Code activé ! 🦉");
        
        // TODO: Ajouter l'animation de vol du hibou ici
        // --- Exemple d'implémentation ---
        // const giantOwl = document.createElement('div');
        // giantOwl.classList.add('flying-owl-overlay');
        // document.body.appendChild(giantOwl);
        
        alert("Konami Code Validé : La magie de la forêt s'éveille ! (Animation et audio à implémenter)");
    }
});
