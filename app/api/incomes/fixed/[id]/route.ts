import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fixedIncomeSchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'

/**
 * PUT /api/incomes/fixed/[id]
 * Edita uma renda fixa existente
 * US-07: Editar renda fixa
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
    const validatedData = await fixedIncomeSchema.validate(body)

    // Buscar a renda fixa para verificar permissões
    const fixedIncome = await prisma.fixedIncome.findUnique({
      where: { id },
      include: { account: true },
    })

    if (!fixedIncome) {
      return NextResponse.json(
        { message: 'Renda fixa não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissões
    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: fixedIncome.accountId,
        },
      },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json(
        { message: 'Sem permissão para editar' },
        { status: 403 }
      )
    }

    const updated = await prisma.fixedIncome.update({
      where: { id },
      data: {
        amount: validatedData.amount,
        description: validatedData.description || null,
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Erro ao editar renda fixa:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao editar renda fixa' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/incomes/fixed/[id]
 * Exclui uma renda fixa
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

    const fixedIncome = await prisma.fixedIncome.findUnique({
      where: { id },
    })

    if (!fixedIncome) {
      return NextResponse.json(
        { message: 'Renda fixa não encontrada' },
        { status: 404 }
      )
    }

    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: fixedIncome.accountId,
        },
      },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json(
        { message: 'Sem permissão para excluir' },
        { status: 403 }
      )
    }

    await prisma.fixedIncome.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Renda fixa excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir renda fixa:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir renda fixa' },
      { status: 500 }
    )
  }
}
