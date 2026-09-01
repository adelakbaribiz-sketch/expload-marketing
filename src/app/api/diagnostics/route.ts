import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'businessDiagnostic',
  fields: ['businessName', 'website', 'industry', 'marketingScore', 'salesScore', 'digitalPresenceScore', 'customerSatisfactionScore', 'operationalScore', 'overallScore', 'strengths', 'weaknesses', 'opportunities', 'threats', 'detectedIssues', 'detectedOpportunities', 'aiAnalysis', 'summary', 'actionPlan', 'status'],
})
