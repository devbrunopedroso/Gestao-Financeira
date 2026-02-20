import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canEdit } from '@/lib/permissions'

/**
 * DELETE /api/budgets/[id]
 * Remove um orçamento
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    const budget = await prisma.categoryBudget.findUnique({ where: { id } })
    if (!budget) {
      return NextResponse.json({ message: 'Orçamento não encontrado' }, { status: 404 })
    }

    const membership = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: session.user.id, accountId: budget.accountId } },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json({ message: 'Sem permissão' }, { status: 403 })
    }

    await prisma.categoryBudget.delete({ where: { id } })

    return NextResponse.json({ message: 'Orçamento excluído' })
  } catch (error) {
    console.error('Erro ao excluir orçamento:', error)
    return NextResponse.json({ message: 'Erro ao excluir orçamento' }, { status: 500 })
  }
}
