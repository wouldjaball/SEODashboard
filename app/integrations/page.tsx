'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { PropertyMapper } from '@/components/integrations/property-mapper'
import { OAUTH_SCOPES_STRING } from '@/lib/constants/oauth-scopes'

export default function IntegrationsPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [properties, setProperties] = useState([])
  const [sites, setSites] = useState([])

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/integrations/status')
      const data = await response.json()
      setIsConnected(data.connected)

      if (data.connected) {
        await fetchAccountData()
      }
    } catch (error) {
      console.error('Failed to check connection:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchAccountData() {
    try {
      const [propertiesRes, sitesRes] = await Promise.all([
        fetch('/api/integrations/ga/properties'),
        fetch('/api/integrations/gsc/sites')
      ])

      const propertiesData = await propertiesRes.json()
      const sitesData = await sitesRes.json()

      setProperties(propertiesData.properties || [])
      setSites(sitesData.sites || [])
    } catch (error) {
      console.error('Failed to fetch account data:', error)
    }
  }

  async function handleConnect() {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      redirect_uri: `${window.location.origin}/api/auth/google/callback`,
      response_type: 'code',
      scope: OAUTH_SCOPES_STRING,
      access_type: 'offline',
      prompt: 'consent'
    })

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect Google Analytics and Search Console?')) {
      return
    }

    try {
      await fetch('/api/integrations/disconnect', { method: 'POST' })
      setIsConnected(false)
      setProperties([])
      setSites([])
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
    <div className="container max-w-6xl py-8 space-y-8">
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
              <Button onClick={handleConnect}>
                Connect Google Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <Button variant="destructive" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Mapper */}
      {isConnected && (
        <PropertyMapper properties={properties} sites={sites} />
      )}
    </div>
  )
}
