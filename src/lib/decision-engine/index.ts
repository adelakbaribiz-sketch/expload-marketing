import 'server-only'
import { db } from '@/lib/db'
import type {
  DecisionAlternative,
  DecisionResult,
  RecordDecisionParams,
  RecordOutcomeParams,
} from './types'

/**
 * JSON-schema fragment domain prompts append to their existing "Output
 * Format" section so the LLM returns the standard decision fields alongside
 * whatever domain-specific fields that prompt already asks for (price,
 * dates, nodes, ...). Keeping this as one shared block means every decision
 * across the platform explains itself the same way.
 */
export function decisionFieldsBlock(): string {
  return `In addition to the fields above, also include these top-level fields so this decision can be explained to the user:
"reasoning": "2-4 sentences explaining WHY this is the right call, in plain language",
"confidence": 0-100,
"evidence": ["specific fact or data point that supports this", "..."],
"alternatives": [{"option": "an approach you considered", "whyNotChosen": "why you didn't recommend it"}],
"expectedOutcome": "what you expect to happen if this is followed",
"risks": ["risk 1", "risk 2"]`
}

function asStringArray(v: any): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x) => typeof x === 'string')
}

function asAlternatives(v: any): DecisionAlternative[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x) => x && typeof x === 'object')
    .map((x) => ({
      option: typeof x.option === 'string' ? x.option : String(x.option ?? ''),
      whyNotChosen: typeof x.whyNotChosen === 'string' ? x.whyNotChosen : String(x.whyNotChosen ?? ''),
    }))
    .filter((a) => a.option)
}

function clampConfidence(v: any): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 50
  return Math.max(0, Math.min(100, n))
}

/**
 * Persist one AI decision. Never throws on a missing/malformed optional
 * field — a decision with low-quality metadata is still worth remembering,
 * and callers shouldn't have their primary flow (e.g. proposal creation)
 * fail because the LLM forgot to include "risks".
 */
export async function recordDecision(params: RecordDecisionParams): Promise<DecisionResult> {
  const { parsed } = params

  const recommendation =
    typeof parsed.recommendation === 'string' && parsed.recommendation
      ? parsed.recommendation
      : typeof parsed.title === 'string'
        ? parsed.title
        : params.goal

  const reasoning =
    typeof parsed.reasoning === 'string' && parsed.reasoning
      ? parsed.reasoning
      : typeof parsed.rationale === 'string' && parsed.rationale
        ? parsed.rationale
        : 'No reasoning provided by the model.'

  const confidence = clampConfidence(parsed.confidence)
  const evidence = asStringArray(parsed.evidence)
  const alternatives = asAlternatives(parsed.alternatives)
  const expectedOutcome = typeof parsed.expectedOutcome === 'string' ? parsed.expectedOutcome : ''
  const risks = asStringArray(parsed.risks)

  const row = await db.aiDecision.create({
    data: {
      tenantId: params.tenantId,
      domain: params.domain,
      goal: params.goal,
      recommendation,
      reasoning,
      confidence,
      evidence: JSON.stringify(evidence),
      alternatives: JSON.stringify(alternatives),
      expectedOutcome,
      risks: JSON.stringify(risks),
      rawContext: params.context ? JSON.stringify(params.context) : null,
      rawOutput: JSON.stringify(parsed),
      llmProvider: params.llmProvider,
      llmModel: params.llmModel,
      sessionId: params.sessionId,
      linkedEntityType: params.linkedEntityType,
      linkedEntityId: params.linkedEntityId,
    },
  })

  return {
    decisionId: row.id,
    recommendation,
    reasoning,
    confidence,
    evidence,
    alternatives,
    expectedOutcome,
    risks,
  }
}

/**
 * Close the self-improvement loop: record what actually happened for a
 * decision so future review can see whether the AI's confidence tracked
 * reality (e.g. "accepted a proposal it was 85% confident in").
 */
export async function recordDecisionOutcome(params: RecordOutcomeParams): Promise<void> {
  await db.aiDecision.update({
    where: { id: params.decisionId },
    data: {
      outcomeRecorded: true,
      actualOutcome: params.actualOutcome,
      wasAccurate: params.wasAccurate ?? null,
      outcomeAt: new Date(),
    },
  })
}
