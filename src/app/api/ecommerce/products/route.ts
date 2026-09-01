import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'ecommerceProduct',
  fields: ['asin', 'productId', 'platform', 'title', 'imageUrl', 'productUrl', 'price', 'currency', 'originalPrice', 'costEstimate', 'rating', 'reviewCount', 'salesPerMonth', 'revenuePerMonth', 'bsrRank', 'fbaFee', 'referralFee', 'totalFees', 'estimatedProfit', 'estimatedMargin', 'estimatedROI', 'competitionLevel', 'sellerCount', 'trendDirection', 'trendScore', 'category', 'brand', 'keywords', 'aiAnalysis', 'lastChecked'],
})
