// ---- Config ----
// Point this at your Render service. Include /api since your server mounts routes at /api/*
const CONFIG = { authApiBase: "https://virtual-board-auth-api.onrender.com/api" };

// ---- Helpers ----
const $ = (sel) => document.querySelector(sel);

function setStatus(msg, isError = false) {
  const el = $('#status');
  if (!el) return;
  el.textContent = msg || '';
  el.style.color = isError ? 'red' : 'black';
}

function saveToken(token) { localStorage.setItem('vb_token', token); }
function getToken() { return localStorage.getItem('vb_token'); }
function clearToken() { localStorage.removeItem('vb_token'); }

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '==='.slice((base64.length + 3) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch { return null; }
}

async function apiPost(path, body) {
  const res = await fetch(`${CONFIG.authApiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

async function apiGet(path, { auth = false } = {}) {
  const headers = {};
  if (auth) {
    const token = getToken();
    if (!token) throw new Error('Not logged in');
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${CONFIG.authApiBase}${path}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

// Optional: quick health check helper (useful for debugging)
async function apiHealth() {
  try {
    const res = await fetch(`${CONFIG.authApiBase.replace(/\/api$/, '')}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// ---- Page: auth.html ----
(function initAuthPage() {
  const signupForm = $('#signup-form');
  const loginForm = $('#login-form');
  if (!signupForm && !loginForm) return; // not on auth page

  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('');
    const username = $('#signup-username').value.trim();
    const password = $('#signup-password').value;
    if (!username || !password) return setStatus('Enter username and password.', true);

    try {
      // NOTE: now hits POST /api/auth/register
      const { token } = await apiPost('/auth/register', { username, password });
      saveToken(token);
      setStatus('Signed up. Redirecting to boards…');
      location.href = './boards.html';
    } catch (err) {
      setStatus(`Signup failed: ${err.message}`, true);
    }
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('');
    const username = $('#login-username').value.trim();
    const password = $('#login-password').value;
    if (!username || !password) return setStatus('Enter username and password.', true);

    try {
      // NOTE: now hits POST /api/auth/login
      const { token } = await apiPost('/auth/login', { username, password });
      saveToken(token);
      setStatus('Logged in. Redirecting to boards…');
      location.href = './boards.html';
    } catch (err) {
      setStatus(`Login failed: ${err.message}`, true);
    }
  });
})();

// ---- Page: boards.html ----
(function initBoardsPage() {
  const boardsBtn = $('#refresh-boards-btn');
  const logoutBtn = $('#logout-btn');
  const tokenPreview = $('#token-preview');
  const payloadPreview = $('#payload-preview');
  const boardsList = $('#boards-list');
  const boardSelect = $('#board-select');
  if (!boardsBtn && !logoutBtn && !tokenPreview) return; // not on boards page

  // Require auth
  if (!getToken()) {
    location.href = './auth.html';
    return;
  }

  function renderSession() {
    const token = getToken();
    if (tokenPreview) tokenPreview.textContent = token || '(no token)';
    const payload = token ? decodeJwtPayload(token) : null;
    if (payloadPreview) payloadPreview.textContent = payload ? JSON.stringify(payload, null, 2) : '(no payload)';
  }

  function renderBoards(boards) {
    // dropdown
    if (boardSelect) {
      boardSelect.innerHTML = '';
      if (boards?.length) {
        boards.forEach(b => {
          const opt = document.createElement('option');
          opt.value = b.id;
          opt.textContent = `${b.name} (#${b.id})`;
          boardSelect.appendChild(opt);
        });
      } else {
        const opt = document.createElement('option');
        opt.textContent = '(no boards)';
        opt.disabled = true; opt.selected = true;
        boardSelect.appendChild(opt);
      }
    }

    // list
    if (boardsList) {
      boardsList.innerHTML = '';
      if (!boards?.length) {
        boardsList.textContent = 'No boards.';
        return;
      }
      boards.forEach(b => {
        const div = document.createElement('div');
        div.textContent = `#${b.id} — ${b.name}`;
        boardsList.appendChild(div);
      });
    }
  }

  async function loadBoards() {
    try {
      setStatus('Loading...');
      // NOTE: now hits GET /api/boards with Authorization header
      const { boards } = await apiGet('/boards', { auth: true });
      renderBoards(boards);
      setStatus('Boards loaded.');
    } catch (err) {
      setStatus(`Failed to load boards: ${err.message}`, true);
    }
  }

  boardsBtn?.addEventListener('click', loadBoards);
  logoutBtn?.addEventListener('click', () => {
    clearToken();
    location.href = './auth.html';
  });

  renderSession();
  loadBoards();

  // light polling
  const interval = setInterval(() => {
    if (!getToken()) { clearInterval(interval); return; }
    loadBoards();
  }, 15000);
})();
