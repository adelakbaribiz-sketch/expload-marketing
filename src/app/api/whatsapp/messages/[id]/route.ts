import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'whatsAppMessage',
  fields: ['to', 'from', 'body', 'mediaUrl', 'status', 'direction', 'templateName', 'campaignId', 'leadId', 'sentAt', 'deliveredAt', 'readAt'],
})
