import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
import { ApiError } from '@/lib/api/errors'
import { DEAL_STAGE_MACHINE, type DealStage } from '@/lib/workflow/definitions'

export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'deal',
  fields: ['title', 'value', 'currency', 'stage', 'probability', 'expectedCloseDate', 'leadId', 'contactId', 'companyId', 'projectId', 'ownerId'],
  include: { lead: true, contact: true, company: true },
  beforeWrite: (data, _tenantId, existing) => {
    if (data.stage && existing) {
      const from = existing.stage as DealStage
      const to = data.stage as DealStage
      if (!DEAL_STAGE_MACHINE.states.includes(to)) throw new ApiError(400, `Invalid stage "${to}"`)
      DEAL_STAGE_MACHINE.assertTransition(from, to)
    }
    return data
  },
})
