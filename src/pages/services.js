import Chart from 'chart.js/auto';
import { getServices, MONTHS, currentMonth } from '../db.js';
import { fmtINR, fmtPct, variance, overspendPct, SERVICE_COLORS } from '../utils.js';

let chart = null;

export async function renderServices(root) {
  if (chart) { chart.destroy(); chart = null; }
  const month = currentMonth();
  const services = await getServices(month);
  const allServices = await getServices();

  const rows = services.map((s) => {
    const v = variance(s.actual_cost, s.planned_cost);
    const over = overspendPct(s.actual_cost, s.planned_cost);
    return { name: s.service, planned: Number(s.planned_cost), actual: Number(s.actual_cost), variance: v, over };
  }).sort((a, b) => b.actual - a.actual);

  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const totalPlanned = rows.reduce((s, r) => s + r.planned, 0);
  const overspendService = [...rows].sort((a, b) => b.over - a.over)[0];

  const byService = {};
  for (const s of allServices) {
    byService[s.service] = byService[s.service] || [];
    byService[s.service].push({ month: s.month, actual: Number(s.actual_cost), planned: Number(s.planned_cost) });
  }

  root.innerHTML = `
    <div class="grid cards-4">
      <div class="card">
        <div class="label">Total Service Spend</div>
        <div class="value">${fmtINR(totalActual)}</div>
        <div class="meta">${month}</div>
        <div class="icon teal"><i class="bi bi-hdd-stack"></i></div>
      </div>
      <div class="card">
        <div class="label">Planned Spend</div>
        <div class="value">${fmtINR(totalPlanned)}</div>
        <div class="meta">${month}</div>
        <div class="icon blue"><i class="bi bi-wallet2"></i></div>
      </div>
      <div class="card">
        <div class="label">Top Service</div>
        <div class="value" style="font-size:20px">${rows[0].name}</div>
        <div class="meta">${fmtINR(rows[0].actual)}</div>
        <div class="icon amber"><i class="bi bi-trophy"></i></div>
      </div>
      <div class="card">
        <div class="label">Overspending Service</div>
        <div class="value" style="font-size:20px;color:var(--error)">${overspendService.name}</div>
        <div class="meta">${fmtPct(overspendService.over)} over plan</div>
        <div class="icon red"><i class="bi bi-exclamation-triangle"></i></div>
      </div>
    </div>

    <div class="grid cards-2" style="margin-top:18px">
      <div class="panel">
        <div class="panel-head"><div><h3>Service Cost Distribution</h3><div class="sub">Actual spend — ${month}</div></div></div>
        <div class="chart-wrap"><canvas id="doughnutSvc"></canvas></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>Planned vs Actual by Service</h3><div class="sub">${month}</div></div></div>
        <div class="chart-wrap"><canvas id="barSvc"></canvas></div>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><div><h3>Service Ranking</h3><div class="sub">Sorted by actual cost — ${month}</div></div></div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Rank</th><th>Service</th><th class="num">Planned</th><th class="num">Actual</th><th class="num">Variance</th><th class="num">Overspend %</th><th>Status</th></tr></thead>
          <tbody>
            ${rows.map((r, i) => {
              const rankCls = i===0?'first':i===1?'second':i===2?'third':'';
              const st = r.variance>0?'critical':'success';
              return `<tr>
                <td><span class="rank-badge ${rankCls}">${i+1}</span></td>
                <td><span class="provider-dot" style="background:${SERVICE_COLORS[r.name]}"></span><b>${r.name}</b></td>
                <td class="num">${fmtINR(r.planned)}</td>
                <td class="num">${fmtINR(r.actual)}</td>
                <td class="num ${r.variance>0?'pos':'neg'}">${r.variance>0?'+':''}${fmtINR(r.variance)}</td>
                <td class="num ${r.over>0?'pos':'neg'}">${r.over>0?'+':''}${fmtPct(r.over)}</td>
                <td><span class="badge ${st}">${r.variance>0?'Over plan':'On plan'}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><div><h3>6-Month Service Trend</h3><div class="sub">Actual cost by service</div></div></div>
      <div class="chart-wrap"><canvas id="lineSvc"></canvas></div>
    </div>
  `;

  const doughCtx = document.getElementById('doughnutSvc');
  chart = new Chart(doughCtx, {
    type: 'doughnut',
    data: { labels: rows.map((r) => r.name), datasets: [{ data: rows.map((r) => r.actual), backgroundColor: rows.map((r) => SERVICE_COLORS[r.name]), borderColor: '#0b1220', borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'right', labels: { color: '#93a4c0', font: { family: 'Inter', size: 12 } } } } },
  });

  const barCtx = document.getElementById('barSvc');
  chart = new Chart(barCtx, {
    type: 'bar',
    data: { labels: rows.map((r) => r.name), datasets: [
      { label: 'Planned', data: rows.map((r) => r.planned), backgroundColor: 'rgba(56,189,248,0.7)', borderRadius: 6 },
      { label: 'Actual', data: rows.map((r) => r.actual), backgroundColor: 'rgba(45,212,191,0.85)', borderRadius: 6 },
    ]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#93a4c0', font: { family: 'Inter', size: 12 } } } },
      scales: { x: { ticks: { color: '#93a4c0' }, grid: { color: 'rgba(255,255,255,0.06)' } }, y: { ticks: { color: '#93a4c0', callback: (v) => '₹' + (v/1000) + 'k' }, grid: { color: 'rgba(255,255,255,0.06)' } } } },
  });

  const lineCtx = document.getElementById('lineSvc');
  const datasets = Object.entries(byService).map(([name, arr]) => ({
    label: name,
    data: MONTHS.map((m) => { const r = arr.find((x) => x.month === m); return r ? r.actual : null; }),
    borderColor: SERVICE_COLORS[name], backgroundColor: SERVICE_COLORS[name] + '33',
    tension: 0.35, borderWidth: 2.5, pointRadius: 3,
  }));
  chart = new Chart(lineCtx, {
    type: 'line',
    data: { labels: MONTHS, datasets },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#93a4c0', font: { family: 'Inter', size: 12 } } } },
      scales: { x: { ticks: { color: '#93a4c0' }, grid: { color: 'rgba(255,255,255,0.06)' } }, y: { ticks: { color: '#93a4c0', callback: (v) => '₹' + (v/1000) + 'k' }, grid: { color: 'rgba(255,255,255,0.06)' } } } },
  });
}
