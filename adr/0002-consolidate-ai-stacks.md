# ADR-0002: Consolidate the two AI integration stacks into one

**Status**: Proposed
**Date**: 2026-09-04

## Current

Two parallel, non-communicating AI backends exist. `src/lib/llm/aggregator.ts` is a real, portable, multi-provider system (Groq/Cerebras/OpenRouter/Mistral/HuggingFace) with automatic fallback, quota tracking, and cooldown — used by negotiation, campaign scheduling, finance reports, graph orchestration, and project intake. Separately, `z-ai-web-dev-sdk` is imported directly in exactly 5 places (`src/lib/ai/lead-extractor.ts`, `api/ai/generate`, `api/diagnostics/run`, `api/reports/monthly/generate`, `api/leads/search`) with no environment variable configuring it anywhere and a code comment acknowledging it depends on "this Next.js sandbox."

## Problem

A self-hosted deployment of this product (which is what the Docker/Caddy deployment docs describe) gets real AI for one set of features and silent rule-based fallback for another, with no indication to the operator that this split exists. This directly undermines the "self-hostable" non-functional requirement identified in `PRD.md` §5. It's also an architecture smell independent of the functional gap: two integration points for the same category of external dependency, each with its own fallback logic, is duplicated complexity that will only get worse as more AI features are added (per `DEPENDENCY-RULES.md` Rule 4, this is already flagged as "don't extend").

## Target

One AI integration boundary: `src/lib/llm/aggregator.ts`. The 5 `z-ai-web-dev-sdk` call sites should call the aggregator instead, using its existing fallback semantics.

## Migration strategy

1. **Do not attempt a big-bang swap.** Each of the 5 call sites has different prompt/response shape expectations (lead extraction returns structured JSON, diagnostics does DB-derived scoring plus a narrative, monthly reports generate long-form text, leads/search does query interpretation). Migrate one call site at a time, starting with the lowest-risk one (`ai/lead-extractor.ts` already has a rule-based fallback path if the AI call fails, per Phase 1 findings — good place to start since a regression is low-stakes).
2. For each call site: replace the direct `ZAI.create()` call with `llmAggregator.complete(...)`, using the existing prompt-catalog entry if one exists (`src/lib/prompts/system-prompts.ts` — this is also the natural place to fix `DEPENDENCY-RULES.md` Rule 7's finding that most AI call sites bypass this catalog with inline duplicate prompts; migrate the prompt into the catalog at the same time you migrate the call site, don't do it as two separate passes).
3. Keep the existing try/catch + rule-based-fallback pattern each call site already has — don't remove graceful degradation, just change what it's degrading *from*.
4. After all 5 are migrated and verified (manual testing per call site, since no test suite exists — see `TECH-STACK.md`), remove the `z-ai-web-dev-sdk` dependency from `package.json` entirely.
5. Do not do this migration under time pressure alongside unrelated feature work — each call site should get its own verification pass given there's no automated regression safety net.
