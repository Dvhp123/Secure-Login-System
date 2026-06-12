const rateLimit = require('express-rate-limit');

/**
 * Login rate limiter — brute-force protection.
 * Allows max 5 failed login attempts per 15 minutes per IP.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true, // Only count failed attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Account locked for 15 minutes.',
    retryAfter: 15,
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Registration rate limiter — prevent account spam.
 * Allows max 3 registrations per hour per IP.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many accounts created. Please try again after an hour.',
  },
});

/**
 * 2FA rate limiter — prevent OTP brute force.
 */
const twoFALimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many 2FA attempts. Please wait 5 minutes.',
  },
});

module.exports = { loginLimiter, registerLimiter, twoFALimiter };
