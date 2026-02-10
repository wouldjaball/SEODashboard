'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CheckCircle } from 'lucide-react'

interface Company {
  id: string
  name: string
  industry: string
  color: string
}

interface Assignment {
  companyId: string
  role: 'owner' | 'admin' | 'client'
  isAssigned: boolean
}

interface UserAssignmentDialogProps {
  user: {
    id: string
    email: string
    companies: Array<{ id: string; name: string; role: string }>
  } | null
  availableCompanies: Company[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
  currentUserIsOwner?: boolean
}

export function UserAssignmentDialog({
  user,
  availableCompanies,
  open,
  onOpenChange,
  onSave,
  currentUserIsOwner = true
}: UserAssignmentDialogProps) {
  const [assignments, setAssignments] = useState<Map<string, Assignment>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize assignments when user changes
  useEffect(() => {
    if (!user || !availableCompanies) return

    const newAssignments = new Map<string, Assignment>()

    // Add all available companies
    availableCompanies.forEach(company => {
      const existing = user.companies.find(c => c.id === company.id)
      newAssignments.set(company.id, {
        companyId: company.id,
        role: (existing?.role as 'owner' | 'admin' | 'client') || 'client',
        isAssigned: !!existing
      })
    })

    setAssignments(newAssignments)
    setHasChanges(false)
  }, [user, availableCompanies])

  const handleToggleAssignment = (companyId: string) => {
    const newAssignments = new Map(assignments)
    const assignment = newAssignments.get(companyId)
    if (assignment) {
      assignment.isAssigned = !assignment.isAssigned
      newAssignments.set(companyId, assignment)
      setAssignments(newAssignments)
      setHasChanges(true)
    }
  }

  const handleRoleChange = (companyId: string, role: 'owner' | 'admin' | 'client') => {
    const newAssignments = new Map(assignments)
    const assignment = newAssignments.get(companyId)
    if (assignment) {
      assignment.role = role
      newAssignments.set(companyId, assignment)
      setAssignments(newAssignments)
      setHasChanges(true)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      const originalAssignments = new Map(
        user.companies.map(c => [c.id, { role: c.role, isAssigned: true }])
      )

      // Process each assignment
      for (const [companyId, assignment] of assignments.entries()) {
        const wasAssigned = originalAssignments.has(companyId)
        const originalRole = originalAssignments.get(companyId)?.role

        if (!wasAssigned && assignment.isAssigned) {
          // New assignment - POST to assign
          await fetch('/api/admin/users/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              companyId,
              role: assignment.role
            })
          })
        } else if (wasAssigned && !assignment.isAssigned) {
          // Remove assignment - DELETE
          await fetch(`/api/admin/users/${user.id}?companyId=${companyId}`, {
            method: 'DELETE'
          })
        } else if (wasAssigned && assignment.isAssigned && originalRole !== assignment.role) {
          // Update role - PATCH
          await fetch(`/api/admin/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId,
              role: assignment.role
            })
          })
        }
      }

      onSave()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save assignments:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) return null

  const assignedCount = Array.from(assignments.values()).filter(a => a.isAssigned).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Access: {user.email}</DialogTitle>
          <DialogDescription>
            Assign this user to companies and set their roles. {assignedCount > 0 && (
              <span className="font-medium">({assignedCount} {assignedCount === 1 ? 'company' : 'companies'} assigned)</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {availableCompanies.map(company => {
            const assignment = assignments.get(company.id)
            if (!assignment) return null

            return (
              <div
                key={company.id}
                className={`border rounded-lg p-4 transition-colors ${
                  assignment.isAssigned ? 'bg-accent/50' : 'bg-background'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={assignment.isAssigned}
                    onChange={() => handleToggleAssignment(company.id)}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: company.color }}
                      >
                        {company.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{company.name}</div>
                        <div className="text-sm text-muted-foreground">{company.industry}</div>
                      </div>
                      {assignment.isAssigned && (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                      )}
                    </div>

                    {assignment.isAssigned && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Role</label>
                        <Select
                          value={assignment.role}
                          onValueChange={(value: 'owner' | 'admin' | 'client') =>
                            handleRoleChange(company.id, value)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client">
                              <div>
                                <div className="font-medium">Client</div>
                                <div className="text-xs text-muted-foreground">
                                  View-only access to company data
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div>
                                <div className="font-medium">Admin</div>
                                <div className="text-xs text-muted-foreground">
                                  Can manage integrations and settings
                                </div>
                              </div>
                            </SelectItem>
                            {currentUserIsOwner && (
                              <SelectItem value="owner">
                                <div>
                                  <div className="font-medium">Owner</div>
                                  <div className="text-xs text-muted-foreground">
                                    Full access, can manage users
                                  </div>
                                </div>
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {availableCompanies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No companies available for assignment
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
