import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { getUserMapping, updateUserMapping } from '@/lib/airtable/user-mappings'
import { updateZepUser } from '@/lib/zep/user-operations'
import { syncUserPermissions, validatePermission } from '@/lib/auth/permission-sync'

export async function POST(req: Request) {
  try {
    const { userId: adminUserId } = auth()
    
    if (!adminUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const isAdmin = await validatePermission(adminUserId, 'admin')
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { userId } = await req.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const mapping = await getUserMapping(userId)
    
    if (!mapping) {
      return NextResponse.json(
        { error: 'User mapping not found' },
        { status: 404 }
      )
    }

    const user = await clerkClient.users.getUser(userId)
    
    const primaryEmail = user.emailAddresses.find(
      e => e.id === user.primaryEmailAddressId
    )?.emailAddress

    const userData = {
      email: primaryEmail || mapping.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || mapping.name,
      avatar_url: user.imageUrl || '',
      metadata: {
        clerk_user_id: userId,
        manual_sync_by: adminUserId,
        manual_sync_at: new Date().toISOString(),
        ...user.publicMetadata
      }
    }

    await updateZepUser(mapping.zep_user_id, userData)

    await updateUserMapping(mapping.id, {
      email: userData.email,
      name: userData.name,
      last_synced_at: new Date().toISOString()
    })

    await syncUserPermissions(userId, mapping.zep_user_id)

    return NextResponse.json({
      success: true,
      message: 'User synced successfully'
    })
  } catch (error) {
    console.error('Manual sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    )
  }
}