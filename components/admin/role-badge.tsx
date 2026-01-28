'use client'

import { Badge } from '@/components/ui/badge'
import { Shield, ShieldCheck, User } from 'lucide-react'

export type UserRole = 'owner' | 'admin' | 'client' | 'viewer'

interface RoleBadgeProps {
  role: UserRole
  showIcon?: boolean
  size?: 'sm' | 'default'
}

const roleConfig: Record<
  UserRole,
  {
    label: string
    variant: 'default' | 'secondary' | 'outline'
    icon: typeof Shield
  }
> = {
  owner: {
    label: 'Owner',
    variant: 'default',
    icon: ShieldCheck,
  },
  admin: {
    label: 'Admin',
    variant: 'secondary',
    icon: Shield,
  },
  client: {
    label: 'Viewer',
    variant: 'outline',
    icon: User,
  },
  viewer: {
    label: 'Viewer',
    variant: 'outline',
    icon: User,
  },
}

export function RoleBadge({ role, showIcon = false, size = 'default' }: RoleBadgeProps) {
  const config = roleConfig[role] || roleConfig.viewer
  const Icon = config.icon

  return (
    <Badge
      variant={config.variant}
      className={size === 'sm' ? 'text-xs px-2 py-0' : ''}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  )
}

export function getHighestRole(roles: string[]): UserRole {
  if (roles.includes('owner')) return 'owner'
  if (roles.includes('admin')) return 'admin'
  return 'client'
}
