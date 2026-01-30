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
import { Loader2, Save, CheckCircle, Plus, X, LayoutDashboard, Trash2, Youtube, RefreshCw, XCircle, Info, Settings2 } from 'lucide-react'
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
import { LINKEDIN_OAUTH_SCOPES_STRING } from '@/lib/constants/linkedin-oauth-scopes'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface GoogleConnection {
  id: string
  googleIdentity: string
  googleIdentityName?: string
  youtubeChannelId?: string
  youtubeChannelName?: string
  createdAt: string
}

interface LinkedInConnection {
  id: string
  linkedinOrganizationId: string
  linkedinOrganizationName?: string
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
  displayName?: string
  property_name?: string
  siteUrl?: string
  site_url?: string
  channelId?: string
  channel_id?: string
  channelName?: string
  channel_name?: string
  channelHandle?: string
  channel_handle?: string
  page_id?: string
  page_name?: string
  page_url?: string
}

interface Mappings {
  [companyId: string]: {
    gaPropertyId: string
    gscSiteId: string
    youtubeChannelId: string
    linkedinPageId: string
  }
}

interface LinkedInSheetConfig {
  id?: string
  pageAnalyticsSheetId: string
  pageAnalyticsRange: string
  postAnalyticsSheetId: string
  postAnalyticsRange: string
  campaignAnalyticsSheetId: string
  campaignAnalyticsRange: string
  demographicsSheetId: string
  demographicsRange: string
}

interface LinkedInSheetConfigs {
  [companyId: string]: LinkedInSheetConfig
}

interface LinkedInOrganization {
  id: string
  name: string
  vanityName?: string
  logoUrl?: string
  alreadySaved?: boolean
}

export default function AdminAccountsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [gaProperties, setGaProperties] = useState<Account[]>([])
  const [gscSites, setGscSites] = useState<Account[]>([])
  const [youtubeChannels, setYoutubeChannels] = useState<Account[]>([])
  const [linkedinPages, setLinkedinPages] = useState<Account[]>([])
  const [mappings, setMappings] = useState<Mappings>({})
  const [linkedinSheetConfigs, setLinkedinSheetConfigs] = useState<LinkedInSheetConfigs>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Add account forms
  const [showYouTubeForm, setShowYouTubeForm] = useState(false)
  const [showLinkedInForm, setShowLinkedInForm] = useState(false)
  const [showLinkedInSheetsForm, setShowLinkedInSheetsForm] = useState<string | null>(null) // company id if showing
  const [youtubeForm, setYoutubeForm] = useState({ channel_id: '', channel_name: '', channel_handle: '' })
  const [linkedinForm, setLinkedinForm] = useState({ page_id: '', page_name: '', page_url: '' })
  const [isSavingSheetConfig, setIsSavingSheetConfig] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [isLookingUpLinkedIn, setIsLookingUpLinkedIn] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)

  // Google connection state
  const [isConnected, setIsConnected] = useState(false)
  const [connections, setConnections] = useState<GoogleConnection[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showOAuthGuide, setShowOAuthGuide] = useState(false)
  const [deletingConnectionId, setDeletingConnectionId] = useState<string | null>(null)

  // LinkedIn connection state
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false)
  const [linkedinConnections, setLinkedinConnections] = useState<LinkedInConnection[]>([])
  const [deletingLinkedInConnectionId, setDeletingLinkedInConnectionId] = useState<string | null>(null)

  // LinkedIn organization selection dialog
  const [showLinkedInOrgDialog, setShowLinkedInOrgDialog] = useState(false)
  const [availableLinkedInOrgs, setAvailableLinkedInOrgs] = useState<LinkedInOrganization[]>([])
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set())
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false)
  const [isSavingOrgs, setIsSavingOrgs] = useState(false)
  // For company-specific LinkedIn org mapping (after OAuth redirect)
  const [pendingMappingCompanyId, setPendingMappingCompanyId] = useState<string | null>(null)
  const [pendingMappingCompanyName, setPendingMappingCompanyName] = useState<string | null>(null)

  // Open org selection dialog when we have a pending mapping and data is loaded
  useEffect(() => {
    if (pendingMappingCompanyId && !isLoading && isLinkedInConnected) {
      setShowLinkedInOrgDialog(true)
      fetchLinkedInOrganizations()
    }
  }, [pendingMappingCompanyId, isLoading, isLinkedInConnected])

  useEffect(() => {
    fetchData()

    // Check for success message from OAuth callback
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      const provider = params.get('provider')
      const channel = params.get('channel')
      const organization = params.get('organization')
      const mapped = params.get('mapped')
      const company = params.get('company')

      if (provider === 'linkedin') {
        // Check if this is a pending mapping (user needs to select org for a company)
        const pendingMapping = params.get('pendingMapping')
        const pendingCompanyId = params.get('companyId')
        const pendingCompanyName = params.get('companyName')

        if (pendingMapping === 'true' && pendingCompanyId) {
          // Open org selection dialog for the target company
          setPendingMappingCompanyId(pendingCompanyId)
          setPendingMappingCompanyName(pendingCompanyName)
          // Dialog will be opened after data is fetched
          // Don't clean up URL yet - will be done when dialog closes
          return
        } else if (organization) {
          alert(`Successfully connected LinkedIn organization "${organization}"!`)
        } else {
          alert('Successfully connected LinkedIn account!')
        }
      } else {
        // Google OAuth success
        if (mapped === 'true' && company && channel) {
          alert(`Successfully connected "${channel}" to ${company}!`)
        } else if (channel) {
          alert(`Successfully connected YouTube account with channel "${channel}"!`)
        }
      }

      // Clean up URL
      window.history.replaceState({}, '', '/admin/accounts')
    } else if (params.get('error')) {
      const provider = params.get('provider')
      if (provider === 'linkedin') {
        alert('Failed to connect LinkedIn account. Please try again.')
      } else {
        alert('Failed to connect YouTube account. Please try again.')
      }
      window.history.replaceState({}, '', '/admin/accounts')
    }
  }, [])

  async function fetchData() {
    setIsLoading(true)
    try {
      const [companiesRes, gaRes, gscRes, ytRes, liRes, mappingsRes, statusRes, connectionsRes, liSheetConfigsRes, liConnectionsRes] = await Promise.all([
        fetch('/api/admin/companies'),
        fetch('/api/integrations/ga/properties'),
        fetch('/api/integrations/gsc/sites'),
        fetch('/api/integrations/youtube/channels'),
        fetch('/api/integrations/linkedin/pages'),
        fetch('/api/integrations/mappings'),
        fetch('/api/integrations/status'),
        fetch('/api/integrations/connections'),
        fetch('/api/integrations/linkedin/sheets'),
        fetch('/api/integrations/linkedin/connections')
      ])

      const [companiesData, gaData, gscData, ytData, liData, mappingsData, statusData, connectionsData, liSheetConfigsData, liConnectionsData] = await Promise.all([
        companiesRes.json(),
        gaRes.json(),
        gscRes.json(),
        ytRes.json(),
        liRes.json(),
        mappingsRes.json(),
        statusRes.json(),
        connectionsRes.json(),
        liSheetConfigsRes.json(),
        liConnectionsRes.json()
      ])

      setCompanies(companiesData.companies || [])
      setGaProperties(gaData.properties || [])
      setGscSites(gscData.sites || [])
      setYoutubeChannels(ytData.channels || [])
      setLinkedinPages(liData.pages || [])
      setMappings(mappingsData.mappings || {})
      setIsConnected(statusData.connected || false)
      setIsLinkedInConnected(statusData.linkedinConnected || false)
      setConnections(connectionsData.connections || [])
      setLinkedinConnections(liConnectionsData.connections || [])
      setLinkedinSheetConfigs(liSheetConfigsData.configs || {})
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
        setLinkedinUrl('')
        setShowLinkedInForm(false)
      }
    } catch (error) {
      console.error('Failed to add LinkedIn page:', error)
    }
  }

  // Parse LinkedIn organization ID from URL
  function parseLinkedInOrgId(url: string): string | null {
    // Patterns:
    // https://www.linkedin.com/company/21579434/
    // https://www.linkedin.com/company/21579434/admin/dashboard/
    // https://linkedin.com/company/companyname/
    const patterns = [
      /linkedin\.com\/company\/(\d+)/i,  // Numeric ID
      /linkedin\.com\/company\/([^\/\?]+)/i  // Vanity name (will need lookup)
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    return null
  }

  async function handleLookupLinkedInOrg() {
    if (!linkedinUrl.trim()) return

    const orgIdOrName = parseLinkedInOrgId(linkedinUrl)
    if (!orgIdOrName) {
      alert('Could not parse LinkedIn URL. Please enter a valid LinkedIn company page URL.')
      return
    }

    setIsLookingUpLinkedIn(true)
    try {
      const response = await fetch(`/api/integrations/linkedin/lookup?id=${encodeURIComponent(orgIdOrName)}`)

      if (response.ok) {
        const data = await response.json()
        setLinkedinForm({
          page_id: data.id || orgIdOrName,
          page_name: data.name || '',
          page_url: linkedinUrl.split('?')[0]  // Clean URL without query params
        })
      } else {
        const errorData = await response.json()
        // If lookup fails, still set the ID so user can enter name manually
        setLinkedinForm({
          ...linkedinForm,
          page_id: orgIdOrName,
          page_url: linkedinUrl.split('?')[0]
        })
        alert(errorData.error || 'Could not lookup organization name. Please enter the name manually.')
      }
    } catch (error) {
      console.error('Failed to lookup LinkedIn organization:', error)
      // Still set the ID
      setLinkedinForm({
        ...linkedinForm,
        page_id: orgIdOrName,
        page_url: linkedinUrl.split('?')[0]
      })
      alert('Could not lookup organization. Please enter the name manually.')
    } finally {
      setIsLookingUpLinkedIn(false)
    }
  }

  async function handleSaveLinkedInSheetConfig(companyId: string) {
    setIsSavingSheetConfig(true)
    try {
      const config = linkedinSheetConfigs[companyId] || {
        pageAnalyticsSheetId: '',
        pageAnalyticsRange: 'A:Z',
        postAnalyticsSheetId: '',
        postAnalyticsRange: 'A:Z',
        campaignAnalyticsSheetId: '',
        campaignAnalyticsRange: 'A:Z',
        demographicsSheetId: '',
        demographicsRange: 'A:Z',
      }

      const response = await fetch('/api/integrations/linkedin/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: { [companyId]: config } })
      })

      if (response.ok) {
        alert('LinkedIn sheet configuration saved!')
        setShowLinkedInSheetsForm(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save configuration')
      }
    } catch (error) {
      console.error('Failed to save LinkedIn sheet config:', error)
      alert('Failed to save configuration')
    } finally {
      setIsSavingSheetConfig(false)
    }
  }

  function updateLinkedInSheetConfig(companyId: string, field: keyof LinkedInSheetConfig, value: string) {
    setLinkedinSheetConfigs(prev => ({
      ...prev,
      [companyId]: {
        ...prev[companyId] || {
          pageAnalyticsSheetId: '',
          pageAnalyticsRange: 'A:Z',
          postAnalyticsSheetId: '',
          postAnalyticsRange: 'A:Z',
          campaignAnalyticsSheetId: '',
          campaignAnalyticsRange: 'A:Z',
          demographicsSheetId: '',
          demographicsRange: 'A:Z',
        },
        [field]: value
      }
    }))
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

  // LinkedIn OAuth functions
  function triggerLinkedInOAuth(options?: { companyId?: string; companyName?: string }) {
    const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID

    if (!clientId) {
      alert('LinkedIn OAuth is not configured. Please contact support.')
      return
    }

    const state = JSON.stringify({
      companyId: options?.companyId,
      companyName: options?.companyName,
      returnTo: '/admin/accounts'
    })

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: `${window.location.origin}/api/auth/linkedin/callback`,
      scope: LINKEDIN_OAUTH_SCOPES_STRING,
      state
    })

    window.location.href = `https://www.linkedin.com/oauth/v2/authorization?${params}`
  }

  function connectLinkedInForCompany(companyId: string, companyName: string) {
    triggerLinkedInOAuth({ companyId, companyName })
  }

  async function handleDeleteLinkedInConnection(connectionId: string) {
    if (!confirm('Are you sure you want to remove this LinkedIn connection?')) {
      return
    }

    setDeletingLinkedInConnectionId(connectionId)
    try {
      const response = await fetch(`/api/integrations/linkedin/connections?id=${connectionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setLinkedinConnections(prev => prev.filter(c => c.id !== connectionId))
        if (linkedinConnections.length <= 1) {
          setIsLinkedInConnected(false)
        }
        await fetchData() // Refresh all data
      } else {
        alert('Failed to remove LinkedIn connection')
      }
    } catch (error) {
      console.error('Failed to delete LinkedIn connection:', error)
      alert('Failed to remove LinkedIn connection')
    } finally {
      setDeletingLinkedInConnectionId(null)
    }
  }

  // Fetch all LinkedIn organizations user has admin access to
  async function fetchLinkedInOrganizations() {
    setIsLoadingOrgs(true)
    try {
      const response = await fetch('/api/integrations/linkedin/organizations')
      if (response.ok) {
        const data = await response.json()

        // Mark which orgs are already saved
        const savedPageIds = new Set(linkedinPages.map(p => p.page_id))
        const orgsWithStatus = (data.organizations || []).map((org: LinkedInOrganization) => ({
          ...org,
          alreadySaved: savedPageIds.has(org.id)
        }))

        setAvailableLinkedInOrgs(orgsWithStatus)

        // Pre-select already saved orgs
        const preSelected = new Set<string>(orgsWithStatus.filter((o: LinkedInOrganization) => o.alreadySaved).map((o: LinkedInOrganization) => o.id))
        setSelectedOrgIds(preSelected)
      }
    } catch (error) {
      console.error('Failed to fetch LinkedIn organizations:', error)
    } finally {
      setIsLoadingOrgs(false)
    }
  }

  // Save selected organizations to linkedin_pages
  async function handleSaveSelectedOrganizations() {
    setIsSavingOrgs(true)
    try {
      // If we're mapping to a specific company, handle that case
      if (pendingMappingCompanyId) {
        // Get the selected organization (should be exactly one)
        const selectedOrgId = Array.from(selectedOrgIds).find(id => {
          const org = availableLinkedInOrgs.find(o => o.id === id)
          return org && !org.alreadySaved
        }) || Array.from(selectedOrgIds)[0]

        const selectedOrg = availableLinkedInOrgs.find(o => o.id === selectedOrgId)

        if (!selectedOrg) {
          alert('Please select a LinkedIn organization to map.')
          return
        }

        // Save the organization with the company ID to create the mapping
        const response = await fetch('/api/integrations/linkedin/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: selectedOrg.id,
            organizationName: selectedOrg.name,
            companyId: pendingMappingCompanyId
          })
        })

        if (!response.ok) {
          throw new Error('Failed to create mapping')
        }

        // Refresh data and close dialog
        await fetchData()
        setShowLinkedInOrgDialog(false)
        setPendingMappingCompanyId(null)
        setPendingMappingCompanyName(null)
        // Clean up URL params
        window.history.replaceState({}, '', '/admin/accounts')
        alert(`Successfully mapped "${selectedOrg.name}" to ${pendingMappingCompanyName || 'the company'}!`)
        return
      }

      // Regular flow: just add orgs to the available list (no company mapping)
      // Find newly selected orgs (not already saved)
      const savedPageIds = new Set(linkedinPages.map(p => p.page_id))
      const newOrgsToSave = availableLinkedInOrgs.filter(
        org => selectedOrgIds.has(org.id) && !savedPageIds.has(org.id)
      )

      // Save each new organization
      for (const org of newOrgsToSave) {
        await fetch('/api/integrations/linkedin/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: org.id,
            organizationName: org.name
          })
        })
      }

      // Refresh data and close dialog
      await fetchData()
      setShowLinkedInOrgDialog(false)
      if (newOrgsToSave.length > 0) {
        alert(`Successfully added ${newOrgsToSave.length} LinkedIn organization(s)!`)
      }
    } catch (error) {
      console.error('Failed to save organizations:', error)
      alert('Failed to save some organizations. Please try again.')
    } finally {
      setIsSavingOrgs(false)
    }
  }

  // Open the organization selection dialog
  function openLinkedInOrgDialog() {
    setShowLinkedInOrgDialog(true)
    fetchLinkedInOrganizations()
  }

  // Toggle organization selection
  function toggleOrgSelection(orgId: string) {
    setSelectedOrgIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orgId)) {
        newSet.delete(orgId)
      } else {
        newSet.add(orgId)
      }
      return newSet
    })
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
                  <strong>Need YouTube Analytics for a Brand Account?</strong> Click &quot;Add Account&quot; and select the Brand Account (not your personal account) during authorization.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LinkedIn Connection Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                </svg>
              </div>
              <div>
                <CardTitle>LinkedIn Organization</CardTitle>
                <CardDescription>
                  Connect to access LinkedIn Page analytics via Community Management API
                </CardDescription>
              </div>
            </div>
            <Badge variant={isLinkedInConnected ? 'default' : 'secondary'}>
              {isLinkedInConnected ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Not Connected</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLinkedInConnected ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your LinkedIn account to access organization analytics including followers, page views, and post engagement.
              </p>
              <Button onClick={() => triggerLinkedInOAuth()}>
                Connect LinkedIn Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connected LinkedIn Organizations */}
              {linkedinConnections.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Connected Organizations</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={openLinkedInOrgDialog}>
                        <Settings2 className="h-3 w-3 mr-1" />
                        Manage Organizations
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => triggerLinkedInOAuth()}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reconnect
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {linkedinConnections.map((conn) => (
                      <div key={conn.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {conn.linkedinOrganizationName || conn.linkedinOrganizationId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Organization ID: {conn.linkedinOrganizationId}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteLinkedInConnection(conn.id)}
                          disabled={deletingLinkedInConnectionId === conn.id}
                        >
                          {deletingLinkedInConnectionId === conn.id ? (
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

              {linkedinConnections.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Connected but no organizations found. Make sure you have admin access to a LinkedIn organization.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => triggerLinkedInOAuth()}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reconnect
                  </Button>
                </div>
              )}
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
                              {gaProperties.map((prop) => (
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
                              {gscSites.map((site) => (
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
                                {youtubeChannels.map((channel) => (
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
                          <div className="flex gap-2">
                            <Select
                              value={mapping.linkedinPageId || 'none'}
                              onValueChange={(value) =>
                                setMappings(prev => ({
                                  ...prev,
                                  [company.id]: { ...mapping, linkedinPageId: value === 'none' ? '' : value }
                                }))
                              }
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select page" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-- None --</SelectItem>
                                {linkedinPages.map((page) => (
                                  <SelectItem key={page.id} value={page.id}>
                                    {page.page_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => connectLinkedInForCompany(company.id, company.name)}
                              title={`Connect LinkedIn organization for ${company.name}`}
                            >
                              <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                              </svg>
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Click the LinkedIn icon to connect an organization
                          </p>
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
                  {youtubeChannels.map((channel) => (
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
                <div className="border rounded-lg p-4 space-y-4">
                  {/* URL Lookup Section */}
                  <div className="space-y-2">
                    <Label htmlFor="li-url-lookup">Quick Add - Paste LinkedIn Company URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="li-url-lookup"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/company/21579434 or https://linkedin.com/company/yourcompany"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleLookupLinkedInOrg}
                        disabled={isLookingUpLinkedIn || !linkedinUrl.trim()}
                      >
                        {isLookingUpLinkedIn ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Go to your LinkedIn company page admin dashboard and copy the URL from your browser
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

                  <form onSubmit={handleAddLinkedInPage} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="li-id">Organization ID *</Label>
                      <Input
                        id="li-id"
                        value={linkedinForm.page_id}
                        onChange={(e) => setLinkedinForm({ ...linkedinForm, page_id: e.target.value })}
                        placeholder="21579434"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        The numeric ID from the URL (e.g., linkedin.com/company/<strong>21579434</strong>)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="li-name">Organization Name *</Label>
                      <Input
                        id="li-name"
                        value={linkedinForm.page_name}
                        onChange={(e) => setLinkedinForm({ ...linkedinForm, page_name: e.target.value })}
                        placeholder="Company Name"
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
                </div>
              )}

              {linkedinPages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No LinkedIn pages added yet</p>
              ) : (
                <div className="space-y-2">
                  {linkedinPages.map((page) => (
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

          {/* LinkedIn Google Sheets Configuration (Power My Analytics) */}
          <Card>
            <CardHeader>
              <CardTitle>LinkedIn Data via Google Sheets</CardTitle>
              <CardDescription>
                Configure Google Sheet IDs from Power My Analytics to pull LinkedIn data for each company.
                This allows you to display real LinkedIn analytics in the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                  <strong>Setup:</strong> In Power My Analytics, export your LinkedIn data to Google Sheets.
                  Then paste the Sheet ID here. The Sheet ID is the long string in the URL between /d/ and /edit
                  (e.g., for https://docs.google.com/spreadsheets/d/<strong>1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</strong>/edit,
                  the ID is the bold part).
                </AlertDescription>
              </Alert>

              {companies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No companies found</p>
              ) : (
                <div className="space-y-4">
                  {companies.map((company) => {
                    const config = linkedinSheetConfigs[company.id] || {
                      pageAnalyticsSheetId: '',
                      pageAnalyticsRange: 'A:Z',
                      postAnalyticsSheetId: '',
                      postAnalyticsRange: 'A:Z',
                      campaignAnalyticsSheetId: '',
                      campaignAnalyticsRange: 'A:Z',
                      demographicsSheetId: '',
                      demographicsRange: 'A:Z',
                    }
                    const hasConfig = config.pageAnalyticsSheetId || config.postAnalyticsSheetId || config.campaignAnalyticsSheetId
                    const isExpanded = showLinkedInSheetsForm === company.id

                    return (
                      <div key={company.id} className="border rounded-lg">
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                          onClick={() => setShowLinkedInSheetsForm(isExpanded ? null : company.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: company.color }}
                            >
                              {company.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{company.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {hasConfig ? 'Sheets configured' : 'No sheets configured'}
                              </p>
                            </div>
                          </div>
                          <Badge variant={hasConfig ? 'default' : 'secondary'}>
                            {hasConfig ? <CheckCircle className="h-3 w-3 mr-1" /> : null}
                            {hasConfig ? 'Configured' : 'Not Set'}
                          </Badge>
                        </div>

                        {isExpanded && (
                          <div className="border-t p-4 space-y-4 bg-muted/30">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs">Page Analytics Sheet ID</Label>
                                <Input
                                  value={config.pageAnalyticsSheetId}
                                  onChange={(e) => updateLinkedInSheetConfig(company.id, 'pageAnalyticsSheetId', e.target.value)}
                                  placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                                />
                                <p className="text-xs text-muted-foreground">Page views, visitors, followers</p>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs">Post Analytics Sheet ID</Label>
                                <Input
                                  value={config.postAnalyticsSheetId}
                                  onChange={(e) => updateLinkedInSheetConfig(company.id, 'postAnalyticsSheetId', e.target.value)}
                                  placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                                />
                                <p className="text-xs text-muted-foreground">Post engagement, impressions</p>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs">Campaign Analytics Sheet ID</Label>
                                <Input
                                  value={config.campaignAnalyticsSheetId}
                                  onChange={(e) => updateLinkedInSheetConfig(company.id, 'campaignAnalyticsSheetId', e.target.value)}
                                  placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                                />
                                <p className="text-xs text-muted-foreground">Paid ad campaigns (optional)</p>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs">Demographics Sheet ID</Label>
                                <Input
                                  value={config.demographicsSheetId}
                                  onChange={(e) => updateLinkedInSheetConfig(company.id, 'demographicsSheetId', e.target.value)}
                                  placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                                />
                                <p className="text-xs text-muted-foreground">Visitor demographics (optional)</p>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleSaveLinkedInSheetConfig(company.id)}
                                disabled={isSavingSheetConfig}
                              >
                                {isSavingSheetConfig ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Configuration
                                  </>
                                )}
                              </Button>
                              <Button variant="outline" onClick={() => setShowLinkedInSheetsForm(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
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
              <p className="font-medium">You&apos;ll see a two-step process:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong>Select your Google Account</strong> - Choose the Google account you use to manage your properties
                </li>
                <li>
                  <strong>Select the Brand Account (if applicable)</strong> - After selecting your Google account,
                  you&apos;ll see a list of accounts you can act as. <span className="text-foreground font-medium">Select the account that OWNS the YouTube channel</span> you want analytics for.
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

      {/* LinkedIn Organization Selection Dialog */}
      <Dialog open={showLinkedInOrgDialog} onOpenChange={(open) => {
        setShowLinkedInOrgDialog(open)
        if (!open) {
          // Clear pending mapping state when dialog is closed
          setPendingMappingCompanyId(null)
          setPendingMappingCompanyName(null)
          window.history.replaceState({}, '', '/admin/accounts')
        }
      }}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {pendingMappingCompanyId
                ? `Select LinkedIn Organization for ${pendingMappingCompanyName || 'Company'}`
                : 'Manage LinkedIn Organizations'}
            </DialogTitle>
            <DialogDescription>
              {pendingMappingCompanyId
                ? 'Choose which LinkedIn organization to connect to this company.'
                : 'Select the LinkedIn organizations you want to make available for company assignments.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isLoadingOrgs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading organizations...</span>
              </div>
            ) : availableLinkedInOrgs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  No organizations found. Make sure you have admin access to at least one LinkedIn organization.
                </p>
                <Button variant="outline" onClick={() => {
                  setShowLinkedInOrgDialog(false)
                  triggerLinkedInOAuth()
                }}>
                  Reconnect LinkedIn Account
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {availableLinkedInOrgs.map((org) => (
                  <div
                    key={org.id}
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                      selectedOrgIds.has(org.id)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => toggleOrgSelection(org.id)}
                  >
                    <Checkbox
                      checked={selectedOrgIds.has(org.id)}
                      onCheckedChange={() => toggleOrgSelection(org.id)}
                    />
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {org.logoUrl ? (
                        <img src={org.logoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{org.name}</p>
                      {org.vanityName && (
                        <p className="text-sm text-muted-foreground truncate">
                          linkedin.com/company/{org.vanityName}
                        </p>
                      )}
                    </div>
                    {org.alreadySaved && (
                      <Badge variant="secondary" className="flex-shrink-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Added
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setShowLinkedInOrgDialog(false)
              setPendingMappingCompanyId(null)
              setPendingMappingCompanyName(null)
              window.history.replaceState({}, '', '/admin/accounts')
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSelectedOrganizations}
              disabled={isSavingOrgs || isLoadingOrgs || selectedOrgIds.size === 0}
            >
              {isSavingOrgs ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : pendingMappingCompanyId ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Connect Selected Organization
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Selection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
