import { getSession, clearSession } from './auth.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderBudgets } from './pages/budgets.js';
import { renderFinops } from './pages/finops.js';
import { renderMultiCloud } from './pages/multicloud.js';
import { renderServices } from './pages/services.js';
import { renderGovernance } from './pages/governance.js';
import { renderRecommendations } from './pages/recommendations.js';
import { renderAlerts } from './pages/alerts.js';
import { renderProfile } from './pages/profile.js';

const NAV = [
  { section: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
  ]},
  { section: 'FinOps', items: [
    { id: 'budgets', label: 'Budget Management', icon: 'bi-wallet2' },
    { id: 'finops', label: 'FinOps Analysis', icon: 'bi-calculator' },
  ]},
  { section: 'Cloud Management', items: [
    { id: 'multicloud', label: 'Multi-Cloud', icon: 'bi-clouds' },
    { id: 'services', label: 'Service Costs', icon: 'bi-hdd-stack' },
  ]},
  { section: 'Governance & Insights', items: [
    { id: 'governance', label: 'Governance', icon: 'bi-shield-check' },
    { id: 'recommendations', label: 'Optimization', icon: 'bi-lightbulb' },
    { id: 'alerts', label: 'Alerts', icon: 'bi-bell' },
  ]},
  { section: 'Account', items: [
    { id: 'profile', label: 'Profile', icon: 'bi-person-circle' },
  ]},
];

const TITLES = {
  dashboard: { t: 'Dashboard', s: 'Cloud cost overview across providers and services' },
  budgets: { t: 'Budget Management', s: 'Plan, track and compare monthly cloud budgets' },
  finops: { t: 'FinOps Analysis', s: 'Variance, utilization and overspending metrics' },
  multicloud: { t: 'Multi-Cloud Management', s: 'Compare and rank AWS, Azure and GCP spend' },
  services: { t: 'Service-Level Cost Analysis', s: 'Planned vs actual cost by cloud service' },
  governance: { t: 'Governance', s: 'Policy thresholds and compliance status' },
  recommendations: { t: 'Cost Optimization', s: 'AI-style recommendations to reduce spend' },
  alerts: { t: 'Alerts', s: 'Budget, governance and service alerts' },
  profile: { t: 'Profile', s: 'Manage your account' },
};

let currentRoute = 'dashboard';

export function renderShell(root, session) {
  const navHtml = NAV.map((g) => `
    <div class="nav-section">${g.section}</div>
    ${g.items.map((i) => `
      <div class="nav-item" data-route="${i.id}">
        <i class="bi ${i.icon}"></i><span>${i.label}</span>
      </div>`).join('')}
  `).join('');

  root.innerHTML = `
    <div class="layout">
      <aside class="sidebar" id="sidebar">
        <div class="brand">
          <div class="logo"><i class="bi bi-cloud-fill"></i></div>
          <div>
            <div class="brand-name">CloudCost</div>
            <div class="brand-sub">FinOps & Governance</div>
          </div>
        </div>
        <nav class="nav">${navHtml}</nav>
        <div class="user">
          <div class="avatar">${(session.name || '?').charAt(0)}</div>
          <div>
            <div class="uname">${session.name}</div>
            <div class="urole">${session.role}</div>
          </div>
          <button class="btn-ghost" id="logoutBtn" style="margin-left:auto;padding:6px 10px" title="Logout"><i class="bi bi-box-arrow-right"></i></button>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div style="display:flex;align-items:center;gap:12px">
            <button class="hamburger" id="hamburger"><i class="bi bi-list"></i></button>
            <div>
              <div class="page-title" id="pageTitle">Dashboard</div>
              <div class="page-sub" id="pageSub">Cloud cost overview</div>
            </div>
          </div>
          <div class="right">
            <span class="badge normal"><i class="bi bi-circle-fill" style="font-size:8px;color:var(--success)"></i> Live data</span>
          </div>
        </header>
        <main class="content" id="content"></main>
      </div>
    </div>
  `;

  document.querySelectorAll('.nav-item').forEach((el) => {
    el.addEventListener('click', () => {
      const r = el.getAttribute('data-route');
      location.hash = r;
      navigate(r);
      document.getElementById('sidebar').classList.remove('open');
      document.querySelector('.scrim')?.remove();
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearSession();
    location.hash = '';
    location.reload();
  });

  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    let scrim = document.querySelector('.scrim');
    if (!scrim) {
      scrim = document.createElement('div');
      scrim.className = 'scrim';
      scrim.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
        scrim.remove();
      });
      document.body.appendChild(scrim);
    }
  });
}

export function navigate(route) {
  const r = route || 'dashboard';
  currentRoute = r;
  const meta = TITLES[r] || TITLES.dashboard;
  document.getElementById('pageTitle').textContent = meta.t;
  document.getElementById('pageSub').textContent = meta.s;
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('data-route') === r);
  });
  const content = document.getElementById('content');
  content.innerHTML = `<div class="spinner"></div>`;
  const session = getSession();
  const pages = {
    dashboard: renderDashboard,
    budgets: renderBudgets,
    finops: renderFinops,
    multicloud: renderMultiCloud,
    services: renderServices,
    governance: renderGovernance,
    recommendations: renderRecommendations,
    alerts: renderAlerts,
    profile: renderProfile,
  };
  const fn = pages[r] || pages.dashboard;
  Promise.resolve(fn(content, session)).catch((e) => {
    content.innerHTML = `<div class="empty">Failed to load: ${e.message}</div>`;
  });
}

export function currentRouteName() { return currentRoute; }
