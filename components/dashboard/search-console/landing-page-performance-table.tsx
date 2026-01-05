"use client"

import { DataTable, type ColumnDef } from "@/components/dashboard/shared"
import { formatNumber, formatPercent } from "@/lib/utils"
import type { GSCLandingPage } from "@/lib/types"

interface LandingPagePerformanceTableProps {
  data: GSCLandingPage[]
}

const columns: ColumnDef<GSCLandingPage>[] = [
  {
    accessorKey: "url",
    header: "URL",
    cell: (row) => (
      <div className="max-w-[120px] sm:max-w-[200px] md:max-w-[300px] truncate font-medium text-xs sm:text-sm" title={row.url}>
        {row.url}
      </div>
    ),
  },
  {
    accessorKey: "impressions",
    header: "Impr.",
    cell: (row) => <span className="text-xs sm:text-sm">{formatNumber(row.impressions)}</span>,
    className: "hidden sm:table-cell",
  },
  {
    accessorKey: "clicks",
    header: "Clicks",
    cell: (row) => <span className="text-xs sm:text-sm">{formatNumber(row.clicks)}</span>,
  },
  {
    accessorKey: "ctr",
    header: "CTR",
    cell: (row) => <span className="text-xs sm:text-sm">{formatPercent(row.ctr)}</span>,
  },
  {
    accessorKey: "avgPosition",
    header: "Pos.",
    cell: (row) => <span className="text-xs sm:text-sm">{row.avgPosition.toFixed(1)}</span>,
  },
]

export function LandingPagePerformanceTable({ data }: LandingPagePerformanceTableProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm sm:text-base font-semibold">Landing Page Performance</h3>
      <DataTable
        data={data}
        columns={columns}
        searchable
        searchPlaceholder="Search URLs..."
        searchKey="url"
        pageSize={10}
      />
    </div>
  )
}
