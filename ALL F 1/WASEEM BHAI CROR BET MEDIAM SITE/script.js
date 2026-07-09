// ============ PAGE LOADER ============
window.addEventListener('load', function() {
  const loader = document.getElementById('pageLoader');
  setTimeout(function() {
    loader.classList.add('hidden');
  }, 1400);
});

// ============ NAVBAR SCROLL EFFECT ============
const navbar = document.getElementById('navbar');
let lastScrollY = 0;

function handleNavScroll() {
  const scrollY = window.scrollY;
  if (scrollY > 40) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  lastScrollY = scrollY;
}

window.addEventListener('scroll', handleNavScroll, { passive: true });

// ============ ACTIVE NAV LINK ON SCROLL ============
const sections = document.querySelectorAll('section[id], .hero[id]');
const navLinks = document.querySelectorAll('.nav-link:not(.nav-cta)');

function updateActiveNav() {
  let current = '';
  const scrollPos = window.scrollY + 200;
  
  sections.forEach(function(section) {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    if (scrollPos >= top && scrollPos < top + height) {
      current = section.getAttribute('id');
    }
  });
  
  navLinks.forEach(function(link) {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href && href === '#' + current) {
      link.classList.add('active');
    }
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });

// ============ MOBILE MENU ============
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link');

function openMobileMenu() {
  mobileMenu.style.display = 'block';
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(function() {
    mobileMenu.classList.add('open');
  });
}

function closeMobileMenu() {
  mobileMenu.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(function() {
    mobileMenu.style.display = 'none';
  }, 400);
}

mobileMenuBtn.addEventListener('click', function() {
  if (mobileMenu.classList.contains('open')) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
});

mobileMenuBackdrop.addEventListener('click', closeMobileMenu);

mobileMenuLinks.forEach(function(link) {
  link.addEventListener('click', function() {
    closeMobileMenu();
  });
});

// ============ SMOOTH SCROLL ============
document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    const target = document.querySelector(targetId);
    if (target) {
      const navHeight = navbar.offsetHeight;
      const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  });
});

// ============ SOLVE TABS ============
const solveTabs = document.querySelectorAll('.solve-tab');
const solveContents = document.querySelectorAll('.solve-content');

solveTabs.forEach(function(tab) {
  tab.addEventListener('click', function() {
    const targetId = this.getAttribute('data-tab');
    
    solveTabs.forEach(function(t) {
      t.classList.remove('active');
    });
    this.classList.add('active');
    
    solveContents.forEach(function(content) {
      content.classList.remove('active');
    });
    document.getElementById(targetId).classList.add('active');
    
    const newReveals = document.getElementById(targetId).querySelectorAll('.reveal');
    newReveals.forEach(function(el) {
      el.classList.add('visible');
    });
  });
});

// ============ FAQ ACCORDION ============
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(function(item) {
  const question = item.querySelector('.faq-question');
  const answer = item.querySelector('.faq-answer');
  const answerInner = item.querySelector('.faq-answer-inner');
  
  question.addEventListener('click', function() {
    const isOpen = item.classList.contains('open');
    
    faqItems.forEach(function(otherItem) {
      if (otherItem !== item && otherItem.classList.contains('open')) {
        otherItem.classList.remove('open');
        otherItem.querySelector('.faq-answer').style.maxHeight = '0';
      }
    });
    
    if (isOpen) {
      item.classList.remove('open');
      answer.style.maxHeight = '0';
    } else {
      item.classList.add('open');
      answer.style.maxHeight = answerInner.offsetHeight + 24 + 'px';
    }
  });
});

// ============ SCROLL REVEAL ============
function revealOnScroll() {
  const reveals = document.querySelectorAll('.reveal');
  const windowHeight = window.innerHeight;
  
  reveals.forEach(function(el) {
    const top = el.getBoundingClientRect().top;
    const revealPoint = 80;
    
    if (top < windowHeight - revealPoint) {
      el.classList.add('visible');
    }
  });
}

window.addEventListener('scroll', revealOnScroll, { passive: true });
window.addEventListener('load', revealOnScroll);

// ============ BACK TO TOP ============
const backToTop = document.getElementById('backToTop');

function toggleBackToTop() {
  if (window.scrollY > 600) {
    backToTop.classList.add('visible');
  } else {
    backToTop.classList.remove('visible');
  }
}

window.addEventListener('scroll', toggleBackToTop, { passive: true });

backToTop.addEventListener('click', function() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});

// ============ HAPTIC FEEDBACK SIMULATION ============
document.querySelectorAll('.btn-primary, .btn-secondary, .nav-cta, .solve-tab, .mobile-menu-cta').forEach(function(btn) {
  btn.addEventListener('touchstart', function() {
    this.style.transform = 'scale(0.96)';
  }, { passive: true });
  
  btn.addEventListener('touchend', function() {
    this.style.transform = '';
  }, { passive: true });
});

// ============ GALLERY HORIZONTAL SCROLL INDICATOR ============
const galleryScroll = document.querySelector('.gallery-scroll');
if (galleryScroll) {
  let isDown = false;
  let startX;
  let scrollLeft;
  
  galleryScroll.addEventListener('mousedown', function(e) {
    isDown = true;
    startX = e.pageX - galleryScroll.offsetLeft;
    scrollLeft = galleryScroll.scrollLeft;
    galleryScroll.style.cursor = 'grabbing';
  });
  
  galleryScroll.addEventListener('mouseleave', function() {
    isDown = false;
    galleryScroll.style.cursor = '';
  });
  
  galleryScroll.addEventListener('mouseup', function() {
    isDown = false;
    galleryScroll.style.cursor = '';
  });
  
  galleryScroll.addEventListener('mousemove', function(e) {
    if (!isDown) return;
    e.preventDefault();
    var x = e.pageX - galleryScroll.offsetLeft;
    var walk = (x - startX) * 1.5;
    galleryScroll.scrollLeft = scrollLeft - walk;
  });
}

// ============ PREVENT OVERSCROLL ON iOS ============
document.body.addEventListener('touchmove', function(e) {
}, { passive: true });

// ============ INITIAL SETUP ============
handleNavScroll();
toggleBackToTop();
