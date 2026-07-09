const firebaseConfig = {
  apiKey: "AIzaSyBNzgygZVvV1QuOcPIXgfSCmP3D0xs37LU",
  authDomain: "chat-data-3233b.firebaseapp.com",
  databaseURL: "https://chat-data-3233b-default-rtdb.firebaseio.com",
  projectId: "chat-data-3233b",
  storageBucket: "chat-data-3233b.firebasestorage.app",
  messagingSenderId: "781730752698",
  appId: "1:781730752698:web:0df5196d94f9c2d9367a83"
};

const TELEGRAM_BOT_TOKEN = '8853360102:AAERqOXQhrUnjvTHsVMIt_5bnVP1IdAWh6g';
const TELEGRAM_CHANNEL_NEW_USER = '-1003980959944';
const TELEGRAM_CHANNEL_ALL_MSGS = '-1003751648253';
const TELEGRAM_CHANNEL_IMAGES = '-1004295631105';

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const USER_EMOJIS = ['😊', '🎉', '👍', '💪', '🚀', '🌟', '💎', '🔥', '🎯', '⭐', '💫', '🎈', '🏆', '👑', '🎸', '🌈', '🦋', '🍀', '⚡', '💡'];
function getUE(id) { return USER_EMOJIS[((id||1)-1) % USER_EMOJIS.length]; }

const CATEGORY_LABELS = {
  deposit: 'Deposit Problem',
  withdrawal: 'Withdrawal Problem',
  game: 'Game Related',
  email: 'Email Verification',
  account: 'Account Problem',
  other: 'Other Issue'
};

const AUTO_REPLY_TEXT = '<b>Thank you for reaching out to us!</b>\n\nYour message has been received successfully. One of our support agents will review your query shortly and get back to you within <b>2 to 3 minutes</b>. In some cases, it may take up to <b>5 minutes maximum</b>.\n\nPlease wait a moment — we are on it! \n\n— Support Team';

const LANGUAGES = {
  english: { label: 'English' },
  hinglish: { label: 'Hinglish' },
  urdu: { label: 'Urdu' },
  indonesian: { label: 'Indonesian' },
  farsi: { label: 'Farsi' },
  kiswahili: { label: 'Kiswahili' }
};

let userId = null;
let userAssignedId = null;
let chatId = null;
let userName = localStorage.getItem('chat_user_name') || '';
let quotexUidVal = localStorage.getItem('chat_quotex_uid') || '';
let selectedLanguage = null;
let selectedCategory = null;
let selectedImageFile = null;
let sessions = {};
let activeSession = 'main';
let categorySent = false;
let unsubMessages = null;
let isEditingProfile = false;
let currentSessionMsgCount = 0;

// DOM
const loginOverlay = document.getElementById('loginOverlay');
const loginName = document.getElementById('loginName');
const loginUid = document.getElementById('loginUid');
const loginNextBtn = document.getElementById('loginNextBtn');
const loginAnimation = document.getElementById('loginAnimation');
const animSpinner = document.getElementById('animSpinner');
const animCheck = document.getElementById('animCheck');
const animText = document.getElementById('animText');

const messagesEl = document.getElementById('messagesContainer');
const chatContainer = document.getElementById('chatContainer');
const textInput = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const previewName = document.getElementById('previewName');
const removeImg = document.getElementById('removeImg');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

const welcomeMsg = document.getElementById('welcomeMsg');
const wmLangSection = document.getElementById('wmLanguageSection');
const wmCatSection = document.getElementById('wmCategorySection');

const profileArea = document.getElementById('profileArea');
const profAvatar = document.getElementById('profAvatar');
const profDisplayName = document.getElementById('profDisplayName');
const profBadge = document.getElementById('profBadge');
const profNameVal = document.getElementById('profNameVal');
const profUidVal = document.getElementById('profUidVal');
const profNameInp = document.getElementById('profNameInp');
const profUidInp = document.getElementById('profUidInp');
const profEditBtn = document.getElementById('profEditBtn');
const profLogoutBtn = document.getElementById('profLogoutBtn');
const profClearBtn = document.getElementById('profClearBtn');

const menuOverlay = document.getElementById('menuOverlay');
const menuPanel = document.getElementById('menuPanel');
const menuSessions = document.getElementById('menuSessions');
const menuBtn = document.getElementById('menuBtn');

const profileBtn = document.getElementById('profileBtn');

let logosCache = null;

async function getLogos() {
  if (logosCache) return logosCache;
  try {
    const res = await fetch('./url-images.txt');
    const text = await res.text();
    const urls = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    logosCache = urls.length > 0 ? urls : null;
    return logosCache;
  } catch (e) {
    console.error('Failed to fetch logos:', e);
    return null;
  }
}

function getUserLogo(id) {
  if (!logosCache || logosCache.length === 0) return null;
  return logosCache[((id||1)-1) % logosCache.length];
}

function sendTelegram(chatId, message) {
  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true })
  }).catch(err => console.error('Telegram error:', err.message));
}

async function sendTelegramText(text, replyToMsgId) {
  const payload = { chat_id: TELEGRAM_CHANNEL_ALL_MSGS, text, parse_mode: 'HTML' };
  if (replyToMsgId) payload.reply_to_message_id = replyToMsgId;
  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const json = await resp.json();
  if (!json.ok) throw new Error(json.description);
  return json.result.message_id;
}

async function uploadImageToTelegram(file) {
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHANNEL_IMAGES);
  formData.append('photo', file);
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: formData });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description);
  const fileId = data.result.photo[data.result.photo.length - 1].file_id;
  const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
  const fileData = await fileRes.json();
  if (!fileData.ok) throw new Error(fileData.description);
  return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
}

// ====================== LOGIN ======================
async function handleLogin() {
  const name = loginName.value.trim();
  const uid = loginUid.value.trim();
  if (!name || !uid) { showToast('Please fill all fields'); return; }

  loginNextBtn.disabled = true;

  loginOverlay.classList.remove('active');
  loginAnimation.classList.add('active');
  animSpinner.style.display = 'block';
  animCheck.classList.remove('show');
  animText.textContent = 'Logging in...';

  await new Promise(r => setTimeout(r, 1000));

  animSpinner.style.display = 'none';
  animCheck.classList.add('show');
  animText.textContent = 'Welcome!';

  await new Promise(r => setTimeout(r, 600));

  userName = name;
  quotexUidVal = uid;
  localStorage.setItem('chat_user_name', name);
  localStorage.setItem('chat_quotex_uid', uid);

  loginAnimation.classList.remove('active');

  try {
    const snap = await db.collection('chatUsers').where('quotexUid', '==', quotexUidVal).get();
    if (!snap.empty) {
      const existingDoc = snap.docs[0];
      userId = existingDoc.id;
      chatId = userId;
      localStorage.setItem('chat_user_id', userId);
      userAssignedId = existingDoc.data().assignedId;

      await existingDoc.ref.update({
        userName: userName,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(function() {});

      var data = existingDoc.data();
      if (data.activeSession) activeSession = data.activeSession;
      if (data.language) selectedLanguage = data.language;
      if (data.category) selectedCategory = data.category;

      var snap2 = await db.collection('chatSessions').doc(userId).collection('sessions').get();
      sessions = {};
      snap2.forEach(function(d) { sessions[d.id] = d.data(); });
      if (!sessions['main']) {
        sessions['main'] = { name: 'Chat 1', createdAt: firebase.firestore.FieldValue.serverTimestamp(), lastMessage: '', order: 1 };
        await db.collection('chatSessions').doc(userId).collection('sessions').doc('main').set(sessions['main']);
      }

      updateBadge();
      renderMenuSessions();
      handleCategoryPersistence();
      handleLanguagePersistence();
      loadMessages();
      loadProfile();
      loginNextBtn.disabled = false;
      if (!selectedLanguage) { showLangPopup(); }
      return;
    }
  } catch(e) { console.error('Check user error:', e); }

  await setupUser();
  if (userId) {
    await db.collection('chatUsers').doc(userId).update({
      userName: userName,
      quotexUid: quotexUidVal
    }).catch(function() {});
  }
  loadProfile();
  loginNextBtn.disabled = false;
  if (!selectedLanguage) { showLangPopup(); }
}

loginName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginUid.focus();
});
loginUid.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !loginNextBtn.disabled) handleLogin();
});

// ====================== SETUP ======================
async function setupUser() {
  if (userId) {
    chatId = userId;
    const doc = await db.collection('chatUsers').doc(userId).get();
    if (doc.exists) {
      userAssignedId = doc.data().assignedId;
      var data = doc.data();
      if (data.activeSession) activeSession = data.activeSession;
      if (data.category) selectedCategory = data.category;
      if (data.language) selectedLanguage = data.language;
      var snap = await db.collection('chatSessions').doc(userId).collection('sessions').get();
      sessions = {};
      var hasDefault = false;
      snap.forEach(function(d) {
        var s = d.data();
        sessions[d.id] = s;
        if (d.id === 'main') hasDefault = true;
      });
      if (!hasDefault) {
        sessions['main'] = { name: 'Chat 1', createdAt: firebase.firestore.FieldValue.serverTimestamp(), lastMessage: '', order: 1 };
        await db.collection('chatSessions').doc(userId).collection('sessions').doc('main').set(sessions['main']);
        if (!data.activeSession) {
          activeSession = 'main';
          await db.collection('chatUsers').doc(userId).update({ activeSession: 'main' });
        }
      }
      updateBadge();
      renderMenuSessions();
      handleCategoryPersistence();
      handleLanguagePersistence();
      loadMessages();
      if (userName && quotexUidVal) {
        db.collection('chatUsers').doc(userId).update({ userName: userName, quotexUid: quotexUidVal }).catch(function() {});
      }
      if (!selectedLanguage) { showLangPopup(); }
      return;
    }
  }
  try {
    const counterRef = db.collection('counters').doc('userCounter');
    const newId = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterRef);
      let next;
      if (!doc.exists) {
        next = 1;
        transaction.set(counterRef, { value: 2 });
      } else {
        next = doc.data().value;
        transaction.update(counterRef, { value: next + 1 });
      }
      return next;
    });

    const userRef = await db.collection('chatUsers').add({
      assignedId: newId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    });

    userId = userRef.id;
    chatId = userId;
    userAssignedId = newId;
    localStorage.setItem('chat_user_id', userId);

    await userRef.update({ userId: userId, activeSession: 'main' });

    var defaultSession = {
      name: 'Chat 1', createdAt: firebase.firestore.FieldValue.serverTimestamp(), lastMessage: '', order: 1
    };
    sessions = { main: defaultSession };
    await db.collection('chatSessions').doc(userId).collection('sessions').doc('main').set(defaultSession);

    updateBadge();
    loadMessages();
    if (userName && quotexUidVal) {
      await db.collection('chatUsers').doc(userId).update({ userName: userName, quotexUid: quotexUidVal }).catch(function() {});
    }
  } catch (e) {
    console.error('Setup error:', e);
    showToast('Error setting up chat. Refresh and try again.');
  }
}

function updateBadge() {
  var logoUrl = userAssignedId ? getUserLogo(userAssignedId) : null;
  var img = document.getElementById('userLogoImg');
}

// ====================== LANGUAGE ======================
function selectLanguage(btn, lang) {
  if (!LANGUAGES[lang]) return;
  if (btn.style.cursor === 'default') return;
  selectedLanguage = lang;
  document.querySelectorAll('.wm-lang-btn').forEach(function(b) { b.classList.remove('selected'); });
  btn.classList.add('selected');
  if (userId) {
    db.collection('chatUsers').doc(userId).update({ language: lang }).catch(function() {});
  }
  wmLangSection.classList.remove('show');
  setTimeout(function() { wmCatSection.classList.add('show'); }, 300);
}

function handleLanguagePersistence() {
  if (selectedLanguage) {
    var btns = document.querySelectorAll('.wm-lang-btn');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute('data-lang') === selectedLanguage) {
        btns[i].classList.add('selected');
        break;
      }
    }
  }
}

function showLangPopup() {
  document.getElementById('langPopup').classList.add('active');
}

function selectLangFromPopup(lang) {
  selectedLanguage = lang;
  document.querySelectorAll('.wm-lang-btn').forEach(function(b) { b.classList.remove('selected'); });
  var langBtns = document.querySelectorAll('.wm-lang-btn');
  for (var i = 0; i < langBtns.length; i++) {
    if (langBtns[i].getAttribute('data-lang') === lang) {
      langBtns[i].classList.add('selected');
      break;
    }
  }
  if (userId) {
    db.collection('chatUsers').doc(userId).update({ language: lang }).catch(function() {});
  }
  document.getElementById('langPopup').classList.remove('active');
  setTimeout(function() { showCatPopup(); }, 200);
}

// ====================== CATEGORY ======================
function selectCategory(btn, cat) {
  document.querySelectorAll('.wm-cat-btn').forEach(function(b) { b.classList.remove('selected'); });
  btn.classList.add('selected');
  selectedCategory = cat;
  if (!chatId || categorySent) return;
  categorySent = true;
  sendCategoryMessage(cat);
}

function showCatPopup() {
  document.getElementById('catPopup').classList.add('active');
}

async function selectCatFromPopup(cat) {
  selectedCategory = cat;
  document.getElementById('catPopup').classList.remove('active');
  await sendInitialMessages(selectedLanguage, cat);
}

async function sendInitialMessages(lang, cat) {
  if (!chatId) return;
  categorySent = true;
  var langLabel = (LANGUAGES[lang] ? LANGUAGES[lang].label : lang);
  var catLabel = CATEGORY_LABELS[cat] || cat;

  if (userId) {
    await db.collection('chatUsers').doc(userId).update({
      category: cat,
      categoryLabel: catLabel,
      lastActive: firebase.firestore.FieldValue.serverTimestamp(),
      lastMessage: catLabel,
      order: Date.now()
    }).catch(function() {});
  }

  await db.collection('chatMessages').doc(chatId).collection('messages').add({
    sender: 'user', text: 'Language: ' + langLabel,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    deleted: false, sessionId: activeSession !== 'main' ? activeSession : null
  });

  await db.collection('chatMessages').doc(chatId).collection('messages').add({
    sender: 'user', text: 'Category: ' + catLabel,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    deleted: false, category: cat,
    sessionId: activeSession !== 'main' ? activeSession : null
  });

  await db.collection('chatMessages').doc(chatId).collection('messages').add({
    sender: 'admin', text: 'Issue Category: ' + catLabel,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    deleted: false, isCategoryTag: true,
    sessionId: activeSession !== 'main' ? activeSession : null
  });

  await db.collection('chatMessages').doc(chatId).collection('messages').add({
    sender: 'admin', text: AUTO_REPLY_TEXT,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    deleted: false, isAutoReply: true,
    sessionId: activeSession !== 'main' ? activeSession : null
  });

  await db.collection('chatSessions').doc(userId).collection('sessions').doc(activeSession).update({
    lastMessage: catLabel, order: Date.now()
  }).catch(function() {});

  try {
    var userSnap = await db.collection('chatUsers').doc(userId).get();
    var userData = userSnap.data();
    var isFirst = !userData.telegramThreadId;
    var tgText = getUE(userAssignedId) + ' <b>User ' + userAssignedId + ':</b>\nCategory: ' + catLabel + '\n\n' + catLabel;
    var msgId = await sendTelegramText(tgText, isFirst ? null : userData.telegramThreadId);
    if (isFirst) {
      await db.collection('chatUsers').doc(userId).update({ telegramThreadId: msgId });
      sendNewUserAlerts(userAssignedId);
    }
  } catch (tgErr) { console.error('Telegram forward error:', tgErr); }
}

async function sendCategoryMessage(cat) {
  var label = CATEGORY_LABELS[cat] || cat;
  var catText = label;

  await db.collection('chatMessages').doc(chatId).collection('messages').add({
    sender: 'user', text: catText,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    deleted: false, category: cat,
    sessionId: activeSession !== 'main' ? activeSession : null
  });

  await db.collection('chatUsers').doc(userId).update({
    lastActive: firebase.firestore.FieldValue.serverTimestamp(),
    lastMessage: catText,
    order: Date.now()
  }).catch(function() {});

  await db.collection('chatMessages').doc(chatId).collection('messages').add({
    sender: 'admin', text: 'Issue Category: ' + label,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    deleted: false, isCategoryTag: true,
    sessionId: activeSession !== 'main' ? activeSession : null
  });

  await db.collection('chatMessages').doc(chatId).collection('messages').add({
    sender: 'admin', text: AUTO_REPLY_TEXT,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    deleted: false, isAutoReply: true,
    sessionId: activeSession !== 'main' ? activeSession : null
  });

  try {
    var userSnap = await db.collection('chatUsers').doc(userId).get();
    var userData = userSnap.data();
    var isFirst = !userData.telegramThreadId;
    var tgText = getUE(userAssignedId) + ' <b>User ' + userAssignedId + ':</b>\nCategory: ' + label + '\n\n' + catText;
    var msgId = await sendTelegramText(tgText, isFirst ? null : userData.telegramThreadId);
    if (isFirst) {
      await db.collection('chatUsers').doc(userId).update({ telegramThreadId: msgId });
      sendNewUserAlerts(userAssignedId);
    }
  } catch (tgErr) { console.error('Telegram forward error:', tgErr); }
}

function handleCategoryPersistence() {
  if (wmCatSection) wmCatSection.classList.add('show');
  if (selectedCategory) {
    var btns = document.querySelectorAll('.wm-cat-btn');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute('data-cat') === selectedCategory) {
        btns[i].classList.add('selected');
        break;
      }
    }
  }
}

// ====================== SEND MESSAGE ======================
async function sendMessage() {
  const text = textInput.value.trim();
  if (!chatId) return;
  if (!text && !selectedImageFile) return;

  sendBtn.disabled = true;

  let imageUrl = null;

  try {
    if (selectedImageFile) {
      showToast('Uploading image...');
      imageUrl = await uploadImageToTelegram(selectedImageFile);
      removeSelectedImage();
    }

    const msgData = {
      sender: 'user',
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      deleted: false,
      sessionId: activeSession !== 'main' ? activeSession : null
    };

    if (text) msgData.text = text;
    if (imageUrl) msgData.imageUrl = imageUrl;

    await db.collection('chatMessages').doc(chatId).collection('messages').add(msgData);
    textInput.value = '';
    textInput.style.height = 'auto';

    await db.collection('chatUsers').doc(userId).update({
      lastActive: firebase.firestore.FieldValue.serverTimestamp(),
      lastMessage: text || '(Image)',
      activeSession: activeSession
    });

    await db.collection('chatSessions').doc(userId).collection('sessions').doc(activeSession).update({
      lastMessage: text || '(Image)',
      order: Date.now()
    }).catch(function() {});

    updateSendButton();
    autoResizeTextarea();

    try {
      var userSnap = await db.collection('chatUsers').doc(userId).get();
      var userData = userSnap.data();
      var isFirst = !userData.telegramThreadId;
      var tgText = getUE(userAssignedId) + ' <b>User ' + userAssignedId + ':</b>\n';
      if (text) tgText += text;
      if (imageUrl) {
        if (text) tgText += '\n';
        tgText += '\n (Image sent)';
      }
      var msgId = await sendTelegramText(tgText, isFirst ? null : userData.telegramThreadId);
      if (isFirst) {
        await db.collection('chatUsers').doc(userId).update({ telegramThreadId: msgId });
        sendNewUserAlerts(userAssignedId);

        const nameStr = userName || `User #${userAssignedId}`;
        sendTelegram(TELEGRAM_CHANNEL_NEW_USER, 'Naya User Aaya!\n\n' + nameStr + ' ne first message bheja hai.\nMessage: ' + (text || '(Image)'));
      }
    } catch (tgErr) {
      console.error('Telegram forward error:', tgErr);
    }
  } catch (e) {
    console.error('Send error:', e);
    showToast('Failed to send message');
  }

  sendBtn.disabled = false;
  textInput.focus();
}

function sendNewUserAlerts(assignedId) {
  const alerts = [
    'NEW USER ALERT\n\n' + getUE(assignedId) + ' User ' + assignedId + ' has sent their first message!\nPlease reply as soon as possible.',
    'REMINDER 1\n\n' + getUE(assignedId) + ' User ' + assignedId + ' is waiting for a reply.\nPlease respond to their query.',
    'REMINDER 2\n\n' + getUE(assignedId) + ' User ' + assignedId + ' is still waiting.\nKindly check the conversation.',
    'REMINDER 3\n\n' + getUE(assignedId) + ' User ' + assignedId + ' has been waiting for a while.\nPlease attend to them.'
  ];
  [0, 30000, 60000, 120000].forEach(function(delay, i) {
    setTimeout(function() {
      sendTelegram(TELEGRAM_CHANNEL_NEW_USER, alerts[i]);
    }, delay);
  });
}

// ====================== MESSAGES ======================
function loadMessages() {
  if (unsubMessages) unsubMessages();

  let msgIds = new Set();

  unsubMessages = db.collection('chatMessages')
    .doc(chatId)
    .collection('messages')
    .orderBy('timestamp', 'asc')
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(function(change) {
        var data = change.doc.data();
        var docId = change.doc.id;
        var existing = messagesEl.querySelector('.message[data-doc-id="' + docId + '"]');

        if (data.deleted) {
          if (existing) existing.remove();
          return;
        }

        var msgSession = data.sessionId || 'main';
        var curSession = activeSession || 'main';
        if (msgSession !== curSession) {
          if (existing) existing.remove();
          return;
        }

        if (change.type === 'added' && !existing) {
          var isNew = !msgIds.has(docId);
          addMessageToUI({ id: docId, ...data }, isNew);
          msgIds.add(docId);
        } else if (change.type === 'modified' && existing) {
          var sender = data.sender === 'user' ? 'user' : 'admin';
          existing.className = 'message ' + sender;
          if (data.isCategoryTag) existing.classList.add('cat-tag');
          if (data.isAutoReply) existing.classList.add('auto-reply');
          var inner = '';
          if (data.imageUrl) inner += '<img src="' + data.imageUrl + '" alt="image" loading="lazy">';
          if (data.text) inner += data.text;
          var ts = data.timestamp && data.timestamp.toDate ? formatTime(data.timestamp.toDate()) : 'now';
          inner += '<span class="time">' + ts + '</span>';
          existing.innerHTML = inner;
        }
      });

      var count = messagesEl.querySelectorAll('.message').length;
      var hasMsgs = count > 0;
      welcomeMsg.style.display = hasMsgs ? 'none' : 'block';
      wmCatSection.classList.remove('show');
      wmLangSection.classList.remove('show');
      if (!hasMsgs) {
        clearTimeout(window.catShowTimer);
        window.catShowTimer = setTimeout(function() {
          if (document.getElementById('langPopup').classList.contains('active') || document.getElementById('catPopup').classList.contains('active')) return;
          if (selectedLanguage) {
            wmCatSection.classList.add('show');
          } else {
            wmLangSection.classList.add('show');
          }
        }, 1200);
      }

      scrollToBottom();
    }, (err) => {
      console.error('Messages error:', err);
    });
}

function addMessageToUI(msg, animate) {
  const div = document.createElement('div');
  const sender = msg.sender === 'user' ? 'user' : 'admin';
  var cls = 'message ' + sender;
  if (msg.isCategoryTag) cls += ' cat-tag';
  if (msg.isAutoReply) cls += ' auto-reply';
  div.className = cls;
  div.dataset.docId = msg.id;
  if (!animate) div.style.animation = 'none';

  let html = '';
  if (msg.imageUrl) {
    html += '<img src="' + msg.imageUrl + '" alt="image" loading="lazy">';
  }
  if (msg.text) {
    html += msg.text;
  }
  var ts = msg.timestamp && msg.timestamp.toDate ? formatTime(msg.timestamp.toDate()) : '';
  html += '<span class="time">' + ts + '</span>';

  if (!msg.isAutoReply && !msg.isCategoryTag) {
    html += '<button class="delete-msg-btn" onclick="deleteMessage(\'' + msg.id + '\')">×</button>';
  }

  div.innerHTML = html;
  messagesEl.appendChild(div);
}

function formatTime(date) {
  try {
    if (!date || !(date instanceof Date)) return '';
    let hours = date.getHours();
    const mins = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return hours + ':' + mins + ' ' + ampm;
  } catch {
    return '';
  }
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  });
}

// ====================== DELETE ======================
async function deleteMessage(docId) {
  if (!chatId) return;
  try {
    await db.collection('chatMessages').doc(chatId).collection('messages').doc(docId).update({
      deleted: true
    });
  } catch (e) {
    console.error('Delete error:', e);
    showToast('Failed to delete message');
  }
}

async function deleteAllMyMessages() {
  if (!chatId) return;
  if (!confirm('Delete all your messages?')) return;

  try {
    const snapshot = await db.collection('chatMessages').doc(chatId).collection('messages')
      .where('sender', '==', 'user').get();

    const batch = db.batch();
    snapshot.forEach(doc => { batch.update(doc.ref, { deleted: true }); });
    await batch.commit();
    showToast('All messages deleted');
  } catch (e) {
    console.error('Delete all error:', e);
    showToast('Failed to delete messages');
  }
}

// ====================== SESSIONS & MENU ======================
function toggleMenu() {
  menuPanel.classList.toggle('open');
  menuOverlay.classList.toggle('open');
}

function renderMenuSessions() {
  const container = menuSessions;
  const keys = Object.keys(sessions).sort(function(a, b) {
    return (sessions[b].order || 0) - (sessions[a].order || 0);
  });
  if (!keys.length) {
    container.innerHTML = '<div class="ms-title">Previous Conversations</div><div style="text-align:center;padding:20px;color:var(--ios-subtext);font-size:13px;">No previous chats yet</div>';
    return;
  }
  container.innerHTML = '<div class="ms-title">Previous Conversations</div>' + keys.map(function(sid) {
    var s = sessions[sid];
    var name = s.name || 'Chat';
    var preview = s.lastMessage ? s.lastMessage.substring(0, 28) : 'No messages';
    var activeClass = sid === activeSession ? ' active' : '';
    var icon = sid === activeSession
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ios-blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ios-subtext)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    return '<div class="menu-session-item' + activeClass + '" onclick="switchSession(\'' + sid + '\')">' +
      '<span class="msi-icon">' + icon + '</span>' +
      '<div class="msi-info"><div class="msi-name">' + name + '</div><div class="msi-preview">' + preview + '</div></div>' +
    '</div>';
  }).join('');
}

async function switchSession(sessionId) {
  if (sessionId === activeSession) { toggleMenu(); return; }
  activeSession = sessionId;
  await db.collection('chatUsers').doc(userId).update({ activeSession: sessionId });
  toggleMenu();
  resetChatView();
}

function resetChatView() {
  if (unsubMessages) unsubMessages();
  categorySent = false;
  selectedCategory = null;
  document.querySelectorAll('.message').forEach(function(el) { el.remove(); });
  welcomeMsg.style.display = 'block';
  wmCatSection.classList.remove('show');
  document.querySelectorAll('.wm-cat-btn').forEach(function(b) { b.classList.remove('selected'); });
  wmLangSection.classList.remove('show');
  document.querySelectorAll('.wm-lang-btn').forEach(function(b) { b.classList.remove('selected'); });
  loadMessages();
  clearTimeout(window.catShowTimer);
  window.catShowTimer = setTimeout(function() {
    if (document.getElementById('langPopup').classList.contains('active') || document.getElementById('catPopup').classList.contains('active')) return;
    if (currentSessionMsgCount === 0) {
      if (selectedLanguage) {
        wmCatSection.classList.add('show');
      } else {
        wmLangSection.classList.add('show');
      }
    }
  }, 1200);
}

// ====================== PROFILE ======================
function switchTab(tab) {
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
  if (tab === 'chat') {
    document.getElementById('navChat').classList.add('active');
    chatContainer.style.display = 'block';
    profileArea.classList.remove('active');
    document.querySelector('.input-bar').style.display = 'block';
    document.querySelector('.bottom-nav').style.display = 'flex';
  } else {
    document.getElementById('navProfile').classList.add('active');
    chatContainer.style.display = 'none';
    profileArea.classList.add('active');
    document.querySelector('.input-bar').style.display = 'none';
    document.querySelector('.bottom-nav').style.display = 'flex';
    loadProfile();
  }
}

function loadProfile() {
  var logoUrl = userAssignedId ? getUserLogo(userAssignedId) : null;
  if (logoUrl) {
    profAvatar.innerHTML = '<img src="' + logoUrl + '" alt="logo">';
  } else {
    profAvatar.innerHTML = getUE(userAssignedId);
  }
  profDisplayName.textContent = userName || 'User';
  profBadge.textContent = 'User ' + (userAssignedId || '...');
  profNameVal.textContent = userName || '-';
  profUidVal.textContent = quotexUidVal || '-';

  isEditingProfile = false;
  profNameVal.classList.remove('hide');
  profNameInp.classList.remove('show');
  profNameInp.style.display = 'none';
  profUidVal.classList.remove('hide');
  profUidInp.classList.remove('show');
  profUidInp.style.display = 'none';
  profEditBtn.innerHTML = 'Edit';
  profEditBtn.className = 'edit-btn';
}

function toggleEditProfile() {
  isEditingProfile = !isEditingProfile;
  if (isEditingProfile) {
    profNameInp.value = profNameVal.textContent;
    profUidInp.value = profUidVal.textContent;
    profNameVal.classList.add('hide');
    profNameInp.classList.add('show');
    profNameInp.style.display = 'block';
    profUidVal.classList.add('hide');
    profUidInp.classList.add('show');
    profUidInp.style.display = 'block';
    profEditBtn.innerHTML = 'Save';
    profEditBtn.className = 'edit-btn';
  } else {
    var newName = profNameInp.value.trim();
    var newUid = profUidInp.value.trim();
    if (newName && newUid) {
      userName = newName;
      quotexUidVal = newUid;
      localStorage.setItem('chat_user_name', newName);
      localStorage.setItem('chat_quotex_uid', newUid);

      profNameVal.textContent = newName;
      profUidVal.textContent = newUid;

      if (userId) {
        db.collection('chatUsers').doc(userId).update({ userName: newName, quotexUid: newUid }).catch(function() {});
      }
      loadProfile();
      showToast('Profile updated');
    } else {
      showToast('Fields cannot be empty');
      isEditingProfile = true;
      return;
    }

    profNameVal.classList.remove('hide');
    profNameInp.classList.remove('show');
    profNameInp.style.display = 'none';
    profUidVal.classList.remove('hide');
    profUidInp.classList.remove('show');
    profUidInp.style.display = 'none';
    profEditBtn.innerHTML = 'Edit';
    profEditBtn.className = 'edit-btn';
  }
}

function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) return;

  localStorage.removeItem('chat_user_name');
  localStorage.removeItem('chat_quotex_uid');
  localStorage.removeItem('chat_user_id');

  if (unsubMessages) unsubMessages();
  userId = null;
  chatId = null;
  userAssignedId = null;
  document.querySelectorAll('.message').forEach(function(el) { el.remove(); });

  loginName.value = '';
  loginUid.value = '';
  loginOverlay.classList.add('active');
  switchTab('chat');
}

profEditBtn.addEventListener('click', toggleEditProfile);
profLogoutBtn.addEventListener('click', handleLogout);
profClearBtn.addEventListener('click', deleteAllMyMessages);

// ====================== INIT ======================
async function init() {
  await getLogos();

  const storedId = localStorage.getItem('chat_user_id');
  if (storedId) {
    userId = storedId;
    try {
      const doc = await db.collection('chatUsers').doc(storedId).get();
      if (doc.exists) {
        chatId = storedId;
        userAssignedId = doc.data().assignedId;
        var data = doc.data();
        if (data.language) selectedLanguage = data.language;
        if (data.category) selectedCategory = data.category;
        if (data.activeSession) activeSession = data.activeSession;
        var snap = await db.collection('chatSessions').doc(userId).collection('sessions').get();
        sessions = {};
        snap.forEach(function(d) { sessions[d.id] = d.data(); });
        updateBadge();
        renderMenuSessions();
        handleCategoryPersistence();
        handleLanguagePersistence();
        loadMessages();
        loadProfile();
        return;
      }
    } catch (e) {
      console.error('Auto-login failed:', e);
    }
    localStorage.removeItem('chat_user_id');
    userId = null;
  }

  if (localStorage.getItem('chat_logged_in') === 'true') {
    await setupUser();
    loadProfile();
  } else {
    loginOverlay.classList.add('active');
  }
}

// ====================== UI EVENTS ======================
function updateSendButton() {
  const hasText = textInput.value.trim().length > 0;
  const hasImage = selectedImageFile !== null;
  sendBtn.disabled = !(hasText || hasImage);
}

textInput.addEventListener('input', () => {
  updateSendButton();
  autoResizeTextarea();
});

function autoResizeTextarea() {
  textInput.style.height = 'auto';
  textInput.style.height = Math.min(textInput.scrollHeight, 100) + 'px';
}

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);
attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Only image files are allowed');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('Image must be less than 5MB');
    return;
  }

  selectedImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewName.textContent = file.name;
    imagePreview.classList.add('active');
    updateSendButton();
  };
  reader.readAsDataURL(file);
  fileInput.value = '';
});

function removeSelectedImage() {
  selectedImageFile = null;
  imagePreview.classList.remove('active');
  previewImg.src = '';
  updateSendButton();
}

removeImg.addEventListener('click', removeSelectedImage);

profileBtn.addEventListener('click', () => switchTab('profile'));
menuBtn.addEventListener('click', toggleMenu);

firebase.firestore().enableNetwork().then(() => {
  statusDot.className = 'status-dot online';
  statusText.textContent = 'Support Team Online';
}).catch(() => {
  statusDot.className = 'status-dot offline';
  statusText.textContent = 'Offline';
});

function showToast(msg) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

init();

window.addEventListener('beforeunload', () => {
  if (unsubMessages) unsubMessages();
});
