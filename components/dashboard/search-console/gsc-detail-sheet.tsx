"use client"

import * as React from "react"
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatNumber, formatPercent } from "@/lib/utils"
import type { GSCKeyword, GSCLandingPage } from "@/lib/types"

export type GSCDetailType =
  | "impressions"
  | "ctr"
  | "clicks"
  | "position"
  | "indexedPages"
  | "rankingKeywords"

interface GSCDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: GSCDetailType | null
  keywords: GSCKeyword[]
  landingPages: GSCLandingPage[]
}

type SortField = "query" | "url" | "impressions" | "clicks" | "ctr" | "avgPosition"
type SortDirection = "asc" | "desc"

const typeConfig: Record<GSCDetailType, {
  title: string
  description: string
  defaultSort: SortField
  defaultDirection: SortDirection
}> = {
  impressions: {
    title: "Impressions Breakdown",
    description: "Pages and queries sorted by impression count",
    defaultSort: "impressions",
    defaultDirection: "desc",
  },
  ctr: {
    title: "Click-Through Rate Breakdown",
    description: "Pages and queries sorted by CTR",
    defaultSort: "ctr",
    defaultDirection: "desc",
  },
  clicks: {
    title: "Clicks Breakdown",
    description: "Pages and queries sorted by click count",
    defaultSort: "clicks",
    defaultDirection: "desc",
  },
  position: {
    title: "Position Breakdown",
    description: "Pages and queries sorted by average position (best first)",
    defaultSort: "avgPosition",
    defaultDirection: "asc",
  },
  indexedPages: {
    title: "Indexed Pages",
    description: "All indexed pages in Google Search Console",
    defaultSort: "impressions",
    defaultDirection: "desc",
  },
  rankingKeywords: {
    title: "All Ranking Keywords",
    description: "Complete list of queries your site ranks for",
    defaultSort: "impressions",
    defaultDirection: "desc",
  },
}

export function GSCDetailSheet({
  open,
  onOpenChange,
  type,
  keywords,
  landingPages,
}: GSCDetailSheetProps) {
  const [search, setSearch] = React.useState("")
  const [sortField, setSortField] = React.useState<SortField>("impressions")
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc")

  // Reset state when type changes
  React.useEffect(() => {
    if (type) {
      const config = typeConfig[type]
      setSortField(config.defaultSort)
      setSortDirection(config.defaultDirection)
      setSearch("")
    }
  }, [type])

  if (!type) return null

  const config = typeConfig[type]
  const isKeywordView = type === "rankingKeywords" || type === "impressions" || type === "ctr" || type === "clicks" || type === "position"
  const isPageView = type === "indexedPages"

  // Filter and sort data
  const filteredKeywords = React.useMemo(() => {
    let data = [...keywords]

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase()
      data = data.filter(k => k.query.toLowerCase().includes(searchLower))
    }

    // Sort
    data.sort((a, b) => {
      let aVal: number | string
      let bVal: number | string

      switch (sortField) {
        case "query":
          aVal = a.query
          bVal = b.query
          break
        case "impressions":
          aVal = a.impressions
          bVal = b.impressions
          break
        case "clicks":
          aVal = a.clicks
          bVal = b.clicks
          break
        case "ctr":
          aVal = a.ctr
          bVal = b.ctr
          break
        case "avgPosition":
          aVal = a.avgPosition
          bVal = b.avgPosition
          break
        default:
          aVal = a.impressions
          bVal = b.impressions
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })

    return data
  }, [keywords, search, sortField, sortDirection])

  const filteredPages = React.useMemo(() => {
    let data = [...landingPages]

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase()
      data = data.filter(p => p.url.toLowerCase().includes(searchLower))
    }

    // Sort
    data.sort((a, b) => {
      let aVal: number | string
      let bVal: number | string

      switch (sortField) {
        case "url":
          aVal = a.url
          bVal = b.url
          break
        case "impressions":
          aVal = a.impressions
          bVal = b.impressions
          break
        case "clicks":
          aVal = a.clicks
          bVal = b.clicks
          break
        case "ctr":
          aVal = a.ctr
          bVal = b.ctr
          break
        case "avgPosition":
          aVal = a.avgPosition
          bVal = b.avgPosition
          break
        default:
          aVal = a.impressions
          bVal = b.impressions
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })

    return data
  }, [landingPages, search, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection(field === "avgPosition" ? "asc" : "desc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{config.title}</SheetTitle>
          <SheetDescription>{config.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isKeywordView ? "Search keywords..." : "Search pages..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            {isKeywordView
              ? `${filteredKeywords.length} keyword${filteredKeywords.length !== 1 ? 's' : ''}`
              : `${filteredPages.length} page${filteredPages.length !== 1 ? 's' : ''}`
            }
          </p>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  {isKeywordView ? (
                    <>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("query")}
                      >
                        <div className="flex items-center">
                          Query
                          <SortIcon field="query" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort("impressions")}
                      >
                        <div className="flex items-center justify-end">
                          Impr.
                          <SortIcon field="impressions" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort("clicks")}
                      >
                        <div className="flex items-center justify-end">
                          Clicks
                          <SortIcon field="clicks" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort("ctr")}
                      >
                        <div className="flex items-center justify-end">
                          CTR
                          <SortIcon field="ctr" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort("avgPosition")}
                      >
                        <div className="flex items-center justify-end">
                          Pos.
                          <SortIcon field="avgPosition" />
                        </div>
                      </TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("url")}
                      >
                        <div className="flex items-center">
                          Page URL
                          <SortIcon field="url" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort("impressions")}
                      >
                        <div className="flex items-center justify-end">
                          Impr.
                          <SortIcon field="impressions" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort("clicks")}
                      >
                        <div className="flex items-center justify-end">
                          Clicks
                          <SortIcon field="clicks" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort("ctr")}
                      >
                        <div className="flex items-center justify-end">
                          CTR
                          <SortIcon field="ctr" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort("avgPosition")}
                      >
                        <div className="flex items-center justify-end">
                          Pos.
                          <SortIcon field="avgPosition" />
                        </div>
                      </TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isKeywordView ? (
                  filteredKeywords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No keywords found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredKeywords.map((keyword, i) => (
                      <TableRow key={`${keyword.query}-${i}`}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {keyword.query}
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(keyword.impressions)}</TableCell>
                        <TableCell className="text-right">{formatNumber(keyword.clicks)}</TableCell>
                        <TableCell className="text-right">{formatPercent(keyword.ctr)}</TableCell>
                        <TableCell className="text-right">{keyword.avgPosition.toFixed(1)}</TableCell>
                      </TableRow>
                    ))
                  )
                ) : (
                  filteredPages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No pages found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPages.map((page, i) => (
                      <TableRow key={`${page.url}-${i}`}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {page.url}
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(page.impressions)}</TableCell>
                        <TableCell className="text-right">{formatNumber(page.clicks)}</TableCell>
                        <TableCell className="text-right">{formatPercent(page.ctr)}</TableCell>
                        <TableCell className="text-right">{page.avgPosition.toFixed(1)}</TableCell>
                      </TableRow>
                    ))
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
