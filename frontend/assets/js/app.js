const CONFIG = { authApiBase: "https://virtual-board-auth-api.onrender.com/api" };

// Error handling i denna fil är gjord till en stor del med ChatGPT

function saveToken(token) { localStorage.setItem('vb_token', token); }
function getToken() { return localStorage.getItem('vb_token'); }
function clearToken() { localStorage.removeItem('vb_token'); }

// --- JWT decode (unchanged) --- REMOVE
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
//Api funktionerna
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
//Auth kod
(function initAuthPage() {
  const signupForm = document.getElementById('signup-form');
  const loginForm  = document.getElementById('login-form');
  const statusEl   = document.getElementById('status');

  if (!signupForm && !loginForm) return;

  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (statusEl) { statusEl.textContent = ''; statusEl.style.color = 'black'; }

    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;
    if (!username || !password) {
      if (statusEl) { statusEl.textContent = 'Enter username and password.'; statusEl.style.color = 'red'; }
      return;
    }

    try {
      const { token } = await apiPost('/auth/register', { username, password });
      saveToken(token);
      if (statusEl) { statusEl.textContent = 'Signed up. Redirecting to boards…'; statusEl.style.color = 'black'; }
      location.href = `https://ws-client-virtual-board-next-level.onrender.com/?token=${encodeURIComponent(token)}`;
    } catch (err) {
      if (statusEl) { statusEl.textContent = `Signup failed: ${err.message}`; statusEl.style.color = 'red'; }
    }
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (statusEl) { statusEl.textContent = ''; statusEl.style.color = 'black'; }

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    if (!username || !password) {
      if (statusEl) { statusEl.textContent = 'Enter username and password.'; statusEl.style.color = 'red'; }
      return;
    }

    try {
      const { token } = await apiPost('/auth/login', { username, password });
      saveToken(token);
      if (statusEl) { statusEl.textContent = 'Logged in. Redirecting to boards…'; statusEl.style.color = 'black'; }
      location.href = `https://ws-client-virtual-board-next-level.onrender.com/?token=${encodeURIComponent(token)}`;
    } catch (err) {
      if (statusEl) { statusEl.textContent = `Login failed: ${err.message}`; statusEl.style.color = 'red'; }
    }
  });
})();

//Board kod
(function initBoardsPage() {
  const boardsBtn   = document.getElementById('refresh-boards-btn');
  const logoutBtn   = document.getElementById('logout-btn');
  const boardsList  = document.getElementById('boards-list');
  const boardSelect = document.getElementById('board-select');
  const statusEl    = document.getElementById('status');
  const newNoteBtn = document.getElementById('new-note-btn');
  const newNoteInput = document.getElementById('new-note-text');
  let selectedColor = 'yellow'

  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      selectedColor = dot.dataset.color
    })
  })
  if (!boardsBtn && !logoutBtn) return;
  if (!getToken()) {
    location.href = './auth.html';
    return;
  }

  function makeDraggable(note) {
    let offsetX = 0
    let offsetY = 0
    let isDragging = false
  
    const onMouseMove = (e) => {
      if (!isDragging) return
      note.style.left = `${e.clientX - offsetX}px`
      note.style.top = `${e.clientY - offsetY}px`
    }
  
    const onMouseUp = async () => {
      if (!isDragging) return
      isDragging = false
      note.style.cursor = 'grab'
      note.style.zIndex = ''
  
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
  
      try {
        const token = getToken()
        const noteId = Number(note.dataset.noteId)
        if (!noteId) throw new Error('Note ID is missing')
  
        const x = Math.round(parseFloat(note.style.left))
        const y = Math.round(parseFloat(note.style.top))
        const color = note.dataset.color || 'yellow'
        const text = note.textContent.replace('✕', '').trim()
  
        if (isNaN(x) || isNaN(y)) throw new Error('Invalid coordinates')
  
        const res = await fetch(`https://virtual-board-repo2.onrender.com/notes/${noteId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ x, y, text, color })
        })
  
        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`Could not save note position: ${res.status} ${errText}`)
        }
      } catch (err) {
        console.error(err)
        alert('Failed to save note position. See console for details.')
      }
    }
  
    note.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('delete-btn')) return
      isDragging = true
      offsetX = e.clientX - note.offsetLeft
      offsetY = e.clientY - note.offsetTop
      note.style.cursor = 'grabbing'
      note.style.zIndex = 1000
  
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    })
  }
  
  function renderNotes(notes) {
    const boardSpace = document.getElementById('board-space');
    if (!boardSpace) return;
    boardSpace.innerHTML = '';
  
    if (!notes?.length) {
      boardSpace.textContent = 'No notes.';
      return;
    }
  
    notes.forEach((n, i) => {
      const div = document.createElement('div');
      div.className = 'note';
      div.textContent = n.text;
      div.contentEditable = true;
      div.addEventListener('input', () => { div.dataset.dirty = 'true'; });
  
      const offsetX = 20 + (i % 10) * 250;
      const offsetY = 20 + Math.floor(i / 10) * 250;
      div.style.position = 'absolute';
      div.style.left = `${n.x ?? offsetX}px`;
      div.style.top = `${n.y ?? offsetY}px`;
  
      div.dataset.noteId = n.id;
      if (n.color) div.dataset.color = n.color;
  
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✕';
      deleteBtn.className = 'delete-btn';
      deleteBtn.addEventListener('click', async () => {
        try {
          const token = getToken();
          const res = await fetch(`https://virtual-board-repo2.onrender.com/notes/${n.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) throw new Error('Could not delete note');
          div.remove();
        } catch (err) {
          console.error(err);
          alert(err.message);
        }
      });
  
      div.appendChild(deleteBtn);
      boardSpace.appendChild(div);
      makeDraggable(div);
    });
  }
  
  
  

  async function loadBoards() {
    try {
      if (statusEl) { statusEl.textContent = 'Loading boards...'; statusEl.style.color = 'black'; }

      const token = localStorage.getItem('vb_token');
      if (!token) throw new Error('No token found. Please log in.');

      const res = await fetch('https://virtual-board-repo2.onrender.com/notes', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const notes = await res.json();
      if (res.status === 401) {
        throw new Error('Unauthorized. Invalid or expired token.');
      }
      renderNotes(notes || []);

      if (statusEl) { statusEl.textContent = 'Boards loaded.'; statusEl.style.color = 'black'; }
    } catch (err) {
      if (statusEl) { statusEl.textContent = `Failed to load boards: ${err.message}`; statusEl.style.color = 'red'; }
      console.error(err);
    }
  }

  boardsBtn?.addEventListener('click', loadBoards);
  logoutBtn?.addEventListener('click', () => {
    clearToken();
    location.href = './auth.html';
  });
  newNoteBtn?.addEventListener('click', addNote);
  loadBoards();
  async function addNote() {
    const text = newNoteInput.value.trim();
    if (!text) return;
  
    try {
      const token = getToken();
      if (!token) throw new Error('No token found');
  
      const boardSpace = document.getElementById('board-space');
      const notesCount = boardSpace ? boardSpace.querySelectorAll('.note').length : 0;
  
      const offsetX = 20 + (notesCount % 10) * 250;
      const offsetY = 20 + Math.floor(notesCount / 10) * 250;
  
      const res = await fetch('https://virtual-board-repo2.onrender.com/notes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, x: offsetX, y: offsetY, color: selectedColor })
      });
  
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
      const newNote = await res.json();
      newNoteInput.value = '';
  
      const div = document.createElement('div');
      div.className = 'note';
      div.contentEditable = true;
      div.textContent = newNote.text;
      div.style.left = `${newNote.x || offsetX}px`;
      div.style.top = `${newNote.y || offsetY}px`;
      div.dataset.noteId = newNote.id;
      if (newNote.color) div.dataset.color = newNote.color;
  
      div.addEventListener('input', () => { div.dataset.dirty = 'true'; });
  
      div.addEventListener('blur', async () => {
        if (!div.dataset.dirty) return;
        const noteId = Number(div.dataset.noteId);
        const text = div.textContent.replace('✕','').trim();
        try {
          await fetch(`https://virtual-board-repo2.onrender.com/notes/${noteId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
          });
          div.dataset.dirty = 'false';
        } catch(err) {
          console.error(err);
        }
      });
  
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✕';
      deleteBtn.className = 'delete-btn';
      deleteBtn.addEventListener('click', async () => {
        try {
          const resDel = await fetch(`https://virtual-board-repo2.onrender.com/notes/${newNote.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!resDel.ok) throw new Error('Could not delete note');
          div.remove();
        } catch (err) {
          console.error(err);
          alert(err.message);
        }
      });
  
      div.appendChild(deleteBtn);
      boardSpace.appendChild(div);
      makeDraggable(div);
  
    } catch (err) {
      console.error('Failed to add note:', err);
      alert('Could not create note.');
    }
  }
  
  
  setInterval(() => {
    if (!getToken()) return;
    loadBoards();
  }, 15000);
})();