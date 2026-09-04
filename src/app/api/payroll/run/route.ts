import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isPlatformStaffAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'
import { emitNotificationEvent } from '@/lib/notifications/emitter'

/**
 * Run payroll for a given period.
 *
 * Revenue distribution:
 *   - 50% to owner
 *   - 40% to staff pool (distributed by role weight × hours worked × performance)
 *   - 10% reinvestment (kept in company)
 *
 * Staff pool allocation formula:
 *   employeeShare = staffPool × (weight × hours × performanceFactor) / sum(all weights × hours × performance)
 *
 * Bonus pool (5% of staff pool) reserved for top performers.
 */

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!(await isPlatformStaffAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  if (req.method !== 'POST') return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })

  const body = await req.json()
  const { periodStart, periodEnd, totalRevenue } = body
  if (!periodStart || !periodEnd || totalRevenue == null) {
    return NextResponse.json({ error: 'periodStart, periodEnd, totalRevenue required' }, { status: 400 })
  }

  // Get config
  const config = await db.payrollConfig.findFirst({ where: { isActive: true } })
  if (!config) return NextResponse.json({ error: 'no_payroll_config' }, { status: 400 })

  const roleWeights = JSON.parse(config.roleWeights || '{}')

  // Calculate splits
  const ownerShare = totalRevenue * (config.ownerSharePercent / 100)
  const staffPool = totalRevenue * (config.staffPoolPercent / 100)
  const reinvestmentAmount = totalRevenue * (config.reinvestmentPercent / 100)
  const bonusPool = staffPool * (config.bonusPoolPercent / 100)
  const distributablePool = staffPool - bonusPool

  // Get all active employees
  const employees = await db.internalEmployee.findMany({
    where: { status: 'active' },
    include: { user: { select: { name: true, email: true } } },
  })

  // For each employee, calculate weighted contribution
  const contributions: any[] = []
  let totalWeightedContribution = 0

  for (const emp of employees) {
    // Get hours from VirtualAssistant timesheets (if employee is also an assistant)
    let hours = 0
    if (emp.id) {
      const va = await db.virtualAssistant.findUnique({
        where: { employeeId: emp.id },
        include: {
          timesheets: {
            where: {
              date: { gte: new Date(periodStart), lte: new Date(periodEnd) },
              status: 'approved',
            },
          },
        },
      })
      if (va) {
        hours = va.timesheets.reduce((s, t) => s + t.hoursWorked, 0)
      }
    }
    // Minimum hours for salaried employees (assume 160h/month full-time)
    if (hours === 0 && emp.employmentType === 'full_time') hours = 160

    const weight = roleWeights[emp.employeeRole] ?? 1
    const performanceFactor = 1.0  // could be calculated from performance reviews
    const weightedContribution = weight * hours * performanceFactor

    contributions.push({
      employeeId: emp.id,
      employeeName: emp.user?.name ?? emp.user?.email ?? 'Unknown',
      role: emp.employeeRole,
      hours,
      weight,
      performanceFactor,
      weightedContribution,
    })
    totalWeightedContribution += weightedContribution
  }

  // Distribute
  const distributions = contributions.map(c => {
    const sharePercent = totalWeightedContribution > 0 ? c.weightedContribution / totalWeightedContribution : 0
    const baseShare = distributablePool * sharePercent
    const bonusAmount = bonusPool * sharePercent  // simplified; could use performance rating
    const grossAmount = baseShare + bonusAmount
    const taxAmount = grossAmount * 0.1  // 10% tax withholding (configurable)
    const netAmount = grossAmount - taxAmount
    return {
      ...c,
      sharePercent,
      baseShare,
      bonusAmount,
      grossAmount,
      taxAmount,
      netAmount,
    }
  })

  // Create payroll period
  const period = await db.payrollPeriod.create({
    data: {
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      periodLabel: `${new Date(periodStart).toLocaleDateString()} - ${new Date(periodEnd).toLocaleDateString()}`,
      totalRevenue,
      ownerShare,
      staffPool,
      reinvestmentAmount,
      bonusPool,
      distributions: JSON.stringify(distributions),
      status: 'calculated',
      calculatedAt: new Date(),
    },
  })

  // Create salary payments
  for (const dist of distributions) {
    if (dist.netAmount > 0) {
      await db.salaryPayment.create({
        data: {
          periodId: period.id,
          employeeId: dist.employeeId,
          employeeName: dist.employeeName,
          baseShare: dist.baseShare,
          bonusAmount: dist.bonusAmount,
          grossAmount: dist.grossAmount,
          taxAmount: dist.taxAmount,
          netAmount: dist.netAmount,
          currency: 'USD',
          paymentMethod: 'bank_transfer',
          status: 'pending',
        },
      })
    }
  }

  // Notify
  await emitNotificationEvent({
    type: 'payroll_calculated',
    title: 'Payroll calculated',
    message: `Period ${period.periodLabel}: $${totalRevenue} revenue → $${ownerShare} owner, $${staffPool} staff pool, $${distributions.length} employees paid.`,
    severity: 'success',
    tenantId: user.tenantId,
    category: 'payroll',
  })

  return NextResponse.json({
    period,
    summary: {
      totalRevenue,
      ownerShare,
      staffPool,
      reinvestmentAmount,
      bonusPool,
      employeeCount: distributions.length,
    },
    distributions,
  }, { status: 201 })
}

export const POST = withProtection(handler, { rateLimit: 'write' })
