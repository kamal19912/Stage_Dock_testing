const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// =========================================================================
// 🔥 PR TEST CHANGE AREA: GitHub par PR banate waqt in values ko change karein!
// =========================================================================
const APP_VERSION = 'v1.0 - Production CRM Base';
const THEME_ACCENT = '#3b82f6'; // Blue (PR mein "#10b981" Emerald Green ya "#8b5cf6" Purple karein)
const ANNOUNCEMENT_TEXT = '🚀 Live Database Sandbox Active — Connected to Ephemeral Postgres!';
const TAX_RATE_PERCENT = 18; // GST %
// =========================================================================

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-change-me-session-secret';
const DEMO_LOGIN_USERNAME = process.env.DEMO_LOGIN_USERNAME || 'admin';
const DEMO_LOGIN_PASSWORD = process.env.DEMO_LOGIN_PASSWORD || 'admin123';

app.use(
  session({
    name: 'stagedock.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

// Database connection pool (Uses StageDock's injected DATABASE_URL if available)
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

// Built-in Realistic Fallback Mock Data (Plus Auto-Seed into Real Postgres if connected)
const defaultCustomers = [
  { id: 101, full_name: 'Aarav Sharma', email: 'aarav@techvista.in', company: 'TechVista Solutions', plan: 'ENTERPRISE', status: 'ACTIVE', created_at: '2025-02-10 10:15' },
  { id: 102, full_name: 'Priya Nair', email: 'priya@cloudscale.io', company: 'CloudScale Labs', plan: 'PRO', status: 'ACTIVE', created_at: '2025-02-11 11:30' },
  { id: 103, full_name: 'Rohan Verma', email: 'rohan@finstack.co', company: 'FinStack India', plan: 'ENTERPRISE', status: 'ACTIVE', created_at: '2025-02-12 14:20' },
  { id: 104, full_name: 'Neha Gupta', email: 'neha@devpulse.dev', company: 'DevPulse Systems', plan: 'STARTER', status: 'TRIAL', created_at: '2025-02-14 09:45' },
  { id: 105, full_name: 'Vikramaditya Joshi', email: 'vikram@nexacommerce.com', company: 'NexaCommerce', plan: 'PRO', status: 'ACTIVE', created_at: '2025-02-15 16:05' },
  { id: 106, full_name: 'Ananya Deshmukh', email: 'ananya@zenithai.in', company: 'Zenith AI', plan: 'ENTERPRISE', status: 'PAST_DUE', created_at: '2025-02-16 18:12' }
];

const defaultOrders = [
  { id: 5001, invoice_number: 'INV-2026-001', customer_name: 'Aarav Sharma', company: 'TechVista Solutions', product_name: 'StageDock Sandbox + Guard Bundle', amount_inr: 6498, payment_status: 'PAID', created_at: '2025-02-16 12:00' },
  { id: 5002, invoice_number: 'INV-2026-002', customer_name: 'Priya Nair', company: 'CloudScale Labs', product_name: 'StageDock Sandbox (Monthly)', amount_inr: 3999, payment_status: 'PAID', created_at: '2025-02-16 13:40' },
  { id: 5003, invoice_number: 'INV-2026-003', customer_name: 'Rohan Verma', company: 'FinStack India', product_name: 'Full Enterprise Suite (All 3 Modules)', amount_inr: 14497, payment_status: 'PAID', created_at: '2025-02-17 09:15' },
  { id: 5004, invoice_number: 'INV-2026-004', customer_name: 'Neha Gupta', company: 'DevPulse Systems', product_name: 'StageDock Guard Add-on', amount_inr: 2499, payment_status: 'PENDING', created_at: '2025-02-17 15:22' },
  { id: 5005, invoice_number: 'INV-2026-005', customer_name: 'Vikramaditya Joshi', company: 'NexaCommerce', product_name: 'StageDock Modernize Engine', amount_inr: 7999, payment_status: 'PAID', created_at: '2025-02-18 11:10' }
];

const defaultAuditLogs = [
  { id: 1, actor: 'system@stagedock.dev', action: 'AUTO_DB_MIGRATION', endpoint: 'POST /api/internal/seed', risk_level: 'LOW', timestamp: 'Just now' },
  { id: 2, actor: 'aarav@techvista.in', action: 'INVOICE_GENERATED', endpoint: 'POST /api/orders', risk_level: 'LOW', timestamp: '5 mins ago' },
  { id: 3, actor: 'guard-bot@stagedock.dev', action: 'AST_SCHEMA_CHECK', endpoint: 'GET /api/customers', risk_level: 'MEDIUM', timestamp: '12 mins ago' },
  { id: 4, actor: 'rohan@finstack.co', action: 'API_KEY_ROTATED', endpoint: 'DELETE /api/tokens/old', risk_level: 'HIGH', timestamp: '28 mins ago' }
];

let runtimeCustomers = [...defaultCustomers];
let runtimeOrders = [...defaultOrders];
let runtimeLogs = [...defaultAuditLogs];
let dbSourceMode = 'In-Memory Smart Seed (Fallback Ready)';

function hashText(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function timingSafeMatch(input, expected) {
  const inputDigest = hashText(input);
  const expectedDigest = hashText(expected);
  return crypto.timingSafeEqual(inputDigest, expectedDigest);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isAuthenticated(req) {
  return Boolean(req.session && req.session.isAuthenticated);
}

function requireBrowserAuth(req, res, next) {
  if (isAuthenticated(req)) {
    return next();
  }
  return res.redirect('/login');
}

function requireApiAuth(req, res, next) {
  if (isAuthenticated(req)) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

function renderLoginPage(errorMessage = '') {
  const message = errorMessage
    ? '<div class="error">Invalid username or password.</div>'
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in — Acme Enterprise CRM</title>
  <style>
    :root {
      --accent: ${THEME_ACCENT};
      --bg: #090d16;
      --card: #111827;
      --border: #1f2937;
      --text: #f9fafb;
      --muted: #9ca3af;
      --danger: #f87171;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: radial-gradient(circle at top, rgba(59,130,246,0.15), transparent 35%), var(--bg);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .login-card {
      width: 100%;
      max-width: 460px;
      background: var(--card);
      border: 1px solid var(--border);
      border-top: 4px solid var(--accent);
      border-radius: 14px;
      padding: 28px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.35);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .brand-logo {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
    }
    h1 { margin: 0; font-size: 22px; }
    p { margin: 8px 0 0; color: var(--muted); font-size: 14px; }
    form { margin-top: 24px; display: grid; gap: 14px; }
    label { font-size: 13px; color: var(--muted); display: block; margin-bottom: 6px; }
    input {
      width: 100%;
      background: #0d1320;
      border: 1px solid #374151;
      color: #fff;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
    }
    button {
      margin-top: 6px;
      background: var(--accent);
      border: none;
      color: white;
      font-weight: 700;
      border-radius: 8px;
      padding: 11px 14px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover { opacity: 0.95; }
    .error {
      margin-top: 10px;
      border: 1px solid rgba(248,113,113,0.4);
      background: rgba(239,68,68,0.12);
      color: var(--danger);
      border-radius: 8px;
      padding: 9px 11px;
      font-size: 13px;
    }
    .footer {
      margin-top: 14px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <main class="login-card">
    <div class="brand">
      <div class="brand-logo">AC</div>
      <div>
        <h1>Acme CRM Login</h1>
        <p>Sign in to access StageDock dashboard.</p>
      </div>
    </div>
    ${message}
    <form action="/login" method="POST" autocomplete="off">
      <div>
        <label for="username">Username</label>
        <input id="username" name="username" type="text" required />
      </div>
      <div>
        <label for="password">Password</label>
        <input id="password" name="password" type="password" required />
      </div>
      <button type="submit">Sign in</button>
    </form>
    <div class="footer">Use demo credentials configured via environment variables.</div>
  </main>
</body>
</html>`;
}

function renderDashboardPage() {
  const totalRevenue = runtimeOrders.reduce((acc, o) => acc + o.amount_inr, 0);
  const activeCount = runtimeCustomers.filter((c) => c.status === 'ACTIVE').length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Acme Enterprise CRM — StageDock Database Sandbox</title>
  <style>
    :root {
      --accent: ${THEME_ACCENT};
      --bg: #090d16;
      --card: #111827;
      --border: #1f2937;
      --text: #f9fafb;
      --muted: #9ca3af;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding-bottom: 60px;
    }
    .banner {
      background: var(--accent);
      color: #fff;
      text-align: center;
      padding: 10px 16px;
      font-weight: 600;
      font-size: 14px;
      letter-spacing: 0.3px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 28px 20px;
    }
    .topbar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 18px;
    }
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .page-nav {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .page-nav a {
      color: #d1d5db;
      text-decoration: none;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 13px;
    }
    .page-nav a:hover { border-color: var(--accent); color: #fff; }
    .version-pill {
      background: rgba(255,255,255,0.08);
      border: 1px solid var(--accent);
      color: #fff;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
    }
    .logout-btn {
      background: transparent;
      border: 1px solid #ef4444;
      color: #fca5a5;
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .logout-btn:hover { background: rgba(239,68,68,0.1); }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 18px;
      margin: 26px 0;
    }
    .stat-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-top: 3px solid var(--accent);
      border-radius: 12px;
      padding: 20px;
    }
    .stat-label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; }
    .stat-value { font-size: 28px; font-weight: 800; margin-top: 8px; }
    .stat-sub { color: #34d399; font-size: 12px; margin-top: 6px; }
    .section-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      margin-bottom: 28px;
      overflow: hidden;
    }
    .section-header {
      padding: 18px 22px;
      border-bottom: 1px solid var(--border);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .section-title {
      font-size: 17px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .db-tag {
      font-family: monospace;
      font-size: 12px;
      background: #1e293b;
      color: #38bdf8;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #334155;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 14px;
    }
    th {
      background: #0d1320;
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      padding: 13px 20px;
      border-bottom: 1px solid var(--border);
    }
    td {
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      color: #e5e7eb;
    }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .badge {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      display: inline-block;
    }
    .badge-green { background: rgba(16,185,129,0.15); color: #34d399; }
    .badge-amber { background: rgba(245,158,11,0.15); color: #fbbf24; }
    .badge-blue { background: rgba(59,130,246,0.15); color: #60a5fa; }
    .badge-red { background: rgba(239,68,68,0.15); color: #f87171; }
    .form-bar {
      padding: 16px 22px;
      background: #0d1320;
      border-bottom: 1px solid var(--border);
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    input, select {
      background: #111827;
      border: 1px solid #374151;
      color: #fff;
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 13px;
    }
    button.btn {
      background: var(--accent);
      color: #fff;
      border: none;
      padding: 9px 18px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
    }
    button.btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="banner">${ANNOUNCEMENT_TEXT}</div>

  <div class="container">
    <div class="topbar">
      <div class="brand">
        <div class="brand-logo">AC</div>
        <div>
          <div style="font-size: 20px; font-weight: 800;">Acme Enterprise CRM & Billing</div>
          <div style="font-size: 13px; color: var(--muted);">DB Engine: ${dbSourceMode}</div>
        </div>
      </div>
      <div class="topbar-actions">
        <nav class="page-nav" aria-label="Main navigation">
          <a href="/dashboard">Overview</a>
          <a href="/customers">Customers</a>
          <a href="/orders">Orders</a>
          <a href="/audit-logs">Audit Logs</a>
        </nav>
        <div class="version-pill">${APP_VERSION}</div>
        <form action="/logout" method="POST" style="margin:0;">
          <button type="submit" class="logout-btn">Logout</button>
        </form>
      </div>
    </div>

    <!-- KPI METRICS -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Table 1: Customers Rows</div>
        <div class="stat-value">${runtimeCustomers.length}</div>
        <div class="stat-sub">● ${activeCount} Active Subscriptions</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Table 2: Orders Volume</div>
        <div class="stat-value">₹${totalRevenue.toLocaleString('en-IN')}</div>
        <div class="stat-sub">● Across ${runtimeOrders.length} Invoices (GST ${TAX_RATE_PERCENT}%)</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Table 3: Security Audit Logs</div>
        <div class="stat-value">${runtimeLogs.length} Events</div>
        <div class="stat-sub">● AST Guard Monitored Endpoints</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Sandbox Container Port</div>
        <div class="stat-value">:${PORT}</div>
        <div class="stat-sub">● Isolated Docker Network</div>
      </div>
    </div>

    <!-- TABLE 1: CUSTOMERS TABLE WITH LIVE INSERT -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          🗄️ PostgreSQL Table: <code>customers</code>
        </div>
        <span class="db-tag">SELECT * FROM customers ORDER BY id DESC;</span>
      </div>

      <form class="form-bar" onsubmit="addCustomer(event)">
        <input type="text" id="c_name" placeholder="Customer Full Name" required />
        <input type="email" id="c_email" placeholder="Email Address" required />
        <input type="text" id="c_company" placeholder="Company Name" required />
        <select id="c_plan">
          <option value="ENTERPRISE">ENTERPRISE</option>
          <option value="PRO">PRO</option>
          <option value="STARTER">STARTER</option>
        </select>
        <button type="submit" class="btn">+ Insert Row into DB Table</button>
      </form>

      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>ID (PK)</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Company</th>
              <th>Subscription Plan</th>
              <th>Account Status</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            ${runtimeCustomers.map((c) => `
              <tr>
                <td style="font-family:monospace; color:#60a5fa;">#${c.id}</td>
                <td style="font-weight:600;">${c.full_name}</td>
                <td style="color:#9ca3af;">${c.email}</td>
                <td>${c.company}</td>
                <td><span class="badge badge-blue">${c.plan}</span></td>
                <td>
                  <span class="badge ${c.status === 'ACTIVE' ? 'badge-green' : c.status === 'TRIAL' ? 'badge-amber' : 'badge-red'}">
                    ${c.status}
                  </span>
                </td>
                <td style="color:#9ca3af; font-size:12px;">${c.created_at}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- TABLE 2: ORDERS & INVOICES TABLE -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          💳 PostgreSQL Table: <code>orders</code> (Foreign Key ➔ customers.id)
        </div>
        <span class="db-tag">SELECT * FROM orders JOIN customers;</span>
      </div>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Invoice #</th>
              <th>Customer & Company</th>
              <th>Product / Module</th>
              <th>Amount (INR)</th>
              <th>Payment Status</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            ${runtimeOrders.map((o) => `
              <tr>
                <td style="font-family:monospace; color:#a78bfa;">#${o.id}</td>
                <td style="font-family:monospace; font-weight:600;">${o.invoice_number}</td>
                <td><strong>${o.customer_name}</strong> <span style="color:#9ca3af;">(${o.company})</span></td>
                <td>${o.product_name}</td>
                <td style="font-weight:700;">₹${o.amount_inr.toLocaleString('en-IN')}</td>
                <td>
                  <span class="badge ${o.payment_status === 'PAID' ? 'badge-green' : 'badge-amber'}">
                    ${o.payment_status}
                  </span>
                </td>
                <td style="color:#9ca3af; font-size:12px;">${o.created_at}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- TABLE 3: AUDIT LOGS & API ENDPOINT MONITOR -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          🛡️ PostgreSQL Table: <code>audit_logs</code> & REST API Monitor
        </div>
        <span class="db-tag">GET /api/customers | GET /api/orders | GET /api/health</span>
      </div>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Actor</th>
              <th>DB / API Action</th>
              <th>Target Endpoint</th>
              <th>Blast-Radius Risk</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            ${runtimeLogs.map((l) => `
              <tr>
                <td style="font-family:monospace;">#${l.id}</td>
                <td style="font-family:monospace; color:#93c5fd;">${l.actor}</td>
                <td style="font-weight:600;">${l.action}</td>
                <td style="font-family:monospace; color:#fcd34d;">${l.endpoint}</td>
                <td>
                  <span class="badge ${l.risk_level === 'LOW' ? 'badge-green' : l.risk_level === 'MEDIUM' ? 'badge-amber' : 'badge-red'}">
                    ${l.risk_level}
                  </span>
                </td>
                <td style="color:#9ca3af; font-size:12px;">${l.timestamp}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    async function addCustomer(e) {
      e.preventDefault();
      const payload = {
        full_name: document.getElementById('c_name').value,
        email: document.getElementById('c_email').value,
        company: document.getElementById('c_company').value,
        plan: document.getElementById('c_plan').value
      };
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      window.location.reload();
    }
  </script>
</body>
</html>`;
}

function renderDataPage({ title, description, activePath, columns, rows }) {
  const tableRows = rows.length
    ? rows.map((row) => `
        <tr>
          ${columns.map((column) => `<td>${escapeHtml(row[column.key])}</td>`).join('')}
        </tr>
      `).join('')
    : `<tr><td colspan="${columns.length}" class="empty">No records found.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — Acme Enterprise CRM</title>
  <style>
    :root { --accent: ${THEME_ACCENT}; --bg: #090d16; --card: #111827; --border: #1f2937; --text: #f9fafb; --muted: #9ca3af; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: var(--bg); color: var(--text); }
    .container { max-width: 1200px; margin: 0 auto; padding: 28px 20px 60px; }
    .topbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; padding-bottom: 22px; border-bottom: 1px solid var(--border); }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo { width: 42px; height: 42px; border-radius: 10px; background: var(--accent); display: grid; place-items: center; font-weight: 800; }
    .brand a { color: #fff; text-decoration: none; font-weight: 800; font-size: 19px; }
    .muted { color: var(--muted); font-size: 13px; margin-top: 4px; }
    nav { display: flex; gap: 8px; flex-wrap: wrap; }
    nav a, .logout { color: #d1d5db; text-decoration: none; border: 1px solid var(--border); border-radius: 999px; padding: 7px 12px; font-size: 13px; background: transparent; }
    nav a.active, nav a:hover { border-color: var(--accent); color: #fff; }
    .logout { border-color: #ef4444; color: #fca5a5; cursor: pointer; }
    h1 { margin: 30px 0 6px; font-size: 28px; }
    .card { margin-top: 22px; background: var(--card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
    th { background: #0d1320; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .7px; padding: 14px 18px; }
    td { padding: 15px 18px; border-top: 1px solid var(--border); color: #e5e7eb; white-space: nowrap; }
    .empty { color: var(--muted); text-align: center; padding: 30px; }
  </style>
</head>
<body>
  <main class="container">
    <header class="topbar">
      <div class="brand">
        <div class="brand-logo">AC</div>
        <div><a href="/dashboard">Acme Enterprise CRM</a><div class="muted">StageDock Database Sandbox</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <nav aria-label="Main navigation">
          <a class="${activePath === '/dashboard' ? 'active' : ''}" href="/dashboard">Overview</a>
          <a class="${activePath === '/customers' ? 'active' : ''}" href="/customers">Customers</a>
          <a class="${activePath === '/orders' ? 'active' : ''}" href="/orders">Orders</a>
          <a class="${activePath === '/audit-logs' ? 'active' : ''}" href="/audit-logs">Audit Logs</a>
        </nav>
        <form action="/logout" method="POST"><button class="logout" type="submit">Logout</button></form>
      </div>
    </header>
    <h1>${escapeHtml(title)}</h1>
    <div class="muted">${escapeHtml(description)}</div>
    <section class="card">
      <div class="table-wrap">
        <table>
          <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </section>
  </main>
</body>
</html>`;
}

async function initDatabaseIfAvailable() {
  if (!pool) return;
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);

    const countRes = await pool.query('SELECT COUNT(*) FROM customers');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      for (const c of defaultCustomers) {
        await pool.query(
          'INSERT INTO customers (full_name, email, company, plan, status, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
          [c.full_name, c.email, c.company, c.plan, c.status, c.created_at]
        );
      }
    }

    const orderCountRes = await pool.query('SELECT COUNT(*) FROM orders');
    if (parseInt(orderCountRes.rows[0].count, 10) === 0) {
      for (const order of defaultOrders) {
        await pool.query(
          `INSERT INTO orders
            (invoice_number, customer_id, product_name, amount_inr, payment_status, created_at)
           SELECT $1, id, $3, $4, $5, $6
           FROM customers
           WHERE full_name = $2
           ON CONFLICT (invoice_number) DO NOTHING`,
          [
            order.invoice_number,
            order.customer_name,
            order.product_name,
            order.amount_inr,
            order.payment_status,
            order.created_at
          ]
        );
      }
    }

    const logCountRes = await pool.query('SELECT COUNT(*) FROM audit_logs');
    if (parseInt(logCountRes.rows[0].count, 10) === 0) {
      for (const log of defaultAuditLogs) {
        await pool.query(
          `INSERT INTO audit_logs (actor, action, endpoint, risk_level)
           VALUES ($1, $2, $3, $4)`,
          [log.actor, log.action, log.endpoint, log.risk_level]
        );
      }
    }

    const dbRows = await pool.query('SELECT * FROM customers ORDER BY id DESC LIMIT 50');
    const orderRows = await pool.query(`
      SELECT o.id, o.invoice_number, c.full_name AS customer_name, c.company,
             o.product_name, o.amount_inr, o.payment_status, o.created_at
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      ORDER BY o.id DESC
      LIMIT 50
    `);
    const logRows = await pool.query(`
      SELECT id, actor, action, endpoint, risk_level, timestamp
      FROM audit_logs
      ORDER BY id DESC
      LIMIT 50
    `);

    runtimeCustomers = dbRows.rows;
    runtimeOrders = orderRows.rows;
    runtimeLogs = logRows.rows;
    dbSourceMode = 'Live PostgreSQL Container (DATABASE_URL Connected)';
  } catch (err) {
    console.error('Database initialization failed; using in-memory dataset:', err.message);
  }
}

initDatabaseIfAvailable();

app.get('/login', (req, res) => {
  if (isAuthenticated(req)) {
    return res.redirect('/dashboard');
  }
  return res.send(renderLoginPage());
});

app.post('/login', (req, res) => {
  const { username = '', password = '' } = req.body;
  const usernameOk = timingSafeMatch(username, DEMO_LOGIN_USERNAME);
  const passwordOk = timingSafeMatch(password, DEMO_LOGIN_PASSWORD);

  if (!usernameOk || !passwordOk) {
    return res.status(401).send(renderLoginPage('Invalid credentials'));
  }

  req.session.isAuthenticated = true;
  req.session.username = DEMO_LOGIN_USERNAME;
  return res.redirect('/dashboard');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('stagedock.sid');
    res.redirect('/login');
  });
});

// =========================================================================
// REST API ENDPOINTS (StageDock Guard monitors these routes for AST changes!)
// =========================================================================
app.use('/api', requireApiAuth);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: APP_VERSION,
    databaseMode: dbSourceMode,
    tables: ['customers', 'orders', 'audit_logs'],
    totalCustomers: runtimeCustomers.length,
    totalOrders: runtimeOrders.length
  });
});

app.get('/api/customers', (req, res) => {
  res.json({ count: runtimeCustomers.length, data: runtimeCustomers });
});

app.get('/api/orders', (req, res) => {
  res.json({ taxRatePercent: TAX_RATE_PERCENT, count: runtimeOrders.length, data: runtimeOrders });
});

app.get('/api/audit-logs', (req, res) => {
  res.json({ count: runtimeLogs.length, data: runtimeLogs });
});

app.post('/api/customers', async (req, res) => {
  const { full_name, email, company, plan } = req.body;

  if (
    typeof full_name !== 'string' ||
    typeof email !== 'string' ||
    typeof company !== 'string' ||
    !full_name.trim() ||
    !company.trim() ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !['ENTERPRISE', 'PRO', 'STARTER'].includes(plan)
  ) {
    return res.status(400).json({
      error: 'full_name, valid email, company, and supported plan are required'
    });
  }

  const newCustomer = {
    id: runtimeCustomers.length
      ? Math.max(...runtimeCustomers.map((customer) => Number(customer.id))) + 1
      : 1,
    full_name: full_name.trim(),
    email: email.trim().toLowerCase(),
    company: company.trim(),
    plan,
    status: 'ACTIVE',
    created_at: new Date().toISOString()
  };

  try {
    if (pool) {
      const customerResult = await pool.query(
        `INSERT INTO customers (full_name, email, company, plan, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          newCustomer.full_name,
          newCustomer.email,
          newCustomer.company,
          newCustomer.plan,
          newCustomer.status
        ]
      );
      Object.assign(newCustomer, customerResult.rows[0]);
    }

    runtimeCustomers.unshift(newCustomer);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A customer with this email already exists' });
    }
    console.error('Customer creation failed:', err.message);
    return res.status(500).json({ error: 'Unable to create customer' });
  }

  runtimeLogs.unshift({
    id: runtimeLogs.length + 1,
    actor: newCustomer.email,
    action: 'CUSTOMER_CREATED',
    endpoint: 'POST /api/customers',
    risk_level: 'LOW',
    timestamp: 'Just now'
  });

  res.status(201).json({ success: true, customer: newCustomer });
});

app.get('/', requireBrowserAuth, (req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', requireBrowserAuth, (req, res) => {
  res.send(renderDashboardPage());
});

app.get('/customers', requireBrowserAuth, (req, res) => {
  res.send(renderDataPage({
    title: 'Customers',
    description: `${runtimeCustomers.length} customer records and subscription accounts`,
    activePath: '/customers',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'full_name', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'company', label: 'Company' },
      { key: 'plan', label: 'Plan' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Created At' }
    ],
    rows: runtimeCustomers
  }));
});

app.get('/orders', requireBrowserAuth, (req, res) => {
  res.send(renderDataPage({
    title: 'Orders & Invoices',
    description: `${runtimeOrders.length} invoices with a ${TAX_RATE_PERCENT}% GST rate`,
    activePath: '/orders',
    columns: [
      { key: 'id', label: 'Order ID' },
      { key: 'invoice_number', label: 'Invoice' },
      { key: 'customer_name', label: 'Customer' },
      { key: 'company', label: 'Company' },
      { key: 'product_name', label: 'Product' },
      { key: 'amount_inr', label: 'Amount (INR)' },
      { key: 'payment_status', label: 'Payment Status' },
      { key: 'created_at', label: 'Created At' }
    ],
    rows: runtimeOrders
  }));
});

app.get('/audit-logs', requireBrowserAuth, (req, res) => {
  res.send(renderDataPage({
    title: 'Security Audit Logs',
    description: `${runtimeLogs.length} monitored CRM and API events`,
    activePath: '/audit-logs',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'actor', label: 'Actor' },
      { key: 'action', label: 'Action' },
      { key: 'endpoint', label: 'Endpoint' },
      { key: 'risk_level', label: 'Risk' },
      { key: 'timestamp', label: 'Time' }
    ],
    rows: runtimeLogs
  }));
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Enterprise CRM Sandbox App running on port ${PORT}`);
  });
}

module.exports = app;
