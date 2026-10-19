const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// TEST CHANGE AREA: PR banate waqt in 3 lines ko badlein!
// ==========================================
const APP_VERSION = "v1.0 - Production Base";
const BANNER_COLOR = "#2563eb"; // Blue Color (PR mein ise #10b981 Green kar dena)
const PROMO_MESSAGE = "Welcome to Acme Payment Portal!";
// ==========================================

// Sample API Route (StageDock Guard isko scan karega)
app.get('/api/checkout', (req, res) => {
  res.json({
    status: "active",
    version: APP_VERSION,
    currency: "INR",
    mockDatabaseConnected: Boolean(process.env.DATABASE_URL)
  });
});

// Main Visual Web Page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>StageDock Live PR Preview Test</title>
      <style>
        body {
          margin: 0;
          font-family: system-ui, -apple-system, sans-serif;
          background: #0f172a;
          color: #f8fafc;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .card {
          background: #1e293b;
          border: 2px solid ${BANNER_COLOR};
          border-radius: 16px;
          padding: 40px;
          max-width: 520px;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .badge {
          background: ${BANNER_COLOR};
          color: white;
          padding: 8px 18px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 14px;
          display: inline-block;
          margin-bottom: 20px;
        }
        h1 { margin: 10px 0; font-size: 28px; }
        p { color: #94a3b8; line-height: 1.6; }
        .env-box {
          margin-top: 24px;
          background: #090d16;
          padding: 16px;
          border-radius: 10px;
          font-family: monospace;
          font-size: 13px;
          color: #38bdf8;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">${APP_VERSION}</div>
        <h1>${PROMO_MESSAGE}</h1>
        <p>Yeh website <strong>StageDock Sandbox</strong> ke isolated Docker container ke andar chal rahi hai!</p>
        <div class="env-box">
          <div>🟢 Container Status: RUNNING</div>
          <div>🔌 Container Port: ${PORT}</div>
          <div>🗄️ Mock DB Injected: ${process.env.DATABASE_URL ? 'YES (50 Rows Ready)' : 'Standalone Mode'}</div>
          <div>🕒 Render Time: ${new Date().toLocaleTimeString()}</div>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test App running on port ${PORT}`);
});
