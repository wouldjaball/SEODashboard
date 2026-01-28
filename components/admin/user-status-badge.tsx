'use client'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

export type UserStatus = 'active' | 'pending' | 'expired'

interface UserStatusBadgeProps {
  status: UserStatus
  invitedAt?: string
  invitedByEmail?: string
  lastActiveAt?: string
  expiresAt?: string
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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

function getExpiresInDays(expiresAt: string): number {
  const expires = new Date(expiresAt)
  const now = new Date()
  const diffMs = expires.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function UserStatusBadge({
  status,
  invitedAt,
  invitedByEmail,
  lastActiveAt,
  expiresAt,
}: UserStatusBadgeProps) {
  const statusConfig = {
    active: {
      variant: 'success' as const,
      icon: CheckCircle,
      label: 'Active',
      dotColor: 'bg-green-500',
    },
    pending: {
      variant: 'warning' as const,
      icon: Clock,
      label: 'Pending',
      dotColor: 'bg-amber-500',
    },
    expired: {
      variant: 'error' as const,
      icon: AlertCircle,
      label: 'Expired',
      dotColor: 'bg-red-500',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  const getTooltipContent = () => {
    switch (status) {
      case 'active':
        return (
          <div className="space-y-1">
            <p className="font-medium">Active User</p>
            <p className="text-xs opacity-90">
              Last signed in: {formatRelativeTime(lastActiveAt)}
            </p>
            {invitedAt && (
              <p className="text-xs opacity-90">
                Joined: {formatDate(invitedAt)}
              </p>
            )}
          </div>
        )
      case 'pending':
        return (
          <div className="space-y-1">
            <p className="font-medium">Pending Invitation</p>
            {invitedByEmail && (
              <p className="text-xs opacity-90">Invited by: {invitedByEmail}</p>
            )}
            {invitedAt && (
              <p className="text-xs opacity-90">
                Invited: {formatDate(invitedAt)}
              </p>
            )}
            {expiresAt && (
              <p className="text-xs opacity-90">
                Expires in: {getExpiresInDays(expiresAt)} days
              </p>
            )}
          </div>
        )
      case 'expired':
        return (
          <div className="space-y-1">
            <p className="font-medium">Invitation Expired</p>
            {expiresAt && (
              <p className="text-xs opacity-90">
                Expired: {formatDate(expiresAt)}
              </p>
            )}
            <p className="text-xs opacity-90">
              Click Resend to send a new invitation.
            </p>
          </div>
        )
    }
  }

  const getSubtext = () => {
    switch (status) {
      case 'active':
        return `Last: ${formatRelativeTime(lastActiveAt)}`
      case 'pending':
        if (expiresAt) {
          const days = getExpiresInDays(expiresAt)
          return `Exp: ${days} day${days !== 1 ? 's' : ''}`
        }
        return invitedAt ? `Invited: ${formatRelativeTime(invitedAt)}` : ''
      case 'expired':
        return expiresAt ? `Expired: ${formatRelativeTime(expiresAt)}` : ''
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col gap-0.5">
            <Badge variant={config.variant} className="w-fit gap-1.5">
              <span className={`h-2 w-2 rounded-full ${config.dotColor}`} />
              {config.label}
            </Badge>
            <span className="text-xs text-muted-foreground pl-0.5">
              {getSubtext()}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
