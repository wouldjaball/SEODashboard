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

export function VisitorDemographics({
  industry,
  seniority,
  jobFunction,
  companySize,
}: VisitorDemographicsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Visitor Demographics</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Industry */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Industry</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={industryConfig} className="h-[200px] w-full">
              <BarChart
                data={industry.slice(0, 6)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <YAxis
                  type="category"
                  dataKey="segment"
                  tick={{ fontSize: 10 }}
                  width={80}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Seniority */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Seniority</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={seniorityConfig} className="h-[200px] w-full">
              <BarChart
                data={seniority.slice(0, 6)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <YAxis
                  type="category"
                  dataKey="segment"
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Job Function */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Job Function</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={jobFunctionConfig} className="h-[200px] w-full">
              <BarChart
                data={jobFunction.slice(0, 6)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <YAxis
                  type="category"
                  dataKey="segment"
                  tick={{ fontSize: 10 }}
                  width={100}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Company Size */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Company Size</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={companySizeConfig} className="h-[200px] w-full">
              <BarChart
                data={companySize.slice(0, 6)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <YAxis
                  type="category"
                  dataKey="segment"
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
