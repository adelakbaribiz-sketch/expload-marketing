import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'agentCycle',
  fields: ['cycleType', 'status', 'startedAt', 'completedAt', 'phase1Result', 'phase2Result', 'phase3Result', 'phase4Result', 'phase5Result', 'phase6Result', 'phase7Result', 'phase8Result', 'phase9Result', 'summary', 'tasksCreated', 'recommendationsGenerated', 'error'],
})
