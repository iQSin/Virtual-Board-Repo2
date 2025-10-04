const CONFIG = { authApiBase: "https://virtual-board-auth-api.onrender.com/api" };

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

async function apiPost(path, body, { auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (!token) throw new Error('Not logged in');
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${CONFIG.authApiBase}${path}`, {
    method: 'POST',
    headers,
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

// ---- Page: auth.html ----
(function initAuthPage() {
  const signupForm = $('#signup-form');
  const loginForm = $('#login-form');
  if (!signupForm && !loginForm) return;

  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('');
    const username = $('#signup-username').value.trim();
    const password = $('#signup-password').value;
    if (!username || !password) return setStatus('Enter username and password.', true);

    try {
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
      const { token } = await apiPost('/auth/login', { username, password });
      saveToken(token);
      setStatus('Logged in. Redirecting to boards…');
      location.href = './boards.html';
    } catch (err) {
      setStatus(`Login failed: ${err.message}`, true);
    }
  });
})();

// boards.html
(function initBoardsPage() {
  const boardsBtn = $('#refresh-boards-btn');
  const logoutBtn = $('#logout-btn');
  const boardsList = $('#boards-list');
  const boardSelect = $('#board-select');

  if (!boardsBtn && !logoutBtn) return;

  if (!getToken()) {
    location.href = './auth.html';
    return;
  }

  function renderBoards(boards) {
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
      setStatus('Loading boards...');
  
      const token = localStorage.getItem('vb_token'); 
      console.log('Sending token:', token);
  
      if (!token) throw new Error('No token found. Please log in.');
  
      const res = await fetch('https://virtual-board-repo2.onrender.com/notes', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      const data = await res.json();
      console.log('Response:', data);
  
      if (res.status === 401) {
        throw new Error('Unauthorized. Invalid or expired token.');
      }
  

      renderBoards(data.notes || []);
      setStatus('Boards loaded.');
    } catch (err) {
      setStatus(`Failed to load boards: ${err.message}`, true);
      console.error(err);
    }
  }
  
  

  boardsBtn?.addEventListener('click', loadBoards);
  logoutBtn?.addEventListener('click', () => {
    clearToken();
    location.href = './auth.html';
  });

  loadBoards();

  setInterval(() => {
    if (!getToken()) return;
    loadBoards();
  }, 15000);
})();
