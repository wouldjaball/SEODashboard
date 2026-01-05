"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
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
import { chartColorArray } from "@/lib/chart-config"
import { formatNumber, formatPercent } from "@/lib/utils"
import type { GSCDeviceData } from "@/lib/types"

interface DevicePerformanceProps {
  data: GSCDeviceData[]
}

export function DevicePerformance({ data }: DevicePerformanceProps) {
  const pieData = data.map((d) => ({
    name: d.device.charAt(0).toUpperCase() + d.device.slice(1),
    value: d.impressions,
  }))

  const totalImpressions = data.reduce((sum, d) => sum + d.impressions, 0)

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Device Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={chartColorArray[index]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [formatNumber(Number(value)), "Impressions"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Device</TableHead>
              <TableHead className="text-xs text-right">Impressions</TableHead>
              <TableHead className="text-xs text-right">Clicks</TableHead>
              <TableHead className="text-xs text-right">CTR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((device, index) => (
              <TableRow key={device.device}>
                <TableCell className="text-xs py-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: chartColorArray[index] }}
                    />
                    {device.device.charAt(0).toUpperCase() + device.device.slice(1)}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-right py-1.5">
                  {formatNumber(device.impressions)}
                </TableCell>
                <TableCell className="text-xs text-right py-1.5">
                  {formatNumber(device.clicks)}
                </TableCell>
                <TableCell className="text-xs text-right py-1.5">
                  {formatPercent(device.ctr)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
