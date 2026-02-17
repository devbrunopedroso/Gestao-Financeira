import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extraIncomeSchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'

/**
 * PUT /api/incomes/extra/[id]
 * Edita uma renda extra existente
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
    const validatedData = await extraIncomeSchema.validate(body)

    const extraIncome = await prisma.extraIncome.findUnique({
      where: { id },
    })

    if (!extraIncome) {
      return NextResponse.json(
        { message: 'Renda extra não encontrada' },
        { status: 404 }
      )
    }

    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: extraIncome.accountId,
        },
      },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json(
        { message: 'Sem permissão para editar' },
        { status: 403 }
      )
    }

    const updated = await prisma.extraIncome.update({
      where: { id },
      data: {
        amount: validatedData.amount,
        description: validatedData.description || null,
        month: validatedData.month,
        year: validatedData.year,
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Erro ao editar renda extra:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao editar renda extra' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/incomes/extra/[id]
 * Exclui uma renda extra
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

    const extraIncome = await prisma.extraIncome.findUnique({
      where: { id },
    })

    if (!extraIncome) {
      return NextResponse.json(
        { message: 'Renda extra não encontrada' },
        { status: 404 }
      )
    }

    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: extraIncome.accountId,
        },
      },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json(
        { message: 'Sem permissão para excluir' },
        { status: 403 }
      )
    }

    await prisma.extraIncome.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Renda extra excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir renda extra:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir renda extra' },
      { status: 500 }
    )
  }
}
