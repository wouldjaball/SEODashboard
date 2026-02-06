"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { formatNumber, formatPercent } from "@/lib/utils"
import type { GSCCountry } from "@/lib/types"

// Color palette for the pie chart
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
]

interface CountryPerformanceMapProps {
  data: GSCCountry[]
}

export function CountryPerformanceMap({ data }: CountryPerformanceMapProps) {
  const totalImpressions = data.reduce((sum, c) => sum + c.impressions, 0)
  
  // Prepare data for pie chart - top 8 countries + others
  const topCountries = data.slice(0, 8)
  const otherCountries = data.slice(8)
  const otherImpressions = otherCountries.reduce((sum, c) => sum + c.impressions, 0)
  
  const chartData = topCountries.map((country, index) => ({
    name: country.country,
    value: country.impressions,
    percentage: ((country.impressions / totalImpressions) * 100).toFixed(1),
    clicks: country.clicks,
    ctr: country.ctr,
    countryCode: country.countryCode,
    color: COLORS[index % COLORS.length]
  }))
  
  // Add "Others" category if there are remaining countries
  if (otherImpressions > 0) {
    chartData.push({
      name: "Others",
      value: otherImpressions,
      percentage: ((otherImpressions / totalImpressions) * 100).toFixed(1),
      clicks: otherCountries.reduce((sum, c) => sum + c.clicks, 0),
      ctr: otherImpressions > 0 ? otherCountries.reduce((sum, c) => sum + c.clicks, 0) / otherImpressions : 0,
      countryCode: "",
      color: "#94a3b8"
    })
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-2">
            {data.countryCode && (
              <span className="text-lg">{getCountryFlag(data.countryCode)}</span>
            )}
            <span className="font-semibold">{data.name}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span>Impressions:</span>
              <span className="font-medium">{formatNumber(data.value)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Share:</span>
              <span className="font-medium">{data.percentage}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Clicks:</span>
              <span className="font-medium">{formatNumber(data.clicks)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>CTR:</span>
              <span className="font-medium">{formatPercent(data.ctr)}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom label function
  const renderLabel = (entry: any) => {
    const percentage = parseFloat(entry.percentage)
    // Only show label if percentage is >= 5% to avoid clutter
    return percentage >= 5 ? `${entry.name} (${entry.percentage}%)` : ''
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Search Performance by Country</CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribution of search impressions across countries
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry: any) => (
                  <span className="text-sm flex items-center gap-1">
                    {entry.payload.countryCode && getCountryFlag(entry.payload.countryCode)} {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}
