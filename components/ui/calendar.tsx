"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  addMonths,
  subMonths,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isWithinInterval,
} from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface CalendarProps {
  mode?: "single" | "range"
  selected?: Date | { from?: Date; to?: Date }
  onSelect?: (date: Date | { from?: Date; to?: Date } | undefined) => void
  className?: string
  disabled?: (date: Date) => boolean
}

function Calendar({
  mode = "single",
  selected,
  onSelect,
  className,
  disabled,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  const [rangeStart, setRangeStart] = React.useState<Date | undefined>(
    mode === "range" && selected && typeof selected === "object" && "from" in selected
      ? selected.from
      : undefined
  )

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const renderHeader = () => (
    <div className="flex items-center justify-between px-1 mb-4">
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={goToPreviousMonth}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="font-medium">{format(currentMonth, "MMMM yyyy")}</div>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={goToNextMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )

  const renderDays = () => {
    const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div
            key={day}
            className="text-center text-xs text-muted-foreground font-medium py-2"
          >
            {day}
          </div>
        ))}
      </div>
    )
  }

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const rows = []
    let days = []
    let day = startDate

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day
        const isDisabled = disabled?.(currentDay) ?? false
        const isCurrentMonth = isSameMonth(currentDay, monthStart)

        let isSelected = false
        let isRangeStart = false
        let isRangeEnd = false
        let isInRange = false

        if (mode === "single" && selected instanceof Date) {
          isSelected = isSameDay(currentDay, selected)
        } else if (mode === "range" && selected && typeof selected === "object" && "from" in selected) {
          const range = selected as { from?: Date; to?: Date }
          if (range.from) {
            isRangeStart = isSameDay(currentDay, range.from)
          }
          if (range.to) {
            isRangeEnd = isSameDay(currentDay, range.to)
          }
          if (range.from && range.to) {
            isInRange = isWithinInterval(currentDay, { start: range.from, end: range.to })
          }
          isSelected = isRangeStart || isRangeEnd
        }

        days.push(
          <button
            key={currentDay.toString()}
            type="button"
            disabled={isDisabled}
            onClick={() => {
              if (mode === "single") {
                onSelect?.(currentDay)
              } else if (mode === "range") {
                if (!rangeStart || (rangeStart && (selected as { from?: Date; to?: Date })?.to)) {
                  setRangeStart(currentDay)
                  onSelect?.({ from: currentDay, to: undefined })
                } else {
                  if (currentDay < rangeStart) {
                    onSelect?.({ from: currentDay, to: rangeStart })
                  } else {
                    onSelect?.({ from: rangeStart, to: currentDay })
                  }
                  setRangeStart(undefined)
                }
              }
            }}
            className={cn(
              "h-8 w-8 rounded-md text-sm font-normal transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              !isCurrentMonth && "text-muted-foreground opacity-50",
              isDisabled && "pointer-events-none opacity-50",
              isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              isInRange && !isSelected && "bg-accent",
              isRangeStart && "rounded-r-none",
              isRangeEnd && "rounded-l-none",
              isInRange && !isRangeStart && !isRangeEnd && "rounded-none"
            )}
          >
            {format(currentDay, "d")}
          </button>
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      )
      days = []
    }
    return <div className="space-y-1">{rows}</div>
  }

  return (
    <div className={cn("p-3", className)}>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
