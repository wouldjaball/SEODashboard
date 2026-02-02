"use client"

import { 
  Users, 
  Eye, 
  MousePointerClick, 
  TrendingUp, 
  Building2,
  Target,
  BarChart3 
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPICard } from "@/components/dashboard/shared"
import { ChartCard } from "@/components/dashboard/shared/chart-card"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts"
import type { Company, DateRange } from "@/lib/types"

interface PortfolioData {
  companies: Company[]
  aggregateMetrics: {
    totalTraffic: number
    totalConversions: number
    avgConversionRate: number
    totalRevenue: number
    previousPeriod: {
      totalTraffic: number
      totalConversions: number
      avgConversionRate: number
      totalRevenue: number
    }
  }
}

interface AggregateViewProps {
  portfolioData: PortfolioData | null
  companies: Company[]
  dateRange: DateRange
  isLoading: boolean
}

function calculateChange(current: number, previous: number): number | undefined {
  if (!previous) return undefined
  return (current - previous) / previous
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
  if (num >= 1000) return (num / 1000).toFixed(1) + "K"
  return num.toLocaleString()
}

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#ec4899', '#6366f1', '#8b5cf6', '#14b8a6', '#f59e0b']

export function AggregateView({ portfolioData, companies, dateRange, isLoading }: AggregateViewProps) {
  // Calculate aggregate metrics from companies data if portfolioData is not available
  const aggregateMetrics = portfolioData?.aggregateMetrics || {
    totalTraffic: companies.reduce((sum, company) => sum + (company.gaMetrics?.totalUsers || 0), 0),
    totalConversions: companies.reduce((sum, company) => sum + (company.gaMetrics?.keyEvents || 0), 0),
    avgConversionRate: companies.reduce((sum, company) => sum + (company.gaMetrics?.userKeyEventRate || 0), 0) / Math.max(companies.length, 1),
    totalRevenue: 0, // This would come from actual revenue data
    previousPeriod: {
      totalTraffic: companies.reduce((sum, company) => sum + (company.gaMetrics?.previousPeriod?.totalUsers || 0), 0),
      totalConversions: companies.reduce((sum, company) => sum + (company.gaMetrics?.previousPeriod?.keyEvents || 0), 0),
      avgConversionRate: companies.reduce((sum, company) => sum + (company.gaMetrics?.previousPeriod?.userKeyEventRate || 0), 0) / Math.max(companies.length, 1),
      totalRevenue: 0,
    }
  }

  // Create data for company performance bar chart
  const companyPerformanceData = companies
    .filter(company => company.gaMetrics)
    .map(company => ({
      name: company.name.length > 15 ? company.name.substring(0, 12) + "..." : company.name,
      fullName: company.name,
      traffic: company.gaMetrics?.totalUsers || 0,
      conversions: company.gaMetrics?.keyEvents || 0,
      color: company.color
    }))
    .sort((a, b) => b.traffic - a.traffic)
    .slice(0, 10) // Top 10 companies

  // Create data for traffic distribution pie chart
  const trafficDistributionData = companies
    .filter(company => company.gaMetrics?.totalUsers)
    .map((company, index) => ({
      name: company.name.length > 20 ? company.name.substring(0, 17) + "..." : company.name,
      value: company.gaMetrics?.totalUsers || 0,
      color: company.color || COLORS[index % COLORS.length]
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8) // Top 8 for readability

  // Industry breakdown
  const industryBreakdown = companies.reduce((acc, company) => {
    const industry = company.industry
    const traffic = company.gaMetrics?.totalUsers || 0
    
    if (!acc[industry]) {
      acc[industry] = { count: 0, traffic: 0 }
    }
    
    acc[industry].count += 1
    acc[industry].traffic += traffic
    
    return acc
  }, {} as Record<string, { count: number; traffic: number }>)

  const industryData = Object.entries(industryBreakdown)
    .map(([industry, data]) => ({
      industry,
      companies: data.count,
      traffic: data.traffic
    }))
    .sort((a, b) => b.traffic - a.traffic)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
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
      {/* Portfolio KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Traffic"
          value={aggregateMetrics.totalTraffic}
          change={calculateChange(aggregateMetrics.totalTraffic, aggregateMetrics.previousPeriod.totalTraffic)}
          icon={Users}
          format="number"
        />
        <KPICard
          title="Total Conversions"
          value={aggregateMetrics.totalConversions}
          change={calculateChange(aggregateMetrics.totalConversions, aggregateMetrics.previousPeriod.totalConversions)}
          icon={Target}
          format="number"
        />
        <KPICard
          title="Avg Conv. Rate"
          value={aggregateMetrics.avgConversionRate}
          change={calculateChange(aggregateMetrics.avgConversionRate, aggregateMetrics.previousPeriod.avgConversionRate)}
          icon={TrendingUp}
          format="percent"
        />
        <KPICard
          title="Companies"
          value={companies.length}
          icon={Building2}
          format="number"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Performance Bar Chart */}
        <ChartCard
          title="Top Performing Companies"
          subtitle="Traffic and conversions"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={companyPerformanceData}>
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
                formatter={(value, name, props) => [
                  formatNumber(value as number),
                  name === 'traffic' ? 'Traffic' : 'Conversions'
                ]}
                labelFormatter={(label) => {
                  const company = companyPerformanceData.find(c => c.name === label)
                  return company?.fullName || label
                }}
              />
              <Bar 
                dataKey="traffic" 
                fill="#3b82f6" 
                name="traffic"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="conversions" 
                fill="#22c55e" 
                name="conversions"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Traffic Distribution Pie Chart */}
        <ChartCard
          title="Traffic Distribution"
          subtitle="By company"
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={trafficDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => (percent && percent > 0.05) ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
              >
                {trafficDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [formatNumber(value as number), 'Traffic']}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Industry Breakdown */}
        <ChartCard
          title="Industry Overview"
          subtitle="Companies and traffic by industry"
        >
          <div className="space-y-4">
            {industryData.map((industry, index) => (
              <div key={industry.industry} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <p className="font-medium text-sm">{industry.industry}</p>
                    <p className="text-xs text-muted-foreground">
                      {industry.companies} {industry.companies === 1 ? 'company' : 'companies'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{formatNumber(industry.traffic)}</p>
                  <p className="text-xs text-muted-foreground">traffic</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}