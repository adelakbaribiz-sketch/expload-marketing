/**
 * Role-based step-by-step guides for every section of the platform.
 */

export type UserRole = 'owner' | 'admin' | 'manager' | 'editor' | 'viewer' | 'super_admin' | 'distributor' | 'employee' | 'all'

export interface GuideStep {
  title: string
  description: string
  tip?: string
}

export interface SectionGuide {
  sectionId: string
  label: string
  tooltip: string
  steps: GuideStep[]
  nextStep: string
}

export const SECTION_GUIDES: SectionGuide[] = [
  {
    sectionId: 'agent-hub',
    label: 'Agent Hub',
    tooltip: 'Your one-click command center — start any marketing activity from here.',
    steps: [
      { title: 'Welcome to Agent Hub', description: 'This is the central command center where you can launch any marketing action with one click.' },
      { title: 'Quick Actions', description: 'Click any of the 12 colored action cards to jump directly into that workflow — no menu navigation needed.' },
      { title: 'Smart Search', description: 'Type what you want to do in the search bar (e.g. "find leads", "send email") and matching actions appear instantly.' },
      { title: 'Module Shortcuts', description: 'The 12-icon grid below gives you one-tap access to every major module.' },
      { title: 'Launch Autonomous Agent', description: 'Click the orange "Launch Agent" button at the bottom to start the 24/7 AI marketing agent.' },
    ],
    nextStep: 'Go to Leads to find your first customer, or start the Onboarding Wizard to set up a new client.',
  },
  {
    sectionId: 'leads',
    label: 'Leads',
    tooltip: 'Find potential customers via Google Maps + Serper API. AI scores & enriches each lead.',
    steps: [
      { title: 'Find Leads', description: 'Click "Search Leads" and enter a business type (e.g. "dentists in Dubai") + location. The system scrapes Google Maps.' },
      { title: 'AI Enrichment', description: 'Select leads and click "Enrich with AI" — the LLM extracts industry, contact email, services, and scores quality 0-100.' },
      { title: 'Qualify', description: 'Change lead status: new → contacted → qualified → won/lost. Filter by score to prioritize high-value leads.' },
      { title: 'Assign to Project', description: 'Move qualified leads into a CRM project to track them through your sales pipeline.' },
    ],
    nextStep: 'After qualifying leads, go to CRM to manage your sales pipeline and deals.',
  },
  {
    sectionId: 'negotiation',
    label: 'Negotiation Engine',
    tooltip: 'AI generates 6 rounds of proposals: Initial → MVP → Economic → Phased → Revenue-Share → Equity.',
    steps: [
      { title: 'Create Negotiation Session', description: 'Either start from the Onboarding Wizard (recommended) or click "New Session" — enter customer name, project description, budget, and timeline.' },
      { title: 'Review Initial Proposal', description: 'The LLM generates an initial proposal with full scope, full price, and standard timeline. Review features and pricing.' },
      { title: 'Accept or Reject', description: 'If the customer accepts, the deal closes. If they reject, the system automatically generates round 2 (MVP Fast-Track).' },
      { title: 'Walk Through 6 Rounds', description: 'Each rejection triggers the next round: MVP → Economic → Phased → Revenue-Share → Equity.' },
      { title: 'Provide Feedback', description: 'When rejecting, type the reason in the feedback box. The LLM uses this to improve the next proposal.' },
    ],
    nextStep: 'When a deal is accepted, go to CRM to create a deal and assign it to a project manager or virtual assistant.',
  },
  {
    sectionId: 'onboarding-wizard',
    label: 'Onboarding Wizard',
    tooltip: '6-step wizard: customer info → business → website crawl → document upload → system prompt → start negotiation.',
    steps: [
      { title: 'Step 1 — Customer Info', description: 'Enter the customer name, email, and phone. This creates the onboarding session.' },
      { title: 'Step 2 — Business Brief', description: 'Add business name, website, industry, project description, budget, timeline, and priorities.' },
      { title: 'Step 3 — Website Crawl', description: 'Enter the customer website URL. The system crawls it, extracts text, and adds it to the LLM context.' },
      { title: 'Step 4 — Upload Documents', description: 'Upload PDF/DOCX/TXT files. Text is extracted and added to the knowledge base.' },
      { title: 'Step 5 — Custom System Prompt', description: 'Optional: write a custom system prompt to bias the LLM.' },
      { title: 'Step 6 — Start Negotiation', description: 'Review all inputs and click "Start Negotiation".' },
    ],
    nextStep: 'You\'ll be redirected to the Negotiation Engine to manage the 6-round proposal flow.',
  },
  {
    sectionId: 'llm-settings',
    label: 'Multi-LLM Aggregator',
    tooltip: 'Configure free LLM providers (Groq, Cerebras, OpenRouter, Mistral, HuggingFace) with auto-fallback.',
    steps: [
      { title: 'Get Free API Keys', description: 'Visit the provider links (Groq is easiest: console.groq.com/keys). All providers have free tiers — no credit card needed.' },
      { title: 'Enter API Keys', description: 'For each provider, type your API key in the input box and press Enter.' },
      { title: 'Enable/Disable Providers', description: 'Use the toggle switch on each provider card. Disabled providers are skipped during auto-fallback.' },
      { title: 'Monitor Usage', description: 'Click the "Usage" tab to see daily token consumption per provider.' },
      { title: 'Auto-Fallback', description: 'When a provider hits rate-limit (429), the system automatically switches to the next active provider.' },
    ],
    nextStep: 'After configuring at least one provider (Groq recommended), try the Onboarding Wizard.',
  },
  {
    sectionId: 'distributors',
    label: 'Wholesale Distributors',
    tooltip: 'Master distributor model: bulk license packs, exclusive territories, payout tracking.',
    steps: [
      { title: 'Add Distributor', description: 'Create a new distributor with company info, country, tier (standard/silver/gold/platinum/master).' },
      { title: 'Sign Contract', description: 'Create a Master Distributor Contract with minimum annual sales guarantee, wholesale discount %, and payment terms.' },
      { title: 'Issue License Packs', description: 'Select a distributor + package (PLT-100, PLT-500, etc.) and generate license keys.' },
      { title: 'Assign Exclusive Territory', description: 'Grant country/region exclusivity tied to minimum sales commitment.' },
      { title: 'Process Payouts', description: 'Review monthly commission owed and approve bank transfers / PayPal / crypto payouts.' },
    ],
    nextStep: 'Distributors handle Tier 1 + Tier 2 support. Tier 3 (real bugs) escalates via the Support tab.',
  },
  {
    sectionId: 'payment-gateways',
    label: 'Payment Gateways',
    tooltip: 'Configure 15 international gateways (Stripe, PayPal, Moyasar, Razorpay, etc.) + crypto (BTC/ETH/USDT).',
    steps: [
      { title: 'Choose Gateway', description: 'The Add Gateway tab lists 15 supported providers. Pick the one matching your customer\'s country.' },
      { title: 'Enter Credentials', description: 'Paste API key, secret, and webhook secret. Toggle sandbox mode for testing.' },
      { title: 'Set Routing Rules', description: 'Configure routing: by currency, country, or payment method.' },
      { title: 'Enable Crypto', description: 'For crypto, set platform wallet addresses in env vars and configure NOWPayments webhook.' },
    ],
    nextStep: 'After configuration, test a small payment. The Finance section shows all transactions.',
  },
  {
    sectionId: 'virtual-assistants',
    label: 'Virtual Assistant Service',
    tooltip: 'Hire trained assistants to do customer projects. Includes work-tracking, time logging, and automatic salary.',
    steps: [
      { title: 'Browse Assistants', description: 'View all trained assistants — filter by skill, availability, hourly rate, and rating.' },
      { title: 'Hire an Assistant', description: 'Click "Hire" on any assistant. Choose a plan (hourly, project-based, or monthly retainer).' },
      { title: 'Track Work', description: 'Assistants log hours, completed tasks, and deliverables. You see real-time progress.' },
      { title: 'Approve Deliverables', description: 'Review work submissions. Approve to release payment, or request revisions.' },
    ],
    nextStep: 'After hiring, the assistant will appear in your project. Track progress in the Assignments tab.',
  },
  {
    sectionId: 'payroll',
    label: 'Payroll & Salary',
    tooltip: 'Automatic salary system: 50% revenue to owner, rest distributed to staff based on contribution & performance.',
    steps: [
      { title: 'Configure Revenue Split', description: 'Set the default split: 50% to owner, 50% to staff pool. Adjust staff allocation percentages by role.' },
      { title: 'Run Payroll', description: 'At month-end, click "Run Payroll". The system calculates each employee\'s share based on logged hours.' },
      { title: 'Review & Approve', description: 'Review the payroll breakdown. Adjust manual bonuses or deductions. Approve to trigger payout.' },
      { title: 'Export Reports', description: 'Download payroll reports (PDF/Excel) for accounting and tax compliance.' },
    ],
    nextStep: 'Configure staff salaries in the Internal Portal → Employees section first.',
  },
  {
    sectionId: 'support-plans',
    label: 'Support Plans',
    tooltip: 'Customers buy support packages: Basic ($99/mo), Premium ($499/mo), Enterprise ($1999/mo).',
    steps: [
      { title: 'View Available Plans', description: 'Three tiers: Basic (email, 48h response), Premium (chat + email, 4h), Enterprise (24/7 phone + Slack, 1h).' },
      { title: 'Purchase Plan', description: 'Click "Subscribe" on any plan. Pay via card or crypto. Activation is instant.' },
      { title: 'Submit Tickets', description: 'Once subscribed, submit support tickets from the customer portal. SLA timers start immediately.' },
      { title: 'Track Resolution', description: 'View ticket status, agent assignment, and resolution time. Escalate if SLA is breached.' },
    ],
    nextStep: 'After subscribing, you\'ll see a "Support" widget in your dashboard to file tickets.',
  },
]

export function getGuide(sectionId: string): SectionGuide | null {
  return SECTION_GUIDES.find(g => g.sectionId === sectionId) ?? null
}
export function getTooltip(sectionId: string): string {
  return getGuide(sectionId)?.tooltip ?? ''
}
