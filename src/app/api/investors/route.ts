import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'investorProfile',
  fields: ['name', 'email', 'linkedin', 'avatar', 'bio', 'investorType', 'firmName', 'stages', 'sectors', 'checkSize', 'geography', 'ticketSize', 'portfolioCompanies', 'portfolioCount', 'totalInvested', 'successRate', 'matchScore', 'matchReasons', 'isVerified', 'isActive', 'contactStatus', 'lastContactAt'],
})
