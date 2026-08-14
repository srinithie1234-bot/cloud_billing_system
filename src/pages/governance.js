import { getGovernance, exec, query } from '../db.js';
import { refreshEngines } from '../auth.js';
import { fmtINR, fmtPct, toast } from '../utils.js';

export async function renderGovernance(root, session) {
  await load(root, session);
}

async function load(root, session) {
  const gov = await getGovernance();
  const isAdmin = session?.role === 'admin';

  const rows = gov.map((g) => {
    const usage = Number(g.current_usage);
    const threshold = Number(g.threshold);
    const ratio = usage / threshold;
    const violated = usage > threshold;
    const near = !violated && ratio >= 0.9;
    return { ...g, usage, threshold, ratio, violated, near };
  });

  const violatedCount = rows.filter((r) => r.violated).length;
  const nearCount = rows.filter((r) => r.near).length;

  root.innerHTML = `
    <div class="grid cards-3">
      <div class="card">
        <div class="label">Policies Enforced</div>
        <div class="value">${rows.length}</div>
        <div class="meta">VM · Storage · Database</div>
        <div class="icon teal"><i class="bi bi-shield-check"></i></div>
      </div>
      <div class="card">
        <div class="label">Violations</div>
        <div class="value" style="color:var(--error)">${violatedCount}</div>
        <div class="meta">Threshold exceeded</div>
        <div class="icon red"><i class="bi bi-exclamation-octagon"></i></div>
      </div>
      <div class="card">
        <div class="label">Near Limit</div>
        <div class="value" style="color:var(--accent)">${nearCount}</div>
        <div class="meta">≥ 90% of threshold</div>
        <div class="icon amber"><i class="bi bi-exclamation-triangle"></i></div>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><div><h3>Governance Policies</h3><div class="sub">Thresholds and current usage</div></div>
        ${isAdmin ? `<button class="btn-primary" style="width:auto" id="addPolicy"><i class="bi bi-plus-lg"></i> Add Policy</button>` : ''}
      </div>
      <div class="grid cards-3">
        ${rows.map((r) => `
          <div class="card" style="${r.violated?'border-color:rgba(239,68,68,0.4)':''}">
            <div style="display:flex;justify-content:space-between;align-items:start">
              <div>
                <div class="label">${r.policy_name}</div>
                <div style="font-size:13px;color:var(--text-dim);margin-top:6px">Threshold: <b style="color:var(--text)">${r.threshold}</b></div>
                <div style="font-size:13px;color:var(--text-dim)">Current: <b style="color:${r.violated?'var(--error)':'var(--text)'}">${r.usage}</b></div>
              </div>
              ${r.violated ? '<span class="badge critical">Violated</span>' : r.near ? '<span class="badge warning">Near limit</span>' : '<span class="badge success">Compliant</span>'}
            </div>
            <div class="bar" style="margin-top:14px"><span class="${r.violated?'red':r.near?'amber':'green'}" style="width:${Math.min(r.ratio*100,100)}%"></span></div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:6px">${fmtPct(r.ratio*100)} of threshold</div>
            ${isAdmin ? `<div style="margin-top:12px;display:flex;gap:8px">
              <button class="btn-ghost" data-edit="${r.id}" style="padding:6px 10px;font-size:12px"><i class="bi bi-pencil"></i> Edit</button>
              <button class="btn-danger" data-del="${r.id}" style="padding:6px 10px;font-size:12px"><i class="bi bi-trash"></i></button>
            </div>` : ''}
          </div>`).join('')}
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><div><h3>Governance Alerts</h3><div class="sub">Generated from policy violations</div></div></div>
      ${rows.filter((r)=>r.violated).map((r) => `
        <div class="alert-item critical">
          <div class="ai"><i class="bi bi-exclamation-octagon-fill"></i></div>
          <div><div class="at">${r.policy_name} exceeded</div>
          <div class="am">Threshold of ${r.threshold} exceeded. Current usage: ${r.usage}. Remediation required to restore compliance.</div></div>
        </div>`).join('') || '<div class="empty">No governance violations</div>'}
    </div>
  `;

  if (isAdmin) {
    document.getElementById('addPolicy')?.addEventListener('click', () => openModal(root, session, null));
    document.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-edit');
      const rows = await query('SELECT * FROM governance WHERE id = $1', [id]);
      openModal(root, session, rows[0]);
    }));
    document.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-del');
      if (!confirm('Delete this policy?')) return;
      await exec('DELETE FROM governance WHERE id = $1', [id]);
      await refreshEngines();
      toast('Policy deleted', 'warn');
      await load(root, session);
    }));
  }
}

function openModal(root, session, policy) {
  const existing = document.querySelector('.modal-backdrop');
  if (existing) existing.remove();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h3>${policy ? 'Edit Policy' : 'Add Policy'}</h3>
      <div class="sub">Define a governance threshold</div>
      <form id="policyForm">
        <div class="form-grid">
          <div class="field full"><label>Policy Name</label><input id="fName" required value="${policy?policy.policy_name:''}" placeholder="e.g. Maximum VM Limit" /></div>
          <div class="field"><label>Threshold</label><input id="fThreshold" type="number" step="any" required value="${policy?policy.threshold:''}" /></div>
          <div class="field"><label>Current Usage</label><input id="fUsage" type="number" step="any" required value="${policy?policy.current_usage:''}" /></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-ghost" id="cancelBtn">Cancel</button>
          <button type="submit" class="btn-primary" style="width:auto">${policy?'Save':'Add Policy'}</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  document.getElementById('cancelBtn').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.getElementById('policyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('fName').value.trim();
    const threshold = Number(document.getElementById('fThreshold').value);
    const usage = Number(document.getElementById('fUsage').value);
    if (policy) {
      await exec('UPDATE governance SET policy_name=$1, threshold=$2, current_usage=$3 WHERE id=$4', [name, threshold, usage, policy.id]);
      toast('Policy updated');
    } else {
      await exec('INSERT INTO governance (policy_name, threshold, current_usage) VALUES ($1,$2,$3)', [name, threshold, usage]);
      toast('Policy added');
    }
    await refreshEngines();
    close();
    await load(root, session);
  });
}
