import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'chatbotWidget',
  fields: ['name', 'widgetKey', 'domain', 'primaryColor', 'position', 'welcomeMessage', 'placeholder', 'systemPrompt', 'model', 'temperature', 'captureName', 'captureEmail', 'capturePhone', 'isActive'],
})
