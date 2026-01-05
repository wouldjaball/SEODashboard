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
      <div className="max-w-[120px] sm:max-w-[200px] md:max-w-[300px] truncate font-medium text-xs sm:text-sm" title={row.query}>
        {row.query}
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

export function KeywordTable({ data }: KeywordTableProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm sm:text-base font-semibold">Keyword Performance</h3>
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
