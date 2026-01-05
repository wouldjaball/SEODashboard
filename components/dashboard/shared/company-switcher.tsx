"use client"

import { Building2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCompany } from "@/lib/company-context"

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
      <SelectTrigger className="w-[160px] sm:w-[200px] h-9 text-xs sm:text-sm bg-gray-800 border-gray-700 text-white">
        <div className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 shrink-0 text-gray-400" />
          <SelectValue placeholder="Select company" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {companies.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <div className="flex flex-col">
              <span className="font-medium">{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.industry}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
