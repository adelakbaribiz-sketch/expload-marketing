/**
 * Shared contract for the AI Decision Engine.
 *
 * This is not a second LLM call layered on top of every existing one — it's
 * a standard set of fields (reasoning, confidence, evidence, alternatives,
 * expected outcome, risks) that domain modules ask the LLM for *in their
 * existing prompt*, plus a place (`AiDecision`) to remember the answer so it
 * can be shown to the user and checked against what actually happened later.
 */

export interface DecisionAlternative {
  option: string
  whyNotChosen: string
}

/** What a caller passes in after it already has a parsed LLM JSON response. */
export interface RecordDecisionParams {
  tenantId: string
  domain: string // 'negotiation' | 'campaign_scheduling' | 'graph_planning' | ...
  goal: string
  /** The parsed LLM JSON — must contain (or default) the DecisionFields below. */
  parsed: Record<string, any>
  /** Facts/context given to the LLM, persisted for audit/replay. */
  context?: Record<string, any>
  llmProvider?: string
  llmModel?: string
  sessionId?: string
  linkedEntityType?: string
  linkedEntityId?: string
}

export interface DecisionResult {
  decisionId: string
  recommendation: string
  reasoning: string
  confidence: number
  evidence: string[]
  alternatives: DecisionAlternative[]
  expectedOutcome: string
  risks: string[]
}

export interface RecordOutcomeParams {
  decisionId: string
  actualOutcome: string
  wasAccurate?: boolean
}
