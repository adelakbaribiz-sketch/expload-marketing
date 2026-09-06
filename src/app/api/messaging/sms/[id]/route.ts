import { createDomainItemHandlers } from '@/lib/crud/domain-handler'

// Delivery fields (status, sentAt, deliveredAt, cost, errorMessage) are
// deliberately not in this allowlist — those are set exclusively by the
// real send flow in ../route.ts (POST), never by a direct edit. See
// INTEGRATION-ARCHITECTURE.md.
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'smsMessage',
  fields: ['to', 'body', 'campaignId', 'leadId'],
})
