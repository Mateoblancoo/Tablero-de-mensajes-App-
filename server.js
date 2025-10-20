const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Initialize DB
const dbPath = path.join(dataDir, 'messages.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  edit_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
`);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helpers
const LIMITS = {
  usernameMin: 2,
  usernameMax: 24,
  titleMin: 1,
  titleMax: 60,
  bodyMin: 1,
  bodyMax: 280,
};

function sanitizeStr(s) {
  if (typeof s !== 'string') return '';
  return s.trim();
}

function validateFields({ username, title, body }) {
  const errors = {};
  const u = sanitizeStr(username);
  const t = sanitizeStr(title);
  const b = sanitizeStr(body);

  if (u.length < LIMITS.usernameMin || u.length > LIMITS.usernameMax) {
    errors.username = `El nombre debe tener entre ${LIMITS.usernameMin} y ${LIMITS.usernameMax} caracteres.`;
  }
  if (t.length < LIMITS.titleMin || t.length > LIMITS.titleMax) {
    errors.title = `El título debe tener entre ${LIMITS.titleMin} y ${LIMITS.titleMax} caracteres.`;
  }
  if (b.length < LIMITS.bodyMin || b.length > LIMITS.bodyMax) {
    errors.body = `El cuerpo debe tener entre ${LIMITS.bodyMin} y ${LIMITS.bodyMax} caracteres.`;
  }
  return { errors, values: { username: u, title: t, body: b } };
}

function nowIso() {
  return new Date().toISOString();
}

// Routes
app.get('/api/messages', (req, res) => {
  const rows = db.prepare(`SELECT id, username, title, body, created_at AS createdAt, updated_at AS updatedAt
                           FROM messages ORDER BY datetime(created_at) DESC, id DESC`).all();
  res.json(rows);
});

app.post('/api/messages', (req, res) => {
  const { errors, values } = validateFields(req.body || {});
  if (Object.keys(errors).length) {
    return res.status(400).json({ errors });
  }
  const editToken = crypto.randomUUID();
  const ts = nowIso();
  const stmt = db.prepare(`INSERT INTO messages(username, title, body, edit_token, created_at, updated_at)
                           VALUES (?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(values.username, values.title, values.body, editToken, ts, ts);
  return res.status(201).json({ id: info.lastInsertRowid, editToken });
});

app.put('/api/messages/:id', (req, res) => {
  const id = Number(req.params.id);
  const editToken = sanitizeStr(req.body?.editToken);
  if (!editToken) return res.status(400).json({ error: 'Falta editToken.' });

  const row = db.prepare(`SELECT id FROM messages WHERE id = ? AND edit_token = ?`).get(id, editToken);
  if (!row) return res.status(403).json({ error: 'No autorizado para editar este mensaje.' });

  const { errors, values } = validateFields(req.body || {});
  if (Object.keys(errors).length) {
    return res.status(400).json({ errors });
  }

  const ts = nowIso();
  db.prepare(`UPDATE messages SET title = ?, body = ?, updated_at = ? WHERE id = ?`).run(values.title, values.body, ts, id);
  return res.json({ ok: true });
});

app.delete('/api/messages/:id', (req, res) => {
  const id = Number(req.params.id);
  const editToken = sanitizeStr(req.body?.editToken);
  if (!editToken) return res.status(400).json({ error: 'Falta editToken.' });

  const row = db.prepare(`SELECT id FROM messages WHERE id = ? AND edit_token = ?`).get(id, editToken);
  if (!row) return res.status(403).json({ error: 'No autorizado para borrar este mensaje.' });

  db.prepare(`DELETE FROM messages WHERE id = ?`).run(id);
  return res.json({ ok: true });
});

// Fallback to SPA (serve index.html for unknown routes under /)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Message Board running on http://localhost:${PORT}`);
});
