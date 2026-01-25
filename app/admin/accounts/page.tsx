'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Save, CheckCircle, Plus, X, LayoutDashboard, Trash2, Youtube, RefreshCw, XCircle, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OAUTH_SCOPES_STRING } from '@/lib/constants/oauth-scopes'

interface GoogleConnection {
  id: string
  googleIdentity: string
  googleIdentityName?: string
  youtubeChannelId?: string
  youtubeChannelName?: string
  createdAt: string
}

interface Company {
  id: string
  name: string
  industry: string
  color: string
}

interface Account {
  id: string
  [key: string]: any
}

interface Mappings {
  [companyId: string]: {
    gaPropertyId: string
    gscSiteId: string
    youtubeChannelId: string
    linkedinPageId: string
  }
}

export default function AdminAccountsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [gaProperties, setGaProperties] = useState<Account[]>([])
  const [gscSites, setGscSites] = useState<Account[]>([])
  const [youtubeChannels, setYoutubeChannels] = useState<Account[]>([])
  const [linkedinPages, setLinkedinPages] = useState<Account[]>([])
  const [mappings, setMappings] = useState<Mappings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Add account forms
  const [showYouTubeForm, setShowYouTubeForm] = useState(false)
  const [showLinkedInForm, setShowLinkedInForm] = useState(false)
  const [youtubeForm, setYoutubeForm] = useState({ channel_id: '', channel_name: '', channel_handle: '' })
  const [linkedinForm, setLinkedinForm] = useState({ page_id: '', page_name: '', page_url: '' })
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)

  // Google connection state
  const [isConnected, setIsConnected] = useState(false)
  const [connections, setConnections] = useState<GoogleConnection[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showOAuthGuide, setShowOAuthGuide] = useState(false)
  const [deletingConnectionId, setDeletingConnectionId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()

    // Check for success message from OAuth callback
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      const channel = params.get('channel')
      const mapped = params.get('mapped')
      const company = params.get('company')

      if (mapped === 'true' && company && channel) {
        alert(`Successfully connected "${channel}" to ${company}!`)
      } else if (channel) {
        alert(`Successfully connected YouTube account with channel "${channel}"!`)
      }

      // Clean up URL
      window.history.replaceState({}, '', '/admin/accounts')
    } else if (params.get('error')) {
      alert('Failed to connect YouTube account. Please try again.')
      window.history.replaceState({}, '', '/admin/accounts')
    }
  }, [])

  async function fetchData() {
    setIsLoading(true)
    try {
      const [companiesRes, gaRes, gscRes, ytRes, liRes, mappingsRes, statusRes, connectionsRes] = await Promise.all([
        fetch('/api/admin/companies'),
        fetch('/api/integrations/ga/properties'),
        fetch('/api/integrations/gsc/sites'),
        fetch('/api/integrations/youtube/channels'),
        fetch('/api/integrations/linkedin/pages'),
        fetch('/api/integrations/mappings'),
        fetch('/api/integrations/status'),
        fetch('/api/integrations/connections')
      ])

      const [companiesData, gaData, gscData, ytData, liData, mappingsData, statusData, connectionsData] = await Promise.all([
        companiesRes.json(),
        gaRes.json(),
        gscRes.json(),
        ytRes.json(),
        liRes.json(),
        mappingsRes.json(),
        statusRes.json(),
        connectionsRes.json()
      ])

      setCompanies(companiesData.companies || [])
      setGaProperties(gaData.properties || [])
      setGscSites(gscData.sites || [])
      setYoutubeChannels(ytData.channels || [])
      setLinkedinPages(liData.pages || [])
      setMappings(mappingsData.mappings || {})
      setIsConnected(statusData.connected || false)
      setConnections(connectionsData.connections || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const response = await fetch('/api/integrations/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings })
      })

      if (response.ok) {
        alert('Account assignments saved successfully!')
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Save failed with status:', response.status, errorData)
        const errorMsg = errorData.details || errorData.message || errorData.error || `Save failed with status ${response.status}`
        throw new Error(errorMsg)
      }
    } catch (error) {
      console.error('Failed to save mappings:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to save assignments: ${errorMessage}\n\nCheck the browser console for details.`)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleClearCache() {
    if (!confirm('Clear all cached analytics data? This will force a fresh data fetch for all companies.')) {
      return
    }

    setIsClearingCache(true)
    try {
      const response = await fetch('/api/admin/clear-cache', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Cache cleared successfully! ${data.rowsDeleted || 0} entries removed. Reload the dashboard to fetch fresh data.`)
      } else {
        throw new Error('Failed to clear cache')
      }
    } catch (error) {
      console.error('Failed to clear cache:', error)
      alert('Failed to clear cache. Please try again.')
    } finally {
      setIsClearingCache(false)
    }
  }

  async function handleLookupYouTubeChannel() {
    if (!youtubeUrl.trim()) return

    setIsLookingUp(true)
    try {
      const response = await fetch('/api/integrations/youtube/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl })
      })

      if (response.ok) {
        const data = await response.json()
        setYoutubeForm({
          channel_id: data.channelId || '',
          channel_name: data.channelName || '',
          channel_handle: data.channelHandle || ''
        })
        setYoutubeUrl('')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to lookup channel')
      }
    } catch (error) {
      console.error('Failed to lookup YouTube channel:', error)
      alert('Failed to lookup channel. Please enter details manually.')
    } finally {
      setIsLookingUp(false)
    }
  }

  async function handleAddYouTubeChannel(e: React.FormEvent) {
    e.preventDefault()
    try {
      const response = await fetch('/api/integrations/youtube/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(youtubeForm)
      })

      if (response.ok) {
        await fetchData()
        setYoutubeForm({ channel_id: '', channel_name: '', channel_handle: '' })
        setShowYouTubeForm(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add channel')
      }
    } catch (error) {
      console.error('Failed to add YouTube channel:', error)
    }
  }

  async function handleAddLinkedInPage(e: React.FormEvent) {
    e.preventDefault()
    try {
      const response = await fetch('/api/integrations/linkedin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkedinForm)
      })

      if (response.ok) {
        await fetchData()
        setLinkedinForm({ page_id: '', page_name: '', page_url: '' })
        setShowLinkedInForm(false)
      }
    } catch (error) {
      console.error('Failed to add LinkedIn page:', error)
    }
  }

  // Connect YouTube for a specific company - triggers OAuth with Brand Account picker
  function connectYouTubeForCompany(companyId: string, companyName: string) {
    triggerOAuth({ companyId, companyName })
  }

  // General OAuth trigger - can optionally target a specific company
  function triggerOAuth(options?: { companyId?: string; companyName?: string }) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    if (!clientId) {
      alert('Google OAuth is not configured. Please contact support.')
      return
    }

    const state = JSON.stringify({
      companyId: options?.companyId,
      companyName: options?.companyName,
      returnTo: '/admin/accounts'
    })

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}/api/auth/google/callback`,
      response_type: 'code',
      scope: OAUTH_SCOPES_STRING,
      access_type: 'offline',
      prompt: 'select_account consent',
      state
    })

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  function handleConnectClick() {
    setShowOAuthGuide(true)
  }

  function proceedWithOAuth() {
    setShowOAuthGuide(false)
    triggerOAuth()
  }

  async function handleDeleteConnection(connectionId: string) {
    if (!confirm('Are you sure you want to remove this Google connection?')) {
      return
    }

    setDeletingConnectionId(connectionId)
    try {
      const response = await fetch('/api/integrations/connections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId })
      })

      if (response.ok) {
        setConnections(prev => prev.filter(c => c.id !== connectionId))
        if (connections.length <= 1) {
          setIsConnected(false)
        }
        await fetchData() // Refresh all data
      } else {
        alert('Failed to remove connection')
      }
    } catch (error) {
      console.error('Failed to delete connection:', error)
      alert('Failed to remove connection')
    } finally {
      setDeletingConnectionId(null)
    }
  }

  async function handleDisconnectAll() {
    if (!confirm('Are you sure you want to disconnect ALL Google accounts? This will remove access to GA, GSC, and YouTube.')) {
      return
    }

    try {
      await fetch('/api/integrations/disconnect', { method: 'POST' })
      setIsConnected(false)
      setConnections([])
      setGaProperties([])
      setGscSites([])
      setYoutubeChannels([])
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  async function handleRefreshProperties() {
    setIsRefreshing(true)
    try {
      const [propertiesRes, sitesRes, channelsRes] = await Promise.all([
        fetch('/api/integrations/ga/properties'),
        fetch('/api/integrations/gsc/sites'),
        fetch('/api/integrations/youtube/channels?refresh=true')
      ])

      const propertiesData = await propertiesRes.json()
      const sitesData = await sitesRes.json()
      const channelsData = await channelsRes.json()

      setGaProperties(propertiesData.properties || [])
      setGscSites(sitesData.sites || [])
      setYoutubeChannels(channelsData.channels || [])

      alert(`Refreshed!\n\nGA Properties: ${propertiesData.properties?.length || 0}\nGSC Sites: ${sitesData.sites?.length || 0}\nYouTube Channels: ${channelsData.channels?.length || 0}`)
    } catch (error) {
      console.error('Failed to refresh:', error)
      alert('Failed to refresh properties. Please try again.')
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Account Assignments</h1>
          <p className="text-muted-foreground mt-2">
            Assign analytics accounts to companies for dashboard reporting
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            View Dashboard
          </Button>
        </Link>
      </div>

      {/* Google Connection Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
              </div>
              <div>
                <CardTitle>Google Account</CardTitle>
                <CardDescription>
                  Connect to access Analytics, Search Console & YouTube
                </CardDescription>
              </div>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Not Connected</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Google account to access GA4 properties, Search Console sites, and YouTube channels.
              </p>
              <Button onClick={handleConnectClick}>
                Connect Google Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connected Accounts List */}
              {connections.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Connected Accounts</span>
                    <Button variant="outline" size="sm" onClick={handleConnectClick}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Account
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {connections.map((conn) => (
                      <div key={conn.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <svg className="h-4 w-4" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {conn.googleIdentityName || conn.googleIdentity}
                            </p>
                            {conn.youtubeChannelName && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Youtube className="h-3 w-3 text-red-500" />
                                {conn.youtubeChannelName}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteConnection(conn.id)}
                          disabled={deletingConnectionId === conn.id}
                        >
                          {deletingConnectionId === conn.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleRefreshProperties} variant="outline" disabled={isRefreshing}>
                  {isRefreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Properties & Sites
                    </>
                  )}
                </Button>
                <Button variant="destructive" onClick={handleDisconnectAll}>
                  Disconnect All
                </Button>
              </div>

              {/* Brand Account Tip */}
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                  <strong>Need YouTube Analytics for a Brand Account?</strong> Click "Add Account" and select the Brand Account (not your personal account) during authorization.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Accounts Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{gaProperties.length}</div>
            <p className="text-xs text-muted-foreground">GA Properties</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{gscSites.length}</div>
            <p className="text-xs text-muted-foreground">GSC Sites</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{youtubeChannels.length}</div>
            <p className="text-xs text-muted-foreground">YouTube Channels</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{linkedinPages.length}</div>
            <p className="text-xs text-muted-foreground">LinkedIn Pages</p>
          </CardContent>
        </Card>
      </div>

      {/* Add YouTube/LinkedIn Accounts */}
      <Tabs defaultValue="assignments">
        <TabsList>
          <TabsTrigger value="assignments">Company Assignments</TabsTrigger>
          <TabsTrigger value="accounts">Manage Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-6">
          {companies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No companies found. Please create a company first.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {companies.map((company) => {
                const mapping = mappings[company.id] || {
                  gaPropertyId: '',
                  gscSiteId: '',
                  youtubeChannelId: '',
                  linkedinPageId: ''
                }
                const accountsConfigured = [
                  mapping.gaPropertyId,
                  mapping.gscSiteId,
                  mapping.youtubeChannelId,
                  mapping.linkedinPageId
                ].filter(Boolean).length

                return (
                  <Card key={company.id}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: company.color }}
                        >
                          {company.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <CardTitle>{company.name}</CardTitle>
                          <CardDescription>{company.industry}</CardDescription>
                        </div>
                        <Badge variant={accountsConfigured > 0 ? 'default' : 'secondary'}>
                          {accountsConfigured > 0 ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {accountsConfigured} / 4 Configured
                            </>
                          ) : (
                            'Not Configured'
                          )}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Google Analytics Property</Label>
                          <Select
                            value={mapping.gaPropertyId || 'none'}
                            onValueChange={(value) =>
                              setMappings(prev => ({
                                ...prev,
                                [company.id]: { ...mapping, gaPropertyId: value === 'none' ? '' : value }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-- None --</SelectItem>
                              {gaProperties.map((prop: any) => (
                                <SelectItem key={prop.id} value={prop.id}>
                                  {prop.displayName || prop.property_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Search Console Site</Label>
                          <Select
                            value={mapping.gscSiteId || 'none'}
                            onValueChange={(value) =>
                              setMappings(prev => ({
                                ...prev,
                                [company.id]: { ...mapping, gscSiteId: value === 'none' ? '' : value }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select site" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-- None --</SelectItem>
                              {gscSites.map((site: any) => (
                                <SelectItem key={site.id} value={site.id}>
                                  {site.siteUrl || site.site_url}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">YouTube Channel</Label>
                          <div className="flex gap-2">
                            <Select
                              value={mapping.youtubeChannelId || 'none'}
                              onValueChange={(value) =>
                                setMappings(prev => ({
                                  ...prev,
                                  [company.id]: { ...mapping, youtubeChannelId: value === 'none' ? '' : value }
                                }))
                              }
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select channel" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-- None --</SelectItem>
                                {youtubeChannels.map((channel: any) => (
                                  <SelectItem key={channel.id} value={channel.id}>
                                    {channel.channelName || channel.channel_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => connectYouTubeForCompany(company.id, company.name)}
                              title={`Connect YouTube channel for ${company.name}`}
                            >
                              <Youtube className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Click the YouTube icon to connect a Brand Account channel
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">LinkedIn Page</Label>
                          <Select
                            value={mapping.linkedinPageId || 'none'}
                            onValueChange={(value) =>
                              setMappings(prev => ({
                                ...prev,
                                [company.id]: { ...mapping, linkedinPageId: value === 'none' ? '' : value }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select page" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-- None --</SelectItem>
                              {linkedinPages.map((page: any) => (
                                <SelectItem key={page.id} value={page.id}>
                                  {page.page_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={isSaving} className="flex-1" size="lg">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save All Assignments
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleClearCache}
                  disabled={isClearingCache}
                  variant="outline"
                  size="lg"
                  title="Clear cached analytics data to force fresh fetch"
                >
                  {isClearingCache ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          {/* YouTube Channels */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>YouTube Channels</CardTitle>
                  <CardDescription>Add YouTube channels to assign to companies. For Brand Account channels, add them manually below.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowYouTubeForm(!showYouTubeForm)}>
                  {showYouTubeForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4 mr-2" />}
                  {showYouTubeForm ? 'Cancel' : 'Add Channel'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showYouTubeForm && (
                <div className="border rounded-lg p-4 space-y-4">
                  {/* URL Lookup Section */}
                  <div className="space-y-2">
                    <Label htmlFor="yt-url">Quick Add - Paste YouTube Channel URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="yt-url"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://youtube.com/@channelname or https://youtube.com/channel/UC..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleLookupYouTubeChannel}
                        disabled={isLookingUp || !youtubeUrl.trim()}
                      >
                        {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Paste a YouTube channel URL and click Lookup to auto-fill the details below
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                    </div>
                  </div>

                  <form onSubmit={handleAddYouTubeChannel} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="yt-id">Channel ID *</Label>
                      <Input
                        id="yt-id"
                        value={youtubeForm.channel_id}
                        onChange={(e) => setYoutubeForm({ ...youtubeForm, channel_id: e.target.value })}
                        placeholder="UCxxxxxxxxxxxxxxxxxxxxxxx"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Find this in the channel URL (youtube.com/channel/UCxxxxx) or channel settings
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="yt-name">Channel Name *</Label>
                      <Input
                        id="yt-name"
                        value={youtubeForm.channel_name}
                        onChange={(e) => setYoutubeForm({ ...youtubeForm, channel_name: e.target.value })}
                        placeholder="My Channel Name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="yt-handle">Channel Handle</Label>
                      <Input
                        id="yt-handle"
                        value={youtubeForm.channel_handle}
                        onChange={(e) => setYoutubeForm({ ...youtubeForm, channel_handle: e.target.value })}
                        placeholder="@channelname"
                      />
                    </div>
                    <Button type="submit">Add Channel</Button>
                  </form>
                </div>
              )}

              {youtubeChannels.length === 0 ? (
                <p className="text-sm text-muted-foreground">No YouTube channels added yet</p>
              ) : (
                <div className="space-y-2">
                  {youtubeChannels.map((channel: any) => (
                    <div key={channel.id} className="flex items-center justify-between border rounded p-3">
                      <div>
                        <p className="font-medium">{channel.channelName || channel.channel_name}</p>
                        {(channel.channelHandle || channel.channel_handle) && (
                          <p className="text-sm text-muted-foreground">{channel.channelHandle || channel.channel_handle}</p>
                        )}
                      </div>
                      <Badge variant="outline">{channel.channelId || channel.channel_id}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* LinkedIn Pages */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>LinkedIn Pages</CardTitle>
                  <CardDescription>Add LinkedIn pages to assign to companies</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowLinkedInForm(!showLinkedInForm)}>
                  {showLinkedInForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4 mr-2" />}
                  {showLinkedInForm ? 'Cancel' : 'Add Page'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showLinkedInForm && (
                <form onSubmit={handleAddLinkedInPage} className="border rounded-lg p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="li-id">Page ID *</Label>
                    <Input
                      id="li-id"
                      value={linkedinForm.page_id}
                      onChange={(e) => setLinkedinForm({ ...linkedinForm, page_id: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="li-name">Page Name *</Label>
                    <Input
                      id="li-name"
                      value={linkedinForm.page_name}
                      onChange={(e) => setLinkedinForm({ ...linkedinForm, page_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="li-url">Page URL</Label>
                    <Input
                      id="li-url"
                      type="url"
                      value={linkedinForm.page_url}
                      onChange={(e) => setLinkedinForm({ ...linkedinForm, page_url: e.target.value })}
                      placeholder="https://linkedin.com/company/..."
                    />
                  </div>
                  <Button type="submit">Add Page</Button>
                </form>
              )}

              {linkedinPages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No LinkedIn pages added yet</p>
              ) : (
                <div className="space-y-2">
                  {linkedinPages.map((page: any) => (
                    <div key={page.id} className="flex items-center justify-between border rounded p-3">
                      <div>
                        <p className="font-medium">{page.page_name}</p>
                        {page.page_url && (
                          <p className="text-sm text-muted-foreground">{page.page_url}</p>
                        )}
                      </div>
                      <Badge variant="outline">{page.page_id}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pre-OAuth Guidance Dialog */}
      <Dialog open={showOAuthGuide} onOpenChange={setShowOAuthGuide}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Connecting Your Google Account</DialogTitle>
            <DialogDescription>
              Important: Read this before connecting, especially for YouTube Brand Accounts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>For YouTube Analytics:</strong> If your YouTube channel is owned by a Brand Account
                (not your personal Google account), you must select the Brand Account during authorization.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <p className="font-medium">You'll see a two-step process:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong>Select your Google Account</strong> - Choose the Google account you use to manage your properties
                </li>
                <li>
                  <strong>Select the Brand Account (if applicable)</strong> - After selecting your Google account,
                  you'll see a list of accounts you can act as. <span className="text-foreground font-medium">Select the account that OWNS the YouTube channel</span> you want analytics for.
                </li>
              </ol>
            </div>

            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm">
                <strong>Tip:</strong> If you manage multiple YouTube channels with different owners,
                you may need to connect multiple times, selecting a different Brand Account each time.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowOAuthGuide(false)}>
              Cancel
            </Button>
            <Button onClick={proceedWithOAuth}>
              Continue to Google
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
