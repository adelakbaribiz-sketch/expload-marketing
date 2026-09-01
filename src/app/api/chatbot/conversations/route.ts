import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'chatbotConversation',
  fields: ['sessionId', 'channel', 'visitorName', 'visitorEmail', 'status', 'leadId'],
  include: { messages: true },
})
