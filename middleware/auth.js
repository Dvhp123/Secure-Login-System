/**
 * Authentication middleware — protects routes requiring a valid session.
 * Redirects API calls with 401 JSON, page requests with redirect to login.
 */
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
  }

  return res.redirect('/');
}

/**
 * Middleware — requires 2FA verification to be complete for this session.
 */
function requires2FA(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }
  if (req.session.requires2FA && !req.session.twoFAVerified) {
    return res.status(403).json({ success: false, message: '2FA verification required.', redirect: '/verify-2fa' });
  }
  next();
}

module.exports = { isAuthenticated, requires2FA };
