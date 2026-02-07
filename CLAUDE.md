# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant SEO analytics dashboard ("The Transit Dash") aggregating Google Analytics, Search Console, YouTube, and LinkedIn data. Built with Next.js 16 App Router, Supabase (PostgreSQL with RLS), and deployed on Vercel.

## Commands

```bash
npm run dev          # Development server (Turbopack enabled)
npm run build        # Production build (scripts/build.js suppresses Recharts warnings)
npm run build:original  # Direct next build without warning suppression
npm run lint         # ESLint with Next.js + TypeScript rules
npm start            # Production server
```

### E2E Tests (Playwright)

```bash
npm run test:e2e        # Run all E2E tests (requires dev server or auto-starts one)
npm run test:e2e:ui     # Run with Playwright UI mode for debugging
npm run test:e2e:debug  # Run with Playwright inspector
```

Tests are in `e2e/` directory. They run against a real local dev server and real Supabase instance. Test users are created with `e2e-test` email prefix and cleaned up automatically at the start of each run.

## Architecture

### Multi-Tenant Data Flow

1. `middleware.ts` refreshes Supabase auth sessions on every non-API request
2. `lib/company-context.tsx` (React Context) is the central state manager — provides `useCompany()` hook
3. On mount, fetches user's companies via `GET /api/companies`
4. Per-company data fetched via `GET /api/analytics/[companyId]?startDate&endDate`
5. That single endpoint fetches GA, GSC, YouTube, and LinkedIn data **in parallel**, returning aggregated results
6. Each platform can fail independently — errors tracked per-service (e.g., `gaError`, `liError`)

### Services Layer (`lib/services/`)

Each third-party API has a dedicated service class with static methods:
- `google-analytics-service.ts` — GA4 Data API
- `google-search-console-service.ts` — GSC API
- `youtube-analytics-service.ts` — YouTube Reporting + public Data API fallback
- `linkedin-analytics-service.ts` — LinkedIn v2 REST API (**2000ms rate limit between requests**)
- `linkedin-sheets-service.ts` — Google Sheets fallback for LinkedIn data
- `oauth-token-service.ts` — Token refresh, AES-256 encryption/decryption
- `email-service.ts` — Transactional emails via Resend

### Cache & Error Resilience

- Analytics data cached in Supabase JSONB tables (`analytics_cache`, `search_console_cache`, `portfolio_cache`)
- Cache TTL: 24 hours. Fallback: up to 30-day-old cached data when APIs fail
- LinkedIn API returns 429s frequently — service detects rate limits and falls back to cache
- Dashboard shows cached data rather than empty states when APIs are unavailable

### Database (Supabase)

- **Row-Level Security** enforced on all tables via `user_companies` junction table
- Roles: `owner`, `admin`, `client`, `viewer`
- OAuth tokens stored encrypted (AES-256 via `OAUTH_ENCRYPTION_KEY` env var)
- Migrations in `supabase/migrations/` (023 files, sequential numbering)
- Two Supabase clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server + service role)

### Cron Jobs (Vercel)

Configured in `vercel.json` — two daily crons at 8:33 AM UTC:
- `/api/cron/portfolio-cache` — refreshes executive dashboard cache
- `/api/cron/refresh-cache` — refreshes per-company analytics cache

### Component Organization

- `components/ui/` — shadcn/ui primitives (New York style, lucide icons)
- `components/dashboard/shared/` — cross-platform components (headers, date pickers, tables)
- `components/dashboard/{google-analytics,search-console,youtube,linkedin}/` — platform-specific visualizations
- `components/dashboard/executive/` — executive/owner dashboard views
- Charts use Recharts with theme config in `lib/chart-config.ts`

### Key Types

`lib/types.ts` defines the `Company` interface which is a union of all analytics data — GA metrics, GSC data, YouTube stats, LinkedIn metrics, plus error states for each platform. This is the primary data shape flowing through the app.

## Conventions

- Path alias: `@/*` maps to project root (e.g., `@/lib/utils`, `@/components/ui/button`)
- Tailwind CSS 4 with CSS variables for theming (defined in `app/globals.css`)
- Server Components by default; Client Components only where interactivity is needed
- Date ranges use ISO format strings (`YYYY-MM-DD`) throughout
- `SUPABASE_SECRET_KEY` (service role) is server-only — never import in client components
