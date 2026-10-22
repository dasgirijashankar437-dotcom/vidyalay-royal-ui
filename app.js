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
    profileIds.forEach(id => {
      setFieldVisible(id, visible);
      document.getElementById(id).required = visible && ['full-name','dob','education-level','country','state','institution'].includes(id);
    });
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
  async function showDashboard(user) {
    const home = document.querySelector('main#home');
    const dashboard = document.getElementById('student-dashboard');
    if (!home || !dashboard) return;
    home.hidden = true;
    dashboard.hidden = false;
    document.body.classList.remove('modal-open');
    closeModal();
    const email = user && user.email ? user.email : '';
    document.getElementById('dashboard-email').textContent = email || 'Your Vidyalay journey continues here.';
    let displayName = user && user.user_metadata && user.user_metadata.full_name ? user.user_metadata.full_name : '';
    try {
      const { data } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (data && data.full_name) displayName = data.full_name;
      const profileStatus = data && data.education_level
        ? [data.education_level, data.institution_name].filter(Boolean).join(' · ')
        : 'Your student profile is not complete yet.';
      document.getElementById('dashboard-profile-status').textContent = profileStatus;
      renderStudentProfile(data || {}, user);
    } catch (_) {
      renderStudentProfile({}, user);
    }
    document.getElementById('dashboard-name').textContent = displayName || 'Learner.';
    document.querySelector('.header-actions [data-open="login"]').hidden = true;
    document.querySelector('.header-actions [data-open="signup"]').hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function showHome() {
    const home = document.querySelector('main#home');
    const dashboard = document.getElementById('student-dashboard');
    if (home) home.hidden = false;
    if (dashboard) dashboard.hidden = true;
    const login = document.querySelector('.header-actions [data-open="login"]');
    const signup = document.querySelector('.header-actions [data-open="signup"]');
    if (login) login.hidden = false;
    if (signup) signup.hidden = false;
  }
  async function finishAuth(user) {
    await showDashboard(user);
    showToast('Login successful. Welcome to Vidyalay!');
    return;
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
      showHome();
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
      const redirectTo = 'https://dasgirijashankar437-dotcom.github.io/vidyalay-royal-ui/';
      const options = authIntent === 'signup'
        ? { shouldCreateUser: true, emailRedirectTo: redirectTo, data: { full_name: document.getElementById('full-name').value.trim() } }
        : { shouldCreateUser: false, emailRedirectTo: redirectTo };
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

  document.getElementById('dashboard-signout')?.addEventListener('click', async () => {
    const { error } = await client.auth.signOut();
    if (error) { showToast('Could not sign out. Please try again.'); return; }
    showHome();
    showToast('You have signed out.');
  });
  let activeProfileUser = null;
  let cachedProfile = {};
  const ASIAN_COUNTRIES = [
    'Afghanistan','Armenia','Azerbaijan','Bahrain','Bangladesh','Bhutan','Brunei','Cambodia','China','Cyprus','Georgia','India','Indonesia','Iran','Iraq','Israel','Japan','Jordan','Kazakhstan','Kuwait','Kyrgyzstan','Laos','Lebanon','Malaysia','Maldives','Mongolia','Myanmar','Nepal','North Korea','Oman','Pakistan','Palestine','Philippines','Qatar','Saudi Arabia','Singapore','South Korea','Sri Lanka','Syria','Taiwan','Tajikistan','Thailand','Timor-Leste','Turkey','Turkmenistan','United Arab Emirates','Uzbekistan','Vietnam','Yemen'
  ];
  const INDIA_REGIONS = [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
    'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
  ];
  const EDUCATIONAL_ORGANIZATIONS = [
    'NCERT','CBSE','CISCE','NIOS','NCTE','UGC','AICTE','NBA','NAAC','NCVET','NSDC','NSDA','NSQF','NIEPA','CIET','PSSCIVE','RIE','KVS','NVS','CTSA','SCERT','State Board of School Education','State Council of Educational Research and Training','State Higher Education Council','State University','Central University','Deemed-to-be University','National Testing Agency (NTA)','ICAR','ICMR','ICHR','ICSSR','ICPR','National Medical Commission (NMC)','Dental Council of India (DCI)','Pharmacy Council of India (PCI)','Indian Nursing Council (INC)','Bar Council of India (BCI)','Council of Architecture (CoA)','Rehabilitation Council of India (RCI)','Other / Not listed'
  ];
  function fillSelect(select, values, placeholder, selectedValue) {
    if (!select) return;
    select.replaceChildren();
    const first = document.createElement('option');
    first.value = '';
    first.textContent = placeholder;
    select.appendChild(first);
    values.forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    if (selectedValue && !values.includes(selectedValue)) {
      const option = document.createElement('option');
      option.value = selectedValue;
      option.textContent = selectedValue + ' (saved value)';
      select.appendChild(option);
    }
    select.value = selectedValue || '';
  }
  function setupAuthDropdowns() {
    const country = document.getElementById('country');
    const state = document.getElementById('state');
    const organization = document.getElementById('organization');
    fillSelect(country, ASIAN_COUNTRIES, 'Select country', country.value || '');
    fillSelect(organization, EDUCATIONAL_ORGANIZATIONS, 'Select educational organization (optional)', organization.value || '');
    const populateRegions = (countryValue, selectedState = '') => {
      fillSelect(state, countryValue === 'India' ? INDIA_REGIONS : [], countryValue === 'India' ? 'Select state / UT' : (countryValue ? 'Region list not configured for this country' : 'Select country first'), selectedState);
    };
    populateRegions(country.value, state.value);
    if (country && !country.dataset.dropdownBound) {
      country.addEventListener('change', () => populateRegions(country.value, ''));
      country.dataset.dropdownBound = 'true';
    }
  }
  function setupProfileDropdowns(profile = {}) {
    const country = document.getElementById('edit-country');
    const state = document.getElementById('edit-state');
    const organization = document.getElementById('edit-organization');
    fillSelect(country, ASIAN_COUNTRIES, 'Select country', profile.country || '');
    fillSelect(organization, EDUCATIONAL_ORGANIZATIONS, 'Select educational organization', profile.organization_name || '');
    const institution = document.getElementById('edit-institution');
    fillSelect(institution, ['School','College','University','Vocational / Technical Institute','Other / Not listed'], 'Select institution type', profile.institution_name || '');
    const populateRegions = (countryValue, selectedState = '') => {
      const regions = countryValue === 'India' ? INDIA_REGIONS : [];
      fillSelect(state, regions, countryValue === 'India' ? 'Select state / UT' : (countryValue ? 'Select region (list not configured yet)' : 'Select country first'), selectedState);
      if (countryValue && countryValue !== 'India') {
        const option = document.createElement('option');
        option.value = 'Other / enter region manually';
        option.textContent = 'Other / enter region manually';
        state.appendChild(option);
        if (selectedState === 'Other / enter region manually') state.value = selectedState;
      }
    };
    populateRegions(profile.country || '', profile.state || '');
    if (country && !country.dataset.dropdownBound) {
      country.addEventListener('change', () => populateRegions(country.value, ''));
      country.dataset.dropdownBound = 'true';
    }
  }

  function renderStudentProfile(profile, user) {
    activeProfileUser = user;
    cachedProfile = profile || {};
    const panel = document.getElementById('profile-panel');
    const view = document.getElementById('profile-view');
    if (!panel || !view) return;
    const fields = [
      ['Full name', profile.full_name],
      ['Date of birth', profile.date_of_birth],
      ['Age', calculateAge(profile.date_of_birth) === null ? '' : calculateAge(profile.date_of_birth) + ' years'],
      ['Education level', profile.education_level],
      ['Country', profile.country],
      ['State / region', profile.state],
      ['School / college / university', profile.institution_name],
      ['Educational organization', profile.organization_name]
    ];
    view.replaceChildren();
    fields.forEach(([label, value]) => {
      const item = document.createElement('div');
      item.className = 'profile-detail';
      const name = document.createElement('span');
      name.textContent = label;
      const content = document.createElement('strong');
      content.textContent = value || 'Not added yet';
      item.append(name, content);
      view.appendChild(item);
    });
    const formEl = document.getElementById('profile-edit-form');
    ['full-name','dob','education-level','country','state','institution'].forEach((id) => {
      const map = {'full-name':'full_name','dob':'date_of_birth','education-level':'education_level','country':'country','state':'state','institution':'institution_name'};
      const input = document.getElementById('edit-' + id);
      if (input) input.value = profile[map[id]] || '';
    });
    document.getElementById('edit-organization').value = profile.organization_name || '';
    document.getElementById('profile-age-preview').textContent = calculateAge(profile.date_of_birth) === null ? 'Age will be calculated from your date of birth.' : 'Calculated age: ' + calculateAge(profile.date_of_birth);
    panel.hidden = false;
  }
  function setProfileMessage(text, isError = false) {
    const el = document.getElementById('profile-panel-message');
    el.hidden = !text;
    el.textContent = text;
    el.style.color = isError ? '#ffaaa0' : 'var(--champagne)';
  }
  document.getElementById('dashboard-profile')?.addEventListener('click', () => {
    const panel = document.getElementById('profile-panel');
    panel.hidden = false;
    panel.scrollIntoView({behavior:'smooth', block:'start'});
  });
  document.getElementById('profile-edit-toggle')?.addEventListener('click', () => {
    document.getElementById('profile-view').hidden = true;
    document.getElementById('profile-edit-form').hidden = false;
    document.getElementById('profile-edit-toggle').hidden = true;
    setProfileMessage('');
  });
  document.getElementById('profile-edit-cancel')?.addEventListener('click', () => {
    renderStudentProfile(cachedProfile, activeProfileUser);
    document.getElementById('profile-edit-form').hidden = true;
    document.getElementById('profile-view').hidden = false;
    document.getElementById('profile-edit-toggle').hidden = false;
    setProfileMessage('');
  });
  document.getElementById('edit-dob')?.addEventListener('change', () => {
    const age = calculateAge(document.getElementById('edit-dob').value);
    document.getElementById('profile-age-preview').textContent = age === null ? 'Please enter a valid date of birth.' : 'Calculated age: ' + age;
  });
  document.getElementById('profile-edit-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!client || !activeProfileUser) { setProfileMessage('Your session could not be confirmed. Please sign in again.', true); return; }
    const dob = document.getElementById('edit-dob').value;
    const age = calculateAge(dob);
    if (age === null) { setProfileMessage('Please enter a valid date of birth.', true); return; }
    const button = document.getElementById('profile-save-button');
    button.disabled = true;
    button.textContent = 'Saving…';
    const updated = {
      id: activeProfileUser.id,
      full_name: document.getElementById('edit-full-name').value.trim(),
      date_of_birth: dob,
      education_level: document.getElementById('edit-education-level').value,
      country: document.getElementById('edit-country').value.trim(),
      state: document.getElementById('edit-state').value.trim(),
      institution_name: document.getElementById('edit-institution').value.trim(),
      organization_name: document.getElementById('edit-organization').value.trim() || null,
      updated_at: new Date().toISOString()
    };
    try {
      const { error } = await client.from('profiles').update(updated).eq('id', activeProfileUser.id);
      if (error) throw error;
      cachedProfile = {...cachedProfile, ...updated};
      renderStudentProfile(cachedProfile, activeProfileUser);
      document.getElementById('profile-edit-form').hidden = true;
      document.getElementById('profile-view').hidden = false;
      document.getElementById('profile-edit-toggle').hidden = false;
      document.getElementById('dashboard-name').textContent = updated.full_name || 'Learner.';
      document.getElementById('dashboard-profile-status').textContent = [updated.education_level, updated.institution_name].filter(Boolean).join(' · ') || 'Your student profile is not complete yet.';
      setProfileMessage('Profile updated successfully.');
      showToast('Student profile saved.');
    } catch (error) {
      setProfileMessage('Could not save profile: ' + (error.message || 'Please try again.'), true);
    } finally {
      button.disabled = false;
      button.textContent = 'Save changes →';
    }
  });
  document.querySelectorAll('[data-dashboard-preview]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.dashboardPreview + ' is a preview; this feature is not active yet.')));
  if (client) {
    client.auth.getSession().then(({ data }) => {
      if (data && data.session) showDashboard(data.session.user);
    });
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && session.user) showDashboard(session.user);
      if (event === 'SIGNED_OUT') showHome();
    });
  }
})();