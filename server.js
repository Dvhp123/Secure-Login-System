require('dotenv').config();
const express      = require('express');
const session      = require('express-session');
const helmet       = require('helmet');
const path         = require('path');
const FileStore    = require('session-file-store')(session);

const authRoutes      = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const { initDB }      = require('./database/db');

const app  = express();
const PORT = process.env.PORT || 3000;

// Initialize Database
initDB();

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", "'unsafe-inline'"],
        styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc:    ["'self'", "https://fonts.gstatic.com"],
        imgSrc:     ["'self'", "data:"],
      },
    },
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration — using file-based store (pure JS, no native deps)
app.use(
  session({
    store: new FileStore({
      path:    './sessions',
      ttl:     1800,          // 30 minutes in seconds
      retries: 0,
      logFn:   () => {},      // suppress verbose file-store logs
    }),
    secret:            process.env.SESSION_SECRET,
    resave:            false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,         // JS cannot read cookie — prevents XSS cookie theft
      sameSite: 'strict',     // CSRF protection
      secure:   false,        // Set true in production with HTTPS
      maxAge:   parseInt(process.env.SESSION_MAX_AGE) || 1800000,
    },
    name: 'sls.sid',          // Non-default name avoids fingerprinting
  })
);

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth',      authRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/setup-2fa', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'setup-2fa.html'));
});

app.get('/verify-2fa', (req, res) => {
  if (!req.session.pendingUserId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'verify-2fa.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🔐 Secure Login System running at http://localhost:${PORT}`);
  console.log(`   Session timeout : ${(parseInt(process.env.SESSION_MAX_AGE) || 1800000) / 60000} minutes`);
  console.log(`   Database        : JSON file store (database/data.json)`);
  console.log(`   Sessions        : File store (sessions/)\n`);
});
