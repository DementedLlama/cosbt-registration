# COSBT Camp Hotel Registration — Project Handoff

> **Purpose of this file:** This is a living document maintained to guard against context loss (Claude compaction, app freezes, session resets). It is updated before every context handoff. If starting a fresh Claude session, share this file first and ask Claude to continue from where we left off.

**Last updated:** 2026-02-28 (end of session 1)
**Git branch:** `main`
**Last commit:** `28c8ab8` — docs: add handoff.md for session continuity and context recovery
**GitHub repo:** https://github.com/DementedLlama/cosbt-registration (public)
**Working tree:** Clean (nothing uncommitted)
**Deployment target:** Vercel + AWS RDS (not yet deployed — next step)

---

## Project Overview

**What is this?** A hotel room registration web app for Church of Singapore (Bukit Timah) camp events. Church members fill out a form to book hotel rooms for a camp; the admin team tracks registrations and payment through a protected dashboard.

**Folder location (user's computer):** The project folder the user has selected in Cowork. All files are under `cosbt-camp-registration/`.

---

## Tech Stack

| Area | Choice |
|---|---|
| Framework | Next.js 14.2, App Router, TypeScript (strict) |
| ORM | Prisma 7 — driver adapter mode (`@prisma/adapter-pg`) |
| Database | PostgreSQL 16 (local: Docker; prod: AWS RDS) |
| Auth | NextAuth.js v4 — JWT strategy, Credentials provider, 8-hour sessions |
| Email | AWS SES via `src/lib/email.ts` (skipped gracefully if unconfigured) |
| File storage | AWS S3 via `src/lib/s3.ts` (skipped gracefully if unconfigured) |
| Styling | Tailwind CSS with CSS custom properties (`--color-primary: #8b0000`) |
| Validation | Zod v4 (server-side); React Hook Form installed but wizard uses `useState` |
| Encryption | AES-256-GCM for passport/NRIC numbers (`src/lib/encryption.ts`) |

**Critical environment variables:**
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — random base64 secret for JWT signing
- `NEXTAUTH_URL` — canonical URL (`http://localhost:3000` locally)
- `ENCRYPTION_KEY` — 64-char hex key for AES-256-GCM. **NEVER change this after go-live** or all stored passport numbers become unreadable.

---

## Repository State

Three commits on `main`:

| Commit | Message |
|---|---|
| `fdbcb35` | Initial commit from Create Next App |
| `ef3f2df` | feat: COSBT Camp Hotel Registration — initial working build |
| `28c8ab8` | docs: add handoff.md for session continuity and context recovery |

**GitHub:** https://github.com/DementedLlama/cosbt-registration (public, pushed ✅)
**Remote:** `origin` → `https://github.com/DementedLlama/cosbt-registration.git`

---

## Full File Map & Status

### Public-facing pages

| File | Status | Notes |
|---|---|---|
| `src/app/(public)/page.tsx` | ✅ Done | Landing page — shows event name, dates, hotel, opens registration |
| `src/app/(public)/layout.tsx` | ✅ Done | Minimal public layout |
| `src/app/(public)/register/page.tsx` | ✅ Done | Server component — fetches active event + pricing, passes to wizard |
| `src/app/(public)/register/confirmation/page.tsx` | ✅ Done | Confirmation page after registration — reads query params |

### Registration wizard

| File | Status | Notes |
|---|---|---|
| `src/components/registration/RegistrationWizard.tsx` | ✅ Done | 3-step client component wizard (~1,000 lines) |

**Wizard step breakdown:**
- **Step 1 (StepContact):** Room In-Charge — full name, email, mobile, church name, PDPA consent checkbox (with full notice text). Client-side validation before advancing.
- **Step 2 (StepOccupants):** Dynamic list of OccupantCards (up to 3 adults/students + unlimited children). PricePanel (sticky, live price estimate). Add/remove buttons. CWB extra bed — max 1 per room enforced in UI.
- **Step 3 (StepReview):** Summary table. Submit button calls `POST /api/registrations`. On success: redirect to `/register/confirmation?invoice=...&name=...&email=...&total=...`.

**Key types in RegistrationWizard.tsx:**
```typescript
type OccupantType = "ADULT" | "CHILD_PRIMARY" | "CHILD_PRESCHOOL";
type BedType = "CWB" | "CWOB" | "NOT_APPLICABLE";
type OccupantInput = {
  _key: number;      // local React key only — stripped before API call
  fullName: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;   // "YYYY-MM-DD"
  occupantType: OccupantType;
  isStudent: boolean;       // adults only
  bedType: BedType;         // children only; adults always NOT_APPLICABLE
};
```

**Package type logic:**
- Count occupants where `occupantType === "ADULT"` (this includes students, since students are adults with `isStudent: true`)
- 1 adult → SINGLE, 2 → TWIN, 3 → TRIPLE. Max 3 adults per room.
- Children never affect package type.

### API routes

| File | Status | Notes |
|---|---|---|
| `src/app/api/registrations/route.ts` | ✅ Done | Full POST handler (Zod → validate → price → invoice → DB → audit → email) |
| `src/app/api/auth/[...nextauth]/route.ts` | ✅ Done | NextAuth handler |
| `src/app/api/admin/events/route.ts` | 🔲 Stub | Returns 501 Not Implemented |
| `src/app/api/admin/pricing/route.ts` | 🔲 Stub | Returns 501 Not Implemented |
| `src/app/api/admin/registrations/route.ts` | 🔲 Stub | Returns 501 Not Implemented |
| `src/app/api/admin/users/route.ts` | 🔲 Stub | Returns 501 Not Implemented |

**POST `/api/registrations` flow:**
1. Parse JSON body
2. Zod validation (ContactSchema + OccupantSchema with cross-field refinements)
3. Fetch active `CampEvent` (where `isActive = true`)
4. Check registration deadline not passed
5. Fetch `PricingRubric` for the event
6. Determine `PackageType` from adult count
7. `calculateTotalAmount()` — iterate occupants, apply rates + CWB surcharge
8. `generateInvoiceNumber()` — SERIALIZABLE Prisma transaction, format `COSBT-YYYY-NNNN`
9. Encrypt each `passportNumber` with `encrypt()`
10. Prisma write: create `Registration` → `Room` → `Occupant[]` in one transaction
11. `logAudit()` — best-effort, never blocks
12. `sendInvoiceEmail()` — best-effort, never blocks
13. Return 201 with invoice number

### Admin panel pages

| File | Status | Notes |
|---|---|---|
| `src/app/admin/layout.tsx` | ✅ Done | Sidebar nav, user info bar, role display, sign-out button |
| `src/app/admin/dashboard/page.tsx` | ✅ Done | Summary stat cards (hardcoded 0s — data fetch is next step) |
| `src/app/admin/events/page.tsx` | 🔲 Stub | "Coming Soon" placeholder |
| `src/app/admin/events/[id]/page.tsx` | 🔲 Stub | "Coming Soon" placeholder |
| `src/app/admin/pricing/page.tsx` | 🔲 Stub | "Coming Soon" placeholder |
| `src/app/admin/registrations/page.tsx` | 🔲 Stub | "Coming Soon" placeholder |
| `src/app/admin/registrations/[id]/page.tsx` | 🔲 Stub | "Coming Soon" placeholder |
| `src/app/admin/users/page.tsx` | ✅ Done | Renders real session user; full management UI is next step |
| `src/app/(admin-public)/admin/login/page.tsx` | ✅ Done | Login form with NextAuth `signIn("credentials")` |

### Lib utilities

| File | Status | Notes |
|---|---|---|
| `src/lib/auth.ts` | ✅ Done | NextAuth config — credentials provider, bcrypt, JWT, `logAudit` on login |
| `src/lib/prisma.ts` | ✅ Done | Singleton Prisma client with HMR-safe global caching |
| `src/lib/encryption.ts` | ✅ Done | `encrypt()`, `decrypt()`, `isEncrypted()` — AES-256-GCM |
| `src/lib/invoice.ts` | ✅ Done | `generateInvoiceNumber()` — SERIALIZABLE tx, `COSBT-YYYY-NNNN` |
| `src/lib/audit.ts` | ✅ Done | `logAudit()` — best-effort, never throws, `getClientIp()` |
| `src/lib/email.ts` | ✅ Done | `sendEmail()` via AWS SES, `sendInvoiceEmail()` wrapper |
| `src/lib/s3.ts` | ✅ Done | `uploadFile()`, `getFileUrl()`, `deleteFile()` — graceful skip |

### Infrastructure

| File | Status | Notes |
|---|---|---|
| `prisma/schema.prisma` | ✅ Done | Full schema — see models below |
| `prisma/seed.ts` | ✅ Done | Creates `admin@cosbt.org.sg` / `changeme123` as SUPER_ADMIN |
| `prisma.config.ts` | ✅ Done | Prisma 7 driver-adapter config pointing to `src/generated/prisma` |
| `src/middleware.ts` | ✅ Done | `withAuth` — protects `/admin/((?!login).*)`, SUPER_ADMIN gate on `/admin/users` |
| `src/types/next-auth.d.ts` | ✅ Done | Extends `Session.user` with `id`, `role`, `isActive` |
| `docker-compose.yml` | ✅ Done | Postgres 16 on port 5432, DB: `cosbt_camp` |
| `.github/workflows/ci.yml` | ✅ Done | CI: `prisma generate` → `tsc --noEmit` → `npm run lint` on push/PR to main |
| `.env` | ✅ In repo | Contains only local dev `DATABASE_URL` — safe per project convention |
| `.env.local` | 🔒 Gitignored | Contains real `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` — never commit |
| `.env.example` | ✅ In repo | Template for all required env vars |

---

## Database Schema (Prisma)

```
CampEvent        id, name, startDate, endDate, hotelName, registrationDeadline, isActive
PricingRubric    id, campEventId, packageType(SINGLE/TWIN/TRIPLE), adultRate, studentRate,
                 primarySchoolRate, preschoolRate, extraBedRate
Registration     id, invoiceNumber(COSBT-YYYY-NNNN), roomInChargeName/Email/Mobile/Church,
                 campEventId, paymentStatus(UNPAID/PAID/WAIVED), pdpaConsent/ConsentAt
Room             id, registrationId, packageType, totalAmount, invoiceNumber(@unique)
Occupant         id, roomId, fullName, nationality, passportNumber(AES-256-GCM ciphertext),
                 passportExpiry, occupantType, isStudent, bedType
User             id, email(@unique), name, role(SUPER_ADMIN/ADMIN/VIEW_ONLY), isActive,
                 passwordHash, lastLoginAt
AuditLog         id, userId(nullable), action, targetTable, targetId, metadata(JSON), ip, createdAt
```

**Enums:** `UserRole`, `PackageType`, `PaymentStatus`, `OccupantType`, `BedType`

---

## Bugs Fixed (all committed)

| # | Location | Bug | Fix |
|---|---|---|---|
| 1 | `route.ts` `calculateTotalAmount` | `CHILD_PRESCHOOL` + CWB never charged `extraBedRate` → price mismatch between frontend and stored total | Added else-branch for `CHILD_PRESCHOOL` that adds `extraBedRate` when `bedType === "CWB"` |
| 2 | `route.ts` Zod schema | Passport expiry only validated format, not future-date → expired passports accepted by API | Added `.refine((s) => new Date(s) > new Date(), "Passport / NRIC must not be expired")` |
| 3 | `route.ts` `OccupantSchema` | No cross-field validation → crafted payload could send `CHILD_PRIMARY` with `isStudent: true`, or `ADULT` with `bedType: "CWB"` | Added three `.refine()` checks on `OccupantSchema` |
| 4 | `route.ts` `buildInvoiceHtml` | Dead `pricing: PricingRecord` parameter — passed in but never read | Removed from function signature and call site |
| 5 | `src/lib/auth.ts` | Missing `ADMIN_LOGIN` audit log on successful login (required by architecture doc) | Imported `logAudit` and added best-effort `void logAudit(...)` after successful login |
| 6 | `src/app/admin/layout.tsx` | `role.replace("_", " ")` uses string literal — only replaces first underscore | Changed to `role.replace(/_/g, " ")` |
| 7 | `RegistrationWizard.tsx` | `{ _key: _ignored, ...rest }` — `_ignored` declared but never used (ESLint warning) | Changed to `{ _key, ...rest }` |

---

## Known Architectural Concerns (not yet fixed — require design decisions)

1. **Invoice race condition** — `generateInvoiceNumber()` uses SERIALIZABLE transaction for the SELECT but the INSERT happens outside the transaction. Two simultaneous submissions can receive the same invoice number; the `@unique` constraint is the only guard, causing a 500 for the second user. *Recommended fix: add a retry loop.*

2. **Deactivated users stay logged in** — JWT is issued for 8 hours and the session callback does not re-query the DB. If an admin deactivates a user, they remain logged in until token expiry. *Recommended fix: DB lookup in session callback, or reduce token lifetime.*

3. **No rate limiting on `POST /api/registrations`** — public endpoint, no protection against spam or abuse. *Recommended fix: Vercel Edge rate limiting or `@upstash/ratelimit`.*

4. **Email in confirmation URL** — `?email=abc@example.com` is visible in browser history and server logs. Low severity. *Recommended fix: server-side session or encrypted token.*

---

## What's Done vs. What's Next

### ✅ Completed

- Full Prisma schema + seed script
- NextAuth admin login (bcrypt, JWT, role-based)
- Middleware route protection (admin-only, SUPER_ADMIN gate)
- Admin sidebar layout
- Public landing page
- 3-step registration wizard with live pricing
- Full `POST /api/registrations` (validate → price → invoice → DB → audit → email)
- AES-256-GCM passport encryption
- AWS SES email (graceful skip)
- AWS S3 file storage helpers (graceful skip)
- Audit logging
- GitHub Actions CI (type-check + lint on push/PR)
- Clean git history, project README, ARCHITECTURE.md
- `handoff.md` (this file) — committed and updated at end of every session
- Code pushed to GitHub: https://github.com/DementedLlama/cosbt-registration

### 🔲 Next to Build (suggested order)

1. **Admin: Camp Events CRUD** — `src/app/api/admin/events/route.ts` + `src/app/admin/events/page.tsx` + `[id]/page.tsx`
   - List all events, create new event, edit event, toggle `isActive`
   - Only one event can be `isActive` at a time (enforce in API)

2. **Admin: Pricing configuration** — `src/app/api/admin/pricing/route.ts` + `src/app/admin/pricing/page.tsx`
   - Set rates for each `PackageType` for a given event
   - SINGLE/TWIN/TRIPLE × adultRate/studentRate/primarySchoolRate/preschoolRate/extraBedRate

3. **Admin: Registrations list** — `src/app/api/admin/registrations/route.ts` + `src/app/admin/registrations/page.tsx`
   - Table with search, filter by payment status, sort
   - Columns: invoice number, Room In-Charge name, package type, pax, total, payment status, submitted at

4. **Admin: Registration detail view** — `src/app/admin/registrations/[id]/page.tsx`
   - Show full room + occupant details
   - Decrypt and display passport numbers (for authorised roles)
   - Payment status update (mark as PAID/WAIVED)

5. **Admin: User Accounts** — `src/app/api/admin/users/route.ts` + `src/app/admin/users/page.tsx`
   - SUPER_ADMIN only
   - Create user, deactivate/reactivate, reset password
   - List all users with role and last login

6. **Admin: Dashboard data** — wire up the summary cards in `src/app/admin/dashboard/page.tsx` with real DB counts

7. **Admin: Export** — download registrations as Excel/CSV

---

## How to Resume in a Fresh Claude Session

1. Open the `cosbt-camp-registration` folder in Cowork
2. Share this `handoff.md` file with Claude
3. Say: *"Please continue building the COSBT camp registration app. Read the handoff.md for full context and pick up from where we left off."*
4. Claude should read `handoff.md` plus any relevant source files before starting

**Handoff update cadence:** This file is updated and committed at the end of every working session.

---

## Local Dev Quick-Start (for new contributors)

```bash
# 1. Install dependencies
npm install

# 2. Start local Postgres
docker compose up -d

# 3. Copy env template and fill in secrets
cp .env.example .env.local
# edit .env.local: add NEXTAUTH_SECRET, ENCRYPTION_KEY, optionally AWS vars

# 4. Push schema and seed DB
npx prisma db push
npx prisma db seed

# 5. Start dev server
npm run dev
# → http://localhost:3000        (public registration)
# → http://localhost:3000/admin  (admin panel)
# Default login: admin@cosbt.org.sg / changeme123
```
