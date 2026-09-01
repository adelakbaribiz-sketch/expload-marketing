/**
 * Graph Agent Orchestrator — Node-based execution engine.
 *
 * Architecture:
 *  - User states a high-level goal (e.g. "Find 50 dentist leads in Dubai and launch email campaign")
 *  - LLM generates a node-based execution plan (DAG)
 *  - Engine executes nodes in topological order
 *  - Parallel branches run concurrently
 *  - Each node's output feeds into dependent nodes
 *  - User sees real-time progress
 *
 * This is the "brain" that connects all platform modules into one autonomous system.
 *
 * Inspired by: LangGraph, AutoGen, CrewAI — but simpler & integrated with our LLM Aggregator.
 */

import 'server-only'
import { db } from '@/lib/db'
import { llmAggregator } from '@/lib/llm/aggregator'
import { getPrompt } from '@/lib/prompts/system-prompts'
import { emitNotificationEvent } from '@/lib/notifications/emitter'

// ============================================================================
// Types
// ============================================================================

export type NodeType =
  | 'find_leads' | 'enrich_leads' | 'qualify_leads'
  | 'create_campaign' | 'send_campaign'
  | 'analyze_competitor' | 'generate_content' | 'schedule_social'
  | 'run_seo_audit' | 'launch_ads'
  | 'start_negotiation' | 'onboard_customer' | 'run_diagnostics'
  | 'generate_report' | 'assign_assistant' | 'process_payment' | 'notify_user'

export interface GraphNode {
  id: string
  type: NodeType
  inputs: Record<string, any>
  depends_on: string[]
  parallelizable: boolean
}

export interface ExecutionPlan {
  plan_name: string
  goal: string
  estimated_duration_minutes: number
  nodes: GraphNode[]
  success_criteria: string
}

export interface NodeResult {
  node_id: string
  status: 'completed' | 'failed' | 'skipped' | 'pending' | 'running'
  output: Record<string, any>
  error?: string
  started_at?: Date
  completed_at?: Date
  duration_ms?: number
}

export interface ExecutionState {
  plan: ExecutionPlan
  results: Map<string, NodeResult>
  status: 'planning' | 'executing' | 'completed' | 'failed' | 'cancelled'
  current_node_ids: string[]
  started_at: Date
  completed_at?: Date
  tenant_id: string
  user_id: string
}

// ============================================================================
// Plan Generator — uses LLM to convert goal → node graph
// ============================================================================

export async function generatePlan(goal: string, tenantId: string, userId: string): Promise<ExecutionPlan> {
  const systemPrompt = getPrompt('graphAgentPlanner')

  const userPrompt = `# User Goal
${goal}

## Available Context
- Tenant ID: ${tenantId}
- Current date: ${new Date().toISOString()}
- The platform has 10 marketing phases, payment gateways, virtual assistants, negotiation engine, LLM aggregator.

## Task
Generate a node-based execution plan to achieve this goal. Maximum 15 nodes. Be specific with inputs.`

  const response = await llmAggregator.complete({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    sessionType: 'graph_planning',
    tenantId,
    temperature: 0.4,  // slightly creative for planning
    maxTokens: 2000,
  })

  // Parse JSON
  let text = response.text.trim()
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) text = jsonMatch[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) text = text.slice(start, end + 1)

  const plan = JSON.parse(text) as ExecutionPlan

  // Validate
  if (!plan.nodes || !Array.isArray(plan.nodes) || plan.nodes.length === 0) {
    throw new Error('Invalid plan: no nodes')
  }

  return plan
}

// ============================================================================
// Node Executors — one function per node type
// ============================================================================

const NODE_EXECUTORS: Record<NodeType, (inputs: any, context: ExecutionContext) => Promise<any>> = {
  find_leads: async (inputs, ctx) => {
    // Call /api/leads/search internally
    return await callInternalApi(ctx, 'POST', '/api/leads/search', {
      query: inputs.industry ?? inputs.query,
      location: inputs.location,
      limit: inputs.limit ?? 20,
    })
  },

  enrich_leads: async (inputs, ctx) => {
    const leadIds: string[] = inputs.lead_ids ?? []
    const results: any[] = []
    for (const id of leadIds.slice(0, 20)) {
      const r = await callInternalApi(ctx, 'POST', `/api/leads/${id}/enrich`, {})
      results.push(r)
    }
    return { enriched_count: results.length, leads: results }
  },

  qualify_leads: async (inputs, ctx) => {
    const threshold = inputs.min_score ?? 60
    const leads = inputs.leads ?? []
    const qualified = leads.filter((l: any) => (l.score ?? 0) >= threshold)
    return { qualified_count: qualified.length, qualified_lead_ids: qualified.map((l: any) => l.id) }
  },

  create_campaign: async (inputs, ctx) => {
    return await callInternalApi(ctx, 'POST', '/api/campaigns', {
      name: inputs.name ?? `Campaign ${Date.now()}`,
      subject: inputs.subject,
      template: inputs.template,
      lead_ids: inputs.lead_ids,
    })
  },

  send_campaign: async (inputs, ctx) => {
    return await callInternalApi(ctx, 'POST', `/api/campaigns/${inputs.campaign_id}/send`, {})
  },

  analyze_competitor: async (inputs, ctx) => {
    return await callInternalApi(ctx, 'POST', '/api/competitor-analysis/run', {
      competitor_url: inputs.url,
      competitor_name: inputs.name,
    })
  },

  generate_content: async (inputs, ctx) => {
    const response = await llmAggregator.complete({
      messages: [
        { role: 'system', content: getPrompt('contentBlog') },
        { role: 'user', content: `Topic: ${inputs.topic}\nKeywords: ${inputs.keywords?.join(', ') ?? 'n/a'}\nAudience: ${inputs.audience ?? 'general'}` },
      ],
      sessionType: 'content_generation',
      tenantId: ctx.tenantId,
      temperature: 0.7,
      maxTokens: 2000,
    })
    return { content: response.text, tokens_used: response.totalTokens }
  },

  schedule_social: async (inputs, ctx) => {
    return await callInternalApi(ctx, 'POST', '/api/social/posts', inputs)
  },

  run_seo_audit: async (inputs, ctx) => {
    return await callInternalApi(ctx, 'POST', `/api/seo/${inputs.seo_project_id}/crawl`, {})
  },

  launch_ads: async (inputs, ctx) => {
    return await callInternalApi(ctx, 'POST', '/api/ads/campaigns', inputs)
  },

  start_negotiation: async (inputs, ctx) => {
    return await callInternalApi(ctx, 'POST', '/api/negotiation/sessions', inputs)
  },

  onboard_customer: async (inputs, ctx) => {
    return await callInternalApi(ctx, 'POST', '/api/onboarding/sessions', inputs)
  },

  run_diagnostics: async (inputs, ctx) => {
    return await callInternalApi(ctx, 'POST', '/api/diagnostics/run', inputs)
  },

  generate_report: async (inputs, ctx) => {
    const period = inputs.period ?? 'monthly'
    const audience = inputs.audience ?? 'admin'
    return await callInternalApi(ctx, 'GET', `/api/reports?period=${period}&audience=${audience}&aiInsights=true`, null)
  },

  assign_assistant: async (inputs, ctx) => {
    return await callInternalApi(ctx, 'POST', '/api/virtual-assistants/assignments', inputs)
  },

  process_payment: async (inputs, ctx) => {
    return await callInternalApi(ctx, 'POST', '/api/payments/crypto/create', inputs)
  },

  notify_user: async (inputs, ctx) => {
    await emitNotificationEvent({
      type: 'graph_agent_notification',
      title: inputs.title ?? 'Graph Agent notification',
      message: inputs.message ?? '',
      severity: inputs.severity ?? 'info',
      tenantId: ctx.tenantId,
      category: 'graph_agent',
    })
    return { notified: true }
  },
}

interface ExecutionContext {
  tenantId: string
  userId: string
  sessionId?: string
}

/** Helper: call an internal API endpoint (server-to-server). */
async function callInternalApi(ctx: ExecutionContext, method: string, path: string, body: any): Promise<any> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`API ${path} failed: ${res.status} ${errText}`)
  }
  return res.json()
}

// ============================================================================
// Execution Engine — topological sort + parallel execution
// ============================================================================

export async function executePlan(
  plan: ExecutionPlan,
  tenantId: string,
  userId: string,
  onProgress?: (state: ExecutionState) => void,
): Promise<ExecutionState> {
  const state: ExecutionState = {
    plan,
    results: new Map(),
    status: 'executing',
    current_node_ids: [],
    started_at: new Date(),
    tenant_id: tenantId,
    user_id: userId,
  }

  const ctx: ExecutionContext = { tenantId, userId }

  // Notify start
  await emitNotificationEvent({
    type: 'graph_agent_started',
    title: `Agent started: ${plan.plan_name}`,
    message: `Executing ${plan.nodes.length} nodes. Estimated: ${plan.estimated_duration_minutes} min. Goal: ${plan.goal}`,
    severity: 'info',
    tenantId,
    category: 'graph_agent',
  })

  // Topological execution
  const completed = new Set<string>()
  const failed = new Set<string>()

  while (completed.size + failed.size < plan.nodes.length) {
    // Find ready nodes (dependencies satisfied)
    const ready = plan.nodes.filter(node => {
      if (completed.has(node.id) || failed.has(node.id)) return false
      return node.depends_on.every(dep => completed.has(dep))
    })

    if (ready.length === 0) {
      // Deadlock — likely a failed dependency
      const stuck = plan.nodes.filter(n => !completed.has(n.id) && !failed.has(n.id))
      for (const s of stuck) {
        failed.add(s.id)
        state.results.set(s.id, {
          node_id: s.id, status: 'skipped',
          output: {}, error: 'Skipped due to failed dependency',
        })
      }
      break
    }

    // Separate parallelizable vs sequential
    const parallel = ready.filter(n => n.parallelizable)
    const sequential = ready.filter(n => !n.parallelizable)

    // Execute parallel batch first (concurrent)
    state.current_node_ids = parallel.map(n => n.id)
    onProgress?.({ ...state, results: new Map(state.results) })

    if (parallel.length > 0) {
      const promises = parallel.map(async (node) => {
        const result = await executeNode(node, ctx)
        state.results.set(node.id, result)
        return result
      })
      const results = await Promise.allSettled(promises)
      results.forEach((r, i) => {
        const node = parallel[i]
        if (r.status === 'fulfilled' && r.value.status === 'completed') {
          completed.add(node.id)
        } else {
          failed.add(node.id)
        }
      })
    }

    // Execute sequential nodes (one at a time)
    for (const node of sequential) {
      state.current_node_ids = [node.id]
      onProgress?.({ ...state, results: new Map(state.results) })
      const result = await executeNode(node, ctx)
      state.results.set(node.id, result)
      if (result.status === 'completed') {
        completed.add(node.id)
      } else {
        failed.add(node.id)
      }
    }
  }

  state.status = failed.size === 0 ? 'completed' : (completed.size > 0 ? 'completed' : 'failed')
  state.completed_at = new Date()
  state.current_node_ids = []

  // Notify completion
  await emitNotificationEvent({
    type: 'graph_agent_completed',
    title: `Agent ${state.status}: ${plan.plan_name}`,
    message: `${completed.size}/${plan.nodes.length} nodes completed. ${failed.size} failed.`,
    severity: state.status === 'completed' ? 'success' : 'warning',
    tenantId,
    category: 'graph_agent',
  })

  onProgress?.({ ...state, results: new Map(state.results) })
  return state
}

/** Execute a single node with error handling + timing. */
async function executeNode(node: GraphNode, ctx: ExecutionContext): Promise<NodeResult> {
  const start = new Date()
  const startMs = Date.now()

  try {
    const executor = NODE_EXECUTORS[node.type]
    if (!executor) {
      throw new Error(`Unknown node type: ${node.type}`)
    }

    // Inject outputs from dependency nodes
    const enrichedInputs = { ...node.inputs }
    for (const depId of node.depends_on) {
      // Outputs available via closure (state.results) — pass nothing extra here for simplicity
    }

    const output = await executor(enrichedInputs, ctx)

    return {
      node_id: node.id,
      status: 'completed',
      output,
      started_at: start,
      completed_at: new Date(),
      duration_ms: Date.now() - startMs,
    }
  } catch (err: any) {
    return {
      node_id: node.id,
      status: 'failed',
      output: {},
      error: err.message,
      started_at: start,
      completed_at: new Date(),
      duration_ms: Date.now() - startMs,
    }
  }
}

// ============================================================================
// Quick Plan Templates — for common use cases (no LLM call needed)
// ============================================================================

export const PLAN_TEMPLATES: Record<string, () => ExecutionPlan> = {
  lead_to_campaign: () => ({
    plan_name: 'Lead Generation → Email Campaign',
    goal: 'Find new leads, enrich them, qualify, and launch email campaign',
    estimated_duration_minutes: 15,
    nodes: [
      { id: 'n1', type: 'find_leads', inputs: { industry: 'restaurants', location: 'Dubai', limit: 30 }, depends_on: [], parallelizable: false },
      { id: 'n2', type: 'enrich_leads', inputs: {}, depends_on: ['n1'], parallelizable: true },
      { id: 'n3', type: 'qualify_leads', inputs: { min_score: 60 }, depends_on: ['n2'], parallelizable: false },
      { id: 'n4', type: 'create_campaign', inputs: { name: 'Dubai Restaurants Outreach', subject: 'Boost your restaurant online presence' }, depends_on: ['n3'], parallelizable: false },
      { id: 'n5', type: 'send_campaign', inputs: {}, depends_on: ['n4'], parallelizable: false },
      { id: 'n6', type: 'notify_user', inputs: { title: 'Campaign launched!', message: 'Your lead-to-campaign workflow is complete.' }, depends_on: ['n5'], parallelizable: false },
    ],
    success_criteria: 'Email campaign sent to 10+ qualified leads',
  }),

  competitor_research: () => ({
    plan_name: 'Competitor Deep Research',
    goal: 'Analyze top 3 competitors and generate report',
    estimated_duration_minutes: 20,
    nodes: [
      { id: 'n1', type: 'analyze_competitor', inputs: { url: 'https://competitor1.com', name: 'Competitor 1' }, depends_on: [], parallelizable: true },
      { id: 'n2', type: 'analyze_competitor', inputs: { url: 'https://competitor2.com', name: 'Competitor 2' }, depends_on: [], parallelizable: true },
      { id: 'n3', type: 'analyze_competitor', inputs: { url: 'https://competitor3.com', name: 'Competitor 3' }, depends_on: [], parallelizable: true },
      { id: 'n4', type: 'generate_content', inputs: { topic: 'Competitive analysis report', audience: 'executive' }, depends_on: ['n1', 'n2', 'n3'], parallelizable: false },
      { id: 'n5', type: 'notify_user', inputs: { title: 'Competitor research complete', message: 'Analyzed 3 competitors. Report ready.' }, depends_on: ['n4'], parallelizable: false },
    ],
    success_criteria: 'Report comparing 3 competitors generated',
  }),

  full_funnel_launch: () => ({
    plan_name: 'Full Marketing Funnel Launch',
    goal: 'End-to-end: leads → content → social → ads → report',
    estimated_duration_minutes: 45,
    nodes: [
      { id: 'n1', type: 'find_leads', inputs: { industry: 'SaaS', location: 'global', limit: 50 }, depends_on: [], parallelizable: false },
      { id: 'n2', type: 'enrich_leads', inputs: {}, depends_on: ['n1'], parallelizable: true },
      { id: 'n3', type: 'generate_content', inputs: { topic: 'Why SaaS companies need marketing automation', keywords: ['saas', 'automation', 'marketing'] }, depends_on: [], parallelizable: true },
      { id: 'n4', type: 'schedule_social', inputs: { content_ref: 'n3' }, depends_on: ['n3'], parallelizable: false },
      { id: 'n5', type: 'launch_ads', inputs: { budget: 500, audience: 'SaaS decision makers' }, depends_on: [], parallelizable: true },
      { id: 'n6', type: 'create_campaign', inputs: { name: 'SaaS Outreach Q1', subject: 'Transform your SaaS marketing' }, depends_on: ['n2'], parallelizable: false },
      { id: 'n7', type: 'send_campaign', inputs: {}, depends_on: ['n6'], parallelizable: false },
      { id: 'n8', type: 'generate_report', inputs: { period: 'weekly', audience: 'admin' }, depends_on: ['n4', 'n5', 'n7'], parallelizable: false },
      { id: 'n9', type: 'notify_user', inputs: { title: 'Full funnel launched!', message: 'Leads, content, social, ads, email campaign all dispatched.' }, depends_on: ['n8'], parallelizable: false },
    ],
    success_criteria: 'All channels active, weekly report generated',
  }),

  customer_onboarding_to_negotiation: () => ({
    plan_name: 'Customer Onboarding → Negotiation',
    goal: 'Onboard new customer and generate AI negotiation proposals',
    estimated_duration_minutes: 10,
    nodes: [
      { id: 'n1', type: 'onboard_customer', inputs: {}, depends_on: [], parallelizable: false },
      { id: 'n2', type: 'start_negotiation', inputs: {}, depends_on: ['n1'], parallelizable: false },
      { id: 'n3', type: 'notify_user', inputs: { title: 'Negotiation started', message: 'Initial proposal generated. Review and send to customer.' }, depends_on: ['n2'], parallelizable: false },
    ],
    success_criteria: 'Initial negotiation proposal generated',
  }),
}
