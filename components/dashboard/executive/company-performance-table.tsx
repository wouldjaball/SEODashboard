"use client"

import React, { useState } from "react"
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink,
  Download
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Company } from "@/lib/types"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface CompanyPerformanceTableProps {
  companies: Company[]
  selectedMetric: string
}

type SortField = 'name' | 'traffic' | 'conversions' | 'conversionRate' | 'impressions' | 'ctr' | 'industry'
type SortOrder = 'asc' | 'desc'

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "—"
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
  if (num >= 1000) return (num / 1000).toFixed(1) + "K"
  return num.toLocaleString()
}

function formatPercent(num: number | null | undefined): string {
  if (num === null || num === undefined) return "—"
  return (num * 100).toFixed(1) + "%"
}

function calculateChange(current?: number, previous?: number): number | null {
  if (!current || !previous) return null
  return (current - previous) / previous
}

function getChangeColor(change: number | null): string {
  if (change === null) return "text-muted-foreground"
  return change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-muted-foreground"
}

function getChangeIcon(change: number | null) {
  if (change === null || Math.abs(change) < 0.001) return null
  return change > 0 ? TrendingUp : TrendingDown
}

export function CompanyPerformanceTable({ companies, selectedMetric }: CompanyPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('traffic')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder(field === 'name' || field === 'industry' ? 'asc' : 'desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return ArrowUpDown
    return sortOrder === 'asc' ? ArrowUp : ArrowDown
  }

  const sortedCompanies = [...companies].sort((a, b) => {
    let aValue: string | number
    let bValue: string | number

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'industry':
        aValue = a.industry.toLowerCase()
        bValue = b.industry.toLowerCase()
        break
      case 'traffic':
        aValue = a.gaMetrics?.totalUsers || 0
        bValue = b.gaMetrics?.totalUsers || 0
        break
      case 'conversions':
        aValue = a.gaMetrics?.keyEvents || 0
        bValue = b.gaMetrics?.keyEvents || 0
        break
      case 'conversionRate':
        aValue = a.gaMetrics?.userKeyEventRate || 0
        bValue = b.gaMetrics?.userKeyEventRate || 0
        break
      case 'impressions':
        aValue = a.gscMetrics?.impressions || 0
        bValue = b.gscMetrics?.impressions || 0
        break
      case 'ctr':
        aValue = a.gscMetrics?.ctr || 0
        bValue = b.gscMetrics?.ctr || 0
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

  const exportToCSV = () => {
    const headers = [
      'Company Name',
      'Industry', 
      'Traffic',
      'Traffic Change',
      'Conversions',
      'Conversion Rate',
      'Search Impressions',
      'CTR',
      'Integration Status'
    ]

    const rows = sortedCompanies.map(company => [
      company.name,
      company.industry,
      company.gaMetrics?.totalUsers || 0,
      calculateChange(company.gaMetrics?.totalUsers, company.gaMetrics?.previousPeriod?.totalUsers) || 0,
      company.gaMetrics?.keyEvents || 0,
      company.gaMetrics?.userKeyEventRate || 0,
      company.gscMetrics?.impressions || 0,
      company.gscMetrics?.ctr || 0,
      [
        company.gaMetrics && !company.gaError ? 'GA' : null,
        company.gscMetrics && !company.gscError ? 'GSC' : null,
        company.ytMetrics && !company.ytError ? 'YT' : null,
        company.liVisitorMetrics && !company.liError ? 'LI' : null
      ].filter(Boolean).join(', ')
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `company-performance-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Company Performance Data</CardTitle>
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSort('name')}
                    className="h-auto p-0 font-medium"
                  >
                    Company
                    {React.createElement(getSortIcon('name'), { className: "ml-2 h-4 w-4" })}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSort('industry')}
                    className="h-auto p-0 font-medium"
                  >
                    Industry
                    {React.createElement(getSortIcon('industry'), { className: "ml-2 h-4 w-4" })}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSort('traffic')}
                    className="h-auto p-0 font-medium"
                  >
                    Traffic
                    {React.createElement(getSortIcon('traffic'), { className: "ml-2 h-4 w-4" })}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSort('conversions')}
                    className="h-auto p-0 font-medium"
                  >
                    Conversions
                    {React.createElement(getSortIcon('conversions'), { className: "ml-2 h-4 w-4" })}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSort('conversionRate')}
                    className="h-auto p-0 font-medium"
                  >
                    Conv. Rate
                    {React.createElement(getSortIcon('conversionRate'), { className: "ml-2 h-4 w-4" })}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSort('impressions')}
                    className="h-auto p-0 font-medium"
                  >
                    Impressions
                    {React.createElement(getSortIcon('impressions'), { className: "ml-2 h-4 w-4" })}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSort('ctr')}
                    className="h-auto p-0 font-medium"
                  >
                    CTR
                    {React.createElement(getSortIcon('ctr'), { className: "ml-2 h-4 w-4" })}
                  </Button>
                </TableHead>
                <TableHead>Integrations</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCompanies.map((company) => {
                const trafficChange = calculateChange(
                  company.gaMetrics?.totalUsers, 
                  company.gaMetrics?.previousPeriod?.totalUsers
                )
                
                const ChangeIcon = getChangeIcon(trafficChange)

                return (
                  <TableRow key={company.id} className="group hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback
                            className="text-xs font-semibold text-white"
                            style={{ backgroundColor: company.color }}
                          >
                            {getInitials(company.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-xs text-muted-foreground">{company.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {company.industry}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-1">
                        <p className="font-medium">{formatNumber(company.gaMetrics?.totalUsers)}</p>
                        {ChangeIcon && (
                          <div className={cn("flex items-center justify-end gap-1", getChangeColor(trafficChange))}>
                            <ChangeIcon className="h-3 w-3" />
                            <span className="text-xs">{formatPercent(Math.abs(trafficChange || 0))}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(company.gaMetrics?.keyEvents)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPercent(company.gaMetrics?.userKeyEventRate)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(company.gscMetrics?.impressions)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPercent(company.gscMetrics?.ctr)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {company.gaMetrics && !company.gaError && (
                          <Badge variant="secondary" className="text-xs">GA</Badge>
                        )}
                        {company.gscMetrics && !company.gscError && (
                          <Badge variant="secondary" className="text-xs">GSC</Badge>
                        )}
                        {company.ytMetrics && !company.ytError && (
                          <Badge variant="secondary" className="text-xs">YT</Badge>
                        )}
                        {company.liVisitorMetrics && !company.liError && (
                          <Badge variant="secondary" className="text-xs">LI</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/dashboard">
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}