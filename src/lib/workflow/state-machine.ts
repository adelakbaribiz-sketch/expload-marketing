import { ApiError } from '@/lib/api/errors'

/**
 * Minimal, dependency-free state machine for business workflows whose
 * status field was previously writable to any string a client sent (see
 * WORKFLOW-AUDIT.md). No library like xstate is installed — this is
 * deliberately small: an adjacency map of "from these states you may reach
 * these states", not a full statechart engine, because none of this
 * project's workflows need parallel/nested states or side-effect actions
 * baked into the machine itself (those stay in the route/service code that
 * calls `.assertTransition()`).
 */
export interface StateMachineDefinition<S extends string> {
  /** All valid states, for reference/UI (e.g. populating a status dropdown). */
  states: readonly S[]
  /** Map of state -> the states directly reachable from it. An empty array means terminal (no further transitions allowed). */
  transitions: Record<S, readonly S[]>
}

export class StateMachine<S extends string> {
  constructor(private def: StateMachineDefinition<S>) {}

  get states(): readonly S[] {
    return this.def.states
  }

  isTerminal(state: S): boolean {
    return (this.def.transitions[state] ?? []).length === 0
  }

  canTransition(from: S, to: S): boolean {
    if (from === to) return true // no-op update (e.g. re-saving other fields) is always allowed
    return (this.def.transitions[from] ?? []).includes(to)
  }

  /** Throws ApiError(409) if the transition isn't allowed — the route/hook should let this propagate to withProtection. */
  assertTransition(from: S, to: S): void {
    if (!this.canTransition(from, to)) {
      throw new ApiError(409, `Cannot transition from "${from}" to "${to}"`)
    }
  }
}
