/* 2FA Setup Page Logic */
(function () {
  const alertBox  = document.getElementById('alertBox');
  const alertMsg  = document.getElementById('alertMsg');
  const alertIcon = document.getElementById('alertIcon');

  function showAlert(msg, type = 'error') {
    alertBox.className = `alert alert-${type} show`;
    alertIcon.textContent = type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    alertMsg.textContent = msg;
  }

  // ── Steps ──
  function setStep(n) {
    [1,2,3].forEach(i => {
      const el = document.getElementById(`step${i}`);
      el.className = 'step' + (i < n ? ' done' : i === n ? ' active' : '');
    });
  }

  // ── Load QR Code ──
  async function loadQR() {
    try {
      const res = await fetch('/api/auth/setup-2fa');
      if (res.status === 401) { window.location.href = '/'; return; }

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      document.getElementById('qrContainer').innerHTML = `
        <div class="qr-image">
          <img src="${data.qrCode}" alt="2FA QR Code" />
        </div>
      `;
      document.getElementById('secretKey').textContent = data.secret;
      window._pending2FASecret = data.secret;
    } catch (err) {
      showAlert('Failed to generate QR code. Please go back and try again.', 'error');
    }
  }

  loadQR();

  // ── Next button → OTP section ──
  document.getElementById('nextBtn').addEventListener('click', () => {
    document.getElementById('qrSection').style.display = 'none';
    document.getElementById('otpSection').style.display = 'block';
    setStep(2);
    setupOtpInputs();
    document.querySelectorAll('.otp-digit')[0].focus();
  });

  // ── Back button ──
  document.getElementById('backBtn').addEventListener('click', () => {
    document.getElementById('otpSection').style.display = 'none';
    document.getElementById('qrSection').style.display = 'block';
    setStep(1);
  });

  // ── OTP Input handling ──
  function setupOtpInputs() {
    const inputs = document.querySelectorAll('.otp-digit');
    const verifyBtn = document.getElementById('verifyBtn');

    inputs.forEach((input, idx) => {
      input.value = '';
      input.classList.remove('filled');

      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val;

        if (val) {
          input.classList.add('filled');
          if (idx < inputs.length - 1) inputs[idx + 1].focus();
        } else {
          input.classList.remove('filled');
        }

        // Enable verify when all 6 filled
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
  }

  // ── Verify OTP and Enable 2FA ──
  document.getElementById('verifyBtn').addEventListener('click', async () => {
    const inputs = document.querySelectorAll('.otp-digit');
    const token = [...inputs].map(i => i.value).join('');
    const spinner = document.getElementById('verifySpinner');
    const btnText = document.getElementById('verifyBtnText');
    const verifyBtn = document.getElementById('verifyBtn');

    verifyBtn.disabled = true;
    spinner.style.display = 'block';
    btnText.textContent = 'Verifying...';

    try {
      const res = await fetch('/api/auth/enable-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (data.success) {
        setStep(3);
        showAlert('🎉 2FA enabled successfully! Redirecting to dashboard...', 'success');
        setTimeout(() => { window.location.href = '/dashboard'; }, 2000);
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
      btnText.textContent = '✅ Verify & Enable 2FA';
    }
  });
})();
