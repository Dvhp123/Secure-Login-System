/* Dashboard Logic */
(function () {
  const alertBox   = document.getElementById('alertBox');
  const alertMsg   = document.getElementById('alertMsg');
  const alertIcon  = document.getElementById('alertIcon');

  function showAlert(msg, type = 'error') {
    alertBox.className = `alert alert-${type} show`;
    alertIcon.textContent = type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    alertMsg.textContent = msg;
    setTimeout(() => { alertBox.className = 'alert'; }, 4000);
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Never';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        dateStyle: 'medium', timeStyle: 'short'
      });
    } catch { return dateStr; }
  }

  // ── Load Dashboard Data ──
  async function loadDashboard() {
    try {
      const res = await fetch('/api/dashboard/stats');

      if (res.status === 401) {
        window.location.href = '/';
        return;
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const { user, stats, loginHistory } = data;

      // Header
      document.getElementById('headerUsername').textContent = user.username;
      const avatar = document.getElementById('userAvatar');
      avatar.textContent = user.username.charAt(0).toUpperCase();

      // Stats
      document.getElementById('statSuccess').textContent = stats.successfulLogins;
      document.getElementById('statFailed').textContent  = stats.failedLogins;

      // Session time in minutes
      const loginTime = user.sessionLoginTime ? new Date(user.sessionLoginTime) : null;
      const sessionMins = loginTime
        ? Math.floor((Date.now() - loginTime.getTime()) / 60000)
        : 0;
      document.getElementById('statSession').textContent = sessionMins;

      document.getElementById('stat2FA').textContent = user.two_fa_enabled ? 'ON' : 'OFF';
      document.getElementById('stat2FA').style.color = user.two_fa_enabled
        ? 'var(--green)' : 'var(--red)';

      // Account Details
      document.getElementById('detailUsername').textContent  = user.username;
      document.getElementById('detailEmail').textContent     = user.email;
      document.getElementById('detailCreated').textContent   = formatDate(user.created_at);
      document.getElementById('detailLastLogin').textContent = formatDate(user.last_login);
      document.getElementById('detailSession').textContent   = loginTime
        ? loginTime.toLocaleTimeString() : 'Unknown';

      // 2FA Status
      const twofaStatus  = document.getElementById('twofaStatus');
      const twofaActions = document.getElementById('twofaActions');
      const twofaNote    = document.getElementById('twofaNote');

      if (user.two_fa_enabled) {
        twofaStatus.className = 'twofa-status twofa-enabled';
        twofaStatus.textContent = '✅ Enabled';
        twofaActions.innerHTML = `<button class="btn btn-danger btn-sm" id="disable2FABtn">❌ Disable 2FA</button>`;
        twofaNote.textContent = '2FA is active. Every login requires your authenticator code.';

        document.getElementById('disable2FABtn').addEventListener('click', async () => {
          if (!confirm('Are you sure you want to disable 2FA? This reduces your account security.')) return;
          const r = await fetch('/api/auth/disable-2fa', { method: 'POST' });
          const d = await r.json();
          if (d.success) {
            showAlert('2FA disabled successfully.', 'success');
            loadDashboard();
          } else {
            showAlert(d.message || 'Failed to disable 2FA.', 'error');
          }
        });
      } else {
        twofaStatus.className = 'twofa-status twofa-disabled';
        twofaStatus.textContent = '⭕ Disabled';
        twofaActions.innerHTML = `<button class="btn btn-success btn-sm" id="enable2FABtn">📱 Enable 2FA</button>`;
        document.getElementById('enable2FABtn').addEventListener('click', () => {
          window.location.href = '/setup-2fa';
        });
      }

      // Login History
      const tbody = document.getElementById('historyBody');
      if (loginHistory.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:1rem;">No login history yet.</td></tr>`;
      } else {
        tbody.innerHTML = loginHistory.map(log => {
          const statusClass = log.success ? 'status-success' : 'status-failed';
          const statusLabel = log.success ? 'Success' : 'Failed';
          return `
            <tr>
              <td><span class="status-dot ${statusClass}">${statusLabel}</span></td>
              <td>${log.ip_address || 'Unknown'}</td>
              <td>${formatDate(log.attempted_at)}</td>
            </tr>
          `;
        }).join('');
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      showAlert('Failed to load dashboard data.', 'error');
    }
  }

  // ── Logout ──
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) window.location.href = data.redirect || '/';
    } catch (err) {
      showAlert('Logout failed. Please try again.', 'error');
    }
  });

  // ── Session timer ──
  setInterval(() => {
    const el = document.getElementById('statSession');
    if (el && el.textContent !== '—') {
      el.textContent = parseInt(el.textContent) + 1;
    }
  }, 60000);

  // ── Init ──
  loadDashboard();
})();
