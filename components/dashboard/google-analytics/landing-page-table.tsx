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
    header: "Page Title",
    cell: (row) => (
      <div className="max-w-[300px] truncate" title={row.pageTitle}>
        {row.pageTitle}
      </div>
    ),
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

export function LandingPageTable({ data }: LandingPageTableProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold">Landing Page Performance Overview</h3>
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
