'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Link2, Plus, Copy, Trash2, QrCode, Share2, MousePointerClick,
  TrendingUp, Eye, ExternalLink, Facebook, Twitter, Linkedin,
  Mail, MessageCircle, Sparkles, CheckCircle, Send,
} from 'lucide-react'
import { useState } from 'react'

const CATEGORY_COLORS: Record<string, string> = {
  social: '#FF6A00', email: '#0A0A0B', ads: '#7C4DFF',
  blog: '#C9CDD3', affiliate: '#22c55e', qr: '#f59e0b', general: '#64748b',
}

export function PromoLinkView() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '', targetUrl: '', description: '',
    utmSource: '', utmMedium: '', utmCampaign: '', utmTerm: '', utmContent: '',
    category: 'general', qrCodeColor: '#0A0A0B', qrCodeSize: 300,
    expiresAt: '', variantLabel: '',
  })
  const [result, setResult] = useState<any>(null)
  const [selectedLink, setSelectedLink] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['promo-links'],
    queryFn: async () => {
      const res = await fetch('/api/promo-links')
      if (!res.ok) return { links: [] }
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/promo-links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: (data) => {
      setResult(data)
      toast.success('Promo link created!')
      qc.invalidateQueries({ queryKey: ['promo-links'] })
      setOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/promo-links/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Link deleted')
      qc.invalidateQueries({ queryKey: ['promo-links'] })
    },
  })

  const links = data?.links ?? []

  const handleCreate = () => {
    if (!form.name || !form.targetUrl) {
      toast.error('Name and URL are required')
      return
    }
    createMutation.mutate(form)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[#0A0A0B]" />
            Marketing Link Generator
          </h2>
          <p className="text-xs text-muted-foreground">Create trackable short links with UTM, QR codes, and social share buttons</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Create Link</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto scroll-thin">
            <DialogHeader><DialogTitle>Create Marketing Link</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Link Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Summer Sale Campaign" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['general', 'social', 'email', 'ads', 'blog', 'affiliate', 'qr'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Target URL *</Label>
                <Input value={form.targetUrl} onChange={(e) => setForm({ ...form, targetUrl: e.target.value })} placeholder="https://yoursite.com/landing-page" dir="ltr" />
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">UTM Parameters (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Source</Label><Input value={form.utmSource} onChange={(e) => setForm({ ...form, utmSource: e.target.value })} placeholder="newsletter" dir="ltr" /></div>
                  <div><Label>Medium</Label><Input value={form.utmMedium} onChange={(e) => setForm({ ...form, utmMedium: e.target.value })} placeholder="email" dir="ltr" /></div>
                  <div><Label>Campaign</Label><Input value={form.utmCampaign} onChange={(e) => setForm({ ...form, utmCampaign: e.target.value })} placeholder="summer_sale" dir="ltr" /></div>
                  <div><Label>Term</Label><Input value={form.utmTerm} onChange={(e) => setForm({ ...form, utmTerm: e.target.value })} placeholder="marketing+tool" dir="ltr" /></div>
                  <div><Label>Content</Label><Input value={form.utmContent} onChange={(e) => setForm({ ...form, utmContent: e.target.value })} placeholder="banner_top" dir="ltr" /></div>
                  <div><Label>Variant (A/B)</Label><Input value={form.variantLabel} onChange={(e) => setForm({ ...form, variantLabel: e.target.value })} placeholder="A" dir="ltr" /></div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">QR Code Settings</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>QR Color</Label>
                    <div className="flex gap-2 mt-1">
                      {['#0A0A0B', '#FF6A00', '#C9CDD3', '#22c55e', '#7C4DFF'].map(c => (
                        <button key={c} className={`h-8 w-8 rounded-md border-2 ${form.qrCodeColor === c ? 'border-foreground' : 'border-transparent'}`} style={{ background: c }} onClick={() => setForm({ ...form, qrCodeColor: c })} />
                      ))}
                    </div>
                  </div>
                  <div><Label>QR Size (px)</Label><Input type="number" value={form.qrCodeSize} onChange={(e) => setForm({ ...form, qrCodeSize: Number(e.target.value) })} dir="ltr" /></div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!form.name || !form.targetUrl || createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create Link'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><Link2 className="h-4 w-4 text-[#0A0A0B] mb-1" /><p className="text-2xl font-bold">{links.length}</p><p className="text-xs text-muted-foreground">Total Links</p></CardContent></Card>
        <Card><CardContent className="p-4"><MousePointerClick className="h-4 w-4 text-[#FF6A00] mb-1" /><p className="text-2xl font-bold">{links.reduce((s: number, l: any) => s + l.totalClicks, 0)}</p><p className="text-xs text-muted-foreground">Total Clicks</p></CardContent></Card>
        <Card><CardContent className="p-4"><TrendingUp className="h-4 w-4 text-emerald-600 mb-1" /><p className="text-2xl font-bold">{links.filter((l: any) => l.isActive).length}</p><p className="text-xs text-muted-foreground">Active Links</p></CardContent></Card>
        <Card><CardContent className="p-4"><QrCode className="h-4 w-4 text-violet-600 mb-1" /><p className="text-2xl font-bold">{links.filter((l: any) => l.category === 'qr').length}</p><p className="text-xs text-muted-foreground">QR Codes</p></CardContent></Card>
      </div>

      {/* Result card (after creation) */}
      {result && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <p className="font-medium text-sm">Link Created Successfully!</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted p-2 text-xs font-mono break-all" dir="ltr">{result.link.shortUrl}</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(result.link.shortUrl)} aria-label="Copy link"><Copy className="h-3.5 w-3.5" /></Button>
            </div>
            {result.qrCodeData && (
              <div className="flex gap-4 items-center">
                <img src={result.qrCodeData} alt="QR Code" className="h-24 w-24 rounded-lg border" />
                <div>
                  <p className="text-xs font-medium mb-1">Share on social media:</p>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => window.open(result.shareLinks.facebook, '_blank')}><Facebook className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => window.open(result.shareLinks.twitter, '_blank')}><Twitter className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => window.open(result.shareLinks.linkedin, '_blank')}><Linkedin className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => window.open(result.shareLinks.whatsapp, '_blank')}><MessageCircle className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => window.open(result.shareLinks.telegram, '_blank')}><Send className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => window.open(result.shareLinks.email, '_blank')}><Mail className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            )}
            <Button size="sm" variant="ghost" onClick={() => setResult(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      {/* Links List */}
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : links.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><Link2 className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No promo links yet. Create your first trackable link!</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {links.map((link: any) => (
            <Card key={link.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="grid place-items-center h-9 w-9 rounded-lg text-white shrink-0" style={{ background: CATEGORY_COLORS[link.category] ?? '#64748b' }}>
                      <Link2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{link.name}</p>
                        {link.variantLabel && <Badge variant="outline" className="text-[9px]">{link.variantLabel}</Badge>}
                        <Badge variant="outline" className="text-[9px] capitalize">{link.category}</Badge>
                      </div>
                      <code className="text-[10px] font-mono text-muted-foreground truncate block" dir="ltr">{link.shortUrl}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-center">
                      <p className="text-sm font-bold">{link.totalClicks}</p>
                      <p className="text-[9px] text-muted-foreground">clicks</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyToClipboard(link.shortUrl)} aria-label="Copy link"><Copy className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedLink(link)} aria-label="View link details"><Eye className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => { if (confirm(`Delete promo link "${link.name}"? Any already-shared link will stop working.`)) deleteMutation.mutate(link.id) }} aria-label="Delete promo link"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      {selectedLink && (
        <Dialog open onOpenChange={(o) => !o && setSelectedLink(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{selectedLink.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Short URL</Label>
                <div className="flex gap-2">
                  <code className="flex-1 rounded-md bg-muted p-2 text-xs font-mono break-all" dir="ltr">{selectedLink.shortUrl}</code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(selectedLink.shortUrl)}><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div>
                <Label>Target URL</Label>
                <code className="block rounded-md bg-muted p-2 text-xs font-mono break-all" dir="ltr">{selectedLink.targetUrl}</code>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted/50 p-2"><MousePointerClick className="h-4 w-4 mx-auto text-[#FF6A00] mb-1" /><p className="font-bold">{selectedLink.totalClicks}</p><p className="text-[9px] text-muted-foreground">Clicks</p></div>
                <div className="rounded-md bg-muted/50 p-2"><TrendingUp className="h-4 w-4 mx-auto text-emerald-600 mb-1" /><p className="font-bold">{selectedLink.conversions}</p><p className="text-[9px] text-muted-foreground">Conversions</p></div>
                <div className="rounded-md bg-muted/50 p-2"><Eye className="h-4 w-4 mx-auto text-[#0A0A0B] mb-1" /><p className="font-bold">{selectedLink._count?.clicks || 0}</p><p className="text-[9px] text-muted-foreground">Records</p></div>
              </div>
              {selectedLink.utmSource && (
                <div className="flex flex-wrap gap-1">
                  {['utmSource', 'utmMedium', 'utmCampaign', 'utmTerm', 'utmContent'].map(k => {
                    const v = (selectedLink as any)[k]
                    return v ? <Badge key={k} variant="secondary" className="text-[9px]">{k.replace('utm','').toLowerCase()}: {v}</Badge> : null
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

