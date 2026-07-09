import os
import socketio
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel

from database import init_db, get_db

JWT_SECRET = os.environ.get('JWT_SECRET', 'supersecretkey123')
JWT_ALGORITHM = 'HS256'

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI()
socket_app = socketio.ASGIApp(sio, app)

@app.on_event('startup')
async def on_startup():
    await init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(status_code=exc.status_code, content={'error': exc.detail})

class AuthRequest(BaseModel):
    username: str
    password: str

online_users = {}

def create_token(user_id: int, username: str) -> str:
    return jwt.encode({'id': user_id, 'username': username}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None

@app.post('/api/signup')
async def signup(req: AuthRequest):
    if not req.username or not req.password:
        raise HTTPException(status_code=400, detail='Username and password required')
    db = await get_db()
    try:
        cursor = await db.execute('SELECT id FROM users WHERE username = ?', (req.username,))
        existing = await cursor.fetchone()
        if existing:
            raise HTTPException(status_code=400, detail='Username already taken')
        hashed = pwd_context.hash(req.password)
        cursor = await db.execute('INSERT INTO users (username, password) VALUES (?, ?)', (req.username, hashed))
        await db.commit()
        user_id = cursor.lastrowid
        token = create_token(user_id, req.username)
        return {'token': token, 'user': {'id': user_id, 'username': req.username}}
    finally:
        await db.close()

@app.post('/api/login')
async def login(req: AuthRequest):
    if not req.username or not req.password:
        raise HTTPException(status_code=400, detail='Username and password required')
    db = await get_db()
    try:
        cursor = await db.execute('SELECT * FROM users WHERE username = ?', (req.username,))
        user = await cursor.fetchone()
        if not user or not pwd_context.verify(req.password, user['password']):
            raise HTTPException(status_code=401, detail='Invalid credentials')
        token = create_token(user['id'], user['username'])
        return {'token': token, 'user': {'id': user['id'], 'username': user['username']}}
    finally:
        await db.close()

@app.get('/api/users')
async def get_users(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Invalid token')
    payload = verify_token(authorization[7:])
    if not payload:
        raise HTTPException(status_code=401, detail='Invalid token')
    db = await get_db()
    try:
        cursor = await db.execute('SELECT id, username FROM users WHERE id != ?', (payload['id'],))
        rows = await cursor.fetchall()
        return [{'id': r['id'], 'username': r['username']} for r in rows]
    finally:
        await db.close()

@app.get('/api/messages/{user_id}')
async def get_messages(user_id: int, authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Invalid token')
    payload = verify_token(authorization[7:])
    if not payload:
        raise HTTPException(status_code=401, detail='Invalid token')
    db = await get_db()
    try:
        cursor = await db.execute('''
            SELECT m.*, u.username as sender_name
            FROM messages m JOIN users u ON m.sender_id = u.id
            WHERE (m.sender_id = ? AND m.receiver_id = ?)
               OR (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.created_at ASC
        ''', (payload['id'], user_id, user_id, payload['id']))
        rows = await cursor.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            if d.get('created_at'):
                d['created_at'] = d['created_at'] + 'Z'
            result.append(d)
        return result
    finally:
        await db.close()

@sio.event
async def connect(sid, environ, auth):
    pass

@sio.event
async def login(sid, token):
    payload = verify_token(token)
    if not payload:
        await sio.disconnect(sid)
        return
    await sio.save_session(sid, {'user_id': payload['id']})
    online_users[payload['id']] = sid
    await sio.emit('online-users', list(online_users.keys()))

@sio.event
async def private_message(sid, data):
    session = await sio.get_session(sid)
    user_id = session.get('user_id')
    if user_id is None:
        return
    receiver_id = data['receiverId']
    message = data['message']
    db = await get_db()
    try:
        now = datetime.now(timezone.utc).isoformat()
        await db.execute('INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
                         (user_id, receiver_id, message))
        await db.commit()
        cursor = await db.execute('SELECT username FROM users WHERE id = ?', (user_id,))
        user = await cursor.fetchone()
        msg_data = {
            'sender_id': user_id,
            'sender_name': user['username'],
            'receiver_id': receiver_id,
            'message': message,
            'created_at': now,
        }
        if receiver_id in online_users:
            await sio.emit('private-message', msg_data, to=online_users[receiver_id])
        await sio.emit('private-message', msg_data, to=sid)
    finally:
        await db.close()

@sio.event
async def disconnect(sid):
    remove_id = None
    for uid, sid_val in online_users.items():
        if sid_val == sid:
            remove_id = uid
            break
    if remove_id:
        del online_users[remove_id]
        await sio.emit('online-users', list(online_users.keys()))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(socket_app, host='0.0.0.0', port=int(os.environ.get('PORT', 8000)))
