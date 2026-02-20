import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMonthRange } from '@/lib/helpers'

/**
 * GET /api/expenses/fixed/reminders
 * Retorna despesas fixas com vencimento proximo e status de pagamento
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    if (!accountId) {
      return NextResponse.json({ message: 'accountId é obrigatório' }, { status: 400 })
    }

    const membership = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: session.user.id, accountId } },
    })
    if (!membership) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const { startDate, endDate } = getMonthRange(year, month)

    // Buscar despesas fixas ativas no mes com dueDay definido
    const fixedExpenses = await prisma.fixedExpense.findMany({
      where: {
        accountId,
        dueDay: { not: null },
        startDate: { lte: endDate },
        OR: [
          { endDate: null },
          { endDate: { gte: startDate } },
        ],
      },
      include: {
        category: true,
        payments: {
          where: { month, year },
        },
      },
      orderBy: { dueDay: 'asc' },
    })

    const today = new Date()
    const currentDay = today.getDate()
    const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year

    const reminders = fixedExpenses.map(expense => {
      const dueDay = expense.dueDay!
      const isPaid = expense.payments.length > 0
      const paidAt = isPaid ? expense.payments[0].paidAt : null

      // Calcular status
      let status: 'paid' | 'upcoming' | 'due_soon' | 'overdue' = 'upcoming'
      if (isPaid) {
        status = 'paid'
      } else if (isCurrentMonth) {
        const daysUntilDue = dueDay - currentDay
        if (daysUntilDue < 0) status = 'overdue'
        else if (daysUntilDue <= 3) status = 'due_soon'
      }

      return {
        id: expense.id,
        description: expense.description,
        amount: Number(expense.amount),
        dueDay,
        category: expense.category,
        status,
        isPaid,
        paidAt,
      }
    })

    return NextResponse.json({
      reminders,
      summary: {
        total: reminders.length,
        paid: reminders.filter(r => r.status === 'paid').length,
        pending: reminders.filter(r => r.status !== 'paid').length,
        overdue: reminders.filter(r => r.status === 'overdue').length,
        dueSoon: reminders.filter(r => r.status === 'due_soon').length,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar lembretes:', error)
    return NextResponse.json({ message: 'Erro ao buscar lembretes' }, { status: 500 })
  }
}
