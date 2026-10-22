(() => {
  const SUPABASE_URL = 'https://ozagjnossyerecptpthb.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_A2ccZzZ1qv3ay8JYpTU5oQ_ip4dHh91';
  const client = window.supabase && window.supabase.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

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
  const profileIds = ['full-name','dob','education-level','country','state','institution','organization'];
  const parentIds = ['parent-name','parent-contact','parent-email'];
  let previousFocus = null;
  let toastTimer;
  let authStep = 'email';
  let authIntent = 'signup';
  let pendingEmail = '';

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }
  function showMessage(text, isError = false) {
    message.hidden = false;
    message.textContent = text;
    message.style.color = isError ? '#ffaaa0' : 'var(--champagne)';
  }
  function setFieldVisible(id, visible) {
    const field = document.getElementById(id);
    const label = document.querySelector('label[for="' + id + '"]');
    if (field) field.hidden = !visible;
    if (label) label.hidden = !visible;
  }
  function showProfileFields(visible) {
    profileIds.forEach(id => setFieldVisible(id, visible));
    document.getElementById('parent-fields').hidden = !visible;
    if (!visible) parentIds.forEach(id => {
      document.getElementById(id).required = false;
    });
    document.getElementById('age-display').hidden = !visible;
  }
  function calculateAge(dateString) {
    if (!dateString) return null;
    const birth = new Date(dateString + 'T00:00:00');
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const beforeBirthday = today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
    if (beforeBirthday) age--;
    return age >= 0 ? age : null;
  }
  function updateAgeFields() {
    const age = calculateAge(document.getElementById('dob').value);
    const display = document.getElementById('age-display');
    const parentBox = document.getElementById('parent-fields');
    if (authIntent !== 'signup' || authStep !== 'email') return;
    if (age === null) {
      display.hidden = true;
      parentBox.hidden = true;
      parentIds.forEach(id => document.getElementById(id).required = false);
      return;
    }
    display.hidden = false;
    display.textContent = 'Calculated age: ' + age;
    const needsParent = age < 18;
    parentBox.hidden = !needsParent;
    parentIds.forEach(id => document.getElementById(id).required = needsParent);
  }
  function openModal(type) {
    if (!client) { showToast('Sign-in could not load. Please refresh and try again.'); return; }
    previousFocus = document.activeElement;
    authIntent = type === 'login' ? 'login' : 'signup';
    authStep = 'email';
    pendingEmail = '';
    form.reset();
    form.hidden = false;
    message.hidden = true;
    message.textContent = '';
    const priorSignout = document.getElementById('auth-signout');
    if (priorSignout) priorSignout.remove();
    setFieldVisible('email', true);
    setFieldVisible('code', false);
    showProfileFields(authIntent === 'signup');
    document.getElementById('parent-fields').hidden = true;
    document.getElementById('email').required = true;
    document.getElementById('code').required = false;
    profileIds.forEach(id => {
      const el = document.getElementById(id);
      el.required = authIntent === 'signup' && ['full-name','dob','education-level','country','state','institution'].includes(id);
    });
    parentIds.forEach(id => document.getElementById(id).required = false);
    kicker.textContent = authIntent === 'login' ? 'WELCOME BACK' : 'YOUR JOURNEY BEGINS';
    title.innerHTML = authIntent === 'login' ? 'Good to see <em>you again.</em>' : 'Welcome to <em>Vidyalay.</em>';
    copy.textContent = authIntent === 'login'
      ? 'Sign in with a one-time code sent to your email.'
      : 'Create your secure account and tell us a little about your learning journey.';
    document.querySelector('label[for="email"]').textContent = 'Email address';
    submit.innerHTML = 'Send email code <span>→</span>';
    note.textContent = 'We will email you a one-time code. Never share your code with anyone.';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => document.getElementById('full-name').hidden ? document.getElementById('email').focus() : document.getElementById('full-name').focus(), 30);
  }
  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  }
  async function saveProfile(user) {
    const age = calculateAge(document.getElementById('dob').value);
    const profile = {
      id: user.id,
      full_name: document.getElementById('full-name').value.trim(),
      date_of_birth: document.getElementById('dob').value,
      parent_name: age !== null && age < 18 ? document.getElementById('parent-name').value.trim() : null,
      parent_contact: age !== null && age < 18 ? document.getElementById('parent-contact').value.trim() : null,
      parent_email: age !== null && age < 18 ? document.getElementById('parent-email').value.trim() : null,
      education_level: document.getElementById('education-level').value,
      country: document.getElementById('country').value.trim(),
      state: document.getElementById('state').value.trim(),
      institution_name: document.getElementById('institution').value.trim(),
      organization_name: document.getElementById('organization').value.trim() || null,
      updated_at: new Date().toISOString()
    };
    const { error } = await client.from('profiles').upsert(profile, { onConflict: 'id' });
    if (error) throw error;
  }
  async function finishAuth(user) {
    form.hidden = true;
    kicker.textContent = 'WELCOME TO VIDYALAY';
    title.innerHTML = 'Your journey <em>starts now.</em>';
    copy.textContent = 'Your secure account session is active on this device.';
    showMessage('Signed in as ' + (user.email || pendingEmail) + '.');
    note.textContent = 'You can close this window or continue exploring the home page.';
    const old = document.getElementById('auth-signout');
    if (old) old.remove();
    const signout = document.createElement('button');
    signout.type = 'button';
    signout.id = 'auth-signout';
    signout.className = 'btn btn-outline modal-submit';
    signout.textContent = 'Sign out';
    signout.addEventListener('click', async () => {
      const { error } = await client.auth.signOut();
      if (error) { showMessage(error.message, true); return; }
      closeModal();
      showToast('You have signed out.');
    });
    form.parentNode.appendChild(signout);
  }
  async function verifyCode() {
    const code = document.getElementById('code').value.trim();
    try {
      submit.disabled = true;
      const { data, error } = await client.auth.verifyOtp({ email: pendingEmail, token: code, type: 'email' });
      if (error) throw error;
      if (!data || !data.user) throw new Error('The code could not be verified. Please try again.');
      if (authIntent === 'signup') {
        try {
          await saveProfile(data.user);
        } catch (profileError) {
          showMessage('Your email is verified, but the profile could not be saved: ' + profileError.message + '. Please keep this tab open and try signing in again after checking the database policies.', true);
          return;
        }
      }
      await finishAuth(data.user);
    } catch (err) {
      showMessage(err.message || 'That code did not work. Please try again.', true);
    } finally { submit.disabled = false; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!client) { showMessage('Supabase client did not load. Refresh the page and try again.', true); return; }
    if (authStep === 'code') { await verifyCode(); return; }
    const email = document.getElementById('email').value.trim();
    if (authIntent === 'signup') {
      const age = calculateAge(document.getElementById('dob').value);
      if (age === null) { showMessage('Please enter a valid date of birth.', true); return; }
      if (age < 18 && parentIds.some(id => !document.getElementById(id).value.trim())) {
        showMessage('Students under 18 must enter all three parent details.', true); return;
      }
    }
    try {
      submit.disabled = true;
      const options = authIntent === 'signup'
        ? { shouldCreateUser: true, data: { full_name: document.getElementById('full-name').value.trim() } }
        : { shouldCreateUser: false };
      const { error } = await client.auth.signInWithOtp({ email, options });
      if (error) throw error;
      pendingEmail = email;
      authStep = 'code';
      showProfileFields(false);
      setFieldVisible('email', false);
      setFieldVisible('code', true);
      document.getElementById('email').required = false;
      document.getElementById('code').required = true;
      submit.innerHTML = 'Verify code <span>→</span>';
      copy.textContent = 'Enter the 6-digit code sent to ' + email + '.';
      note.textContent = 'If no code arrives, check your spam folder. Supabase email templates must send the numeric token for code verification.';
      showMessage('Email code requested. Check your inbox.');
      document.getElementById('code').focus();
    } catch (err) {
      showMessage(err.message || 'Could not send the code. Check your email and try again.', true);
    } finally { submit.disabled = false; }
  });
  document.getElementById('dob').addEventListener('change', updateAgeFields);
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

  if (client) {
    client.auth.getSession().then(({ data }) => {
      if (data && data.session) showToast('You are signed in to Vidyalay.');
    });
  }
})();