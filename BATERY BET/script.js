const revealElements = document.querySelectorAll('.reveal');

const revealOnScroll = () => {
  const windowHeight = window.innerHeight;
  const elementVisible = 100;
  
  revealElements.forEach((element) => {
    const elementTop = element.getBoundingClientRect().top;
    if (elementTop < windowHeight - elementVisible) {
      element.classList.add('active');
    }
  });
};

window.addEventListener('scroll', revealOnScroll);
revealOnScroll();

const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.style.background = 'rgba(15, 15, 26, 0.95)';
    navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.3)';
  } else {
    navbar.style.background = 'rgba(15, 15, 26, 0.85)';
    navbar.style.boxShadow = 'none';
  }
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

document.querySelectorAll('.btn-ios, .btn-primary, .btn-secondary, .cta-btn').forEach(button => {
  button.addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.style.cssText = `
            position: absolute;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
            width: 20px;
            height: 20px;
            left: ${x - 10}px;
            top: ${y - 10}px;
        `;
    
    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  });
});

const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

const animateCounters = () => {
  const counters = document.querySelectorAll('.stat-number');
  
  counters.forEach(counter => {
    const text = counter.innerText;
    const isNumber = !isNaN(parseInt(text));
    
    if (isNumber && text.includes('%')) {
      let count = 0;
      const target = parseInt(text);
      const increment = target / 50;
      
      const updateCount = () => {
        if (count < target) {
          count += increment;
          counter.innerText = Math.ceil(count) + '%';
          setTimeout(updateCount, 30);
        } else {
          counter.innerText = target + '%';
        }
      };
      updateCount();
    }
  });
};

const heroObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounters();
      heroObserver.disconnect();
    }
  });
}, { threshold: 0.5 });

const heroSection = document.querySelector('.hero');
if (heroSection) heroObserver.observe(heroSection);

window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const heroImage = document.querySelector('.hero-image-main');
  if (heroImage && scrolled < 600) {
    heroImage.style.transform = `translateY(${scrolled * 0.15}px)`;
  }
});

console.log('BATERYBET Support Center loaded successfully.');