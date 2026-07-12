# EcoSphere Governance Module — Project Memory

> **Last Updated:** 2026-07-12T14:30:00+05:30
> **Status:** Phase 1 (Foundation) — COMPLETE · Phase 8 (Frontend Pages) — COMPLETE — All 10 sidebar sections now workable + upgraded glass/aurora UI

---

## 🎯 Project Overview

**Project:** EcoSphere — **ESG Management Platform** (Odoo hackathon challenge)
**Sub-Module (this repo):** GOVERNANCE + Gamification
**Tagline:** Measure, manage & improve Environmental, Social and Governance performance

EcoSphere integrates ESG directly into day-to-day ERP operations across four core modules:
- **Environmental** — carbon accounting, emission factors, sustainability goals, carbon reports
- **Social** — CSR activities, employee participation, diversity metrics, engagement
- **Governance** — ESG policies, policy acknowledgements, audits, compliance issue tracking, governance reports/score
- **Gamification** — challenges, XP, badges, rewards, leaderboards

**Scoring:** Environmental / Social / Governance scores → Department Total Score → Overall ESG Score
(default weighting Env 40% / Social 30% / Gov 30%, configurable per org).

> This repo delivers the Governance module (reframed to the ESG spec: ESG Policies, Policy
> Acknowledgements, Audits, Compliance Issues with Owner/Due-Date/Severity/Status + overdue
> flagging, Governance Score) plus the cross-cutting **Gamification / Point System**. It also
> retains an AI legal-intelligence layer (Indian-law compliance engine, smart search, AI assistant)
> built earlier as the governance-compliance backbone.

---

## 🏗️ Architecture Decisions (LOCKED)

| Decision | Answer |
|---|---|
| Government APIs | No official credentials. Use modular Government Data Connector architecture with scrapers, replaceable with official APIs later |
| LLM Provider | Provider-agnostic. Mock mode for development. Supports OpenAI, Gemini, Anthropic, Ollama via config |
| Event Architecture | API-first + event-driven. REST APIs + domain events. Governance subscribes via centralized Compliance Engine |
| Deployment | Docker-based local dev. Cloud-agnostic. PostgreSQL + Redis + pluggable vector DB |
| Multi-tenancy | Multi-tenant from day one. Tenant isolation on every record |
| Authentication | JWT + RBAC. 7 roles. Modular for future SSO/OAuth/Azure AD |

---

## 📁 Project Structure

```
ecosphere-governance/
├── apps/
│   ├── api/                          # Express.js backend (TypeScript)
│   │   ├── src/
│   │   │   ├── app.ts                # Main entry point
│   │   │   ├── config/index.ts       # Environment config
│   │   │   ├── shared/
│   │   │   │   ├── logger.ts         # Winston logger
│   │   │   │   └── errors.ts         # Typed error classes
│   │   │   ├── database/
│   │   │   │   ├── pool.ts           # PostgreSQL connection pool
│   │   │   │   ├── migrate.ts        # 16 migration scripts (inline SQL)
│   │   │   │   ├── redis.ts          # Redis client
│   │   │   │   ├── elasticsearch.ts  # ES client
│   │   │   │   └── seeds/            # Seed data (acts, rules, deadlines, demo tenant)
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts # JWT + RBAC
│   │   │   │   └── error.middleware.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/             # Login, refresh, logout, register
│   │   │   │   ├── compliance/       # Rule engine, risk scorer, violation enricher
│   │   │   │   ├── audit/            # Immutable audit trail
│   │   │   │   ├── ai/               # LLM adapter, search, chat
│   │   │   │   ├── knowledge/        # Legal knowledge routes
│   │   │   │   ├── dashboard/        # Dashboard aggregation
│   │   │   │   └── notifications/    # Gov notification routes
│   │   │   └── connectors/
│   │   │       ├── base-connector.ts
│   │   │       └── india-code.connector.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                          # Next.js 14 frontend
│       ├── app/
│       │   ├── layout.tsx            # Root layout (dark theme)
│       │   ├── globals.css           # Glassmorphism design tokens
│       │   ├── providers.tsx         # React Query + Zustand
│       │   ├── (auth)/login/page.tsx # Login page (with demo credentials)
│       │   └── (dashboard)/
│       │       ├── layout.tsx        # Sidebar navigation (10 routes)
│       │       ├── dashboard/page.tsx # Main dashboard (18KB, widgets)
│       │       └── search/page.tsx   # Smart Legal Search
│       ├── lib/
│       │   ├── api-client.ts         # Axios typed API client
│       │   └── store/auth.store.ts   # Zustand auth store
│       ├── package.json
│       ├── next.config.js
│       └── tailwind.config.ts
├── packages/
│   └── shared-types/                 # TypeScript types shared between api & web
│       ├── common.ts
│       ├── auth.ts
│       ├── compliance.ts
│       ├── connectors.ts
│       ├── knowledge.ts
│       ├── audit.ts
│       └── index.ts
├── infrastructure/
│   └── docker/
│       ├── docker-compose.yml        # PG, Redis, ES, API, Web
│       ├── postgres-init.sql
│       └── Dockerfile.api
├── .kiro/specs/governance-module/
│   ├── requirements.md               # 29KB — Full requirements spec
│   ├── design.md                     # 37KB — Full technical design
│   └── tasks.md                      # 15KB — 37 tasks across 10 phases
├── package.json                      # Turborepo root
├── turbo.json
├── .env.example
└── .gitignore
```

---

## ✅ What's BUILT (Completed)

### Phase 1: Foundation — COMPLETE ✅

| Component | Status | Notes |
|---|---|---|
| Monorepo (Turborepo) | ✅ Done | Root package.json, turbo.json, workspaces |
| Docker Compose | ✅ Done | PG + Redis + ES + API + Web |
| .env | ✅ Done | Created local `.env` with development defaults |
| Shared Types Package | ✅ Done | 6 type files (auth, compliance, connectors, knowledge, audit, common) |
| PostgreSQL Migrations | ✅ Done | 16 migrations (tenants, users, tokens, acts, sections, amendments, notifications, rules, audit_logs, events, deadlines, policies, chat, sync_logs) |
| SQLite Fallback Engine | ✅ Done | Native Node.js `node:sqlite` DatabaseSync fallback if PostgreSQL is down. Translates queries, runs SQLite-specific DDL, and triggers automated seeding on boot |
| Express API Skeleton | ✅ Done | Helmet, CORS, compression, morgan, health checks |
| Config Module | ✅ Done | dotenv, all settings with fallbacks |
| Logger | ✅ Done | Winston, dev/prod formats |
| Error Classes | ✅ Done | AppError, Validation, Unauthorized, Forbidden, NotFound, ComplianceBlock, Conflict |
| Auth Service | ✅ Done | Login, refresh, logout, register tenant, JWT tokens |
| Auth Routes | ✅ Done | POST login, refresh, logout, register; GET /me |
| Auth Middleware | ✅ Done | JWT verification, RBAC role checks |
| Error Middleware | ✅ Done | Global error handler |
| Compliance Rule Engine | ✅ Done | RuleEvaluator, RiskScorer, ViolationEnricher, ComplianceEngine |
| Compliance Routes | ✅ Done | POST /check, GET /rules |
| Audit Service | ✅ Done | Create audit log with digital signature |
| Audit Routes | ✅ Done | GET /logs, GET /:id |
| AI/LLM Provider | ✅ Done | Provider-agnostic adapter (mock, openai, gemini, anthropic, ollama) |
| Search Service | ✅ Done | Hybrid search (vector + ES + rule engine) |
| Chat Service | ✅ Done | Session management, message persistence |
| AI Routes | ✅ Done | POST /search, POST /assistant/chat, sessions |
| Knowledge Routes | ✅ Done | GET /acts, /sections, /search |
| Dashboard Service | ✅ Done | getSummary() with all widget data |
| Dashboard Routes | ✅ Done | GET /summary |
| Notification Routes | ✅ Done | GET /notifications |
| India Code Connector | ✅ Done | Base connector + India Code scraper |
| Seed Data — Legal Acts | ✅ Done | 12+ core Indian acts with sections |
| Seed Data — Rules | ✅ Done | HR, Finance, Data, IT compliance rules |
| Seed Data — Demo Tenant | ✅ Done | Demo tenant + 5 users (admin, custom user, legal, hr, finance) |
| Next.js Frontend | ✅ Done | App Router, dark theme, layout, postcss and tsconfig configuration |
| Login & Signup Page | ✅ Done | Premium double-panel split design with sign-in/register transitions, validation alerts, and custom credentials |
| Dashboard Layout | ✅ Done | Sidebar navigation, 10 routes, user profile |
| Dashboard Page | ✅ Done | 18KB with all widgets (compliance score, risk, timeline, etc.) |
| Search Page | ✅ Done | Google-style search bar, results cards |
| AI Assistant Page | ✅ Done | `/assistant` — session list, chat composer, citation pills, quick prompts (wired to assistant.* API) |
| Live Monitor Page | ✅ Done | `/monitor` — compliance-check simulator + auto-refreshing event stream (compliance.check/getEvents) |
| Compliance Calendar Page | ✅ Done | `/calendar` — real month grid with deadline markers + upcoming list (dashboard.getDeadlines) |
| Notifications Page | ✅ Done | `/notifications` — severity filters, AI impact analysis, sync trigger (notifications.list/sync) |
| Policy Generator Page | ✅ Done | `/policies` — 6 law-referenced templates, client-side generation, TXT download + print |
| Legal Knowledge Page | ✅ Done | `/knowledge` — act search/filter master-detail with sections & penalties (knowledge.listActs/getAct) |
| Audit Trail Page | ✅ Done | `/audit` — filterable immutable log, expandable rows, SHA-256 signatures, CSV export (audit.getLogs) |
| Settings Page | ✅ Done | `/settings` — profile, org, localStorage-backed preferences, security & system info |
| ESG Governance Page | ✅ Done | `/governance` — Governance Score gauge, ESG Policies + acknowledgement rate, Audits, Compliance Issues (Owner/Due Date/Severity/Status, overdue flag, click-to-advance status). Aligns to ESG spec §6/§8 |
| Gamification Page | ✅ Done | `/gamification` — XP & redeemable points balance, level bar, auto-award Badges (unlock rules), Rewards catalog with working redemption (stock + point deduction, persisted), Challenges lifecycle, Leaderboard |
| Shared PageHeader | ✅ Done | `components/page-header.tsx` — consistent gradient page hero across sections |
| UI Design Upgrade | ✅ Done | Aurora ambient bg, card-lift hover, shimmer skeletons, gradient buttons, pulse dots, active nav accent bar |
| API Client | ✅ Done | Typed Axios client with interceptors, including register call |
| Auth Store | ✅ Done | Zustand with persistence |
| Root Redirect | ✅ Done | Added root page redirecting `/` to `/login` |
| npm install | ✅ Done | Completed successfully |

---

## ❌ What's NOT BUILT YET (Remaining Work)

### Phase 2: Legal Knowledge Engine
- [ ] Government Data Connectors (MCA, Labour, Shram Suvidha, India Gov)
- [ ] Legal Knowledge ingestion pipeline
- [ ] Embedding & vector search service
- [ ] Document parser
- [ ] Amendment tracker

### Phase 3: Compliance SDK Package
- [ ] `packages/compliance-sdk` — Client SDK for other EcoSphere modules

### Phase 4: AI Legal Assistant (Enhancement)
- [ ] SSE streaming for chat responses
- [ ] Query autocomplete
- [ ] Redis caching for search

### Phase 5: Monitoring, Notifications, Calendar
- [ ] Government Notification parser & impact analyzer
- [ ] Notification sync scheduler (6-hour cron)
- [ ] Compliance Calendar deadline auto-generation
- [ ] Recurrence rule engine
- [ ] Reminder scheduler
- [ ] Predictive Compliance engine (nightly scan)

### Phase 6: Audit Trail, Policy Generator, Reports
- [ ] Audit log CSV/PDF export
- [ ] Auto Policy Generator (12 templates, PDF/DOCX export)
- [ ] Compliance Reports & Analytics (9 report types, PDF)

### Phase 7: Dashboard API Enhancement
- [ ] Redis caching for dashboard (5-min TTL)
- [ ] Risk heatmap endpoint
- [ ] Timeline endpoint

### Phase 8: Remaining Frontend Pages — COMPLETE ✅ (all 10 nav sections workable)
- [x] AI Legal Assistant (chatbot page) — `/assistant`
- [x] Live Compliance Monitor page — `/monitor`
- [x] Compliance Calendar page — `/calendar`
- [x] Government Notification Center page — `/notifications`
- [x] Auto Policy Generator page — `/policies`
- [x] Smart Audit Trail page — `/audit`
- [x] Legal Knowledge Browser page — `/knowledge`
- [x] Settings page — `/settings`
- [ ] Compliance Reports & Analytics page (not in current sidebar; standalone reporting still pending)

### Phase 9: Compliance Alert Integration
- [ ] Global compliance alert overlay (blocking modal)
- [ ] Super Admin override with re-auth

### Phase 10: Testing, Docs, Polish
- [ ] OpenAPI 3.0 documentation
- [ ] Integration tests for Compliance Engine
- [ ] Performance optimization
- [ ] WCAG accessibility audit
- [ ] Mobile responsiveness
- [ ] Loading skeletons, empty states, error boundaries

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS 3, Framer Motion, Recharts, Lucide Icons |
| State | Zustand, TanStack React Query |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL (with pgvector extension) |
| Cache | Redis (ioredis) |
| Search | ElasticSearch 8 |
| AI | Provider-agnostic LLM adapter (Mock/OpenAI/Gemini/Anthropic/Ollama) |
| Auth | JWT + bcrypt + RBAC (7 roles) |
| Containerization | Docker Compose |
| Monorepo | Turborepo |

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | no.hardwork.15@gmail.com | Demo@12345 |
| Super Admin (Alternative) | admin@demo.com | Demo@12345 |
| Legal Officer | legal@demo.com | Demo@12345 |
| HR Manager | hr@demo.com | Demo@12345 |
| Finance | finance@demo.com | Demo@12345 |

Tenant slug: `demo-corp`

---

## 📋 How to Run

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Start infrastructure (PostgreSQL, Redis, ElasticSearch)
npm run docker:up

# 4. Run database migrations
npm run db:migrate

# 5. Seed initial data
npm run db:seed

# 6. Start development servers
npm run dev
# API → http://localhost:4000
# Web → http://localhost:3000
```

---

## 🎨 Design System

- **Theme:** Dark mode with glassmorphism
- **Primary Color:** Emerald-400/500
- **Background:** #030712 (near-black)
- **Cards:** Glass cards with backdrop-blur, border-slate-700/50
- **Animations:** Framer Motion page transitions, counter animations
- **Typography:** Inter (loaded via Google Fonts) + JetBrains Mono for citations/hashes
- **Severity Colors:** Green (pass), Amber (warn), Red (block/critical)
- **Reusable utility classes** (in `globals.css`): `bg-aurora` (ambient drifting colour blooms), `card-lift` (hover elevation), `skeleton` (shimmer loader), `btn-gradient` / `btn-ghost`, `page-title`, `icon-chip`, `pulse-dot` (live indicator), `divider-glow`
- **Per-section accent colors:** each nav section has its own accent (assistant=violet, monitor=amber, calendar=teal, notifications=orange, policies=pink, knowledge=cyan, audit=indigo, settings=slate)

---

## 📝 Key Design Patterns

1. **Multi-tenant isolation:** Every DB query includes `tenant_id`
2. **Immutable audit logs:** PostgreSQL RULE prevents UPDATE/DELETE on audit_logs
3. **Provider-agnostic AI:** LLM_PROVIDER env var switches between mock/openai/gemini/etc
4. **Modular connectors:** BaseConnector abstract class, each gov source is a plugin
5. **Compliance-first:** ComplianceEngine.check() validates before any transaction commits
6. **RAG architecture:** Legal knowledge stored as embeddings, retrieved + cited in AI answers

---

## 🏛️ ESG Governance Module (spec-aligned)

Mapping of the ESG spec's Governance module → this app (`/governance`):

| Spec item | Implementation |
|---|---|
| ESG Policy (master) | Policy cards with category + org-wide acknowledgement progress bar |
| Policy Acknowledgement (txn) | Per-policy acknowledge action; feeds acknowledgement rate |
| Audit (txn) | Audit list with scope, date, status (Planned/In Progress/Completed), findings count |
| Compliance Issue (txn) | Audit, Severity (Low/Med/High/Critical), Description, **Owner, Due Date**, Status (Open/In Progress/Resolved) |
| Compliance Issue Ownership rule (§8) | Every issue has Owner + Due Date; **overdue-while-open issues flagged red** |
| Governance Score | Gauge = 0.5·ack-rate + 0.4·resolved-rate − 4·overdue (weighted G-pillar score) |

## 🔌 API Integration status

All dashboard sections are now backed by real REST APIs (Express + SQLite fallback). Governance
and Gamification got full backends in migrations **016/017 (SQLite)** and **017/018 (Postgres)**,
seeded by `apps/api/src/database/seeds/esg.seed.ts` (auto-runs on boot, idempotent):

- **Governance** → `GET /api/v1/governance/{summary,policies,audits,issues}`,
  `POST/DELETE /governance/policies/:id/acknowledge`, `PATCH /governance/issues/:id`
- **Gamification** → `GET /api/v1/gamification/{profile,badges,rewards,challenges,leaderboard}`,
  `POST /gamification/rewards/:id/redeem`
- Tables: `esg_policies`, `policy_acknowledgements`, `esg_audits`, `compliance_issues`,
  `gam_points`, `gam_badges`, `gam_rewards`, `gam_reward_redemptions`, `gam_challenges`
- **Notifications** → `government_notifications` table seeded by `gov-notifications.seed.ts` (7 real
  Indian gov notifications: MeitY DPDP, MCA CSR, CBIC GST, Labour min-wage, EPFO, SEBI BRSR, CBDT TDS).
  `POST /notifications/sync` re-seeds idempotently and returns the live count.
- Frontend pages use TanStack Query (queries + mutations with invalidation) — no more localStorage.
- **User input / create forms** (reusable `components/modal.tsx`): Governance → *Raise Issue*
  (`POST /governance/issues`), Gamification → *New Challenge* (`POST /gamification/challenges`),
  Calendar → *Add Deadline* (`POST /dashboard/deadlines`). All validate server-side (400 on missing
  required fields) and invalidate their queries so new records appear immediately.
- Policy Generator (`/policies`) stays intentionally client-side (template generator).
- ⚠️ SQLite fallback translates `$n → ?` **positionally**, so in any query the `$1,$2,…`
  placeholders must appear in ascending order in the SQL text (see `loadPolicies` note).

## 🎮 Gamification / Point System (spec-aligned)

Implemented at `/gamification`, **backed by the gamification API** (per-user XP ledger in `gam_points`):

- **XP** — lifetime experience; drives **Level** (500 XP per level) and Leaderboard rank
- **Points** — redeemable balance = total XP − points spent
- **Badges** — auto-unlock when XP or completed-challenge count satisfies the Badge's Unlock Rule (e.g. Eco Warrior = 1,000 XP, Challenge Master = 10 challenges). Locked badges show their requirement
- **Rewards** — catalog with `Points Required` + `Stock`; **Redeem** deducts points, decrements stock, persists (matches §8 Reward Redemption rule). Disabled when balance too low or out of stock
- **Challenges** — full lifecycle badge: Draft → Active → Under Review → Completed / Archived, with Category, Difficulty, XP
- **Leaderboard** — employees ranked by XP, current user highlighted as "You", top-3 medals

## ⚠️ Current Blockers / Notes

1. No LLM API key configured — system runs in `mock` mode (returns structured static responses)
2. Docker Desktop not required — system automatically switches to local SQLite database when PostgreSQL is unavailable
3. pgvector/ES features degrade gracefully when database runs in SQLite fallback mode
