const express = require('express');
const db      = require('../database/db');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats — Protected user dashboard data
router.get('/stats', isAuthenticated, (req, res) => {
  try {
    const user = db.findUserById(req.session.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Fetch login history & counts for this user
    const loginHistory     = db.getLoginLogs(user.username, 10);
    const successfulLogins = db.countLoginLogs(user.username, 1);
    const failedLogins     = db.countLoginLogs(user.username, 0);

    // Strip sensitive fields before sending
    const { password_hash, two_fa_secret, ...safeUser } = user;

    res.json({
      success: true,
      user: {
        ...safeUser,
        sessionLoginTime: req.session.loginTime,
      },
      stats: { successfulLogins, failedLogins },
      loginHistory,
    });
  } catch (err) {
    console.error('[DASHBOARD ERROR]', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard data.' });
  }
});

module.exports = router;
