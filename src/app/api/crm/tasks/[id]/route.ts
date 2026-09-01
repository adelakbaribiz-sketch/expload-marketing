import { createDomainItemHandlers } from '@/lib/crud/domain-handler'

export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'task',
  fields: ['title', 'description', 'status', 'priority', 'dueDate', 'assigneeId', 'leadId', 'dealId'],
})
