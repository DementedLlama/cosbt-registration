# CLAUDE.md — COSBT Camp Hotel Registration

## Project Overview

Church of Singapore (Bukit Timah) camp hotel registration app. Church members register hotel rooms for camp events; admin team tracks registrations and payment via a protected dashboard.

**GitHub:** https://github.com/DementedLlama/cosbt-registration

## Tech Stack

- **Framework:** Next.js 14.2 (App Router, TypeScript strict)
- **ORM:** Prisma 7 — driver adapter mode (`@prisma/adapter-pg`)
- **Database:** PostgreSQL 16 (local: Docker on port 5432; prod: AWS RDS)
- **Auth:** NextAuth.js v4 — JWT strategy, Credentials provider, 8-hour sessions
- **Styling:** Tailwind CSS with CSS custom properties (`--color-primary: #8b0000`)
- **Validation:** Zod v4 (server-side); wizard uses `useState` (not React Hook Form)
- **Encryption:** AES-256-GCM for passport numbers (`src/lib/encryption.ts`)
- **Email:** AWS SES (graceful skip if unconfigured)
- **File storage:** AWS S3 (graceful skip if unconfigured)

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

## Common Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema to DB (dev only)
docker compose up -d # Start local PostgreSQL
```

**CI pipeline:** `prisma generate` → `tsc --noEmit` → `npm run lint` (GitHub Actions on push/PR to main)

**Seed DB:** `DATABASE_URL="postgresql://cosbt:cosbt@localhost:5432/cosbt_camp" npx tsx prisma/seed.ts`
- Default admin: `admin@cosbt.org.sg` / `ChangeMe@123!`

## Project Structure

```
src/app/
├── (public)/                   # Public pages (landing, registration)
│   ├── page.tsx                # / — landing page
│   ├── register/page.tsx       # /register — fetches active event, passes to wizard
│   └── register/confirmation/  # Post-registration confirmation
├── (admin-public)/             # Login page (no admin sidebar)
│   └── admin/login/page.tsx
├── admin/                      # Protected admin pages (sidebar layout)
│   ├── layout.tsx              # Sidebar nav, session guard
│   ├── dashboard/page.tsx      # Stats from DB
│   ├── events/                 # CRUD for camp events
│   ├── pricing/                # Pricing rubric per event
│   ├── registrations/          # Registration list + detail
│   └── users/page.tsx          # User management (SUPER_ADMIN only)
├── api/
│   ├── registrations/route.ts  # POST: public registration submission
│   ├── auth/[...nextauth]/     # NextAuth handlers
│   └── admin/                  # Protected admin API routes
└── layout.tsx                  # Root layout with SessionProvider

src/lib/
├── auth.ts          # NextAuth config (credentials, bcrypt, JWT, audit on login)
├── prisma.ts        # Singleton Prisma client (HMR-safe)
├── encryption.ts    # AES-256-GCM encrypt/decrypt/isEncrypted
├── invoice.ts       # SERIALIZABLE invoice number generator
├── audit.ts         # logAudit() — best-effort, never throws
├── email.ts         # AWS SES sendEmail/sendInvoiceEmail
└── s3.ts            # AWS S3 upload/get/delete

src/components/
├── registration/RegistrationWizard.tsx  # 3-step wizard (~1,100 lines)
└── admin/           # EventForm, PricingForm, PaymentStatusForm, etc.
```

## RBAC

| Action | VIEW_ONLY | ADMIN | SUPER_ADMIN |
|---|---|---|---|
| View dashboard, events, pricing, registrations | Yes | Yes | Yes |
| Create/edit events & pricing | No | Yes | Yes |
| Update payment status / admin notes | No | Yes | Yes |
| View decrypted passport numbers | No | Yes | Yes |
| User management (`/admin/users`) | No | No | Yes |

Enforced in both middleware (`src/middleware.ts`) and individual route/page guards.

## Database Schema (key models)

- **CampEvent** — camp details, dates, isActive flag
- **PricingRubric** — 1:1 with CampEvent, all rate fields (adult/student/child/transport)
- **Registration** — one per Room I/C submission, contact info, PDPA consent
- **Room** — one hotel room = one invoice, packageType, totalAmount, paymentStatus
- **Occupant** — per person in room, encrypted passport, DOB, nationality, transport mode
- **User** — admin staff only, bcrypt password, role enum
- **AuditLog** — immutable write-only trail

## Env Variables

Required in `.env.local` (gitignored):
- `NEXTAUTH_SECRET` — `openssl rand -base64 32`
- `ENCRYPTION_KEY` — `node -e "const {randomBytes}=require('crypto');console.log(randomBytes(32).toString('base64'))"`

In `.env` (committed, local dev only):
- `DATABASE_URL=postgresql://cosbt:cosbt@localhost:5432/cosbt_camp`
- `NEXTAUTH_URL=http://localhost:3000`

Optional (AWS, leave empty for local dev): `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_SES_FROM_EMAIL`

## Potential Future Enhancements

- Vercel deployment + AWS RDS setup
- Production rate limiting (e.g., Upstash Redis) to replace in-memory limiter
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
