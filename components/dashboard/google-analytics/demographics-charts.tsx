"use client"

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatNumber, formatPercent } from "@/lib/utils"
import type { GADevice, GADemographic } from "@/lib/types"

interface DemographicsChartsProps {
  devices: GADevice[]
  gender: GADemographic[]
  age: GADemographic[]
}

const deviceChartConfig = {
  desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
  mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
  tablet: { label: "Tablet", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig

const genderChartConfig = {
  male: { label: "Male", color: "hsl(var(--chart-4))" },
  female: { label: "Female", color: "hsl(var(--chart-5))" },
  unknown: { label: "Unknown", color: "hsl(220 9% 46%)" },
} satisfies ChartConfig

const ageChartConfig = {
  totalUsers: { label: "Users", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

export function DemographicsCharts({ devices, gender, age }: DemographicsChartsProps) {
  const deviceData = devices.map((d) => ({
    name: d.category.charAt(0).toUpperCase() + d.category.slice(1),
    value: d.totalUsers,
  }))

  const genderData = gender.map((g) => ({
    name: g.segment,
    value: g.totalUsers,
  }))

  const totalDeviceUsers = devices.reduce((sum, d) => sum + d.totalUsers, 0)
  const totalGenderUsers = gender.reduce((sum, g) => sum + g.totalUsers, 0)

  const deviceColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"]
  const genderColors = ["hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(220 9% 46%)"]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Device Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Device</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={deviceChartConfig} className="h-[150px] w-full">
            <PieChart>
              <Pie
                data={deviceData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
              >
                {deviceData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={deviceColors[index]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Device</TableHead>
                <TableHead className="text-xs text-right">Users</TableHead>
                <TableHead className="text-xs text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device, index) => (
                <TableRow key={device.category}>
                  <TableCell className="text-xs py-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: deviceColors[index] }}
                      />
                      {device.category.charAt(0).toUpperCase() + device.category.slice(1)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-right py-1.5">
                    {formatNumber(device.totalUsers)}
                  </TableCell>
                  <TableCell className="text-xs text-right py-1.5">
                    {formatPercent(device.totalUsers / totalDeviceUsers)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Gender Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Gender</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={genderChartConfig} className="h-[150px] w-full">
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
              >
                {genderData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={genderColors[index]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Gender</TableHead>
                <TableHead className="text-xs text-right">Users</TableHead>
                <TableHead className="text-xs text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gender.map((g, index) => (
                <TableRow key={g.segment}>
                  <TableCell className="text-xs py-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: genderColors[index] }}
                      />
                      {g.segment}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-right py-1.5">
                    {formatNumber(g.totalUsers)}
                  </TableCell>
                  <TableCell className="text-xs text-right py-1.5">
                    {formatPercent(g.totalUsers / totalGenderUsers)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Age Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Age</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={ageChartConfig} className="h-[250px] w-full">
            <BarChart
              data={age}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
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
                width={40}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="totalUsers" fill="var(--color-totalUsers)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
