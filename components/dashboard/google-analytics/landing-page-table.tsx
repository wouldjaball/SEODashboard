"use client"

import { DataTable, type ColumnDef } from "@/components/dashboard/shared"
import { formatNumber, formatPercent, formatDuration } from "@/lib/utils"
import type { GALandingPage } from "@/lib/types"

interface LandingPageTableProps {
  data: GALandingPage[]
}

const columns: ColumnDef<GALandingPage>[] = [
  {
    accessorKey: "pageTitle",
    header: "Page",
    cell: (row) => (
      <div className="max-w-[140px] sm:max-w-[200px] md:max-w-[300px] truncate text-xs sm:text-sm" title={row.pageTitle}>
        {row.pageTitle}
      </div>
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

export function LandingPageTable({ data }: LandingPageTableProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm sm:text-base font-semibold">Landing Page Performance</h3>
      <DataTable
        data={data}
        columns={columns}
        searchable
        searchPlaceholder="Search pages..."
        searchKey="pageTitle"
        pageSize={10}
      />
    </div>
  )
}
