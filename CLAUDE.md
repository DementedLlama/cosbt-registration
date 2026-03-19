# CLAUDE.md — COSBT Camp Hotel Registration

## Project Overview

Church of Singapore (Bukit Timah) camp hotel registration app. Church members register hotel rooms for camp events; admin team tracks registrations and payment via a protected dashboard.

**GitHub:** https://github.com/DementedLlama/cosbt-registration

## Tech Stack

- **Framework:** Next.js 14.2 (App Router, TypeScript strict)
- **ORM:** Prisma 7 — driver adapter mode (`@prisma/adapter-pg`)
- **Database:** PostgreSQL 16 (local: Docker on port 5432; prod: AWS RDS)
- **Auth:** NextAuth.js v4 — JWT strategy, Credentials provider, 8-hour sessions
- **Styling:** Tailwind CSS 3.4 with CSS custom properties (`--color-primary: #8b0000`)
- **Validation:** Zod v4 (server-side); wizard uses `useState` (not React Hook Form)
- **Encryption:** AES-256-GCM for passport numbers (`src/lib/encryption.ts`)
- **Rate Limiting:** Upstash Redis (`@upstash/ratelimit`) — login (5/15min) and registration (5/min/IP)
- **Email:** AWS SES (graceful skip if unconfigured)
- **File storage:** AWS S3 (graceful skip if unconfigured)
- **Export:** ExcelJS for `.xlsx` registration manifests

## Critical Rules

1. **Prisma 7 imports** — always use generated paths:
   - `import { PrismaClient } from "@/generated/prisma/client"`
   - `import { Prisma } from "@/generated/prisma/client"`
   - `import { Decimal } from "@/generated/prisma/internal/prismaNamespace"`
   - Never import from `@prisma/client` directly.

2. **ENCRYPTION_KEY** — never change after go-live. All stored passport numbers become unreadable if the key changes.

3. **Passport numbers** — must be encrypted before DB write and decrypted on read. Never store or log plaintext. Use `encrypt()`/`decrypt()` from `src/lib/encryption.ts`.

4. **One active event** — only one `CampEvent` may have `isActive = true` at a time. Enforce at application level when activating.

5. **Package type** — determined by adult + student count only (children excluded). SINGLE=1, TWIN=2, TRIPLE=3.

6. **`totalAmount`** on Room is computed at write time from PricingRubric and stored. Never recalculate on read.

7. **Invoice number** format: `COSBT-YYYY-NNNN`. Generated via SERIALIZABLE Prisma transaction in `src/lib/invoice.ts`.

8. **Audit logging** — all sensitive access and admin mutations must call `logAudit()`. Best-effort, never blocks/throws.

9. **Max 1 CWB (extra bed)** per room — enforced in both UI and API validation.

10. **Next of Kin** — every occupant requires `nokName` and `nokContact`. The wizard supports a "same NOK" toggle to copy values across occupants.

## Common Commands

```bash
npm run dev            # Start dev server (http://localhost:3000)
npm run build          # prisma generate + next build
npm run lint           # ESLint
npm run db:generate    # Regenerate Prisma client after schema changes
npm run db:push        # Push schema to DB (dev only)
npm run db:seed        # Seed database with sample data
npm run db:studio      # Open Prisma Studio GUI
docker compose up -d   # Start local PostgreSQL
```

**CI pipeline** (`.github/workflows/ci.yml`): `prisma generate` → `tsc --noEmit` → `npm run lint` → `npm run build` (on push/PR to main)

**Seed DB:** `DATABASE_URL="postgresql://cosbt:cosbt@localhost:5432/cosbt_camp" npx tsx prisma/seed.ts`
- Default admin: `admin@cosbt.org.sg` / `ChangeMe@123!`

## Project Structure

```
src/
├── app/
│   ├── (public)/                              # Public pages (unprotected)
│   │   ├── page.tsx                           # / — landing page
│   │   ├── layout.tsx                         # Public layout wrapper
│   │   └── register/
│   │       ├── page.tsx                       # /register — fetches active event → wizard
│   │       └── confirmation/page.tsx          # Post-registration confirmation
│   ├── (admin-public)/                        # Login page (no admin sidebar)
│   │   └── admin/login/page.tsx
│   ├── admin/                                 # Protected admin pages (sidebar layout)
│   │   ├── layout.tsx                         # Sidebar nav, session guard
│   │   ├── dashboard/page.tsx                 # Stats cards from DB
│   │   ├── events/                            # Camp events CRUD
│   │   │   ├── page.tsx                       # List events
│   │   │   ├── new/page.tsx                   # Create event
│   │   │   └── [id]/page.tsx                  # Edit event
│   │   ├── pricing/                           # Pricing rubric per event
│   │   │   ├── page.tsx                       # Pricing list
│   │   │   └── [eventId]/page.tsx             # Set/edit rates
│   │   ├── registrations/                     # Registration management
│   │   │   ├── page.tsx                       # List (search, filter, paginate)
│   │   │   └── [id]/page.tsx                  # Detail + payment update
│   │   └── users/page.tsx                     # User management (SUPER_ADMIN only)
│   ├── api/
│   │   ├── registrations/route.ts             # POST: public registration
│   │   ├── auth/[...nextauth]/route.ts        # NextAuth handler
│   │   └── admin/
│   │       ├── events/route.ts                # GET/POST events
│   │       ├── events/[id]/route.ts           # GET/PUT event
│   │       ├── pricing/route.ts               # GET/POST pricing
│   │       ├── registrations/route.ts         # GET list (paginated, filtered)
│   │       ├── registrations/[id]/route.ts    # GET detail, PUT payment/notes
│   │       ├── registrations/export/route.ts  # GET Excel export (.xlsx)
│   │       ├── users/route.ts                 # GET list, POST create
│   │       └── users/[id]/route.ts            # PUT update user
│   └── layout.tsx                             # Root layout with SessionProvider
├── components/
│   ├── registration/
│   │   └── RegistrationWizard.tsx             # 3-step wizard (~1,100 lines)
│   ├── admin/
│   │   ├── EventForm.tsx                      # Event create/edit form
│   │   ├── PricingForm.tsx                    # Pricing rate input form
│   │   ├── PaymentStatusForm.tsx              # Payment status + admin notes
│   │   ├── RegistrationFilters.tsx            # Search, status, event filters
│   │   ├── ToggleActiveButton.tsx             # Activate/deactivate event
│   │   ├── ExportButton.tsx                   # Excel export trigger
│   │   ├── UserManagement.tsx                 # User CRUD UI
│   │   └── SignOutButton.tsx                  # Sign out button
│   └── providers/
│       └── SessionProvider.tsx                # NextAuth SessionProvider wrapper
├── lib/
│   ├── auth.ts          # NextAuth config (credentials, bcrypt, JWT, audit on login)
│   ├── prisma.ts        # Singleton Prisma client (HMR-safe)
│   ├── encryption.ts    # AES-256-GCM encrypt/decrypt/isEncrypted
│   ├── invoice.ts       # SERIALIZABLE invoice number generator
│   ├── audit.ts         # logAudit() + getClientIp() — best-effort, never throws
│   ├── email.ts         # AWS SES sendEmail/sendInvoiceEmail
│   ├── s3.ts            # AWS S3 upload/get/delete
│   └── redis.ts         # Upstash Redis client + rate limiters
├── middleware.ts         # withAuth for /admin/* route protection
└── types/
    └── next-auth.d.ts   # Session/User/JWT type extensions
```

## API Routes

### Public

| Method | Endpoint | Purpose | Rate Limit |
|--------|----------|---------|------------|
| POST | `/api/registrations` | Submit registration | 5/min/IP |

### Admin (all require JWT session)

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/api/admin/events` | VIEW_ONLY+ | List events |
| POST | `/api/admin/events` | ADMIN+ | Create event |
| GET/PUT | `/api/admin/events/[id]` | VIEW_ONLY+/ADMIN+ | Get/update event |
| GET/POST | `/api/admin/pricing` | VIEW_ONLY+/ADMIN+ | Get/upsert pricing |
| GET | `/api/admin/registrations` | VIEW_ONLY+ | List (paginated, filtered) |
| GET/PUT | `/api/admin/registrations/[id]` | VIEW_ONLY+/ADMIN+ | Detail/update payment |
| GET | `/api/admin/registrations/export` | ADMIN+ | Excel export |
| GET/POST | `/api/admin/users` | SUPER_ADMIN | List/create users |
| PUT | `/api/admin/users/[id]` | SUPER_ADMIN | Update user |

## RBAC

| Action | VIEW_ONLY | ADMIN | SUPER_ADMIN |
|---|---|---|---|
| View dashboard, events, pricing, registrations | Yes | Yes | Yes |
| Create/edit events & pricing | No | Yes | Yes |
| Update payment status / admin notes | No | Yes | Yes |
| View decrypted passport numbers | No | Yes | Yes |
| Export registrations to Excel | No | Yes | Yes |
| User management (`/admin/users`) | No | No | Yes |

Enforced in both middleware (`src/middleware.ts`) and individual route/page guards. Session callback re-queries DB on every request to sync role changes and check `isActive`.

## Database Schema (key models)

**Enums:** `UserRole` (SUPER_ADMIN, ADMIN, VIEW_ONLY), `PackageType` (SINGLE, TWIN, TRIPLE), `PaymentStatus` (UNPAID, PAID, PARTIAL), `OccupantType` (ADULT, CHILD_PRIMARY, CHILD_PRESCHOOL), `BedType` (CWB, CWOB, NOT_APPLICABLE), `TransportMode` (COACH, OWN_TRANSPORT)

- **CampEvent** — camp details, dates, `isActive` flag (only one active at a time)
- **PricingRubric** — 1:1 with CampEvent, all rate fields (adult/student/child per package type, extra bed, preschool, transport)
- **Registration** — one per Room I/C submission, contact info, PDPA consent
- **Room** — one hotel room = one invoice, packageType, totalAmount, paymentStatus
- **Occupant** — per person in room: encrypted passport, DOB, nationality, transport mode, bed type, Next of Kin (`nokName`, `nokContact`)
- **User** — admin staff only, bcrypt password, role enum, `isActive` flag
- **AuditLog** — immutable write-only trail (userId, action, targetTable, targetId, ipAddress)

## Security

- **CSP headers** in `next.config.mjs`: `default-src 'self'`, `script-src 'self' 'unsafe-inline'`, `frame-ancestors 'none'`
- **HSTS** in production (2-year max-age with preload)
- **X-Frame-Options:** DENY, **X-Content-Type-Options:** nosniff
- **Permissions-Policy:** disables camera, microphone, geolocation
- **`poweredByHeader: false`** hides Next.js version
- **Rate limiting:** Upstash Redis for login attempts and registration submissions
- **Passport encryption:** AES-256-GCM at rest, decrypted only for ADMIN+ on read

## Env Variables

Required in `.env.local` (gitignored):
- `NEXTAUTH_SECRET` — `openssl rand -base64 32`
- `ENCRYPTION_KEY` — `node -e "const {randomBytes}=require('crypto');console.log(randomBytes(32).toString('base64'))"`

In `.env` (committed, local dev only):
- `DATABASE_URL=postgresql://cosbt:cosbt@localhost:5432/cosbt_camp`
- `NEXTAUTH_URL=http://localhost:3000`

Rate limiting (required for production):
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional (AWS, leave empty for local dev): `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_SES_FROM_EMAIL`

## Deployment

- **Platform:** Vercel (standard Next.js — no `vercel.json` needed)
- **Build command:** `prisma generate && next build` (configured in `package.json`)
- **`postinstall` hook:** runs `prisma generate` automatically on `npm install`
- **Vercel env vars required:** `DATABASE_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Optional Vercel env vars:** `AWS_*` for SES email and S3 file storage

## Potential Future Enhancements

- Email verification for registrants
- Bulk payment status update in admin
- Registration cancellation flow
- Dashboard charts/analytics

## Context Management

When context is running long or before /compact, update `handoff.md` with:
- Current task and exact status
- Last file modified and what changed
- Decisions made this session and why
- Rejected approaches (prevent revisiting dead ends)
- Exact next step to resume from
