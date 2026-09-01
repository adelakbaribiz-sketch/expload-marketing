import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'

/**
 * NextAuth.js configuration.
 *
 * Uses the Credentials provider with bcrypt-hashed passwords stored in
 * the User table. The session callback enriches the JWT + session with
 * the user's tenantId and role so API routes can enforce multi-tenant
 * isolation without an extra DB lookup per request.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { tenant: true },
        })

        if (!user || !user.hashedPassword) {
          throw new Error('Invalid email or password')
        }

        if (!user.isActive) {
          throw new Error('Account is deactivated. Contact your administrator.')
        }

        if (!user.tenant?.isActive) {
          throw new Error('Tenant is inactive. Contact support.')
        }

        const isValid = await verifyPassword(credentials.password, user.hashedPassword)
        if (!isValid) {
          throw new Error('Invalid email or password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          tenantId: user.tenantId,
        } as any
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    // We use a modal-based login on the single `/` route, so we don't
    // need a dedicated sign-in page. This is kept as a fallback.
    signIn: '/',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
        token.tenantId = (user as any).tenantId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).tenantId = token.tenantId
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production-please-use-a-long-random-string',
}

// Password utilities are exported from @/lib/auth/password to avoid
// pulling in the full NextAuth config when only hashing is needed.
export { hashPassword, verifyPassword } from '@/lib/auth/password'
