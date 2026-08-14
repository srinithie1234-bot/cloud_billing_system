import { getRecommendations, getServices, currentMonth } from '../db.js';
import { fmtINR, overspendPct } from '../utils.js';

const CATEGORY_ICONS = {
  compute: 'bi-cpu', storage: 'bi-database', network: 'bi-broadcast',
  'idle-vm': 'bi-power', database: 'bi-database-fill',
};

export async function renderRecommendations(root) {
  const recs = await getRecommendations();
  const month = currentMonth();
  const services = await getServices(month);

  const overServices = services
    .map((s) => ({ name: s.service, over: overspendPct(s.actual_cost, s.planned_cost), actual: Number(s.actual_cost), planned: Number(s.planned_cost) }))
    .filter((s) => s.over > 0)
    .sort((a, b) => b.over - a.over);

  root.innerHTML = `
    <div class="panel" style="margin-bottom:18px">
      <div class="panel-head"><div><h3>Optimization Engine</h3><div class="sub">Recommendations generated from spending analysis — ${month}</div></div></div>
      <div style="font-size:13px;color:var(--text-dim);line-height:1.6">
        The engine analyzes service-level spending against plan and governance signals to surface cost-saving actions.
        Rules applied: rising compute → Reserved Instances + Auto Scaling; rising storage → Cold storage + Lifecycle policies;
        idle VMs → Instance termination; rising network → Caching + CDN optimization.
      </div>
    </div>

    <div class="section-title"><i class="bi bi-lightbulb"></i> Active Recommendations (${recs.length})</div>
    <div class="grid cards-2">
      ${recs.map((r) => `
        <div class="rec-item">
          <div class="ri"><i class="bi ${CATEGORY_ICONS[r.category]||'bi-lightbulb'}"></i></div>
          <div>
            <div class="rt">${r.category}</div>
            <div class="rm">${r.recommendation}</div>
            <div class="rcat">${r.category}</div>
          </div>
        </div>`).join('') || '<div class="empty">No recommendations — all services within plan.</div>'}
    </div>

    <div class="section-title"><i class="bi bi-graph-down-arrow"></i> Services Over Plan</div>
    <div class="panel">
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Service</th><th class="num">Planned</th><th class="num">Actual</th><th class="num">Overspend %</th><th>Recommended Action</th></tr></thead>
          <tbody>
            ${overServices.map((s) => {
              let action = 'Monitor spend.';
              if (s.name === 'Compute') action = 'Adopt Reserved Instances and Auto Scaling.';
              else if (s.name === 'Storage') action = 'Move cold data to archival storage; apply lifecycle policies.';
              else if (s.name === 'Network') action = 'Introduce caching and CDN optimization.';
              else if (s.name === 'Database') action = 'Right-size instances; review reserved capacity.';
              else if (s.name === 'Backup') action = 'Review retention policies; tier older backups.';
              else if (s.name === 'Monitoring') action = 'Sample metrics; reduce verbose logging.';
              return `<tr>
                <td><b>${s.name}</b></td>
                <td class="num">${fmtINR(s.planned)}</td>
                <td class="num">${fmtINR(s.actual)}</td>
                <td class="num pos">+${s.over.toFixed(1)}%</td>
                <td style="color:var(--primary)">${action}</td>
              </tr>`;
            }).join('') || '<tr><td colspan="5" class="empty">No services over plan</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="section-title"><i class="bi bi-book"></i> Optimization Rulebook</div>
    <div class="grid cards-2">
      <div class="card"><div class="label">Compute spending increases</div><div style="margin-top:10px;font-size:14px">Recommend <b>Reserved Instances</b> and <b>Auto Scaling</b>.</div></div>
      <div class="card"><div class="label">Storage spending increases</div><div style="margin-top:10px;font-size:14px">Recommend <b>Cold Storage</b> and <b>Data Lifecycle Policies</b>.</div></div>
      <div class="card"><div class="label">Idle VMs detected</div><div style="margin-top:10px;font-size:14px">Recommend <b>Instance Termination</b>.</div></div>
      <div class="card"><div class="label">Network spending increases</div><div style="margin-top:10px;font-size:14px">Recommend <b>Caching</b> and <b>CDN Optimization</b>.</div></div>
    </div>
  `;
}
