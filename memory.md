# EcoSphere Governance Module — Project Memory

> **Last Updated:** 2026-07-12T13:25:00+05:30
> **Status:** Phase 1 (Foundation) — COMPLETE — SQLite Zero-Setup Fallback & Premium Login UI Enabled

---

## 🎯 Project Overview

**Project:** EcoSphere  
**Sub-Module:** GOVERNANCE  
**Tagline:** AI-Powered Legal Intelligence & Compliance System  
**Purpose:** Enterprise-grade compliance module that acts as an AI Compliance Officer for Indian laws  

The module monitors all EcoSphere operations (HR, Finance, Procurement, IT, Data) and validates them against Indian Government laws in real-time. It detects violations, explains them, calculates severity, provides solutions, and maintains immutable audit logs.

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

### Phase 8: Remaining Frontend Pages (8 pages)
- [ ] AI Legal Assistant (chatbot page)
- [ ] Live Compliance Monitor page
- [ ] Compliance Calendar page
- [ ] Government Notification Center page
- [ ] Auto Policy Generator page
- [ ] Smart Audit Trail page
- [ ] Compliance Reports & Analytics page
- [ ] Legal Knowledge Browser page
- [ ] Settings page

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
- **Typography:** System font stack (can upgrade to Inter/Outfit)
- **Severity Colors:** Green (pass), Amber (warn), Red (block/critical)

---

## 📝 Key Design Patterns

1. **Multi-tenant isolation:** Every DB query includes `tenant_id`
2. **Immutable audit logs:** PostgreSQL RULE prevents UPDATE/DELETE on audit_logs
3. **Provider-agnostic AI:** LLM_PROVIDER env var switches between mock/openai/gemini/etc
4. **Modular connectors:** BaseConnector abstract class, each gov source is a plugin
5. **Compliance-first:** ComplianceEngine.check() validates before any transaction commits
6. **RAG architecture:** Legal knowledge stored as embeddings, retrieved + cited in AI answers

---

## ⚠️ Current Blockers / Notes

1. No LLM API key configured — system runs in `mock` mode (returns structured static responses)
2. Docker Desktop not required — system automatically switches to local SQLite database when PostgreSQL is unavailable
3. pgvector/ES features degrade gracefully when database runs in SQLite fallback mode
