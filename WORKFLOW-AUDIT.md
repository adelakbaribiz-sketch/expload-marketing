# Business Workflow Audit — Phase 12 (Business Workflow Engineering)

**Scope**: every stateful business process in the app — anything with a `status`/`stage` field that represents a real-world workflow, not just a data label. Companion to `BACKEND-ARCHITECTURE.md` (Phase 08, which first flagged the CRUD factory's lack of validation) and `AI-STACK-AUDIT.md` (Phase 11, the negotiation engine's own state machine).

**Core finding**: most workflow `status` fields were writable to *any string the client sent*, with no check against the current state — the backend recorded whatever the UI (or a direct API call) claimed, rather than being the source of truth for what transitions are legal. Two of these were live, not theoretical: **timesheet approval could be set by any tenant member, not an authorized approver, and payroll reads approved timesheets to compute real salary payments**; and **crypto-payment status could be regressed by an out-of-order webhook retry after money had already been recorded as received**. Both fixed this phase.

---

## 1. Workflow inventory

| Workflow | Model | States (as found) | Backend-enforced transitions? | This phase |
|---|---|---|---|---|
| Negotiation | `NegotiationSession`/`NegotiationProposal` | initial→mvp→economic→phased→revenue_share→equity→accepted\|rejected_all→closed | **Yes** — `src/lib/negotiation/engine.ts`'s `STATE_HANDLERS` (State pattern) | Reference example, unchanged |
| Job queue | in-process `Job` | queued→processing→completed\|failed | **Yes** — `src/lib/queue/index.ts` | Unchanged (audited in `BACKEND-ARCHITECTURE.md` §11) |
| Lead | `Lead.status` | new, contacted, qualified, won, lost | No → **Fixed** | `LEAD_STATUS_MACHINE` |
| Deal (CRM) | `Deal.stage` | lead, qualified, proposal, negotiation, won, lost | No → **Fixed** | `DEAL_STAGE_MACHINE` |
| Crypto payment | `CryptoPayment.status` | pending, confirming, confirmed, completed, failed, expired, refunded | No (webhook could regress a terminal-ish state) → **Fixed** | `CRYPTO_PAYMENT_MACHINE` |
| Distributor payout | `DistributorPayout.status` | pending, approved, paid, disputed, void | No → **Fixed** | `DISTRIBUTOR_PAYOUT_MACHINE` |
| VA timesheet approval | `AssistantTimesheet.status` | pending, approved, rejected | No, **and wrong actor could approve** → **Fixed** | `TIMESHEET_STATUS_MACHINE` + `isPlatformStaffAdmin()` gate |
| Onboarding session | `OnboardingSession.status` | in_progress, completed, abandoned, escalated_to_negotiation | No | Catalogued, deferred (§4) |
| Team invitation | `TeamInvitation.status` | pending, accepted, expired | Partially — token+expiry checked in accept flow (Phase 05) | Catalogued (§4) |
| Club advertisement | `ClubAdvertisement.status` | pending, approved, active, rejected, expired | No | Catalogued, deferred (§4) |
| Reseller application | `ResellerApplication.status` | pending, approved, rejected, active, suspended | No | Catalogued, deferred (§4) |
| Platform promotion | `PlatformPromotion.status` | draft, scheduled, active, completed, paused | No | Catalogued, deferred (§4) |
| Project | `Project.status` | active, paused, archived | No | Catalogued, deferred (§4) — low stakes |
| Project member | `ProjectMember.status` | active, invited, suspended | No | Catalogued, deferred (§4) |
| Reseller customer | `ResellerCustomer.status` | active, suspended, churned, trial | No | Catalogued, deferred (§4) |
| Calendar event | `CalendarEvent.status` | scheduled, ... | No | Catalogued, deferred (§4) — low stakes |
| Distributor contract | `DistributorContract.status` | (contract lifecycle) | No | Catalogued, deferred (§4) |
| AiDecision outcome | `AiDecision` | pending → recorded (accurate/inaccurate) | Yes, for negotiation only | See `AI-STACK-AUDIT.md` |
| Graph-agent execution | in-memory `ExecutionState` | executing→completed\|failed, per-node completed\|failed\|skipped | Yes, plus this phase's high-risk-node confirmation gate | See `AI-STACK-AUDIT.md` §8 |

---

## 2. Deep dive — workflows fixed this phase

### Lead status

| Dimension | Detail |
|---|---|
| States | `new`, `contacted`, `qualified`, `won`, `lost` |
| Transitions | new→{contacted,qualified,lost}; contacted→{qualified,lost,new}; qualified→{won,lost,contacted}; won→{qualified,lost}; lost→{new,contacted,qualified} |
| Actors | Any tenant member except `role: 'viewer'` (`requireNonViewer()`, Phase 09) |
| Permissions | Tenant-scoped ownership check (`requireTenantId` + `findFirst` by id+tenantId) |
| Conditions | A lead cannot reach `won` without first passing through `qualified` — prevents a "closed with zero engagement" pipeline-integrity fake |
| Events | `Activity` row created on every update (`type: 'updated'`) |
| Notifications | None currently (a status change doesn't emit a notification — could be added if needed, not requested) |
| Timeouts | None — leads don't auto-expire |
| Retries | N/A (synchronous, single write) |
| Failures | Illegal transition → `409` with the specific from/to states; unknown status string → `400` |
| Recovery | Client re-fetches current state and retries with a legal target status |

### Deal (CRM) stage

| Dimension | Detail |
|---|---|
| States | `lead`, `qualified`, `proposal`, `negotiation`, `won`, `lost` |
| Transitions | Linear pipeline forward + `lost` from any stage; `won`→`lost` only (deal falls through post-close); `lost`→`lead` (full re-open) |
| Actors | Any tenant member (goes through the CRUD factory's standard tenant-ownership check) |
| Permissions | Tenant-scoped (`createDomainItemHandlers`'s `requireOwnedItem`) |
| Conditions | A deal cannot reach `won` by skipping stages — `wonRevenue`/pipeline dashboards (`crm-view.tsx`) sum by `stage === 'won'`, so an unearned jump there would silently corrupt revenue reporting |
| Events | None beyond the standard update |
| Notifications | None |
| Timeouts | None |
| Retries | N/A |
| Failures | Illegal transition → `409` (thrown as `ApiError` from the new `beforeWrite` hook, caught by `withProtection`) |
| Recovery | Same as Lead — re-fetch, retry with a legal stage |

### Crypto payment status

| Dimension | Detail |
|---|---|
| States | `pending`, `confirming`, `confirmed`, `completed`, `failed`, `expired`, `refunded` (matches `prisma/schema.prisma`'s own comment exactly) |
| Transitions | pending→{confirming,failed,expired}; confirming→{confirmed,completed,failed,expired}; confirmed→{completed,failed,expired}; completed→{refunded} only; failed/expired/refunded terminal |
| Actors | NOWPayments webhook only (`updateCryptoPaymentStatus`, no direct client-facing PATCH exists for this field) |
| Permissions | Webhook signature verified (`verifyNowPaymentsSignature`, HMAC-SHA512) before this function is ever called |
| Conditions | Once `completed`, no later webhook (however out of order) can regress the status — money already recorded as received is the one fact that must never un-happen from a webhook retry |
| Events | `Payment` row created on first transition into `completed` (existing `!payment.completedAt` guard, Phase 04) |
| Notifications | None currently at the payment-status layer (billing/subscription views poll for status instead) |
| Timeouts | NOWPayments' own on-chain confirmation timeout, external to this app |
| Retries | NOWPayments retries webhook delivery on any non-200/timeout — this is exactly the scenario the whole fix targets (an out-of-order retry) |
| Failures | An illegal/out-of-order transition is now silently ignored with a `console.warn` (the correct response to a webhook retry — return 200 either way so NOWPayments stops retrying, but never let it corrupt state) |
| Recovery | N/A — a payment that reaches `failed`/`expired` requires the customer to start a new payment; `completed`→`refunded` is the one supported reversal, via a separate refund flow |

### Distributor payout status

| Dimension | Detail |
|---|---|
| States | `pending`, `approved`, `paid`, `disputed`, `void` |
| Transitions | pending→{approved,disputed,void}; approved→{paid,disputed}; paid→{disputed} (chargeback can surface post-payment); disputed→{approved,void}; void terminal |
| Actors | Super admin only (`isSuperAdmin()`, unchanged — this route was already correctly gated) |
| Permissions | Platform-level, not tenant-scoped (payouts are platform→distributor, not tenant-owned data) |
| Conditions | Cannot mark `paid` without first being `approved` — prevents a slip of the finger paying out an unreviewed amount |
| Events | `approvedBy`/`approvedAt` set on approval; `paidAt`/`reference` set on payment (unchanged) |
| Notifications | None currently |
| Timeouts | None |
| Retries | N/A |
| Failures | Illegal transition → `409`; unknown status → `400` |
| Recovery | Superadmin corrects via `disputed` as the universal "something's wrong, review again" state |

### Virtual-assistant timesheet approval

| Dimension | Detail |
|---|---|
| States | `pending`, `approved`, `rejected` |
| Transitions | pending→{approved,rejected}; approved→pending; rejected→pending (a decision can only be reconsidered by routing back through pending, not flipped directly into the other) |
| Actors | **Fixed this phase**: only `isPlatformStaffAdmin()` may change status — previously any member of the tenant that owns the assignment could, which is not the same population as "an authorized approver" (the assignment's tenant can be the *client* side of a virtual-assistant engagement) |
| Permissions | Tenant/superadmin ownership check for read access; platform-staff-admin for the write |
| Conditions | **This is the one with a real, live financial-integrity stake**: `payroll/run/route.ts` sums hours from timesheets `where: { status: 'approved' }` to compute actual salary payments — an unauthorized or self-approval directly inflated real payroll disbursement before this fix |
| Events | `approvedBy`/`approvedAt` set on approval |
| Notifications | None currently |
| Timeouts | None — a `pending` timesheet doesn't auto-expire or auto-approve |
| Retries | N/A |
| Failures | Non-staff attempting to change status → `403`; illegal transition → `409` |
| Recovery | Staff can always route back through `pending` to reconsider |

---

## 3. Reference example — Negotiation (pre-existing, not changed)

Already a proper state machine (State design pattern, one handler class per state) before this phase: `initial → mvp → economic → phased → revenue_share → equity → accepted | rejected_all → closed`. Every state's handler defines its own `nextStateOnReject()`; the engine (`generateProposalForSession`/`respondToProposal`) never lets a caller set an arbitrary state directly — it only ever asks "what happens after accept/reject from here," which the handler answers. This is the template the fixes above and the shared `src/lib/workflow/state-machine.ts` generalize from a single-domain implementation into reusable infrastructure. Full Actors/Permissions/Notifications/Timeouts detail already covered in `BUSINESS-RULES.md` §3 and `AI-STACK-AUDIT.md` — not repeated here.

---

## 4. Catalogued, not fixed this phase (prioritized)

Each of these has the same class of gap (status field accepts any client-sent string with no transition check) but lower stakes than §2's targets — either the actor is already superadmin-only (so the blast radius is "an admin fat-fingers a status," not an unauthorized party), or the workflow doesn't feed a downstream financial calculation the way timesheets/payouts/payments do.

1. **Medium** — `ResellerApplication` (pending/approved/rejected/active/suspended) — a rejected application shouldn't be flippable straight to `active` without going through `approved`; worth a machine once reseller-program ownership is clarified (`docs/PROJECT-CONTROL.md`'s "Pending decisions").
2. **Medium** — `DistributorContract` — contract lifecycle, business-significant but not yet audited for its exact state set in this pass.
3. **Low-Medium** — `ClubAdvertisement` (pending/approved/active/rejected/expired) — a rejected ad shouldn't reach `active` without re-approval.
4. **Low-Medium** — `TeamInvitation` — already has real expiry+token enforcement in the accept flow (Phase 05); the remaining gap is narrower (does an `accepted` invitation's row ever get directly PATCHed back to `pending`?) and lower priority.
5. **Low** — `OnboardingSession`, `PlatformPromotion`, `ProjectMember`, `ResellerCustomer`, `Project`, `CalendarEvent` — internal/low-stakes data; a wrong status here doesn't move money or misrepresent a committed business outcome the way §2's targets do.

**Not a new state machine, but the same underlying gap**: all ~91 CRUD-factory-backed domains accept any value for any field in their `fields` allowlist, including status-like fields, unless a domain opts into the `beforeWrite` hook (as Deal now does). Rolling this out further is the same kind of incremental, per-domain adoption Phase 08 already established for `validate`/`filterableFields`/`sortableFields` — not a blind mechanical pass across all 91.

---

## 5. Shared infrastructure added this phase

- **`src/lib/workflow/state-machine.ts`** — a minimal, dependency-free `StateMachine<S>` class (adjacency-map of legal transitions, `canTransition`/`assertTransition`/`isTerminal`). No library like `xstate` is installed or needed — none of this project's workflows require parallel/nested states or actions baked into the machine itself.
- **`src/lib/workflow/definitions.ts`** — the 5 machines built this phase (`LEAD_STATUS_MACHINE`, `DEAL_STAGE_MACHINE`, `CRYPTO_PAYMENT_MACHINE`, `DISTRIBUTOR_PAYOUT_MACHINE`, `TIMESHEET_STATUS_MACHINE`), each documenting *why* its specific transitions are allowed/blocked, not just *what* they are.
- **`DomainConfig.beforeWrite`** (`src/lib/crud/domain-handler.ts`) now receives the pre-update row as a third argument on PATCH — the hook point a CRUD-factory-backed domain uses to enforce a state machine, demonstrated by `crm/deals/[id]/route.ts`.
- 22 new unit tests (`tests/state-machine.test.ts`) covering the generic machine and all 5 domain-specific ones.

## Verified

`bun run typecheck` / `bun run lint` / `next build` clean. `bun test`: 45/45 pass (23 pre-existing + 22 new). Live-verified against the dev server: a lead cannot jump `new`→`won` (`409`) but can via `new`→`qualified`→`won` (`200`/`200`); a deal cannot jump `lead`→`won` (`409`, surfaced through the CRUD factory's `beforeWrite` hook and `withProtection`'s error handling from Phase 08).
