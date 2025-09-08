import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { getUserMapping, createUserMapping } from '@/lib/airtable/user-mappings'
import { createZepUser, getZepUserByEmail } from '@/lib/zep/user-operations'
import { syncUserPermissions } from '@/lib/auth/permission-sync'

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { organizationId } = body

    const user = await clerkClient.users.getUser(userId)
    
    const primaryEmail = user.emailAddresses.find(
      e => e.id === user.primaryEmailAddressId
    )?.emailAddress

    if (!primaryEmail) {
      return NextResponse.json(
        { error: 'No primary email found' },
        { status: 400 }
      )
    }

    let mapping = await getUserMapping(userId)
    let firstTimeLogin = false

    if (!mapping) {
      firstTimeLogin = true

      const ssoProvider = user.externalAccounts?.[0]?.provider || 'email'
      const externalId = user.externalAccounts?.[0]?.externalId || userId

      let zepUser = await getZepUserByEmail(primaryEmail)
      
      if (!zepUser) {
        zepUser = await createZepUser({
          email: primaryEmail,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || primaryEmail,
          avatar_url: user.imageUrl || '',
          metadata: {
            clerk_user_id: userId,
            sso_provider: ssoProvider,
            external_user_id: externalId,
            organization_id: organizationId,
            first_login_at: new Date().toISOString(),
            ...user.publicMetadata
          }
        })
      }

      mapping = await createUserMapping({
        clerk_user_id: userId,
        zep_user_id: zepUser.user_id,
        email: primaryEmail,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || primaryEmail,
        roles: organizationId ? ['org:member'] : ['user'],
        status: 'active'
      })
    } else {
      const ssoMetadata = {
        sso_provider: user.externalAccounts?.[0]?.provider || 'email',
        external_user_id: user.externalAccounts?.[0]?.externalId || userId,
        last_sso_login: new Date().toISOString(),
        organization_id: organizationId
      }

      await fetch(`${process.env.ZEP_API_URL}/users/${mapping.zep_user_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.ZEP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metadata: ssoMetadata
        })
      })
    }

    await syncUserPermissions(userId, mapping.zep_user_id)

    return NextResponse.json({
      success: true,
      firstTimeLogin,
      userId: mapping.zep_user_id
    })
  } catch (error) {
    console.error('SSO sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync SSO user' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(req.url)
    const requestedUserId = url.searchParams.get('userId')
    
    if (requestedUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const user = await clerkClient.users.getUser(userId)
    const externalAccount = user.externalAccounts?.[0]

    if (!externalAccount) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      provider: externalAccount.provider,
      externalUserId: externalAccount.externalId || '',
      sessionInfo: {
        createdAt: new Date(user.createdAt).toISOString(),
        expiresAt: user.lastActiveAt 
          ? new Date(user.lastActiveAt + 24 * 60 * 60 * 1000).toISOString()
          : undefined
      }
    })
  } catch (error) {
    console.error('Error fetching SSO metadata:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SSO metadata' },
      { status: 500 }
    )
  }
}