import { createDomainHandlers } from '@/lib/crud/domain-handler'

export const { GET, POST } = createDomainHandlers({
  model: 'task',
  fields: ['title', 'description', 'status', 'priority', 'dueDate', 'assigneeId', 'leadId', 'dealId'],
})
