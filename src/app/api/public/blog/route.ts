import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * PUBLIC Blog API — no authentication required.
 * Returns published blog posts for the landing page blog section.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const featured = searchParams.get('featured') === 'true'
  const limit = Math.min(Number(searchParams.get('limit') || 10), 50)

  const posts = await db.blogPost.findMany({
    where: {
      status: 'published',
      ...(category ? { category } : {}),
      ...(featured ? { featured: true } : {}),
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      category: true,
      tags: true,
      coverImage: true,
      author: true,
      authorAvatar: true,
      viewCount: true,
      likeCount: true,
      readTime: true,
      publishedAt: true,
      featured: true,
    },
  })

  return NextResponse.json({ posts })
}
