"use client"

import { LucideIcon, Filter } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ChartAction {
  icon: LucideIcon
  label: string
  onClick: () => void
}

interface ChartCardProps {
  title: string
  subtitle?: string
  dateRange?: string
  children: React.ReactNode
  actions?: ChartAction[]
  filters?: React.ReactNode
  className?: string
  contentClassName?: string
}

export function ChartCard({
  title,
  subtitle,
  dateRange,
  children,
  actions,
  filters,
  className,
  contentClassName,
}: ChartCardProps) {
  return (
    <Card className={cn("flex flex-col overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start sm:items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6 gap-2">
        <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
          <CardTitle className="text-sm sm:text-base font-semibold truncate">{title}</CardTitle>
          {(subtitle || dateRange) && (
            <CardDescription className="text-xs sm:text-sm truncate">
              {subtitle}
              {subtitle && dateRange && " • "}
              {dateRange && <span className="text-muted-foreground/80">{dateRange}</span>}
            </CardDescription>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {filters}
          {actions && actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                  <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action, index) => (
                  <DropdownMenuItem key={index} onClick={action.onClick}>
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn("flex-1 pt-0 px-2 sm:px-6 pb-3 sm:pb-6", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
