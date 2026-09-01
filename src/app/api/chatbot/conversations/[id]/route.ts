import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'chatbotConversation',
  fields: ['sessionId', 'channel', 'visitorName', 'visitorEmail', 'status', 'leadId'],
  include: { messages: true },
})
