'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Users as UsersIcon, Search, UserPlus, Clock, RotateCcw, Trash2, AlertCircle } from 'lucide-react'
import { UserAssignmentDialog } from '@/components/admin/user-assignment-dialog'
import { CompanyListCell } from '@/components/admin/company-list-cell'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface User {
  id: string
  email: string
  status: 'active' | 'pending'
  mustChangePassword: boolean
  lastSignInAt?: string
  companies: Array<{ id: string; name: string; role: string }>
}

interface PendingInvitation {
  id: string
  email: string
  role: string
  invitedBy: string
  invitedByEmail?: string
  expiresAt: string
  createdAt: string
  companies: Array<{ id: string; name: string }>
}

interface Company {
  id: string
  name: string
  industry: string
  color: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCompanyIds, setInviteCompanyIds] = useState<string[]>([])
  const [inviteRole, setInviteRole] = useState('viewer')
  const [isInviting, setIsInviting] = useState(false)
  const [activeTab, setActiveTab] = useState('active')
  const [revokeEmail, setRevokeEmail] = useState<string | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const [resendingEmail, setResendingEmail] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setIsLoading(true)
    try {
      const [usersRes, companiesRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/companies')
      ])

      if (usersRes.status === 403) {
        setHasAdminAccess(false)
        setIsLoading(false)
        return
      }

      const [usersData, companiesData] = await Promise.all([
        usersRes.json(),
        companiesRes.json()
      ])

      setUsers(usersData.users || [])
      setPendingInvitations(usersData.pendingInvitations || [])
      setCompanies(companiesData.companies || [])
      setHasAdminAccess(true)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleManageUser(user: User) {
    setSelectedUser(user)
    setDialogOpen(true)
  }

  function handleSave() {
    fetchData()
  }

  async function handleInviteUser() {
    if (!inviteEmail.trim() || inviteCompanyIds.length === 0) {
      alert('Please enter an email and select at least one company')
      return
    }

    setIsInviting(true)
    try {
      const response = await fetch('/api/admin/users/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          companyIds: inviteCompanyIds,
          role: inviteRole
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`User invited successfully! They will receive an email with login instructions.`)
        setInviteDialogOpen(false)
        setInviteEmail('')
        setInviteCompanyIds([])
        setInviteRole('viewer')
        fetchData()
      } else {
        alert(data.error || 'Failed to invite user. Please try again.')
      }
    } catch (error) {
      console.error('Failed to invite user:', error)
      alert('Failed to invite user. Please try again.')
    } finally {
      setIsInviting(false)
    }
  }

  async function handleResendInvite(email: string) {
    setResendingEmail(email)
    try {
      const response = await fetch('/api/admin/users/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', email })
      })

      const data = await response.json()

      if (response.ok) {
        alert('Invitation resent successfully!')
        fetchData()
      } else {
        alert(data.error || 'Failed to resend invitation.')
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error)
      alert('Failed to resend invitation.')
    } finally {
      setResendingEmail(null)
    }
  }

  async function handleRevokeInvite() {
    if (!revokeEmail) return

    setIsRevoking(true)
    try {
      const response = await fetch(`/api/admin/users/pending?email=${encodeURIComponent(revokeEmail)}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        alert('Invitation revoked successfully!')
        setRevokeEmail(null)
        fetchData()
      } else {
        alert(data.error || 'Failed to revoke invitation.')
      }
    } catch (error) {
      console.error('Failed to revoke invitation:', error)
      alert('Failed to revoke invitation.')
    } finally {
      setIsRevoking(false)
    }
  }

  function toggleCompanySelection(companyId: string) {
    setInviteCompanyIds(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    )
  }

  function selectAllCompanies() {
    if (inviteCompanyIds.length === companies.length) {
      setInviteCompanyIds([])
    } else {
      setInviteCompanyIds(companies.map(c => c.id))
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function formatRelativeTime(dateString?: string) {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return formatDate(dateString)
  }

  function isExpired(dateString: string) {
    return new Date(dateString) < new Date()
  }

  // Filter active users (exclude those with pending status who haven't logged in)
  const activeUsers = users.filter(u => u.status === 'active' || u.lastSignInAt)
  const filteredActiveUsers = activeUsers.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredPendingInvitations = pendingInvitations.filter(inv =>
    inv.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need to be an owner or admin of at least one company to access user management.
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
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage user access and roles for your companies
        </p>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
              <DialogDescription>
                Create an account for a new user. They will receive an email with temporary login credentials.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Companies</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-2 text-xs"
                    onClick={selectAllCompanies}
                  >
                    {inviteCompanyIds.length === companies.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                  {companies.map((company) => (
                    <div key={company.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`company-${company.id}`}
                        checked={inviteCompanyIds.includes(company.id)}
                        onCheckedChange={() => toggleCompanySelection(company.id)}
                      />
                      <label
                        htmlFor={`company-${company.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {company.name}
                      </label>
                    </div>
                  ))}
                </div>
                {inviteCompanyIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {inviteCompanyIds.length} company{inviteCompanyIds.length > 1 ? 'ies' : ''} selected
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer - Can view dashboards</SelectItem>
                    <SelectItem value="admin">Admin - Can manage users</SelectItem>
                    <SelectItem value="owner">Owner - Full access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInviteUser} disabled={isInviting}>
                {isInviting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Inviting...
                  </>
                ) : (
                  'Invite User'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            Active Users
            {filteredActiveUsers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filteredActiveUsers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Invitations
            {filteredPendingInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filteredPendingInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Active Users Tab */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
              <CardDescription>
                Users who have logged in and have access to your companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredActiveUsers.length === 0 ? (
                <div className="text-center py-12">
                  <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No users found matching your search' : 'No active users found'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredActiveUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{user.email}</span>
                          {user.mustChangePassword && (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              <Clock className="h-3 w-3 mr-1" />
                              Password pending
                            </Badge>
                          )}
                        </div>
                        <CompanyListCell companies={user.companies} showRoles />
                        <div className="text-xs text-muted-foreground">
                          Last active: {formatRelativeTime(user.lastSignInAt)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageUser(user)}
                        className="ml-4"
                      >
                        Manage
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Invitations Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Users who have been invited but haven&apos;t logged in yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPendingInvitations.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No pending invitations found matching your search' : 'No pending invitations'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPendingInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        isExpired(invitation.expiresAt) ? 'bg-red-50 border-red-200' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{invitation.email}</span>
                          {isExpired(invitation.expiresAt) && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Expired
                            </Badge>
                          )}
                        </div>
                        <CompanyListCell
                          companies={invitation.companies}
                          showRoles={false}
                        />
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>
                            Invited by: {invitation.invitedByEmail || 'Unknown'}
                          </span>
                          <span>
                            Sent: {formatDate(invitation.createdAt)}
                          </span>
                          <span className={isExpired(invitation.expiresAt) ? 'text-red-600' : ''}>
                            Expires: {formatDate(invitation.expiresAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendInvite(invitation.email)}
                          disabled={resendingEmail === invitation.email}
                        >
                          {resendingEmail === invitation.email ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                          <span className="ml-2 hidden sm:inline">Resend</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRevokeEmail(invitation.email)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="ml-2 hidden sm:inline">Revoke</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Assignment Dialog */}
      <UserAssignmentDialog
        user={selectedUser}
        availableCompanies={companies}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
      />

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeEmail} onOpenChange={(open) => !open && setRevokeEmail(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the invitation for <strong>{revokeEmail}</strong>?
              This will delete their account and they will no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeInvite}
              disabled={isRevoking}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRevoking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                'Revoke Invitation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
