"use client"

import { DataTable, type ColumnDef } from "@/components/dashboard/shared"
import { formatNumber, formatPercent, formatDuration } from "@/lib/utils"
import type { GASourcePerformance } from "@/lib/types"

interface PerformanceTableProps {
  data: GASourcePerformance[]
}

const columns: ColumnDef<GASourcePerformance>[] = [
  {
    accessorKey: "source",
    header: "First User Source",
  },
  {
    accessorKey: "totalUsers",
    header: "Total Users",
    cell: (row) => formatNumber(row.totalUsers),
  },
  {
    accessorKey: "newUsers",
    header: "New Users",
    cell: (row) => formatNumber(row.newUsers),
  },
  {
    accessorKey: "sessions",
    header: "Sessions",
    cell: (row) => formatNumber(row.sessions),
  },
  {
    accessorKey: "views",
    header: "Views",
    cell: (row) => formatNumber(row.views),
  },
  {
    accessorKey: "avgSessionDuration",
    header: "Avg. Session Duration",
    cell: (row) => formatDuration(row.avgSessionDuration),
  },
  {
    accessorKey: "bounceRate",
    header: "Bounce Rate",
    cell: (row) => formatPercent(row.bounceRate),
  },
  {
    accessorKey: "keyEvents",
    header: "Key Events",
    cell: (row) => formatNumber(row.keyEvents, { suffix: false }),
  },
  {
    accessorKey: "conversionRate",
    header: "User Conv. Rate",
    cell: (row) => formatPercent(row.conversionRate),
  },
]

export function PerformanceTable({ data }: PerformanceTableProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold">Performance Overview</h3>
      <DataTable data={data} columns={columns} pageSize={10} />
    </div>
  )
}
