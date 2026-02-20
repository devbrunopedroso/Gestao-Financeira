import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/accounts
 * Lista todas as contas financeiras do sistema
 */
export async function GET() {
  try {
    const isAdmin = await verifyAdminToken()
    if (!isAdmin) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const accounts = await prisma.financialAccount.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: {
            fixedIncomes: true,
            extraIncomes: true,
            fixedExpenses: true,
            variableExpenses: true,
            piggyBanks: true,
            assets: true,
          },
        },
      },
    })

    const result = accounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      createdAt: acc.createdAt,
      creator: acc.creator,
      members: acc.members.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
      memberCount: acc.members.length,
      counts: acc._count,
    }))

    return NextResponse.json({ accounts: result, total: result.length })
  } catch (error) {
    console.error('Erro ao listar contas:', error)
    return NextResponse.json({ message: 'Erro ao listar contas' }, { status: 500 })
  }
}
