"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import {
  format,
  subDays,
  subYears,
  startOfQuarter,
  subQuarters,
  endOfQuarter,
  startOfMonth,
} from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRange {
  from: Date
  to: Date
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  presets?: { label: string; range: DateRange | null }[]
  className?: string
  showComparison?: boolean
  comparisonEnabled?: boolean
  onComparisonToggle?: (enabled: boolean) => void
  /** Earliest date allowed for "All Time" option */
  allTimeStartDate?: Date
}

// Helper to get last quarter date range
function getLastQuarter(): DateRange {
  const lastQuarterEnd = endOfQuarter(subQuarters(new Date(), 1))
  const lastQuarterStart = startOfQuarter(subQuarters(new Date(), 1))
  return { from: lastQuarterStart, to: lastQuarterEnd }
}

// Default "all time" start date (can be overridden via props)
const DEFAULT_ALL_TIME_START = new Date(2020, 0, 1)

const createDefaultPresets = (allTimeStart: Date): { label: string; range: DateRange | null }[] => [
  {
    label: "Last 7 days",
    range: { from: subDays(new Date(), 7), to: new Date() },
  },
  {
    label: "Last 30 days",
    range: { from: subDays(new Date(), 30), to: new Date() },
  },
  {
    label: "Last 60 days",
    range: { from: subDays(new Date(), 60), to: new Date() },
  },
  {
    label: "Last 90 days",
    range: { from: subDays(new Date(), 90), to: new Date() },
  },
  {
    label: "Last quarter",
    range: getLastQuarter(),
  },
  {
    label: "Last year",
    range: { from: subYears(new Date(), 1), to: new Date() },
  },
  {
    label: "All time",
    range: { from: allTimeStart, to: new Date() },
  },
  {
    label: "Custom",
    range: null, // null indicates custom mode
  },
]

function formatPreviousPeriod(range: DateRange): string {
  const daysDiff = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
  const prevFrom = subDays(range.from, daysDiff)
  const prevTo = subDays(range.to, daysDiff)
  return `${format(prevFrom, "MMM d")} - ${format(prevTo, "MMM d, yyyy")}`
}

export function DateRangePicker({
  value,
  onChange,
  presets,
  className,
  showComparison = false,
  comparisonEnabled = false,
  onComparisonToggle,
  allTimeStartDate = DEFAULT_ALL_TIME_START,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isCustomMode, setIsCustomMode] = React.useState(false)
  const [pendingRange, setPendingRange] = React.useState<{ from?: Date; to?: Date } | undefined>(undefined)

  // Separate month state for each calendar
  const [startCalendarMonth, setStartCalendarMonth] = React.useState<Date>(
    startOfMonth(value?.from || new Date())
  )
  const [endCalendarMonth, setEndCalendarMonth] = React.useState<Date>(
    startOfMonth(value?.to || new Date())
  )

  const defaultPresets = React.useMemo(
    () => createDefaultPresets(allTimeStartDate),
    [allTimeStartDate]
  )
  const activePresets = presets || defaultPresets

  const handlePresetClick = (preset: { label: string; range: DateRange | null }) => {
    if (preset.range === null) {
      // Custom mode - show calendar and wait for selection
      setIsCustomMode(true)
      setPendingRange(value)
      // Set calendars to show the current range's months
      setStartCalendarMonth(startOfMonth(value?.from || new Date()))
      setEndCalendarMonth(startOfMonth(value?.to || new Date()))
    } else {
      onChange(preset.range)
      setIsCustomMode(false)
      setIsOpen(false)
    }
  }

  const handleCalendarSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      setPendingRange(range)
      // Only apply when both dates are selected
      if (range.from && range.to) {
        onChange({ from: range.from, to: range.to })
        if (!isCustomMode) {
          setIsOpen(false)
        }
      }
    }
  }

  const handleApplyCustom = () => {
    if (pendingRange?.from && pendingRange?.to) {
      onChange({ from: pendingRange.from, to: pendingRange.to })
      setIsOpen(false)
      setIsCustomMode(false)
    }
  }

  const handleCancel = () => {
    setIsCustomMode(false)
    setPendingRange(undefined)
  }

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) {
        setIsCustomMode(false)
        setPendingRange(undefined)
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full sm:w-auto justify-start text-left font-normal h-10 text-sm",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value?.from ? (
            value.to ? (
              <span className="truncate">
                <span className="hidden sm:inline">
                  {format(value.from, "LLL dd, y")} - {format(value.to, "LLL dd, y")}
                </span>
                <span className="sm:hidden">
                  {format(value.from, "MMM d")} - {format(value.to, "MMM d")}
                </span>
              </span>
            ) : (
              format(value.from, "LLL dd, y")
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 max-w-[calc(100vw-2rem)]"
        align="end"
        sideOffset={8}
      >
        {/* Mobile: Stacked layout, Desktop: Side by side */}
        <div className="flex flex-col sm:flex-row max-h-[80vh] overflow-auto">
          {/* Presets - horizontal scroll on mobile, vertical list on desktop */}
          <div className="flex sm:flex-col gap-1 p-2 border-b sm:border-b-0 sm:border-r overflow-x-auto sm:overflow-x-visible">
            {activePresets.map((preset) => (
              <Button
                key={preset.label}
                variant={isCustomMode && preset.range === null ? "secondary" : "ghost"}
                size="sm"
                className="shrink-0 sm:w-full justify-start text-xs sm:text-sm whitespace-nowrap"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-2">
            {/* Dual calendar layout - side by side on desktop, stacked on mobile */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Start date calendar */}
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground mb-1 text-center">Start Date</span>
                <Calendar
                  mode="range"
                  selected={isCustomMode && pendingRange ? { from: pendingRange.from, to: pendingRange.to } : value}
                  onSelect={handleCalendarSelect}
                  month={startCalendarMonth}
                  onMonthChange={setStartCalendarMonth}
                  className="rounded-md"
                  numberOfMonths={1}
                />
              </div>
              {/* End date calendar */}
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground mb-1 text-center">End Date</span>
                <Calendar
                  mode="range"
                  selected={isCustomMode && pendingRange ? { from: pendingRange.from, to: pendingRange.to } : value}
                  onSelect={handleCalendarSelect}
                  month={endCalendarMonth}
                  onMonthChange={setEndCalendarMonth}
                  className="rounded-md"
                  numberOfMonths={1}
                />
              </div>
            </div>
            {isCustomMode && (
              <div className="flex gap-2 mt-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleApplyCustom}
                  disabled={!pendingRange?.from || !pendingRange?.to}
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        </div>
        {showComparison && (
          <div className="border-t p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={comparisonEnabled}
                onChange={(e) => onComparisonToggle?.(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Compare to previous period</span>
            </label>
            {comparisonEnabled && value && (
              <p className="text-xs text-muted-foreground mt-2 ml-6">
                Previous: {formatPreviousPeriod(value)}
              </p>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
