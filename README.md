# 🌱 EcoSphere — ESG Management Platform

Measure, manage and improve **Environmental, Social & Governance** performance across an
organization — with department scoring, carbon accounting, gamification, governance &
compliance tracking, executive reporting, and **green-logistics sea-route optimization**.

## Stack

- **Next.js 15** (App Router) + **React 18**
- **Prisma ORM + PostgreSQL** (real database, seeded)
- **Tailwind CSS** · **Recharts** · **lucide-react**
- **Leaflet + searoute-js** for maritime route optimization

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL) — optional: the app runs without it (see note below)

## Setup

```bash
cp .env.example .env          # DATABASE_URL points at localhost:5433
docker compose up -d db       # start PostgreSQL (host port 5433)
npm install
npm run db:reset              # create schema + seed demo data (departments, employees,
                              #   carbon transactions, challenges, ports, …)
npm run dev                   # http://localhost:3000
```

> **No Docker? Still works.** Every screen and API route falls back to in-memory seed
> data when the database is unreachable, so the whole app runs and demos fine on
> `npm run dev` alone. Start Postgres to persist saved shipping routes and see live
> DB-backed counts.

## Scripts

| Command            | Description                       |
| ------------------ | --------------------------------- |
| `npm run dev`      | Start the dev server (port 3000)  |
| `npm run build`    | `prisma generate` + production build |
| `npm run db:push`  | Sync the Prisma schema to the DB  |
| `npm run db:seed`  | Seed demo data                    |
| `npm run db:reset` | Reset schema and reseed           |

## Modules

- **Dashboard** — executive ESG command center (admin) + gamified employee view
- **Environmental** — emission factors, carbon transactions (+ AI invoice OCR), department tracking, goals
- **Social** — CSR activities, participation approvals, diversity, training
- **Governance** — policies, acknowledgements, audits, compliance issues, blockchain-style **Governance Ledger**
- **Gamification** — challenge Kanban, leaderboard, badges (+ Web3 soulbound minting), rewards; plus a self-contained spec module at `/gamification/module`
- **🚢 Green Logistics** — **sea-route optimizer**: pick two ports, compute the real maritime route (searoute-js, server-side), see CO₂ vs road/air, and **persist routes to Postgres**
- **Reports** — environmental, social, governance, ESG summary, custom builder (real CSV + print-to-PDF)
- **Settings** — departments, categories, ESG configuration, notifications, webhook integrations

## Architecture notes

- `app/` — Next.js App Router. Root layout composes fonts + providers + the sidebar/topbar shell; each `app/**/page.jsx` is a thin client wrapper importing a screen via the `@/` alias.
- `src/screens/`, `src/components/`, `src/modules/`, `src/store/` — the UI (React Context for client state).
- `app/api/*` — route handlers backed by Prisma (`src/lib/prisma.js`).
- `prisma/schema.prisma` + `prisma/seed.ts` — Postgres schema and seed (mirrors `src/data/mockData.js`).
