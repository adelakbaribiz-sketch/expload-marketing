import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'attributionEvent',
  fields: ['userId', 'deviceId', 'source', 'medium', 'campaign', 'adGroup', 'keyword', 'clickId', 'clickTimestamp', 'installTimestamp', 'eventName', 'eventValue', 'isFraud', 'fraudReason', 'ipAddress', 'userAgent', 'country', 'city', 'revenue'],
})
