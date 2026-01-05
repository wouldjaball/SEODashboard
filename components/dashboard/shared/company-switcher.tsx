"use client"

import { ChevronDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useCompany } from "@/lib/company-context"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function CompanySwitcher() {
  const { company, setCompany, companies } = useCompany()

  return (
    <Select
      value={company.id}
      onValueChange={(value) => {
        const selected = companies.find((c) => c.id === value)
        if (selected) setCompany(selected)
      }}
    >
      <SelectTrigger className="w-[180px] sm:w-[220px] h-10 sm:h-11 text-sm bg-gray-800 border-gray-700 text-white hover:bg-gray-700 transition-colors">
        <div className="flex items-center gap-2.5 truncate">
          <Avatar className="h-6 w-6 sm:h-7 sm:w-7 shrink-0">
            <AvatarFallback
              className="text-[10px] sm:text-xs font-semibold text-white"
              style={{ backgroundColor: company.color }}
            >
              {getInitials(company.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start min-w-0">
            <span className="font-medium truncate text-sm leading-tight">
              {company.name}
            </span>
          </div>
        </div>
      </SelectTrigger>
      <SelectContent className="w-[260px]">
        {companies.map((c) => (
          <SelectItem
            key={c.id}
            value={c.id}
            className="cursor-pointer py-2.5 px-3"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                  className="text-xs font-semibold text-white"
                  style={{ backgroundColor: c.color }}
                >
                  {getInitials(c.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-sm">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {c.industry}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
