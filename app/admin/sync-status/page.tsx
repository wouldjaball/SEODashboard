'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Loader2, RefreshCw, Activity, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface SyncStatus {
  company_id: string
  platform: string
  sync_state: string | null
  last_sync_at: string | null
  last_success_at: string | null
  last_error: string | null
  last_error_at: string | null
  consecutive_failures: number
  data_start_date: string | null
  data_end_date: string | null
  companies: { name: string } | null
}

interface TokenHealth {
  userId: string
  provider: string
  expiresAt: string | null
  updatedAt: string | null
  isExpired: boolean
  expiresSoon: boolean
  companyIds: string[]
}

interface SyncStatusResponse {
  syncStatuses: SyncStatus[]
  tokenHealth: TokenHealth[]
  lastUpdated: string
}

const PLATFORMS = ['ga', 'gsc', 'youtube', 'linkedin'] as const
const PLATFORM_LABELS: Record<string, string> = {
  ga: 'GA',
  gsc: 'GSC',
  youtube: 'YouTube',
  linkedin: 'LinkedIn'
}

function getPlatformBadge(status: SyncStatus | undefined) {
  if (!status) {
    return <Badge variant="outline" className="text-muted-foreground">No data</Badge>
  }

  const state = status.sync_state
  const lastSuccess = status.last_success_at ? new Date(status.last_success_at) : null
  const hoursSinceSuccess = lastSuccess
    ? (Date.now() - lastSuccess.getTime()) / (1000 * 60 * 60)
    : Infinity

  if (state === 'syncing') {
    return <Badge className="bg-blue-500 hover:bg-blue-600">Syncing</Badge>
  }

  if (state === 'error' || status.last_error) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="cursor-help">Error</Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium">Last error:</p>
          <p className="text-xs">{status.last_error || 'Unknown error'}</p>
          {status.last_error_at && (
            <p className="text-xs mt-1 opacity-75">
              {formatDistanceToNow(new Date(status.last_error_at), { addSuffix: true })}
            </p>
          )}
          {status.consecutive_failures > 0 && (
            <p className="text-xs mt-1">Failures: {status.consecutive_failures}</p>
          )}
        </TooltipContent>
      </Tooltip>
    )
  }

  if (state === 'success' && lastSuccess) {
    if (hoursSinceSuccess <= 48) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="bg-green-500 hover:bg-green-600 cursor-help">OK</Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Last sync: {formatDistanceToNow(lastSuccess, { addSuffix: true })}</p>
            {status.data_end_date && <p className="text-xs">Data through: {status.data_end_date}</p>}
          </TooltipContent>
        </Tooltip>
      )
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black cursor-help">Stale</Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Last sync: {formatDistanceToNow(lastSuccess, { addSuffix: true })}</p>
          {status.data_end_date && <p className="text-xs">Data through: {status.data_end_date}</p>}
        </TooltipContent>
      </Tooltip>
    )
  }

  // Never synced
  return <Badge variant="secondary">Never synced</Badge>
}

export default function SyncStatusPage() {
  const [data, setData] = useState<SyncStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncingCompanyId, setSyncingCompanyId] = useState<string | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/sync-status')
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch sync status')
      }
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [fetchData])

  async function triggerSync(companyIds?: string[]) {
    if (companyIds) {
      setSyncingCompanyId(companyIds[0])
    } else {
      setSyncingAll(true)
    }

    try {
      const response = await fetch('/api/admin/trigger-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyIds ? { companyIds } : {})
      })

      if (!response.ok) {
        const err = await response.json()
        alert(`Sync failed: ${err.error}`)
      }

      // Refresh data after a short delay
      setTimeout(fetchData, 2000)
    } catch (e: any) {
      alert(`Sync failed: ${e.message}`)
    } finally {
      setSyncingCompanyId(null)
      setSyncingAll(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-6xl py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <XCircle className="h-8 w-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  // Group sync statuses by company
  const companyMap = new Map<string, { name: string; statuses: Map<string, SyncStatus> }>()
  data.syncStatuses.forEach(s => {
    if (!companyMap.has(s.company_id)) {
      companyMap.set(s.company_id, {
        name: s.companies?.name || 'Unknown',
        statuses: new Map()
      })
    }
    companyMap.get(s.company_id)!.statuses.set(s.platform, s)
  })

  // Summary stats
  const companies = Array.from(companyMap.entries())
  const totalCompanies = companies.length
  const healthyCompanies = companies.filter(([, c]) => {
    return Array.from(c.statuses.values()).some(s => s.sync_state === 'success')
  }).length
  const errorCompanies = companies.filter(([, c]) => {
    return Array.from(c.statuses.values()).some(s => s.sync_state === 'error')
  }).length
  const neverSynced = companies.filter(([, c]) => {
    return Array.from(c.statuses.values()).every(s => !s.last_success_at)
  }).length

  // Token health summary
  const expiredTokens = data.tokenHealth.filter(t => t.isExpired)
  const expiringSoonTokens = data.tokenHealth.filter(t => t.expiresSoon)

  return (
    <TooltipProvider>
      <div className="container max-w-7xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-8 w-8" />
              Sync Status
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor data sync health across all companies
            </p>
          </div>
          <Button
            onClick={() => triggerSync()}
            disabled={syncingAll}
          >
            {syncingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync All
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalCompanies}</div>
              <p className="text-sm text-muted-foreground">Total Companies</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{healthyCompanies}</div>
              <p className="text-sm text-muted-foreground">Healthy Syncs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{errorCompanies}</div>
              <p className="text-sm text-muted-foreground">With Errors</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">{neverSynced}</div>
              <p className="text-sm text-muted-foreground">Never Synced</p>
            </CardContent>
          </Card>
        </div>

        {/* Company Sync Table */}
        <Card>
          <CardHeader>
            <CardTitle>Company Sync Health</CardTitle>
            <CardDescription>
              Auto-refreshes every 30 seconds. Last updated: {formatDistanceToNow(new Date(data.lastUpdated), { addSuffix: true })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium">Company</th>
                    {PLATFORMS.map(p => (
                      <th key={p} className="pb-3 px-2 font-medium text-center">{PLATFORM_LABELS[p]}</th>
                    ))}
                    <th className="pb-3 px-2 font-medium">Last Sync</th>
                    <th className="pb-3 pl-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map(([companyId, company]) => {
                    const lastSyncTimes = Array.from(company.statuses.values())
                      .filter(s => s.last_success_at)
                      .map(s => new Date(s.last_success_at!).getTime())
                    const lastSync = lastSyncTimes.length > 0
                      ? new Date(Math.max(...lastSyncTimes))
                      : null

                    return (
                      <tr key={companyId} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{company.name}</td>
                        {PLATFORMS.map(p => (
                          <td key={p} className="py-3 px-2 text-center">
                            {getPlatformBadge(company.statuses.get(p))}
                          </td>
                        ))}
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {lastSync ? (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(lastSync, { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </td>
                        <td className="py-3 pl-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => triggerSync([companyId])}
                            disabled={syncingCompanyId === companyId}
                          >
                            {syncingCompanyId === companyId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            <span className="ml-1">Sync</span>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Token Health */}
        {(expiredTokens.length > 0 || expiringSoonTokens.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Token Health
              </CardTitle>
              <CardDescription>
                OAuth tokens that need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expiredTokens.map((t, i) => (
                  <div key={`expired-${i}`} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Badge variant="destructive">Expired</Badge>
                    <span className="text-sm font-medium">{t.provider}</span>
                    <span className="text-sm text-muted-foreground">
                      User: {t.userId.slice(0, 8)}...
                    </span>
                    {t.companyIds.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Affects {t.companyIds.length} company(ies)
                      </span>
                    )}
                  </div>
                ))}
                {expiringSoonTokens.map((t, i) => (
                  <div key={`expiring-${i}`} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Expiring Soon</Badge>
                    <span className="text-sm font-medium">{t.provider}</span>
                    <span className="text-sm text-muted-foreground">
                      Expires {formatDistanceToNow(new Date(t.expiresAt!), { addSuffix: true })}
                    </span>
                    {t.companyIds.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Affects {t.companyIds.length} company(ies)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All tokens healthy indicator */}
        {expiredTokens.length === 0 && expiringSoonTokens.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span>All OAuth tokens are healthy</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}
