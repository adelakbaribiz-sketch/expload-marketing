# ADR-0005: Consolidate the two competing "autonomous agent" implementations

**Status**: Proposed
**Date**: 2026-09-04

## Current

`src/lib/graph/orchestrator.ts` is documented in its own comment as "the brain that connects all platform modules into one autonomous system" — an LLM-driven, graph/DAG-based planner that reaches ~15 other API domains, currently via internal `fetch()` self-calls rather than direct module composition (`DEPENDENCY-RULES.md` Rule 5). Separately, `src/app/api/agent/run/route.ts` is a fully independent 250-line implementation: 9 hardcoded phases of stat-gathering across leads/campaigns/content/SEO/ads/social/backlinks/analyzers/AI-recommendations, followed by rule-based (non-LLM) task creation. Neither references the other.

## Problem

Two products' worth of "autonomous agent" exist in the same codebase with no shared code, no shared concept of what "autonomous" means (LLM-planned graph execution vs. hardcoded rule phases), and — most concretely — a customer or operator has no way to know which one they're getting when they trigger "the autonomous agent" from the UI, since both are presumably reachable from different entry points (Agent Hub's "Launch Agent" per `worklog.md`, and whatever calls `agent/run`). This is real product confusion risk, not just code duplication: two different behaviors could plausibly be triggered under the same name, and future maintenance will keep touching whichever one wasn't updated, silently diverging further.

## Target

One autonomous-agent implementation. Given `graph/orchestrator.ts` is the more sophisticated, LLM-driven, and extensible design (a DAG planner can express the same "gather stats, generate tasks" behavior `agent/run` hardcodes, plus more), it should be the surviving implementation. `agent/run`'s rule-based logic becomes either a fallback path *inside* the orchestrator (for when the LLM aggregator is unavailable — consistent with the graceful-degradation pattern already used everywhere else per `PRD.md` §5) or is retired if the orchestrator already has its own fallback.

## Migration strategy

1. **First, determine actual usage** — check which UI entry points call `agent/run` vs. `graph/execute`/`graph/plan`, and whether they're presented to users as the same feature or genuinely different ones (it's possible `agent/run` is an older, superseded feature that simply was never removed after `graph/orchestrator.ts` was built later — check `worklog.md`'s task ordering: Graph Agent Orchestrator is listed under early tasks alongside the distributor system, `agent/run`'s exact provenance wasn't independently dated this pass). Do not merge blind.
2. If `agent/run` is confirmed superseded and unused by any live UI path: retire it directly (delete the route, remove any dead nav entry) — this is the simplest, lowest-risk outcome if true.
3. If both are genuinely reachable and used for different purposes today: rename them in the UI to reflect what they actually are (e.g. "Quick Stats Sweep" for the rule-based one, "Autonomous Agent" for the LLM/graph one) as an interim honesty fix, then plan the real consolidation as a separate, deliberate feature-design task — not something to collapse silently in a refactor, since it would change user-visible behavior.
4. Either way, once resolved, remove one of the two implementations entirely rather than leaving a "deprecated but still there" module — per `DEPENDENCY-RULES.md` Rule 8, half-removed duplicate code is worse than either fully-present or fully-gone.
