const BACKEND_URL = 'https://test-project-qhbf.onrender.com';
const API = BACKEND_URL + '/api';
let token = localStorage.getItem('token');
let currentUser = null;
let selectedUserId = null;
let socket = null;

const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const authTitle = document.getElementById('auth-title');
const authBtn = document.getElementById('auth-btn');
const authError = document.getElementById('auth-error');
const switchAuth = document.getElementById('switch-auth');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const userList = document.getElementById('user-list');
const messagesDiv = document.getElementById('messages');
const chatHeader = document.getElementById('chat-header');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const logoutBtn = document.getElementById('logout-btn');

let isLogin = true;

if (token) {
  initChat();
}

switchAuth.addEventListener('click', () => {
  isLogin = !isLogin;
  authTitle.textContent = isLogin ? 'Login' : 'Sign Up';
  authBtn.textContent = isLogin ? 'Login' : 'Sign Up';
  switchAuth.textContent = isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login';
  authError.textContent = '';
});

authBtn.addEventListener('click', async () => {
  const username = authUsername.value.trim();
  const password = authPassword.value.trim();
  if (!username || !password) {
    authError.textContent = 'Please fill all fields';
    return;
  }

  const endpoint = isLogin ? '/login' : '/signup';
  try {
    const res = await fetch(API + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      authError.textContent = data.error;
      return;
    }
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    initChat();
  } catch (err) {
    authError.textContent = 'Connection error';
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  if (socket) socket.disconnect();
  token = null;
  currentUser = null;
  chatScreen.style.display = 'none';
  authScreen.style.display = 'block';
  authUsername.value = '';
  authPassword.value = '';
});

function initChat() {
  authScreen.style.display = 'none';
  chatScreen.style.display = 'flex';
  currentUser = parseToken(token);
  connectSocket();
  loadUsers();
}

function parseToken(token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return { id: payload.id, username: payload.username };
}

function connectSocket() {
  socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    socket.emit('login', token);
  });

  socket.on('private-message', (msg) => {
    const isForCurrentChat = selectedUserId && (msg.sender_id === selectedUserId || msg.receiver_id === selectedUserId);
    const isForMe = msg.receiver_id === currentUser.id;
    if (isForCurrentChat) {
      appendMessage(msg);
    }
    if (isForMe && !isForCurrentChat) {
      const senderEl = document.querySelector(`.user-item[data-user-id="${msg.sender_id}"]`);
      if (senderEl) senderEl.style.fontWeight = 'bold';
    }
  });

  socket.on('online-users', (onlineIds) => {
    document.querySelectorAll('.user-item').forEach(el => {
      const id = parseInt(el.dataset.userId);
      const status = el.querySelector('.user-status');
      status.className = 'user-status ' + (onlineIds.includes(id) ? 'online' : 'offline');
    });
  });
}

async function loadUsers() {
  const res = await fetch(API + '/users', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const users = await res.json();
  userList.innerHTML = '';
  users.forEach(user => {
    const div = document.createElement('div');
    div.className = 'user-item';
    div.dataset.userId = user.id;
    div.innerHTML = `<span class="user-status offline"></span><span>${user.username}</span>`;
    div.addEventListener('click', () => selectUser(user));
    userList.appendChild(div);
  });
}

async function selectUser(user) {
  selectedUserId = user.id;
  document.querySelectorAll('.user-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.user-item[data-user-id="${user.id}"]`)?.classList.add('active');
  chatHeader.querySelector('h3').textContent = `Chat with ${user.username}`;
  messagesDiv.innerHTML = '';

  const res = await fetch(API + '/messages/' + user.id, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const messages = await res.json();
  messages.forEach(m => appendMessage(m));
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function appendMessage(msg) {
  const div = document.createElement('div');
  const isSent = msg.sender_id === currentUser.id;
  div.className = 'message ' + (isSent ? 'sent' : 'received');
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  div.innerHTML = `${msg.message}<span class="msg-time">${time}</span>`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const message = messageInput.value.trim();
  if (!message || !selectedUserId) return;

  socket.emit('private-message', { receiverId: selectedUserId, message });
  messageInput.value = '';
}
