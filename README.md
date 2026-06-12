<<<<<<< HEAD
# 🔐 Secure Login System

A full-stack cybersecurity-focused authentication system built with **Node.js** and **Express**. It features bcrypt password hashing, server-side session management, Two-Factor Authentication (TOTP / 2FA), rate limiting, and security headers — all running with **zero native dependencies** (no C++ compilation required).

---

## ✨ Features

| Feature | Description |
|---|---|
| **bcrypt Password Hashing** | Passwords hashed with `bcryptjs` (cost factor 12) — no plaintext storage |
| **Two-Factor Authentication** | TOTP-based 2FA via `speakeasy` with QR code setup using `qrcode` |
| **Session Management** | Secure server-side sessions stored as files with configurable TTL |
| **Rate Limiting** | Brute-force protection on login (5/15 min), registration (3/hr), and 2FA (10/5 min) |
| **Security Headers** | HTTP hardening via `helmet` with strict Content-Security-Policy |
| **Input Validation** | Server-side validation and sanitisation with `express-validator` |
| **Login Audit Logs** | Tracks login attempts (success/failure) with IP address and timestamp |
| **Session Fixation Protection** | Sessions are regenerated on login and 2FA verification |
| **Zero Native Deps** | Runs on any OS — no `node-gyp`, Python, or C++ build tools needed |

---

## 📁 Project Structure

```
Secure login system/
├── server.js                  # Express app entry point
├── .env                       # Environment variables (port, session secret, TTL)
├── package.json
│
├── database/
│   ├── db.js                  # JSON file-based database module
│   └── data.json              # User & login log storage (auto-created)
│
├── middleware/
│   ├── auth.js                # isAuthenticated & requires2FA middleware
│   └── rateLimiter.js         # Rate limiters for login, register, 2FA
│
├── routes/
│   ├── auth.js                # Auth API routes (register, login, logout, 2FA)
│   └── dashboard.js           # Dashboard API routes
│
├── public/                    # Static front-end files
│   ├── index.html             # Login page
│   ├── register.html          # Registration page
│   ├── dashboard.html         # User dashboard (protected)
│   ├── setup-2fa.html         # 2FA setup page (protected)
│   ├── verify-2fa.html        # 2FA verification during login
│   ├── css/                   # Stylesheets
│   └── js/                    # Client-side JavaScript
│
└── sessions/                  # Server-side session files (auto-created)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v16 or later — [Download here](https://nodejs.org/)
- **npm** (comes bundled with Node.js)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd "Secure login system"
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages. No native compilation is needed — everything is pure JavaScript.

### 3. Configure Environment Variables

The project includes a `.env` file with sensible defaults. You can modify it as needed:

```env
PORT=3000
SESSION_SECRET=<your-random-secret-string>
SESSION_MAX_AGE=1800000
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port the server listens on | `3000` |
| `SESSION_SECRET` | Secret key used to sign session cookies (change this!) | Pre-set random string |
| `SESSION_MAX_AGE` | Session lifetime in milliseconds (1800000 = 30 minutes) | `1800000` |

> ⚠️ **Important:** For production use, replace the `SESSION_SECRET` with a strong, unique random string.

### 4. Start the Server

```bash
npm start
```

Or equivalently:

```bash
node server.js
```

You should see output like:

```
🔐 Secure Login System running at http://localhost:3000
   Session timeout : 30 minutes
   Database        : JSON file store (database/data.json)
   Sessions        : File store (sessions/)
```

### 5. Open in Browser

Navigate to **[http://localhost:3000](http://localhost:3000)** to access the login page.

---

## 🧭 Usage Walkthrough

1. **Register** — Go to `/register` and create an account. Passwords must meet complexity requirements (8+ characters, uppercase, lowercase, number, special character).
2. **Login** — Use your credentials at the login page (`/`).
3. **Dashboard** — After login, you'll be redirected to `/dashboard` with your session info.
4. **Enable 2FA** — From the dashboard, navigate to `/setup-2fa`. Scan the QR code with an authenticator app (e.g., Google Authenticator, Authy) and enter the OTP to confirm.
5. **Login with 2FA** — On subsequent logins, you'll be prompted for a TOTP code at `/verify-2fa` after entering your password.

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description | Rate Limit |
|---|---|---|---|
| `POST` | `/api/auth/register` | Create a new account | 3 per hour |
| `POST` | `/api/auth/login` | Log in with username & password | 5 per 15 min |
| `POST` | `/api/auth/logout` | Destroy session and log out | — |
| `GET`  | `/api/auth/me` | Get current user info | Auth required |

### Two-Factor Authentication

| Method | Endpoint | Description | Rate Limit |
|---|---|---|---|
| `GET`  | `/api/auth/setup-2fa` | Generate TOTP secret & QR code | Auth required |
| `POST` | `/api/auth/enable-2fa` | Verify OTP and enable 2FA | 10 per 5 min |
| `POST` | `/api/auth/disable-2fa` | Disable 2FA for the account | Auth required |
| `POST` | `/api/auth/verify-2fa` | Verify TOTP during login | 10 per 5 min |

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/api/dashboard` | Dashboard data | Auth required |

---

## 🔒 Security Features Explained

- **Password Hashing:** Uses `bcryptjs` with a salt cost factor of 12. Plaintext passwords are never stored.
- **Timing-Safe Login:** On failed login with a non-existent username, bcrypt still runs to prevent [timing-based username enumeration](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
- **Session Fixation Protection:** `req.session.regenerate()` is called after successful login and 2FA verification.
- **HTTP-Only Cookies:** Session cookies have `httpOnly: true`, preventing client-side JavaScript from accessing them (XSS mitigation).
- **SameSite Cookies:** Set to `strict` to prevent CSRF attacks.
- **Helmet Headers:** Adds `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, and a strict `Content-Security-Policy`.
- **Rate Limiting:** Protects login, registration, and 2FA endpoints from brute-force attacks.
- **Input Validation:** All user inputs are validated and sanitised server-side with `express-validator`.

---
## 📱 Recommended Authenticator Apps

To use the Two-Factor Authentication (2FA) feature, you need an authenticator app installed on your smartphone or device. Here are some popular, secure recommendations:

### 1. Google Authenticator
*   **Android:** [Google Play Store](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)
*   **iOS:** [Apple App Store](https://apps.apple.com/app/google-authenticator/id388497605)

### 2. Microsoft Authenticator
*   **Android:** [Google Play Store](https://play.google.com/store/apps/details?id=com.azure.authenticator)
*   **iOS:** [Apple App Store](https://apps.apple.com/app/microsoft-authenticator/id983156458)

### 3. Aegis Authenticator (Open Source & Android only)
*   **Android:** [Google Play Store](https://play.google.com/store/apps/details?id=com.beemdevelopment.aegis) / [F-Droid](https://f-droid.org/packages/com.beemdevelopment.aegis/)

### 4. Ente Auth (Open Source & Cross-platform)
*   **Android:** [Google Play Store](https://play.google.com/store/apps/details?id=io.ente.auth)
*   **iOS:** [Apple App Store](https://apps.apple.com/app/ente-auth/id6444121398)

---

## 📝 License

This project is for educational and demonstration purposes.

=======
# Secure-Login-System
🔐 Secure Login System is a robust, full-stack authentication web application built using Node.js and Express, designed with a strong focus on modern cybersecurity best practices. Running with zero native dependencies for easy cross-platform deployment, it implements a highly secure user lifecycle.
>>>>>>> d88c0a0f3891b15e6839e26cb3fe411b283f3937
