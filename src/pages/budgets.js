import Chart from 'chart.js/auto';
import { getBudgets, exec, query } from '../db.js';
import { refreshEngines } from '../auth.js';
import { fmtINR, fmtPct, utilization, variance, statusFor, toast } from '../utils.js';

let chart = null;

export async function renderBudgets(root, session) {
  if (chart) { chart.destroy(); chart = null; }
  await load(root, session);
}

async function load(root, session) {
  const budgets = await getBudgets();
  const isAdmin = session?.role === 'admin';

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
      <div><h3 style="font-size:18px">Monthly Budgets</h3><div class="muted" style="font-size:13px">Plan, track and compare cloud budgets</div></div>
      ${isAdmin ? `<button class="btn-primary" style="width:auto" id="addBudget"><i class="bi bi-plus-lg"></i> Add Budget</button>` : ''}
    </div>

    <div class="panel" style="margin-bottom:18px">
      <div class="panel-head"><div><h3>Historical Comparison</h3><div class="sub">Planned vs actual across 6 months</div></div></div>
      <div class="chart-wrap"><canvas id="histChart"></canvas></div>
    </div>

    <div class="panel">
      <div class="panel-head"><div><h3>Budget Records</h3></div></div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>Month</th><th class="num">Planned Budget</th><th class="num">Actual Spending</th>
            <th class="num">Variance</th><th>Budget Utilization</th><th>Status</th>${isAdmin?'<th>Actions</th>':''}
          </tr></thead>
          <tbody>
            ${budgets.map((b) => {
              const u = utilization(b.actual_budget, b.planned_budget);
              const v = variance(b.actual_budget, b.planned_budget);
              const st = statusFor(u);
              return `<tr>
                <td><b>${b.month}</b></td>
                <td class="num">${fmtINR(b.planned_budget)}</td>
                <td class="num">${fmtINR(b.actual_budget)}</td>
                <td class="num ${v>0?'pos':'neg'}">${v>0?'+':''}${fmtINR(v)}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div class="bar" style="width:100px"><span class="${u>=100?'red':u>=90?'amber':'teal'}" style="width:${Math.min(u,100)}%"></span></div>
                    <span style="font-size:12px">${fmtPct(u)}</span>
                  </div>
                </td>
                <td><span class="badge ${st.cls}">${st.label}</span></td>
                ${isAdmin?`<td><button class="btn-ghost" data-edit="${b.id}" style="padding:6px 10px"><i class="bi bi-pencil"></i></button> <button class="btn-danger" data-del="${b.id}" style="padding:6px 10px"><i class="bi bi-trash"></i></button></td>`:''}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const histCtx = document.getElementById('histChart');
  chart = new Chart(histCtx, {
    type: 'bar',
    data: {
      labels: budgets.map((b) => b.month),
      datasets: [
        { label: 'Planned', data: budgets.map((b) => Number(b.planned_budget)), backgroundColor: 'rgba(56,189,248,0.7)', borderRadius: 6 },
        { label: 'Actual', data: budgets.map((b) => Number(b.actual_budget)), backgroundColor: 'rgba(45,212,191,0.85)', borderRadius: 6 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#93a4c0', font: { family: 'Inter', size: 12 } } } },
      scales: {
        x: { ticks: { color: '#93a4c0' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: { ticks: { color: '#93a4c0', callback: (v) => '₹' + (v/1000) + 'k' }, grid: { color: 'rgba(255,255,255,0.06)' } },
      },
    },
  });

  if (isAdmin) {
    document.getElementById('addBudget').addEventListener('click', () => openModal(root, session, null));
    document.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-edit');
      const rows = await query('SELECT * FROM budget WHERE id = $1', [id]);
      openModal(root, session, rows[0]);
    }));
    document.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-del');
      if (!confirm('Delete this budget record?')) return;
      await exec('DELETE FROM budget WHERE id = $1', [id]);
      await refreshEngines();
      toast('Budget deleted', 'warn');
      await load(root, session);
    }));
  }
}

function openModal(root, session, budget) {
  const existing = document.querySelector('.modal-backdrop');
  if (existing) existing.remove();

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h3>${budget ? 'Edit Budget' : 'Add Budget'}</h3>
      <div class="sub">Set planned and actual spending for a month</div>
      <form id="budgetForm">
        <div class="form-grid">
          <div class="field"><label>Month</label>
            <select id="fMonth" required>
              ${months.map((m) => `<option value="${m}" ${budget && budget.month===m?'selected':''}>${m}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Planned Budget (₹)</label><input id="fPlanned" type="number" min="0" value="${budget?budget.planned_budget:''}" required /></div>
          <div class="field full"><label>Actual Spending (₹)</label><input id="fActual" type="number" min="0" value="${budget?budget.actual_budget:''}" required /></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-ghost" id="cancelBtn">Cancel</button>
          <button type="submit" class="btn-primary" style="width:auto">${budget?'Save Changes':'Add Budget'}</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  document.getElementById('cancelBtn').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

  document.getElementById('budgetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const month = document.getElementById('fMonth').value;
    const planned = Number(document.getElementById('fPlanned').value);
    const actual = Number(document.getElementById('fActual').value);
    if (budget) {
      await exec('UPDATE budget SET month=$1, planned_budget=$2, actual_budget=$3 WHERE id=$4', [month, planned, actual, budget.id]);
      toast('Budget updated');
    } else {
      await exec('INSERT INTO budget (month, planned_budget, actual_budget) VALUES ($1,$2,$3)', [month, planned, actual]);
      toast('Budget added');
    }
    await refreshEngines();
    close();
    await load(root, session);
  });
}
