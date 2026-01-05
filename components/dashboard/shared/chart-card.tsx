"use client"

import { LucideIcon, Download, Expand, Filter } from "lucide-react"
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
  children: React.ReactNode
  actions?: ChartAction[]
  filters?: React.ReactNode
  className?: string
  contentClassName?: string
}

export function ChartCard({
  title,
  subtitle,
  children,
  actions,
  filters,
  className,
  contentClassName,
}: ChartCardProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {subtitle && (
            <CardDescription className="text-sm">{subtitle}</CardDescription>
          )}
        </div>
        <div className="flex items-center gap-2">
          {filters}
          {actions && actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Filter className="h-4 w-4" />
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
      <CardContent className={cn("flex-1 pt-0", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
