<!-- Copilot / AI agent instructions for the Household Updater repo -->

# Quick orientation for AI coding agents

This repo is a Next.js (frontend) + Node/Express (backend) project whose main purpose is to fetch Netflix verification links from Gmail and expose them to the UI.

- Frontend: Next.js App Router (TypeScript) in `app/` — main UI at `app/page.tsx`.
- Backend: Node/Express ESM code in `backend/src/` — server entry `backend/src/server.js`.
- Helpers: `lib/` contains the frontend API client (`lib/api.ts`) and small utilities.
- Core services: `backend/src/services/gmailService.js` (IMAP connection) and `backend/src/utils/emailParser.js` (link extraction).

# High-level architecture notes

- The frontend calls the backend endpoint `/api/latest-netflix-link` (via the helper `fetchLatestNetflixLink` in `lib/api.ts`). In browser builds this uses a relative URL (empty base), so for local dev the backend must be reachable at the same origin or CORS must allow the frontend origin.
- The backend connects to Gmail via IMAP using `imap` + `mailparser` (see `gmailService.js`). It searches by FROM addresses (`info@account.netflix.com`, fallback `noreply@netflix.com`) and fetches the latest UID.
- Email parsing is implemented in `backend/src/utils/emailParser.js`. Extraction prioritizes HTML links (href) then text URLs, and it matches several Netflix verification patterns (account/travel, household, verify).

# Developer workflows & important commands

- Install frontend deps: run `npm install` at repo root.
- Install backend deps: `cd backend && npm install`.
- Run backend dev server: `cd backend && npm run dev` (prints health URL and configured `GMAIL_USER`). Backend defaults to port `5000`.
- Run frontend dev: from repo root run `npm run dev` (Next.js default port 3000).
- Health check: `http://localhost:5000/api/health`.
- Fetch link example (local):

  curl 'http://localhost:5000/api/latest-netflix-link?minutes=30'

# Environment variables & secrets

- Backend expects `GMAIL_USER` and `GMAIL_APP_PASSWORD` in `backend/.env` (16-digit app password). Also `PORT` and `FRONTEND_URL` are used by `server.js`.
- If `GMAIL_USER` or `GMAIL_APP_PASSWORD` are missing the IMAP service will reject with a clear error (see `gmailService.createConnection`).

# Project-specific conventions and gotchas

- Auth on the UI is a simple hard-coded list: `AUTHORIZED_USERS` in `app/page.tsx`. If changing authorization, update that file.
- The frontend `lib/api.ts` uses a 60s AbortController timeout for backend calls — long-running IMAP ops may hit that timeout.
- Backend uses ES modules (`import` / `export`) and expects Node to support ESM. Keep file extensions and imports consistent in backend files.
- CORS: `backend/src/server.js` has an allowlist that respects `FRONTEND_URL` and common localhost origins. If you add new frontends, update that allowlist.

# Debugging tips (where to look)

- Backend logs: `backend/src/server.js` prints startup info and `GMAIL_USER`. `backend` route handlers (`netflix.js`) and `gmailService.js` log progress and errors.
- Frontend network issues: check browser console and `fetchLatestNetflixLink` in `lib/api.ts` (it logs URL and response status).
- If no link is returned, inspect `backend/src/utils/emailParser.js` to see pattern matching and cleaning rules.

# When changing code: explicit examples

- Add a new Netflix sender to IMAP search: update `searchEmails()` in `backend/src/services/gmailService.js` (it runs two searches and falls back).
- Extend recognition keywords: update `subjectKeywords` and `contentKeywords` in `backend/src/utils/emailParser.js`.
- Adjust frontend timeout: modify `AbortController` timeout in `lib/api.ts`.

# What not to change without verification

- Don't change the IMAP connection flow or timeouts without testing with Gmail; small changes can cause auth/connection errors.
- Avoid removing the relative-URL behavior in `lib/api.ts` — deployments rely on relative URLs when frontend and backend are co-located.

# Where to look for more context

- Root README.md and `backend/README.md` contain setup and troubleshooting steps (follow the Gmail App Password instructions there).
- Key files: `app/page.tsx`, `lib/api.ts`, `backend/src/server.js`, `backend/src/routes/netflix.js`, `backend/src/services/gmailService.js`, `backend/src/utils/emailParser.js`.

If anything here is unclear or you want this shortened/expanded, tell me which areas to adjust and I'll iterate.  