import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/invitations/pending
 * Retorna convites pendentes para o usuario logado
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Nao autorizado' }, { status: 401 })
    }

    const invitations = await prisma.accountInvitation.findMany({
      where: {
        email: session.user.email,
        accepted: false,
        expiresAt: { gte: new Date() },
      },
      include: {
        account: {
          select: {
            name: true,
            creator: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(invitations)
  } catch (error) {
    console.error('Erro ao buscar convites pendentes:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar convites' },
      { status: 500 }
    )
  }
}
