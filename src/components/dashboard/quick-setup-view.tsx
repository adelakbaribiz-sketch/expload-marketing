'use client'

import { useMutation } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Zap, Check, Loader2, Rocket, Sparkles } from 'lucide-react'
import { useState } from 'react'

export function QuickSetupView() {
  const [form, setForm] = useState({ businessName: '', industry: 'general', budget: '200', webhookUrl: '' })
  const [results, setResults] = useState<string[] | null>(null)

  const setupMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/quick-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, budget: Number(payload.budget) }),
      })
      if (!res.ok) throw new Error('setup failed')
      return res.json()
    },
    onSuccess: (data) => {
      setResults(data.results)
      toast.success(`Setup complete! ${data.stepsCompleted} items configured.`)
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-[#FF6A00]" />
          1-Click Quick Setup
        </h2>
        <p className="text-xs text-muted-foreground">Auto-configure your entire marketing platform in one click — minimal complexity, maximum results</p>
      </div>

      {!results ? (
        <Card className="border-[#FF6A00]/20 bg-gradient-to-br from-[#FF6A00]/5 to-[#FF8A3D]/5 max-w-2xl mx-auto">
          <CardContent className="p-6 space-y-4">
            <div className="text-center mb-4">
              <div className="grid place-items-center h-16 w-16 rounded-2xl bg-gradient-to-br from-[#FF6A00] to-[#FF8A3D] text-white mx-auto mb-3 shadow-lg">
                <Rocket className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-lg">Launch Your Marketing in 1 Click</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Fill in 4 fields and we'll auto-configure: project, demo leads, email templates, fraud rules, funnel, journey, club membership, goals, and more.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Business Name</Label>
                <Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Acme Inc." />
              </div>
              <div>
                <Label>Industry</Label>
                <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['general', 'technology', 'retail', 'services', 'manufacturing', 'food', 'health', 'education', 'real_estate', 'finance'].map(i => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monthly Budget ($)</Label>
                <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} dir="ltr" />
              </div>
              <div className="col-span-2">
                <Label>Webhook URL (optional — for real-time event forwarding)</Label>
                <Input value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} placeholder="https://yoursite.com/webhook" dir="ltr" />
              </div>
            </div>

            <Button className="w-full gap-2 bg-[#FF6A00] hover:bg-[#FF8A3D]" size="lg" onClick={() => setupMutation.mutate(form)} disabled={!form.businessName || setupMutation.isPending}>
              {setupMutation.isPending ? <><Loader2 className="h-5 w-5 animate-spin" /> Setting up…</> : <><Zap className="h-5 w-5" /> Launch in 1 Click</>}
            </Button>

            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-muted-foreground">
              {['Project', 'Leads', 'Email Template', 'Fraud Rules', 'Funnel', 'Journey', 'Club', 'Goals', 'Roadmap'].map(item => (
                <Badge key={item} variant="outline" className="text-[9px]">{item}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-2xl mx-auto border-emerald-500/30">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <div className="grid place-items-center h-16 w-16 rounded-2xl bg-emerald-500 text-white mx-auto mb-3 shadow-lg">
                <Check className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-lg text-emerald-600">Setup Complete!</h3>
              <p className="text-sm text-muted-foreground mt-1">Your marketing platform is ready to go.</p>
            </div>
            <div className="space-y-2 mb-4">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
            <Button className="w-full gap-2" size="lg" onClick={() => setResults(null)}>
              <Sparkles className="h-5 w-5" />
              Start Using the Platform
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
