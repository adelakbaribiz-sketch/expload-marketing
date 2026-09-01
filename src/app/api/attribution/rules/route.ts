import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'fraudRule',
  fields: ['name', 'type', 'description', 'config', 'severity', 'action', 'isActive', 'totalDetected', 'totalBlocked'],
})
