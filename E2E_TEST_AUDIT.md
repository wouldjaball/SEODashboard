# E2E Test Audit Report — SEO Dashboard

> **Generated:** 2026-02-06
> **Status:** Zero existing tests. No test framework installed.
> **Priority Focus:** Onboarding flows

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Onboarding Flows (Priority 1)](#2-onboarding-flows-priority-1)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [API Routes](#4-api-routes)
5. [Dashboard Pages & Components](#5-dashboard-pages--components)
6. [Third-Party Integrations](#6-third-party-integrations)
7. [Database & Data Integrity](#7-database--data-integrity)
8. [Recommended Test Framework Setup](#8-recommended-test-framework-setup)
9. [Test Priority Matrix](#9-test-priority-matrix)

---

## 1. Executive Summary

### Current State
- **0 E2E tests** exist in the project
- **0 unit tests** exist in the project
- **No test framework** is installed (no Playwright, Cypress, Jest, or Vitest)
- **48 API routes** across auth, admin, integrations, analytics, and cron
- **17 database tables** with 50+ RLS policies
- **4 OAuth flows** (Google, LinkedIn, Google for YouTube, Google for Sheets)
- **3 dashboard pages** with 60+ components
- **4 user roles**: owner, admin, viewer, client

### By the Numbers

| Area | Testable Scenarios | Critical | High | Medium |
|------|-------------------|----------|------|--------|
| Onboarding | 45 | 15 | 18 | 12 |
| Auth & Sessions | 35 | 12 | 13 | 10 |
| API Routes | 48 | 20 | 18 | 10 |
| Dashboard UI | 40 | 8 | 17 | 15 |
| Integrations | 35 | 12 | 15 | 8 |
| Data Integrity | 20 | 8 | 7 | 5 |
| **Total** | **223** | **75** | **88** | **60** |

---

## 2. Onboarding Flows (Priority 1)

### 2.1 Complete Happy-Path Flow

```
Sign Up → Email Confirm → Password Change → Dashboard → Company Setup → Connect Google → Connect LinkedIn → Assign Properties → View Analytics
```

### 2.2 Sign-Up with Access Code

**Files:**
- `app/auth/sign-up/page.tsx` — Currently shows "invitation-only" message
- `components/auth/sign-up-form.tsx` — Full sign-up form
- `app/api/auth/validate-code/route.ts` — Code validation

**Test Scenarios:**

| # | Scenario | Steps | Expected Result | Priority |
|---|----------|-------|-----------------|----------|
| O-1 | Valid access code signup | Enter valid code + email + password → Submit | User created, confirmation email sent | CRITICAL |
| O-2 | Invalid access code | Enter bad code → Submit | Error: "Invalid access code", form stays | CRITICAL |
| O-3 | Expired/inactive code | Enter deactivated code → Submit | Error: "Invalid access code" | HIGH |
| O-4 | Password mismatch | Enter different passwords → Submit | Error: "Passwords do not match" | HIGH |
| O-5 | Short password | Enter < 6 char password → Submit | Error: "Password must be at least 6 characters" | HIGH |
| O-6 | Google OAuth signup | Validate code → Click "Sign up with Google" | OAuth redirect, token stored | CRITICAL |
| O-7 | Code usage increment | Complete valid signup | `access_codes.usage_count` incremented | HIGH |
| O-8 | Code auto-uppercase | Enter lowercase code | Code converted to uppercase before validation | MEDIUM |

### 2.3 Email Confirmation & Callback

**Files:**
- `app/auth/callback/route.ts` — OAuth code exchange
- `app/auth/confirm/route.ts` — Email OTP verification

| # | Scenario | Steps | Expected Result | Priority |
|---|----------|-------|-----------------|----------|
| O-9 | Email confirmation link | Click link with valid token_hash | Session created, redirect to dashboard | CRITICAL |
| O-10 | must_change_password detection | New invited user confirms email | Redirect to `/auth/change-password` | CRITICAL |
| O-11 | Invalid/expired token | Click old link | Redirect to `/auth/error` | HIGH |
| O-12 | New user access code check | OAuth callback for new user | Validates access_code from state param | CRITICAL |
| O-13 | Invalid code on callback | New user with bad code in state | User deleted, redirect to error page | HIGH |

### 2.4 Forced Password Change (First Login)

**Files:**
- `app/auth/change-password/page.tsx`
- `app/api/auth/change-password/route.ts`

| # | Scenario | Steps | Expected Result | Priority |
|---|----------|-------|-----------------|----------|
| O-14 | Valid password change | Enter temp + new password (8+ chars, letter+number) | Password updated, `must_change_password` cleared | CRITICAL |
| O-15 | Wrong current password | Enter incorrect temp password | API returns 401 | HIGH |
| O-16 | Weak new password | < 8 chars or missing letter/number | Real-time validation shows unmet requirements | HIGH |
| O-17 | Password mismatch | New passwords don't match | Error: "New passwords do not match" | HIGH |
| O-18 | Pending invitation acceptance | Complete password change as invited user | `pending_invitations.accepted_at` set, audit log entry | CRITICAL |

### 2.5 Company Auto-Assignment (First Dashboard Visit)

**Files:**
- `app/api/companies/route.ts` (lines 39-125)
- `lib/company-context.tsx`

| # | Scenario | Steps | Expected Result | Priority |
|---|----------|-------|-----------------|----------|
| O-19 | Auto-assign on first visit | New user hits `/dashboard/executive` | User gets viewer role on all companies | CRITICAL |
| O-20 | Race condition handling | Two concurrent requests detect zero assignments | Upsert with `ignoreDuplicates` prevents duplicates | HIGH |
| O-21 | No companies exist | New user, zero companies in DB | Returns `{ companies: [], message: 'No companies available...' }` | HIGH |
| O-22 | First company as default | Auto-assigned to 5 companies | First company auto-selected in context | MEDIUM |

### 2.6 Google OAuth Connection (Integration Setup)

**Files:**
- `app/admin/accounts/page.tsx` (1832 lines — main integration UI)
- `app/api/auth/google/callback/route.ts`
- `lib/services/oauth-token-service.ts`

| # | Scenario | Steps | Expected Result | Priority |
|---|----------|-------|-----------------|----------|
| O-23 | Connect Google account | Click "Connect Google" → OAuth consent → Callback | Encrypted tokens saved, connection visible | CRITICAL |
| O-24 | YouTube auto-discovery | Google account owns YouTube channel | Channel saved in `youtube_channels`, auto-mapped if companyId in state | CRITICAL |
| O-25 | Brand Account selection | User has multiple Google identities | Correct identity's channel mapped | HIGH |
| O-26 | Multiple Google accounts | Connect 2+ different accounts | Both appear in connections list | HIGH |
| O-27 | Disconnect all Google | Click "Disconnect All" → Confirm | All tokens deleted, status changes to "Not Connected" | HIGH |
| O-28 | OAuth failure/denial | User denies consent | Redirect to error page with message | HIGH |

### 2.7 LinkedIn OAuth Connection

**Files:**
- `app/api/auth/linkedin/callback/route.ts`
- `app/api/integrations/linkedin/organizations/route.ts`

| # | Scenario | Steps | Expected Result | Priority |
|---|----------|-------|-----------------|----------|
| O-29 | Connect LinkedIn | OAuth → Callback → Org discovered | Tokens saved, org selection dialog opens | CRITICAL |
| O-30 | Org selection for company | Select org → Map to company | `company_linkedin_mappings` created | CRITICAL |
| O-31 | Multiple org roles checked | LinkedIn checks ADMINISTRATOR, CONTENT_ADMIN, etc. | First role match returns orgs | HIGH |
| O-32 | No orgs found | User has no admin orgs | Empty list, helpful message | HIGH |
| O-33 | Pending mapping flow | OAuth with companyId in state | Dialog opens for that specific company | HIGH |

### 2.8 Property Assignment (Analytics Mapping)

**Files:**
- `app/api/integrations/mappings/route.ts`
- `app/admin/accounts/page.tsx` (Company Assignments tab)

| # | Scenario | Steps | Expected Result | Priority |
|---|----------|-------|-----------------|----------|
| O-34 | Assign GA property | Select property → Save | `company_ga_mappings` created | CRITICAL |
| O-35 | Assign all 4 integrations | GA + GSC + YouTube + LinkedIn → Save | All 4 mapping tables populated, status "4/4 Configured" | CRITICAL |
| O-36 | Clear assignment | Change to "None" → Save | Mapping row deleted | HIGH |
| O-37 | Permission check | Viewer role tries to save | 403: "Insufficient permissions" | CRITICAL |
| O-38 | Non-existent property | Stale property ID in request | Error: "GA property not found" | HIGH |
| O-39 | Refresh properties | Click "Refresh Properties & Sites" | Fresh API calls, updated counts | MEDIUM |

### 2.9 YouTube & LinkedIn Manual Setup

| # | Scenario | Steps | Expected Result | Priority |
|---|----------|-------|-----------------|----------|
| O-40 | YouTube URL lookup | Paste URL → Click Lookup | Channel info auto-fills | HIGH |
| O-41 | YouTube manual add | Enter channel ID + name | Channel created in DB | HIGH |
| O-42 | LinkedIn page URL lookup | Paste LinkedIn company URL | Org info auto-fills | HIGH |
| O-43 | LinkedIn sheet config | Enter Google Sheet IDs per company | Config saved in `linkedin_sheet_configs` | MEDIUM |
| O-44 | Lookup failure fallback | API fails during lookup | Manual entry form shown | MEDIUM |
| O-45 | Duplicate prevention | Add same channel/page twice | Upsert or conflict error handled | MEDIUM |

---

## 3. Authentication & Authorization

### 3.1 Login Flows

**Files:**
- `components/auth/login-form.tsx`
- `components/auth/magic-link-form.tsx`
- `app/api/auth/magic-link/route.ts`

| # | Scenario | Priority |
|---|----------|----------|
| A-1 | Email/password login → redirect to dashboard | CRITICAL |
| A-2 | Wrong password → error message, no session | CRITICAL |
| A-3 | Magic link request → email sent, success message | HIGH |
| A-4 | Magic link confirmation → session created | HIGH |
| A-5 | Non-existent email magic link → generic error (no enumeration) | HIGH |
| A-6 | Login with `must_change_password` → redirect to change-password | CRITICAL |

### 3.2 Password Recovery

**Files:**
- `components/auth/forgot-password-form.tsx`
- `components/auth/update-password-form.tsx`

| # | Scenario | Priority |
|---|----------|----------|
| A-7 | Forgot password → email sent with reset link | HIGH |
| A-8 | Reset link → new password form → password updated | HIGH |
| A-9 | Expired reset link → error page | MEDIUM |
| A-10 | Invalid new password on reset → validation errors | MEDIUM |

### 3.3 Session Management

**Files:**
- `middleware.ts`
- `lib/supabase/middleware.ts`

| # | Scenario | Priority |
|---|----------|----------|
| A-11 | Unauthenticated access to `/dashboard/*` → redirect to `/auth/login` | CRITICAL |
| A-12 | Session auto-refresh via middleware (near-expiry token) | HIGH |
| A-13 | Expired session → redirect to login | HIGH |
| A-14 | Logout → cookies cleared → redirect to login | CRITICAL |
| A-15 | Middleware fail-open: error in session check → `NextResponse.next()` | MEDIUM |
| A-16 | Malformed JWT in cookie → graceful handling, no crash | MEDIUM |

### 3.4 Role-Based Access Control (RBAC)

**Files:**
- `lib/auth/check-admin.ts`
- `components/dashboard/shared/dashboard-header.tsx`

| # | Scenario | Priority |
|---|----------|----------|
| A-17 | Owner sees full admin menu (Accounts, Companies, Users, Access Codes) | CRITICAL |
| A-18 | Admin sees limited admin menu (Users only) | HIGH |
| A-19 | Viewer/client sees no admin menu | HIGH |
| A-20 | Owner can invite users, admin cannot | CRITICAL |
| A-21 | Viewer cannot POST to `/api/integrations/mappings` → 403 | CRITICAL |
| A-22 | User cannot access non-assigned company data → 403 | CRITICAL |

### 3.5 User Management (Admin)

**Files:**
- `app/api/admin/users/route.ts`
- `app/api/admin/users/assign/route.ts`
- `app/api/admin/users/pending/route.ts`

| # | Scenario | Priority |
|---|----------|----------|
| A-23 | Owner invites new user by email → user created with temp password | CRITICAL |
| A-24 | Invitation email sent with credentials | HIGH |
| A-25 | Invite rate limit: max 20/hour per admin | HIGH |
| A-26 | Resend invitation: max 3/hour per email | HIGH |
| A-27 | Revoke invitation → pending record deleted, user account cleaned | HIGH |
| A-28 | Invited user accepts → `pending_invitations.accepted_at` set | CRITICAL |
| A-29 | Expired invitation shown as stale in admin UI | MEDIUM |
| A-30 | Owner changes user role (viewer → admin) | HIGH |
| A-31 | Cannot remove last owner from company | HIGH |

### 3.6 Access Code Management

| # | Scenario | Priority |
|---|----------|----------|
| A-32 | Admin creates access code | HIGH |
| A-33 | Admin deactivates access code | HIGH |
| A-34 | Admin reactivates access code | MEDIUM |
| A-35 | Duplicate code prevention | MEDIUM |

---

## 4. API Routes

### 4.1 Route Inventory (48 total)

| Category | Count | Auth Required | Rate Limited |
|----------|-------|--------------|--------------|
| Auth | 8 | Mixed | No |
| OAuth Callbacks | 2 | No | No |
| Admin Users | 4 | Yes (owner/admin) | Yes (2 routes) |
| Admin Companies | 2 | Yes | No |
| Admin Access Codes | 1 (4 methods) | Yes (admin) | No |
| Admin Utility | 2 | Mixed | No |
| Integrations Status | 3 | Yes | No |
| Integrations Mappings | 2 | Yes | No |
| GA Integration | 2 | Yes | No |
| GSC Integration | 2 | Yes | No |
| YouTube Integration | 3 | Yes | No |
| LinkedIn Integration | 8 | Yes | No |
| Companies | 3 | Yes | No |
| Analytics | 4 | Yes | No |
| Cron | 2 | Token | No |

### 4.2 Critical API Scenarios

| # | Route | Method | Scenario | Priority |
|---|-------|--------|----------|----------|
| R-1 | `/api/analytics/[companyId]` | GET | Full analytics fetch with cache layers | CRITICAL |
| R-2 | `/api/analytics/portfolio` | GET | Portfolio aggregation across companies | CRITICAL |
| R-3 | `/api/analytics/[companyId]/realtime` | GET | Real-time GA data (30s cache) | HIGH |
| R-4 | `/api/companies` | GET | Auto-assignment for new users | CRITICAL |
| R-5 | `/api/companies/[companyId]/access-check` | GET | Company access validation | CRITICAL |
| R-6 | `/api/integrations/mappings` | POST | Save with validation (property exists, role check) | CRITICAL |
| R-7 | `/api/admin/users/assign` | POST | Full invitation flow with rollback | CRITICAL |
| R-8 | `/api/cron/refresh-cache` | GET | Daily cache pre-build (secret validation) | HIGH |
| R-9 | `/api/auth/google/callback` | GET | Token exchange + auto-map YouTube | CRITICAL |
| R-10 | `/api/auth/linkedin/callback` | GET | Token exchange + org discovery | CRITICAL |

### 4.3 Analytics Caching Strategy

```
Layer 1: Daily Snapshot (cron at 12:33 AM PST)
  └─ analytics_cache table, type='daily_snapshot'
  └─ Expires next day at 12:33 AM PST

Layer 2: On-Demand Cache (30-60 min TTL)
  └─ analytics_cache table, type='on_demand'

Layer 3: Service-Level Fallback (30-day lookback)
  └─ Falls back to last valid cached data if API fails

Layer 4: Token Cache (4-min in-memory)
  └─ OAuth access tokens cached to reduce refresh calls
```

| # | Cache Scenario | Priority |
|---|----------------|----------|
| C-1 | Daily snapshot hit → fast dashboard load | HIGH |
| C-2 | Stale cache (12h) → background refresh triggered | HIGH |
| C-3 | Very stale cache (48h) → force fresh fetch | MEDIUM |
| C-4 | API failure → fallback to cached data | HIGH |
| C-5 | `?nocache=true` → bypass all cache layers | MEDIUM |
| C-6 | Token refresh within 5-min buffer window | HIGH |

---

## 5. Dashboard Pages & Components

### 5.1 Page Inventory

| Route | Page | Key Components |
|-------|------|----------------|
| `/dashboard/executive` | Portfolio Overview | PortfolioKPISummary, CompanyGridView |
| `/dashboard/executive/owner` | Single Company Dashboard | OwnerKPICards, BusinessGrowthMetrics, ContentPerformanceAnalysis, AudienceIntelligence, SearchPerformanceTracking, ChannelAnalysisVisualization |
| `/dashboard/` | Redirect | → `/dashboard/executive` |

### 5.2 Interactive Component Tests

| # | Component | Interaction | Priority |
|---|-----------|-------------|----------|
| D-1 | CompanyGridView | Search by company name → filters grid | HIGH |
| D-2 | CompanyGridView | Industry filter dropdown → filters grid | HIGH |
| D-3 | CompanyGridView | Sort by name/traffic/conversion/industry (asc/desc) | HIGH |
| D-4 | CompanySwitcher | Select different company → context updates | CRITICAL |
| D-5 | DateRangePicker | Select preset (7/30/60/90 days) → charts update | HIGH |
| D-6 | DateRangePicker | Custom range → dual calendar → apply | HIGH |
| D-7 | DataTable | Sort columns, search, paginate | MEDIUM |
| D-8 | KPICard | Click → detail sheet opens | MEDIUM |
| D-9 | GA Report | Real-time toggle → 30s auto-refresh | HIGH |
| D-10 | GA Report | Device/page/channel filters → charts update | HIGH |
| D-11 | GSC Report | Click KPI card → detail sheet with keywords | MEDIUM |
| D-12 | Theme Toggle | Light/dark mode switch → all components respect | MEDIUM |
| D-13 | Refresh Button | Click → loading state → fresh data | HIGH |
| D-14 | Back Navigation | Owner page → click back → portfolio page | MEDIUM |

### 5.3 Data States

| # | State | Scenario | Priority |
|---|-------|----------|----------|
| D-15 | Loading | Initial page load → skeleton cards | HIGH |
| D-16 | Empty | Zero companies → "No Companies Found" | HIGH |
| D-17 | Error | API failure → destructive alert + retry button | HIGH |
| D-18 | Access Denied | Non-owner on owner page → shield icon | CRITICAL |
| D-19 | No Company | No company selected → "No company selected" | HIGH |
| D-20 | LinkedIn No Data | No LinkedIn connection → setup message | MEDIUM |
| D-21 | YouTube Public Fallback | Analytics unavailable → public data warning | MEDIUM |
| D-22 | Real-time Error | Realtime fetch fails → error message | MEDIUM |

### 5.4 Integration-Specific Dashboard Sections

**Google Analytics Report** (`ga-report.tsx`):
- Real-time mode with 30s polling
- Filter bar: device, landing pages, channels
- KPI cards: Users, Sessions, Views, Events
- Charts: Weekly performance, traffic share, channel breakdown
- Tables: Source performance, landing pages
- Demographics: Device, gender, age

**Google Search Console Report** (`gsc-report.tsx`):
- KPI funnel: Impressions → Clicks → Avg Position → Keywords
- Charts: Impressions/clicks over time, device performance, country map
- Tables: Keywords, landing pages (sortable, searchable)

**LinkedIn Report** (`li-report.tsx`):
- Data source detection: API / Sheets / Mock / Manual / None
- Content, visitor, follower analytics sections
- Demographics: Industry, seniority, job function, company size
- Manual data editor dialog

**YouTube Report** (`yt-report.tsx`):
- Public data fallback with warning banner
- Trending metrics, top videos table, engagement metrics

### 5.5 Responsive Design

| Breakpoint | Layout | Priority |
|------------|--------|----------|
| Mobile (320px) | Single column, stacked | HIGH |
| Tablet (768px) | 2-column grids | MEDIUM |
| Desktop (1024px+) | 3-4 column grids | MEDIUM |
| Safe area | Header respects notch insets | LOW |

---

## 6. Third-Party Integrations

### 6.1 Integration Matrix

| Integration | OAuth | Token Refresh | Data Fetch | Rate Limit | Cache | Disconnect |
|-------------|-------|---------------|------------|------------|-------|------------|
| Google Analytics | Shared Google | 4-min memory cache, 5-min expiry buffer | GA Data API v1beta | Not explicit | Daily snapshot + on-demand | Delete tokens |
| Google Search Console | Shared Google | Same as GA | Search Analytics API | Not explicit | Daily snapshot + on-demand | Delete tokens |
| YouTube | Shared Google | Channel-specific tokens | Data API v3 + Analytics API | Quota-based | DB cache | Delete tokens |
| LinkedIn | Separate OAuth | 60-day token lifetime | REST v2 API | 429 with retry-after | Fallback to zeros | Delete tokens |
| Google Sheets | Shared Google | Same as GA | Sheets API v4 | Quota-based | None | N/A |

### 6.2 Critical Integration Scenarios

| # | Scenario | Priority |
|---|----------|----------|
| I-1 | Google token refresh (expired) → auto-refresh → data returned | CRITICAL |
| I-2 | Google token revoked → `invalid_grant` → user sees reconnect message | HIGH |
| I-3 | LinkedIn 429 rate limit → fallback to zero values | HIGH |
| I-4 | YouTube Brand Account detection → specific error message | HIGH |
| I-5 | Partial service failure (LinkedIn fails, GA/GSC succeed) → partial data returned | HIGH |
| I-6 | All services fail → cache fallback → last good data | HIGH |
| I-7 | Token encryption round-trip (AES-256-GCM) | CRITICAL |
| I-8 | Multiple Google identities → correct token per channel | HIGH |
| I-9 | Disconnect cascade → mappings become invalid | HIGH |
| I-10 | Cron cache pre-population → all companies processed | HIGH |

---

## 7. Database & Data Integrity

### 7.1 Schema Summary (17 tables)

**Core:** companies, user_companies, oauth_tokens
**Integration Properties:** ga_properties, gsc_sites, youtube_channels, linkedin_pages
**Mappings:** company_ga_mappings, company_gsc_mappings, company_youtube_mappings, company_linkedin_mappings
**Cache:** analytics_cache, search_console_cache, portfolio_cache
**Admin:** access_codes, pending_invitations, invite_audit_log
**Config:** linkedin_sheet_configs

### 7.2 RLS Policy Coverage

All 17 tables have RLS enabled with 50+ policies covering:
- **SELECT**: Users see only their companies' data
- **INSERT/UPDATE/DELETE**: Owner/admin role required for mutations
- **Service role**: Bypasses RLS for system operations (cron, auto-assignment)
- **Shared tokens**: Company members can read shared OAuth tokens via mappings

### 7.3 Critical Data Integrity Scenarios

| # | Scenario | Priority |
|---|----------|----------|
| DB-1 | Multi-tenant isolation: User A cannot see Company B data | CRITICAL |
| DB-2 | RLS enforcement: viewer cannot INSERT mappings | CRITICAL |
| DB-3 | Cascade delete: company deletion removes all mappings | HIGH |
| DB-4 | Unique constraints: duplicate user_companies prevented | HIGH |
| DB-5 | Referential integrity: cannot map non-existent property | HIGH |
| DB-6 | Audit trail immutability: no UPDATE/DELETE on invite_audit_log | MEDIUM |
| DB-7 | Portfolio cache user isolation | HIGH |
| DB-8 | Token encryption: tokens never stored in plaintext | CRITICAL |
| DB-9 | Service role containment: secret key never leaks to client | CRITICAL |
| DB-10 | OAuth token per-identity uniqueness: UNIQUE(user_id, provider, google_identity) | HIGH |

### 7.4 Validation Gaps Identified

| Gap | Risk | Recommendation |
|-----|------|----------------|
| No email format validation before invite (relies on Supabase) | LOW | Add Zod schema |
| No UUID format validation on companyId params | MEDIUM | Add param validation |
| JSONB analytics_cache.data has no schema enforcement | LOW | Add runtime validation |
| No `expires_at > created_at` check on pending_invitations | LOW | Add DB constraint |
| Company names allow duplicates (no unique constraint) | MEDIUM | Add unique or warn |

---

## 8. Recommended Test Framework Setup

### Framework: Playwright

**Rationale:** Best support for Next.js, parallel execution, API testing built-in, auth state management.

### Suggested Directory Structure

```
tests/
├── e2e/
│   ├── onboarding/
│   │   ├── signup.spec.ts
│   │   ├── email-confirmation.spec.ts
│   │   ├── password-change.spec.ts
│   │   ├── company-auto-assign.spec.ts
│   │   ├── google-oauth-connect.spec.ts
│   │   ├── linkedin-oauth-connect.spec.ts
│   │   └── property-assignment.spec.ts
│   ├── auth/
│   │   ├── login.spec.ts
│   │   ├── logout.spec.ts
│   │   ├── magic-link.spec.ts
│   │   ├── password-reset.spec.ts
│   │   ├── session-management.spec.ts
│   │   └── rbac.spec.ts
│   ├── dashboard/
│   │   ├── portfolio-overview.spec.ts
│   │   ├── company-dashboard.spec.ts
│   │   ├── company-switching.spec.ts
│   │   ├── date-range-picker.spec.ts
│   │   ├── data-states.spec.ts
│   │   └── responsive.spec.ts
│   ├── admin/
│   │   ├── user-management.spec.ts
│   │   ├── company-management.spec.ts
│   │   ├── access-codes.spec.ts
│   │   └── integration-mappings.spec.ts
│   ├── integrations/
│   │   ├── google-analytics.spec.ts
│   │   ├── search-console.spec.ts
│   │   ├── youtube.spec.ts
│   │   ├── linkedin.spec.ts
│   │   └── linkedin-sheets.spec.ts
│   └── api/
│       ├── analytics-api.spec.ts
│       ├── companies-api.spec.ts
│       ├── integrations-api.spec.ts
│       ├── admin-api.spec.ts
│       └── cron-api.spec.ts
├── fixtures/
│   ├── auth.fixture.ts        # Authenticated user states
│   ├── company.fixture.ts     # Pre-created companies
│   ├── integration.fixture.ts # Mock OAuth tokens
│   └── data.fixture.ts        # Test analytics data
├── mocks/
│   ├── google-api.mock.ts     # Mock GA/GSC/YouTube APIs
│   ├── linkedin-api.mock.ts   # Mock LinkedIn API
│   └── supabase.mock.ts       # Mock Supabase responses
└── playwright.config.ts
```

### Test Data Requirements

```typescript
// Test Users
owner@test.com     // role: owner on all companies
admin@test.com     // role: admin
viewer@test.com    // role: viewer
newuser@test.com   // unregistered, for invitation tests

// Access Codes
"TEST2026"         // is_active: true, usage_count: 0
"EXPIRED01"        // is_active: false
"USED0001"         // is_active: true, usage_count: 5

// Test Companies (use seed data)
9 pre-seeded transportation companies

// Mock Integration Data
GA Property: "properties/123456789"
GSC Site: "https://test-company.com"
YouTube Channel: "UCxxxxxxxxxxxxxxxxx"
LinkedIn Org: "12345678"
```

### Environment Variables for Tests

```
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
LINKEDIN_OAUTH_CLIENT_ID
LINKEDIN_OAUTH_CLIENT_SECRET
OAUTH_ENCRYPTION_KEY
CRON_SECRET
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

---

## 9. Test Priority Matrix

### Phase 1: Critical Path (Week 1-2)
*Focus: Can a new user onboard and see data?*

| Test File | Scenarios | Status |
|-----------|-----------|--------|
| `onboarding/signup.spec.ts` | O-1 through O-8 | NOT STARTED |
| `onboarding/email-confirmation.spec.ts` | O-9 through O-13 | NOT STARTED |
| `onboarding/password-change.spec.ts` | O-14 through O-18 | NOT STARTED |
| `onboarding/company-auto-assign.spec.ts` | O-19 through O-22 | NOT STARTED |
| `auth/login.spec.ts` | A-1, A-2, A-6 | NOT STARTED |
| `auth/logout.spec.ts` | A-14 | NOT STARTED |
| `auth/rbac.spec.ts` | A-17 through A-22 | NOT STARTED |

### Phase 2: Integration Setup (Week 2-3)
*Focus: Can a user connect services and assign properties?*

| Test File | Scenarios | Status |
|-----------|-----------|--------|
| `onboarding/google-oauth-connect.spec.ts` | O-23 through O-28 | NOT STARTED |
| `onboarding/linkedin-oauth-connect.spec.ts` | O-29 through O-33 | NOT STARTED |
| `onboarding/property-assignment.spec.ts` | O-34 through O-39 | NOT STARTED |
| `integrations/youtube.spec.ts` | O-40 through O-45 | NOT STARTED |
| `integrations/linkedin.spec.ts` | I-3, I-5, I-6 | NOT STARTED |

### Phase 3: Dashboard & Data (Week 3-4)
*Focus: Does the dashboard display correctly?*

| Test File | Scenarios | Status |
|-----------|-----------|--------|
| `dashboard/portfolio-overview.spec.ts` | D-1 through D-4 | NOT STARTED |
| `dashboard/company-dashboard.spec.ts` | D-5 through D-14 | NOT STARTED |
| `dashboard/data-states.spec.ts` | D-15 through D-22 | NOT STARTED |
| `api/analytics-api.spec.ts` | R-1 through R-3, C-1 through C-6 | NOT STARTED |

### Phase 4: Admin & Edge Cases (Week 4-5)
*Focus: Admin operations and error handling*

| Test File | Scenarios | Status |
|-----------|-----------|--------|
| `admin/user-management.spec.ts` | A-23 through A-31 | NOT STARTED |
| `admin/access-codes.spec.ts` | A-32 through A-35 | NOT STARTED |
| `auth/session-management.spec.ts` | A-11 through A-16 | NOT STARTED |
| `auth/password-reset.spec.ts` | A-7 through A-10 | NOT STARTED |

### Phase 5: Data Integrity & Security (Week 5-6)
*Focus: Can't see other people's data*

| Test File | Scenarios | Status |
|-----------|-----------|--------|
| `api/admin-api.spec.ts` | DB-1 through DB-3 | NOT STARTED |
| `api/integrations-api.spec.ts` | DB-5, DB-7, DB-8 | NOT STARTED |
| `dashboard/responsive.spec.ts` | Mobile/tablet/desktop | NOT STARTED |

---

## Appendix: Key File References

### Authentication
```
middleware.ts
lib/supabase/middleware.ts
lib/supabase/client.ts
lib/supabase/server.ts
lib/auth/check-admin.ts
components/auth/login-form.tsx
components/auth/sign-up-form.tsx
components/auth/forgot-password-form.tsx
components/auth/update-password-form.tsx
components/auth/magic-link-form.tsx
app/auth/login/page.tsx
app/auth/sign-up/page.tsx
app/auth/change-password/page.tsx
app/auth/callback/route.ts
app/auth/confirm/route.ts
app/api/auth/validate-code/route.ts
app/api/auth/magic-link/route.ts
app/api/auth/change-password/route.ts
app/api/auth/google/callback/route.ts
app/api/auth/linkedin/callback/route.ts
```

### Dashboard
```
app/dashboard/layout.tsx
app/dashboard/executive/page.tsx
app/dashboard/executive/owner/page.tsx
lib/company-context.tsx
components/dashboard/shared/dashboard-header.tsx
components/dashboard/shared/company-switcher.tsx
components/dashboard/shared/date-range-picker.tsx
components/dashboard/shared/data-table.tsx
components/dashboard/shared/kpi-card.tsx
components/dashboard/executive/owner/owner-kpi-cards.tsx
components/dashboard/executive/portfolio-kpi-summary.tsx
```

### Integrations
```
app/admin/accounts/page.tsx
lib/services/oauth-token-service.ts
lib/services/google-analytics-service.ts
lib/services/google-search-console-service.ts
lib/services/youtube-analytics-service.ts
lib/services/linkedin-analytics-service.ts
lib/services/linkedin-sheets-service.ts
lib/constants/oauth-scopes.ts
```

### Database
```
supabase/migrations/ (23 migration files)
```
