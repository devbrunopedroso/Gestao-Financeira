import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canEdit } from '@/lib/permissions'

/**
 * GET /api/assets/[id]
 * Busca um patrimônio específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        piggyBank: {
          include: {
            transactions: { orderBy: { date: 'desc' } },
            skippedMonths: true,
          },
        },
      },
    })

    if (!asset) {
      return NextResponse.json(
        { message: 'Patrimônio não encontrado' },
        { status: 404 }
      )
    }

    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: asset.accountId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { message: 'Acesso negado' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      ...asset,
      estimatedValue: Number(asset.estimatedValue),
      yieldRate: asset.yieldRate ? Number(asset.yieldRate) : null,
      piggyBank: asset.piggyBank
        ? {
            ...asset.piggyBank,
            targetAmount: Number(asset.piggyBank.targetAmount),
            currentAmount: Number(asset.piggyBank.currentAmount),
            monthlyContribution: asset.piggyBank.monthlyContribution
              ? Number(asset.piggyBank.monthlyContribution)
              : null,
            progress: Math.min(
              Math.round(
                (Number(asset.piggyBank.currentAmount) /
                  Number(asset.piggyBank.targetAmount)) *
                  100
              ),
              100
            ),
            transactions: asset.piggyBank.transactions.map((t) => ({
              ...t,
              amount: Number(t.amount),
            })),
          }
        : null,
    })
  } catch (error) {
    console.error('Erro ao buscar patrimônio:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar patrimônio' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/assets/[id]
 * Edita um patrimônio
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

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { piggyBank: true },
    })

    if (!asset) {
      return NextResponse.json(
        { message: 'Patrimônio não encontrado' },
        { status: 404 }
      )
    }

    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: asset.accountId,
        },
      },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json(
        { message: 'Sem permissão para editar' },
        { status: 403 }
      )
    }

    const newStatus = body.status || asset.status
    const newMonthlyPayment = body.monthlyPayment !== undefined ? body.monthlyPayment : null

    // Se mudou para QUITADO, remover contribuição mensal da caixinha
    if (newStatus === 'QUITADO' && asset.status === 'EM_ANDAMENTO' && asset.piggyBankId) {
      await prisma.piggyBank.update({
        where: { id: asset.piggyBankId },
        data: { monthlyContribution: null },
      })
    }

    // Se mudou para EM_ANDAMENTO e não tem caixinha, criar uma
    if (newStatus === 'EM_ANDAMENTO' && !asset.piggyBankId) {
      const piggyBank = await prisma.piggyBank.create({
        data: {
          accountId: asset.accountId,
          name: `Patrimônio: ${body.name || asset.name}`,
          description: body.description || asset.description || null,
          targetAmount: body.estimatedValue || Number(asset.estimatedValue),
          startDate: new Date(),
          monthlyContribution: newMonthlyPayment,
        },
      })

      const updated = await prisma.asset.update({
        where: { id },
        data: {
          name: body.name || asset.name,
          description: body.description !== undefined ? body.description : asset.description,
          estimatedValue: body.estimatedValue || Number(asset.estimatedValue),
          status: newStatus as any,
          category: body.category || asset.category,
          yieldRate: body.yieldRate !== undefined ? body.yieldRate : (asset.yieldRate ? Number(asset.yieldRate) : null),
          endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : asset.endDate,
          piggyBankId: piggyBank.id,
        },
        include: { piggyBank: true },
      })

      return NextResponse.json({
        ...updated,
        estimatedValue: Number(updated.estimatedValue),
        yieldRate: updated.yieldRate ? Number(updated.yieldRate) : null,
        piggyBank: {
          ...piggyBank,
          targetAmount: Number(piggyBank.targetAmount),
          currentAmount: Number(piggyBank.currentAmount),
          monthlyContribution: piggyBank.monthlyContribution
            ? Number(piggyBank.monthlyContribution)
            : null,
          progress: 0,
        },
      })
    }

    // Atualizar caixinha vinculada se necessário
    if (asset.piggyBankId && newStatus === 'EM_ANDAMENTO') {
      await prisma.piggyBank.update({
        where: { id: asset.piggyBankId },
        data: {
          name: `Patrimônio: ${body.name || asset.name}`,
          description: body.description !== undefined ? body.description : asset.description,
          targetAmount: body.estimatedValue || Number(asset.estimatedValue),
          monthlyContribution: newMonthlyPayment,
        },
      })
    }

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        name: body.name || asset.name,
        description: body.description !== undefined ? body.description : asset.description,
        estimatedValue: body.estimatedValue || Number(asset.estimatedValue),
        status: newStatus as any,
        category: body.category || asset.category,
        yieldRate: body.yieldRate !== undefined ? body.yieldRate : (asset.yieldRate ? Number(asset.yieldRate) : null),
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : asset.endDate,
      },
      include: {
        piggyBank: {
          include: {
            transactions: { orderBy: { date: 'desc' }, take: 5 },
            skippedMonths: true,
          },
        },
      },
    })

    return NextResponse.json({
      ...updated,
      estimatedValue: Number(updated.estimatedValue),
      yieldRate: updated.yieldRate ? Number(updated.yieldRate) : null,
      piggyBank: updated.piggyBank
        ? {
            ...updated.piggyBank,
            targetAmount: Number(updated.piggyBank.targetAmount),
            currentAmount: Number(updated.piggyBank.currentAmount),
            monthlyContribution: updated.piggyBank.monthlyContribution
              ? Number(updated.piggyBank.monthlyContribution)
              : null,
            progress: Math.min(
              Math.round(
                (Number(updated.piggyBank.currentAmount) /
                  Number(updated.piggyBank.targetAmount)) *
                  100
              ),
              100
            ),
          }
        : null,
    })
  } catch (error: any) {
    console.error('Erro ao editar patrimônio:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao editar patrimônio' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/assets/[id]
 * Exclui um patrimônio e a caixinha vinculada
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

    const asset = await prisma.asset.findUnique({
      where: { id },
    })

    if (!asset) {
      return NextResponse.json(
        { message: 'Patrimônio não encontrado' },
        { status: 404 }
      )
    }

    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: asset.accountId,
        },
      },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json(
        { message: 'Sem permissão para excluir' },
        { status: 403 }
      )
    }

    // Excluir caixinha vinculada primeiro (se existir)
    if (asset.piggyBankId) {
      await prisma.asset.update({
        where: { id },
        data: { piggyBankId: null },
      })
      await prisma.piggyBank.delete({
        where: { id: asset.piggyBankId },
      })
    }

    await prisma.asset.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Patrimônio excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir patrimônio:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir patrimônio' },
      { status: 500 }
    )
  }
}
