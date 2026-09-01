import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'

export async function GET() {
  const tenantId = await requireTenantId()
  let config = await db.whiteLabelConfig.findUnique({ where: { tenantId } })
  if (!config) {
    config = await db.whiteLabelConfig.create({
      data: { tenantId, brandName: 'Expload Marketing', labelType: 'grey' },
    })
  }
  return NextResponse.json({ config })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const config = await db.whiteLabelConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      brandName: body.brandName || 'My Brand',
      labelType: body.labelType || 'grey',
      brandLogoUrl: body.brandLogoUrl || null,
      brandColors: body.brandColors ? JSON.stringify(body.brandColors) : null,
      customDomain: body.customDomain || null,
      customSubdomain: body.customSubdomain || null,
      supportEmail: body.supportEmail || null,
      fromEmail: body.fromEmail || null,
      hideExploadBranding: body.hideExploadBranding ?? false,
      hideBlogSection: body.hideBlogSection ?? false,
      hidePricingCalc: body.hidePricingCalc ?? false,
      customFooterText: body.customFooterText || null,
      isReseller: body.isReseller ?? false,
      resellerTier: body.resellerTier || 'standard',
      commissionRate: Number(body.commissionRate || 20),
      customPricing: body.customPricing ? JSON.stringify(body.customPricing) : null,
      maxSubTenants: Number(body.maxSubTenants || 10),
    },
    update: {
      brandName: body.brandName || undefined,
      labelType: body.labelType || undefined,
      brandLogoUrl: body.brandLogoUrl ?? undefined,
      brandColors: body.brandColors ? JSON.stringify(body.brandColors) : undefined,
      customDomain: body.customDomain ?? undefined,
      hideExploadBranding: body.hideExploadBranding ?? undefined,
      isReseller: body.isReseller ?? undefined,
      resellerTier: body.resellerTier || undefined,
      commissionRate: body.commissionRate !== undefined ? Number(body.commissionRate) : undefined,
      customPricing: body.customPricing ? JSON.stringify(body.customPricing) : undefined,
      maxSubTenants: body.maxSubTenants !== undefined ? Number(body.maxSubTenants) : undefined,
    },
  })
  return NextResponse.json({ config })
}

export const POST = withProtection(postHandler, { rateLimit: 'write' })
