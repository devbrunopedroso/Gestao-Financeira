'use client'

import { MONTHS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

interface MonthNavigatorProps {
  month: number
  year: number
  onMonthChange: (month: number, year: number) => void
}

export function MonthNavigator({ month, year, onMonthChange }: MonthNavigatorProps) {
  const goToPreviousMonth = () => {
    if (month === 1) {
      onMonthChange(12, year - 1)
    } else {
      onMonthChange(month - 1, year)
    }
  }

  const goToNextMonth = () => {
    if (month === 12) {
      onMonthChange(1, year + 1)
    } else {
      onMonthChange(month + 1, year)
    }
  }

  const goToCurrentMonth = () => {
    const now = new Date()
    onMonthChange(now.getMonth() + 1, now.getFullYear())
  }

  const isCurrentMonth = () => {
    const now = new Date()
    return month === now.getMonth() + 1 && year === now.getFullYear()
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Button variant="outline" size="icon" onClick={goToPreviousMonth} className="h-8 w-8 sm:h-9 sm:w-9">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-center min-w-[140px] sm:min-w-[180px]">
        <h2 className="text-sm sm:text-lg font-semibold">
          {MONTHS[month - 1]} {year}
        </h2>
      </div>
      <Button variant="outline" size="icon" onClick={goToNextMonth} className="h-8 w-8 sm:h-9 sm:w-9">
        <ChevronRight className="h-4 w-4" />
      </Button>
      {!isCurrentMonth() && (
        <Button variant="ghost" size="sm" onClick={goToCurrentMonth} className="text-xs sm:text-sm gap-1">
          <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Mês atual</span>
          <span className="sm:hidden">Hoje</span>
        </Button>
      )}
    </div>
  )
}
