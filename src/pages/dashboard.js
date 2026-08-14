import Chart from 'chart.js/auto';
import {
  getDashboardSummary, getBudgets, getProviders, getServices, MONTHS, currentMonth,
} from '../db.js';
import {
  fmtINR, fmtPct, utilization, variance, statusFor, PROVIDER_COLORS, SERVICE_COLORS,
} from '../utils.js';

let charts = [];
function destroyCharts() { charts.forEach((c) => c.destroy()); charts = []; }

const chartTheme = {
  color: '#93a4c0',
  grid: 'rgba(255,255,255,0.06)',
  font: { family: 'Inter', size: 12 },
};

export async function renderDashboard(root, session) {
  destroyCharts();
  const data = await getDashboardSummary();
  const allBudgets = await getBudgets();
  const allProviders = await getProviders();
  const allServices = await getServices();

  const { budget, providers, services, alerts, recommendations } = data;
  const planned = Number(budget.planned_budget);
  const actual = Number(budget.actual_budget);
  const util = utilization(actual, planned);
  const varAmt = variance(actual, planned);
  const status = statusFor(util);

  const providerTotals = providers.map((p) => ({ name: p.provider, cost: Number(p.monthly_cost) }));
  const serviceTotals = services.map((s) => ({ name: s.service, planned: Number(s.planned_cost), actual: Number(s.actual_cost) }));

  const critical = alerts.filter((a) => a.severity === 'critical');
  const warning = alerts.filter((a) => a.severity === 'warning');

  root.innerHTML = `
    <div class="grid cards-5">
      <div class="card">
        <div class="label">Monthly Budget</div>
        <div class="value">${fmtINR(planned)}</div>
        <div class="meta">${data.month}</div>
        <div class="icon teal"><i class="bi bi-wallet2"></i></div>
      </div>
      <div class="card">
        <div class="label">Actual Spending</div>
        <div class="value">${fmtINR(actual)}</div>
        <div class="meta">${fmtINR(varAmt)} vs plan</div>
        <div class="icon blue"><i class="bi bi-cash-stack"></i></div>
      </div>
      <div class="card">
        <div class="label">Budget Utilization</div>
        <div class="value">${fmtPct(util)}</div>
        <div class="meta"><div class="bar" style="margin-top:8px"><span class="${util>=100?'red':util>=90?'amber':'teal'}" style="width:${Math.min(util,100)}%"></span></div></div>
        <div class="icon ${util>=100?'red':util>=90?'amber':'green'}"><i class="bi bi-graph-up"></i></div>
      </div>
      <div class="card">
        <div class="label">Overspending</div>
        <div class="value ${varAmt>0?'pos':'neg'}">${fmtINR(Math.abs(varAmt))}</div>
        <div class="meta">${varAmt>0?'Over budget':'Under budget'}</div>
        <div class="icon ${varAmt>0?'red':'green'}"><i class="bi bi-exclamation-triangle"></i></div>
      </div>
      <div class="card">
        <div class="label">Status</div>
        <div class="value" style="font-size:20px;margin-top:12px"><span class="badge ${status.cls}">${status.label}</span></div>
        <div class="meta">${critical.length} critical · ${warning.length} warnings</div>
        <div class="icon ${status.cls==='critical'?'red':status.cls==='warning'?'amber':'green'}"><i class="bi bi-activity"></i></div>
      </div>
    </div>

    <div class="grid cards-3" style="margin-top:18px">
      <div class="panel">
        <div class="panel-head"><div><h3>Cloud Provider Distribution</h3><div class="sub">Spend share — ${data.month}</div></div></div>
        <div class="chart-wrap"><canvas id="pieProviders"></canvas></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>Planned vs Actual Spending</h3><div class="sub">6-month comparison</div></div></div>
        <div class="chart-wrap"><canvas id="barBudget"></canvas></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>Spending Trend</h3><div class="sub">6-month actual spend</div></div></div>
        <div class="chart-wrap"><canvas id="lineTrend"></canvas></div>
      </div>
    </div>

    <div class="grid cards-2" style="margin-top:18px">
      <div class="panel">
        <div class="panel-head"><div><h3>Service-Level Cost Distribution</h3><div class="sub">Actual cost by service — ${data.month}</div></div></div>
        <div class="chart-wrap"><canvas id="doughnutServices"></canvas></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>Provider Spend</h3><div class="sub">${data.month}</div></div></div>
        <div class="table-wrap">
          <table class="data">
            <thead><tr><th>Provider</th><th class="num">Spend</th><th>Share</th></tr></thead>
            <tbody>
              ${providerTotals.map((p) => {
                const share = (p.cost / actual) * 100;
                return `<tr><td><span class="provider-dot" style="background:${PROVIDER_COLORS[p.name]||'#888'}"></span>${p.name}</td>
                <td class="num">${fmtINR(p.cost)}</td>
                <td><div class="bar" style="width:120px"><span class="teal" style="width:${share}%"></span></div></td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="grid cards-2" style="margin-top:18px">
      <div class="panel">
        <div class="panel-head"><div><h3>Service Spending</h3><div class="sub">${data.month}</div></div></div>
        <div class="table-wrap">
          <table class="data">
            <thead><tr><th>Service</th><th class="num">Planned</th><th class="num">Actual</th><th class="num">Variance</th></tr></thead>
            <tbody>
              ${serviceTotals.map((s) => {
                const v = s.actual - s.planned;
                return `<tr><td><span class="provider-dot" style="background:${SERVICE_COLORS[s.name]||'#888'}"></span>${s.name}</td>
                <td class="num">${fmtINR(s.planned)}</td>
                <td class="num">${fmtINR(s.actual)}</td>
                <td class="num ${v>0?'pos':'neg'}">${v>0?'+':''}${fmtINR(v)}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>Active Alerts</h3><div class="sub">${alerts.length} total · ${critical.length} critical</div></div></div>
        <div style="max-height:320px;overflow-y:auto">
          ${alerts.slice(0, 8).map((a) => `
            <div class="alert-item ${a.severity}">
              <div class="ai"><i class="bi ${a.severity==='critical'?'bi-exclamation-octagon-fill':a.severity==='warning'?'bi-exclamation-triangle-fill':'bi-info-circle-fill'}"></i></div>
              <div><div class="at">${a.alert_type} · ${a.severity}</div><div class="am">${a.message}</div></div>
            </div>`).join('') || '<div class="empty">No active alerts</div>'}
        </div>
      </div>
    </div>

    <div class="section-title"><i class="bi bi-lightbulb"></i> Cost Optimization Recommendations</div>
    <div class="grid cards-2">
      ${recommendations.slice(0, 4).map((r) => `
        <div class="rec-item">
          <div class="ri"><i class="bi bi-lightbulb"></i></div>
          <div><div class="rt">${r.category}</div><div class="rm">${r.recommendation}</div><div class="rcat">${r.category}</div></div>
        </div>`).join('') || '<div class="empty">No recommendations</div>'}
    </div>
  `;

  // ---- Charts ----
  const pieCtx = document.getElementById('pieProviders');
  charts.push(new Chart(pieCtx, {
    type: 'pie',
    data: {
      labels: providerTotals.map((p) => p.name),
      datasets: [{
        data: providerTotals.map((p) => p.cost),
        backgroundColor: providerTotals.map((p) => PROVIDER_COLORS[p.name] || '#888'),
        borderColor: '#0b1220', borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: chartTheme.color, font: chartTheme.font } } },
    },
  }));

  const barCtx = document.getElementById('barBudget');
  charts.push(new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: allBudgets.map((b) => b.month),
      datasets: [
        { label: 'Planned', data: allBudgets.map((b) => Number(b.planned_budget)), backgroundColor: 'rgba(56,189,248,0.7)', borderRadius: 6 },
        { label: 'Actual', data: allBudgets.map((b) => Number(b.actual_budget)), backgroundColor: 'rgba(45,212,191,0.85)', borderRadius: 6 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: chartTheme.color, font: chartTheme.font } } },
      scales: {
        x: { ticks: { color: chartTheme.color, font: chartTheme.font }, grid: { color: chartTheme.grid } },
        y: { ticks: { color: chartTheme.color, font: chartTheme.font, callback: (v) => '₹' + (v/1000) + 'k' }, grid: { color: chartTheme.grid } },
      },
    },
  }));

  const lineCtx = document.getElementById('lineTrend');
  charts.push(new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: allBudgets.map((b) => b.month),
      datasets: [{
        label: 'Actual Spend',
        data: allBudgets.map((b) => Number(b.actual_budget)),
        borderColor: '#2dd4bf', backgroundColor: 'rgba(45,212,191,0.15)',
        fill: true, tension: 0.35, borderWidth: 2.5, pointBackgroundColor: '#2dd4bf', pointRadius: 4,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: chartTheme.color, font: chartTheme.font } } },
      scales: {
        x: { ticks: { color: chartTheme.color, font: chartTheme.font }, grid: { color: chartTheme.grid } },
        y: { ticks: { color: chartTheme.color, font: chartTheme.font, callback: (v) => '₹' + (v/1000) + 'k' }, grid: { color: chartTheme.grid } },
      },
    },
  }));

  const doughCtx = document.getElementById('doughnutServices');
  charts.push(new Chart(doughCtx, {
    type: 'doughnut',
    data: {
      labels: serviceTotals.map((s) => s.name),
      datasets: [{
        data: serviceTotals.map((s) => s.actual),
        backgroundColor: serviceTotals.map((s) => SERVICE_COLORS[s.name] || '#888'),
        borderColor: '#0b1220', borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      plugins: { legend: { position: 'right', labels: { color: chartTheme.color, font: chartTheme.font } } },
    },
  }));
}
