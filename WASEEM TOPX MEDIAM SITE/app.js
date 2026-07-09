/**
 * Parimatch Support Site - Interactive Scripts
 * iOS-style micro-interactions & functionality
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // 🎨 IMAGE GALLERY & GUIDE IMAGES - TAP TO ENLARGE (iOS style)
  const galleryImages = document.querySelectorAll('.gallery-img, .guide-img');
  
  galleryImages.forEach(img => {
    img.addEventListener('click', function() {
      this.style.transform = 'scale(1.06)';
      this.style.borderColor = 'var(--accent-red)';
      
      setTimeout(() => {
        this.style.transform = '';
        this.style.borderColor = '';
      }, 300);
    });
  });
  
  // ✨ IOS-STYLE HOVER EFFECTS FOR CARDS
  const cards = document.querySelectorAll('.ios-card');
  cards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.borderColor = 'rgba(255, 59, 48, 0.4)';
    });
    card.addEventListener('mouseleave', function() {
      this.style.borderColor = 'rgba(255, 255, 255, 0.08)';
    });
  });
  
  // 🔄 PRELOAD IMPORTANT IMAGES FOR SMOOTH iOS EXPERIENCE
  const importantImages = [
    'IMAGES/LOGO.png',
    'https://i.ibb.co/7xSSBr0h/Chat-GPT-Image-May-22-2026-05-11-42-PM.png',
    'https://i.ibb.co/4nNPvKMs/Chat-GPT-Image-May-22-2026-05-11-45-PM.png',
    'https://i.ibb.co/zVvJDQf0/Chat-GPT-Image-May-22-2026-05-11-48-PM.png',
    'https://i.ibb.co/8gL71Mfn/Chat-GPT-Image-May-22-2026-05-11-50-PM.png',
    'https://i.ibb.co/JPGQZKf/Chat-GPT-Image-May-22-2026-05-11-52-PM.png'
  ];
  
  importantImages.forEach(src => {
    const img = new Image();
    img.src = src;
  });
  
  // 📱 DETECT IOS DEVICE FOR ENHANCED EXPERIENCE
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  if (isIOS) {
    document.body.classList.add('ios-device');
    console.log("🍎 iOS device detected - Enhanced interactions enabled");
  }
});