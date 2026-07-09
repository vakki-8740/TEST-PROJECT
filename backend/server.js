const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
}

app.post('/api/signup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const existing = db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const result = db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed]);
    const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET);
    res.json({ token, user: { id: result.lastInsertRowid, username } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const user = db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users', authenticateToken, (req, res) => {
  const users = db.query('SELECT id, username FROM users WHERE id != ?', [req.user.id]);
  res.json(users);
});

app.get('/api/messages/:userId', authenticateToken, (req, res) => {
  const messages = db.query(
    `SELECT m.*, u.username as sender_name
     FROM messages m JOIN users u ON m.sender_id = u.id
     WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
     ORDER BY created_at ASC`,
    [req.user.id, req.params.userId, req.params.userId, req.user.id]
  );
  res.json(messages);
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('login', (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.username = decoded.username;
      onlineUsers.set(decoded.id, socket.id);
      io.emit('online-users', Array.from(onlineUsers.keys()));
    } catch (err) {
      socket.disconnect();
    }
  });

  socket.on('private-message', ({ receiverId, message }) => {
    if (!socket.userId) return;

    db.run('INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
      [socket.userId, receiverId, message]);

    const msgData = {
      sender_id: socket.userId,
      sender_name: socket.username,
      receiver_id: receiverId,
      message,
      created_at: new Date().toISOString()
    };

    if (onlineUsers.has(receiverId)) {
      io.to(onlineUsers.get(receiverId)).emit('private-message', msgData);
    }
    socket.emit('private-message', msgData);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('online-users', Array.from(onlineUsers.keys()));
    }
  });
});

const PORT = process.env.PORT || 3000;

db.initDB().then(() => {
  server.listen(PORT, () => {
    console.log('Backend running on port ' + PORT);
  });
});
