/**
 * Seed: Global Events Calendar — 60+ major world events for marketing.
 *
 * Run: npx tsx scripts/seed-events.ts
 */

import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

const EVENTS = [
  // === Global Holidays (recurring annual) ===
  { name: 'New Year\'s Day', startDate: '2026-01-01', category: 'holiday', subcategory: 'new_year', marketingRelevance: 'high', suggestedCampaignTypes: ['discount', 'content', 'social'], recommendedIndustries: ['retail', 'fitness', 'travel'], color: '#F26522', icon: '🎉' },
  { name: 'Valentine\'s Day', startDate: '2026-02-14', category: 'holiday', subcategory: 'valentines', marketingRelevance: 'high', suggestedCampaignTypes: ['discount', 'email', 'social'], recommendedIndustries: ['retail', 'food', 'beauty', 'travel'], color: '#ec4899', icon: '❤️' },
  { name: 'International Women\'s Day', startDate: '2026-03-08', category: 'cultural', subcategory: 'womens_day', marketingRelevance: 'medium', suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['beauty', 'fashion', 'education'], color: '#8CD4D8', icon: '♀️' },
  { name: 'St. Patrick\'s Day', startDate: '2026-03-17', category: 'cultural', subcategory: 'st_patricks', marketingRelevance: 'medium', countries: ['US', 'IE', 'GB', 'CA', 'AU'], suggestedCampaignTypes: ['discount', 'social'], recommendedIndustries: ['food', 'retail', 'travel'], color: '#10b981', icon: '☘️' },
  { name: 'Eid al-Fitr', startDate: '2026-04-10', category: 'religious', subcategory: 'eid_fitr', marketingRelevance: 'high', regions: ['mena', 'asia'], countries: ['SA', 'AE', 'EG', 'TR', 'ID', 'MY', 'PK', 'BD'], suggestedCampaignTypes: ['discount', 'email', 'social'], recommendedIndustries: ['retail', 'food', 'travel', 'fashion'], color: '#1B3A4B', icon: '🌙' },
  { name: 'Earth Day', startDate: '2026-04-22', category: 'cultural', subcategory: 'earth_day', marketingRelevance: 'medium', suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['sustainability', 'fashion', 'food'], color: '#10b981', icon: '🌍' },
  { name: 'Mother\'s Day (US)', startDate: '2026-05-10', category: 'holiday', subcategory: 'mothers_day', marketingRelevance: 'high', countries: ['US', 'CA', 'AU', 'NZ'], suggestedCampaignTypes: ['discount', 'email', 'social'], recommendedIndustries: ['retail', 'beauty', 'food', 'travel'], color: '#ec4899', icon: '🌸' },
  { name: 'Father\'s Day (US)', startDate: '2026-06-21', category: 'holiday', subcategory: 'fathers_day', marketingRelevance: 'high', countries: ['US', 'GB', 'CA'], suggestedCampaignTypes: ['discount', 'email', 'social'], recommendedIndustries: ['retail', 'tech', 'food'], color: '#1B3A4B', icon: '👨' },
  { name: 'Eid al-Adha', startDate: '2026-06-17', category: 'religious', subcategory: 'eid_adha', marketingRelevance: 'high', regions: ['mena', 'asia'], countries: ['SA', 'AE', 'EG', 'TR', 'ID', 'MY', 'PK', 'BD'], suggestedCampaignTypes: ['discount', 'email', 'social'], recommendedIndustries: ['retail', 'food', 'travel'], color: '#1B3A4B', icon: '🐑' },
  { name: 'Independence Day (US)', startDate: '2026-07-04', category: 'holiday', subcategory: 'july_4th', marketingRelevance: 'high', countries: ['US'], suggestedCampaignTypes: ['discount', 'social', 'email'], recommendedIndustries: ['retail', 'food', 'travel'], color: '#3b82f6', icon: '🇺🇸' },
  { name: 'Amazon Prime Day', startDate: '2026-07-15', category: 'business', subcategory: 'prime_day', marketingRelevance: 'high', suggestedCampaignTypes: ['discount', 'ads', 'email'], recommendedIndustries: ['retail', 'ecommerce'], color: '#f59e0b', icon: '📦' },
  { name: 'Back to School', startDate: '2026-08-15', category: 'seasonal', subcategory: 'back_to_school', marketingRelevance: 'high', suggestedCampaignTypes: ['discount', 'email', 'ads'], recommendedIndustries: ['retail', 'education', 'tech'], color: '#8CD4D8', icon: '📚' },
  { name: 'Halloween', startDate: '2026-10-31', category: 'holiday', subcategory: 'halloween', marketingRelevance: 'high', countries: ['US', 'CA', 'GB', 'IE', 'AU'], suggestedCampaignTypes: ['discount', 'social', 'content'], recommendedIndustries: ['retail', 'food', 'entertainment'], color: '#f97316', icon: '🎃' },
  { name: 'Diwali', startDate: '2026-11-01', category: 'religious', subcategory: 'diwali', marketingRelevance: 'high', regions: ['asia'], countries: ['IN', 'NP', 'LK', 'MY', 'SG'], suggestedCampaignTypes: ['discount', 'email', 'social'], recommendedIndustries: ['retail', 'food', 'fashion', 'tech'], color: '#f59e0b', icon: '🪔' },
  { name: 'Thanksgiving (US)', startDate: '2026-11-26', category: 'holiday', subcategory: 'thanksgiving', marketingRelevance: 'high', countries: ['US'], suggestedCampaignTypes: ['content', 'email', 'social'], recommendedIndustries: ['food', 'retail', 'travel'], color: '#f97316', icon: '🦃' },
  { name: 'Black Friday', startDate: '2026-11-27', category: 'business', subcategory: 'black_friday', marketingRelevance: 'high', suggestedCampaignTypes: ['discount', 'ads', 'email'], recommendedIndustries: ['retail', 'ecommerce', 'tech', 'fashion'], color: '#1B3A4B', icon: '🛍️' },
  { name: 'Cyber Monday', startDate: '2026-11-30', category: 'business', subcategory: 'cyber_monday', marketingRelevance: 'high', suggestedCampaignTypes: ['discount', 'ads', 'email'], recommendedIndustries: ['ecommerce', 'tech', 'saas'], color: '#3b82f6', icon: '💻' },
  { name: 'Christmas Day', startDate: '2026-12-25', category: 'holiday', subcategory: 'christmas', marketingRelevance: 'high', suggestedCampaignTypes: ['discount', 'email', 'social', 'content'], recommendedIndustries: ['retail', 'food', 'travel', 'fashion'], color: '#ef4444', icon: '🎄' },
  { name: 'Boxing Day', startDate: '2026-12-26', category: 'holiday', subcategory: 'boxing_day', marketingRelevance: 'medium', countries: ['GB', 'CA', 'AU', 'NZ'], suggestedCampaignTypes: ['discount', 'ads'], recommendedIndustries: ['retail', 'ecommerce'], color: '#1B3A4B', icon: '📦' },
  { name: 'New Year\'s Eve', startDate: '2026-12-31', category: 'holiday', subcategory: 'new_year_eve', marketingRelevance: 'high', suggestedCampaignTypes: ['discount', 'social', 'email'], recommendedIndustries: ['travel', 'food', 'entertainment'], color: '#F26522', icon: '🎆' },

  // === Cultural / Awareness Months ===
  { name: 'Black History Month (US)', startDate: '2026-02-01', category: 'cultural', subcategory: 'black_history', marketingRelevance: 'medium', countries: ['US', 'CA'], suggestedCampaignTypes: ['content', 'social'], color: '#1B3A4B', icon: '✊' },
  { name: 'Ramadan', startDate: '2026-03-11', category: 'religious', subcategory: 'ramadan', marketingRelevance: 'high', regions: ['mena', 'asia'], countries: ['SA', 'AE', 'EG', 'TR', 'ID', 'MY', 'PK', 'BD'], suggestedCampaignTypes: ['discount', 'email', 'social', 'content'], recommendedIndustries: ['retail', 'food', 'travel', 'fashion', 'beauty'], color: '#1B3A4B', icon: '🌙' },
  { name: 'Pride Month', startDate: '2026-06-01', category: 'cultural', subcategory: 'pride', marketingRelevance: 'medium', suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['fashion', 'beauty', 'tech'], color: '#ec4899', icon: '🌈' },
  { name: 'Breast Cancer Awareness Month', startDate: '2026-10-01', category: 'cultural', subcategory: 'breast_cancer', marketingRelevance: 'medium', suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['beauty', 'fashion', 'health'], color: '#ec4899', icon: '🎗️' },
  { name: 'Movember', startDate: '2026-11-01', category: 'cultural', subcategory: 'movember', marketingRelevance: 'medium', suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['health', 'fashion', 'beauty'], color: '#1B3A4B', icon: '👨' },

  // === Sports ===
  { name: 'Super Bowl', startDate: '2026-02-08', category: 'sports', subcategory: 'super_bowl', marketingRelevance: 'high', countries: ['US'], suggestedCampaignTypes: ['ads', 'social', 'discount'], recommendedIndustries: ['food', 'retail', 'tech'], color: '#F26522', icon: '🏈' },
  { name: 'FIFA World Cup Final', startDate: '2026-07-19', category: 'sports', subcategory: 'world_cup', marketingRelevance: 'high', suggestedCampaignTypes: ['ads', 'social', 'discount'], recommendedIndustries: ['food', 'retail', 'travel', 'tech'], color: '#10b981', icon: '⚽' },
  { name: 'Summer Olympics Opening', startDate: '2028-07-21', category: 'sports', subcategory: 'olympics', marketingRelevance: 'high', suggestedCampaignTypes: ['ads', 'content', 'social'], recommendedIndustries: ['food', 'retail', 'travel', 'fitness'], color: '#F26522', icon: '🏅' },
  { name: 'NBA Finals', startDate: '2026-06-04', category: 'sports', subcategory: 'nba_finals', marketingRelevance: 'medium', countries: ['US', 'CA'], suggestedCampaignTypes: ['ads', 'social'], recommendedIndustries: ['food', 'retail'], color: '#f59e0b', icon: '🏀' },
  { name: 'UEFA Champions League Final', startDate: '2026-05-30', category: 'sports', subcategory: 'uefa_final', marketingRelevance: 'high', regions: ['eu'], suggestedCampaignTypes: ['ads', 'social', 'discount'], recommendedIndustries: ['food', 'retail', 'travel'], color: '#3b82f6', icon: '⚽' },

  // === Tech / Business ===
  { name: 'CES (Consumer Electronics Show)', startDate: '2026-01-06', category: 'tech', subcategory: 'ces', marketingRelevance: 'high', suggestedCampaignTypes: ['content', 'social', 'ads'], recommendedIndustries: ['tech', 'saas', 'electronics'], color: '#3b82f6', icon: '💡' },
  { name: 'Mobile World Congress', startDate: '2026-03-02', category: 'tech', subcategory: 'mwc', marketingRelevance: 'medium', suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['tech', 'telecom'], color: '#3b82f6', icon: '📱' },
  { name: 'SXSW', startDate: '2026-03-13', category: 'tech', subcategory: 'sxsw', marketingRelevance: 'medium', countries: ['US'], suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['tech', 'media', 'music'], color: '#F26522', icon: '🎶' },
  { name: 'Apple WWDC', startDate: '2026-06-08', category: 'tech', subcategory: 'wwdc', marketingRelevance: 'high', suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['tech', 'saas', 'apps'], color: '#1B3A4B', icon: '🍎' },
  { name: 'Black Hat USA', startDate: '2026-08-02', category: 'tech', subcategory: 'black_hat', marketingRelevance: 'low', suggestedCampaignTypes: ['content'], recommendedIndustries: ['cybersecurity', 'saas'], color: '#1B3A4B', icon: '🔒' },
  { name: 'Web Summit', startDate: '2026-11-09', category: 'tech', subcategory: 'web_summit', marketingRelevance: 'medium', regions: ['eu'], suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['tech', 'saas', 'startup'], color: '#3b82f6', icon: '🌐' },

  // === Seasonal ===
  { name: 'Spring Equinox', startDate: '2026-03-20', category: 'seasonal', subcategory: 'spring', marketingRelevance: 'low', suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['fashion', 'home', 'garden'], color: '#10b981', icon: '🌱' },
  { name: 'Summer Solstice', startDate: '2026-06-21', category: 'seasonal', subcategory: 'summer', marketingRelevance: 'low', suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['travel', 'food', 'fashion'], color: '#f59e0b', icon: '☀️' },
  { name: 'Autumn Equinox', startDate: '2026-09-22', category: 'seasonal', subcategory: 'autumn', marketingRelevance: 'low', suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['fashion', 'food', 'home'], color: '#f97316', icon: '🍂' },
  { name: 'Winter Solstice', startDate: '2026-12-21', category: 'seasonal', subcategory: 'winter', marketingRelevance: 'low', suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['travel', 'fashion', 'food'], color: '#3b82f6', icon: '❄️' },

  // === Regional / Country-Specific ===
  { name: 'Chinese New Year', startDate: '2026-02-17', category: 'cultural', subcategory: 'lunar_new_year', marketingRelevance: 'high', regions: ['asia'], countries: ['CN', 'HK', 'TW', 'SG', 'MY', 'VN', 'KR'], suggestedCampaignTypes: ['discount', 'email', 'social'], recommendedIndustries: ['retail', 'food', 'travel', 'fashion'], color: '#ef4444', icon: '🧧' },
  { name: 'Nowruz (Persian New Year)', startDate: '2026-03-20', category: 'cultural', subcategory: 'nowruz', marketingRelevance: 'medium', regions: ['mena', 'asia'], countries: ['IR', 'AF', 'TJ', 'UZ', 'AZ', 'KZ'], suggestedCampaignTypes: ['discount', 'social'], recommendedIndustries: ['retail', 'food', 'fashion'], color: '#10b981', icon: '🌷' },
  { name: 'Day of the Dead (Mexico)', startDate: '2026-11-02', category: 'cultural', subcategory: 'dia_de_muertos', marketingRelevance: 'medium', regions: ['latam'], countries: ['MX'], suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['food', 'retail', 'entertainment'], color: '#f97316', icon: '💀' },
  { name: 'Bastille Day (France)', startDate: '2026-07-14', category: 'holiday', subcategory: 'bastille_day', marketingRelevance: 'low', countries: ['FR'], suggestedCampaignTypes: ['discount', 'social'], recommendedIndustries: ['retail', 'food'], color: '#3b82f6', icon: '🇫🇷' },
  { name: 'Oktoberfest', startDate: '2026-09-19', category: 'cultural', subcategory: 'oktoberfest', marketingRelevance: 'medium', countries: ['DE'], suggestedCampaignTypes: ['discount', 'social'], recommendedIndustries: ['food', 'travel', 'retail'], color: '#f59e0b', icon: '🍺' },
  { name: 'Brazilian Carnival', startDate: '2026-02-13', category: 'cultural', subcategory: 'carnival', marketingRelevance: 'medium', regions: ['latam'], countries: ['BR'], suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['travel', 'fashion', 'entertainment'], color: '#ec4899', icon: '🎭' },
  { name: 'Diwali (India)', startDate: '2026-11-01', category: 'religious', subcategory: 'diwali', marketingRelevance: 'high', regions: ['asia'], countries: ['IN', 'NP', 'LK', 'MY', 'SG'], suggestedCampaignTypes: ['discount', 'email', 'social'], recommendedIndustries: ['retail', 'food', 'fashion', 'tech'], color: '#f59e0b', icon: '🪔' },
  { name: 'Golden Week (China)', startDate: '2026-10-01', category: 'holiday', subcategory: 'golden_week', marketingRelevance: 'high', regions: ['asia'], countries: ['CN', 'HK'], suggestedCampaignTypes: ['discount', 'ads'], recommendedIndustries: ['retail', 'travel', 'luxury'], color: '#f59e0b', icon: '🇨🇳' },
  { name: 'Singles Day (China)', startDate: '2026-11-11', category: 'business', subcategory: 'singles_day', marketingRelevance: 'high', regions: ['asia'], countries: ['CN'], suggestedCampaignTypes: ['discount', 'ads', 'email'], recommendedIndustries: ['ecommerce', 'retail', 'tech'], color: '#ef4444', icon: '🛒' },

  // === Awareness Days ===
  { name: 'World Health Day', startDate: '2026-04-07', category: 'cultural', subcategory: 'health_day', marketingRelevance: 'low', suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['health', 'fitness', 'food'], color: '#10b981', icon: '⚕️' },
  { name: 'World Environment Day', startDate: '2026-06-05', category: 'cultural', subcategory: 'environment_day', marketingRelevance: 'low', suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['sustainability', 'fashion'], color: '#10b981', icon: '🌱' },
  { name: 'World Mental Health Day', startDate: '2026-10-10', category: 'cultural', subcategory: 'mental_health', marketingRelevance: 'medium', suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['health', 'wellness', 'tech'], color: '#8CD4D8', icon: '🧠' },
  { name: 'International Coffee Day', startDate: '2026-10-01', category: 'cultural', subcategory: 'coffee_day', marketingRelevance: 'medium', suggestedCampaignTypes: ['discount', 'social'], recommendedIndustries: ['food', 'retail'], color: '#1B3A4B', icon: '☕' },
  { name: 'World Tourism Day', startDate: '2026-09-27', category: 'cultural', subcategory: 'tourism_day', marketingRelevance: 'medium', suggestedCampaignTypes: ['content', 'discount'], recommendedIndustries: ['travel', 'hospitality'], color: '#3b82f6', icon: '✈️' },

  // === E-commerce / Sales Events ===
  { name: 'Way Day (Wayfair)', startDate: '2026-04-26', category: 'business', subcategory: 'way_day', marketingRelevance: 'low', countries: ['US'], suggestedCampaignTypes: ['discount', 'ads'], recommendedIndustries: ['home', 'furniture'], color: '#8CD4D8', icon: '🛋️' },
  { name: 'Prime Big Deal Days (October)', startDate: '2026-10-08', category: 'business', subcategory: 'prime_october', marketingRelevance: 'high', suggestedCampaignTypes: ['discount', 'ads', 'email'], recommendedIndustries: ['ecommerce', 'retail'], color: '#f59e0b', icon: '📦' },
  { name: 'Small Business Saturday', startDate: '2026-11-28', category: 'business', subcategory: 'small_business_sat', marketingRelevance: 'medium', countries: ['US'], suggestedCampaignTypes: ['content', 'social', 'discount'], recommendedIndustries: ['retail', 'local_business'], color: '#1B3A4B', icon: '🏪' },
  { name: 'Giving Tuesday', startDate: '2026-12-01', category: 'cultural', subcategory: 'giving_tuesday', marketingRelevance: 'medium', suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['nonprofit', 'social_impact'], color: '#10b981', icon: '🤝' },

  // === Industry-specific ===
  { name: 'Fashion Week (NYC)', startDate: '2026-02-06', category: 'business', subcategory: 'fashion_week_nyc', marketingRelevance: 'medium', countries: ['US'], suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['fashion', 'beauty', 'luxury'], color: '#1B3A4B', icon: '👗' },
  { name: 'Fashion Week (Paris)', startDate: '2026-02-24', category: 'business', subcategory: 'fashion_week_paris', marketingRelevance: 'medium', countries: ['FR'], suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['fashion', 'beauty', 'luxury'], color: '#1B3A4B', icon: '👗' },
  { name: 'E3 (Gaming)', startDate: '2026-06-09', category: 'tech', subcategory: 'e3', marketingRelevance: 'medium', suggestedCampaignTypes: ['content', 'ads'], recommendedIndustries: ['gaming', 'tech', 'entertainment'], color: '#3b82f6', icon: '🎮' },
  { name: 'Comic-Con San Diego', startDate: '2026-07-22', category: 'cultural', subcategory: 'comic_con', marketingRelevance: 'low', countries: ['US'], suggestedCampaignTypes: ['content', 'social'], recommendedIndustries: ['entertainment', 'gaming', 'fashion'], color: '#F26522', icon: '🦸' },

  // === End of Year ===
  { name: 'Year-End Giving', startDate: '2026-12-15', category: 'seasonal', subcategory: 'year_end_giving', marketingRelevance: 'medium', suggestedCampaignTypes: ['email', 'social'], recommendedIndustries: ['nonprofit', 'charity'], color: '#10b981', icon: '🎁' },
  { name: 'Holiday Shopping Peak', startDate: '2026-12-15', category: 'seasonal', subcategory: 'holiday_shopping', marketingRelevance: 'high', suggestedCampaignTypes: ['discount', 'ads', 'email'], recommendedIndustries: ['retail', 'ecommerce', 'luxury'], color: '#ef4444', icon: '🎁' },
]

async function main() {
  console.log(`Seeding ${EVENTS.length} global events...`)
  let added = 0, skipped = 0
  for (const ev of EVENTS) {
    const existing = await db.globalEvent.findFirst({ where: { name: ev.name, startDate: new Date(ev.startDate) } })
    if (existing) { skipped++; continue }
    await db.globalEvent.create({
      data: {
        name: ev.name,
        startDate: new Date(ev.startDate),
        isRecurring: ev.subcategory ? ['new_year', 'valentines', 'mothers_day', 'fathers_day', 'christmas', 'halloween', 'thanksgiving', 'black_friday', 'cyber_monday', 'eid_fitr', 'eid_adha', 'diwali', 'lunar_new_year', 'ramadan', 'singles_day', 'golden_week', 'prime_day', 'earth_day', 'womens_day', 'st_patricks', 'july_4th', 'new_year_eve', 'boxing_day'].includes(ev.subcategory) : false,
        recurrencePattern: 'annual',
        category: ev.category,
        subcategory: ev.subcategory,
        countries: ev.countries ? JSON.stringify(ev.countries) : JSON.stringify([]),
        regions: ev.regions ? JSON.stringify(ev.regions) : JSON.stringify([]),
        marketingRelevance: ev.marketingRelevance,
        recommendedIndustries: ev.recommendedIndustries ? JSON.stringify(ev.recommendedIndustries) : null,
        suggestedCampaignTypes: ev.suggestedCampaignTypes ? JSON.stringify(ev.suggestedCampaignTypes) : null,
        icon: ev.icon,
        color: ev.color,
        isActive: true,
      },
    })
    added++
  }
  console.log(`Done: ${added} added, ${skipped} already existed.`)
  const total = await db.globalEvent.count()
  console.log(`Total events now: ${total}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
