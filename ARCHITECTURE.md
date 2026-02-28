# COSBT Camp Hotel Registration — Architecture Source of Truth

This document is the single authoritative reference for the system's data model,
API contract, access control rules, and key behaviours. All code must be consistent
with what is written here.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2 (App Router, TypeScript) |
| Styling | Tailwind CSS + CSS custom properties |
| ORM | Prisma 7 (driver adapter mode, `@prisma/adapter-pg`) |
| Database | PostgreSQL 16 (local: Docker; prod: AWS RDS) |
| Auth | NextAuth.js v4 — JWT strategy, Credentials provider |
| Encryption | AES-256-GCM via Node.js `crypto` (field-level, passport numbers) |
| Email | AWS SES (`@aws-sdk/client-ses`) |
| File Storage | AWS S3 (`@aws-sdk/client-s3`) |
| Validation | Zod (server-side) + React Hook Form (client-side) |

---

## 2. Database Schema

### Enums

| Enum | Values | Notes |
|---|---|---|
| `UserRole` | `SUPER_ADMIN`, `ADMIN`, `VIEW_ONLY` | Staff access level |
| `PackageType` | `SINGLE`, `TWIN`, `TRIPLE` | Based on adult + student count **only**; children are add-ons |
| `PaymentStatus` | `UNPAID`, `PAID`, `PARTIAL` | Per Room |
| `OccupantType` | `ADULT`, `CHILD_PRIMARY`, `CHILD_PRESCHOOL` | Per Occupant |
| `BedType` | `CWB` (child w/ bed), `CWOB` (child w/o own bed), `NOT_APPLICABLE` | Adults = NOT_APPLICABLE |

### Models

#### `CampEvent`
- One active event at a time (enforced at application level via `isActive` flag)
- Has one optional `PricingRubric` (1:1)
- Has many `Registration`s and `Room`s

#### `PricingRubric`
- Linked 1:1 to a `CampEvent`
- Stores per-person rates: adult (single/twin/triple), student (single/twin/triple), child primary add-on, extra bed add-on, preschool (always 0)

#### `User`
- Admin staff only (no public user accounts)
- `passwordHash` stored with bcrypt (cost factor 12)
- `lastLoginAt` updated on each successful login (fire-and-forget)

#### `Registration`
- One per Room I/C submission — a single submission may include multiple Rooms
- Holds Room I/C contact details (name, email, mobile, church)
- Records PDPA consent + timestamp

#### `Room`
- One hotel room = one Invoice
- `packageType` determined by adult + student occupant count (SINGLE=1, TWIN=2, TRIPLE=3)
- Children do **not** affect `packageType`
- `invoiceNumber` format: `COSBT-YYYY-NNNN` (unique, auto-generated)
- `totalAmount` calculated at write time and stored for reporting

#### `Occupant`
- One record per person in a room
- `passportNumber` stored as AES-256-GCM ciphertext (see §5)
- `isStudent = true` applies student room rate instead of adult rate
- Children (CHILD_PRIMARY / CHILD_PRESCHOOL) never affect `packageType`
- Max 1 CWB (extra bed) occupant per room

#### `AuditLog`
- Immutable write-only table
- Records all sensitive access and admin mutations
- Never deleted (retained for PDPA/PDPA compliance)

---

## 3. Business Rules

1. **Room tier** = number of Adults + Students only (children excluded). SINGLE=1, TWIN=2, TRIPLE=3.
2. **Extra bed** (`BedType.CWB`): maximum 1 per room. Triggers `extraBedRate` add-on.
3. **Preschool children** (ages 0–6, `CHILD_PRESCHOOL`): always free; `preschoolRate = 0` stored for audit.
4. **Primary school children** (ages 7–12, `CHILD_PRIMARY`): flat `childPrimaryRate` add-on.
5. **Invoice number** is generated atomically using a serializable Prisma transaction. Format: `COSBT-YYYY-NNNN`.
6. **`totalAmount`** on Room is computed from PricingRubric at write time and stored; it must not be recalculated on read.
7. **Only one `CampEvent`** may have `isActive = true` at a time. Application must enforce this when activating an event.
8. **Passport numbers** must be encrypted before writing to DB and decrypted on read. Never store plaintext.

---

## 4. Route Structure

```
/ ............................ Landing page (public, SSR)
/register ..................... Registration form (public)

/admin/login .................. Admin login (public, no admin layout)
/admin/dashboard .............. Dashboard (all roles)
/admin/events ................. Camp event list (all roles)
/admin/events/[id] ............ Edit event (ADMIN+)
/admin/pricing ................ Pricing rubric (all roles: read; ADMIN+: write)
/admin/registrations .......... Registration list (all roles)
/admin/registrations/[id] ..... Registration detail (all roles; passport visible to ADMIN+)
/admin/users .................. User management (SUPER_ADMIN only)
```

**File-system layout** (important — Next.js App Router):

```
src/app/
├── (public)/                   ← route group: public header/footer layout
│   ├── layout.tsx
│   ├── page.tsx                → /
│   └── register/page.tsx       → /register
├── (admin-public)/             ← route group: login page WITHOUT admin sidebar
│   └── admin/login/page.tsx    → /admin/login
├── admin/                      ← real path segment: all /admin/* pages
│   ├── layout.tsx              ← sidebar + server-side session guard
│   ├── dashboard/page.tsx
│   ├── events/page.tsx
│   ├── events/[id]/page.tsx
│   ├── pricing/page.tsx
│   ├── registrations/page.tsx
│   ├── registrations/[id]/page.tsx
│   └── users/page.tsx
├── api/
│   ├── auth/[...nextauth]/route.ts
│   ├── registrations/route.ts          ← POST: create registration (public)
│   └── admin/
│       ├── events/route.ts
│       ├── pricing/route.ts
│       ├── registrations/route.ts      ← GET: list registrations (admin)
│       └── users/route.ts
└── layout.tsx                          ← root: SessionProvider
```

---

## 5. API Endpoints

### Public

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | None | Landing page (SSR) |
| GET | `/register` | None | Registration form |
| POST | `/api/registrations` | None | Submit registration |
| GET/POST | `/api/auth/[...nextauth]` | — | NextAuth handlers |

### Admin

All admin API routes return `401 Unauthorized` if no valid session, `403 Forbidden` if insufficient role.

| Method | Path | Min Role | Description |
|---|---|---|---|
| GET | `/api/admin/events` | VIEW_ONLY | List camp events |
| POST | `/api/admin/events` | ADMIN | Create camp event |
| PUT | `/api/admin/events/[id]` | ADMIN | Update camp event |
| GET | `/api/admin/pricing` | VIEW_ONLY | Get pricing rubric |
| POST | `/api/admin/pricing` | ADMIN | Upsert pricing rubric |
| GET | `/api/admin/registrations` | VIEW_ONLY | List registrations |
| GET | `/api/admin/registrations/[id]` | VIEW_ONLY | Get registration detail |
| PATCH | `/api/admin/registrations/[id]` | ADMIN | Update payment/notes |
| GET | `/api/admin/users` | SUPER_ADMIN | List users |
| POST | `/api/admin/users` | SUPER_ADMIN | Create user |
| PATCH | `/api/admin/users/[id]` | SUPER_ADMIN | Update user |
| DELETE | `/api/admin/users/[id]` | SUPER_ADMIN | Deactivate user |

---

## 6. Role-Based Access Control (RBAC)

| Resource | VIEW_ONLY | ADMIN | SUPER_ADMIN |
|---|---|---|---|
| View dashboard, events, pricing, registrations | ✓ | ✓ | ✓ |
| Create/edit events & pricing | ✗ | ✓ | ✓ |
| Update payment status / admin notes | ✗ | ✓ | ✓ |
| View passport numbers (decrypted) | ✗ | ✓ | ✓ |
| User account management (`/admin/users`) | ✗ | ✗ | ✓ |
| Data purge | ✗ | ✗ | ✓ |

**Enforcement layers** (both must be consistent):
1. **Middleware** (`src/middleware.ts`) — runs on every request before rendering
2. **Page / API route** — server-side guard as defence-in-depth

---

## 7. Encryption

- **Algorithm**: AES-256-GCM
- **Key source**: `ENCRYPTION_KEY` environment variable (32-byte value, base64-encoded)
- **Per-call IV**: 12 random bytes (96-bit), fresh per `encrypt()` call
- **Auth tag**: 16 bytes (GCM default)
- **Stored format**: `<iv_b64>:<authTag_b64>:<ciphertext_b64>` (three colon-separated base64 segments)
  - IV segment: exactly 16 base64 characters (12 bytes)
  - Auth tag segment: exactly 24 base64 characters (16 bytes)
  - Ciphertext segment: variable length, non-empty
- **Applied to**: `Occupant.passportNumber` only
- **Guard**: `isEncrypted()` checks segment count, lengths, and base64 charset before decrypt to prevent double-encryption or corrupt data errors

---

## 8. Session & Auth

- Strategy: JWT (stored in signed cookie, no DB session table)
- Max age: 8 hours
- JWT payload: `{ id, role, isActive }`
- Session object: `{ user: { id, name, email, role, isActive } }`
- Sign-in page: `/admin/login`
- Sign-out: calls NextAuth `signOut()` client function (redirects to `/admin/login`)
- Inactive accounts (`isActive = false`) are rejected in `authorize()`

---

## 9. Audit Logging

Audit events must be logged (best-effort) for:

| Action | When |
|---|---|
| `CREATE_REGISTRATION` | Public form submission |
| `VIEW_REGISTRATION` | Admin views registration detail |
| `VIEW_PASSPORT` | Admin decrypts passport number |
| `UPDATE_PAYMENT` | Admin changes payment status |
| `EXPORT_MANIFEST` | Admin exports manifest PDF/Excel |
| `CREATE_EVENT` | Admin creates camp event |
| `UPDATE_EVENT` | Admin updates camp event |
| `CREATE_PRICING` | Admin sets pricing |
| `UPDATE_PRICING` | Admin updates pricing |
| `CREATE_USER` | Super admin creates user |
| `UPDATE_USER` | Super admin edits user |
| `DELETE_USER` | Super admin deactivates user |
| `ADMIN_LOGIN` | Successful admin login |
| `DATA_PURGE` | Super admin triggers data purge |

---

## 10. Known Deviations (Fixed in This Pass)

| # | Location | Issue | Fix |
|---|---|---|---|
| 1 | `src/app/(admin)/` | Zombie redirect stubs create unintended public routes (`/dashboard`, `/events`, `/login`, etc.) | Deleted entire `(admin)` directory |
| 2 | `src/app/admin/layout.tsx` | Sign-out `<Link>` hits GET `/api/auth/signout` → NextAuth shows confirmation page instead of logging out | Replaced with `<SignOutButton>` client component |
| 3 | `src/middleware.ts` | `/admin/users` only blocked for `VIEW_ONLY`; `ADMIN` could access user management | Changed to require `SUPER_ADMIN` |
| 4 | `src/app/admin/users/page.tsx` | Server guard only checks `VIEW_ONLY`; should check `SUPER_ADMIN` | Updated to `role !== "SUPER_ADMIN"` |
| 5 | `src/lib/invoice.ts` | `$transaction` runs at default `READ COMMITTED` isolation — concurrent requests can read the same max and generate duplicate invoice numbers | Added `{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable }` |
| 6 | `src/lib/encryption.ts` | `isEncrypted()` returns true for any string with exactly 2 colons (e.g. a passport number `AB:C:DE`) — can cause silent decrypt failures | Added IV/tag byte-length checks and base64 charset validation |
| 7 | Missing file | `/api/admin/registrations/route.ts` referenced in comments but absent | Created stub |
