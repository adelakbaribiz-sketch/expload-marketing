/**
 * Shared parser for LLM responses that are supposed to be strict JSON but
 * frequently arrive wrapped in markdown code fences or with leading/trailing
 * prose. Used by every module that asks the LLM aggregator for structured
 * output (negotiation, graph planning, campaign scheduling, financial
 * insights) so the fence-stripping logic isn't reimplemented at each call site.
 */
export function parseJsonResponse<T = any>(text: string): T {
  let t = text.trim()
  const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) t = fenceMatch[1].trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) t = t.slice(start, end + 1)
  return JSON.parse(t) as T
}
