# ADR-0001: Stay a modular monolith — do not split into microservices

**Status**: Accepted
**Date**: 2026-09-04

## Current

A single Next.js 16 App Router application, one deployable container, one Prisma-backed database. All 76 API domains, all 62 UI views, and all business logic live in one codebase and one running process. Deployment is Docker Compose (app + Postgres + Redis) behind Caddy — one instance today, per `docker-compose.prod.yml`.

## Problem (the question this ADR answers)

Given the project's own explicit instruction to prefer a modular monolith over microservices unless a real need exists, and given how large this codebase has grown (150 models, 76 API domains, 41 lib modules) — is a real need for service separation present?

**Evidence checked, and found absent**:
- No independent scaling requirement — nothing in the codebase, deployment config, or traffic pattern (a single-container deployment) suggests any one domain needs to scale independently of the others.
- No independent deployment cadence requirement — there's one team-sized development pattern visible in `worklog.md` (sequential feature batches by one agent/session at a time), not multiple teams needing to ship different modules independently.
- No technology-diversity requirement — every module is TypeScript/Prisma/Next.js; nothing needs a different runtime.
- No genuine bounded-context isolation failure — Phase 3's dependency-graph audit found the `src/lib/` module graph is **already a clean DAG with zero circular dependencies**, and cross-domain coupling is low (the CRUD-factory domains are fully independent of each other; the handful of cross-lib dependencies, like `negotiation/engine.ts` → `llm/aggregator.ts`, are legitimate shared-service usage, not tangled domain coupling). The modular boundaries a microservice split would try to create largely **already exist inside the monolith** — extracting them into separate deployables would add operational cost (network calls, distributed transactions, service discovery, separate CI/CD, separate observability) without removing any coupling that currently exists, since there isn't much to remove.
- The one place genuine "service-like" coupling was found — `graph/orchestrator.ts` calling ~15 of its own API routes over internal HTTP — is a **symptom to fix within the monolith** (see ADR-0005 and `DEPENDENCY-RULES.md` Rule 5: prefer direct module composition), not evidence that those domains want to be separate services. Extracting it as-is would just move an already-recognized anti-pattern across a network boundary and make it slower and harder to debug.

## Target

**Remain a modular monolith**, and treat the existing `src/lib/` module structure as the real unit of modularity — not the deployable unit. Concretely:
- Keep one Next.js app, one database, one deployment.
- Continue enforcing the layer boundaries in `MODULE-BOUNDARIES.md` and the rules in `DEPENDENCY-RULES.md` — a modular monolith only stays healthy if its internal boundaries are respected; the discipline that would be forced by network boundaries in a microservice architecture has to come from code review and the rules documented in this audit instead.
- Fix the specific coupling problems found (dual AI stacks, dual autonomous-agent implementations, internal HTTP self-calls, tenant-context resolution) **inside** the monolith, per their own ADRs.

## Migration strategy

No migration needed — this ADR confirms the status quo topology is correct, not a change. Revisit this decision only if a concrete, evidenced need appears later: e.g. one domain (most plausibly the AI/LLM layer, given its external-API-bound latency profile, or the background job queue, given it already has its own Redis dependency) needs to scale or fail independently of the rest of the app under real production load that this audit has no evidence of yet. If that day comes, extract *one* service at a time, starting from the domain with the clearest existing boundary (per this audit, the job queue and the LLM aggregator are the two modules with the cleanest single-entry-point encapsulation already) — never a "big bang" rewrite into many services at once.
