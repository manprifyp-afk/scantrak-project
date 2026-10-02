# CSAS — Backend Engine

The full API and validation logic for the Campus Smart Attendance System.
**No UI** — this layer exists so the math (geo-fence) and security features
(TOTP, device binding, JWT) work and can be tested on their own.

Stack: Node.js + Express + TypeScript · Prisma + PostgreSQL · otplib · bcryptjs ·
JWT · Zod · helmet · express-rate-limit.

---

## Quick start

```bash
npm install
# .env already contains your DATABASE_URL; a JWT_SECRET was generated for you.
npm run prisma:migrate      # create the tables
npm run seed                # sample admin/lecturer/student + an active session
npm run dev                 # http://localhost:4000
```

Verify the core logic anytime, with no database needed:

```bash
npm run check:math          # Haversine + TOTP sanity checks
npm run typecheck           # full TypeScript type-check
```

Seeded accounts (password `Password123`): `admin@csas.test`,
`lecturer@csas.test`, `student@csas.test`. The seed prints the session id and a
live code.

---

## Endpoints

### Auth
| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/auth/register` | first call: open (creates ADMIN); then ADMIN | create users |
| POST | `/auth/login` | public | log in; binds device for students |
| GET | `/auth/me` | any logged-in | current profile |

### Courses & enrollment
| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/courses` | ADMIN, LECTURER | create a course |
| GET | `/courses` | any | list (role-scoped) |
| GET | `/courses/:id` | any | course detail |
| GET | `/courses/:id/sessions` | any | sessions for a course |
| POST | `/courses/:id/enroll` | ADMIN, owning LECTURER | enroll a student (by `studentId` or `idNumber`) |
| GET | `/courses/:id/roster` | ADMIN, owning LECTURER | enrolled students |

### Sessions
| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/sessions` | LECTURER, ADMIN | open a session (geo-fence + TOTP secret) |
| GET | `/sessions/:id` | any | session detail (no secret) |
| GET | `/sessions/:id/code` | LECTURER, ADMIN | current code + QR payload |
| GET | `/sessions/:id/qr` | LECTURER, ADMIN | current code as a PNG data URL |
| POST | `/sessions/:id/close` | LECTURER, ADMIN | stop accepting scans |
| GET | `/sessions/:id/attendance` | LECTURER, ADMIN | who checked in |

### Attendance
| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/attendance/scan` | STUDENT | the three-gate validation pipeline |
| GET | `/attendance/me` | STUDENT | this student's own records |

### Reports (dashboard)
| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/reports/courses/:courseId/summary` | ADMIN, owning LECTURER | per-session counts + rates |
| GET | `/reports/sessions/:sessionId/attempts` | ADMIN, owning LECTURER | scan-attempt audit (`?outcome=REJECTED`) |

---

## The validation pipeline

`POST /attendance/scan` runs three gates in order, stopping at the first failure:

1. **TOTP** — is the scanned code still live? (kills shared screenshots)
2. **Geo-fence** — is the captured GPS within the session's radius? (Haversine)
3. **Device binding** — did the scan come from the phone bound to this account?

Only if all three pass is an `AttendanceRecord` written (`PRESENT`, or `LATE`
past the grace window). **Every** attempt — accepted or rejected — is also
written to `ScanAttempt`, which is the audit/fraud feed the reports read.

### Testing the security gates (curl)

```bash
# student login (binds device "phone-AAA"); save token as $STU
curl -s localhost:4000/auth/login -H 'content-type: application/json' \
  -d '{"email":"student@csas.test","password":"Password123","deviceId":"phone-AAA"}'

# lecturer login; save token as $LEC, session id as $SID (printed by the seed)
curl -s localhost:4000/sessions/$SID/code -H "authorization: Bearer $LEC"

# happy path -> 201 PRESENT
curl -s localhost:4000/attendance/scan -H "authorization: Bearer $STU" \
  -H 'content-type: application/json' \
  -d '{"sessionId":"'$SID'","code":"<code>","latitude":5.6037,"longitude":-0.187,"deviceId":"phone-AAA"}'
```

| To trigger | Change in the scan body | `reason` |
|---|---|---|
| Expired/forged code | `"code":"000000"` | `EXPIRED_OR_INVALID_CODE` |
| Outside the geo-fence | `"latitude":5.6100` (~700 m away) | `OUTSIDE_FENCE` |
| Wrong device | `"deviceId":"phone-BBB"` | `DEVICE_MISMATCH` |

---

## How it's organized

`src/lib` = pure logic (geo, totp, security) with no HTTP knowledge, so it's
unit-testable. `src/middleware` = auth, validation, rate limiting, errors.
`src/routes` = one file per resource. `src/config.ts` validates `.env` at boot.

## Notes for production
- Encrypt `ClassSession.totpSecret` at rest; it is never sent to clients.
- `/auth/register` is open only until the first user exists; after that it is
  ADMIN-only.
- Rate limits protect `/auth/login` and `/attendance/scan`; tune in
  `src/middleware/rateLimit.ts`.

## Verification status
Built and reviewed against the schema; the geo-fence math and TypeScript syntax
were verified here. Run `npm install && npm run typecheck && npm run check:math`
on your machine for the full type-check and a live run.
