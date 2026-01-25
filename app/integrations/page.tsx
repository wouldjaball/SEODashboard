'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, Info, Trash2, Plus, Youtube } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PropertyMapper } from '@/components/integrations/property-mapper'
import { OAUTH_SCOPES_STRING } from '@/lib/constants/oauth-scopes'

interface GoogleConnection {
  id: string
  googleIdentity: string
  googleIdentityName?: string
  youtubeChannelId?: string
  youtubeChannelName?: string
  createdAt: string
}

export default function IntegrationsPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [properties, setProperties] = useState([])
  const [sites, setSites] = useState([])
  const [youtubeChannels, setYoutubeChannels] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [showOAuthGuide, setShowOAuthGuide] = useState(false)
  const [connections, setConnections] = useState<GoogleConnection[]>([])
  const [deletingConnectionId, setDeletingConnectionId] = useState<string | null>(null)

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/integrations/status')

      if (!response.ok) {
        console.error('Failed to check connection:', response.status)
        setIsConnected(false)
        return
      }

      const data = await response.json()
      setIsConnected(data.connected || false)

      if (data.connected) {
        // Load cached properties/sites from database instead of calling Google APIs
        await loadCachedData()
      }
    } catch (error) {
      console.error('Failed to check connection:', error)
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Load cached properties, sites, channels, and connections from database
  async function loadCachedData() {
    try {
      const [propertiesRes, sitesRes, channelsRes, connectionsRes] = await Promise.all([
        fetch('/api/integrations/ga/properties/cached'),
        fetch('/api/integrations/gsc/sites/cached'),
        fetch('/api/integrations/youtube/channels/cached'),
        fetch('/api/integrations/connections')
      ])

      const propertiesData = await propertiesRes.json()
      const sitesData = await sitesRes.json()
      const channelsData = await channelsRes.json()
      const connectionsData = await connectionsRes.json()

      setProperties(propertiesData.properties || [])
      setSites(sitesData.sites || [])
      setYoutubeChannels(channelsData.channels || [])
      setConnections(connectionsData.connections || [])
    } catch (error) {
      console.error('Failed to load cached data:', error)
    }
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
        // If no connections left, mark as disconnected
        if (connections.length <= 1) {
          setIsConnected(false)
        }
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

  async function fetchAccountData() {
    setIsRefreshing(true)
    try {
      console.log('Fetching GA properties, GSC sites, and YouTube channels...')
      const [propertiesRes, sitesRes, channelsRes] = await Promise.all([
        fetch('/api/integrations/ga/properties'),
        fetch('/api/integrations/gsc/sites'),
        fetch('/api/integrations/youtube/channels?refresh=true')
      ])

      console.log('GA properties response status:', propertiesRes.status)
      console.log('GSC sites response status:', sitesRes.status)
      console.log('YouTube channels response status:', channelsRes.status)

      const propertiesData = await propertiesRes.json()
      const sitesData = await sitesRes.json()
      const channelsData = await channelsRes.json()

      console.log('Fetched properties:', propertiesData.properties?.length || 0)
      console.log('Fetched sites:', sitesData.sites?.length || 0)
      console.log('Fetched YouTube channels:', channelsData.channels?.length || 0)

      setProperties(propertiesData.properties || [])
      setSites(sitesData.sites || [])
      setYoutubeChannels(channelsData.channels || [])

      // Increment key to force PropertyMapper to remount and re-fetch mappings
      setRefreshKey(prev => prev + 1)

      alert(`Refreshed successfully!\n\nGA Properties: ${propertiesData.properties?.length || 0}\nGSC Sites: ${sitesData.sites?.length || 0}\nYouTube Channels: ${channelsData.channels?.length || 0}`)
    } catch (error) {
      console.error('Failed to fetch account data:', error)
      alert('Failed to fetch account data. Check console for details.')
    } finally {
      setIsRefreshing(false)
    }
  }

  function handleConnectClick() {
    // Show guidance dialog before starting OAuth
    setShowOAuthGuide(true)
  }

  function proceedWithOAuth() {
    setShowOAuthGuide(false)

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    if (!clientId) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured')
      alert('Google OAuth is not configured. Please contact support.')
      return
    }

    // Debug: Show what client ID we're using
    console.log('Using client ID:', clientId)
    console.log('Redirect URI:', `${window.location.origin}/api/auth/google/callback`)

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}/api/auth/google/callback`,
      response_type: 'code',
      scope: OAUTH_SCOPES_STRING,
      access_type: 'offline',
      // Force account picker + consent to ensure Brand Account selection appears
      // This is critical for YouTube channels owned by Brand Accounts
      prompt: 'select_account consent'
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    console.log('OAuth URL:', authUrl)

    window.location.href = authUrl
  }

  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect Google Analytics, Search Console, and YouTube?')) {
      return
    }

    try {
      await fetch('/api/integrations/disconnect', { method: 'POST' })
      setIsConnected(false)
      setProperties([])
      setSites([])
      setYoutubeChannels([])
    } catch (error) {
      console.error('Failed to disconnect:', error)
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect your Google account to fetch real analytics data
        </p>
      </div>

      {/* Connection Status Card */}
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
                  Analytics & Search Console integration
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
        <CardContent>
          {!isConnected ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Google account to access real-time data from Google Analytics 4
                and Google Search Console. You'll be able to map your properties to companies
                and view live analytics.
              </p>
              <Button onClick={handleConnectClick}>
                Connect Google Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connected Google Accounts */}
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

              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">Analytics Properties</span>
                  </div>
                  <p className="text-2xl font-bold">{properties.length}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">Search Console Sites</span>
                  </div>
                  <p className="text-2xl font-bold">{sites.length}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">YouTube Channels</span>
                  </div>
                  <p className="text-2xl font-bold">{youtubeChannels.length}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={fetchAccountData} variant="outline" disabled={isRefreshing}>
                  {isRefreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    'Refresh Properties & Sites'
                  )}
                </Button>
                <Button variant="destructive" onClick={handleDisconnect}>
                  Disconnect All
                </Button>
              </div>

              {/* Brand Account Tip */}
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                  <strong>Need YouTube Analytics for a Brand Account channel?</strong> Click "Add Account" and select the Brand Account (not your personal account) during the authorization process.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Mapper */}
      {isConnected && (
        <PropertyMapper key={refreshKey} properties={properties} sites={sites} youtubeChannels={youtubeChannels} />
      )}

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
