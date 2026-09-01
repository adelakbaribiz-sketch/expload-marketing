import { createDomainItemHandlers } from '@/lib/crud/domain-handler'

export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'deal',
  fields: ['title', 'value', 'currency', 'stage', 'probability', 'expectedCloseDate', 'leadId', 'contactId', 'companyId', 'projectId', 'ownerId'],
  include: { lead: true, contact: true, company: true },
})
