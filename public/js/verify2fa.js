/* 2FA Verify Page Logic */
(function () {
  const alertBox  = document.getElementById('alertBox');
  const alertMsg  = document.getElementById('alertMsg');
  const alertIcon = document.getElementById('alertIcon');
  const verifyBtn = document.getElementById('verifyBtn');
  const spinner   = document.getElementById('verifySpinner');
  const btnText   = document.getElementById('verifyBtnText');
  const timerEl   = document.getElementById('timer');
  const timerBar  = document.getElementById('timerBar');

  function showAlert(msg, type = 'error') {
    alertBox.className = `alert alert-${type} show`;
    alertIcon.textContent = type === 'error' ? '⚠️' : '✅';
    alertMsg.textContent = msg;
  }

  // ── TOTP 30-second countdown timer ──
  function startTimer() {
    function tick() {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      timerEl.textContent = `${remaining}s`;
      timerBar.style.width = `${(remaining / 30) * 100}%`;
      timerBar.style.background = remaining <= 10 ? 'var(--red)' : 'var(--cyan)';
    }
    tick();
    setInterval(tick, 1000);
  }

  startTimer();

  // ── OTP Inputs ──
  const inputs = document.querySelectorAll('.otp-digit');

  inputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val;
      if (val) {
        input.classList.add('filled');
        if (idx < inputs.length - 1) inputs[idx + 1].focus();
      } else {
        input.classList.remove('filled');
      }
      const code = [...inputs].map(i => i.value).join('');
      verifyBtn.disabled = code.length < 6;
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        inputs[idx - 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      [...inputs].forEach((inp, i) => {
        inp.value = paste[i] || '';
        inp.classList.toggle('filled', !!inp.value);
      });
      verifyBtn.disabled = paste.length < 6;
      if (paste.length >= 6) inputs[5].focus();
    });
  });

  // Focus first input on load
  inputs[0].focus();

  // ── Verify ──
  verifyBtn.addEventListener('click', async () => {
    const token = [...inputs].map(i => i.value).join('');

    verifyBtn.disabled = true;
    spinner.style.display = 'block';
    btnText.textContent = 'Verifying...';

    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (data.success) {
        showAlert('Verification successful! Redirecting...', 'success');
        setTimeout(() => { window.location.href = data.redirect || '/dashboard'; }, 800);
      } else {
        showAlert(data.message || 'Invalid OTP. Please try again.', 'error');
        [...inputs].forEach(i => { i.value = ''; i.classList.remove('filled'); });
        inputs[0].focus();
        verifyBtn.disabled = false;
      }
    } catch (err) {
      showAlert('Network error. Please try again.', 'error');
      verifyBtn.disabled = false;
    } finally {
      spinner.style.display = 'none';
      btnText.textContent = '→ Verify & Login';
    }
  });
})();
