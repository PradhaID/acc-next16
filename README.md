# AccNext — Double-Entry Accounting System

Full-featured double-entry accounting application built with **Next.js 16**, **TailwindCSS v4**, **MongoDB**, and **TypeScript**.

## Features

### Accounting Core
- **Chart of Accounts** — hierarchical tree with 6 categories (Asset, Liability, Equity, Revenue, COGS, Expense), collapsible nodes, section colors, depth levels (L1/L2/L3).
- **Accounts** — operational accounts tied to COA nodes, auto-calculated balances from confirmed transactions, balance recalculation on confirm/reverse.
- **Journal Transactions** — double-entry with debit/credit validation, auto-generated codes, evidence upload. Status lifecycle: Pending → Confirmed / Rejected, with reversal of confirmed entries.
- **General Ledger** — account-level ledger with opening balance, period mutations, and running balance. Timezone-aware date filtering.
- **Balance Sheet** — hierarchical tree as of any date, 2-column grid layout, section-colored cards, PDF (T-account layout) and CSV export.
- **Income Statement** — profit & loss report, year-to-date auto-load, collapsible sections, PDF (multi-page with continuation headers, "Page X of Y") and CSV export.
- **Year-End Closing** — automated closing entries: revenue/expense accounts zeroed, net profit transferred to retained earnings.

### System Management & RBAC
- **Users** — CRUD with avatar (initials circle), active/inactive toggle, biography, timezone, search.
- **Groups** — CRUD with active/disabled status, role assignment.
- **Roles** — granular permissions via RBAC tree with cascading checkboxes.
- **Sign-in enforcement** — checks both user `isActive` and group `isActive` before allowing access.

### API & Integration
- **REST API v1** — full API key authentication (`Authorization: Bearer <key>`), generate/regenerate from profile.
  - `GET /api/v1/coa` — chart of accounts
  - `GET /api/v1/accounts` — accounts
  - `GET/POST /api/v1/transactions` — list / create transactions
  - `GET/PUT/DELETE /api/v1/transactions/:id` — get / update / confirm/reject/cancel
  - `GET /api/v1/transaction-types` — type prefix mapping
  - `GET /api/v1/ledger-periods` — ledger by account
  - `GET /api/v1/reports/balance-sheet` — balance sheet
  - `GET /api/v1/reports/income-statement` — income statement
- **Transaction source tracking** — `source: "api"` vs `source: "ui"` on every transaction.
- **PDF & CSV export** — client-side pdf-lib, WinAnsi-safe, multi-page with continuation support.

### User Experience
- **Timezone-aware** — user-configurable timezone, UTC boundary date queries, `Intl.DateTimeFormat` with ordinal suffixes (`<sup>th</sup>`).
- **Design system** — `text-[10px] font-black uppercase tracking-widest` labels, `rounded-2xl` cards, `divide-y` compact layout, consistent 2-column form pattern.
- **Responsive sidebar** — collapsible with localStorage persistence, tablet flyout, user dropdown (profile/password/sign out).
- **Dark mode** — full TailwindCSS dark mode support.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.10 (App Router) |
| Styling | TailwindCSS v4.3.2 |
| Database | MongoDB via `mongodb` driver v7 |
| Auth | JWT (HTTP-only cookies) via `jose`, API keys via `crypto` |
| PDF | `pdf-lib` (client-side) |
| Fonts | Geist (default), monospace for codes |

## Getting Started

```bash
npm install
cp .env.example .env   # configure MONGODB_URI, JWT_SECRET, etc.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `NEXT_PUBLIC_BASE_URL` | Base URL for server-side fetch (default: `http://localhost:3000`) |

## Project Structure

```
app/
  account/          # Auth pages (signin/signup), profile, password
  accounting/       # COA, Accounts, Transactions, Ledger, Reports, Closing
  api/              # REST API routes (v1 + internal)
  dashboard/        # Dashboard homepage
  doc/api/v1/       # API documentation page
  system/           # System management (users, groups, roles)
components/         # Reusable UI (Sidebar, PageHeader, FormField, etc.)
lib/
  accounting/       # Balance recalculation, auto-journal
  models/           # TypeScript interfaces for all collections
  auth.ts           # JWT sign/verify helpers
  api-auth.ts       # API key verification
  mongodb.ts        # DB connection singleton
  timezone.ts       # Date formatting and UTC boundary helpers
```
