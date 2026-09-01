import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'chatbotWidget',
  fields: ['name', 'widgetKey', 'domain', 'primaryColor', 'position', 'welcomeMessage', 'placeholder', 'systemPrompt', 'model', 'temperature', 'captureName', 'captureEmail', 'capturePhone', 'totalConversations', 'totalMessages', 'leadsCaptured', 'isActive'],
})
