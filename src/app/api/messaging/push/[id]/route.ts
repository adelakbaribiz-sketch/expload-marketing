import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'pushNotification',
  fields: ['title', 'body', 'iconUrl', 'imageUrl', 'actionUrl', 'segment', 'scheduledAt', 'sentAt', 'status', 'platform'],
})
