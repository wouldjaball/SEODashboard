"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface MultiSelectOption {
  value: string
  label: string
  count?: number
}

interface MultiSelectFilterProps {
  label: string
  options: MultiSelectOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
  maxDisplayCount?: number
}

export function MultiSelectFilter({
  label,
  options,
  selectedValues,
  onChange,
  placeholder,
  className,
  maxDisplayCount = 50,
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const allSelected = selectedValues.length === 0 || selectedValues.length === options.length
  const noneSelected = selectedValues.length === 0

  const filteredOptions = React.useMemo(() => {
    if (!search) return options.slice(0, maxDisplayCount)
    const searchLower = search.toLowerCase()
    return options
      .filter((opt) => opt.label.toLowerCase().includes(searchLower))
      .slice(0, maxDisplayCount)
  }, [options, search, maxDisplayCount])

  const handleToggle = (value: string) => {
    if (noneSelected) {
      // If none selected (meaning all are shown), selecting one means we want only that one
      onChange([value])
    } else if (selectedValues.includes(value)) {
      const newValues = selectedValues.filter((v) => v !== value)
      // If removing the last selected, reset to "all" (empty array)
      onChange(newValues.length === 0 ? [] : newValues)
    } else {
      onChange([...selectedValues, value])
    }
  }

  const handleSelectAll = () => {
    onChange([])
  }

  const handleClearAll = () => {
    // Select first option when clearing all (can't have truly empty state for display)
    if (options.length > 0) {
      onChange([options[0].value])
    }
  }

  const isSelected = (value: string) => {
    if (noneSelected) return true // All are selected when array is empty
    return selectedValues.includes(value)
  }

  const getDisplayText = () => {
    if (noneSelected || allSelected) {
      return `${label}`
    }
    if (selectedValues.length === 1) {
      const option = options.find((o) => o.value === selectedValues[0])
      return option?.label || selectedValues[0]
    }
    return `${selectedValues.length} selected`
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            "h-10 justify-between text-left font-normal text-sm min-w-[140px] max-w-[200px]",
            className
          )}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-0"
        align="start"
        sideOffset={8}
      >
        <div className="flex flex-col">
          {/* Search input */}
          <div className="p-2 border-b">
            <div className="relative">
              <input
                type="text"
                placeholder="Type to search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 px-3 text-sm bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Select All / Clear buttons */}
          <div className="flex gap-1 p-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={handleSelectAll}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={handleClearAll}
            >
              Clear
            </Button>
          </div>

          {/* Options list */}
          <ScrollArea className="h-[200px]">
            <div className="p-1">
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleToggle(option.value)}
                  className={cn(
                    "flex items-center w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer",
                    isSelected(option.value) && "bg-accent/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border mr-2",
                      isSelected(option.value)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-input"
                    )}
                  >
                    {isSelected(option.value) && <Check className="h-3 w-3" />}
                  </div>
                  <span className="flex-1 text-left truncate">{option.label}</span>
                  {option.count !== undefined && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {option.count.toLocaleString()}
                    </span>
                  )}
                </button>
              ))}
              {filteredOptions.length === 0 && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}
