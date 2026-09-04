'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/auth-store'
import { Clock, Eye, Heart, ArrowRight, BookOpen } from 'lucide-react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const CATEGORY_COLORS: Record<string, string> = {
  'Marketing': '#0A0A0B',
  'SEO': '#FF6A00',
  'Lead Gen': '#C9CDD3',
  'AI': '#7C4DFF',
  'Social': '#EC4899',
  'Ads': '#F59E0B',
  'Strategy': '#10B981',
}

export function BlogSection() {
  const { openAuthModal } = useAuthStore()
  const [selectedPost, setSelectedPost] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['public-blog'],
    queryFn: async () => {
      const res = await fetch('/api/public/blog?limit=6')
      if (!res.ok) return { posts: [] }
      return res.json()
    },
  })

  const posts = data?.posts ?? []

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Blog & Insights
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Marketing Insights & Automation Guides
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Learn how to leverage AI, automation, and data-driven strategies to grow your business.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">Blog posts coming soon!</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post: any) => (
              <Card key={post.id} className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group" onClick={() => setSelectedPost(post)}>
                <div className="h-32 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${CATEGORY_COLORS[post.category] ?? '#0A0A0B'}33, ${CATEGORY_COLORS[post.category] ?? '#0A0A0B'}11)` }}>
                  <div className="absolute inset-0 grid place-items-center">
                    <BookOpen className="h-12 w-12 opacity-20" style={{ color: CATEGORY_COLORS[post.category] ?? '#0A0A0B' }} />
                  </div>
                  {post.featured && <Badge className="absolute top-3 right-3 gap-1" style={{ background: CATEGORY_COLORS[post.category] ?? '#0A0A0B' }}>Featured</Badge>}
                </div>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: CATEGORY_COLORS[post.category] ?? '#0A0A0B', color: CATEGORY_COLORS[post.category] ?? '#0A0A0B' }}>{post.category}</Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {post.readTime} min</span>
                  </div>
                  <h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:text-brand-accent transition-colors">{post.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <div className="grid place-items-center h-6 w-6 rounded-full bg-[#0A0A0B] text-white text-[10px]">{post.author.charAt(0)}</div>
                      {post.author}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.viewCount}</span>
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {post.likeCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Button variant="outline" className="gap-2" onClick={() => openAuthModal('signup')}>
            Get More Insights <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedPost && (
        <Dialog open onOpenChange={(o) => !o && setSelectedPost(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto scroll-thin">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[10px]" style={{ borderColor: CATEGORY_COLORS[selectedPost.category] ?? '#0A0A0B', color: CATEGORY_COLORS[selectedPost.category] ?? '#0A0A0B' }}>{selectedPost.category}</Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {selectedPost.readTime} min read</span>
              </div>
              <DialogTitle className="text-xl">{selectedPost.title}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 pb-4 border-b">
              <span className="flex items-center gap-1.5">
                <div className="grid place-items-center h-6 w-6 rounded-full bg-[#0A0A0B] text-white text-[10px]">{selectedPost.author.charAt(0)}</div>
                {selectedPost.author} · {new Date(selectedPost.publishedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {selectedPost.viewCount}</span>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-muted-foreground mb-4 font-medium">{selectedPost.excerpt}</p>
              <ArticleContent content={selectedPost.content} />
            </div>
            <div className="mt-6 pt-6 border-t">
              <div className="rounded-xl bg-gradient-to-br from-[#0A0A0B] to-[#1F1F23] p-6 text-center text-white">
                <h4 className="font-semibold mb-2">Ready to Automate Your Marketing?</h4>
                <p className="text-sm text-white/70 mb-4">Join Expload Marketing and get access to all 10 marketing phases.</p>
                <Button variant="secondary" className="gap-2" onClick={() => { setSelectedPost(null); openAuthModal('signup') }}>
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}

function ArticleContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: any[] = []
  let inList = false
  let listItems: string[] = []

  lines.forEach((line, i) => {
    if (line.startsWith('## ')) {
      if (inList) { elements.push(<ul key={`ul-${i}`} className="list-disc pl-5 space-y-1 my-2 text-sm">{listItems.map((li, j) => <li key={j}>{renderInline(li)}</li>)}</ul>); inList = false; listItems = [] }
      elements.push(<h3 key={i} className="font-semibold text-base mt-4 mb-2">{renderInline(line.slice(3))}</h3>)
    } else if (line.startsWith('# ')) {
      if (inList) { elements.push(<ul key={`ul-${i}`} className="list-disc pl-5 space-y-1 my-2 text-sm">{listItems.map((li, j) => <li key={j}>{renderInline(li)}</li>)}</ul>); inList = false; listItems = [] }
      elements.push(<h2 key={i} className="font-bold text-lg mt-4 mb-2">{renderInline(line.slice(2))}</h2>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      inList = true
      listItems.push(line.slice(2))
    } else if (line.trim() === '') {
      if (inList) { elements.push(<ul key={`ul-${i}`} className="list-disc pl-5 space-y-1 my-2 text-sm">{listItems.map((li, j) => <li key={j}>{renderInline(li)}</li>)}</ul>); inList = false; listItems = [] }
    } else {
      if (inList) { elements.push(<ul key={`ul-${i}`} className="list-disc pl-5 space-y-1 my-2 text-sm">{listItems.map((li, j) => <li key={j}>{renderInline(li)}</li>)}</ul>); inList = false; listItems = [] }
      elements.push(<p key={i} className="text-sm leading-relaxed mb-2">{renderInline(line)}</p>)
    }
  })
  if (inList) elements.push(<ul key="ul-final" className="list-disc pl-5 space-y-1 my-2 text-sm">{listItems.map((li, j) => <li key={j}>{renderInline(li)}</li>)}</ul>)
  return <>{elements}</>
}

function renderInline(text: string): any {
  const parts: any[] = []
  let remaining = text
  let key = 0
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    if (boldMatch) {
      const idx = remaining.indexOf(boldMatch[0])
      if (idx > 0) parts.push(remaining.slice(0, idx))
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>)
      remaining = remaining.slice(idx + boldMatch[0].length)
    } else { parts.push(remaining); break }
  }
  return <>{parts}</>
}
