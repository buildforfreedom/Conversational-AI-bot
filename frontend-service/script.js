// Wait for DOM to fully load
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Scroll Reveal Animation ---
    
    // Select all elements with the class 'reveal'
    const reveals = document.querySelectorAll('.reveal');

    // Function to check visibility and add active class
    const revealOnScroll = () => {
        // Find window height and position
        const windowHeight = window.innerHeight;
        const elementVisible = 150; // Offset before revealing

        reveals.forEach((reveal) => {
            const elementTop = reveal.getBoundingClientRect().top;

            // If element is within viewport threshold, add active class
            if (elementTop < windowHeight - elementVisible) {
                reveal.classList.add('active');
            }
        });
    };

    // Trigger on scroll
    window.addEventListener('scroll', revealOnScroll);
    
    // Trigger on load for elements already in viewport
    revealOnScroll();

    // --- Optional: Add subtle 3D tilt effect to Hero card if on desktop ---
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    
    if (isDesktop) {
        const heroCard = document.querySelector('.main-hero-card');
        
        document.addEventListener('mousemove', (e) => {
            if (!heroCard) return;
            
            // Calculate mouse position relative to center of screen
            const xAxis = (window.innerWidth / 2 - e.pageX) / 50;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 50;

            // Apply soft rotation
            heroCard.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
        });

        // Reset on mouseleave
        document.addEventListener('mouseleave', () => {
            if (!heroCard) return;
            heroCard.style.transform = `rotateY(0deg) rotateX(0deg)`;
            heroCard.style.transition = 'transform 0.5s ease';
            
            // Remove transition after reset to allow smooth mouse tracking again
            setTimeout(() => {
                heroCard.style.transition = 'none';
            }, 500);
        });
    }
});
