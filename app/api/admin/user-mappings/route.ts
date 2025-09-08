import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getAllUserMappings } from '@/lib/airtable/user-mappings'
import { validatePermission } from '@/lib/auth/permission-sync'

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

    const mappings = await getAllUserMappings()
    
    return NextResponse.json(mappings)
  } catch (error) {
    console.error('Error fetching user mappings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user mappings' },
      { status: 500 }
    )
  }
}