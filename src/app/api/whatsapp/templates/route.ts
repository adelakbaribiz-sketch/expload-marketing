import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'whatsAppTemplate',
  fields: ['name', 'language', 'category', 'body', 'header', 'footer', 'buttons', 'status', 'templateId'],
})
