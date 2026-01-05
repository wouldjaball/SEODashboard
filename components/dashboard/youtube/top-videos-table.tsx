"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DataTable, type ColumnDef } from "@/components/dashboard/shared"
import { formatNumber, formatDuration } from "@/lib/utils"
import type { YTVideo } from "@/lib/types"

interface TopVideosTableProps {
  data: YTVideo[]
}

const columns: ColumnDef<YTVideo>[] = [
  {
    accessorKey: "title",
    header: "Video",
    cell: (row) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-16 rounded-md">
          <AvatarImage src={row.thumbnailUrl} alt={row.title} className="object-cover" />
          <AvatarFallback className="rounded-md bg-muted">VID</AvatarFallback>
        </Avatar>
        <div className="max-w-[300px] truncate font-medium" title={row.title}>
          {row.title}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "views",
    header: "Views",
    cell: (row) => formatNumber(row.views),
  },
  {
    accessorKey: "avgWatchTime",
    header: "Avg. Watch Time",
    cell: (row) => formatDuration(row.avgWatchTime),
  },
  {
    accessorKey: "shares",
    header: "Shares",
    cell: (row) => formatNumber(row.shares, { suffix: false }),
  },
]

export function TopVideosTable({ data }: TopVideosTableProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold">Top Videos Watched</h3>
      <DataTable
        data={data}
        columns={columns}
        searchable
        searchPlaceholder="Search videos..."
        searchKey="title"
        pageSize={10}
      />
    </div>
  )
}
