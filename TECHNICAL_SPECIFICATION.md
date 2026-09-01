# CPPflow Marketing SaaS — Complete Technical Specification
## For AI Agent Rebuild

> **Purpose**: This document contains everything needed to rebuild the entire platform from scratch. It is written for an AI agent (LLM) to consume and execute.

---

## 0. EXECUTIVE SUMMARY

**Project Name**: CPPflow Marketing SaaS (Autonomous Marketing Platform)
**Codename**: "expload" / "cppflow"
**Purpose**: A multi-tenant, multi-language, AI-powered B2B marketing SaaS platform with 10 marketing phases, wholesale distribution, 6-round AI negotiation, graph-based autonomous agent orchestration, and 40+ payment gateways.

**Scale**:
- **149 Prisma models** (database tables)
- **238 API routes** (Next.js App Router)
- **62 dashboard views** (React components)
- **41 library modules** (core logic)
- **29 language translations** (including RTL: Arabic, Persian, Hebrew)
- **15 professional AI system prompts**
- **40 payment gateways** (Stripe, PayPal, Moyasar, Razorpay, Paystack, etc. + 4 crypto)
- **64 pre-seeded global marketing events**

---

## 1. TECHNOLOGY STACK

### Core
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.1.3 |
| Language | TypeScript | 5.x |
| Runtime | Node.js | 20+ |
| Package Manager | Bun | 1.3+ |
| Database ORM | Prisma | 6.19 |
| Database (dev) | SQLite | via Prisma |
| Database (prod) | PostgreSQL 15 | via Docker |
| Cache/Queue | Redis 7 | via Docker |
| UI Framework | React | 19 |
| Styling | Tailwind CSS | 4 |
| Component Library | shadcn/ui | latest |
| Animation | Framer Motion | 12 |
| Icons | lucide-react | latest |
| State | Zustand + TanStack Query | latest |
| i18n | custom (cookie-based) | 29 locales |
| Auth | Custom HMAC-SHA256 session | (NOT NextAuth — it crashed Turbopack) |
| AI SDK | z-ai-web-dev-sdk | (for VLM/image) |
| LLM | Multi-provider aggregator | 5 free providers |
| Vector DB | Qdrant (optional) | with DB fallback |
| PDF parsing | pdf-parse | 2.4 |
| DOCX parsing | mammoth | 1.12 |
| Password hashing | bcryptjs | latest |
| Deployment | Docker + docker-compose | |
| Reverse Proxy | Caddy (auto-HTTPS) | |
| Webhooks | NOWPayments HMAC-SHA512 | |

### NOT used (and why)
- **NextAuth.js**: Removed — caused Turbopack compilation crashes. Replaced with custom HMAC-SHA256 session system (`src/lib/auth/simple-session.ts`).
- **LangChain**: Too heavy. Replaced with custom LLM Aggregator (Strategy pattern).
- **Socket.io**: Not used for real-time. Polling via TanStack Query (5s refetchInterval).

---

## 2. PROJECT STRUCTURE

```
/home/z/my-project/
├── src/
│   ├── app/
│   │   ├── api/                    # 238 API routes (Next.js Route Handlers)
│   │   │   ├── auth/{login,signup,logout,me}/
│   │   │   ├── admin/{stats,users,tenants,audit}/
│   │   │   ├── leads/ + leads/search + leads/[id]/enrich
│   │   │   ├── campaigns/ + campaigns/[id]/send
│   │   │   ├── crm/{deals,tasks}/
│   │   │   ├── seo/ + seo/[id]/crawl
│   │   │   ├── social/{accounts,posts}/
│   │   │   ├── social-listening/{keywords,mentions}/
│   │   │   ├── ads/campaigns/
│   │   │   ├── content/{ideas,pieces}/
│   │   │   ├── analytics/events
│   │   │   ├── ab-testing/experiments/
│   │   │   ├── attribution/{events,rules}/
│   │   │   ├── ai/{agents,recommendations,generate}/
│   │   │   ├── workflows/
│   │   │   ├── agent/{run,cycles}/
│   │   │   ├── backlinks/{authority,discover,opportunities}/
│   │   │   ├── reviews/monitors/
│   │   │   ├── chatbot/{conversations,widgets}/
│   │   │   ├── whatsapp/{messages,templates}/
│   │   │   ├── messaging/{sms,push}/
│   │   │   ├── calendar/
│   │   │   ├── goals/
│   │   │   ├── projects/ + project-members/
│   │   │   ├── tenants/
│   │   │   ├── team/{members,roles,invitations,invite}/
│   │   │   ├── templates/
│   │   │   ├── landing-pages/
│   │   │   ├── funnel/
│   │   │   ├── journey/
│   │   │   ├── stats
│   │   │   ├── dashboard/unified
│   │   │   ├── diagnostics/ + diagnostics/run
│   │   │   ├── quick-setup
│   │   │   ├── progressive
│   │   │   ├── onboarding
│   │   │   ├── approvals
│   │   │   ├── queue
│   │   │   ├── seed
│   │   │   ├── health
│   │   │   ├── notifications/ + notifications/center/ + notifications/unread-count
│   │   │   ├── billing/{calculate,subscription,invoices}/
│   │   │   ├── payments/{list,methods,reports,alerts}/
│   │   │   ├── payments/gateways
│   │   │   ├── payments/crypto/{create,status}/
│   │   │   ├── webhooks/ + webhooks/crypto/nowpayments
│   │   │   ├── marketplace/{products,keys,usage}/
│   │   │   ├── club/{membership,tiers,ads,rewards}/
│   │   │   ├── ecommerce/{products,analyze,profit-calculator}/
│   │   │   ├── reseller/{opportunities,applications}/
│   │   │   ├── white-label/{config,customers}/
│   │   │   ├── platform/{finance,promotions,referrals}/
│   │   │   ├── promo-links/ + promo-links/[id]/click
│   │   │   ├── competitor-analysis/ + competitor-analysis/run
│   │   │   ├── analyzers/{competitors,social,export-markets,export-products,market-research}/
│   │   │   ├── investors/ + investors/match
│   │   │   ├── cofounders/
│   │   │   ├── partnerships/
│   │   │   ├── reports/ + reports/monthly/ + reports/monthly/generate
│   │   │   ├── reports (financial) — ?period=daily|weekly|monthly&audience=admin|distributor|affiliate
│   │   │   ├── distributors/ + distributors/{contracts,licenses,territories,payouts,tickets,audit,finance}/
│   │   │   ├── internal/{employees,departments,activities}/
│   │   │   ├── finance/reports
│   │   │   ├── llm/{providers,chat,usage,audit}/
│   │   │   ├── onboarding/{sessions,crawl,upload}/
│   │   │   ├── negotiation/{sessions,sessions/[id],sessions/[id]/regenerate,respond}/
│   │   │   ├── virtual-assistants/ + virtual-assistants/{services,assignments,timesheets}/
│   │   │   ├── payroll/{config,run,periods}/
│   │   │   ├── support-plans/ + support-plans/{subscriptions,tickets}/
│   │   │   ├── vector-search
│   │   │   ├── graph/{plan,execute}/
│   │   │   ├── project-intake/ + project-intake/[id]/pay
│   │   │   ├── events-calendar/range
│   │   │   ├── campaign-scheduler/{suggest,[id]/approve}/
│   │   │   ├── sandbox/{start,action,convert}/
│   │   │   └── public/{blog,demo,marketplace,pricing-calculate,reseller}/
│   │   ├── globals.css             # Tailwind + 3D animations + brand colors
│   │   ├── layout.tsx              # Root layout (ThemeProvider, i18n, fonts)
│   │   ├── page.tsx                # Main dashboard page (view router)
│   │   └── fonts/Vazirmatn-Regular.woff2  # Persian/Arabic font
│   ├── components/
│   │   ├── dashboard/              # 62 view components (one per feature)
│   │   ├── guides/                 # GuidedTour + GuideTooltip
│   │   ├── ui/                     # shadcn/ui primitives (40+ components)
│   │   ├── auth/                   # AuthModal, SessionProvider
│   │   ├── i18n/                   # LanguageSwitcher, CommandPalette
│   │   ├── landing/                # BlogSection, LiveDemoSection
│   │   └── providers.tsx           # React Query provider
│   ├── lib/                        # 41 core logic modules (see Section 5)
│   ├── messages/                   # 29 i18n JSON files (en, fa, ar, zh, ja, ...)
│   ├── store/                      # Zustand stores (app-store, auth-store)
│   ├── i18n/                       # i18n config, provider, server
│   ├── hooks/                      # use-mobile, use-toast
│   └── proxy.ts                    # Global middleware (auth + security headers)
├── prisma/schema.prisma            # 149 models, ~4300 lines
├── scripts/                        # 18 scripts (seeds, deployment, translation)
├── Dockerfile                      # Multi-stage production build
├── docker-compose.{dev,prod}.yml
├── Caddyfile                       # Reverse proxy config
├── .env.example                    # Environment template
├── package.json
├── bun.lock
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── components.json                 # shadcn/ui config
└── postcss.config.mjs
```

---

## 3. DATABASE SCHEMA (149 MODELS)

### 3.1 Core Multi-Tenant Models

```prisma
model Tenant {
  id        String   @id @default(cuid())
  name      String
  domain    String   @unique
  isActive  Boolean  @default(true)
  plan      String   @default("free") // free | pro | enterprise | distributor
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  // ... 30+ reverse relations to all tenant-scoped models
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  hashedPassword String?
  role          String   @default("member") // owner | admin | manager | editor | viewer
  isActive      Boolean  @default(true)
  tenantId      String
  roleId        String?  // links to Role for granular permissions
  // relations: tenant, superAdmin, internalEmployee, activities, campaigns, etc.
}

model SuperAdmin {
  id        String   @id @default(cuid())
  userId    String   @unique
  level     Int      @default(1)
  isActive  Boolean  @default(true)
}

model Role {
  id          String   @id @default(cuid())
  name        String   // owner | admin | manager | editor | viewer | super_admin
  level       Int      @default(0) // 0=viewer ... 5=super_admin
  isSystem    Boolean  @default(false)
  scope       String   @default("tenant") // tenant | project
  permissions RolePermission[]
}

model Permission {
  name        String   @unique  // e.g. "leads.create", "billing.*"
  category    String   @default("general")
}
```

### 3.2 All 149 Models (alphabetical)

AbTestExperiment, Activity, AdAccount, AdCampaign, AgentCycle, AiAgent, AiRecommendation, AiTask, AnalyticsEvent, AnalyticsReport, ApiKey, ApiProduct, ApiUsage, ApprovalRequest, AssistantAssignment, AssistantPerformance, AssistantService, AssistantTimesheet, AttributionEvent, AuditLogEntry, AuthorityTracker, BacklinkOpportunity, BacklinkOutreach, BlogComment, BlogPost, BrandKeyword, BrandMention, BusinessDiagnostic, CalendarEvent, CampaignScheduleSuggestion, ChatbotConversation, ChatbotMessage, ChatbotWidget, ClubAdvertisement, ClubMembership, ClubPoint, ClubReward, ClubTier, CofounderProfile, Cohort, Commission, Company, CompetitorAnalysis, CompetitorProfile, Contact, ContentCalendar, ContentIdea, ContentPiece, CryptoPayment, CryptoWallet, CustomerJourney, Deal, DemoSession, Distributor, DistributorAuditLog, DistributorContract, DistributorPayout, DistributorSupportTicket, EcommerceProduct, EmailCampaign, EmailLog, EmailTemplate, ExportMarket, ExportProduct, FinancialAlert, FinancialReport, FraudRule, GlobalEvent, Goal, InternalDepartment, InternalEmployee, InternalEmployeeActivity, InvestorProfile, Invoice, LandingPage, Lead, LicenseAllocation, LicensePackage, LlmAuditEvent, LlmProviderConfig, LlmUsageRecord, MarketResearch, MarketingFunnel, MonthlyReport, NegotiationAuditEvent, NegotiationProposal, NegotiationSession, Notification, OnboardingDocument, OnboardingSession, OnboardingStep, PartnershipOpportunity, Payment, PaymentGatewayConfig, PaymentMethod, PayrollConfig, PayrollPeriod, Permission, Pipeline, PlatformPromotion, PricingCalculation, ProfitEstimate, ProgressiveUnlock, Project, ProjectBrief, ProjectMember, PromoLink, PromoLinkClick, PushNotification, Referral, ReferralProgram, ResellerApplication, ResellerCustomer, ResellerOpportunity, Review, ReviewMonitor, Role, RolePermission, SalaryPayment, SandboxAction, SandboxSession, SeoBacklink, SeoCrawl, SeoIssue, SeoKeyword, SeoPage, SeoProject, SmsMessage, SocialAccount, SocialAnalysis, SocialPost, Subscription, SuperAdmin, SupportPlan, SupportSubscription, SupportTicketItem, Task, TeamInvitation, Tenant, TerritoryExclusivity, User, VectorIndex, VirtualAssistant, WebhookSubscription, WhatsAppMessage, WhatsAppTemplate, WhiteLabelConfig, Workflow, WorkflowRun

### 3.3 Key Model Details

#### Distributor System (Wholesale)
- `Distributor` — linked to Tenant, has tier (standard/silver/gold/platinum/master), country, banking info
- `DistributorContract` — minimumGuarantee, wholesaleDiscountPercent, paymentTerms (prepaid/net_30), territoryScope, isExclusive
- `LicensePackage` — SKU (PLT-100/500/1000/5000/10000), licenseCount, wholesalePrice, retailPriceSuggestion
- `LicenseAllocation` — licenseKey (unique), status (in_pool/allocated/activated/expired/revoked), customerEmail
- `TerritoryExclusivity` — country/region/city exclusivity with minimumSalesCommitment
- `DistributorPayout` — periodStart/End, grossSales, platformShare, distributorShare, method (bank/paypal/crypto)
- `DistributorSupportTicket` — tier (tier1/tier2/tier3), escalatedByDistributor

#### Negotiation Engine
- `NegotiationSession` — currentState (initial/mvp/economic/phased/revenue_share/equity/accepted/rejected_all), proposalRound 0-5
- `NegotiationProposal` — round, type, title, description, features (JSON), excludedFeatures, deliveryWeeks, price, paymentSchedule, savingsPercent
- States: initial → mvp → economic → phased → revenue_share → equity → rejected_all (or accepted from any)

#### LLM Aggregator
- `LlmProviderConfig` — provider (groq/cerebras/openrouter/mistral/huggingface), apiKey, dailyTokenLimit, priority, cooldownMinutes
- `LlmUsageRecord` — provider, model, inputTokens, outputTokens, costUsd, status (success/rate_limited/error)
- `LlmAuditEvent` — eventType (provider_switched/rate_limited/quota_warning/quota_exceeded/recovered)

#### Virtual Assistant + Payroll
- `VirtualAssistant` — skills (JSON), primarySkill, hourlyRate, rating, isAvailable, isVerified
- `AssistantAssignment` — assistantId, tenantId, pricingType (hourly/fixed/monthly_retainer), hoursLogged, tasksCompleted
- `AssistantTimesheet` — date, hoursWorked, activityType (manual/automatic), keystrokesCount, mouseMovements, screenshots (JSON), productivityScore
- `PayrollConfig` — ownerSharePercent (50), staffPoolPercent (40), reinvestmentPercent (10), bonusPoolPercent (5), roleWeights (JSON: c_level=3, vp=2.5, director=2, manager=1.5, lead=1.2, senior=1, staff=0.7)
- `PayrollPeriod` — totalRevenue, ownerShare, staffPool, distributions (JSON array)
- `SalaryPayment` — baseShare, bonusAmount, grossAmount, taxAmount, netAmount, paymentMethod, status

#### Support Plans
- `SupportPlan` — name (Basic/Premium/Enterprise), monthlyPrice (99/499/1999), features (JSON), responseTimeHours (48/4/1), channels (JSON)
- `SupportSubscription` — planId, tenantId, billingCycle (monthly/annual), nextBillingAt, ticketsUsedThisCycle
- `SupportTicketItem` — ticketNumber, subject, category, priority, slaResponseDue, slaResolutionDue, firstRespondedAt

#### Project Intake + Events + Sandbox
- `ProjectBrief` — businessName, description, budget, roadmap (JSON), pricingTiers (JSON), paymentStatus, paymentOption (full/phased), amountPaid
- `GlobalEvent` — name, startDate, category (holiday/cultural/sports/tech/business/religious/seasonal/trending), marketingRelevance (high/medium/low), suggestedCampaignTypes (JSON), recommendedIndustries (JSON), countries (JSON), regions (JSON)
- `CampaignScheduleSuggestion` — campaignName, totalBudget, depositReceived, suggestedStartDates (JSON with reasoning + aligned events)
- `SandboxSession` — visitorEmail, demoType, maxActions (20), actionsUsed, expiresAt (24h), mockTenantId
- `SandboxAction` — sessionId, actionType, module, metadata

#### Vector Search
- `VectorIndex` — sourceType (lead/document/content/knowledge_base), sourceId, embeddingModel, embeddingDim, vector (JSON array), textChunk

---

## 4. AUTHENTICATION & SECURITY

### 4.1 Custom Session System (`src/lib/auth/simple-session.ts`)

**NOT NextAuth.js** — it crashed Turbopack. Custom HMAC-SHA256 instead.

```typescript
// Token format: userId.hmac(userId + SECRET)
// SECRET = process.env.NEXTAUTH_SECRET

import { createHmac, timingSafeEqual } from 'node:crypto'

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

export function createSessionToken(userId: string): string {
  return `${userId}.${sign(userId)}`
}

export function verifySessionToken(token: string): string | null {
  // Split, recompute, timingSafeEqual
}
```

- Cookie name: `session`
- httpOnly: true, sameSite: 'lax', secure in production, maxAge: 30 days
- **Constant-time comparison** via `timingSafeEqual` (prevents timing attacks)

### 4.2 RBAC (`src/lib/auth/rbac.ts`)

Hierarchy: `super_admin` → `owner` → `admin` → `manager` → `editor` → `viewer`

- SuperAdmin: checked via `db.superAdmin.findUnique({ where: { userId } })`
- Owner: `user.role === 'owner'` → all tenant permissions
- Admin: most permissions except `team.*` and `billing.*`
- Others: via `Role` + `RolePermission` junction table
- Wildcard support: `leads.*` matches `leads.create`, `leads.update`, etc.

### 4.3 Global Proxy/Middleware (`src/proxy.ts`)

**Next.js 16 uses `proxy.ts` instead of `middleware.ts`.**

Responsibilities:
1. **Authentication enforcement** on all `/api/*` and dashboard pages
2. **Public route whitelist**: `/api/health`, `/api/auth/{login,signup,logout}`, `/api/public/*`, `/api/webhooks/*`, `/api/sandbox/*`, `/api/seed`, `/api/team/invite/*`
3. **Malicious path rejection**: path traversal (`..`), null bytes (`\0`), control chars
4. **Security headers**: CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, HSTS (prod), Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy
5. **CSP**: `default-src 'self'; script-src 'self' 'unsafe-inline' ('unsafe-eval' in dev); style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://google.serper.dev https://*.chatglm.cn https://*.z.ai; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'`

### 4.4 API Protection (`src/lib/security/with-protection.ts`)

Wraps every API handler:
- Rate limiting (per-IP, per-namespace)
- Security headers on response
- Audit logging (on success)
- Rate limit headers (`X-RateLimit-*`)

```typescript
export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write', audit: { type: 'created', message: (req) => 'Lead created' } })
```

### 4.5 Rate Limiting (`src/lib/security/rate-limit.ts`)

Presets:
- `read`: 100 requests / 60s
- `write`: 30 requests / 60s
- `auth`: 5 requests / 60s
- `ai`: 10 requests / 60s

In-memory store (production: Redis).

---

## 5. CORE LIBRARY MODULES (41 files)

### 5.1 LLM Aggregator (`src/lib/llm/`)

**Pattern**: Strategy + Chain of Responsibility (fallback chain)

**Files**:
- `types.ts` — `LlmProviderStrategy` interface, `LlmMessage`, `LlmRequest`, `LlmResponse`
- `aggregator.ts` — Singleton `llmAggregator` with:
  - Priority-ordered provider list: Groq → Cerebras → OpenRouter → Mistral → HuggingFace
  - Auto-fallback on `RateLimitError`, `AuthError`, `ProviderError`
  - Cooldown management (5min on rate-limit)
  - Daily quota check (1M tokens/day per provider default)
  - Warning at 80% quota usage (emits notification)
  - Usage recording (`LlmUsageRecord`) + audit trail (`LlmAuditEvent`)
- `providers/openrouter.ts` — 8 free models (Llama 3.3 70B, Mistral, DeepSeek R1, etc.)
- `providers/groq.ts` — Llama 3.3 70B Versatile, Gemma 2, Mixtral, DeepSeek R1 Distill
- `providers/cerebras.ts` — Llama 3.3 70B, Llama 3.1 8B (Wafer-Scale Engine)
- `providers/mistral.ts` — Open Mistral 7B, Mixtral 8x7B/8x22B
- `providers/huggingface.ts` — Llama 3.2, Mistral 7B v0.3, Qwen 2.5, Zephyr

**Error classes**: `RateLimitError`, `AuthError`, `ProviderError` (in openrouter.ts, shared)

**Usage**:
```typescript
import { llmAggregator } from '@/lib/llm/aggregator'
const response = await llmAggregator.complete({
  messages: [{ role: 'user', content: 'Hello' }],
  sessionType: 'negotiation',
  tenantId,
  temperature: 0.7,
  maxTokens: 2048,
})
```

### 5.2 Negotiation Engine (`src/lib/negotiation/engine.ts`)

**Pattern**: State Pattern — each round is a state handler class.

**6 States + transitions**:
```
initial → (reject) → mvp → (reject) → economic → (reject) → phased → (reject) → revenue_share → (reject) → equity → (reject) → rejected_all
```
Any state → (accept) → `accepted`

**State handlers** (classes implementing `NegotiationStateHandler`):
1. `InitialProposalState` (round 0) — full scope, full price, standard timeline
2. `MvpProposalState` (round 1) — −20% scope, −30% timeline, −15% price
3. `EconomicProposalState` (round 2) — cheaper LLM models, +50% timeline, −30% price
4. `PhasedProposalState` (round 3) — 3 phases, pay-per-phase, −60% start cost
5. `RevenueShareProposalState` (round 4) — 40% upfront + 20% monthly revenue for 18 months
6. `EquityProposalState` (round 5) — 15% cash + 3% equity + 24-month partnership (FINAL)

Each handler:
- `formulaDescription()` — explains the pricing formula
- `nextStateOnReject()` — returns next state
- `generateProposal(ctx)` — calls LLM with round-specific prompt, returns `GeneratedProposal`

**Main functions**:
- `generateProposalForSession(sessionId)` — generates proposal for current state
- `respondToProposal(proposalId, 'accepted'|'rejected', feedback?)` — processes customer response, auto-advances state

### 5.3 Graph Agent Orchestrator (`src/lib/graph/orchestrator.ts`)

**Architecture**: Node-based DAG (Directed Acyclic Graph) execution.

**17 Node Types**:
`find_leads`, `enrich_leads`, `qualify_leads`, `create_campaign`, `send_campaign`, `analyze_competitor`, `generate_content`, `schedule_social`, `run_seo_audit`, `launch_ads`, `start_negotiation`, `onboard_customer`, `run_diagnostics`, `generate_report`, `assign_assistant`, `process_payment`, `notify_user`

**Types**:
```typescript
interface GraphNode {
  id: string
  type: NodeType
  inputs: Record<string, any>
  depends_on: string[]  // node IDs
  parallelizable: boolean
}

interface ExecutionPlan {
  plan_name: string
  goal: string
  estimated_duration_minutes: number
  nodes: GraphNode[]
  success_criteria: string
}
```

**Functions**:
- `generatePlan(goal, tenantId, userId)` — LLM generates ExecutionPlan from natural language goal (uses `graphAgentPlanner` prompt)
- `executePlan(plan, tenantId, userId, onProgress?)` — topological sort execution:
  1. Find ready nodes (dependencies satisfied)
  2. Execute parallelizable nodes concurrently (`Promise.allSettled`)
  3. Execute sequential nodes one at a time
  4. Deadlock detection (skip nodes with failed dependencies)
  5. Emit notifications on start/complete

**4 Plan Templates** (no LLM needed):
- `lead_to_campaign` — find → enrich → qualify → campaign → send (6 nodes)
- `competitor_research` — 3 competitors in parallel → report (5 nodes)
- `full_funnel_launch` — leads + content + social + ads + email + report (9 nodes)
- `customer_onboarding_to_negotiation` — onboard → negotiate (3 nodes)

Each node executor calls internal API endpoints via `fetch()`.

### 5.4 Payment System (`src/lib/payment/`)

**Files**:
- `crypto.ts` — NOWPayments integration (BTC/ETH/USDT/USDC/TRX/BNB/SOL on 6 chains)
  - `createCryptoPayment(req)` — creates invoice via NOWPayments API
  - `verifyNowPaymentsSignature(payload, signature)` — HMAC-SHA512 webhook verification
  - `updateCryptoPaymentStatus(gatewayPaymentId, status, confirmations, rawPayload)` — processes webhook, auto-creates `Payment` record on completion
  - `generateLicenseKey()` — generates `XXXX-XXXX-XXXX-XXXX` format keys
  - Fallback to manual mode (direct wallet address) if NOWPayments not configured
- `gateway-router.ts` — Multi-gateway router (40 providers)
  - `routePayment(intent)` — picks best gateway based on currency/country/method
  - Gateway adapters: Stripe, PayPal, Razorpay, Moyasar, Paystack, Flutterwave, Tap, HyperPay, Mollie, Midtrans, Iyzico, NOWPayments, CoinPayments, Coinbase Commerce, BitPay, Square, Adyen, Klarna, Amazon Pay, Apple Pay, Google Pay, WeChat Pay, Alipay, MercadoPago, bKash, Nagad, DANA, GCash, TrueMoney, KakaoPay, NaverPay, YooKassa, PIX, Wise, Payoneer, Worldpay, Verifone, 2Checkout, Skrill, Stripe Terminal

### 5.5 Financial Reports (`src/lib/finance/reports.ts`)

**Functions**:
- `aggregateRevenue(params)` — total gross/net/fees/commission, breakdown by method/currency/day, growth % vs previous period
- `aggregateDistributorMetrics(distributorId, start, end)` — license stats, payout stats, ticket stats
- `aggregateAffiliateMetrics(tenantId, start, end)` — commission stats, customer stats, referral stats
- `generateAiInsights(params, metrics)` — LLM-powered insights (summary, key findings, anomalies, recommendations, forecasts, risk assessment)
- `generateFinancialReport(params)` — full report generation + persist to `FinancialReport` model + emit notification
- `computePeriodDates(period)` — calculates date ranges for daily/weekly/monthly/quarterly/annual

### 5.6 Project Intake Engine (`src/lib/project-intake/engine.ts`)

**Flow**:
1. `createProjectBrief(input)` — stores brief
2. `analyzeBrief(briefId)` — calls LLM twice:
   - First: `ROADMAP_PROMPT` → generates SWOT, phases, milestones, KPIs
   - Second: `PRICING_PROMPT` → generates 3 tiers (Essential/Growth/Premium) with full + phased payment options
3. `recordPayment(briefId, params)` — records payment, tracks partial vs full

### 5.7 Campaign Scheduler (`src/lib/campaign-scheduler/scheduler.ts`)

**Logic**:
- Deposit-based start: campaign can only start after deposit covers preparation phase (3-7 days)
- Event alignment: if high-relevance event within 2-4 weeks, suggest aligning launch (impact multiplier 1.2-1.5x)
- Duration: based on budget ($1K=7d, $5K=21d, $10K+=30-45d)
- Generates 3 options: recommended (balance), earliest (aggressive), best event alignment (may require waiting)

### 5.8 Events Calendar (`src/lib/events-calendar/index.ts`)

- `getEventsInRange(start, end, filters)` — queries `GlobalEvent`, handles recurring events
- `findBestEventForCampaign(industry, countries, campaignType)` — scores events by relevance + industry match + campaign type match + recency
- `getUpcomingHighRelevanceEvents(daysAhead)` — for notification reminders

### 5.9 Vector Search (`src/lib/vector/qdrant.ts`)

- `generateEmbedding(text)` — OpenAI text-embedding-3-small API (or pseudo-embedding fallback for dev)
- `indexVector(params)` — stores in Qdrant (production) + DB (fallback)
- `semanticSearch(params)` — cosine similarity search, returns ranked results
- `isQdrantEnabled()` — checks if `QDRANT_URL` is set

### 5.10 Notification System (`src/lib/notifications/emitter.ts`)

- `emitNotificationEvent(event)` — persists to `Notification` model, triggers real-time (future SSE)
- `getNotifications(tenantId, filters)` — query with unread/category filters
- `markNotificationRead(id, tenantId)` / `markAllNotificationsRead(tenantId)`
- `getUnreadCount(tenantId)` — for badge display

### 5.11 Onboarding (`src/lib/onboarding/`)

- `crawler.ts` — `crawlWebsite(url)` fetches HTML, strips tags, extracts title/meta/text (max 50K chars)
- `extractor.ts` — `extractDocument(filePath, filename, fileType)` for PDF (pdf-parse), DOCX (mammoth), TXT/MD/HTML

### 5.12 Security Modules (`src/lib/security/`)

- `rate-limit.ts` — in-memory token bucket rate limiter
- `headers.ts` — `applySecurityHeaders(res)` + `withSecurityHeaders(handler)` wrapper
- `audit.ts` — `audit({ type, message, tenantId, ip })` persists to `AuditLogEntry`
- `sanitize.ts` — input sanitization utilities
- `with-protection.ts` — main API wrapper (rate limit + headers + audit)

### 5.13 System Prompts (`src/lib/prompts/system-prompts.ts`)

**15 professional prompts**:

| Key | Purpose | Temperature |
|-----|---------|-------------|
| `graphAgentPlanner` | Goal → Execution Plan (DAG) | 0.4 |
| `graphAgentExecutor` | Execute single node | 0.3 |
| `negotiationInitial` | Full-scope proposal (anchor high) | 0.7 |
| `negotiationMvp` | MVP Fast-Track (−20%/−30%/−15%) | 0.7 |
| `negotiationEconomic` | Economic (cheaper models, +50% time, −30% price) | 0.7 |
| `negotiationPhased` | 3 phases, pay-per-phase, −60% start | 0.7 |
| `negotiationRevenueShare` | 40% upfront + 20% monthly revenue | 0.7 |
| `negotiationEquity` | 15% cash + 3% equity + 24-month partner | 0.7 |
| `leadEnrichment` | Extract structured lead info + score 0-100 | 0.3 |
| `competitorAnalysis` | 10-factor deep analysis | 0.4 |
| `contentBlog` | 800-1200 word blog post | 0.7 |
| `contentSocial` | 5 platform-optimized posts | 0.7 |
| `seoAudit` | 50+ factor SEO audit | 0.3 |
| `businessDiagnostics` | Health score + quick wins + risks | 0.4 |
| `financialAnalysis` | Revenue insights + anomalies + risk score | 0.3 |
| `supportRouting` | Ticket classification + routing | 0.3 |
| `payrollInsights` | Fairness assessment + retention risk | 0.4 |

Each prompt includes: role definition, task specification, STRICT JSON output format, constraints, and tone guidance.

### 5.14 Other Lib Modules

- `db.ts` — Prisma client singleton
- `tenant.ts` — `requireTenantId()` helper
- `auth/password.ts` — bcrypt hash/verify
- `auth/config.ts` — auth configuration
- `auth/session.ts` — session helpers (legacy, uses simple-session)
- `email/service.ts` — nodemailer SMTP
- `queue/index.ts` — job queue (Redis in prod, in-memory in dev)
- `services/serper.ts` — Serper.dev Google search API
- `services/google-maps-scraper.ts` — Playwright-based Maps scraper
- `ai/lead-extractor.ts` — uses z-ai-web-dev-sdk for lead enrichment
- `crud/domain-handler.ts` — generic CRUD factory
- `config/env.ts` — environment variable access
- `guides/section-guides.ts` — 11 section guides with step-by-step instructions for GuidedTour

---

## 6. FRONTEND ARCHITECTURE

### 6.1 Main Page Router (`src/app/page.tsx`)

Single-page app with view switching (no URL routing for dashboard views):

```typescript
type View = 'dashboard' | 'agent-hub' | 'graph-agent' | 'project-intake' | 'events-calendar' | ... // 60+ views

function RenderView({ view, onNavigate }: { view: View; onNavigate?: (v: string) => void }) {
  switch (view) {
    case 'dashboard': return <DashboardView />
    case 'agent-hub': return <AgentHubView onNavigate={onNavigate} />
    case 'graph-agent': return <GraphAgentView />
    case 'project-intake': return <ProjectIntakeView />
    case 'negotiation': return <NegotiationView />
    case 'llm-settings': return <LlmSettingsView />
    case 'financial-reports': return <FinancialReportsView />
    // ... 55 more
  }
}
```

### 6.2 Sidebar (`src/components/dashboard/sidebar.tsx`)

5 sections with collapsible items:
1. **Overview**: Dashboard, Agent Hub, Graph Agent, Project Brief & Pricing, Events & Scheduler, Unified, Roadmap, 1-Click Setup, Goals, Calendar
2. **Acquire (P1-P2)**: Leads, Generator, CRM, Campaigns, Engagement, Attribution, Competitor Analysis, Investor Hub
3. **Grow (P3-P8)**: Content, SEO, A/B & Landing, Ads, Social, Listening, Backlinks, Social Analyzer, Export Market, Analytics
4. **Monetize & AI**: AI Agents, Advisor, Workflow, Autonomous, Pricing, Marketplace, Club, Ecommerce, Reseller, Distributors, Payment Gateways, LLM Aggregator, Onboarding Wizard, Negotiation, Virtual Assistants, Support Plans, Payroll
5. **System**: Notification Center, Internal Portal, Super Admin, White Label, Finance, Financial Reports, Self-Promotion, Link Generator, Team, Projects, Tenants, Activity, Settings, Demo Sandbox

All labels use i18n: `t('nav.xxx')` with fallback to English.

### 6.3 Dashboard Views (62 components)

Each view follows this pattern:
```typescript
'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { GuideTooltip } from '@/components/guides/guided-tour'
import { toast } from 'sonner'

export function FeatureNameView() {
  const { data, isLoading } = useQuery({
    queryKey: ['feature-data'],
    queryFn: async () => { const res = await fetch('/api/feature'); return res.json() },
  })
  // ... render with card-3d, animate-float-3d, brand colors
}
```

### 6.4 UI Components (shadcn/ui — 40+ components)

`button`, `card`, `badge`, `input`, `textarea`, `label`, `select`, `checkbox`, `switch`, `tabs`, `dialog`, `sheet`, `dropdown-menu`, `tooltip`, `popover`, `accordion`, `avatar`, `breadcrumb`, `calendar`, `carousel`, `chart`, `collapsible`, `command`, `context-menu`, `drawer`, `form`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `pagination`, `progress`, `radio-group`, `resizable`, `scroll-area`, `separator`, `skeleton`, `slider`, `sonner` (toaster), `table`, `toggle`, `toggle-group`, `alert`, `alert-dialog`

### 6.5 3D Animations (CSS in `globals.css`)

12 custom animation utilities:
- `.card-3d` — perspective tilt on hover (rotateX/Y + translateY)
- `.card-3d-flat` — subtle scale on hover
- `.glass-card` — glassmorphism (backdrop-filter blur)
- `.animate-float-3d` — floating icons (translateY + rotateZ)
- `.animate-spin-3d` — 3D rotating spinner
- `.animate-particle` — particle float for hero backgrounds
- `.animate-slide-in-right` — panel slide-in
- `.animate-scale-in` — modal scale-in
- `.animate-gradient-shift` — animated gradient backgrounds
- `.animate-shimmer` — loading skeleton shimmer
- `.animate-pulse-glow` — CTA button glow
- `.btn-3d` — 3D button press effect (box-shadow on active)

Also uses Framer Motion (lazy-loaded) for GuidedTour modal (spring physics).

### 6.6 Guided Tour System (`src/components/guides/guided-tour.tsx`)

- `<GuideTooltip sectionId="...">` — hover help icon with section description
- `<GuidedTour sectionId open onClose>` — modal walkthrough with:
  - Step-by-step instructions
  - Progress bar + dots
  - Back/Next navigation
  - "Next step" suggestion
  - Spring-animated entrance (Framer Motion)

11 section guides defined in `src/lib/guides/section-guides.ts`:
agent-hub, leads, negotiation, onboarding-wizard, llm-settings, distributors, payment-gateways, virtual-assistants, payroll, support-plans, notification-center

---

## 7. DESIGN SYSTEM

### 7.1 Brand Colors (from CPPflow logo)

Extracted via VLM (vision model) analysis of the logo:

```css
/* Light mode */
--background: #FAF9F6;     /* cream */
--foreground: #1B3A4B;     /* dark navy (CPP) */
--primary: #1B3A4B;        /* dark navy */
--secondary: #8CD4D8;      /* light teal (flow) */
--accent: #F26522;         /* bright orange (P) */
--muted: #F0EFEB;
--muted-foreground: #999999;
--ring: #F26522;

/* Dark mode */
--background: #0F2530;     /* deeper navy */
--foreground: #FAF9F6;
--primary: #8CD4D8;        /* teal becomes primary in dark */
--card: #1B3A4B;
--accent: #F26522;
```

Chart colors: `#1B3A4B`, `#F26522`, `#8CD4D8`, `#5BAFC4`, `#C4B8A8`

### 7.2 Typography

- **Primary font**: Vazirmatn (Persian/Arabic support) + Geist Sans + system-ui fallback
- **Mono**: Geist Mono
- Loaded via `next/font` in `layout.tsx`

### 7.3 Theme

- `next-themes` with `attribute="class"` and `defaultTheme="light"`
- Toggle button in header (sun/moon icon)
- All components use `dark:` variants

---

## 8. INTERNATIONALIZATION (29 languages)

### Config (`src/i18n/config.ts`)

```typescript
export const LOCALES = [
  { code: 'en', name: 'English', direction: 'ltr', bcp47: 'en-US' },
  { code: 'fa', name: 'Persian', direction: 'rtl', bcp47: 'fa-IR' },
  { code: 'ar', name: 'Arabic', direction: 'rtl', bcp47: 'ar-SA' },
  { code: 'he', name: 'Hebrew', direction: 'rtl', bcp47: 'he-IL' },
  { code: 'zh', direction: 'ltr' },
  { code: 'ja', direction: 'ltr' },
  { code: 'ko', direction: 'ltr' },
  { code: 'de', direction: 'ltr' },
  { code: 'fr', direction: 'ltr' },
  { code: 'es', direction: 'ltr' },
  { code: 'pt-BR', direction: 'ltr' },
  { code: 'it', direction: 'ltr' },
  { code: 'ru', direction: 'ltr' },
  { code: 'hi', direction: 'ltr' },
  { code: 'tr', direction: 'ltr' },
  { code: 'nl', direction: 'ltr' },
  { code: 'pl', direction: 'ltr' },
  { code: 'id', direction: 'ltr' },
  { code: 'vi', direction: 'ltr' },
  { code: 'th', direction: 'ltr' },
  { code: 'da', direction: 'ltr' },
  { code: 'sv', direction: 'ltr' },
  { code: 'de-CH', direction: 'ltr' },
  { code: 'no', direction: 'ltr' },
  { code: 'fi', direction: 'ltr' },
  { code: 'cs', direction: 'ltr' },
  { code: 'uk', direction: 'ltr' },
  { code: 'ms', direction: 'ltr' },
  { code: 'bn', direction: 'ltr' },
]
export const DEFAULT_LOCALE = 'en'
```

- Cookie-based (`locale` cookie, 1 year maxAge)
- No URL-based routing (single `/` route)
- `<html lang dir>` updated based on locale
- RTL: Arabic, Hebrew, Persian
- Translation files in `src/messages/{locale}.json`
- Each file has 50+ nav keys + section titles + dashboard labels

---

## 9. CONFIGURATION FILES

### 9.1 `package.json` (key scripts)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "build:webpack": "next build --no-turbopack",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}
```

### 9.2 `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  output: "standalone",       // self-contained production build
  reactStrictMode: false,     // avoids double-render in prod
  poweredByHeader: false,     // removes X-Powered-By
  compress: true,
  productionBrowserSourceMaps: false,
  typescript: { ignoreBuildErrors: false },
  serverExternalPackages: ["bcryptjs", "nodemailer", "ioredis", "pdf-parse", "mammoth"],
  images: { formats: ["image/avif", "image/webp"] },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "@radix-ui/*"],
  },
}
```

### 9.3 `tsconfig.json`

- `target: ES2017`, `module: esnext`, `moduleResolution: bundler`
- `strict: true`, `noImplicitAny: false`
- Paths: `@/*` → `./src/*`
- Excludes: `node_modules`, `examples`, `skills`, `mini-services`

### 9.4 `.env.example` (key variables)

```bash
DATABASE_URL=file:./db/custom.db          # SQLite dev
# DATABASE_URL=postgresql://...           # PostgreSQL prod
NEXTAUTH_SECRET=<32+ char random string>
GROQ_API_KEY=                              # Free LLM (console.groq.com/keys)
CEREBRAS_API_KEY=
OPENROUTER_API_KEY=
MISTRAL_API_KEY=
HUGGINGFACE_API_KEY=
SERPER_API_KEY=                            # Google search
STRIPE_SECRET_KEY=
NOWPAYMENTS_API_KEY=
NOWPAYMENTS_WEBHOOK_SECRET=
QDRANT_URL=                                # Optional vector DB
REDIS_URL=redis://localhost:6379           # Prod only
```

### 9.5 Dockerfile (multi-stage)

```dockerfile
# Stage 1: deps — bun install
# Stage 2: builder — prisma generate + next build
# Stage 3: runner — node server.js (non-root user, dumb-init, healthcheck)
```

### 9.6 docker-compose.prod.yml

Services:
- `postgres`: PostgreSQL 15-alpine, healthcheck, volume
- `redis`: Redis 7-alpine, appendonly, maxmemory 256mb LRU
- `app`: builds from Dockerfile, depends_on postgres+redis, env vars from .env.production, port 3000

### 9.7 Caddyfile

Auto-HTTPS with Let's Encrypt. Reverse proxy to localhost:3000. Security headers. Static asset caching (1 year for _next/static).

---

## 10. SEED SCRIPTS

| Script | Purpose |
|--------|---------|
| `scripts/seed-distributor.ts` | 5 LicensePackages (PLT-100 to PLT-10000), 15 PaymentGatewayConfig, 10 InternalDepartment |
| `scripts/seed-support.ts` | 3 SupportPlans (Basic $99, Premium $499, Enterprise $1999), PayrollConfig (50/40/10 split), 5 sample VirtualAssistants |
| `scripts/seed-events.ts` | 64 GlobalEvent entries (holidays, cultural, sports, tech, business, seasonal) |
| `scripts/seed-gateways-extra.ts` | 25 additional payment gateways (Square, Adyen, Klarna, Amazon Pay, WeChat Pay, Alipay, etc.) |
| `scripts/seed-blog.ts` | Sample blog posts |
| `scripts/seed-reseller.ts` | Reseller opportunities |

**Super admin creation** (inline script):
```typescript
const tenant = await db.tenant.create({ data: { name: 'Platform Owner', domain: 'platform.local', plan: 'enterprise' } })
const user = await db.user.create({ data: { email: 'admin@cppflow.io', name: 'Platform Admin', hashedPassword: await bcrypt.hash('admin123', 10), role: 'owner', tenantId: tenant.id } })
await db.superAdmin.create({ data: { userId: user.id, level: 1, isActive: true } })
```

---

## 11. DEPLOYMENT SCRIPTS

### `scripts/dev-setup.sh` (local dev)
1. Checks Node.js + Bun
2. Creates `.env` from `.env.example`
3. `bun install`
4. `prisma generate` + `prisma db push`
5. Runs all seed scripts
6. Creates super admin user
7. Starts `bun dev`

### `scripts/deploy.sh` (Docker Compose production)
1. Verifies `.env.production`
2. Auto-generates `NEXTAUTH_SECRET` if missing
3. `docker compose build`
4. `docker compose up -d`
5. Waits for PostgreSQL healthcheck
6. Runs `prisma migrate deploy`
7. Runs seed scripts
8. Verifies `/api/health` returns 200

### `scripts/deploy-vps.sh` (remote VPS)
1. SSH to remote, installs Docker
2. rsync project files
3. Generates `.env.production` with random secrets
4. Builds Docker image on remote
5. Starts services
6. Installs Caddy, configures auto-HTTPS
7. Runs migrations + seeds
8. Verifies health

---

## 12. KEY IMPLEMENTATION PATTERNS

### 12.1 API Route Pattern
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    const items = await db.someModel.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ items })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const item = await db.someModel.create({ data: { ...body, tenantId: user.tenantId } })
    return NextResponse.json({ item }, { status: 201 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })
```

### 12.2 Dynamic Route Pattern (Next.js 16)
```typescript
// app/api/resource/[id]/route.ts
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // MUST await params in Next.js 16
  // ...
}
```

### 12.3 React Query Pattern
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['feature-data', id],
  queryFn: async () => {
    const res = await fetch(`/api/feature/${id}`)
    if (!res.ok) return null
    return res.json()
  },
  refetchInterval: 5000,  // for live updates
})

const mutation = useMutation({
  mutationFn: async (data) => {
    const res = await fetch('/api/feature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed')
    return res.json()
  },
  onSuccess: () => {
    toast.success('Created!')
    qc.invalidateQueries({ queryKey: ['feature-data'] })
  },
  onError: () => toast.error('Failed'),
})
```

### 12.4 LLM Call Pattern
```typescript
const response = await llmAggregator.complete({
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userInput },
  ],
  sessionType: 'feature_name',
  tenantId: user.tenantId,
  temperature: 0.7,
  maxTokens: 2048,
})

// Parse JSON response (with fallback for markdown code blocks)
let text = response.text.trim()
const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
if (jsonMatch) text = jsonMatch[1].trim()
const start = text.indexOf('{')
const end = text.lastIndexOf('}')
if (start >= 0 && end > start) text = text.slice(start, end + 1)
const parsed = JSON.parse(text)
```

---

## 13. CRITICAL IMPLEMENTATION NOTES

### 13.1 What NOT to use
- **Do NOT use NextAuth.js** — it crashes Turbopack. Use custom HMAC-SHA256 session.
- **Do NOT use middleware.ts** — Next.js 16 uses `proxy.ts` instead.
- **Do NOT use `params` directly** — in Next.js 16, `params` is a Promise and must be `await`ed.
- **Do NOT use `plt.tight_layout()` with `constrained_layout=True`** — they conflict (matplotlib rule, not applicable here but good to know).
- **Do NOT store private crypto keys** — only platform wallet addresses (public).

### 13.2 What MUST be done
- **Every API route** must use `withProtection()` wrapper for rate limiting + security headers.
- **Every API route** must check `getCurrentUser()` and return 401 if not authenticated.
- **Every API route** must scope queries by `tenantId` (multi-tenant isolation).
- **SuperAdmin checks** use `db.superAdmin.findUnique({ where: { userId } })` — not just `user.role`.
- **Prisma schema changes** require `npx prisma format && npx prisma db push --accept-data-loss` (dev) or `prisma migrate deploy` (prod).
- **After schema changes**, must run `npx prisma generate` AND delete `.next/` cache (Turbopack caches old client).
- **RTL languages** (ar, fa, he) need `<html dir="rtl">` — handled by i18n provider.
- **Session cookie** must be `httpOnly: true, sameSite: 'lax', secure: (production only)`.

### 13.3 Performance Optimizations
- LLM responses are NOT streamed (simpler, and most responses are JSON).
- Framer Motion is lazy-loaded (`lazy(() => import('framer-motion')`)).
- TanStack Query with `refetchInterval: 5000` for live data (polling, not WebSocket).
- Prisma queries use `select` to limit fields and `take` to limit results.
- `serverExternalPackages` for heavy native modules (bcryptjs, nodemailer, pdf-parse, mammoth).
- `output: 'standalone'` for Docker (self-contained `.next/standalone/`).

### 13.4 Error Handling
- All API routes return `{ error: 'error_code', message: 'Human readable' }` on failure.
- LLM JSON parsing has try/catch with fallback.
- Crypto payment gateway has automatic fallback to manual mode.
- Vector search has fallback to in-DB cosine similarity if Qdrant not configured.
- Rate-limited LLM providers auto-switch to next provider (transparent to user).

---

## 14. REBUILD CHECKLIST

To rebuild this project from scratch, an AI agent should:

### Phase 1: Scaffolding (Day 1)
- [ ] `bun create next-app` with TypeScript, Tailwind, App Router
- [ ] Install all dependencies (see `package.json`)
- [ ] Set up `tsconfig.json` with `@/*` path alias
- [ ] Configure `next.config.ts` (standalone output, serverExternalPackages)
- [ ] Set up Tailwind CSS 4 with shadcn/ui
- [ ] Install 40+ shadcn/ui components

### Phase 2: Database (Day 1-2)
- [ ] Create `prisma/schema.prisma` with all 149 models
- [ ] Run `prisma format` + `prisma db push`
- [ ] Create seed scripts (6 scripts)
- [ ] Create super admin user

### Phase 3: Auth + Security (Day 2)
- [ ] Build `simple-session.ts` (HMAC-SHA256)
- [ ] Build `rbac.ts` (permission system)
- [ ] Build `proxy.ts` (global middleware)
- [ ] Build `with-protection.ts` (API wrapper)
- [ ] Build `rate-limit.ts`, `headers.ts`, `audit.ts`

### Phase 4: Core Libraries (Day 2-3)
- [ ] Build LLM Aggregator (5 providers + aggregator)
- [ ] Build Negotiation Engine (6 state handlers)
- [ ] Build Graph Agent (17 node types + executor)
- [ ] Build Payment system (crypto + gateway router)
- [ ] Build Notification emitter
- [ ] Build Financial Reports engine
- [ ] Build Project Intake engine
- [ ] Build Campaign Scheduler
- [ ] Build Events Calendar
- [ ] Build Vector Search (Qdrant)
- [ ] Build System Prompts library (15 prompts)

### Phase 5: API Routes (Day 3-4)
- [ ] Build all 238 API routes following the standard pattern
- [ ] Group by domain: auth, admin, leads, campaigns, crm, seo, social, etc.
- [ ] Each route: GET (list), POST (create), PATCH (update), DELETE (soft-delete)
- [ ] Dynamic routes use `[id]` with `await params`

### Phase 6: Frontend (Day 4-5)
- [ ] Build 62 dashboard view components
- [ ] Build sidebar with 5 sections + 60+ items
- [ ] Build `page.tsx` view router
- [ ] Build GuidedTour + GuideTooltip system
- [ ] Apply brand colors (CPPflow logo palette)
- [ ] Add 12 CSS 3D animations
- [ ] Add dark mode support

### Phase 7: i18n (Day 5)
- [ ] Create 29 language JSON files in `src/messages/`
- [ ] Build i18n config, provider, server
- [ ] Add LanguageSwitcher component
- [ ] Add RTL support for ar, fa, he

### Phase 8: Deployment (Day 6)
- [ ] Create Dockerfile (multi-stage)
- [ ] Create docker-compose.prod.yml
- [ ] Create Caddyfile
- [ ] Create `.env.example`
- [ ] Create deployment scripts (3: dev, prod, VPS)
- [ ] Create README-DEPLOY.md

### Phase 9: Testing & Validation
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npx eslint` — 0 errors
- [ ] `npx next build` — successful compilation
- [ ] Test all API endpoints return 200
- [ ] Test login flow
- [ ] Test LLM aggregator (with at least 1 API key)
- [ ] Test payment gateway listing (40 gateways)
- [ ] Test negotiation engine (6 rounds)
- [ ] Test graph agent (4 templates)

---

## 15. FINAL OUTPUT SPECIFICATIONS

**Expected final state**:
- 238 API routes, all returning proper JSON with auth + rate limiting
- 62 dashboard views, all with 3D animations + brand colors + dark mode
- 149 Prisma models with proper indexes and relations
- 29 language translations
- 40 payment gateways configured
- 64 global events seeded
- 15 professional AI system prompts
- 6 seed scripts
- 3 deployment scripts (dev, prod, VPS)
- TypeScript: 0 errors
- ESLint: 0 errors
- Next.js build: successful

**Total estimated codebase**: ~50,000 lines of TypeScript/TSX

---

## END OF SPECIFICATION

This document is self-contained. An AI agent with access to Next.js 16, Prisma, and the specified dependencies can rebuild the entire platform by following this specification step by step.

**Key differentiators from a generic SaaS**:
1. Custom HMAC-SHA256 auth (not NextAuth)
2. Multi-LLM aggregator with 5 free providers + auto-fallback
3. 6-round AI negotiation engine (State pattern)
4. Graph Agent with 17 node types (DAG execution)
5. 40 payment gateways (including 25 regional: WeChat Pay, Alipay, bKash, etc.)
6. Qdrant vector search with DB fallback
7. 29 languages including 3 RTL
8. 3D animated UI with Framer Motion
9. Guided tour system with 11 section guides
10. Wholesale distributor system with territory exclusivity
