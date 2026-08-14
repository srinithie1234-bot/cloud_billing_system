import Chart from 'chart.js/auto';
import { getBudgets, MONTHS, currentMonth } from '../db.js';
import { fmtINR, fmtPct, utilization, variance, overspendPct, statusFor } from '../utils.js';

let chart = null;

export async function renderFinops(root) {
  if (chart) { chart.destroy(); chart = null; }
  const budgets = await getBudgets();

  const rows = budgets.map((b) => {
    const v = variance(b.actual_budget, b.planned_budget);
    const u = utilization(b.actual_budget, b.planned_budget);
    const over = overspendPct(b.actual_budget, b.planned_budget);
    return { ...b, variance: v, util: u, over };
  });

  const latest = rows[rows.length - 1];

  root.innerHTML = `
    <div class="grid cards-4">
      <div class="card">
        <div class="label">Planned Cost</div>
        <div class="value">${fmtINR(latest.planned_budget)}</div>
        <div class="meta">${latest.month}</div>
        <div class="icon teal"><i class="bi bi-wallet2"></i></div>
      </div>
      <div class="card">
        <div class="label">Actual Cost</div>
        <div class="value">${fmtINR(latest.actual_budget)}</div>
        <div class="meta">${latest.month}</div>
        <div class="icon blue"><i class="bi bi-cash-stack"></i></div>
      </div>
      <div class="card">
        <div class="label">Variance</div>
        <div class="value ${latest.variance>0?'pos':'neg'}">${latest.variance>0?'+':''}${fmtINR(latest.variance)}</div>
        <div class="meta">Actual − Planned</div>
        <div class="icon ${latest.variance>0?'red':'green'}"><i class="bi bi-arrow-left-right"></i></div>
      </div>
      <div class="card">
        <div class="label">Overspending</div>
        <div class="value ${latest.over>0?'pos':'neg'}">${fmtPct(latest.over)}</div>
        <div class="meta">${latest.over>0?'over plan':'under plan'}</div>
        <div class="icon ${latest.over>0?'red':'green'}"><i class="bi bi-graph-down-arrow"></i></div>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><div><h3>Budget Utilization Trend</h3><div class="sub">Utilization % across 6 months</div></div></div>
      <div class="chart-wrap"><canvas id="utilChart"></canvas></div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><div><h3>FinOps Breakdown</h3><div class="sub">Per-month variance and utilization</div></div></div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>Month</th><th class="num">Planned</th><th class="num">Actual</th>
            <th class="num">Variance</th><th class="num">Utilization</th><th class="num">Overspend %</th><th>Status</th>
          </tr></thead>
          <tbody>
            ${rows.map((r) => {
              const st = statusFor(r.util);
              return `<tr>
                <td><b>${r.month}</b></td>
                <td class="num">${fmtINR(r.planned_budget)}</td>
                <td class="num">${fmtINR(r.actual_budget)}</td>
                <td class="num ${r.variance>0?'pos':'neg'}">${r.variance>0?'+':''}${fmtINR(r.variance)}</td>
                <td class="num">${fmtPct(r.util)}</td>
                <td class="num ${r.over>0?'pos':'neg'}">${r.over>0?'+':''}${fmtPct(r.over)}</td>
                <td><span class="badge ${st.cls}">${st.label}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><div><h3>FinOps Formulas</h3><div class="sub">How the metrics are computed</div></div></div>
      <div class="grid cards-3">
        <div class="card"><div class="label">Variance</div><div style="margin-top:10px;font-size:14px;color:var(--text-dim)">Actual Spending − Planned Budget</div></div>
        <div class="card"><div class="label">Budget Utilization</div><div style="margin-top:10px;font-size:14px;color:var(--text-dim)">(Actual Spending ÷ Planned Budget) × 100</div></div>
        <div class="card"><div class="label">Overspending %</div><div style="margin-top:10px;font-size:14px;color:var(--text-dim)">((Actual − Planned) ÷ Planned) × 100</div></div>
      </div>
    </div>
  `;

  const ctx = document.getElementById('utilChart');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: rows.map((r) => r.month),
      datasets: [{
        label: 'Budget Utilization %',
        data: rows.map((r) => r.util),
        borderColor: '#2dd4bf', backgroundColor: 'rgba(45,212,191,0.15)',
        fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#2dd4bf',
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#93a4c0', font: { family: 'Inter', size: 12 } } } },
      scales: {
        x: { ticks: { color: '#93a4c0' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: { ticks: { color: '#93a4c0', callback: (v) => v + '%' }, grid: { color: 'rgba(255,255,255,0.06)' }, suggestedMin: 80, suggestedMax: 120 },
      },
    },
  });
}
