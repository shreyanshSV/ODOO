# EcoSphere

ESG Management Platform — measure and manage Environmental, Social and
Governance performance across an organization, with department scoring,
carbon accounting, and gamification.

## Stack

- Next.js 15 (App Router, TypeScript)
- Prisma ORM + PostgreSQL
- Tailwind CSS
- Recharts

## Prerequisites

- Node.js 20+
- Docker (for the PostgreSQL database)

## Setup

```bash
cp .env.example .env          # DATABASE_URL points at localhost:5433
docker compose up -d db       # starts PostgreSQL
npm install
npm run db:reset              # creates schema + seeds demo data
npm run dev                   # http://localhost:3000
```

> The database runs on host port **5433** to avoid clashing with a local
> PostgreSQL on 5432.

## Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start the dev server                 |
| `npm run build`    | Production build                     |
| `npm run db:push`  | Sync the Prisma schema to the DB     |
| `npm run db:seed`  | Seed demo data                       |
| `npm run db:reset` | Reset schema and reseed              |

## Modules

- **Environmental** — emission factors, carbon transactions, sustainability goals
- **Social** — CSR activities, employee participation, diversity
- **Governance** — policies, acknowledgements, audits, compliance issues
- **Gamification** — challenges, XP, badges, rewards, leaderboard
- **Reports** — environmental, social, governance, ESG summary, custom builder
- **Settings** — departments, categories, ESG configuration, notifications
