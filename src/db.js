import { PGlite } from '@electric-sql/pglite';

let db = null;
let ready = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'analyst'
);

CREATE TABLE IF NOT EXISTS budget (
  id SERIAL PRIMARY KEY,
  month TEXT NOT NULL,
  planned_budget NUMERIC(14,2) NOT NULL,
  actual_budget NUMERIC(14,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS cloud_providers (
  id SERIAL PRIMARY KEY,
  month TEXT NOT NULL,
  provider TEXT NOT NULL,
  monthly_cost NUMERIC(14,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  month TEXT NOT NULL,
  service TEXT NOT NULL,
  planned_cost NUMERIC(14,2) NOT NULL,
  actual_cost NUMERIC(14,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS governance (
  id SERIAL PRIMARY KEY,
  policy_name TEXT NOT NULL,
  threshold NUMERIC(14,2) NOT NULL,
  current_usage NUMERIC(14,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  created_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  recommendation TEXT NOT NULL,
  category TEXT NOT NULL,
  created_date TEXT NOT NULL
);
`;

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = cols[i] !== undefined ? cols[i].trim() : ''; });
    return obj;
  });
}

async function loadCSV(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return parseCSV(await res.text());
}

async function seed(db) {
  const [{ count: uc }] = (await db.query('SELECT COUNT(*)::int AS count FROM users')).rows;
  if (uc > 0) return;

  const users = await loadCSV('/dataset/users.csv');
  for (const u of users) {
    await db.query(
      'INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)',
      [Number(u.id), u.name, u.email, u.password, u.role || 'analyst']
    );
  }

  const budgets = await loadCSV('/dataset/budgets.csv');
  for (const b of budgets) {
    await db.query(
      'INSERT INTO budget (month, planned_budget, actual_budget) VALUES ($1, $2, $3)',
      [b.month, Number(b.planned_budget), Number(b.actual_budget)]
    );
  }

  const providers = await loadCSV('/dataset/cloud_providers.csv');
  for (const p of providers) {
    await db.query(
      'INSERT INTO cloud_providers (month, provider, monthly_cost) VALUES ($1, $2, $3)',
      [p.month, p.provider, Number(p.monthly_cost)]
    );
  }

  const services = await loadCSV('/dataset/services.csv');
  for (const s of services) {
    await db.query(
      'INSERT INTO services (month, service, planned_cost, actual_cost) VALUES ($1, $2, $3, $4)',
      [s.month, s.service, Number(s.planned_cost), Number(s.actual_cost)]
    );
  }

  const gov = await loadCSV('/dataset/governance.csv');
  for (const g of gov) {
    await db.query(
      'INSERT INTO governance (id, policy_name, threshold, current_usage) VALUES ($1, $2, $3, $4)',
      [Number(g.id), g.policy_name, Number(g.threshold), Number(g.current_usage)]
    );
  }

  await regenerateAlerts(db);
  await regenerateRecommendations(db);
}

export function getDb() {
  if (!db) throw new Error('Database not initialized yet');
  return db;
}

export function dbReady() {
  return ready;
}

export async function initDb() {
  if (db) return db;
  db = new PGlite('idb://cloudcost');
  ready = (async () => {
    await db.exec(SCHEMA);
    await seed(db);
    return db;
  })();
  return ready;
}

export async function query(sql, params = []) {
  await dbReady();
  return (await getDb().query(sql, params)).rows;
}

export async function exec(sql, params = []) {
  await dbReady();
  await getDb().query(sql, params);
}

// ---- Derived computations ----

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June'];

export function currentMonth() {
  return MONTHS[MONTHS.length - 1];
}

export async function getBudgets() {
  return query('SELECT * FROM budget ORDER BY id');
}

export async function getProviders(month = null) {
  if (month) return query('SELECT * FROM cloud_providers WHERE month = $1 ORDER BY monthly_cost DESC', [month]);
  return query('SELECT * FROM cloud_providers ORDER BY month, provider');
}

export async function getServices(month = null) {
  if (month) return query('SELECT * FROM services WHERE month = $1 ORDER BY actual_cost DESC', [month]);
  return query('SELECT * FROM services ORDER BY month, service');
}

export async function getGovernance() {
  return query('SELECT * FROM governance ORDER BY id');
}

export async function getAlerts() {
  return query('SELECT * FROM alerts ORDER BY id DESC');
}

export async function getRecommendations() {
  return query('SELECT * FROM recommendations ORDER BY id DESC');
}

export async function getDashboardSummary() {
  const month = currentMonth();
  const [budgetRow] = await query('SELECT * FROM budget WHERE month = $1', [month]);
  const providers = await query('SELECT * FROM cloud_providers WHERE month = $1 ORDER BY monthly_cost DESC', [month]);
  const services = await query('SELECT * FROM services WHERE month = $1 ORDER BY actual_cost DESC', [month]);
  const alerts = await getAlerts();
  const recommendations = await getRecommendations();
  return { month, budget: budgetRow, providers, services, alerts, recommendations };
}

// ---- Alert + recommendation regeneration engine ----

export async function regenerateAlerts(db) {
  await db.query('DELETE FROM alerts');
  const now = new Date().toISOString();

  // Budget utilization alerts (per month, current month emphasized)
  const budgets = (await db.query('SELECT * FROM budget ORDER BY id')).rows;
  for (const b of budgets) {
    const util = (Number(b.actual_budget) / Number(b.planned_budget)) * 100;
    let severity = null;
    let msg = null;
    if (util >= 100) {
      severity = 'critical';
      msg = `Budget utilization reached ${util.toFixed(1)}% for ${b.month}. Cloud spending exceeded the approved budget.`;
    } else if (util >= 90) {
      severity = 'warning';
      msg = `Budget utilization reached ${util.toFixed(1)}% for ${b.month}. Approaching budget limit.`;
    } else if (util >= 80) {
      severity = 'normal';
      msg = `Budget utilization reached ${util.toFixed(1)}% for ${b.month}.`;
    }
    if (severity) {
      await db.query(
        'INSERT INTO alerts (alert_type, severity, message, created_date) VALUES ($1, $2, $3, $4)',
        ['budget', severity, msg, now]
      );
    }
  }

  // Governance alerts
  const gov = (await db.query('SELECT * FROM governance')).rows;
  for (const g of gov) {
    if (Number(g.current_usage) > Number(g.threshold)) {
      await db.query(
        'INSERT INTO alerts (alert_type, severity, message, created_date) VALUES ($1, $2, $3, $4)',
        ['governance', 'critical', `${g.policy_name} exceeded: threshold ${g.threshold}, current usage ${g.current_usage}.`, now]
      );
    }
  }

  // Service overspending alerts
  const month = MONTHS[MONTHS.length - 1];
  const services = (await db.query('SELECT * FROM services WHERE month = $1', [month])).rows;
  for (const s of services) {
    if (Number(s.actual_cost) > Number(s.planned_cost)) {
      const over = ((Number(s.actual_cost) - Number(s.planned_cost)) / Number(s.planned_cost)) * 100;
      const severity = over >= 20 ? 'critical' : over >= 10 ? 'warning' : 'normal';
      await db.query(
        'INSERT INTO alerts (alert_type, severity, message, created_date) VALUES ($1, $2, $3, $4)',
        ['service', severity, `${s.service} spending exceeded plan by ${over.toFixed(1)}% in ${month}.`, now]
      );
    }
  }
}

export async function regenerateRecommendations(db) {
  await db.query('DELETE FROM recommendations');
  const now = new Date().toISOString();
  const month = MONTHS[MONTHS.length - 1];
  const services = (await db.query('SELECT * FROM services WHERE month = $1', [month])).rows;

  const byName = {};
  for (const s of services) byName[s.service] = s;

  const compute = byName['Compute'];
  if (compute && Number(compute.actual_cost) > Number(compute.planned_cost)) {
    await db.query('INSERT INTO recommendations (recommendation, category, created_date) VALUES ($1, $2, $3)',
      ['Compute spending is rising. Adopt Reserved Instances and Auto Scaling to reduce on-demand costs.', 'compute', now]);
  }
  const storage = byName['Storage'];
  if (storage && Number(storage.actual_cost) > Number(storage.planned_cost)) {
    await db.query('INSERT INTO recommendations (recommendation, category, created_date) VALUES ($1, $2, $3)',
      ['Storage spending is rising. Move infrequently accessed data to cold storage and apply data lifecycle policies.', 'storage', now]);
  }
  const network = byName['Network'];
  if (network && Number(network.actual_cost) > Number(network.planned_cost)) {
    await db.query('INSERT INTO recommendations (recommendation, category, created_date) VALUES ($1, $2, $3)',
      ['Network spending is rising. Introduce caching and CDN optimization to reduce egress costs.', 'network', now]);
  }

  // Idle VM detection (simulated via governance VM usage above threshold)
  const gov = (await db.query('SELECT * FROM governance')).rows;
  const vm = gov.find((g) => g.policy_name.toLowerCase().includes('vm'));
  if (vm && Number(vm.current_usage) > Number(vm.threshold) * 0.9) {
    await db.query('INSERT INTO recommendations (recommendation, category, created_date) VALUES ($1, $2, $3)',
      ['Idle virtual machines detected. Review utilization and terminate underused instances.', 'idle-vm', now]);
  }
}
