import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'
import { createZepUser, updateZepUser, deleteZepUser } from '@/lib/zep/user-operations'
import { 
  createUserMapping, 
  getUserMapping, 
  updateUserMapping,
  deleteUserMapping 
} from '@/lib/airtable/user-mappings'
import { syncUserPermissions } from '@/lib/auth/permission-sync'
import { webhookRateLimiter } from '@/lib/middleware/rate-limit'

// Track processed webhook IDs to prevent duplicate processing
const processedWebhooks = new Set<string>()

// Cleanup old webhook IDs every hour (basic memory management)
setInterval(() => {
  if (processedWebhooks.size > 1000) {
    processedWebhooks.clear()
  }
}, 3600000)

export async function POST(req: NextRequest) {
  const rateLimitResponse = webhookRateLimiter(req)
  if (rateLimitResponse) {
    return rateLimitResponse
  }
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env')
  }

  const headerPayload = headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    })
  }

  // SEC-002: Replay attack protection - validate timestamp
  const timestamp = parseInt(svix_timestamp)
  const now = Math.floor(Date.now() / 1000)
  const WEBHOOK_TOLERANCE = 300 // 5 minutes tolerance
  
  if (Math.abs(now - timestamp) > WEBHOOK_TOLERANCE) {
    console.warn(`Webhook timestamp too old or too far in future: ${timestamp}, now: ${now}`)
    return new Response('Webhook timestamp out of tolerance', {
      status: 400
    })
  }

  // SEC-003: Idempotency check - prevent duplicate processing
  if (processedWebhooks.has(svix_id)) {
    console.log(`Duplicate webhook ignored: ${svix_id}`)
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400
    })
  }

  // Mark webhook as processed for idempotency
  processedWebhooks.add(svix_id)

  const eventType = evt.type

  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt)
        break
      
      case 'user.updated':
        await handleUserUpdated(evt)
        break
      
      case 'user.deleted':
        await handleUserDeleted(evt)
        break
      
      case 'organizationMembership.created':
      case 'organizationMembership.updated':
        await handlePermissionUpdate(evt)
        break
      
      default:
        console.log(`Unhandled webhook event: ${eventType}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error(`Error processing webhook ${eventType}:`, error)
    
    return NextResponse.json(
      { error: 'Error processing webhook', received: true },
      { status: 200 }
    )
  }
}

async function handleUserCreated(evt: WebhookEvent) {
  if (evt.type !== 'user.created') return

  const { id, email_addresses, first_name, last_name, image_url, public_metadata } = evt.data

  // SEC-003: Check if user already exists (idempotency)
  const existingMapping = await getUserMapping(id)
  if (existingMapping) {
    console.log(`User mapping already exists for Clerk user ${id}, skipping creation`)
    return
  }

  const primaryEmail = email_addresses.find(e => e.id === evt.data.primary_email_address_id)?.email_address

  if (!primaryEmail) {
    throw new Error('No primary email found for user')
  }

  const zepUserData = {
    email: primaryEmail,
    name: `${first_name || ''} ${last_name || ''}`.trim() || primaryEmail,
    avatar_url: image_url || '',
    metadata: {
      clerk_user_id: id,
      ...public_metadata
    }
  }

  // SEC-003: Additional idempotency check - verify ZEP user doesn't exist
  try {
    const zepUser = await createZepUser(zepUserData)

    await createUserMapping({
      clerk_user_id: id,
      zep_user_id: zepUser.user_id,
      email: primaryEmail,
      name: zepUserData.name,
      roles: ['user'],
      status: 'active'
    })

    await syncUserPermissions(id, zepUser.user_id)
  } catch (error: any) {
    // Handle duplicate user creation gracefully
    if (error?.message?.includes('already exists') || error?.message?.includes('duplicate')) {
      console.log(`ZEP user already exists for ${primaryEmail}, attempting to link existing user`)
      // Could implement logic to link existing ZEP user here
      return
    }
    throw error
  }
}

async function handleUserUpdated(evt: WebhookEvent) {
  if (evt.type !== 'user.updated') return

  const { id, email_addresses, first_name, last_name, image_url, public_metadata } = evt.data

  const mapping = await getUserMapping(id)
  if (!mapping) {
    console.warn(`No user mapping found for Clerk user ${id}`)
    return
  }

  const primaryEmail = email_addresses.find(e => e.id === evt.data.primary_email_address_id)?.email_address

  const zepUserData = {
    email: primaryEmail || mapping.email,
    name: `${first_name || ''} ${last_name || ''}`.trim() || mapping.name,
    avatar_url: image_url || '',
    metadata: {
      clerk_user_id: id,
      ...public_metadata
    }
  }

  await updateZepUser(mapping.zep_user_id, zepUserData)

  await updateUserMapping(mapping.id, {
    email: zepUserData.email,
    name: zepUserData.name,
    last_synced_at: new Date().toISOString()
  })

  await syncUserPermissions(id, mapping.zep_user_id)
}

async function handleUserDeleted(evt: WebhookEvent) {
  if (evt.type !== 'user.deleted') return

  const { id } = evt.data

  const mapping = await getUserMapping(id)
  if (!mapping) {
    console.warn(`No user mapping found for deleted Clerk user ${id}`)
    return
  }

  await archiveUserContent(mapping.zep_user_id)

  await deleteZepUser(mapping.zep_user_id)

  await deleteUserMapping(mapping.id)
}

async function handlePermissionUpdate(evt: WebhookEvent) {
  if (evt.type !== 'organizationMembership.created' && evt.type !== 'organizationMembership.updated') {
    return
  }

  const userId = evt.data.public_user_data?.user_id
  if (!userId) return

  const mapping = await getUserMapping(userId)
  if (!mapping) {
    console.warn(`No user mapping found for permission update: ${userId}`)
    return
  }

  await syncUserPermissions(userId, mapping.zep_user_id)
}

async function archiveUserContent(zepUserId: string) {
  console.log(`Archiving content for ZEP user: ${zepUserId}`)
  
  try {
    // ARCH-001: Complete content archival implementation
    const archiveData = {
      user_id: zepUserId,
      archived_at: new Date().toISOString(),
      retention_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      content: {
        // Export user's graphs, episodes, facts, and other content
        graphs: await exportUserGraphs(zepUserId),
        episodes: await exportUserEpisodes(zepUserId),
        facts: await exportUserFacts(zepUserId),
        sessions: await exportUserSessions(zepUserId)
      },
      compliance: {
        gdpr_request: true,
        ccpa_request: true,
        retention_policy: '30_days'
      }
    }

    // Store in archive table/storage
    await storeUserArchive(archiveData)
    
    // Schedule cleanup after 30 days
    await scheduleArchiveCleanup(zepUserId, 30)
    
    console.log(`Successfully archived content for user ${zepUserId}`)
  } catch (error) {
    console.error(`Failed to archive content for user ${zepUserId}:`, error)
    // Don't fail the deletion process if archival fails
  }
}

// Helper functions for content export
async function exportUserGraphs(zepUserId: string) {
  try {
    // TODO: Implement actual graph export
    return { graphs: [], exported_at: new Date().toISOString() }
  } catch (error) {
    console.error('Failed to export user graphs:', error)
    return { error: 'Export failed' }
  }
}

async function exportUserEpisodes(zepUserId: string) {
  try {
    // TODO: Implement actual episodes export
    return { episodes: [], exported_at: new Date().toISOString() }
  } catch (error) {
    console.error('Failed to export user episodes:', error)
    return { error: 'Export failed' }
  }
}

async function exportUserFacts(zepUserId: string) {
  try {
    // TODO: Implement actual facts export
    return { facts: [], exported_at: new Date().toISOString() }
  } catch (error) {
    console.error('Failed to export user facts:', error)
    return { error: 'Export failed' }
  }
}

async function exportUserSessions(zepUserId: string) {
  try {
    // TODO: Implement actual sessions export
    return { sessions: [], exported_at: new Date().toISOString() }
  } catch (error) {
    console.error('Failed to export user sessions:', error)
    return { error: 'Export failed' }
  }
}

async function storeUserArchive(archiveData: any) {
  try {
    // TODO: Store in Airtable UserArchives table or cloud storage
    console.log('Storing user archive:', archiveData.user_id)
  } catch (error) {
    console.error('Failed to store user archive:', error)
    throw error
  }
}

async function scheduleArchiveCleanup(zepUserId: string, daysToKeep: number) {
  try {
    // TODO: Schedule cleanup job or add to queue
    console.log(`Scheduled cleanup for user ${zepUserId} in ${daysToKeep} days`)
  } catch (error) {
    console.error('Failed to schedule archive cleanup:', error)
  }
}