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
      <div className="max-w-[300px] truncate font-medium" title={row.url}>
        {row.url}
      </div>
    ),
  },
  {
    accessorKey: "impressions",
    header: "Impressions",
    cell: (row) => formatNumber(row.impressions),
  },
  {
    accessorKey: "clicks",
    header: "Clicks",
    cell: (row) => formatNumber(row.clicks),
  },
  {
    accessorKey: "ctr",
    header: "CTR",
    cell: (row) => formatPercent(row.ctr),
  },
  {
    accessorKey: "avgPosition",
    header: "Avg. Position",
    cell: (row) => row.avgPosition.toFixed(1),
  },
]

export function LandingPagePerformanceTable({ data }: LandingPagePerformanceTableProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold">Landing Page Performance</h3>
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
