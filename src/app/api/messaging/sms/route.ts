import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'smsMessage',
  fields: ['to', 'body', 'provider', 'status', 'cost', 'sentAt', 'deliveredAt', 'errorMessage', 'campaignId', 'leadId'],
})
