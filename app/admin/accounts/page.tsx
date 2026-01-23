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
import { Loader2, Save, CheckCircle, Plus, X, LayoutDashboard } from 'lucide-react'

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

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setIsLoading(true)
    try {
      const [companiesRes, gaRes, gscRes, ytRes, liRes, mappingsRes] = await Promise.all([
        fetch('/api/admin/companies'),
        fetch('/api/integrations/ga/properties'),
        fetch('/api/integrations/gsc/sites'),
        fetch('/api/integrations/youtube/channels'),
        fetch('/api/integrations/linkedin/pages'),
        fetch('/api/integrations/mappings')
      ])

      const [companiesData, gaData, gscData, ytData, liData, mappingsData] = await Promise.all([
        companiesRes.json(),
        gaRes.json(),
        gscRes.json(),
        ytRes.json(),
        liRes.json(),
        mappingsRes.json()
      ])

      setCompanies(companiesData.companies || [])
      setGaProperties(gaData.properties || [])
      setGscSites(gscData.sites || [])
      setYoutubeChannels(ytData.channels || [])
      setLinkedinPages(liData.pages || [])
      setMappings(mappingsData.mappings || {})
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
                            value={mapping.gaPropertyId}
                            onValueChange={(value) =>
                              setMappings(prev => ({
                                ...prev,
                                [company.id]: { ...mapping, gaPropertyId: value }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                            <SelectContent>
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
                            value={mapping.gscSiteId}
                            onValueChange={(value) =>
                              setMappings(prev => ({
                                ...prev,
                                [company.id]: { ...mapping, gscSiteId: value }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select site" />
                            </SelectTrigger>
                            <SelectContent>
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
                          <Select
                            value={mapping.youtubeChannelId}
                            onValueChange={(value) =>
                              setMappings(prev => ({
                                ...prev,
                                [company.id]: { ...mapping, youtubeChannelId: value }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select channel" />
                            </SelectTrigger>
                            <SelectContent>
                              {youtubeChannels.map((channel: any) => (
                                <SelectItem key={channel.id} value={channel.id}>
                                  {channel.channel_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">LinkedIn Page</Label>
                          <Select
                            value={mapping.linkedinPageId}
                            onValueChange={(value) =>
                              setMappings(prev => ({
                                ...prev,
                                [company.id]: { ...mapping, linkedinPageId: value }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select page" />
                            </SelectTrigger>
                            <SelectContent>
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

              <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
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
                  <CardDescription>Add YouTube channels to assign to companies</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowYouTubeForm(!showYouTubeForm)}>
                  {showYouTubeForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4 mr-2" />}
                  {showYouTubeForm ? 'Cancel' : 'Add Channel'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showYouTubeForm && (
                <form onSubmit={handleAddYouTubeChannel} className="border rounded-lg p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="yt-id">Channel ID *</Label>
                    <Input
                      id="yt-id"
                      value={youtubeForm.channel_id}
                      onChange={(e) => setYoutubeForm({ ...youtubeForm, channel_id: e.target.value })}
                      placeholder="UC..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yt-name">Channel Name *</Label>
                    <Input
                      id="yt-name"
                      value={youtubeForm.channel_name}
                      onChange={(e) => setYoutubeForm({ ...youtubeForm, channel_name: e.target.value })}
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
              )}

              {youtubeChannels.length === 0 ? (
                <p className="text-sm text-muted-foreground">No YouTube channels added yet</p>
              ) : (
                <div className="space-y-2">
                  {youtubeChannels.map((channel: any) => (
                    <div key={channel.id} className="flex items-center justify-between border rounded p-3">
                      <div>
                        <p className="font-medium">{channel.channel_name}</p>
                        {channel.channel_handle && (
                          <p className="text-sm text-muted-foreground">{channel.channel_handle}</p>
                        )}
                      </div>
                      <Badge variant="outline">{channel.channel_id}</Badge>
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
    </div>
  )
}
