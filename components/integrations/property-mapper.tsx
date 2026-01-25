'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Save, Loader2, X, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface PropertyMapperProps {
  properties: any[]
  sites: any[]
  youtubeChannels?: any[]
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f97316', // orange
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#ef4444', // red
]

export function PropertyMapper({ properties, sites, youtubeChannels = [] }: PropertyMapperProps) {
  const [companies, setCompanies] = useState<any[]>([])
  const [mappings, setMappings] = useState<Record<string, { gaPropertyId: string; gscSiteId: string; youtubeChannelId: string }>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingCompany, setIsAddingCompany] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCompany, setNewCompany] = useState({ name: '', industry: '', color: '#3b82f6' })
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null)

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
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.details || errorData.error || 'Failed to save'
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Failed to save mappings:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to save mappings: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAddCompany() {
    if (!newCompany.name.trim() || !newCompany.industry.trim()) {
      alert('Please fill in both name and industry')
      return
    }

    setIsAddingCompany(true)
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompany)
      })

      if (!response.ok) {
        throw new Error('Failed to create company')
      }

      const data = await response.json()
      setCompanies(prev => [...prev, data.company])
      setNewCompany({ name: '', industry: '', color: '#3b82f6' })
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Failed to create company:', error)
      alert('Failed to create company. Please try again.')
    } finally {
      setIsAddingCompany(false)
    }
  }

  async function handleDeleteCompany(companyId: string) {
    if (!confirm('Are you sure you want to delete this company? This cannot be undone.')) {
      return
    }

    setDeletingCompanyId(companyId)
    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete company')
      }

      setCompanies(prev => prev.filter(c => c.id !== companyId))
      // Remove mappings for deleted company
      setMappings(prev => {
        const newMappings = { ...prev }
        delete newMappings[companyId]
        return newMappings
      })
    } catch (error) {
      console.error('Failed to delete company:', error)
      alert('Failed to delete company. Please try again.')
    } finally {
      setDeletingCompanyId(null)
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

  const addCompanyDialog = (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
          <DialogDescription>
            Create a new company to map analytics properties to.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              placeholder="e.g., Acme Corp"
              value={newCompany.name}
              onChange={(e) => setNewCompany(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              placeholder="e.g., Technology"
              value={newCompany.industry}
              onChange={(e) => setNewCompany(prev => ({ ...prev, industry: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Brand Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    newCompany.color === color ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewCompany(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddCompany} disabled={isAddingCompany}>
            {isAddingCompany ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Company'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (companies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Property Mappings</CardTitle>
              <CardDescription>
                No companies found. Create a company to get started.
              </CardDescription>
            </div>
            {addCompanyDialog}
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Property Mappings</CardTitle>
            <CardDescription>
              Assign Google Analytics properties, Search Console sites, and YouTube channels to your companies
            </CardDescription>
          </div>
          {addCompanyDialog}
        </div>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteCompany(company.id)}
                  disabled={deletingCompanyId === company.id}
                >
                  {deletingCompanyId === company.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
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
