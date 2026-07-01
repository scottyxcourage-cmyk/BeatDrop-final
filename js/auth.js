// All auth now talks to the real backend (server/routes/auth.js) instead of localStorage.
// Sessions are stored as an httpOnly cookie set by the server - nothing sensitive lives client-side.

const AUTH_API = (window.CONFIG && CONFIG.API_BASE) ? CONFIG.API_BASE : '';

async function apiPost(path, body) {
  const res = await fetch(AUTH_API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body || {})
  });
  let data = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

async function apiGet(path) {
  const res = await fetch(AUTH_API + path, { credentials: 'include' });
  let data = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-signup').classList.toggle('active', !isLogin);
  document.getElementById('form-login').style.display  = isLogin ? 'block' : 'none';
  document.getElementById('form-signup').style.display = isLogin ? 'none'  : 'block';
  clearAuthMessages();
}

function clearAuthMessages() {
  document.getElementById('auth-error').classList.remove('visible');
  document.getElementById('auth-success').classList.remove('visible');
  document.getElementById('resend-verify-link').style.display = 'none';
}
function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg; el.classList.add('visible');
  document.getElementById('auth-success').classList.remove('visible');
}
function showAuthSuccess(msg) {
  const el = document.getElementById('auth-success');
  el.textContent = msg; el.classList.add('visible');
  document.getElementById('auth-error').classList.remove('visible');
}

// ---------- LOGIN ----------
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) { showAuthError('Please fill in all fields.'); return; }
  if (!email.includes('@')) { showAuthError('Enter a valid email address.'); return; }

  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.innerHTML = '<span class="auth-spinner"></span>Signing in...';
  document.getElementById('resend-verify-link').style.display = 'none';

  const { ok, data } = await apiPost('/api/auth/login', { email, password: pass });

  btn.disabled = false;
  btn.textContent = 'Sign In';

  if (!ok) {
    showAuthError(data.error || 'Could not sign in. Please try again.');
    if (data.needsVerification) {
      document.getElementById('resend-verify-link').style.display = 'block';
    }
    return;
  }

  STATE.currentUser = data.user;
  launchApp();
}

// ---------- SIGNUP ----------
async function handleSignup() {
  const name  = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-pass').value;
  const pass2 = document.getElementById('signup-pass2').value;
  if (!name || !email || !pass || !pass2) { showAuthError('Please fill in all fields.'); return; }
  if (!email.includes('@')) { showAuthError('Enter a valid email address.'); return; }
  if (pass.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }
  if (pass !== pass2) { showAuthError("Passwords don't match."); return; }

  const btn = document.getElementById('btn-signup');
  btn.disabled = true;
  btn.innerHTML = '<span class="auth-spinner"></span>Creating account...';

  const { ok, data } = await apiPost('/api/auth/signup', { name, email, password: pass });

  btn.disabled = false;
  btn.textContent = 'Create Account';

  if (!ok) {
    showAuthError(data.error || 'Could not create your account. Please try again.');
    return;
  }

  // Logged in immediately — launch the app
  STATE.currentUser = data.user;
  toast(data.message || `Welcome, ${data.user.name}!`, 'success');
  launchApp();
}

// ---------- RESEND VERIFICATION ----------
async function handleResendVerification() {
  const email = document.getElementById('login-email').value.trim();
  if (!email) { showAuthError('Enter your email address first.'); return; }
  const { data } = await apiPost('/api/auth/resend-verification', { email });
  showAuthSuccess(data.message || 'If that account exists and is unverified, a new verification email has been sent.');
}

// ---------- FORGOT PASSWORD ----------
async function handleForgot() {
  const email = document.getElementById('login-email').value.trim();
  if (!email) { showAuthError('Enter your email address first.'); return; }
  if (!email.includes('@')) { showAuthError('Enter a valid email address.'); return; }
  const { data } = await apiPost('/api/auth/forgot', { email });
  showAuthSuccess(data.message || 'If that account exists, a reset link has been sent.');
}

// ---------- LOGOUT ----------
async function handleLogout() {
  await apiPost('/api/auth/logout', {});
  STATE.currentUser = null;
  const app = document.getElementById('app');
  app.classList.remove('visible');
  app.style.display = 'none';
  document.getElementById('auth-screen').classList.add('visible');
  closeUserMenu();
  toast('Signed out successfully.', 'info');
}

// ---------- SESSION CHECK (used on boot) ----------
async function fetchSession() {
  const { ok, data } = await apiGet('/api/auth/me');
  return ok ? data.user : null;
}

function toggleUserMenu() {
  STATE.userMenuOpen = !STATE.userMenuOpen;
  document.getElementById('user-menu').style.display = STATE.userMenuOpen ? 'block' : 'none';
}
function closeUserMenu() {
  STATE.userMenuOpen = false;
  document.getElementById('user-menu').style.display = 'none';
}

function setUserUI() {
  if (!STATE.currentUser) return;
  const letter = STATE.currentUser.name ? STATE.currentUser.name[0].toUpperCase() : 'U';
  document.getElementById('avatar-letter').textContent         = letter;
  document.getElementById('menu-name').textContent             = STATE.currentUser.name || 'User';
  document.getElementById('menu-email').textContent            = STATE.currentUser.email || '';
  document.getElementById('profile-avatar-big').textContent    = letter;
  document.getElementById('profile-name').textContent          = STATE.currentUser.name || '—';
  document.getElementById('profile-email').textContent         = STATE.currentUser.email || '—';
  document.getElementById('profile-joined').textContent        = `Member since ${STATE.currentUser.joined || '—'}`;
  // Sidebar user card
  const sbAv = document.getElementById('sb-avatar');
  const sbNm = document.getElementById('sb-name');
  const sbEm = document.getElementById('sb-email');
  if (sbAv) sbAv.textContent = letter;
  if (sbNm) sbNm.textContent = STATE.currentUser.name  || '—';
  if (sbEm) sbEm.textContent = STATE.currentUser.email || '—';
}

document.addEventListener('click', e => {
  if (!document.getElementById('user-avatar').contains(e.target)) closeUserMenu();
});
