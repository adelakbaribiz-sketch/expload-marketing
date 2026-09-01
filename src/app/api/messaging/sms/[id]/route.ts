import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'smsMessage',
  fields: ['to', 'body', 'provider', 'status', 'cost', 'sentAt', 'deliveredAt', 'errorMessage', 'campaignId', 'leadId'],
})
