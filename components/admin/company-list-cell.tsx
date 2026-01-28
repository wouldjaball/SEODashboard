'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ChevronDown } from 'lucide-react'

interface Company {
  id: string
  name: string
  role?: string
}

interface CompanyListCellProps {
  companies: Company[]
  maxVisible?: number
  showRoles?: boolean
}

function getRoleBadgeVariant(role?: string): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'owner':
      return 'default'
    case 'admin':
      return 'secondary'
    default:
      return 'outline'
  }
}

function getRoleLabel(role?: string): string {
  switch (role) {
    case 'owner':
      return 'Owner'
    case 'admin':
      return 'Admin'
    case 'viewer':
      return 'Viewer'
    case 'client':
      return 'Client'
    default:
      return ''
  }
}

export function CompanyListCell({
  companies,
  maxVisible = 3,
  showRoles = true,
}: CompanyListCellProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (companies.length === 0) {
    return (
      <span className="text-muted-foreground text-sm">No companies assigned</span>
    )
  }

  const visibleCompanies = companies.slice(0, maxVisible)
  const hiddenCompanies = companies.slice(maxVisible)
  const hasMore = hiddenCompanies.length > 0

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleCompanies.map((company) => (
        <Badge
          key={company.id}
          variant={showRoles ? getRoleBadgeVariant(company.role) : 'outline'}
          className="text-xs font-normal"
        >
          {company.name}
          {showRoles && company.role && (
            <span className="ml-1 opacity-75">({getRoleLabel(company.role)})</span>
          )}
        </Badge>
      ))}

      {hasMore && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              +{hiddenCompanies.length} more
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="flex flex-col gap-1.5">
              {hiddenCompanies.map((company) => (
                <Badge
                  key={company.id}
                  variant={showRoles ? getRoleBadgeVariant(company.role) : 'outline'}
                  className="text-xs font-normal justify-start"
                >
                  {company.name}
                  {showRoles && company.role && (
                    <span className="ml-1 opacity-75">({getRoleLabel(company.role)})</span>
                  )}
                </Badge>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
