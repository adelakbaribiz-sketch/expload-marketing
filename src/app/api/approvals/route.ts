import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'approvalRequest',
  fields: ['type', 'itemId', 'itemData', 'requestedBy', 'reviewedBy', 'reviewedAt', 'status', 'comment'],
})
