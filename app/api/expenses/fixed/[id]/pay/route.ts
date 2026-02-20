import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/expenses/fixed/[id]/pay
 * Marca despesa fixa como paga no mes/ano
 */
export async function POST(
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
    const { month, year } = body

    if (!month || !year) {
      return NextResponse.json({ message: 'month e year são obrigatórios' }, { status: 400 })
    }

    const expense = await prisma.fixedExpense.findUnique({ where: { id } })
    if (!expense) {
      return NextResponse.json({ message: 'Despesa não encontrada' }, { status: 404 })
    }

    const membership = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: session.user.id, accountId: expense.accountId } },
    })
    if (!membership) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const payment = await prisma.fixedExpensePayment.upsert({
      where: { fixedExpenseId_month_year: { fixedExpenseId: id, month, year } },
      update: { paidAt: new Date() },
      create: { fixedExpenseId: id, month, year },
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Erro ao marcar como pago:', error)
    return NextResponse.json({ message: 'Erro ao marcar como pago' }, { status: 500 })
  }
}

/**
 * DELETE /api/expenses/fixed/[id]/pay
 * Desmarcar pagamento do mes
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
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || '')
    const year = parseInt(searchParams.get('year') || '')

    if (!month || !year) {
      return NextResponse.json({ message: 'month e year são obrigatórios' }, { status: 400 })
    }

    const expense = await prisma.fixedExpense.findUnique({ where: { id } })
    if (!expense) {
      return NextResponse.json({ message: 'Despesa não encontrada' }, { status: 404 })
    }

    const membership = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: session.user.id, accountId: expense.accountId } },
    })
    if (!membership) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    await prisma.fixedExpensePayment.deleteMany({
      where: { fixedExpenseId: id, month, year },
    })

    return NextResponse.json({ message: 'Pagamento removido' })
  } catch (error) {
    console.error('Erro ao remover pagamento:', error)
    return NextResponse.json({ message: 'Erro ao remover pagamento' }, { status: 500 })
  }
}
