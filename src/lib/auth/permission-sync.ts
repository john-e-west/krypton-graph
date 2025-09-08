import { clerkClient } from '@clerk/nextjs/server'
import { updateZepUser } from '@/lib/zep/user-operations'
import { updateUserMapping, getUserMapping } from '@/lib/airtable/user-mappings'

export interface PermissionMapping {
  clerkRole: string
  zepPermission: string
}

const PERMISSION_MAPPINGS: PermissionMapping[] = [
  { clerkRole: 'admin', zepPermission: 'admin' },
  { clerkRole: 'org:admin', zepPermission: 'admin' },
  { clerkRole: 'user', zepPermission: 'user' },
  { clerkRole: 'org:member', zepPermission: 'user' },
  { clerkRole: 'viewer', zepPermission: 'read_only' },
  { clerkRole: 'org:viewer', zepPermission: 'read_only' }
]

const permissionCache = new Map<string, { permissions: string[], timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000

export async function syncUserPermissions(
  clerkUserId: string,
  zepUserId: string
): Promise<void> {
  try {
    const user = await clerkClient.users.getUser(clerkUserId)
    
    const organizationMemberships = await clerkClient.users.getOrganizationMembershipList({
      userId: clerkUserId
    })
    
    const clerkRoles: string[] = []
    
    if (user.publicMetadata?.role) {
      clerkRoles.push(user.publicMetadata.role as string)
    }
    
    organizationMemberships.data.forEach(membership => {
      if (membership.role) {
        clerkRoles.push(`org:${membership.role}`)
      }
    })
    
    if (clerkRoles.length === 0) {
      clerkRoles.push('user')
    }
    
    const zepPermissions = mapClerkRolesToZepPermissions(clerkRoles)
    
    await updateZepUser(zepUserId, {
      metadata: {
        permissions: zepPermissions,
        clerk_roles: clerkRoles,
        last_permission_sync: new Date().toISOString()
      }
    })
    
    const mapping = await getUserMapping(clerkUserId)
    if (mapping) {
      await updateUserMapping(mapping.id, {
        roles: clerkRoles,
        last_synced_at: new Date().toISOString()
      })
    }
    
    permissionCache.set(clerkUserId, {
      permissions: zepPermissions,
      timestamp: Date.now()
    })
    
  } catch (error) {
    console.error(`Error syncing permissions for user ${clerkUserId}:`, error)
    throw error
  }
}

export function mapClerkRolesToZepPermissions(clerkRoles: string[]): string[] {
  const zepPermissions = new Set<string>()
  
  for (const clerkRole of clerkRoles) {
    const mapping = PERMISSION_MAPPINGS.find(m => m.clerkRole === clerkRole)
    if (mapping) {
      zepPermissions.add(mapping.zepPermission)
    }
  }
  
  if (zepPermissions.size === 0) {
    zepPermissions.add('user')
  }
  
  if (zepPermissions.has('admin')) {
    zepPermissions.add('user')
    zepPermissions.add('read_only')
  } else if (zepPermissions.has('user')) {
    zepPermissions.add('read_only')
  }
  
  return Array.from(zepPermissions)
}

export async function getUserPermissions(clerkUserId: string): Promise<string[]> {
  const cached = permissionCache.get(clerkUserId)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions
  }
  
  const mapping = await getUserMapping(clerkUserId)
  if (!mapping) {
    throw new Error(`No user mapping found for Clerk user ${clerkUserId}`)
  }
  
  await syncUserPermissions(clerkUserId, mapping.zep_user_id)
  
  const updatedCache = permissionCache.get(clerkUserId)
  return updatedCache?.permissions || ['user']
}

export async function validatePermission(
  clerkUserId: string,
  requiredPermission: string
): Promise<boolean> {
  try {
    const permissions = await getUserPermissions(clerkUserId)
    
    if (permissions.includes('admin')) {
      return true
    }
    
    if (requiredPermission === 'read_only') {
      return true
    }
    
    if (requiredPermission === 'user') {
      return permissions.includes('user') || permissions.includes('admin')
    }
    
    return permissions.includes(requiredPermission)
  } catch (error) {
    console.error(`Error validating permission for user ${clerkUserId}:`, error)
    return false
  }
}

export function clearPermissionCache(clerkUserId?: string): void {
  if (clerkUserId) {
    permissionCache.delete(clerkUserId)
  } else {
    permissionCache.clear()
  }
}