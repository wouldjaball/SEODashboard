'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Save, Loader2, X } from 'lucide-react'

interface PropertyMapperProps {
  properties: any[]
  sites: any[]
  youtubeChannels?: any[]
}

export function PropertyMapper({ properties, sites, youtubeChannels = [] }: PropertyMapperProps) {
  const [companies, setCompanies] = useState<any[]>([])
  const [mappings, setMappings] = useState<Record<string, { gaPropertyId: string; gscSiteId: string; youtubeChannelId: string }>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCompaniesAndMappings()
  }, [])

  async function fetchCompaniesAndMappings() {
    setIsLoading(true)
    try {
      const [companiesRes, mappingsRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/integrations/mappings')
      ])

      const companiesData = await companiesRes.json()
      const mappingsData = await mappingsRes.json()

      setCompanies(companiesData.companies || [])
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
        alert('Mappings saved successfully!')
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      console.error('Failed to save mappings:', error)
      alert('Failed to save mappings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (companies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Property Mappings</CardTitle>
          <CardDescription>
            No companies found. Please create a company first.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Mappings</CardTitle>
        <CardDescription>
          Assign Google Analytics properties, Search Console sites, and YouTube channels to your companies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {companies.map((company: any) => {
          const mapping = mappings[company.id] || { gaPropertyId: '', gscSiteId: '', youtubeChannelId: '' }
          const isConfigured = mapping.gaPropertyId || mapping.gscSiteId || mapping.youtubeChannelId

          return (
            <div key={company.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: company.color }}
                >
                  {company.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{company.name}</h3>
                  <p className="text-sm text-muted-foreground">{company.industry}</p>
                </div>
                {isConfigured && (
                  <Badge variant="outline">
                    <CheckCircle className="h-3 w-3 mr-1" /> Configured
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Analytics Property</label>
                  <div className="flex gap-2">
                    <Select
                      value={mapping.gaPropertyId || 'none'}
                      onValueChange={(value) =>
                        setMappings(prev => ({
                          ...prev,
                          [company.id]: { ...mapping, gaPropertyId: value === 'none' ? '' : value }
                        }))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- None --</SelectItem>
                        {properties.map((prop: any) => (
                          <SelectItem key={prop.id} value={prop.id}>
                            {prop.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mapping.gaPropertyId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() =>
                          setMappings(prev => ({
                            ...prev,
                            [company.id]: { ...mapping, gaPropertyId: '' }
                          }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Console Site</label>
                  <div className="flex gap-2">
                    <Select
                      value={mapping.gscSiteId || 'none'}
                      onValueChange={(value) =>
                        setMappings(prev => ({
                          ...prev,
                          [company.id]: { ...mapping, gscSiteId: value === 'none' ? '' : value }
                        }))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select site" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- None --</SelectItem>
                        {sites.map((site: any) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.siteUrl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mapping.gscSiteId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() =>
                          setMappings(prev => ({
                            ...prev,
                            [company.id]: { ...mapping, gscSiteId: '' }
                          }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">YouTube Channel</label>
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
                            {channel.channelName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mapping.youtubeChannelId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() =>
                          setMappings(prev => ({
                            ...prev,
                            [company.id]: { ...mapping, youtubeChannelId: '' }
                          }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Mappings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
