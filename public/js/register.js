/* Registration Page Logic */
(function () {
  const form         = document.getElementById('registerForm');
  const alertBox     = document.getElementById('alertBox');
  const alertMsg     = document.getElementById('alertMsg');
  const alertIcon    = document.getElementById('alertIcon');
  const registerBtn  = document.getElementById('registerBtn');
  const spinner      = document.getElementById('registerSpinner');
  const btnText      = document.getElementById('registerBtnText');
  const togglePwd    = document.getElementById('togglePassword');
  const pwdInput     = document.getElementById('password');
  const confirmInput = document.getElementById('confirmPassword');
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');
  const matchHint    = document.getElementById('matchHint');
  const usernameHint = document.getElementById('usernameHint');

  // ── Toggle password visibility ──
  togglePwd.addEventListener('click', () => {
    const visible = pwdInput.type === 'text';
    pwdInput.type = visible ? 'password' : 'text';
    togglePwd.textContent = visible ? '👁️' : '🙈';
  });

  // ── Alert helpers ──
  function showAlert(msg, type = 'error') {
    alertBox.className = `alert alert-${type} show`;
    alertIcon.textContent = type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    alertMsg.textContent = msg;
  }

  function hideAlert() { alertBox.className = 'alert'; }

  function setLoading(loading) {
    registerBtn.disabled = loading;
    spinner.style.display = loading ? 'block' : 'none';
    btnText.textContent = loading ? 'Creating account...' : '🛡️ Create Secure Account';
  }

  // ── Password Strength Calculator ──
  function getPasswordStrength(password) {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      longLength: password.length >= 12,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      noCommon: !['password', '123456', 'qwerty', 'letmein', 'welcome'].some(c =>
        password.toLowerCase().includes(c)),
    };

    if (checks.length)     score += 1;
    if (checks.longLength) score += 1;
    if (checks.upper)      score += 1;
    if (checks.lower)      score += 1;
    if (checks.number)     score += 1;
    if (checks.special)    score += 2;
    if (checks.noCommon)   score += 1;

    return Math.min(score, 7);
  }

  function updateStrength(password) {
    if (!password) {
      strengthFill.style.width = '0%';
      strengthText.textContent = 'Enter a password to see strength';
      strengthText.style.color = 'var(--text-muted)';
      return;
    }

    const score = getPasswordStrength(password);
    const pct = (score / 7) * 100;
    strengthFill.style.width = `${pct}%`;

    const levels = [
      { max: 2, label: 'Very Weak', color: '#ff4466' },
      { max: 3, label: 'Weak',      color: '#ff8833' },
      { max: 4, label: 'Fair',      color: '#fbbf24' },
      { max: 5, label: 'Good',      color: '#66ccff' },
      { max: 6, label: 'Strong',    color: '#00cc88' },
      { max: 7, label: 'Very Strong 🔒', color: '#00ff88' },
    ];

    const level = levels.find(l => score <= l.max) || levels[levels.length - 1];
    strengthFill.style.background = level.color;
    strengthText.textContent = level.label;
    strengthText.style.color = level.color;
  }

  // ── Validate confirm match ──
  function checkMatch() {
    const pwd = pwdInput.value;
    const conf = confirmInput.value;
    if (!conf) { matchHint.textContent = ''; return; }
    if (pwd === conf) {
      matchHint.textContent = '✅ Passwords match';
      matchHint.style.color = 'var(--green)';
    } else {
      matchHint.textContent = '❌ Passwords do not match';
      matchHint.style.color = 'var(--red)';
    }
  }

  // ── Username hint ──
  document.getElementById('username').addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.length < 3) {
      usernameHint.textContent = 'Min. 3 characters';
      usernameHint.style.color = 'var(--text-muted)';
    } else if (!/^[a-zA-Z0-9_]+$/.test(val)) {
      usernameHint.textContent = '⚠️ Only letters, numbers, and underscores allowed';
      usernameHint.style.color = 'var(--yellow)';
    } else {
      usernameHint.textContent = '✅ Looks good';
      usernameHint.style.color = 'var(--green)';
    }
  });

  pwdInput.addEventListener('input', () => {
    updateStrength(pwdInput.value);
    checkMatch();
  });

  confirmInput.addEventListener('input', checkMatch);

  // ── Form Submit ──
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const username        = document.getElementById('username').value.trim();
    const email           = document.getElementById('email').value.trim();
    const password        = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Client-side validation
    if (!username || !email || !password || !confirmPassword) {
      showAlert('Please fill in all fields.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Passwords do not match.', 'error');
      return;
    }

    if (getPasswordStrength(password) < 3) {
      showAlert('Please choose a stronger password.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (data.success) {
        showAlert('Account created! Redirecting to login...', 'success');
        setTimeout(() => { window.location.href = '/'; }, 1500);
      } else if (res.status === 429) {
        showAlert('Too many registration attempts. Please wait an hour.', 'warning');
        setLoading(false);
      } else if (data.errors && data.errors.length > 0) {
        showAlert(data.errors.map(e => e.msg).join(' · '), 'error');
        setLoading(false);
      } else {
        showAlert(data.message || 'Registration failed. Please try again.', 'error');
        setLoading(false);
      }
    } catch (err) {
      showAlert('Connection error. Please try again.', 'error');
      setLoading(false);
    }
  });
})();
