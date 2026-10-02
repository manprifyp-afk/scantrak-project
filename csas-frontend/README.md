# CSAS — Frontend (Phase 3)

React + Vite + TypeScript frontend for the Campus Smart Attendance System.
Talks to the backend API. **Step 1 delivered:** folder structure, design tokens
(Tailwind v4), and the foundational routing. Login forms and dashboards come next.

## Stack
- React + Vite + TypeScript
- Tailwind CSS v4 (CSS-first `@theme` — no `tailwind.config.js`)
- React Router (declarative)
- Zustand for auth/session state (persisted)
- axios for the API layer · lucide-react for icons

## Run it
```bash
npm install
npm run dev          # http://localhost:5173
```
The backend must be running too (the `dev` server in the `csas-backend` folder).

## Backend URL
Set in `.env` as `VITE_API_URL`. It points to **http://localhost:4000** — the
port your backend actually runs on. (The kickoff doc said 5000; your backend's
`.env` uses 4000. Change one or the other so they match — this is set to 4000.)

## What works now
- `/login` → choose Lecturer or Student
- `/login/lecturer`, `/login/student` → placeholder forms (centered auth shell)
- `/lecturer` → protected (LECTURER/ADMIN), shows the app shell
- `/student` → protected (STUDENT), shows the app shell
- Wrong-role or signed-out users are redirected automatically
- `*` → 404

Pages are intentionally minimal placeholders — Step 1 is structure + tokens +
routing only.

## Design tokens
All in `src/index.css` under `@theme`: a deep-teal `brand` scale, `ink` slate
neutrals, `canvas`/`surface` backgrounds, and `pass`/`fail`/`warn` status colors
(each with a soft tint). Fonts: Sora (display), IBM Plex Sans (body), IBM Plex
Mono (codes). Use them as normal utilities, e.g. `bg-brand-600`, `text-ink-900`,
`bg-pass-soft`, `font-display`.

## Notes
- Device binding (student) uses a persistent `localStorage` UUID via
  `src/lib/device.ts` — browsers can't read a true hardware ID. Weaker than a
  native app, but the honest web equivalent.
- Tokens persist auth in `localStorage`. For stricter storage, move to HttpOnly
  cookies (would require a small backend change to set the cookie).
