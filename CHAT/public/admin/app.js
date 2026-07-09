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
const TELEGRAM_CHAT_ID = '-1004295631105';

firebase.initializeApp(firebaseConfig);
const fdb = firebase.firestore();


const USER_EMOJIS = ['😊', '🎉', '👍', '💪', '🚀', '🌟', '💎', '🔥', '🎯', '⭐', '💫', '🎈', '🏆', '👑', '🎸', '🌈', '🦋', '🍀', '⚡', '💡'];
function getUE(id) { return USER_EMOJIS[((id||1)-1) % USER_EMOJIS.length]; }

const NEW_USER_HOURS = 24;

let selectedUserId = null;
let selectedUserAssignedId = null;
let selectedImage = null;
let users = [];
let unsubUsers = null;
let unsubMsgs = null;
let editingMessageId = null;
let unreadUsers = new Set();
let lastSeenMessages = {};

async function uploadImageToTelegram(file) {
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  formData.append('photo', file);
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description);
    const fileId = data.result.photo[data.result.photo.length - 1].file_id;
    const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    if (!fileData.ok) throw new Error(fileData.description);
    return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
  } catch (err) {
    console.error('Telegram image upload error:', err.message);
    throw err;
  }
}

async function sendTelegramText(text, replyToMsgId) {
  const payload = { chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' };
  if (replyToMsgId) payload.reply_to_message_id = replyToMsgId;
  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const json = await resp.json();
  if (!json.ok) throw new Error(json.description);
  return json.result.message_id;
}

// DOM refs
const userListEl = document.getElementById('userList');
const searchInput = document.getElementById('searchInput');
const sectionHeader = document.getElementById('sectionHeader');
const chatMessages = document.getElementById('chatMessages');
const adminChatContainer = document.getElementById('adminChatContainer');
const noChatSelected = document.getElementById('noChatSelected');
const adminTextInput = document.getElementById('adminTextInput');
const adminSendBtn = document.getElementById('adminSendBtn');
const inputBar = document.getElementById('inputBar');
const navTitle = document.getElementById('navTitle');
const navRight = document.getElementById('navRight');
const backBtn = document.getElementById('backBtn');
const userListPanel = document.getElementById('userListPanel');
const chatPanel = document.getElementById('chatPanel');
const navActions = document.getElementById('navActions');
const blockBtn = document.getElementById('blockBtn');
const deleteBtn = document.getElementById('deleteBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeImg = document.getElementById('removeImg');
const editBar = document.getElementById('editBar');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');





// ====================== SIDEBAR TOGGLE ======================
function toggleSidebar() {
  userListPanel.classList.toggle('sidebar-open');
  sidebarOverlay.classList.toggle('open');
  hamburgerBtn.classList.toggle('active');
}

hamburgerBtn.addEventListener('click', toggleSidebar);
sidebarOverlay.addEventListener('click', toggleSidebar);

// ====================== SUBSCRIBE USERS ======================
function subscribeUsers() {
  if (unsubUsers) unsubUsers();

  unsubUsers = fdb.collection('chatUsers')
    .orderBy('lastActive', 'desc')
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(function(change) {
        if (change.type === 'modified') {
          var data = change.doc.data();
          var uid = change.doc.id;
          var prevMsg = lastSeenMessages[uid] || '';
          var currMsg = data.lastMessage || '';
          if (currMsg !== prevMsg && uid !== selectedUserId) {
            unreadUsers.add(uid);
          }
          lastSeenMessages[uid] = currMsg;
        }
        if (change.type === 'added') {
          var data = change.doc.data();
          lastSeenMessages[change.doc.id] = data.lastMessage || '';
          if (change.doc.id !== selectedUserId) {
            unreadUsers.add(change.doc.id);
          }
        }
      });
      users = [];
      snapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      renderUserList(searchInput.value);
      if (selectedUserId) updateBlockBtn(selectedUserId);
    }, (err) => {
      console.error('Users error:', err);
    });
}

function renderUserList(filter = '') {
  userListEl.innerHTML = '';

  const filtered = users.filter(u => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return String(u.assignedId || '').includes(q) ||
           (u.userName || '').toLowerCase().includes(q) ||
           (u.quotexUid || '').toLowerCase().includes(q) ||
           (q === 'blocked' && u.blocked);
  });

  if (filtered.length === 0) {
    userListEl.innerHTML = `
      <div class="no-users">
        <div class="icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ios-dark-gray)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <p>No users found</p>
      </div>
    `;
    sectionHeader.textContent = 'No Results';
    return;
  }

  sectionHeader.textContent = `All Users (${filtered.length})`;

  filtered.forEach((u) => {
    const item = document.createElement('div');
    item.className = `user-item${u.blocked ? ' blocked' : ''}${selectedUserId === u.id ? ' selected' : ''}${unreadUsers.has(u.id) ? ' unread' : ''}`;
    item.dataset.userId = u.id;

    const displayName = u.userName || u.name || `User #${u.assignedId || '?'}`;
    const lastMsg = u.lastMessage || 'No messages yet';
    const lastActive = u.lastActive && u.lastActive.toDate ? formatTimeAgo(u.lastActive.toDate()) : '';
    const isOnline = u.online === true;
    const isNew = u.createdAt && u.createdAt.toDate ? (Date.now() - u.createdAt.toDate().getTime()) < NEW_USER_HOURS * 3600000 : false;
    const isBlocked = u.blocked === true;
    const hasUnread = unreadUsers.has(u.id);

    var catHtml = u.categoryLabel ? `<span style="color:#22c55e;font-size:11px;">${u.categoryLabel}</span>` : '';
    var langHtml = u.language ? `<span style="color:#ff9f43;font-size:11px;">${u.language.charAt(0).toUpperCase() + u.language.slice(1)}</span>` : '';
    var uidHtml = u.quotexUid ? `<span style="color:#8e8e93;font-size:11px;">UID: ${u.quotexUid}</span>` : '';
    var unreadDotHtml = hasUnread ? '<span class="unread-dot"></span>' : '';

    item.innerHTML = `
      <div class="user-avatar" style="${u.logo ? '' : `background: ${getAvatarColor(u.assignedId || 1)}`}">
        ${u.logo ? `<img src="${u.logo}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : displayName[0]}
        <span class="online-indicator ${isOnline ? 'online' : 'offline'}"></span>
      </div>
      <div class="user-info">
        <div class="user-name">
          #${u.assignedId || '?'} ${u.userName ? '- ' + u.userName : ''}
          ${isNew ? '<span class="badge new">NEW</span>' : ''}
          ${isBlocked ? '<span class="badge blocked">BLOCKED</span>' : ''}
        </div>
        <div class="user-email">${catHtml} ${langHtml} ${uidHtml} ${unreadDotHtml}</div>
        <div class="user-preview">${lastMsg}</div>
      </div>
      <div class="user-time">${lastActive}</div>
    `;

    item.addEventListener('click', () => selectUser(u.id));
    userListEl.appendChild(item);
  });
}

function getAvatarColor(id) {
  const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FF2D55', '#5856D6'];
  return colors[((parseInt(id) || 1) - 1) % colors.length];
}

function formatTimeAgo(date) {
  try {
    if (!date || !(date instanceof Date)) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  } catch {
    return '';
  }
}

// ====================== SELECT USER ======================
async function selectUser(userId) {
  if (editingMessageId) cancelEdit();
  selectedUserId = userId;
  unreadUsers.delete(userId);

  const user = users.find(u => u.id === userId);
  const assignedId = user?.assignedId || 0;
  selectedUserAssignedId = assignedId;
  const displayName = user?.userName || user?.name || `User #${assignedId}`;

  // Build rich header
  var headerHtml = getUE(assignedId) + ' ' + displayName;
  if (user?.quotexUid) headerHtml += ' (UID: ' + user.quotexUid + ')';
  if (user?.language) {
    var langLabel = user.language.charAt(0).toUpperCase() + user.language.slice(1);
    headerHtml += ' \uD83C\uDF10 ' + langLabel;
  }
  if (user?.categoryLabel) {
    headerHtml += ' \u2014 ' + user.categoryLabel;
  }

  noChatSelected.style.display = 'none';
  adminChatContainer.style.display = 'flex';
  adminChatContainer.style.flexDirection = 'column';
  adminChatContainer.style.gap = '6px';
  inputBar.style.display = 'block';
  navTitle.textContent = headerHtml;
  navRight.textContent = `#${assignedId}`;

  navActions.style.display = 'flex';
  updateBlockBtn(userId);

  userListPanel.classList.add('hidden');
  userListPanel.classList.remove('sidebar-open');
  sidebarOverlay.classList.remove('open');
  hamburgerBtn.classList.remove('active');
  chatPanel.classList.add('show');
  backBtn.classList.add('show');

  renderUserList(searchInput.value);

  subscribeMessages(userId);
  adminTextInput.focus();
}

function updateBlockBtn(userId) {
  const user = users.find(u => u.id === userId);
  if (user?.blocked) {
    blockBtn.textContent = 'Unblock';
    blockBtn.classList.remove('danger');
  } else {
    blockBtn.textContent = 'Block';
    blockBtn.classList.add('danger');
  }
}

// ====================== SUBSCRIBE MESSAGES ======================
function subscribeMessages(userId) {
  if (unsubMsgs) unsubMsgs();

  adminChatContainer.innerHTML = '<div class="chat-empty">Loading messages...</div>';

  unsubMsgs = fdb.collection('chatMessages')
    .doc(userId)
    .collection('messages')
    .orderBy('timestamp', 'asc')
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(function(change) {
        var data = change.doc.data();
        var docId = change.doc.id;
        var existing = adminChatContainer.querySelector('.message[data-doc-id="' + docId + '"]');

        // Handle deletion
        if (data.deleted) {
          if (existing) existing.remove();
          checkChatEmpty();
          return;
        }

        if (change.type === 'added' && !existing) {
          addMessageToUI({ id: docId, ...data }, true);
        } else if (change.type === 'modified' && existing) {
          updateMessageInUI(existing, { id: docId, ...data });
        }
      });

      checkChatEmpty();
      scrollChatToBottom();
    }, (err) => {
      console.error('Messages error:', err);
      adminChatContainer.innerHTML = '<div class="chat-empty">Error loading messages</div>';
    });
}

function checkChatEmpty() {
  var count = adminChatContainer.querySelectorAll('.message').length;
  if (count === 0) {
    adminChatContainer.innerHTML = '<div class="chat-empty">No messages yet. Send a welcome message!</div>';
  }
}

function addMessageToUI(msg, animate) {
  const div = document.createElement('div');
  const sender = msg.sender === 'user' ? 'user' : 'admin';
  var cls = 'message ' + sender;
  if (msg.isCategoryTag) cls += ' cat-tag';
  if (msg.isAutoReply) cls += ' auto-reply';
  if (editingMessageId === msg.id) cls += ' editing';
  div.className = cls;
  div.dataset.docId = msg.id;
  if (animate) div.classList.add('animate-in');

  const ts = msg.timestamp && msg.timestamp.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now';
  var inner = '';
  if (msg.imageUrl) inner += '<img src="' + msg.imageUrl + '" alt="Image" onclick="window.open(this.src)" loading="lazy">';
  if (msg.text) inner += msg.text;
  inner += '<span class="time">' + ts + '</span>';
  div.innerHTML = inner;

  // Action buttons
  var actDiv = document.createElement('div');
  actDiv.className = 'msg-actions';

  var copyAct = document.createElement('button');
  copyAct.className = 'copy-act'; copyAct.textContent = 'Copy';
  copyAct.onclick = function(e) { e.stopPropagation(); copyMsg(msg.text || ''); };
  actDiv.appendChild(copyAct);

  var delAct = document.createElement('button');
  delAct.className = 'del-act'; delAct.textContent = 'Delete';
  delAct.onclick = function(e) { e.stopPropagation(); deleteMsg(msg.id); };
  actDiv.appendChild(delAct);

  if (msg.sender === 'admin' && !msg.isCategoryTag && !msg.isAutoReply) {
    var editAct = document.createElement('button');
    editAct.className = 'edit-act'; editAct.textContent = 'Edit';
    editAct.onclick = function(e) { e.stopPropagation(); startEdit(msg.id, msg.text || ''); };
    actDiv.appendChild(editAct);
  }

  div.appendChild(actDiv);

  div.onclick = function(e) {
    if (e.target.closest('.msg-actions')) return;
    adminChatContainer.querySelectorAll('.msg-actions.show').forEach(function(el) { el.classList.remove('show'); });
    if (!e.target.closest('.message')) return;
    actDiv.classList.toggle('show');
  };

  adminChatContainer.appendChild(div);
}

function updateMessageInUI(existing, msg) {
  var sender = msg.sender === 'user' ? 'user' : 'admin';
  existing.className = 'message ' + sender;
  if (msg.isCategoryTag) existing.classList.add('cat-tag');
  if (msg.isAutoReply) existing.classList.add('auto-reply');
  if (editingMessageId === msg.id) existing.classList.add('editing');

  const ts = msg.timestamp && msg.timestamp.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now';
  var ic = '';
  if (msg.imageUrl) ic += '<img src="' + msg.imageUrl + '" alt="Image" onclick="window.open(this.src)" loading="lazy">';
  if (msg.text) ic += msg.text;
  ic += '<span class="time">' + ts + '</span>';

  existing.innerHTML = ic;

  // Re-attach action buttons
  var newAct = document.createElement('div');
  newAct.className = 'msg-actions';

  var cp = document.createElement('button');
  cp.className = 'copy-act'; cp.textContent = 'Copy';
  cp.onclick = function(e) { e.stopPropagation(); copyMsg(msg.text || ''); };
  newAct.appendChild(cp);

  var dl = document.createElement('button');
  dl.className = 'del-act'; dl.textContent = 'Delete';
  dl.onclick = function(e) { e.stopPropagation(); deleteMsg(msg.id); };
  newAct.appendChild(dl);

  if (msg.sender === 'admin' && !msg.isCategoryTag && !msg.isAutoReply) {
    var ed = document.createElement('button');
    ed.className = 'edit-act'; ed.textContent = 'Edit';
    ed.onclick = function(e) { e.stopPropagation(); startEdit(msg.id, msg.text || ''); };
    newAct.appendChild(ed);
  }

  newAct.onclick = function(e) { e.stopPropagation(); };
  existing.appendChild(newAct);
}

function formatTime(date) {
  try {
    if (!date || !(date instanceof Date)) return '';
    let hours = date.getHours();
    const mins = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${mins} ${ampm}`;
  } catch {
    return '';
  }
}

function scrollChatToBottom() {
  requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// ====================== MESSAGE ACTIONS ======================
function copyMsg(text) {
  if (!text) { showToast('Nothing to copy'); return; }
  navigator.clipboard.writeText(text).then(function() { showToast('Copied!'); }).catch(function() { showToast('Copy failed'); });
}

async function deleteMsg(docId) {
  if (!selectedUserId) return;
  try {
    await fdb.collection('chatMessages').doc(selectedUserId).collection('messages').doc(docId).update({ deleted: true });
  } catch (e) { showToast('Failed to delete'); }
}

function startEdit(docId, text) {
  if (editingMessageId) {
    document.querySelectorAll('.message.editing').forEach(function(el) { el.classList.remove('editing'); });
  }
  editingMessageId = docId;
  editBar.classList.add('active');
  adminTextInput.value = text;
  adminTextInput.focus();
  autoResizeTextarea();
  updateAdminSendButton();
  var msgEl = adminChatContainer.querySelector('.message[data-doc-id="' + docId + '"]');
  if (msgEl) msgEl.classList.add('editing');
}

function cancelEdit() {
  editingMessageId = null;
  editBar.classList.remove('active');
  adminTextInput.value = '';
  adminTextInput.style.height = 'auto';
  adminChatContainer.querySelectorAll('.message.editing').forEach(function(el) { el.classList.remove('editing'); });
  updateAdminSendButton();
}

// ====================== ADMIN SEND ======================
async function adminSendMessage() {
  const text = adminTextInput.value.trim();
  if (!text && !selectedImage) return;
  if (!selectedUserId) return;

  // If editing, update existing message
  if (editingMessageId) {
    try {
      await fdb.collection('chatMessages').doc(selectedUserId).collection('messages').doc(editingMessageId).update({ text });
      adminTextInput.value = '';
      adminTextInput.style.height = 'auto';
      cancelEdit();
      showToast('Message updated');
    } catch (e) {
      showToast('Failed to update');
    }
    return;
  }

  adminSendBtn.disabled = true;

  let imageUrl = null;

  if (selectedImage) {
    try {
      imageUrl = await uploadImageToTelegram(selectedImage);
    } catch (err) {
      console.error('Image upload failed:', err);
      adminSendBtn.disabled = false;
      return;
    }
  }

  const msgData = {
    sender: 'admin',
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    deleted: false
  };

  if (text) msgData.text = text;
  if (imageUrl) msgData.imageUrl = imageUrl;

  try {
    await fdb.collection('chatMessages').doc(selectedUserId).collection('messages').add(msgData);

    await fdb.collection('chatUsers').doc(selectedUserId).update({
      lastMessage: text || '[Image]',
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    });

    adminTextInput.value = '';
    selectedImage = null;
    imagePreview.classList.remove('active');
    adminSendBtn.disabled = true;
    autoResizeTextarea();

    // Forward admin reply to Telegram
    try {
      const userSnap = await fdb.collection('chatUsers').doc(selectedUserId).get();
      const userData = userSnap.data();
      if (userData) {
        var tgText = '\uD83D\uDC4B ' + getUE(selectedUserAssignedId) + ' <b>User ' + selectedUserAssignedId + ':</b>\n';
        tgText += '\uD83D\uDCAC <b>Admin:</b> ' + (text || '');
        await sendTelegramText(tgText, userData.telegramThreadId || null);
      }
    } catch (tgErr) {
      console.error('Telegram forward error:', tgErr);
    }
  } catch (err) {
    console.error('Send failed:', err);
    adminSendBtn.disabled = false;
  }
}

// ====================== BLOCK / DELETE USER ======================
async function toggleBlockUser() {
  if (!selectedUserId) return;
  try {
    const doc = await fdb.collection('chatUsers').doc(selectedUserId).get();
    if (!doc.exists) return;
    const currentlyBlocked = doc.data().blocked || false;
    await fdb.collection('chatUsers').doc(selectedUserId).update({ blocked: !currentlyBlocked });
    showToast(currentlyBlocked ? 'User unblocked' : 'User blocked');
  } catch (err) {
    console.error('Block failed:', err);
  }
}

async function deleteUser() {
  if (!selectedUserId) return;
  const user = users.find(u => u.id === selectedUserId);
  const assignedId = user?.assignedId || '?';
  if (!confirm(getUE(assignedId) + ' Delete User ' + assignedId + ' and ALL their messages permanently?')) return;

  try {
    // Delete all messages in subcollection
    const msgSnap = await fdb.collection('chatMessages').doc(selectedUserId).collection('messages').get();
    const batch = fdb.batch();
    msgSnap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    // Delete user document
    await fdb.collection('chatUsers').doc(selectedUserId).delete();
    // Delete chatMessages document
    await fdb.collection('chatMessages').doc(selectedUserId).delete();

    backBtn.click();
    showToast('User deleted permanently');
  } catch (err) {
    console.error('Delete failed:', err);
    showToast('Failed to delete user');
  }
}

// ====================== UI EVENTS ======================
searchInput.addEventListener('input', () => {
  renderUserList(searchInput.value);
});

function updateAdminSendButton() {
  const hasText = adminTextInput.value.trim().length > 0;
  const hasImage = selectedImage !== null;
  adminSendBtn.disabled = !(hasText || hasImage);
}

adminTextInput.addEventListener('input', () => {
  updateAdminSendButton();
  autoResizeTextarea();
});

function autoResizeTextarea() {
  adminTextInput.style.height = 'auto';
  adminTextInput.style.height = Math.min(adminTextInput.scrollHeight, 100) + 'px';
}

adminTextInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (adminTextInput.value.trim() || selectedImage) {
      adminSendMessage();
    }
  }
});

adminSendBtn.addEventListener('click', adminSendMessage);

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

  selectedImage = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    imagePreview.classList.add('active');
    updateAdminSendButton();
  };
  reader.readAsDataURL(file);
  fileInput.value = '';
});

removeImg.addEventListener('click', () => {
  selectedImage = null;
  imagePreview.classList.remove('active');
  updateAdminSendButton();
});

blockBtn.addEventListener('click', toggleBlockUser);
deleteBtn.addEventListener('click', deleteUser);
cancelEditBtn.addEventListener('click', cancelEdit);

backBtn.addEventListener('click', () => {
  if (editingMessageId) cancelEdit();
  userListPanel.classList.remove('hidden');
  userListPanel.classList.remove('sidebar-open');
  sidebarOverlay.classList.remove('open');
  hamburgerBtn.classList.remove('active');
  chatPanel.classList.remove('show');
  backBtn.classList.remove('show');
  navTitle.textContent = 'Users';
  navRight.textContent = '';
  navActions.style.display = 'none';
  selectedUserId = null;
  selectedImage = null;
  imagePreview.classList.remove('active');
  adminTextInput.value = '';
  adminSendBtn.disabled = true;
  autoResizeTextarea();
  if (unsubMsgs) unsubMsgs();
  renderUserList(searchInput.value);
});

// Hide message actions when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.message')) {
    document.querySelectorAll('.msg-actions.show').forEach(function(el) { el.classList.remove('show'); });
  }
});

function showToast(msg) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ====================== INIT ======================
subscribeUsers();
