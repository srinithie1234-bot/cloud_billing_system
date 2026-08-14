import { initDb } from './db.js';
import { renderLogin } from './pages/login.js';
import { renderShell, navigate } from './shell.js';
import { getSession } from './auth.js';

async function boot() {
  const root = document.getElementById('app');
  root.innerHTML = `<div class="center-load"><div class="spinner"></div></div>`;
  try {
    await initDb();
  } catch (e) {
    root.innerHTML = `<div class="center-load"><div style="text-align:center;color:var(--text-dim)">Failed to initialize database.<br/><small>${e.message}</small></div></div>`;
    return;
  }

  const session = getSession();
  if (!session) {
    renderLogin(root);
    return;
  }
  renderShell(root, session);
  navigate('dashboard');
}

window.addEventListener('hashchange', () => {
  const route = location.hash.replace('#', '') || 'dashboard';
  if (getSession()) navigate(route);
});

boot();
