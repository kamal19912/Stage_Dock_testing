const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const request = require('supertest');

const testPassword = crypto.randomBytes(24).toString('hex');
process.env.DEMO_LOGIN_USERNAME = 'testuser';
process.env.DEMO_LOGIN_PASSWORD = testPassword;
process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');

const app = require('../server');

test('GET /login is publicly accessible', async () => {
  const res = await request(app).get('/login');
  assert.equal(res.status, 200);
  assert.match(res.text, /Acme CRM Login/);
});

test('invalid credentials are rejected', async () => {
  const res = await request(app)
    .post('/login')
    .type('form')
    .send({ username: 'wrong', password: 'wrong' });

  assert.equal(res.status, 401);
  assert.match(res.text, /Invalid username or password/);
});

test('successful login redirects and sets session cookie', async () => {
  const res = await request(app)
    .post('/login')
    .type('form')
    .send({ username: 'testuser', password: testPassword });

  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/dashboard');
  assert.ok(Array.isArray(res.headers['set-cookie']));
  assert.match(res.headers['set-cookie'].join(';'), /stagedock\.sid=/);
});

test('unauthenticated dashboard redirects and API returns 401 JSON', async () => {
  const dashboardRes = await request(app).get('/dashboard');
  assert.equal(dashboardRes.status, 302);
  assert.equal(dashboardRes.headers.location, '/login');

  const apiRes = await request(app).get('/api/customers');
  assert.equal(apiRes.status, 401);
  assert.deepEqual(apiRes.body, { error: 'Authentication required' });
});

test('authenticated user can access dashboard and APIs', async () => {
  const agent = request.agent(app);
  await agent
    .post('/login')
    .type('form')
    .send({ username: 'testuser', password: testPassword })
    .expect(302);

  const dashboardRes = await agent.get('/dashboard');
  assert.equal(dashboardRes.status, 200);
  assert.match(dashboardRes.text, /Acme Enterprise CRM & Billing/);

  const customersRes = await agent.get('/api/customers');
  assert.equal(customersRes.status, 200);
  assert.equal(typeof customersRes.body.count, 'number');

  const createRes = await agent
    .post('/api/customers')
    .send({
      full_name: 'QA User',
      email: `qa-${Date.now()}@example.com`,
      company: 'QA Corp',
      plan: 'PRO'
    });
  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.success, true);
});

test('logout clears session and blocks protected routes again', async () => {
  const agent = request.agent(app);
  await agent
    .post('/login')
    .type('form')
    .send({ username: 'testuser', password: testPassword })
    .expect(302);

  const logoutRes = await agent.post('/logout');
  assert.equal(logoutRes.status, 302);
  assert.equal(logoutRes.headers.location, '/login');

  const dashboardRes = await agent.get('/dashboard');
  assert.equal(dashboardRes.status, 302);
  assert.equal(dashboardRes.headers.location, '/login');

  const apiRes = await agent.get('/api/orders');
  assert.equal(apiRes.status, 401);
});
