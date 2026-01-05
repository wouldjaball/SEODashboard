"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { chartColors } from "@/lib/chart-config"
import { formatNumber, formatPercent } from "@/lib/utils"
import type { LIDemographic } from "@/lib/types"

interface VisitorDemographicsProps {
  industry: LIDemographic[]
  seniority: LIDemographic[]
  jobFunction: LIDemographic[]
  companySize: LIDemographic[]
}

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
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
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
                  <Tooltip
                    formatter={(value) => [formatNumber(Number(value)), "Visitors"]}
                  />
                  <Bar dataKey="value" fill={chartColors.secondary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Seniority */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Seniority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
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
                  <Tooltip
                    formatter={(value) => [formatNumber(Number(value)), "Visitors"]}
                  />
                  <Bar dataKey="value" fill={chartColors.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Job Function */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Job Function</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
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
                  <Tooltip
                    formatter={(value) => [formatNumber(Number(value)), "Visitors"]}
                  />
                  <Bar dataKey="value" fill={chartColors.tertiary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Company Size */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Company Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
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
                  <Tooltip
                    formatter={(value) => [formatNumber(Number(value)), "Visitors"]}
                  />
                  <Bar dataKey="value" fill={chartColors.quaternary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
