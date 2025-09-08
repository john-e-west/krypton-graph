import Airtable from 'airtable'
import { z } from 'zod'

const userMappingSchema = z.object({
  clerk_user_id: z.string(),
  zep_user_id: z.string(),
  email: z.string().email(),
  name: z.string(),
  roles: z.array(z.string()),
  status: z.enum(['active', 'deleted', 'suspended']),
  last_synced_at: z.string().optional(),
})

export type UserMapping = z.infer<typeof userMappingSchema> & {
  id: string
  created_at: string
  updated_at: string
}

export type CreateUserMappingData = z.infer<typeof userMappingSchema>
export type UpdateUserMappingData = Partial<Omit<CreateUserMappingData, 'clerk_user_id' | 'zep_user_id'>>

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID!)

const USER_MAPPINGS_TABLE = 'UserMappings'

export async function createUserMapping(data: CreateUserMappingData): Promise<UserMapping> {
  const validatedData = userMappingSchema.parse(data)
  
  try {
    const record = await base(USER_MAPPINGS_TABLE).create({
      clerk_user_id: validatedData.clerk_user_id,
      zep_user_id: validatedData.zep_user_id,
      email: validatedData.email,
      name: validatedData.name,
      roles: validatedData.roles,
      status: validatedData.status,
      last_synced_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    
    return {
      id: record.id,
      ...validatedData,
      last_synced_at: record.get('last_synced_at') as string,
      created_at: record.get('created_at') as string,
      updated_at: record.get('updated_at') as string
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('DUPLICATE_VALUE')) {
      const existing = await getUserMapping(validatedData.clerk_user_id)
      if (existing) {
        return existing
      }
    }
    throw error
  }
}

export async function getUserMapping(clerkUserId: string): Promise<UserMapping | null> {
  try {
    const records = await base(USER_MAPPINGS_TABLE)
      .select({
        filterByFormula: `{clerk_user_id} = '${clerkUserId}'`,
        maxRecords: 1
      })
      .firstPage()
    
    if (records.length === 0) {
      return null
    }
    
    const record = records[0]
    
    return {
      id: record.id,
      clerk_user_id: record.get('clerk_user_id') as string,
      zep_user_id: record.get('zep_user_id') as string,
      email: record.get('email') as string,
      name: record.get('name') as string,
      roles: record.get('roles') as string[] || ['user'],
      status: record.get('status') as 'active' | 'deleted' | 'suspended',
      last_synced_at: record.get('last_synced_at') as string,
      created_at: record.get('created_at') as string,
      updated_at: record.get('updated_at') as string
    }
  } catch (error) {
    console.error('Error fetching user mapping:', error)
    return null
  }
}

export async function getUserMappingByZepId(zepUserId: string): Promise<UserMapping | null> {
  try {
    const records = await base(USER_MAPPINGS_TABLE)
      .select({
        filterByFormula: `{zep_user_id} = '${zepUserId}'`,
        maxRecords: 1
      })
      .firstPage()
    
    if (records.length === 0) {
      return null
    }
    
    const record = records[0]
    
    return {
      id: record.id,
      clerk_user_id: record.get('clerk_user_id') as string,
      zep_user_id: record.get('zep_user_id') as string,
      email: record.get('email') as string,
      name: record.get('name') as string,
      roles: record.get('roles') as string[] || ['user'],
      status: record.get('status') as 'active' | 'deleted' | 'suspended',
      last_synced_at: record.get('last_synced_at') as string,
      created_at: record.get('created_at') as string,
      updated_at: record.get('updated_at') as string
    }
  } catch (error) {
    console.error('Error fetching user mapping by ZEP ID:', error)
    return null
  }
}

export async function updateUserMapping(
  recordId: string,
  data: UpdateUserMappingData
): Promise<UserMapping> {
  const updateData: any = {
    ...data,
    updated_at: new Date().toISOString()
  }
  
  const record = await base(USER_MAPPINGS_TABLE).update(recordId, updateData)
  
  return {
    id: record.id,
    clerk_user_id: record.get('clerk_user_id') as string,
    zep_user_id: record.get('zep_user_id') as string,
    email: record.get('email') as string,
    name: record.get('name') as string,
    roles: record.get('roles') as string[] || ['user'],
    status: record.get('status') as 'active' | 'deleted' | 'suspended',
    last_synced_at: record.get('last_synced_at') as string,
    created_at: record.get('created_at') as string,
    updated_at: record.get('updated_at') as string
  }
}

export async function deleteUserMapping(recordId: string): Promise<void> {
  await base(USER_MAPPINGS_TABLE).destroy(recordId)
}

export async function getAllUserMappings(
  status: 'active' | 'deleted' | 'suspended' = 'active'
): Promise<UserMapping[]> {
  const records = await base(USER_MAPPINGS_TABLE)
    .select({
      filterByFormula: `{status} = '${status}'`
    })
    .all()
  
  return records.map(record => ({
    id: record.id,
    clerk_user_id: record.get('clerk_user_id') as string,
    zep_user_id: record.get('zep_user_id') as string,
    email: record.get('email') as string,
    name: record.get('name') as string,
    roles: record.get('roles') as string[] || ['user'],
    status: record.get('status') as 'active' | 'deleted' | 'suspended',
    last_synced_at: record.get('last_synced_at') as string,
    created_at: record.get('created_at') as string,
    updated_at: record.get('updated_at') as string
  }))
}