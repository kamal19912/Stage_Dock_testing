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
- `DATABASE_URL` (optional)

## Run

```bash
npm start
```

Open `http://localhost:3000/login`, sign in, and you will be redirected to the protected dashboard at `/dashboard`.

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
