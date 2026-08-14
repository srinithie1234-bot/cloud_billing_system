# Flask Migration Reference

The original specification calls for Python Flask + SQLite + Pandas. This project is delivered as a Vite client-side app so it runs entirely in the browser, but the architecture maps directly to Flask:

## Equivalent Flask Structure

```
app.py                      # Flask app, routes, session
database/schema.sql         # SQLite schema (included)
database/cloudcost.db        # SQLite database (created on first run)
dataset/*.csv                # Billing data (loaded via pandas)
templates/                   # Jinja2 templates (login.html, dashboard.html, profile.html, ...)
static/css/styles.css
static/js/charts.js
```

## Route Mapping

| Client route | Flask route |
|-------------|-------------|
| `/` (login) | `@app.route('/', methods=['GET','POST'])` — login |
| `/dashboard` | `@app.route('/dashboard')` — session-protected |
| `/profile` | `@app.route('/profile', methods=['GET','POST'])` |
| `/logout` | `@app.route('/logout')` — clears session |
| `/budgets` | `@app.route('/budgets', methods=['GET','POST','PUT','DELETE'])` |
| `/finops` | `@app.route('/finops')` |
| `/multicloud` | `@app.route('/multicloud')` |
| `/services` | `@app.route('/services')` |
| `/governance` | `@app.route('/governance')` |
| `/recommendations` | `@app.route('/recommendations')` |
| `/alerts` | `@app.route('/alerts')` |

## Data Loading (Pandas)

```python
import pandas as pd
budgets = pd.read_csv('dataset/budgets.csv')
providers = pd.read_csv('dataset/cloud_providers.csv')
services = pd.read_csv('dataset/services.csv')
```

## FinOps Calculations

```python
df['variance'] = df['actual_budget'] - df['planned_budget']
df['utilization'] = (df['actual_budget'] / df['planned_budget']) * 100
df['overspend_pct'] = ((df['actual_budget'] - df['planned_budget']) / df['planned_budget']) * 100
```

## Governance Rules

```python
if vm_count > 20: generate_alert('VM limit exceeded')
if storage_tb > 5: generate_alert('Storage limit exceeded')
if db_budget > 120000: generate_alert('Database budget exceeded')
```

## Alert Levels

```python
if util >= 100: severity = 'critical'
elif util >= 90: severity = 'warning'
elif util >= 80: severity = 'normal'
```
