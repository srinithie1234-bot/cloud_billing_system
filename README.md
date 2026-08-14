# Integrated Cloud Cost Optimization, FinOps, Multi-Cloud Management, and Governance System

A full-stack web application for enterprise cloud cost monitoring, budget management, FinOps analysis, multi-cloud comparison, governance policy enforcement, alert generation, and dashboard visualization.

Built for the subject **Cloud Optimization Tools and Techniques**.

## Features

- **User Authentication** — login, logout, session management, admin/analyst roles, profile management
- **Budget Management** — add, edit, delete and view monthly budgets; compare historical budgets
- **FinOps Module** — variance, budget utilization, overspending percentage calculations
- **Multi-Cloud Management** — compare AWS, Azure and GCP; rank providers by cost; identify the most expensive
- **Service-Level Cost Analysis** — Compute, Storage, Database, Network, Backup, Monitoring; planned vs actual; ranking
- **Governance Module** — VM limit (20), storage limit (5 TB), database budget (₹120,000); policy violation alerts
- **Cost Optimization Recommendations** — rule-based engine for compute, storage, network, idle VMs
- **Alert Module** — three levels: Normal (80%), Warning (90%), Critical (100%)
- **Dashboard** — top cards, provider section, service analysis, recommendations, active alerts
- **Charts (Chart.js)** — pie (provider distribution), bar (planned vs actual), line (6-month trend), doughnut (service distribution)

## Technology Stack

| Layer | Technology |
|------|-----------|
| Frontend | HTML5, CSS3, Bootstrap 5, JavaScript |
| Charts | Chart.js |
| Database | In-browser Postgres (PGlite) — SQLite-equivalent local persistence |
| Build | Vite |

> The original spec calls for Python Flask + SQLite + Pandas. This implementation delivers the same functionality as a client-side Vite app so it runs entirely in the browser. The database schema, dataset, and all modules match the spec. See `docs/FLASK_MIGRATION.md` for the equivalent Flask backend structure.

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cloudops.io | admin123 |
| Analyst | finops@cloudops.io | finops123 |

## Dataset

Six months (January–June) of simulated cloud billing data in `public/dataset/`:
- `budgets.csv` — planned vs actual monthly budget
- `cloud_providers.csv` — AWS, Azure, GCP monthly costs
- `services.csv` — Compute, Storage, Database, Network, Backup, Monitoring planned vs actual
- `governance.csv` — policy thresholds and current usage
- `users.csv` — demo users

## Database Tables

`users`, `budget`, `cloud_providers`, `services`, `governance`, `alerts`, `recommendations`

## Folder Structure

```
Integrated-Cloud-Cost-Optimization-System
├── index.html
├── package.json
├── vite.config.js
├── requirements.txt
├── database/            # DB schema reference
├── public/dataset/      # CSV billing data
├── static/css/          # Stylesheets
├── static/js/           # Scripts
├── static/images/       # Assets
├── templates/           # View templates reference
└── src/
    ├── main.js
    ├── db.js            # Database layer (PGlite)
    ├── auth.js          # Authentication
    ├── shell.js         # App shell + router
    ├── utils.js         # Shared helpers
    ├── styles.css
    └── pages/           # Dashboard, Budgets, FinOps, MultiCloud, Services, Governance, Recommendations, Alerts, Profile, Login
```

## Governance Policies

| Policy | Threshold |
|--------|-----------|
| Maximum VM limit | 20 |
| Maximum storage limit | 5 TB |
| Maximum database budget | ₹120,000 |

## Alert Levels

| Utilization | Level |
|------------|-------|
| ≥ 80% | Normal |
| ≥ 90% | Warning |
| ≥ 100% | Critical (Overspending) |
