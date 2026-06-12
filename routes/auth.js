const express          = require('express');
const bcrypt           = require('bcryptjs');          // Pure JS — no native compilation
const speakeasy        = require('speakeasy');
const QRCode           = require('qrcode');
const { body, validationResult } = require('express-validator');
const db               = require('../database/db');
const { loginLimiter, registerLimiter, twoFALimiter } = require('../middleware/rateLimiter');
const { isAuthenticated } = require('../middleware/auth');

const router      = express.Router();
const SALT_ROUNDS = 12;

// ─────────────────────────────────────────────
// Validation Rules
// ─────────────────────────────────────────────
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3–30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Password must contain at least one special character'),
];

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required').escape(),
  body('password').notEmpty().withMessage('Password is required'),
];

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post('/register', registerLimiter, registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { username, email, password } = req.body;

  try {
    // Check for existing username or email
    const existing = db.findUserByUsernameOrEmail(username, email);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Username or email already in use.',
      });
    }

    // Hash password with bcryptjs (cost factor 12)
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = db.createUser({ username, email, passwordHash });
    console.log(`[REGISTER] New user: ${username} (ID: ${result.lastInsertRowid})`);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Please log in.',
    });
  } catch (err) {
    console.error('[REGISTER ERROR]', err.message);
    return res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { username, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  try {
    const user = db.findUserByUsername(username);

    if (!user) {
      // Timing-safe: run bcrypt anyway to prevent username enumeration via timing
      await bcrypt.hash(password, SALT_ROUNDS);
      db.addLoginLog({ username, ip, success: false });
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    // Constant-time password comparison
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      db.addLoginLog({ username, ip, success: false });
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    db.addLoginLog({ username, ip, success: true });
    db.updateUserLastLogin(user.id);

    // If 2FA enabled → require TOTP before granting full session
    if (user.two_fa_enabled) {
      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ success: false, message: 'Session error.' });
        req.session.pendingUserId   = user.id;
        req.session.pendingUsername = user.username;
        res.json({ success: true, requires2FA: true, redirect: '/verify-2fa' });
      });
      return;
    }

    // Regenerate session to prevent session fixation attack
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ success: false, message: 'Session error.' });
      req.session.userId    = user.id;
      req.session.username  = user.username;
      req.session.loginTime = new Date().toISOString();
      console.log(`[LOGIN] ${username} from ${ip}`);
      res.json({ success: true, redirect: '/dashboard' });
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const username = req.session.username || 'Unknown';
  req.session.destroy((err) => {
    if (err) {
      console.error('[LOGOUT ERROR]', err);
      return res.status(500).json({ success: false, message: 'Logout failed.' });
    }
    res.clearCookie('sls.sid');
    console.log(`[LOGOUT] ${username}`);
    res.json({ success: true, redirect: '/' });
  });
});

// ─────────────────────────────────────────────
// GET /api/auth/setup-2fa — Generate TOTP secret + QR code
// ─────────────────────────────────────────────
router.get('/setup-2fa', isAuthenticated, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name:   `SecureAuth:${req.session.username}`,
      length: 20,
    });

    // Store temporarily in session until user confirms with OTP
    req.session.pending2FASecret = secret.base32;

    const qrDataURL = await QRCode.toDataURL(secret.otpauth_url);

    res.json({ success: true, secret: secret.base32, qrCode: qrDataURL });
  } catch (err) {
    console.error('[2FA SETUP ERROR]', err);
    res.status(500).json({ success: false, message: 'Failed to generate 2FA secret.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/enable-2fa — Verify OTP + save secret to DB
// ─────────────────────────────────────────────
router.post('/enable-2fa', isAuthenticated, twoFALimiter, (req, res) => {
  const { token }  = req.body;
  const secret     = req.session.pending2FASecret;

  if (!secret) {
    return res.status(400).json({ success: false, message: 'No pending 2FA setup. Please start again.' });
  }

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window:   1,           // allow ±1 time step (30s tolerance)
  });

  if (!verified) {
    return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' });
  }

  db.enable2FA(req.session.userId, secret);
  delete req.session.pending2FASecret;
  console.log(`[2FA ENABLED] User ID: ${req.session.userId}`);
  res.json({ success: true, message: '2FA enabled successfully!' });
});

// ─────────────────────────────────────────────
// POST /api/auth/disable-2fa
// ─────────────────────────────────────────────
router.post('/disable-2fa', isAuthenticated, (req, res) => {
  db.disable2FA(req.session.userId);
  res.json({ success: true, message: '2FA disabled.' });
});

// ─────────────────────────────────────────────
// POST /api/auth/verify-2fa — Verify TOTP during login
// ─────────────────────────────────────────────
router.post('/verify-2fa', twoFALimiter, (req, res) => {
  const { token }       = req.body;
  const pendingUserId   = req.session.pendingUserId;

  if (!pendingUserId) {
    return res.status(401).json({ success: false, message: 'No pending login. Please log in again.' });
  }

  const user = db.findUserById(pendingUserId);

  if (!user || !user.two_fa_secret) {
    return res.status(401).json({ success: false, message: 'Invalid session state.' });
  }

  const verified = speakeasy.totp.verify({
    secret:   user.two_fa_secret,
    encoding: 'base32',
    token,
    window:   1,
  });

  if (!verified) {
    return res.status(401).json({ success: false, message: 'Invalid OTP. Please try again.' });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ success: false, message: 'Session error.' });
    req.session.userId    = user.id;
    req.session.username  = user.username;
    req.session.loginTime = new Date().toISOString();
    console.log(`[2FA LOGIN] ${user.username}`);
    res.json({ success: true, redirect: '/dashboard' });
  });
});

// ─────────────────────────────────────────────
// GET /api/auth/me — Current session info
// ─────────────────────────────────────────────
router.get('/me', isAuthenticated, (req, res) => {
  const user = db.findUserById(req.session.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  const { password_hash, two_fa_secret, ...safeUser } = user;
  res.json({ success: true, user: { ...safeUser, loginTime: req.session.loginTime } });
});

module.exports = router;
