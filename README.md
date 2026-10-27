# Acme Enterprise CRM & Billing (StageDock Database Test Suite)

Node 20 + Express demo CRM app with customers/orders/audit dashboard and protected APIs.

## Setup

```bash
npm install
cp .env.example .env
```

Configure `.env` (or environment variables):

- `DEMO_LOGIN_USERNAME` (default dev fallback: `admin`)
- `DEMO_LOGIN_PASSWORD` (default dev fallback: `admin123`)
- `SESSION_SECRET` (default dev fallback exists, set a strong secret for real use)
- `DATABASE_URL` (optional PostgreSQL connection string)

Without `DATABASE_URL`, the app uses demo data in memory. With PostgreSQL, the app automatically:

1. Creates the `customers`, `orders`, and `audit_logs` tables from `schema.sql`.
2. Inserts demo customers, orders, and audit events when the tables are empty.
3. Loads that data into the dashboard.

## Run

```bash
npm start
```

Open `http://localhost:3000/login`, sign in, and you will be redirected to the protected dashboard at `/dashboard`.

Default local login:

- Username: `admin`
- Password: `admin123`

## Run with PostgreSQL and Docker

The included Compose file starts PostgreSQL and the application together. Tables and dashboard demo data are created automatically on the first start.

```bash
docker compose up --build
```

Then open `http://localhost:3000/login`.

## Auth behavior



- `GET /login` is public.
- `POST /login` validates credentials server-side and sets an HTTP-only signed session cookie.
- `POST /logout` destroys the session and redirects to `/login`.
- Unauthenticated browser requests to dashboard routes redirect to `/login`.
- Unauthenticated API requests (`/api/health`, `/api/customers`, `/api/orders`, `POST /api/customers`) return `401` JSON.

## Test

```bash
npm test
```

Covers login page availability, invalid login, successful login/cookie/redirect, protected dashboard/API behavior, and logout.
hello
how are you
heloo i am working on this file please wait
