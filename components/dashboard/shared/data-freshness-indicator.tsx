'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useCompany } from '@/lib/company-context'
import { formatDistanceToNow } from 'date-fns'

const PLATFORM_LABELS: Record<string, string> = {
  ga: 'Google Analytics',
  gsc: 'Search Console',
  youtube: 'YouTube',
  linkedin: 'LinkedIn'
}

function getTimeBadgeVariant(dateStr: string | undefined): 'default' | 'secondary' | 'destructive' {
  if (!dateStr) return 'secondary'
  const hours = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60)
  if (hours <= 24) return 'default'
  if (hours <= 48) return 'secondary'
  return 'destructive'
}

export function DataFreshnessIndicator() {
  const { company } = useCompany()
  const freshness = company.dataFreshness

  if (!freshness) return null

  // Determine the most recent sync time across all platforms
  const syncTimes: string[] = []
  const platforms = ['ga', 'gsc', 'youtube', 'linkedin'] as const
  for (const p of platforms) {
    const pData = freshness[p]
    if (pData?.lastSync) syncTimes.push(pData.lastSync)
  }

  // Use fetchedAt/cachedAt as fallback
  const referenceTime = syncTimes.length > 0
    ? syncTimes.sort().pop()! // most recent
    : freshness.fetchedAt || freshness.cachedAt

  if (!referenceTime) return null

  const variant = getTimeBadgeVariant(referenceTime)
  const label = `Data from ${formatDistanceToNow(new Date(referenceTime), { addSuffix: true })}`

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={variant}
            className="cursor-help text-[10px] sm:text-xs font-normal whitespace-nowrap"
          >
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1.5">
            <p className="font-medium text-xs">Source: {freshness.source}</p>
            {platforms.map(p => {
              const pData = freshness[p]
              if (!pData) return null
              return (
                <div key={p} className="text-xs">
                  <span className="font-medium">{PLATFORM_LABELS[p]}:</span>{' '}
                  {pData.state === 'success' && pData.lastSync ? (
                    <span className="text-green-400">
                      Synced {formatDistanceToNow(new Date(pData.lastSync), { addSuffix: true })}
                      {pData.dataThrough && ` (through ${pData.dataThrough})`}
                    </span>
                  ) : pData.state === 'error' ? (
                    <span className="text-red-400">
                      Error ({pData.failures} failure{pData.failures !== 1 ? 's' : ''})
                    </span>
                  ) : pData.state === 'syncing' ? (
                    <span className="text-blue-400">Syncing...</span>
                  ) : (
                    <span className="text-muted-foreground">No data</span>
                  )}
                </div>
              )
            })}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
