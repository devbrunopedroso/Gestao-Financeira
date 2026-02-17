import { Prisma } from '@prisma/client'

/**
 * Formata um valor decimal para moeda brasileira
 */
export function formatCurrency(value: number | Prisma.Decimal | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue)
}

/**
 * Calcula o progresso percentual de uma caixinha
 */
export function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0
  return Math.min(Math.round((current / target) * 100), 100)
}

/**
 * Calcula o valor mensal sugerido para uma caixinha
 */
export function calculateMonthlyAmount(
  target: number,
  current: number,
  monthsRemaining: number
): number {
  if (monthsRemaining <= 0) return 0
  const remaining = target - current
  return remaining / monthsRemaining
}

/**
 * Calcula meses entre duas datas
 */
export function monthsBetween(startDate: Date, endDate: Date): number {
  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth())
  return Math.max(0, months)
}

/**
 * Obtém o primeiro e último dia do mês
 */
export function getMonthRange(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59, 999)
  return { startDate, endDate }
}

/**
 * Verifica se uma data está dentro de um período
 */
export function isDateInRange(
  date: Date,
  startDate: Date,
  endDate: Date | null
): boolean {
  if (!endDate) return date >= startDate
  return date >= startDate && date <= endDate
}

/**
 * Filtra caixinhas ativas com contribuicao mensal para um mes/ano especifico.
 * Exclui caixinhas puladas, completas ou fora do periodo.
 */
export function getActivePiggyBankContributions<T extends {
  startDate: Date | string
  endDate: Date | string | null
  months: number | null
  currentAmount: any
  targetAmount: any
  monthlyContribution: any
  skippedMonths: Array<{ month: number; year: number }>
}>(piggyBanks: T[], monthStart: Date, monthEnd: Date, month: number, year: number): T[] {
  return piggyBanks.filter((pb) => {
    const contribution = Number(pb.monthlyContribution)
    if (!contribution || contribution <= 0) return false

    const pbStart = new Date(pb.startDate)
    let pbEnd: Date | null = null
    if (pb.endDate) {
      pbEnd = new Date(pb.endDate)
    } else if (pb.months) {
      pbEnd = new Date(pbStart)
      pbEnd.setMonth(pbEnd.getMonth() + pb.months)
    }

    const isActive = pbStart <= monthEnd && (!pbEnd || pbEnd >= monthStart)
    const isSkipped = pb.skippedMonths.some(s => s.month === month && s.year === year)
    const isCompleted = Number(pb.currentAmount) >= Number(pb.targetAmount)

    return isActive && !isSkipped && !isCompleted
  })
}

