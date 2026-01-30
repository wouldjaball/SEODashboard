"use client"

import * as React from "react"
import { Search, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle } from "lucide-react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  // Reset state when type changes
  React.useEffect(() => {
    if (type && open) {
      try {
        setIsLoading(true)
        const config = typeConfig[type]
        setSortField(config.defaultSort)
        setSortDirection(config.defaultDirection)
        setSearch("")
        setError(null)
        
        // Simulate brief loading for better UX
        setTimeout(() => setIsLoading(false), 300)
      } catch (err) {
        console.error('Error resetting state:', err)
        setError('Failed to initialize component')
        setIsLoading(false)
      }
    }
  }, [type, open])

  if (!type) {
    console.log('[GSCDetailSheet] No type provided, returning null')
    return null
  }

  console.log('[GSCDetailSheet] Rendering with:', {
    type,
    open,
    keywordsLength: keywords?.length || 0,
    landingPagesLength: landingPages?.length || 0
  })

  const config = typeConfig[type]
  const isKeywordView = type === "rankingKeywords" || type === "impressions" || type === "ctr" || type === "clicks" || type === "position"
  const isPageView = type === "indexedPages"

  console.log('[GSCDetailSheet] View type:', { isKeywordView, isPageView, type })

  // Filter and sort data
  const filteredKeywords = React.useMemo(() => {
    try {
      // Validate keywords data
      if (!Array.isArray(keywords)) {
        console.warn('[GSCDetailSheet] Keywords is not an array:', keywords)
        return []
      }

      console.log('[GSCDetailSheet] Original keywords count:', keywords.length)
      let data = keywords.filter(k => {
        if (!k || typeof k !== 'object') {
          console.warn('[GSCDetailSheet] Invalid keyword object:', k)
          return false
        }
        // Less strict validation - allow objects with at least a query property
        return k.query !== undefined && k.query !== null
      })
      console.log('[GSCDetailSheet] Filtered keywords count:', data.length)

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase()
        data = data.filter(k => {
          return k.query && typeof k.query === 'string' && k.query.toLowerCase().includes(searchLower)
        })
      }

      // Sort
      data.sort((a, b) => {
        if (!a || !b) return 0
        
        let aVal: number | string
        let bVal: number | string

        try {
          switch (sortField) {
            case "query":
              aVal = a.query || ''
              bVal = b.query || ''
              break
            case "impressions":
              aVal = a.impressions || 0
              bVal = b.impressions || 0
              break
            case "clicks":
              aVal = a.clicks || 0
              bVal = b.clicks || 0
              break
            case "ctr":
              aVal = a.ctr || 0
              bVal = b.ctr || 0
              break
            case "avgPosition":
              aVal = a.avgPosition || 0
              bVal = b.avgPosition || 0
              break
            default:
              aVal = a.impressions || 0
              bVal = b.impressions || 0
          }

          if (typeof aVal === "string" && typeof bVal === "string") {
            return sortDirection === "asc"
              ? aVal.localeCompare(bVal)
              : bVal.localeCompare(aVal)
          }

          return sortDirection === "asc"
            ? (aVal as number) - (bVal as number)
            : (bVal as number) - (aVal as number)
        } catch (sortError) {
          console.error('Error sorting keywords:', sortError)
          return 0
        }
      })

      return data
    } catch (err) {
      console.error('Error filtering keywords:', err)
      setError('Failed to process keywords data')
      return []
    }
  }, [keywords, search, sortField, sortDirection])

  const filteredPages = React.useMemo(() => {
    try {
      // Validate landing pages data
      if (!Array.isArray(landingPages)) {
        console.warn('[GSCDetailSheet] Landing pages is not an array:', landingPages)
        return []
      }

      console.log('[GSCDetailSheet] Original landing pages count:', landingPages.length)
      let data = landingPages.filter(p => {
        if (!p || typeof p !== 'object') {
          console.warn('[GSCDetailSheet] Invalid page object:', p)
          return false
        }
        // Less strict validation - allow objects with at least a url property
        return p.url !== undefined && p.url !== null
      })
      console.log('[GSCDetailSheet] Filtered landing pages count:', data.length)

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase()
        data = data.filter(p => {
          return p.url && typeof p.url === 'string' && p.url.toLowerCase().includes(searchLower)
        })
      }

      // Sort
      data.sort((a, b) => {
        if (!a || !b) return 0
        
        let aVal: number | string
        let bVal: number | string

        try {
          switch (sortField) {
            case "url":
              aVal = a.url || ''
              bVal = b.url || ''
              break
            case "impressions":
              aVal = a.impressions || 0
              bVal = b.impressions || 0
              break
            case "clicks":
              aVal = a.clicks || 0
              bVal = b.clicks || 0
              break
            case "ctr":
              aVal = a.ctr || 0
              bVal = b.ctr || 0
              break
            case "avgPosition":
              aVal = a.avgPosition || 0
              bVal = b.avgPosition || 0
              break
            default:
              aVal = a.impressions || 0
              bVal = b.impressions || 0
          }

          if (typeof aVal === "string" && typeof bVal === "string") {
            return sortDirection === "asc"
              ? aVal.localeCompare(bVal)
              : bVal.localeCompare(aVal)
          }

          return sortDirection === "asc"
            ? (aVal as number) - (bVal as number)
            : (bVal as number) - (aVal as number)
        } catch (sortError) {
          console.error('Error sorting pages:', sortError)
          return 0
        }
      })

      return data
    } catch (err) {
      console.error('Error filtering pages:', err)
      setError('Failed to process landing pages data')
      return []
    }
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
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {config.title}
            {isKeywordView && keywords && ` (${keywords.length} total)`}
            {isPageView && landingPages && ` (${landingPages.length} total)`}
          </SheetTitle>
          <SheetDescription>{config.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="space-y-2 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground">Loading data...</p>
                </div>
              </div>
            ) : (
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
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="space-y-2">
                          <p className="text-lg font-medium text-muted-foreground">
                            {search ? 'No keywords match your search' : 'No keywords available'}
                          </p>
                          {search && (
                            <p className="text-sm text-muted-foreground">
                              Try adjusting your search terms or clear the filter
                            </p>
                          )}
                          {!search && keywords.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                              Keywords data may be unavailable for the selected date range
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredKeywords.map((keyword, i) => {
                      if (!keyword) return null
                      return (
                        <TableRow key={`${keyword.query || 'unknown'}-${i}`}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {keyword.query || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(keyword.impressions || 0)}</TableCell>
                          <TableCell className="text-right">{formatNumber(keyword.clicks || 0)}</TableCell>
                          <TableCell className="text-right">{formatPercent(keyword.ctr || 0)}</TableCell>
                          <TableCell className="text-right">{(keyword.avgPosition || 0).toFixed(1)}</TableCell>
                        </TableRow>
                      )
                    })
                  )
                ) : (
                  filteredPages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="space-y-2">
                          <p className="text-lg font-medium text-muted-foreground">
                            {search ? 'No pages match your search' : 'No pages available'}
                          </p>
                          {search && (
                            <p className="text-sm text-muted-foreground">
                              Try adjusting your search terms or clear the filter
                            </p>
                          )}
                          {!search && landingPages.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                              Landing pages data may be unavailable for the selected date range
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPages.map((page, i) => {
                      if (!page) return null
                      return (
                        <TableRow key={`${page.url || 'unknown'}-${i}`}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {page.url || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(page.impressions || 0)}</TableCell>
                          <TableCell className="text-right">{formatNumber(page.clicks || 0)}</TableCell>
                          <TableCell className="text-right">{formatPercent(page.ctr || 0)}</TableCell>
                          <TableCell className="text-right">{(page.avgPosition || 0).toFixed(1)}</TableCell>
                        </TableRow>
                      )
                    })
                  )
                )}
              </TableBody>
            </Table>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
