//CHATGPT
import fetch from 'node-fetch'; // Node 18+ can use native fetch

// --- Config ---
const AUTH_API = 'https://virtual-board-auth-api.onrender.com/api';
const NOTES_API = 'https://virtual-board-repo2.onrender.com/notes';

// --- Replace these with a valid test account ---
const username = 'Ben';
const password = 'BenBen';

async function main() {
  try {
    // 1. Log in
    const loginRes = await fetch(`${AUTH_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(loginData.error || 'Login failed');

    const token = loginData.token;
    console.log('Logged in. JWT token:', token);

    // 2. Fetch notes
    const notesRes = await fetch(NOTES_API, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const notesData = await notesRes.json();
    console.log('Fetched notes:', notesData);

  } catch (err) {
    console.error('Error:', err);
  }
}

main();
