"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, subDays } from "date-fns"

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
  presets?: { label: string; range: DateRange }[]
  className?: string
  showComparison?: boolean
  comparisonEnabled?: boolean
  onComparisonToggle?: (enabled: boolean) => void
}

const defaultPresets: { label: string; range: DateRange }[] = [
  {
    label: "Last 7 days",
    range: { from: subDays(new Date(), 7), to: new Date() },
  },
  {
    label: "Last 14 days",
    range: { from: subDays(new Date(), 14), to: new Date() },
  },
  {
    label: "Last 30 days",
    range: { from: subDays(new Date(), 30), to: new Date() },
  },
  {
    label: "Last 60 days",
    range: { from: subDays(new Date(), 60), to: new Date() },
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
  presets = defaultPresets,
  className,
  showComparison = false,
  comparisonEnabled = false,
  onComparisonToggle,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="shrink-0 sm:w-full justify-start text-xs sm:text-sm whitespace-nowrap"
                onClick={() => {
                  onChange(preset.range)
                  setIsOpen(false)
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-2">
            <Calendar
              mode="range"
              selected={value}
              onSelect={(range) => {
                if (range && "from" in range && range.from && range.to) {
                  onChange({ from: range.from, to: range.to })
                }
              }}
              className="rounded-md"
            />
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
