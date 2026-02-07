'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Loader2, Key, Plus, Copy, Check, XCircle, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface AccessCode {
  id: string
  code: string
  description: string | null
  is_active: boolean
  usage_count: number
  created_at: string
}

export default function AdminAccessCodesPage() {
  const [codes, setCodes] = useState<AccessCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    fetchCodes()
  }, [])

  async function fetchCodes() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/access-codes')

      if (response.status === 403) {
        setHasAdminAccess(false)
        setIsLoading(false)
        return
      }

      const data = await response.json()
      setCodes(data.codes || [])
      setHasAdminAccess(true)
    } catch (error) {
      console.error('Failed to fetch access codes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateCode() {
    if (!newCode.trim()) {
      alert('Please enter a code')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/admin/access-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode.trim(),
          description: newDescription.trim() || null,
        }),
      })

      if (response.ok) {
        setCreateDialogOpen(false)
        setNewCode('')
        setNewDescription('')
        fetchCodes()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create code')
      }
    } catch (error) {
      console.error('Failed to create code:', error)
      alert('Failed to create code. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleToggleActive(code: AccessCode) {
    try {
      const response = await fetch('/api/admin/access-codes', {
        method: code.is_active ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: code.id }),
      })

      if (response.ok) {
        fetchCodes()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update code')
      }
    } catch (error) {
      console.error('Failed to update code:', error)
    }
  }

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  function generateRandomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewCode(code)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!hasAdminAccess) {
    return (
      <div className="container max-w-4xl py-8">
        <Card data-testid="access-denied">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need to be an owner or admin of at least one company to manage access codes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contact your company owner if you believe you should have access.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Access Codes</h1>
        <p className="text-muted-foreground mt-2">
          Manage invite codes for new user sign-ups
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-code-button">
              <Plus className="h-4 w-4 mr-2" />
              Create Code
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="create-code-dialog">
            <DialogHeader>
              <DialogTitle>Create Access Code</DialogTitle>
              <DialogDescription>
                Create a new access code that users will need to sign up.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-code">Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-code"
                    placeholder="e.g., WELCOME2026"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="uppercase"
                    data-testid="new-code-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={generateRandomCode}
                    title="Generate random code"
                    data-testid="generate-random-code"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-description">Description (optional)</Label>
                <Input
                  id="new-description"
                  placeholder="e.g., For beta testers"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  data-testid="new-description-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCode} disabled={isCreating} data-testid="create-code-submit">
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Code'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Codes Table */}
      <Card data-testid="access-codes-table">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Access Codes ({codes.length})
          </CardTitle>
          <CardDescription>
            Users must enter one of these codes to create an account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <div className="text-center py-12">
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No access codes yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first code to allow new users to sign up
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Uses</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id} data-testid={`code-row-${code.code}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-semibold">{code.code}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyCode(code.code)}
                          data-testid={`copy-code-${code.code}`}
                        >
                          {copiedCode === code.code ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {code.description || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {code.usage_count}
                    </TableCell>
                    <TableCell className="text-center">
                      {code.is_active ? (
                        <Badge variant="default" className="bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(code)}
                        data-testid={`toggle-code-${code.code}`}
                      >
                        {code.is_active ? (
                          <>
                            <XCircle className="h-4 w-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
