'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Loader2, Users as UsersIcon, Search, UserPlus } from 'lucide-react'
import { UserAssignmentDialog } from '@/components/admin/user-assignment-dialog'
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

interface User {
  id: string
  email: string
  companies: Array<{ id: string; name: string; role: string }>
}

interface Company {
  id: string
  name: string
  industry: string
  color: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCompanyId, setInviteCompanyId] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [isInviting, setIsInviting] = useState(false)

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
    // Refetch users after saving
    fetchData()
  }

  async function handleInviteUser() {
    if (!inviteEmail.trim() || !inviteCompanyId) {
      alert('Please enter an email and select a company')
      return
    }

    setIsInviting(true)
    try {
      const response = await fetch('/api/admin/users/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          companyId: inviteCompanyId,
          role: inviteRole
        })
      })

      if (response.ok) {
        alert('User invited successfully! They will have access once they sign in.')
        setInviteDialogOpen(false)
        setInviteEmail('')
        setInviteCompanyId('')
        setInviteRole('viewer')
        fetchData()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to invite user')
      }
    } catch (error) {
      console.error('Failed to invite user:', error)
      alert('Failed to invite user. Please try again.')
    } finally {
      setIsInviting(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
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
            <Button variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
              <DialogDescription>
                Add a user to one of your companies. They&apos;ll have access once they sign in with this email.
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
                <Label htmlFor="invite-company">Company</Label>
                <Select value={inviteCompanyId} onValueChange={setInviteCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      {/* Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>
                All users who have access to companies you own or administrate
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No users found matching your search' : 'No users found'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{user.email}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {user.companies.length === 0 ? (
                        <Badge variant="outline" className="text-xs">
                          No companies assigned
                        </Badge>
                      ) : (
                        <>
                          <Badge variant="secondary" className="text-xs">
                            {user.companies.length} {user.companies.length === 1 ? 'company' : 'companies'}
                          </Badge>
                          {user.companies.slice(0, 3).map(company => (
                            <Badge
                              key={company.id}
                              variant="outline"
                              className="text-xs"
                            >
                              {company.name}
                              {company.role === 'owner' && ' (Owner)'}
                              {company.role === 'admin' && ' (Admin)'}
                            </Badge>
                          ))}
                          {user.companies.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.companies.length - 3} more
                            </Badge>
                          )}
                        </>
                      )}
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

      {/* User Assignment Dialog */}
      <UserAssignmentDialog
        user={selectedUser}
        availableCompanies={companies}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
      />
    </div>
  )
}
