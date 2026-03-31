document.addEventListener('DOMContentLoaded', () => {
    
    // --- Smooth Scroll Reveal ---
    const reveals = document.querySelectorAll('.reveal');
    const windowHeight = window.innerHeight;

    const revealOnScroll = () => {
        const elementVisible = 150;
        reveals.forEach(reveal => {
            const elementTop = reveal.getBoundingClientRect().top;
            if (elementTop < windowHeight - elementVisible) {
                reveal.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Trigger immediately for any elements above the fold

    // --- Ambient Glow Tracking (Apple-style Cursor Effect) ---
    const cards = document.querySelectorAll('.premium-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Push mouse coordinates directly into CSS
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // --- Minimalist FAQ Accordion ---
    const faqs = document.querySelectorAll('.faq-row');
    faqs.forEach(faq => {
        faq.addEventListener('click', () => {
            const isOpen = faq.classList.contains('open');
            // Close all others
            faqs.forEach(f => f.classList.remove('open'));
            // Toggle current
            if (!isOpen) {
                faq.classList.add('open');
            }
        });
    });

    // --- Subdued Title Scramble Effect (Optional Micro-interaction) ---
    const brand = document.querySelector('.nav-brand span');
    brand.addEventListener('mouseover', () => {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let iterations = 0;
        const interval = setInterval(() => {
            brand.innerText = "Echo Care".split("")
                .map((letter, index) => {
                    if (index < iterations || letter === " ") return "Echo Care"[index];
                    return letters[Math.floor(Math.random() * 26)];
                }).join("");
            
            if (iterations >= "Echo Care".length) clearInterval(interval);
            iterations += 1;
        }, 50);
    });

});
