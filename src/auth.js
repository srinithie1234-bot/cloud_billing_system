import { query, exec, regenerateAlerts, regenerateRecommendations, getDb } from './db.js';

const SESSION_KEY = 'ccops.session';

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function setSession(s) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function login(email, password) {
  const rows = await query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
  if (!rows.length) return null;
  const u = rows[0];
  const session = { id: u.id, name: u.name, email: u.email, role: u.role };
  setSession(session);
  return session;
}

export async function updateProfile(id, { name, email, password }) {
  if (password) {
    await exec('UPDATE users SET name = $1, email = $2, password = $3 WHERE id = $4', [name, email, password, id]);
  } else {
    await exec('UPDATE users SET name = $1, email = $2 WHERE id = $3', [name, email, id]);
  }
  const session = getSession();
  if (session && session.id === id) {
    setSession({ ...session, name, email });
  }
}

export async function refreshEngines() {
  const db = getDb();
  await regenerateAlerts(db);
  await regenerateRecommendations(db);
}
