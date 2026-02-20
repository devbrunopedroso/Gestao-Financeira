import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/users
 * Lista todos os usuarios do sistema
 */
export async function GET() {
  try {
    const isAdmin = await verifyAdminToken()
    if (!isAdmin) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        accountMemberships: {
          include: {
            account: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    const result = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      blocked: user.blocked,
      createdAt: user.createdAt,
      accounts: user.accountMemberships.map((m) => ({
        id: m.account.id,
        name: m.account.name,
        role: m.role,
      })),
      accountCount: user.accountMemberships.length,
    }))

    return NextResponse.json({ users: result, total: result.length })
  } catch (error) {
    console.error('Erro ao listar usuarios:', error)
    return NextResponse.json({ message: 'Erro ao listar usuarios' }, { status: 500 })
  }
}
