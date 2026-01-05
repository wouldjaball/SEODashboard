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
    header: "Source",
    cell: (row) => (
      <span className="text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[150px] inline-block">
        {row.source}
      </span>
    ),
  },
  {
    accessorKey: "totalUsers",
    header: "Users",
    cell: (row) => <span className="text-xs sm:text-sm">{formatNumber(row.totalUsers)}</span>,
  },
  {
    accessorKey: "sessions",
    header: "Sessions",
    cell: (row) => <span className="text-xs sm:text-sm">{formatNumber(row.sessions)}</span>,
    className: "hidden sm:table-cell",
  },
  {
    accessorKey: "views",
    header: "Views",
    cell: (row) => <span className="text-xs sm:text-sm">{formatNumber(row.views)}</span>,
    className: "hidden md:table-cell",
  },
  {
    accessorKey: "bounceRate",
    header: "Bounce",
    cell: (row) => <span className="text-xs sm:text-sm">{formatPercent(row.bounceRate)}</span>,
  },
  {
    accessorKey: "avgSessionDuration",
    header: "Duration",
    cell: (row) => <span className="text-xs sm:text-sm">{formatDuration(row.avgSessionDuration)}</span>,
    className: "hidden lg:table-cell",
  },
  {
    accessorKey: "conversionRate",
    header: "Conv.",
    cell: (row) => <span className="text-xs sm:text-sm">{formatPercent(row.conversionRate)}</span>,
    className: "hidden sm:table-cell",
  },
]

export function PerformanceTable({ data }: PerformanceTableProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm sm:text-base font-semibold">Performance Overview</h3>
      <DataTable data={data} columns={columns} pageSize={10} />
    </div>
  )
}
