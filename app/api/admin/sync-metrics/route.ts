import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getAllUserMappings } from '@/lib/airtable/user-mappings'
import { validatePermission } from '@/lib/auth/permission-sync'\nimport { getSyncMetrics } from '@/lib/zep/user-operations'

export async function GET() {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const isAdmin = await validatePermission(userId, 'admin')
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const [active, deleted, suspended] = await Promise.all([
      getAllUserMappings('active'),
      getAllUserMappings('deleted'),
      getAllUserMappings('suspended')
    ])
    
    const totalUsers = active.length + deleted.length + suspended.length
    const failedSyncs = active.filter(m => {
      const lastSync = new Date(m.last_synced_at || 0)
      const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60)
      return hoursSinceSync > 24
    }).length
    
    const metrics = {
      totalUsers,
      activeUsers: active.length,
      deletedUsers: deleted.length,
      suspendedUsers: suspended.length,
      syncSuccessRate: totalUsers > 0 ? ((totalUsers - failedSyncs) / totalUsers) * 100 : 100,
      lastSyncTime: active.reduce((latest, m) => {
        const syncTime = new Date(m.last_synced_at || m.updated_at).getTime()
        return syncTime > latest ? syncTime : latest
      }, 0) ? new Date(active.reduce((latest, m) => {
        const syncTime = new Date(m.last_synced_at || m.updated_at).getTime()
        return syncTime > latest ? syncTime : latest
      }, 0)).toISOString() : new Date().toISOString(),
      failedSyncs
    }
    
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error fetching sync metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync metrics' },
      { status: 500 }
    )
  }
}