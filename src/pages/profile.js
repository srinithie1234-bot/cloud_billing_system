import { getSession, updateProfile } from '../auth.js';
import { query } from '../db.js';
import { toast } from '../utils.js';

export async function renderProfile(root, session) {
  const user = (await query('SELECT * FROM users WHERE id = $1', [session.id]))[0];

  root.innerHTML = `
    <div class="grid cards-2" style="grid-template-columns: 1fr 1.4fr">
      <div class="panel">
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:20px 0">
          <div class="avatar" style="width:80px;height:80px;font-size:30px">${(user.name||'?').charAt(0)}</div>
          <h3 style="margin-top:16px">${user.name}</h3>
          <div class="muted" style="font-size:13px">${user.email}</div>
          <span class="badge ${user.role==='admin'?'critical':'normal'}" style="margin-top:12px">${user.role}</span>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>Account Settings</h3><div class="sub">Update your profile</div></div></div>
        <form id="profileForm">
          <div class="form-grid">
            <div class="field"><label>Name</label><input id="pName" value="${user.name}" required /></div>
            <div class="field"><label>Email</label><input id="pEmail" type="email" value="${user.email}" required /></div>
            <div class="field full"><label>New Password (leave blank to keep current)</label><input id="pPassword" type="password" placeholder="••••••••" /></div>
          </div>
          <div class="modal-actions" style="margin-top:18px">
            <button type="submit" class="btn-primary" style="width:auto"><i class="bi bi-check-lg"></i> Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('pName').value.trim();
    const email = document.getElementById('pEmail').value.trim();
    const password = document.getElementById('pPassword').value;
    await updateProfile(session.id, { name, email, password: password || null });
    toast('Profile updated');
    setTimeout(() => location.reload(), 600);
  });
}
