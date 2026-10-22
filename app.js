(() => {
  const modal = document.getElementById('modal');
  const title = document.getElementById('modal-title');
  const kicker = document.getElementById('modal-kicker');
  const copy = document.getElementById('modal-copy');
  const form = document.getElementById('signup-form');
  const submit = document.getElementById('modal-submit');
  const note = document.getElementById('form-note');
  const message = document.getElementById('modal-message');
  const toast = document.getElementById('toast');
  const nav = document.querySelector('.desktop-nav');
  const menuToggle = document.querySelector('.menu-toggle');
  let previousFocus = null;
  let toastTimer;
  let authStep = 'email';
  let authIntent = 'signup';
  let hasPasskey = false;
  const A = window.hatchable && window.hatchable.auth;

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }
  function openModal(type) {
    if (!A) { showToast('Account sign-in will be connected in a later update.'); return; }
    previousFocus = document.activeElement;
    authIntent = type === 'login' ? 'login' : 'signup';
    authStep = 'email';
    kicker.textContent = authIntent === 'login' ? 'WELCOME BACK' : 'YOUR JOURNEY BEGINS';
    title.innerHTML = authIntent === 'login' ? 'Good to see <em>you again.</em>' : 'Welcome to <em>Vidyalay.</em>';
    copy.textContent = authIntent === 'login' ? 'Sign in securely with a one-time code sent to your email.' : 'Create your account with a secure email code. No password needed.';
    form.reset();
    const priorSignout = document.getElementById('auth-signout');
    if (priorSignout) priorSignout.remove();
    form.hidden = false;
    message.hidden = true;
    message.textContent = '';
    form.querySelectorAll('input,select,label').forEach(el => el.hidden = false);
    document.getElementById('email').hidden = false;
    document.getElementById('code').hidden = true;
    document.querySelector('label[for="code"]').hidden = true;
    document.querySelector('label[for="full-name"]').hidden = true;
    document.getElementById('full-name').hidden = true;
    document.querySelector('label[for="learning-interest"]').hidden = true;
    document.getElementById('learning-interest').hidden = true;
    document.querySelector('label[for="email"]').textContent = 'Email address';
    document.getElementById('code').value = '';
    submit.innerHTML = 'Continue with email <span>→</span>';
    note.textContent = 'We will email you a one-time code. Never share your code with anyone.';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => document.getElementById('email').focus(), 30);
  }
  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  }
  function showAuthMessage(text, isError = false) {
    message.hidden = false;
    message.textContent = text;
    message.style.color = isError ? '#ffaaa0' : 'var(--champagne)';
  }
  function finishAuth(user) {
    form.hidden = true;
    message.hidden = false;
    message.textContent = 'You’re signed in as ' + (user.email || 'your email') + '. Your account is ready. Profile setup will be the next step.';
    kicker.textContent = 'WELCOME TO VIDYALAY';
    title.innerHTML = 'Your journey <em>starts now.</em>';
    copy.textContent = 'Your secure account session is active on this device.';
    note.textContent = 'You can close this window or continue exploring the home page.';
    const old = document.getElementById('auth-signout');
    if (old) old.remove();
    const signout = document.createElement('button');
    signout.type = 'button'; signout.id = 'auth-signout'; signout.className = 'btn btn-outline modal-submit'; signout.textContent = 'Sign out';
    signout.addEventListener('click', async () => { try { await A.signOut(); closeModal(); showToast('You have signed out.'); } catch (e) { showAuthMessage(e.message || 'Could not sign out.', true); } });
    form.parentNode.appendChild(signout);
  }
  async function verifyAuthCode() {
    const email = document.getElementById('email').value.trim();
    const code = document.getElementById('code').value.trim();
    try {
      submit.disabled = true;
      const result = await A.verifyCode({ email, code });
      if (!result || !result.user) throw new Error('That code did not work. Please try again.');
      finishAuth(result.user);
    } catch (err) {
      showAuthMessage(err.status === 429 ? 'Too many attempts. Wait a little before trying again.' : (err.message || 'That code did not work.'), true);
    } finally { submit.disabled = false; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!A) { showToast('Account sign-in will be connected in a later update.'); return; }
    const email = document.getElementById('email').value.trim();
    if (authStep === 'code') { await verifyAuthCode(); return; }
    try {
      submit.disabled = true;
      const result = await A.startLogin({ email });
      hasPasskey = !!(result && result.has_passkey);
      if (hasPasskey && A.supportsPasskeys && A.supportsPasskeys()) {
        try { const passkeyResult = await A.signInWithPasskey({ email }); if (passkeyResult && passkeyResult.user) { finishAuth(passkeyResult.user); return; } } catch (_) { /* fall back to email code */ }
      }
      authStep = 'code';
      document.querySelector('label[for="email"]').hidden = true;
      document.getElementById('email').hidden = true;
      document.querySelector('label[for="code"]').hidden = false;
      document.getElementById('code').hidden = false;
      document.querySelector('label[for="code"]').textContent = '6-digit email code';
      document.getElementById('code').setAttribute('aria-label', '6-digit email code');
      submit.innerHTML = 'Verify code <span>→</span>';
      copy.textContent = 'Enter the 6-digit code sent to ' + email + '.';
      note.textContent = 'The code expires. If it does not arrive, check spam or use a different email.';
      showAuthMessage('Code sent. Check your inbox.');
      document.getElementById('code').focus();
    } catch (err) {
      showAuthMessage(err.status === 429 ? 'Too many attempts. Wait a little before trying again.' : (err.message || 'Could not send the code. Check your email and try again.'), true);
    } finally { submit.disabled = false; }
  });

  document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openModal(button.dataset.open)));
  document.querySelector('.modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.classList.contains('open')) closeModal();
    if (event.key === 'Tab' && modal.classList.contains('open')) {
      const focusable = [...modal.querySelectorAll('button:not([hidden]),input:not([hidden]),select:not([hidden]),a[href]:not([hidden])')].filter(el => !el.disabled);
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable[focusable.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) { event.preventDefault(); focusable[0].focus(); }
    }
  });
  document.querySelectorAll('[data-scroll]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.scroll)?.scrollIntoView({behavior: 'smooth'})));
  document.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.preview + ' — this is a design preview; feature functionality will be built later.')));
  menuToggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); menuToggle.setAttribute('aria-expanded', String(open)); menuToggle.textContent = open ? '×' : '☰'; });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { nav.classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.textContent = '☰'; }));
  document.querySelector('.back-top').addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));
})();