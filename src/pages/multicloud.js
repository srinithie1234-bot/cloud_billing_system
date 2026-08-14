import Chart from 'chart.js/auto';
import { getProviders, getBudgets, MONTHS, currentMonth } from '../db.js';
import { fmtINR, fmtPct, PROVIDER_COLORS } from '../utils.js';

let chart = null;

export async function renderMultiCloud(root) {
  if (chart) { chart.destroy(); chart = null; }
  const month = currentMonth();
  const providers = await getProviders(month);
  const allProviders = await getProviders();

  const totals = providers.map((p) => ({ name: p.provider, cost: Number(p.monthly_cost) }))
    .sort((a, b) => b.cost - a.cost);
  const totalSpend = totals.reduce((s, p) => s + p.cost, 0);
  const mostExpensive = totals[0];

  const byProvider = {};
  for (const p of allProviders) {
    byProvider[p.provider] = byProvider[p.provider] || [];
    byProvider[p.provider].push({ month: p.month, cost: Number(p.monthly_cost) });
  }

  root.innerHTML = `
    <div class="grid cards-3">
      <div class="card">
        <div class="label">Total Cloud Spend</div>
        <div class="value">${fmtINR(totalSpend)}</div>
        <div class="meta">${month}</div>
        <div class="icon teal"><i class="bi bi-clouds"></i></div>
      </div>
      <div class="card">
        <div class="label">Most Expensive Provider</div>
        <div class="value" style="font-size:22px"><span class="provider-dot" style="background:${PROVIDER_COLORS[mostExpensive.name]}"></span>${mostExpensive.name}</div>
        <div class="meta">${fmtINR(mostExpensive.cost)} · ${fmtPct((mostExpensive.cost/totalSpend)*100)} of total</div>
        <div class="icon amber"><i class="bi bi-trophy"></i></div>
      </div>
      <div class="card">
        <div class="label">Providers Tracked</div>
        <div class="value">${totals.length}</div>
        <div class="meta">AWS · Azure · GCP</div>
        <div class="icon blue"><i class="bi bi-hdd-network"></i></div>
      </div>
    </div>

    <div class="grid cards-2" style="margin-top:18px">
      <div class="panel">
        <div class="panel-head"><div><h3>Provider Distribution</h3><div class="sub">${month}</div></div></div>
        <div class="chart-wrap"><canvas id="pieMulti"></canvas></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>6-Month Provider Trend</h3><div class="sub">Monthly cost by provider</div></div></div>
        <div class="chart-wrap"><canvas id="lineMulti"></canvas></div>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><div><h3>Cloud Provider Ranking</h3><div class="sub">Sorted by cost (highest first) — ${month}</div></div></div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Rank</th><th>Provider</th><th class="num">Monthly Cost</th><th>Share</th><th>Distribution</th></tr></thead>
          <tbody>
            ${totals.map((p, i) => {
              const share = (p.cost/totalSpend)*100;
              const rankCls = i===0?'first':i===1?'second':i===2?'third':'';
              return `<tr>
                <td><span class="rank-badge ${rankCls}">${i+1}</span></td>
                <td><span class="provider-dot" style="background:${PROVIDER_COLORS[p.name]}"></span><b>${p.name}</b></td>
                <td class="num">${fmtINR(p.cost)}</td>
                <td>${fmtPct(share)}</td>
                <td><div class="bar" style="width:180px"><span class="teal" style="width:${share}%"></span></div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><div><h3>Provider Comparison</h3><div class="sub">Side-by-side monthly costs</div></div></div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Month</th>${totals.map((p)=>`<th class="num">${p.name}</th>`).join('')}<th class="num">Total</th></tr></thead>
          <tbody>
            ${MONTHS.map((m) => {
              const row = allProviders.filter((p)=>p.month===m);
              const sum = row.reduce((s,p)=>s+Number(p.monthly_cost),0);
              return `<tr><td><b>${m}</b></td>${['AWS','Azure','GCP'].map((name)=>{
                const p = row.find((r)=>r.provider===name);
                return `<td class="num">${p?fmtINR(p.monthly_cost):'—'}</td>`;
              }).join('')}<td class="num"><b>${fmtINR(sum)}</b></td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const pieCtx = document.getElementById('pieMulti');
  chart = new Chart(pieCtx, {
    type: 'pie',
    data: {
      labels: totals.map((p) => p.name),
      datasets: [{ data: totals.map((p) => p.cost), backgroundColor: totals.map((p) => PROVIDER_COLORS[p.name]), borderColor: '#0b1220', borderWidth: 2 }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#93a4c0', font: { family: 'Inter', size: 12 } } } } },
  });

  const lineCtx = document.getElementById('lineMulti');
  const datasets = Object.entries(byProvider).map(([name, arr]) => ({
    label: name,
    data: MONTHS.map((m) => { const r = arr.find((x) => x.month === m); return r ? r.cost : null; }),
    borderColor: PROVIDER_COLORS[name],
    backgroundColor: PROVIDER_COLORS[name] + '33',
    tension: 0.35, borderWidth: 2.5, pointRadius: 3,
  }));
  chart = new Chart(lineCtx, {
    type: 'line',
    data: { labels: MONTHS, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#93a4c0', font: { family: 'Inter', size: 12 } } } },
      scales: {
        x: { ticks: { color: '#93a4c0' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: { ticks: { color: '#93a4c0', callback: (v) => '₹' + (v/1000) + 'k' }, grid: { color: 'rgba(255,255,255,0.06)' } },
      },
    },
  });
}
