import { login } from '../auth.js';
import { toast } from '../utils.js';

export function renderLogin(root) {
  root.innerHTML = `
    <div class="login-wrap">
      <div class="login-hero">
        <div class="brand">
          <div class="logo"><i class="bi bi-cloud-fill"></i></div>
          <div>
            <div class="brand-name" style="font-family:'Space Grotesk';font-weight:700;font-size:18px">Integrated Cloud Cost Optimization</div>
            <div class="brand-sub">FinOps · Multi-Cloud · Governance</div>
          </div>
        </div>
        <h1>Take control of every rupee spent across AWS, Azure & GCP.</h1>
        <p>A unified FinOps platform for budget management, cost optimization, multi-cloud comparison and governance policy enforcement — built for the Cloud Optimization Tools and Techniques assessment.</p>
        <div class="feat">
          <span class="chip"><i class="bi bi-graph-up"></i> FinOps Analysis</span>
          <span class="chip"><i class="bi bi-clouds"></i> Multi-Cloud</span>
          <span class="chip"><i class="bi bi-shield-check"></i> Governance</span>
          <span class="chip"><i class="bi bi-lightbulb"></i> Optimization</span>
        </div>
      </div>
      <div class="login-form">
        <div class="login-card">
          <h2>Welcome back</h2>
          <div class="sub">Sign in to your FinOps dashboard</div>
          <div id="loginError"></div>
          <form id="loginForm">
            <div class="field">
              <label>Email address</label>
              <input type="email" id="email" placeholder="you@cloudops.io" required autocomplete="username" />
            </div>
            <div class="field">
              <label>Password</label>
              <input type="password" id="password" placeholder="••••••••" required autocomplete="current-password" />
            </div>
            <button type="submit" class="btn-primary">Sign in <i class="bi bi-arrow-right" style="margin-left:6px"></i></button>
          </form>
          <div class="login-hint">
            Demo accounts — Admin: <b>admin@cloudops.io / admin123</b><br/>
            Analyst: <b>finops@cloudops.io / finops123</b>
          </div>
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById('loginForm');
  const errBox = document.getElementById('loginError');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    errBox.innerHTML = '';
    try {
      const session = await login(email, password);
      if (!session) {
        errBox.innerHTML = '<div class="login-error">Invalid email or password. Try the demo accounts below.</div>';
        return;
      }
      toast(`Welcome, ${session.name.split(' ')[0]}!`);
      setTimeout(() => location.reload(), 400);
    } catch (err) {
      errBox.innerHTML = `<div class="login-error">Sign-in failed: ${err.message}</div>`;
    }
  });
}
