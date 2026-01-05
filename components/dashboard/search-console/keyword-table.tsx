"use client"

import { DataTable, type ColumnDef } from "@/components/dashboard/shared"
import { formatNumber, formatPercent } from "@/lib/utils"
import type { GSCKeyword } from "@/lib/types"

interface KeywordTableProps {
  data: GSCKeyword[]
}

const columns: ColumnDef<GSCKeyword>[] = [
  {
    accessorKey: "query",
    header: "Query",
    cell: (row) => (
      <div className="max-w-[300px] truncate font-medium" title={row.query}>
        {row.query}
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

export function KeywordTable({ data }: KeywordTableProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold">Keyword Performance</h3>
      <DataTable
        data={data}
        columns={columns}
        searchable
        searchPlaceholder="Search keywords..."
        searchKey="query"
        pageSize={10}
      />
    </div>
  )
}
