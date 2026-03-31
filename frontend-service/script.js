document.addEventListener('DOMContentLoaded', () => {

    /* --- TESTIMONIAL CAROUSEL (BENTO BOX) --- */
    const slides = document.querySelectorAll('.slide');
    if (slides.length > 0) {
        let currentSlide = 0;
        setInterval(() => {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 5000); // 5-second automatic sliding
    }

    /* --- INTERACTIVE FAQ ACCORDION --- */
    const faqs = document.querySelectorAll('.faq-question');
    faqs.forEach(faq => {
        faq.addEventListener('click', () => {
            const activeFaq = document.querySelector('.faq-item.active');
            if (activeFaq && activeFaq !== faq.parentElement) {
                activeFaq.classList.remove('active');
            }
            faq.parentElement.classList.toggle('active');
        });
    });

    /* --- BENTO CARD TILT EFFECT (DESKTOP) --- */
    const isDesktop = window.matchMedia('(min-width: 900px)').matches;
    if (isDesktop) {
        const boxes = document.querySelectorAll('.bento-box');
        
        boxes.forEach(box => {
            box.addEventListener('mousemove', (e) => {
                const rect = box.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = ((y - centerY) / centerY) * -5;
                const rotateY = ((x - centerX) / centerX) * 5;
                
                box.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
                box.style.zIndex = "10";
            });

            box.addEventListener('mouseleave', () => {
                box.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
                box.style.zIndex = "1";
            });
        });
    }
});
