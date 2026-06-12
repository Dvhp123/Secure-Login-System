/**
 * database/db.js — Pure JavaScript JSON file-based database
 * No native compilation required. Stores users & login logs in data.json
 */
const fs   = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

// ── Internal state ──
let _data = null;

function _load() {
  if (_data) return _data;
  if (!fs.existsSync(DB_FILE)) {
    _data = { users: [], loginLogs: [] };
    _save();
  } else {
    try {
      _data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (!_data.users)     _data.users     = [];
      if (!_data.loginLogs) _data.loginLogs = [];
    } catch {
      _data = { users: [], loginLogs: [] };
    }
  }
  return _data;
}

function _save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(_data, null, 2), 'utf8');
}

function initDB() {
  _load();
  console.log('✅ Database initialized (JSON file store)');
}

// ── User helpers ──
function findUserByUsername(username) {
  const data = _load();
  return data.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

function findUserByEmail(email) {
  const data = _load();
  return data.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function findUserById(id) {
  const data = _load();
  return data.users.find(u => u.id === id) || null;
}

function findUserByUsernameOrEmail(username, email) {
  const data = _load();
  return data.users.find(u =>
    u.username.toLowerCase() === username.toLowerCase() ||
    u.email.toLowerCase() === email.toLowerCase()
  ) || null;
}

function createUser({ username, email, passwordHash }) {
  const data = _load();
  const id   = Date.now(); // simple unique integer id
  const user = {
    id,
    username,
    email,
    password_hash: passwordHash,
    two_fa_secret:  null,
    two_fa_enabled: false,
    created_at:     new Date().toISOString(),
    last_login:     null,
  };
  data.users.push(user);
  _save();
  return { lastInsertRowid: id };
}

function updateUserLastLogin(id) {
  const data = _load();
  const user = data.users.find(u => u.id === id);
  if (user) {
    user.last_login = new Date().toISOString();
    _save();
  }
}

function enable2FA(id, secret) {
  const data = _load();
  const user = data.users.find(u => u.id === id);
  if (user) {
    user.two_fa_secret  = secret;
    user.two_fa_enabled = true;
    _save();
  }
}

function disable2FA(id) {
  const data = _load();
  const user = data.users.find(u => u.id === id);
  if (user) {
    user.two_fa_secret  = null;
    user.two_fa_enabled = false;
    _save();
  }
}

// ── Login log helpers ──
function addLoginLog({ username, ip, success }) {
  const data = _load();
  data.loginLogs.push({
    id:           Date.now() + Math.random(),
    username,
    ip_address:   ip,
    success:      success ? 1 : 0,
    attempted_at: new Date().toISOString(),
  });
  // Keep only last 500 entries to avoid file bloat
  if (data.loginLogs.length > 500) {
    data.loginLogs = data.loginLogs.slice(-500);
  }
  _save();
}

function getLoginLogs(username, limit = 10) {
  const data = _load();
  return data.loginLogs
    .filter(l => l.username === username)
    .slice(-limit)
    .reverse();
}

function countLoginLogs(username, successVal) {
  const data = _load();
  return data.loginLogs.filter(l =>
    l.username === username && l.success === successVal
  ).length;
}

module.exports = {
  initDB,
  findUserByUsername,
  findUserByEmail,
  findUserById,
  findUserByUsernameOrEmail,
  createUser,
  updateUserLastLogin,
  enable2FA,
  disable2FA,
  addLoginLog,
  getLoginLogs,
  countLoginLogs,
};
