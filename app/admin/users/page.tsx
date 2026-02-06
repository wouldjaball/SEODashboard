'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Users as UsersIcon, Search, UserPlus, RotateCcw, Trash2 } from 'lucide-react'
import { UserAssignmentDialog } from '@/components/admin/user-assignment-dialog'
import { CompanyListCell } from '@/components/admin/company-list-cell'
import { UserStatusBadge, type UserStatus } from '@/components/admin/user-status-badge'
import { RoleBadge, getHighestRole, type UserRole } from '@/components/admin/role-badge'
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
  expired: boolean
  companies: Array<{ id: string; name: string }>
}

interface Company {
  id: string
  name: string
  industry: string
  color: string
}

// Unified user type for the table
interface UnifiedUser {
  id: string
  email: string
  status: UserStatus
  // Invitation info
  invitedAt?: string
  invitedByEmail?: string
  expiresAt?: string
  // Active user info
  lastSignInAt?: string
  // Access info
  companies: Array<{ id: string; name: string; role: string }>
  highestRole: UserRole
  // Source tracking
  isInvitation: boolean
}

type FilterValue = 'all' | 'active' | 'pending' | 'expired'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterValue, setFilterValue] = useState<FilterValue>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCompanyIds, setInviteCompanyIds] = useState<string[]>([])
  const [inviteRole, setInviteRole] = useState('viewer')
  const [isInviting, setIsInviting] = useState(false)
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

  // Transform to unified user list
  const unifiedUsers = useMemo((): UnifiedUser[] => {
    const unified: UnifiedUser[] = []
    const processedEmails = new Set<string>()

    // Process active users
    for (const user of users) {
      processedEmails.add(user.email.toLowerCase())

      // Determine status based on user data
      let status: UserStatus = 'active'
      if (user.mustChangePassword && !user.lastSignInAt) {
        status = 'pending'
      }

      unified.push({
        id: user.id,
        email: user.email,
        status,
        lastSignInAt: user.lastSignInAt,
        companies: user.companies,
        highestRole: getHighestRole(user.companies.map(c => c.role)),
        isInvitation: false,
      })
    }

    // Add pending invitations not already processed
    for (const invitation of pendingInvitations) {
      if (processedEmails.has(invitation.email.toLowerCase())) continue

      unified.push({
        id: invitation.id,
        email: invitation.email,
        status: invitation.expired ? 'expired' : 'pending',
        invitedAt: invitation.createdAt,
        invitedByEmail: invitation.invitedByEmail,
        expiresAt: invitation.expiresAt,
        companies: invitation.companies.map(c => ({ ...c, role: invitation.role })),
        highestRole: invitation.role as UserRole,
        isInvitation: true,
      })
    }

    return unified
  }, [users, pendingInvitations])

  // Filter and search
  const filteredUsers = useMemo(() => {
    return unifiedUsers
      .filter(user => {
        // Apply status filter
        if (filterValue !== 'all' && user.status !== filterValue) {
          return false
        }
        // Apply search
        if (searchQuery && !user.email.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false
        }
        return true
      })
      .sort((a, b) => a.email.localeCompare(b.email))
  }, [unifiedUsers, filterValue, searchQuery])

  // Get counts for filter badges
  const statusCounts = useMemo(() => {
    return {
      all: unifiedUsers.length,
      active: unifiedUsers.filter(u => u.status === 'active').length,
      pending: unifiedUsers.filter(u => u.status === 'pending').length,
      expired: unifiedUsers.filter(u => u.status === 'expired').length,
    }
  }, [unifiedUsers])

  function handleManageUser(user: UnifiedUser) {
    // Find the original user data for the dialog
    const originalUser = users.find(u => u.id === user.id)
    if (originalUser) {
      setSelectedUser(originalUser)
      setDialogOpen(true)
    }
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
        // Check if email was sent successfully
        if (data.emailSent === false) {
          alert(`User account created, but the invitation email failed to send.\n\nError: ${data.emailError || 'Unknown error'}\n\nPlease use "Resend Invitation" to try again.`)
        } else {
          alert(`User invited successfully! They will receive an email with login instructions.`)
        }
        setInviteDialogOpen(false)
        setInviteEmail('')
        setInviteCompanyIds([])
        setInviteRole('viewer')
        fetchData()
      } else {
        const errorDetails = data.details ? `\n\nDetails: ${data.details}` : ''
        alert(`${data.error || 'Failed to invite user. Please try again.'}${errorDetails}`)
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
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
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
            data-testid="users-search-input"
          />
        </div>
        <Select value={filterValue} onValueChange={(v) => setFilterValue(v as FilterValue)}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="users-filter-select">
            <SelectValue placeholder="Filter users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users ({statusCounts.all})</SelectItem>
            <SelectItem value="active">Active ({statusCounts.active})</SelectItem>
            <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
            <SelectItem value="expired">Expired ({statusCounts.expired})</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="invite-user-button">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="invite-user-dialog">
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
                  data-testid="invite-email-input"
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
                  <SelectTrigger data-testid="invite-role-select">
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
              <Button onClick={handleInviteUser} disabled={isInviting} data-testid="invite-user-submit">
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

      {/* Users Table */}
      <Card data-testid="users-table-card">
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || filterValue !== 'all'
                  ? 'No users found matching your criteria'
                  : 'No users found'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[280px]">User</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[100px]">Role</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className={user.status === 'expired' ? 'bg-red-50/50' : ''}
                    data-testid={`user-row-${user.email}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                          {user.email.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium break-all">
                          {user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge
                        status={user.status}
                        invitedAt={user.invitedAt}
                        invitedByEmail={user.invitedByEmail}
                        lastActiveAt={user.lastSignInAt}
                        expiresAt={user.expiresAt}
                      />
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.highestRole} />
                    </TableCell>
                    <TableCell>
                      <CompanyListCell
                        companies={user.companies}
                        showRoles={user.status === 'active'}
                        maxVisible={2}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {user.status === 'active' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageUser(user)}
                          data-testid={`manage-user-${user.email}`}
                        >
                          Manage
                        </Button>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendInvite(user.email)}
                            disabled={resendingEmail === user.email}
                            title="Resend invitation"
                            data-testid={`resend-invite-${user.email}`}
                          >
                            {resendingEmail === user.email ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRevokeEmail(user.email)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Revoke invitation"
                            data-testid={`revoke-invite-${user.email}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
        <AlertDialogContent data-testid="revoke-dialog">
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
              data-testid="revoke-confirm"
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
