import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Auto-accept pending invitations for this email
      if (user.id && user.email) {
        try {
          const pendingInvitations = await prisma.accountInvitation.findMany({
            where: {
              email: user.email,
              accepted: false,
              expiresAt: { gte: new Date() },
            },
          })
          for (const invitation of pendingInvitations) {
            const existing = await prisma.accountMember.findUnique({
              where: {
                userId_accountId: { userId: user.id, accountId: invitation.accountId },
              },
            })
            if (!existing) {
              await prisma.$transaction([
                prisma.accountMember.create({
                  data: {
                    userId: user.id,
                    accountId: invitation.accountId,
                    role: invitation.role,
                  },
                }),
                prisma.accountInvitation.update({
                  where: { id: invitation.id },
                  data: { accepted: true },
                }),
              ])
            }
          }
        } catch (error) {
          console.error('Erro ao auto-aceitar convites:', error)
        }
      }
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}

