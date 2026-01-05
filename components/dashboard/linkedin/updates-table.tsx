"use client"

import { ExternalLink } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DataTable, type ColumnDef } from "@/components/dashboard/shared"
import { formatNumber, formatPercent } from "@/lib/utils"
import type { LIUpdate } from "@/lib/types"
import { format, parseISO } from "date-fns"

interface UpdatesTableProps {
  data: LIUpdate[]
}

const columns: ColumnDef<LIUpdate>[] = [
  {
    accessorKey: "title",
    header: "Update",
    cell: (row) => (
      <div className="flex items-center gap-3 min-w-[200px]">
        {row.imageUrl && (
          <Avatar className="h-10 w-10 rounded-md shrink-0">
            <AvatarImage src={row.imageUrl} alt="" className="object-cover" />
            <AvatarFallback className="rounded-md bg-muted">LI</AvatarFallback>
          </Avatar>
        )}
        <div className="max-w-[250px] truncate" title={row.title}>
          {row.title}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "publishedAt",
    header: "Published",
    cell: (row) => format(parseISO(row.publishedAt), "MMM d, yyyy"),
  },
  {
    accessorKey: "impressions",
    header: "Impressions",
    cell: (row) => formatNumber(row.impressions),
  },
  {
    accessorKey: "videoViews",
    header: "Video Views",
    cell: (row) => row.videoViews > 0 ? formatNumber(row.videoViews) : "-",
  },
  {
    accessorKey: "clicks",
    header: "Clicks",
    cell: (row) => formatNumber(row.clicks, { suffix: false }),
  },
  {
    accessorKey: "ctr",
    header: "CTR",
    cell: (row) => formatPercent(row.ctr),
  },
  {
    accessorKey: "reactions",
    header: "Reactions",
    cell: (row) => formatNumber(row.reactions, { suffix: false }),
  },
  {
    accessorKey: "comments",
    header: "Comments",
    cell: (row) => formatNumber(row.comments, { suffix: false }),
  },
  {
    accessorKey: "shares",
    header: "Shares",
    cell: (row) => formatNumber(row.shares, { suffix: false }),
  },
  {
    accessorKey: "engagementRate",
    header: "Engagement",
    cell: (row) => formatPercent(row.engagementRate),
  },
  {
    accessorKey: "linkUrl",
    header: "",
    sortable: false,
    cell: (row) => (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        asChild
      >
        <a href={row.linkUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
        </a>
      </Button>
    ),
  },
]

export function UpdatesTable({ data }: UpdatesTableProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Updates</h3>
      <DataTable
        data={data}
        columns={columns}
        searchable
        searchPlaceholder="Search updates..."
        searchKey="title"
        pageSize={10}
      />
    </div>
  )
}
