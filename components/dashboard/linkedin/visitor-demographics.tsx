"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatNumber } from "@/lib/utils"
import type { LIDemographic } from "@/lib/types"

interface VisitorDemographicsProps {
  industry: LIDemographic[]
  seniority: LIDemographic[]
  jobFunction: LIDemographic[]
  companySize: LIDemographic[]
}

const industryConfig = {
  value: { label: "Visitors", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig

const seniorityConfig = {
  value: { label: "Visitors", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

const jobFunctionConfig = {
  value: { label: "Visitors", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig

const companySizeConfig = {
  value: { label: "Visitors", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig

// Helper to truncate long segment labels for mobile
function truncateLabel(label: string, maxLen: number = 12): string {
  if (label.length <= maxLen) return label
  return label.slice(0, maxLen - 1) + "…"
}

interface DemographicChartProps {
  title: string
  data: LIDemographic[]
  config: ChartConfig
  labelWidth?: number
}

function DemographicChart({ title, data, config, labelWidth = 70 }: DemographicChartProps) {
  const chartData = data.slice(0, 5).map(item => ({
    ...item,
    shortSegment: truncateLabel(item.segment, 10),
  }))

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm sm:text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6 pb-3 sm:pb-6">
        <ChartContainer config={config} className="h-[160px] sm:h-[200px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 9 }}
              tickFormatter={(value) => formatNumber(value)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="shortSegment"
              tick={{ fontSize: 9 }}
              width={labelWidth}
              axisLine={false}
              tickLine={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">{(item as { payload?: { segment?: string } })?.payload?.segment}</span>
                      <span className="font-mono font-medium">{formatNumber(Number(value))}</span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function VisitorDemographics({
  industry,
  seniority,
  jobFunction,
  companySize,
}: VisitorDemographicsProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-base sm:text-lg font-semibold">Visitor Demographics</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <DemographicChart title="Industry" data={industry} config={industryConfig} labelWidth={65} />
        <DemographicChart title="Seniority" data={seniority} config={seniorityConfig} labelWidth={55} />
        <DemographicChart title="Job Function" data={jobFunction} config={jobFunctionConfig} labelWidth={70} />
        <DemographicChart title="Company Size" data={companySize} config={companySizeConfig} labelWidth={55} />
      </div>
    </div>
  )
}
