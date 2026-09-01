import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'calendarEvent',
  fields: ['title', 'description', 'startDate', 'endDate', 'allDay', 'sourceType', 'sourceId', 'channel', 'status', 'color', 'metadata'],
})
