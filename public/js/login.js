/* Login Page Logic */
(function () {
  const form       = document.getElementById('loginForm');
  const alertBox   = document.getElementById('alertBox');
  const alertMsg   = document.getElementById('alertMsg');
  const loginBtn   = document.getElementById('loginBtn');
  const spinner    = document.getElementById('loginSpinner');
  const btnText    = document.getElementById('loginBtnText');
  const togglePwd  = document.getElementById('togglePassword');
  const pwdInput   = document.getElementById('password');

  // ── Toggle password visibility ──
  togglePwd.addEventListener('click', () => {
    const visible = pwdInput.type === 'text';
    pwdInput.type = visible ? 'password' : 'text';
    togglePwd.textContent = visible ? '👁️' : '🙈';
  });

  // ── Show alert helper ──
  function showAlert(msg, type = 'error') {
    alertBox.className = `alert alert-${type} show`;
    alertMsg.textContent = msg;
  }

  function hideAlert() {
    alertBox.className = 'alert';
  }

  function setLoading(loading) {
    loginBtn.disabled = loading;
    spinner.style.display = loading ? 'block' : 'none';
    btnText.textContent = loading ? 'Signing in...' : 'Sign In';
  }

  // ── Form Submit ──
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showAlert('Please fill in all fields.', 'error');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        showAlert('Login successful! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = data.redirect || '/dashboard';
        }, 600);
      } else {
        // Check for rate limit
        if (res.status === 429) {
          showAlert('⛔ Too many login attempts. Please wait 15 minutes.', 'warning');
        } else if (data.requires2FA) {
          window.location.href = data.redirect || '/verify-2fa';
        } else {
          showAlert(data.message || 'Invalid credentials. Please try again.', 'error');
        }
        setLoading(false);
      }
    } catch (err) {
      showAlert('Connection error. Please try again.', 'error');
      setLoading(false);
    }
  });

  // ── Redirect if already logged in ──
  (async function checkSession() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) window.location.href = '/dashboard';
    } catch (_) {}
  })();
})();
