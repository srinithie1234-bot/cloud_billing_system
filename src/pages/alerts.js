import { getAlerts } from '../db.js';

export async function renderAlerts(root) {
  const alerts = await getAlerts();
  const critical = alerts.filter((a) => a.severity === 'critical');
  const warning = alerts.filter((a) => a.severity === 'warning');
  const normal = alerts.filter((a) => a.severity === 'normal');

  const icon = (sev) => sev === 'critical' ? 'bi-exclamation-octagon-fill' : sev === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';

  root.innerHTML = `
    <div class="grid cards-3">
      <div class="card"><div class="label">Normal (≥80%)</div><div class="value" style="color:var(--info)">${normal.length}</div><div class="meta">Budget utilization reached 80%</div><div class="icon blue"><i class="bi bi-info-circle"></i></div></div>
      <div class="card"><div class="label">Warning (≥90%)</div><div class="value" style="color:var(--accent)">${warning.length}</div><div class="meta">Approaching budget limit</div><div class="icon amber"><i class="bi bi-exclamation-triangle"></i></div></div>
      <div class="card"><div class="label">Critical (≥100%)</div><div class="value" style="color:var(--error)">${critical.length}</div><div class="meta">Overspending / governance breach</div><div class="icon red"><i class="bi bi-exclamation-octagon"></i></div></div>
    </div>

    <div class="section-title"><i class="bi bi-bell"></i> Critical Alerts</div>
    <div class="panel">
      ${critical.map((a) => `
        <div class="alert-item critical">
          <div class="ai"><i class="bi ${icon(a.severity)}"></i></div>
          <div><div class="at">${a.alert_type} · ${a.severity}</div><div class="am">${a.message}</div></div>
        </div>`).join('') || '<div class="empty">No critical alerts</div>'}
    </div>

    <div class="section-title"><i class="bi bi-exclamation-triangle"></i> Warnings</div>
    <div class="panel">
      ${warning.map((a) => `
        <div class="alert-item warning">
          <div class="ai"><i class="bi ${icon(a.severity)}"></i></div>
          <div><div class="at">${a.alert_type} · ${a.severity}</div><div class="am">${a.message}</div></div>
        </div>`).join('') || '<div class="empty">No warnings</div>'}
    </div>

    <div class="section-title"><i class="bi bi-info-circle"></i> Normal</div>
    <div class="panel">
      ${normal.map((a) => `
        <div class="alert-item normal">
          <div class="ai"><i class="bi ${icon(a.severity)}"></i></div>
          <div><div class="at">${a.alert_type} · ${a.severity}</div><div class="am">${a.message}</div></div>
        </div>`).join('') || '<div class="empty">No normal alerts</div>'}
    </div>
  `;
}
