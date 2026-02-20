import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canEdit } from '@/lib/permissions'

/**
 * PUT /api/goals/[id]
 * Atualiza uma meta financeira
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const goal = await prisma.financialGoal.findUnique({ where: { id } })
    if (!goal) {
      return NextResponse.json({ message: 'Meta não encontrada' }, { status: 404 })
    }

    const membership = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: session.user.id, accountId: goal.accountId } },
    })
    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json({ message: 'Sem permissão' }, { status: 403 })
    }

    const updated = await prisma.financialGoal.update({
      where: { id },
      data: {
        name: body.name || goal.name,
        targetValue: body.targetValue !== undefined ? body.targetValue : Number(goal.targetValue),
        currentValue: body.currentValue !== undefined ? body.currentValue : Number(goal.currentValue),
        deadline: body.deadline !== undefined ? (body.deadline ? new Date(body.deadline) : null) : goal.deadline,
      },
    })

    return NextResponse.json({
      ...updated,
      targetValue: Number(updated.targetValue),
      currentValue: Number(updated.currentValue),
    })
  } catch (error) {
    console.error('Erro ao atualizar meta:', error)
    return NextResponse.json({ message: 'Erro ao atualizar meta' }, { status: 500 })
  }
}

/**
 * DELETE /api/goals/[id]
 * Remove uma meta financeira
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

    const goal = await prisma.financialGoal.findUnique({ where: { id } })
    if (!goal) {
      return NextResponse.json({ message: 'Meta não encontrada' }, { status: 404 })
    }

    const membership = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: session.user.id, accountId: goal.accountId } },
    })
    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json({ message: 'Sem permissão' }, { status: 403 })
    }

    await prisma.financialGoal.delete({ where: { id } })

    return NextResponse.json({ message: 'Meta excluída' })
  } catch (error) {
    console.error('Erro ao excluir meta:', error)
    return NextResponse.json({ message: 'Erro ao excluir meta' }, { status: 500 })
  }
}
