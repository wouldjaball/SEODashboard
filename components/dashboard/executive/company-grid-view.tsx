"use client"

import { useState } from "react"
import { Search, Filter, SortAsc, Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CompanyGridCard } from "./company-grid-card"
import type { Company, DateRange } from "@/lib/types"

interface CompanyGridViewProps {
  companies: Company[]
  dateRange: DateRange
  isLoading: boolean
}

type SortField = 'name' | 'traffic' | 'conversionRate' | 'industry'
type SortOrder = 'asc' | 'desc'

export function CompanyGridView({ companies, dateRange, isLoading }: CompanyGridViewProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [industryFilter, setIndustryFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Get unique industries for filtering
  const industries = Array.from(new Set(companies.map(c => c.industry))).sort()

  // Filter companies based on search and industry
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.industry.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesIndustry = industryFilter === "all" || company.industry === industryFilter

    return matchesSearch && matchesIndustry
  })

  // Sort companies
  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    let aValue: string | number
    let bValue: string | number

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'traffic':
        aValue = a.gaMetrics?.totalUsers || 0
        bValue = b.gaMetrics?.totalUsers || 0
        break
      case 'conversionRate':
        aValue = a.gaMetrics?.userKeyEventRate || 0
        bValue = b.gaMetrics?.userKeyEventRate || 0
        break
      case 'industry':
        aValue = a.industry.toLowerCase()
        bValue = b.industry.toLowerCase()
        break
      default:
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    } else {
      return sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    }
  })

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder(field === 'name' || field === 'industry' ? 'asc' : 'desc')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-64 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Industry Filter */}
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map(industry => (
              <SelectItem key={industry} value={industry}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <SortAsc className="h-4 w-4 mr-2" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleSort('name')}>
              Company Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort('traffic')}>
              Traffic {sortField === 'traffic' && (sortOrder === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort('conversionRate')}>
              Conversion Rate {sortField === 'conversionRate' && (sortOrder === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort('industry')}>
              Industry {sortField === 'industry' && (sortOrder === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {sortedCompanies.length} of {companies.length} companies
        </p>
      </div>

      {/* Company Grid */}
      {sortedCompanies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedCompanies.map((company) => (
            <CompanyGridCard
              key={company.id}
              company={company}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No companies found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchTerm || industryFilter !== "all" 
              ? "Try adjusting your search or filter criteria."
              : "No companies are available to display."
            }
          </p>
          {(searchTerm || industryFilter !== "all") && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => {
                setSearchTerm("")
                setIndustryFilter("all")
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  )
}