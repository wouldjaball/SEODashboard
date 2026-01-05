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
      <div className="flex items-center gap-2 sm:gap-3">
        <Avatar className="h-8 w-12 sm:h-10 sm:w-16 rounded-md shrink-0">
          <AvatarImage src={row.thumbnailUrl} alt={row.title} className="object-cover" />
          <AvatarFallback className="rounded-md bg-muted text-[10px]">VID</AvatarFallback>
        </Avatar>
        <div className="max-w-[100px] sm:max-w-[200px] md:max-w-[300px] truncate font-medium text-xs sm:text-sm" title={row.title}>
          {row.title}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "views",
    header: "Views",
    cell: (row) => <span className="text-xs sm:text-sm">{formatNumber(row.views)}</span>,
  },
  {
    accessorKey: "avgWatchTime",
    header: "Watch",
    cell: (row) => <span className="text-xs sm:text-sm">{formatDuration(row.avgWatchTime)}</span>,
    className: "hidden sm:table-cell",
  },
  {
    accessorKey: "shares",
    header: "Shares",
    cell: (row) => <span className="text-xs sm:text-sm">{formatNumber(row.shares, { suffix: false })}</span>,
    className: "hidden sm:table-cell",
  },
]

export function TopVideosTable({ data }: TopVideosTableProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm sm:text-base font-semibold">Top Videos Watched</h3>
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
