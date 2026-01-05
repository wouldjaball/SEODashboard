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
      <div className="flex items-center gap-2 sm:gap-3">
        {row.imageUrl && (
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 rounded-md shrink-0 hidden sm:flex">
            <AvatarImage src={row.imageUrl} alt="" className="object-cover" />
            <AvatarFallback className="rounded-md bg-muted text-[10px]">LI</AvatarFallback>
          </Avatar>
        )}
        <div className="max-w-[120px] sm:max-w-[180px] md:max-w-[250px] truncate text-xs sm:text-sm" title={row.title}>
          {row.title}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "impressions",
    header: "Impr.",
    cell: (row) => <span className="text-xs sm:text-sm">{formatNumber(row.impressions)}</span>,
  },
  {
    accessorKey: "clicks",
    header: "Clicks",
    cell: (row) => <span className="text-xs sm:text-sm">{formatNumber(row.clicks, { suffix: false })}</span>,
    className: "hidden sm:table-cell",
  },
  {
    accessorKey: "reactions",
    header: "React.",
    cell: (row) => <span className="text-xs sm:text-sm">{formatNumber(row.reactions, { suffix: false })}</span>,
  },
  {
    accessorKey: "engagementRate",
    header: "Eng.",
    cell: (row) => <span className="text-xs sm:text-sm">{formatPercent(row.engagementRate)}</span>,
  },
  {
    accessorKey: "publishedAt",
    header: "Date",
    cell: (row) => <span className="text-xs sm:text-sm">{format(parseISO(row.publishedAt), "MMM d")}</span>,
    className: "hidden md:table-cell",
  },
  {
    accessorKey: "linkUrl",
    header: "",
    sortable: false,
    cell: (row) => (
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 sm:h-8 sm:w-8"
        asChild
      >
        <a href={row.linkUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </a>
      </Button>
    ),
  },
]

export function UpdatesTable({ data }: UpdatesTableProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm sm:text-lg font-semibold">Updates</h3>
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
