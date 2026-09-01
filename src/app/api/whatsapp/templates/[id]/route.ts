import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'whatsAppTemplate',
  fields: ['name', 'language', 'category', 'body', 'header', 'footer', 'buttons', 'status', 'templateId'],
})
