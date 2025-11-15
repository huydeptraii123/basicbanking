# Backend (separate service)

This folder contains a minimal Express + TypeScript scaffold to start a separate backend.

Quick start (Windows cmd.exe):

```cmd
cd d:\\bank\\backend
npm install
npm run dev
```

What I created:
- `api-backup/` — a byte-for-byte backup copy of `app/api` and important `lib` modules (so you have the original Next.js API code preserved).
- `backend/` — a small Express scaffold with a sample route `/api/sentry-example-api` that replicates the thrown error from the original Next route.

Notes & next steps:
- Many of the backed-up server modules import Next.js-specific helpers (e.g. `cookies()` from `next/headers`) or rely on server components. You will need to adapt these to standard Express request/response (for example, read cookies from `req.cookies` or from headers).
- If you want, I can:
  - Convert one or more real endpoints into Express endpoints (adapting `createSessionClient`/`createAdminClient` to use request headers or environment keys).
  - Add Appwrite/Plaid initialization inside the backend and wire endpoints.

## Sentry setup

1. **Environment variables**
  - Frontend/Next.js keeps using the root `.env` (add `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, etc. there if you need client-side capture).
  - The Express backend reads `backend/.env`. Copy `backend/.env.example` to `backend/.env` and fill in `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE`.
2. **Install dependencies** (run from `backend/`):

  ```cmd
  npm install
  ```

3. **Run the backend**. All incoming requests now pass through Sentry's request + tracing middleware, and any thrown error is forwarded to Sentry before returning JSON with an `eventId`:

  ```cmd
  npm run dev
  ```

4. **Verify locally** by hitting `/api/sentry-example-api` or forcing an error in another route; you should see the event in your Sentry dashboard almost immediately.
