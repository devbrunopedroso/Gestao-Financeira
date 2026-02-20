import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fixedExpenseSchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'

/**
 * PUT /api/expenses/fixed/[id]
 * Edita uma despesa fixa
 * US-12: Editar despesa fixa
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
    const validatedData = await fixedExpenseSchema.validate(body)

    const fixedExpense = await prisma.fixedExpense.findUnique({
      where: { id },
    })

    if (!fixedExpense) {
      return NextResponse.json(
        { message: 'Despesa fixa não encontrada' },
        { status: 404 }
      )
    }

    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: fixedExpense.accountId,
        },
      },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json(
        { message: 'Sem permissão para editar' },
        { status: 403 }
      )
    }

    const updated = await prisma.fixedExpense.update({
      where: { id },
      data: {
        amount: validatedData.amount,
        description: validatedData.description,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        categoryId: validatedData.categoryId || null,
        dueDay: validatedData.dueDay || null,
      },
      include: { category: true },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Erro ao editar despesa fixa:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao editar despesa fixa' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/expenses/fixed/[id]
 * Exclui uma despesa fixa
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

    const fixedExpense = await prisma.fixedExpense.findUnique({
      where: { id },
    })

    if (!fixedExpense) {
      return NextResponse.json(
        { message: 'Despesa fixa não encontrada' },
        { status: 404 }
      )
    }

    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: fixedExpense.accountId,
        },
      },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json(
        { message: 'Sem permissão para excluir' },
        { status: 403 }
      )
    }

    await prisma.fixedExpense.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Despesa fixa excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir despesa fixa:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir despesa fixa' },
      { status: 500 }
    )
  }
}
