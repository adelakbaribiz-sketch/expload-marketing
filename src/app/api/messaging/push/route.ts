import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'pushNotification',
  fields: ['title', 'body', 'iconUrl', 'imageUrl', 'actionUrl', 'segment', 'scheduledAt', 'sentAt', 'sentCount', 'deliveredCount', 'clickedCount', 'status', 'platform'],
})
