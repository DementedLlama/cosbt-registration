# COSBT Camp Hotel Registration — Project Handoff

> **Purpose of this file:** This is a living document maintained to guard against context loss (Claude compaction, app freezes, session resets). It is updated before every context handoff. If starting a fresh Claude session, share this file first and ask Claude to continue from where we left off.

**Last updated:** 2026-03-05 (session 6 — complete)
**Git branch:** `main`
**Last commit:** See bottom of commit table
**GitHub repo:** https://github.com/DementedLlama/cosbt-registration (public)
**Working tree:** Dirty (uncommitted dateOfBirth + transportMode changes)
**Deployment target:** Vercel + AWS RDS (not yet deployed)

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

**Prisma 7 import paths (important):**
- `PrismaClient` → `import { PrismaClient } from "@/generated/prisma/client"`
- `Prisma` namespace (for `Prisma.RoomWhereInput` etc.) → `import { Prisma } from "@/generated/prisma/client"`
- `Decimal` type → `import { Decimal } from "@/generated/prisma/internal/prismaNamespace"`

---

## Repository State

Commits on `main`:

| Commit | Message |
|---|---|
| `fdbcb35` | Initial commit from Create Next App |
| `ef3f2df` | feat: COSBT Camp Hotel Registration — initial working build |
| `28c8ab8` | docs: add handoff.md for session continuity and context recovery |
| `5f1ad2e` | docs: update handoff.md — end of session 1 |
| `44f6c75` | feat: admin camp events CRUD — list, create, edit, toggle active |
| `411a909` | docs: update handoff.md for session 2 |
| `de99f5e` | fix: resilient date handling in API GET + restore confirm dialog |
| `2993cf5` | fix: replace window.confirm with inline two-step confirmation on toggle button |
| `d473b39` | feat: admin pricing + registrations CRUD, security fixes, Room I/C UX |
| (next)   | feat: add dateOfBirth to occupants, transportMode with pricing |

**GitHub:** https://github.com/DementedLlama/cosbt-registration (public)
**Remote:** `origin` → `https://github.com/DementedLlama/cosbt-registration.git`

---

## Full File Map & Status

### Public-facing pages

| File | Status | Notes |
|---|---|---|
| `src/app/(public)/page.tsx` | ✅ Done | Landing page — shows event name, dates, hotel, opens registration |
| `src/app/(public)/layout.tsx` | ✅ Done | Minimal public layout |
| `src/app/(public)/register/page.tsx` | ✅ Done | Server component — fetches active event + pricing (incl. transportRate), passes to wizard |
| `src/app/(public)/register/confirmation/page.tsx` | ✅ Done | Confirmation page after registration — reads query params |

### Registration wizard

| File | Status | Notes |
|---|---|---|
| `src/components/registration/RegistrationWizard.tsx` | ✅ Done | 3-step client component wizard (~1,100 lines) |

**Wizard step breakdown:**
- **Step 1 (StepContact):** Room I/C personal details — full name (as in passport), date of birth, nationality (dropdown, Singapore first), passport number (plain text), passport expiry, email, mobile, church, PDPA consent. All validated before advancing. The registrant is designated as Room I/C.
- **Step 2 (StepOccupants):** Occupant 1 is pre-filled from Step 1 (name, DOB, nationality, passport fields are read-only/greyed out; occupant type, student toggle, and transport remain editable). Occupant 1 cannot be removed. Additional occupants added via OccupantCards (up to 3 adults/students + unlimited children). Each occupant has a Transportation dropdown (Coach / Own transport). PricePanel (sticky, live price estimate — includes coach transport lines). CWB extra bed — max 1 per room enforced in UI.
- **Step 3 (StepReview):** Summary table with per-occupant rows, extra bed rows, and coach transport rows. Room I/C name derived from `occupants[0].fullName`. Submit button calls `POST /api/registrations`. On success: redirect to `/register/confirmation?invoice=...&name=...&email=...&total=...`.

**Key types in RegistrationWizard.tsx:**
```typescript
type OccupantType = "ADULT" | "CHILD_PRIMARY" | "CHILD_PRESCHOOL";
type BedType = "CWB" | "CWOB" | "NOT_APPLICABLE";
type TransportMode = "COACH" | "OWN_TRANSPORT";
type OccupantInput = {
  _key: string;       // local React key only — stripped before API call
  fullName: string;
  dateOfBirth: string; // "YYYY-MM-DD"
  nationality: string; // country name from COUNTRIES dropdown
  passportNumber: string;
  passportExpiry: string;   // "YYYY-MM-DD"
  occupantType: OccupantType;
  isStudent: boolean;       // adults only
  bedType: BedType;         // children only; adults always NOT_APPLICABLE
  transportMode: TransportMode; // COACH or OWN_TRANSPORT; default COACH
};
type ContactState = {
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  roomInChargeEmail: string;
  roomInChargeMobile: string;
  roomInChargeChurch: string;
  pdpaConsent: boolean;
};
```

**Nationality dropdown:** `COUNTRIES` constant — Singapore first, then all countries A–Z. Used in both Step 1 and OccupantCard.

**Package type logic:**
- Count occupants where `occupantType === "ADULT"` (this includes students, since students are adults with `isStudent: true`)
- 1 adult → SINGLE, 2 → TWIN, 3 → TRIPLE. Max 3 adults per room.
- Children never affect package type.

**Price calculation logic:**
- Base rate per adult/student determined by package type
- Child (Primary) → `childPrimaryRate`; Child (Preschool) → free (`preschoolRate` = 0)
- CWB extra bed → `extraBedRate` surcharge (max 1 per room)
- Coach transport → `transportRate` surcharge per person (only when `transportMode === "COACH"`)

### API routes

| File | Status | Notes |
|---|---|---|
| `src/app/api/registrations/route.ts` | ✅ Done | Full POST handler (Zod → validate → price → invoice → DB → audit → email). Includes dateOfBirth + transportMode. |
| `src/app/api/auth/[...nextauth]/route.ts` | ✅ Done | NextAuth handler |
| `src/app/api/admin/events/route.ts` | ✅ Done | Full GET (list) + POST (create) with Zod date validation, isActive enforcement, audit |
| `src/app/api/admin/events/[id]/route.ts` | ✅ Done | Full GET (detail) + PUT (update) with Zod date validation, isActive enforcement, audit |
| `src/app/api/admin/pricing/route.ts` | ✅ Done | GET (?eventId) + POST (upsert) with Zod rate validation incl. transportRate, audit |
| `src/app/api/admin/registrations/route.ts` | ✅ Done | GET with search, filter (status, eventId), sort, pagination. Queries Room model with registration + event joins |
| `src/app/api/admin/registrations/[id]/route.ts` | ✅ Done | GET (full detail incl. dateOfBirth + transportMode, passport decrypt for ADMIN+, VIEW_PASSPORT audit) + PUT (payment status + admin notes update) |
| `src/app/api/admin/users/route.ts` | 🔲 Stub | Returns 501 Not Implemented |

**POST `/api/registrations` flow:**
1. Parse JSON body
2. Zod validation (ContactSchema + OccupantSchema with cross-field refinements, dateOfBirth, transportMode)
3. Fetch active `CampEvent` (where `isActive = true`)
4. Check registration deadline not passed
5. Fetch `PricingRubric` for the event
6. Determine `PackageType` from adult count
7. `calculateTotalAmount()` — iterate occupants, apply rates + CWB surcharge + coach transport surcharge
8. `generateInvoiceNumber()` — SERIALIZABLE Prisma transaction, format `COSBT-YYYY-NNNN`
9. Encrypt each `passportNumber` with `encrypt()`
10. Prisma write: create `Registration` → `Room` → `Occupant[]` (incl. dateOfBirth, transportMode) in one transaction
11. `logAudit()` — best-effort, never blocks
12. `sendInvoiceEmail()` — best-effort, never blocks (email template includes Transport column)
13. Return 201 with invoice number

### Admin panel pages

| File | Status | Notes |
|---|---|---|
| `src/app/admin/layout.tsx` | ✅ Done | Sidebar nav, user info bar, role display, sign-out button |
| `src/app/admin/dashboard/page.tsx` | ✅ Done | Summary stat cards with real DB counts (active events, total rooms, unpaid rooms, total revenue) |
| `src/app/admin/events/page.tsx` | ✅ Done | Full events table: name, dates, hotel, status badge, registrations, pricing, actions |
| `src/app/admin/events/[id]/page.tsx` | ✅ Done | Edit form (ADMIN+) or read-only detail (VIEW_ONLY), stats bar |
| `src/app/admin/events/new/page.tsx` | ✅ Done | Create event — renders EventForm in create mode |
| `src/components/admin/EventForm.tsx` | ✅ Done | Reusable create/edit form with client-side validation |
| `src/components/admin/ToggleActiveButton.tsx` | ✅ Done | Inline activate/deactivate toggle with confirmation |
| `src/app/admin/pricing/page.tsx` | ✅ Done | Events list with pricing status (Configured / Not Set), links to set/edit rates |
| `src/app/admin/pricing/[eventId]/page.tsx` | ✅ Done | Edit pricing form (ADMIN+) or read-only rate summary (VIEW_ONLY). Includes transport rate section. |
| `src/components/admin/PricingForm.tsx` | ✅ Done | 10 rate inputs grouped by Adult / Student / Child+Add-on / Transport, dollar prefix, decimal validation |
| `src/app/admin/registrations/page.tsx` | ✅ Done | Table with search, payment filter, event filter, pagination. Columns: invoice, Room I/C, event, package, pax, total, status, date |
| `src/app/admin/registrations/[id]/page.tsx` | ✅ Done | Full detail: summary cards, Room I/C info, occupant cards (DOB, nationality, passport, bed type, transport) with decrypted passports (ADMIN+) or masked (VIEW_ONLY), payment update form |
| `src/components/admin/RegistrationFilters.tsx` | ✅ Done | Client component: search bar + status dropdown + event dropdown + clear filters |
| `src/components/admin/PaymentStatusForm.tsx` | ✅ Done | Payment status select + admin notes textarea with save/success feedback |
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
| `prisma/seed.ts` | ✅ Done | Creates `admin@cosbt.org.sg` / `ChangeMe@123!` as SUPER_ADMIN |
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
CampEvent        id, name, startDate, endDate, venue, hotelName, registrationDeadline, isActive, description
PricingRubric    id, campEventId(@unique), singleAdultRate, twinAdultRate, tripleAdultRate,
                 singleStudentRate, twinStudentRate, tripleStudentRate,
                 childPrimaryRate, extraBedRate, preschoolRate, transportRate
Registration     id, campEventId, roomInChargeName/Email/Mobile/Church,
                 pdpaConsent, pdpaConsentAt
Room             id, registrationId, campEventId, packageType(SINGLE/TWIN/TRIPLE),
                 invoiceNumber(@unique, COSBT-YYYY-NNNN), paymentStatus(UNPAID/PAID/PARTIAL),
                 adminNotes, totalAmount
Occupant         id, roomId, fullName, dateOfBirth, nationality,
                 passportNumber(AES-256-GCM ciphertext), passportExpiry,
                 occupantType(ADULT/CHILD_PRIMARY/CHILD_PRESCHOOL),
                 isStudent, bedType(CWB/CWOB/NOT_APPLICABLE),
                 transportMode(COACH/OWN_TRANSPORT)
User             id, email(@unique), name, role(SUPER_ADMIN/ADMIN/VIEW_ONLY), isActive,
                 passwordHash, lastLoginAt
AuditLog         id, userId(nullable), action, targetTable, targetId, ipAddress, createdAt
```

**Enums:** `UserRole`, `PackageType`, `PaymentStatus`, `OccupantType`, `BedType`, `TransportMode`

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
| 8 | `ToggleActiveButton.tsx` | `currentName` destructured but never used (ESLint, blocked build) | Removed from destructuring |
| 9 | `route.ts` `buildInvoiceHtml` | XSS vulnerability — user-supplied values interpolated directly into HTML email template | Added `escapeHtml()` and applied to all 9 user-supplied values |
| 10 | `route.ts` public registrations | Dead `GET` handler never called by any page | Removed handler |
| 11 | `api/admin/pricing` pricing rate | No-op `.transform((s) => s)` on Zod schema | Removed transform |
| 12 | `api/admin/registrations/[id]` | `adminNotes` accepted unbounded strings | Added `.max(2000)` to Zod schema |

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
- Admin: Camp Events CRUD (session 2, commit `44f6c75`)
- Admin: Pricing configuration — list events with pricing status, set/edit rates per event, read-only view for VIEW_ONLY (session 3)
- Admin: Registrations list — table with search, payment status filter, event filter, pagination (session 3)
- Admin: Registration detail — full room + occupant view, passport decryption for ADMIN+, payment status + admin notes update (session 3)
- Security audit: XSS fix in email template, dead code removal, unbounded input capping (session 3/4)
- UX: Room I/C derived from Occupant 1 — removed redundant name field from Step 1 (session 4)
- UX: Step 1 now collects Room I/C personal details (name, DOB, nationality, passport) — pre-fills Occupant 1 in Step 2 as read-only (session 5)
- UX: Nationality changed from free text to dropdown (Singapore first, then A–Z countries) (session 5)
- UX: Date of Birth added as required field for all participants (session 5)
- UX: Passport number input changed to plain text (no masking), NRIC references removed throughout (session 5)
- Backend: `dateOfBirth` (DateTime) added to Occupant model, Zod schema, DB write, admin detail API + page (session 6)
- Feature: Transportation mode per occupant — `TransportMode` enum (COACH / OWN_TRANSPORT), `transportRate` on PricingRubric, dropdown in wizard, coach fee in price calculation, Transport column in email template, transport shown in admin detail (session 6)

### 🔲 Next to Build (suggested order)

1. ~~**Admin: Camp Events CRUD**~~ ✅ Done (session 2)

2. ~~**Admin: Pricing configuration**~~ ✅ Done (session 3)

3. ~~**Admin: Registrations list**~~ ✅ Done (session 3)

4. ~~**Admin: Registration detail view**~~ ✅ Done (session 3)

5. ~~**Backend: Add `dateOfBirth` to Prisma schema + API**~~ ✅ Done (session 6)

6. ~~**Feature: Transportation mode with pricing**~~ ✅ Done (session 6)

7. **Admin: User Accounts** — `src/app/api/admin/users/route.ts` + `src/app/admin/users/page.tsx`
   - SUPER_ADMIN only
   - Create user, deactivate/reactivate, reset password
   - List all users with role and last login

8. ~~**Admin: Dashboard data**~~ ✅ Done (already wired up with real DB counts)

9. **Admin: Export** — download registrations as Excel/CSV

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
DATABASE_URL="postgresql://cosbt:cosbt@localhost:5432/cosbt_camp" npx tsx prisma/seed.ts

# 5. Start dev server
npm run dev
# → http://localhost:3000        (public registration)
# → http://localhost:3000/admin  (admin panel)
# Default login: admin@cosbt.org.sg / ChangeMe@123!
```
