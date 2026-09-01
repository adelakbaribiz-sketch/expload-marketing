import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'cofounderProfile',
  fields: ['name', 'email', 'linkedin', 'avatar', 'bio', 'currentRole', 'currentCompany', 'experience', 'skills', 'industries', 'lookingFor', 'commitment', 'equityExpected', 'availableFrom', 'relocationOk', 'remoteOk', 'matchScore', 'matchReasons', 'isVerified', 'isActive', 'contactStatus', 'lastContactAt'],
})
