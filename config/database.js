const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'nexus.db');
const db = new Database(dbPath);

console.log('Connected to SQLite database.');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT, -- For admin, hashed. For participants, maybe just auto-login or simple names? User said "Implement user authentication". Assuming password.
    role TEXT DEFAULT 'participant',
    currentLevel INTEGER DEFAULT 0, -- 0: waiting for start, 1: level 1, 2: level 2, 3: escaped
    progress JSON DEFAULT '{}', -- Store level specific data
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS game_state (
    key TEXT PRIMARY KEY,
    value JSON
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    action TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial game state if not exists
const checkState = db.prepare("SELECT * FROM game_state WHERE key = 'status'").get();
if (!checkState) {
  db.prepare("INSERT INTO game_state (key, value) VALUES (?, ?)").run('status', JSON.stringify({ state: 'waiting' }));
}

// Seed admin user if not exists (default: admin/admin123 - in real app would prompt user to change)
const checkAdmin = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!checkAdmin) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run('admin', hash, 'admin');
}

module.exports = db;
