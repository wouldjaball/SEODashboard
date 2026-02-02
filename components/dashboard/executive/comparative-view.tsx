"use client"

import { useState } from "react"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts"
import { ChartCard } from "@/components/dashboard/shared/chart-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiSelectFilter } from "@/components/dashboard/shared/multi-select-filter"
import { CompanyPerformanceTable } from "./company-performance-table"
import type { Company, DateRange } from "@/lib/types"

interface ComparativeViewProps {
  companies: Company[]
  dateRange: DateRange
  isLoading: boolean
}

type MetricType = 'traffic' | 'conversions' | 'conversionRate' | 'impressions' | 'ctr'

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#ec4899', '#6366f1', '#8b5cf6', '#14b8a6', '#f59e0b']

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
  if (num >= 1000) return (num / 1000).toFixed(1) + "K"
  return num.toLocaleString()
}

function getMetricValue(company: Company, metric: MetricType): number {
  switch (metric) {
    case 'traffic':
      return company.gaMetrics?.totalUsers || 0
    case 'conversions':
      return company.gaMetrics?.keyEvents || 0
    case 'conversionRate':
      return (company.gaMetrics?.userKeyEventRate || 0) * 100
    case 'impressions':
      return company.gscMetrics?.impressions || 0
    case 'ctr':
      return (company.gscMetrics?.ctr || 0) * 100
    default:
      return 0
  }
}

function getMetricLabel(metric: MetricType): string {
  switch (metric) {
    case 'traffic':
      return 'Traffic (Users)'
    case 'conversions':
      return 'Conversions'
    case 'conversionRate':
      return 'Conversion Rate (%)'
    case 'impressions':
      return 'Search Impressions'
    case 'ctr':
      return 'Click-Through Rate (%)'
    default:
      return ''
  }
}

export function ComparativeView({ companies, dateRange, isLoading }: ComparativeViewProps) {
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    companies.slice(0, 5).map(c => c.id) // Default to first 5 companies
  )
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('traffic')
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  const companyOptions = companies.map(company => ({
    value: company.id,
    label: company.name,
    color: company.color
  }))

  const filteredCompanies = companies.filter(company => 
    selectedCompanies.includes(company.id)
  )

  // Create comparison data for charts
  const comparisonData = filteredCompanies.map((company, index) => ({
    name: company.name.length > 15 ? company.name.substring(0, 12) + "..." : company.name,
    fullName: company.name,
    value: getMetricValue(company, selectedMetric),
    color: company.color || COLORS[index % COLORS.length],
    // Add other metrics for tooltip
    traffic: company.gaMetrics?.totalUsers || 0,
    conversions: company.gaMetrics?.keyEvents || 0,
    conversionRate: (company.gaMetrics?.userKeyEventRate || 0) * 100,
    impressions: company.gscMetrics?.impressions || 0,
    ctr: (company.gscMetrics?.ctr || 0) * 100,
  }))

  // Create weekly trend data (simplified - would need actual weekly data from API)
  const weeklyTrendData = Array.from({ length: 4 }, (_, weekIndex) => {
    const weekData: any = {
      week: `Week ${weekIndex + 1}`
    }
    
    filteredCompanies.forEach((company, index) => {
      // Simulate weekly data - in real implementation, get from gaWeeklyData
      const baseValue = getMetricValue(company, selectedMetric)
      const variation = (Math.random() - 0.5) * 0.3 // ±15% variation
      weekData[company.name] = Math.round(baseValue * (1 + variation))
    })
    
    return weekData
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 w-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Company Selection */}
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Select Companies to Compare</label>
            <MultiSelectFilter
              label="Companies"
              options={companyOptions.map(opt => ({ value: opt.value, label: opt.label }))}
              selectedValues={selectedCompanies}
              onChange={setSelectedCompanies}
              placeholder="Select companies..."
              maxDisplayCount={10}
            />
          </div>

          {/* Metric Selection */}
          <div className="w-full sm:w-48">
            <label className="text-sm font-medium mb-2 block">Metric</label>
            <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="traffic">Traffic</SelectItem>
                <SelectItem value="conversions">Conversions</SelectItem>
                <SelectItem value="conversionRate">Conversion Rate</SelectItem>
                <SelectItem value="impressions">Search Impressions</SelectItem>
                <SelectItem value="ctr">Click-Through Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'chart' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('chart')}
          >
            Charts
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            Data Table
          </Button>
        </div>

        {/* Selected Companies */}
        <div className="flex flex-wrap gap-2">
          {filteredCompanies.map((company) => (
            <Badge 
              key={company.id} 
              variant="secondary"
              style={{ backgroundColor: `${company.color}20`, color: company.color }}
            >
              {company.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'chart' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Performance Comparison */}
          <ChartCard
            title={`${getMetricLabel(selectedMetric)} Comparison`}
            subtitle="Current period performance"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [formatNumber(value as number), getMetricLabel(selectedMetric)]}
                  labelFormatter={(label) => {
                    const company = comparisonData.find(c => c.name === label)
                    return company?.fullName || label
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Trend Comparison */}
          <ChartCard
            title="4-Week Trend Comparison"
            subtitle={getMetricLabel(selectedMetric)}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip formatter={(value) => [formatNumber(value as number), '']} />
                <Legend />
                {filteredCompanies.map((company, index) => (
                  <Line
                    key={company.id}
                    type="monotone"
                    dataKey={company.name}
                    stroke={company.color || COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Performance Matrix */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Performance Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {['traffic', 'conversions', 'conversionRate', 'impressions', 'ctr'].map((metric) => (
                  <div key={metric} className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {getMetricLabel(metric as MetricType)}
                    </h4>
                    <div className="space-y-2">
                      {filteredCompanies
                        .sort((a, b) => getMetricValue(b, metric as MetricType) - getMetricValue(a, metric as MetricType))
                        .slice(0, 3)
                        .map((company, index) => (
                          <div key={company.id} className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: company.color }}
                            />
                            <span className="text-sm truncate flex-1">
                              {company.name.length > 12 ? company.name.substring(0, 9) + "..." : company.name}
                            </span>
                            <span className="text-xs font-medium">
                              {formatNumber(getMetricValue(company, metric as MetricType))}
                              {(metric === 'conversionRate' || metric === 'ctr') && '%'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Data Table View */
        <CompanyPerformanceTable 
          companies={filteredCompanies}
          selectedMetric={selectedMetric}
        />
      )}
    </div>
  )
}