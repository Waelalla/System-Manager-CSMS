# Workspace

## Overview

CSMS — Customer Service Management System. A full-stack Arabic/English web app with dark mode, RTL support, JWT auth, complaints lifecycle management, invoice follow-ups, analytics, CSV import, and role-based access control.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React + Vite + Shadcn UI + Tailwind CSS
- **State management**: TanStack React Query
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Auth**: JWT (access token 15m, refresh token 7d)

## Default User

- **Email**: wael@system.com
- **Password**: 123
- **Role**: Manager

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080)
│   └── csms/               # React+Vite frontend (previewPath: /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema (15 tables)

- `roles` — 5 roles: Customer Service Agent, Accountant, Manager, Manager/Voter, Maintenance Engineer
- `users` — staff accounts (bcrypt passwords)
- `branches` — company branches with governorate
- `products` — product catalog with categories
- `customers` — customer profiles with code generation (CUST-YYYYMMDD-XXXX)
- `invoices` — invoice records linked to customers and products
- `complaint_types` — dynamic complaint types with custom fields
- `complaints` — complaints with status lifecycle: جديدة → مستلمة → قيد الحل → محلول → مغلق
- `complaint_logs` — audit trail for every complaint action
- `feedback` — customer satisfaction ratings
- `follow_ups` — invoice follow-up tracking
- `branch_change_logs` — tracks customer branch transfers
- `import_logs` — CSV import history
- `settings` — key-value system settings
- `notifications` — polling-based notifications per user

## API Routes (all under /api prefix, JWT required except /auth/login)

- `POST /api/auth/login` — returns access_token + refresh_token + user
- `POST /api/auth/refresh` — refresh token
- `GET /api/auth/profile` — current user profile
- `GET/POST /api/users` — user management
- `GET/POST/PUT/DELETE /api/roles` — role management
- `GET/POST/PUT/DELETE /api/branches` — branch management
- `GET/POST/PUT/DELETE /api/products` — product catalog
- `GET/POST/PUT/DELETE /api/customers` — customer CRUD with search/filter
- `GET/POST /api/invoices` — invoice management
- `GET/POST/PUT/DELETE /api/complaint-types` — complaint type management
- `GET/POST /api/complaints` — complaints with filters
- `GET /api/complaints/:id` — complaint detail with logs + feedback
- `PUT /api/complaints/:id/status` — update complaint status
- `POST /api/complaints/:id/transfer` — transfer complaint to user
- `POST /api/complaints/:id/escalate` — escalate complaint
- `POST /api/complaints/:id/feedback` — add customer feedback
- `GET/POST /api/follow-ups` — invoice follow-up tracking
- `POST /api/import/csv` — bulk CSV import (customers or customers+invoices)
- `GET /api/import-logs` — import history
- `GET /api/notifications` — user notifications (with unread_only param)
- `POST /api/notifications/:id/read` — mark notification read
- `POST /api/notifications/read-all` — mark all read
- `GET /api/analytics/dashboard` — KPI dashboard stats
- `GET/PUT /api/settings` — system settings
- `GET /api/branch-change-logs` — branch transfer history

## Frontend Pages

- `/login` — Auth page (pre-filled with default credentials)
- `/` — Dashboard with KPI cards and trend chart
- `/customers` — Customer management with search, pagination, add dialog
- `/complaints` — Complaints list with status badges
- `/complaints/:id` — Complaint detail with logs and actions
- `/analytics` — Analytics charts (by status, priority, type, branch, agent)
- `/follow-ups` — Invoice follow-ups with star rating dialog (auto-complaint on ≤2 stars)
- `/settings` — System settings
- `/profile` — User profile
- `/branch-change-logs` — Branch transfer history
- `/import-logs` — CSV import history
- `/copyright` — Copyright standalone page

## Key Features

- **Arabic RTL default** — language toggle in header switches to English LTR
- **Dark mode default** — toggle in header
- **JWT auth** — stored in localStorage, injected via `setAuthTokenGetter`
- **Fixed footer** — "© جميع حقوق الطباعة والنشر محفوظة | المطور: Wael Kadous | 01515196224" with Facebook link
- **CSV import** — JSON rows (`POST /api/import/csv`) or file upload (`POST /api/import/upload`) via multer + csv-parse
- **Notifications** — polling-based (30s), unread badge in header bell
- **Follow-up rating dialog** — star rating 1–5 per invoice; ratings ≤2 auto-create a complaint
- **Complaint lifecycle transitions** — enforced state machine; managers bypass checks; `resolved_at` set on close
- **RBAC** — `requireRole()` middleware guards routes; DELETE → Manager; domain-specific for POST/PUT

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Seeding

Run `pnpm --filter @workspace/db run seed` to seed default data (roles, branches, products, complaint types, settings, and user wael@system.com).
