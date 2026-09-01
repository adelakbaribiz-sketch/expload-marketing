'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Upload, Globe, FileText, Wand2, ArrowRight, Check, Loader2 } from 'lucide-react'

const STEPS = [
  { id: 1, name: 'Customer Info', icon: '👤' },
  { id: 2, name: 'Business', icon: '🏢' },
  { id: 3, name: 'Website Crawl', icon: '🌐' },
  { id: 4, name: 'Documents', icon: '📄' },
  { id: 5, name: 'System Prompt', icon: '⚙️' },
  { id: 6, name: 'Start Negotiation', icon: '🤝' },
]

export function OnboardingWizardView() {
  const qc = useQueryClient()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [form, setForm] = useState<any>({})
  const [crawlUrl, setCrawlUrl] = useState('')
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['onboarding-session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null
      const res = await fetch(`/api/onboarding/sessions`)
      if (!res.ok) return null
      const data = await res.json()
      return data.sessions?.find((s: any) => s.id === sessionId) ?? null
    },
    enabled: !!sessionId,
  })

  const createSession = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/onboarding/sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: (data) => {
      setSessionId(data.session.id)
      setCurrentStep(2)
      toast.success('Onboarding session created')
    },
  })

  const updateSession = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/onboarding/sessions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId, ...data }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding-session', sessionId] })
    },
  })

  const crawl = useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch('/api/onboarding/crawl', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, url }),
      })
      if (!res.ok) throw new Error('Crawl failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Crawled ${data.result.charCount.toLocaleString()} chars`)
      updateSession.mutate({ crawlStatus: 'completed' })
    },
    onError: () => toast.error('Crawl failed'),
  })

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('sessionId', sessionId!)
      fd.append('file', file)
      const res = await fetch('/api/onboarding/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      return res.json()
    },
    onSuccess: (data) => {
      setUploadMsg(`${data.doc.filename}: ${data.doc.charCount?.toLocaleString() ?? 0} chars extracted`)
      toast.success('Document processed')
    },
    onError: () => toast.error('Upload failed'),
  })

  const startNegotiation = useMutation({
    mutationFn: async () => {
      // Save system prompt + final context, then create negotiation session
      await updateSession.mutateAsync({
        customSystemPrompt: form.systemPrompt,
        status: 'completed',
      })
      const res = await fetch('/api/negotiation/sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboardingId: sessionId,
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          projectName: form.projectName ?? form.businessName ?? 'New Project',
          projectDescription: form.projectDescription ?? '',
          contextSummary: sessionData?.extractedContext ?? '',
          systemPrompt: form.systemPrompt,
          customerBudget: form.budget ? parseFloat(form.budget) : undefined,
          customerTimeline: form.timeline,
          customerPriorities: form.priorities ? form.priorities.split(',').map((s: string) => s.trim()) : [],
        }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success('Negotiation started — initial proposal generated!')
      // Could navigate to negotiation view
      window.location.hash = `#negotiation-${data.session.id}`
    },
  })

  if (isLoading) return <Skeleton className="h-96" />

  const progress = (currentStep / STEPS.length) * 100

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wand2 className="h-8 w-8" style={{ color: '#0A2A3A' }} />
          Onboarding Wizard
        </h1>
        <p className="text-muted-foreground mt-1">
          Collect customer info, crawl website, ingest documents, generate negotiation proposals
        </p>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="flex justify-between">
        {STEPS.map(s => (
          <div key={s.id} className={`flex flex-col items-center ${s.id < currentStep ? 'opacity-50' : ''}`}>
            <div className={`h-10 w-10 rounded-full grid place-items-center text-lg ${s.id === currentStep ? 'bg-[#0A2A3A] text-white' : s.id < currentStep ? 'bg-emerald-500 text-white' : 'bg-muted'}`}>
              {s.id < currentStep ? <Check className="h-5 w-5" /> : s.icon}
            </div>
            <span className="text-xs mt-1">{s.name}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {currentStep === 1 && (
            <>
              <h2 className="text-xl font-semibold">Step 1: Customer Information</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>Customer Name *</Label><Input value={form.customerName ?? ''} onChange={e => setForm({ ...form, customerName: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.customerEmail ?? ''} onChange={e => setForm({ ...form, customerEmail: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.customerPhone ?? ''} onChange={e => setForm({ ...form, customerPhone: e.target.value })} /></div>
                <div><Label>Project Name</Label><Input value={form.projectName ?? ''} onChange={e => setForm({ ...form, projectName: e.target.value })} /></div>
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={!form.customerName}
                  onClick={() => createSession.mutate({
                    customerName: form.customerName,
                    customerEmail: form.customerEmail,
                    customerPhone: form.customerPhone,
                  })}
                >
                  {createSession.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Create Session <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <h2 className="text-xl font-semibold">Step 2: Business & Project Brief</h2>
              <div className="grid gap-3">
                <div><Label>Business Name</Label><Input value={form.businessName ?? ''} onChange={e => setForm({ ...form, businessName: e.target.value })} /></div>
                <div><Label>Business Website</Label><Input value={form.businessWebsite ?? ''} onChange={e => setForm({ ...form, businessWebsite: e.target.value })} placeholder="https://example.com" /></div>
                <div><Label>Industry</Label><Input value={form.industry ?? ''} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="SaaS, E-commerce, Healthcare..." /></div>
                <div><Label>Project Description</Label><Textarea rows={4} value={form.projectDescription ?? ''} onChange={e => setForm({ ...form, projectDescription: e.target.value })} placeholder="What does the customer want built?" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Budget (USD)</Label><Input type="number" value={form.budget ?? ''} onChange={e => setForm({ ...form, budget: e.target.value })} /></div>
                  <div><Label>Timeline Preference</Label><Input value={form.timeline ?? ''} onChange={e => setForm({ ...form, timeline: e.target.value })} placeholder="3 months, ASAP, flexible..." /></div>
                </div>
                <div><Label>Top Priorities (comma-separated)</Label><Input value={form.priorities ?? ''} onChange={e => setForm({ ...form, priorities: e.target.value })} placeholder="speed, cost, quality, scalability..." /></div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
                <Button onClick={() => {
                  updateSession.mutate({
                    businessName: form.businessName,
                    businessWebsite: form.businessWebsite,
                    industry: form.industry,
                  })
                  setCurrentStep(3)
                }}>
                  Save & Continue <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <h2 className="text-xl font-semibold">Step 3: Crawl Website (Optional)</h2>
              <p className="text-sm text-muted-foreground">Enter the business website URL. We'll extract the main text and add it to the LLM context.</p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com"
                  value={crawlUrl || form.businessWebsite || ''}
                  onChange={e => setCrawlUrl(e.target.value)}
                />
                <Button
                  disabled={!crawlUrl || crawl.isPending}
                  onClick={() => crawl.mutate(crawlUrl)}
                >
                  {crawl.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Globe className="h-4 w-4 mr-1" />}
                  Crawl
                </Button>
              </div>
              {sessionData?.crawlStatus === 'completed' && (
                <Badge variant="outline" className="text-emerald-600">✓ Website crawled — context updated</Badge>
              )}
              {sessionData?.crawlStatus === 'failed' && (
                <Badge variant="outline" className="text-red-600">✗ Crawl failed: {sessionData.crawlError}</Badge>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>Back</Button>
                <Button onClick={() => setCurrentStep(4)}>Skip or Continue <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </>
          )}

          {currentStep === 4 && (
            <>
              <h2 className="text-xl font-semibold">Step 4: Upload Documents (Optional)</h2>
              <p className="text-sm text-muted-foreground">Upload PDF, DOCX, TXT, MD, or HTML files. We'll extract text and add to knowledge base.</p>
              <div className="border-2 border-dashed rounded p-8 text-center">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept=".pdf,.docx,.txt,.md,.html,.htm"
                  className="hidden"
                  onChange={e => {
                    const files = e.target.files
                    if (files && files[0]) upload.mutate(files[0])
                  }}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <div className="font-medium">Click to upload</div>
                  <div className="text-xs text-muted-foreground">PDF, DOCX, TXT, MD, HTML · max 10MB</div>
                </label>
              </div>
              {upload.isPending && <div className="text-sm text-blue-600 flex items-center gap-1"><Loader2 className="h-4 w-4 animate-spin" /> Processing...</div>}
              {uploadMsg && <div className="text-sm text-emerald-600 flex items-center gap-1"><FileText className="h-4 w-4" /> {uploadMsg}</div>}
              {sessionData && sessionData.docsProcessed > 0 && (
                <Badge variant="outline" className="text-emerald-600">✓ {sessionData.docsProcessed} document(s) processed</Badge>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>Back</Button>
                <Button onClick={() => setCurrentStep(5)}>Continue <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </>
          )}

          {currentStep === 5 && (
            <>
              <h2 className="text-xl font-semibold">Step 5: Custom System Prompt (Optional)</h2>
              <p className="text-sm text-muted-foreground">Override the default LLM system prompt for negotiation. Useful for industry-specific tone or pricing rules.</p>
              <Textarea
                rows={8}
                placeholder="e.g. You are a senior project manager at a fintech-focused agency. Always emphasize compliance, security, and regulatory considerations. Pricing should reflect enterprise-level engagements..."
                value={form.systemPrompt ?? ''}
                onChange={e => setForm({ ...form, systemPrompt: e.target.value })}
              />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(4)}>Back</Button>
                <Button onClick={() => setCurrentStep(6)}>Continue <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </>
          )}

          {currentStep === 6 && (
            <>
              <h2 className="text-xl font-semibold">Step 6: Review & Start Negotiation</h2>
              <div className="bg-muted/30 rounded p-4 space-y-1 text-sm">
                <div><strong>Customer:</strong> {form.customerName} ({form.customerEmail})</div>
                <div><strong>Business:</strong> {form.businessName ?? '—'}</div>
                <div><strong>Project:</strong> {form.projectName ?? '—'}</div>
                <div><strong>Budget:</strong> ${form.budget ?? '—'} · <strong>Timeline:</strong> {form.timeline ?? '—'}</div>
                <div><strong>Website crawled:</strong> {sessionData?.crawlStatus === 'completed' ? 'Yes' : 'No'}</div>
                <div><strong>Documents:</strong> {sessionData?.docsProcessed ?? 0}</div>
                <div><strong>Custom system prompt:</strong> {form.systemPrompt ? 'Yes' : 'No'}</div>
              </div>
              <p className="text-sm text-muted-foreground">
                Clicking "Start Negotiation" will use the LLM Aggregator to generate the initial proposal.
                You'll then be able to accept or reject, triggering the 3-step fallback negotiation flow.
              </p>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(5)}>Back</Button>
                <Button
                  disabled={startNegotiation.isPending}
                  onClick={() => startNegotiation.mutate()}
                >
                  {startNegotiation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  🤝 Start Negotiation
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
