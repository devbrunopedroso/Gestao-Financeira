import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { variableExpenseSchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'

/**
 * PUT /api/expenses/variable/[id]
 * Edita uma despesa variável
 * US-17: Editar despesa
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = await variableExpenseSchema.validate(body)

    const variableExpense = await prisma.variableExpense.findUnique({
      where: { id: params.id },
    })

    if (!variableExpense) {
      return NextResponse.json(
        { message: 'Despesa variável não encontrada' },
        { status: 404 }
      )
    }

    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: variableExpense.accountId,
        },
      },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json(
        { message: 'Sem permissão para editar' },
        { status: 403 }
      )
    }

    const updated = await prisma.variableExpense.update({
      where: { id: params.id },
      data: {
        amount: validatedData.amount,
        description: validatedData.description || null,
        date: new Date(validatedData.date),
        categoryId: validatedData.categoryId || null,
      },
      include: { category: true },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Erro ao editar despesa variável:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao editar despesa variável' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/expenses/variable/[id]
 * Exclui uma despesa variável
 * US-17: Excluir despesa
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const variableExpense = await prisma.variableExpense.findUnique({
      where: { id: params.id },
    })

    if (!variableExpense) {
      return NextResponse.json(
        { message: 'Despesa variável não encontrada' },
        { status: 404 }
      )
    }

    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: variableExpense.accountId,
        },
      },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json(
        { message: 'Sem permissão para excluir' },
        { status: 403 }
      )
    }

    await prisma.variableExpense.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Despesa variável excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir despesa variável:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir despesa variável' },
      { status: 500 }
    )
  }
}




