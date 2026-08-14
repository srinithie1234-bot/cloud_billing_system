export function fmtINR(n) {
  const v = Number(n) || 0;
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function fmtINR2(n) {
  const v = Number(n) || 0;
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function fmtPct(n) {
  return (Number(n) || 0).toFixed(1) + '%';
}

export function variance(actual, planned) {
  return Number(actual) - Number(planned);
}

export function utilization(actual, planned) {
  if (!Number(planned)) return 0;
  return (Number(actual) / Number(planned)) * 100;
}

export function overspendPct(actual, planned) {
  if (!Number(planned)) return 0;
  return ((Number(actual) - Number(planned)) / Number(planned)) * 100;
}

export function statusFor(util) {
  if (util >= 100) return { label: 'Overspent', cls: 'critical' };
  if (util >= 90) return { label: 'Warning', cls: 'warning' };
  if (util >= 80) return { label: 'At Risk', cls: 'normal' };
  return { label: 'On Track', cls: 'success' };
}

export function severityBadge(sev) {
  return `<span class="badge ${sev}">${sev.charAt(0).toUpperCase() + sev.slice(1)}</span>`;
}

export function toast(msg, type = 'info') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const t = document.createElement('div');
  t.className = `toast ${type === 'error' ? 'error' : type === 'warn' ? 'warn' : ''}`;
  t.textContent = msg;
  stack.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

export const PROVIDER_COLORS = { AWS: '#ff9900', Azure: '#3b9bf5', GCP: '#34a853' };
export const SERVICE_COLORS = {
  Compute: '#2dd4bf', Storage: '#38bdf8', Database: '#a78bfa', Network: '#f59e0b', Backup: '#22c55e', Monitoring: '#f472b6',
};
