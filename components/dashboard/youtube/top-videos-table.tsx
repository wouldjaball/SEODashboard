"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DataTable, type ColumnDef } from "@/components/dashboard/shared"
import { formatNumber, formatDuration } from "@/lib/utils"
import type { YTVideo } from "@/lib/types"

// Extended video type with optional likes/comments for public data
interface ExtendedYTVideo extends YTVideo {
  likes?: number
  comments?: number
}

interface TopVideosTableProps {
  data: ExtendedYTVideo[]
  isPublicDataOnly?: boolean
}

const fullColumns: ColumnDef<ExtendedYTVideo>[] = [
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

// Columns for public data mode (no watch time or shares)
const publicColumns: ColumnDef<ExtendedYTVideo>[] = [
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
    accessorKey: "likes",
    header: "Likes",
    cell: (row) => <span className="text-xs sm:text-sm">{formatNumber(row.likes || 0, { suffix: false })}</span>,
    className: "hidden sm:table-cell",
  },
  {
    accessorKey: "comments",
    header: "Comments",
    cell: (row) => <span className="text-xs sm:text-sm">{formatNumber(row.comments || 0, { suffix: false })}</span>,
    className: "hidden sm:table-cell",
  },
]

export function TopVideosTable({ data, isPublicDataOnly }: TopVideosTableProps) {
  const columns = isPublicDataOnly ? publicColumns : fullColumns
  const title = isPublicDataOnly ? "Recent Videos" : "Top Videos Watched"

  return (
    <div className="space-y-2">
      <h3 className="text-sm sm:text-base font-semibold">{title}</h3>
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
