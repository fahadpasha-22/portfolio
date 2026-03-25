require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Database
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create messages table
db.query(`
  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).then(() => console.log('✅ Database ready'))
  .catch(err => console.error('DB Error:', err.message));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── CONTACT FORM API ───────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message)
    return res.status(400).json({ error: 'All fields required' });
  try {
    await db.query(
      `INSERT INTO messages (name, email, subject, message) VALUES ($1, $2, $3, $4)`,
      [name, email, subject, message]
    );
    res.json({ success: true, message: 'Message received!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// ─── ADMIN — View all messages ──────────────────────────────────
app.get('/api/messages', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY)
    return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await db.query(`SELECT * FROM messages ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'DB error' });
  }
});

// ─── SERVE FRONTEND ─────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Portfolio running at http://localhost:${PORT}`));
}

module.exports = app;
