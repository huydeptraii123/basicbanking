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
  - Add Appwrite/PlaiD/Dwolla initialization inside the backend and wire endpoints.
