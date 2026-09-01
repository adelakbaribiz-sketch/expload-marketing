import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'approvalRequest',
  fields: ['type', 'itemId', 'itemData', 'requestedBy', 'reviewedBy', 'reviewedAt', 'status', 'comment'],
})
