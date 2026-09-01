import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'cofounderProfile',
  fields: ['name', 'email', 'linkedin', 'avatar', 'bio', 'currentRole', 'currentCompany', 'experience', 'skills', 'industries', 'lookingFor', 'commitment', 'equityExpected', 'availableFrom', 'relocationOk', 'remoteOk', 'matchScore', 'matchReasons', 'isVerified', 'isActive', 'contactStatus', 'lastContactAt'],
})
