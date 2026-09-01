import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'whatsAppMessage',
  fields: ['to', 'from', 'body', 'mediaUrl', 'status', 'direction', 'templateName', 'campaignId', 'leadId', 'sentAt', 'deliveredAt', 'readAt'],
})
