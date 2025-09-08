import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Webhook } from 'svix'
import { POST } from '../route'
import * as zepOperations from '@/lib/zep/user-operations'
import * as airtableOperations from '@/lib/airtable/user-mappings'
import * as permissionSync from '@/lib/auth/permission-sync'

vi.mock('svix')
vi.mock('@/lib/zep/user-operations')
vi.mock('@/lib/airtable/user-mappings')
vi.mock('@/lib/auth/permission-sync')
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((name: string) => {
      const headerMap: Record<string, string> = {
        'svix-id': 'test-id',
        'svix-timestamp': '1234567890',
        'svix-signature': 'test-signature'
      }
      return headerMap[name]
    })
  }))
}))

describe('Clerk Webhook Handler', () => {
  const originalEnv = process.env
  
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      CLERK_WEBHOOK_SECRET: 'test-webhook-secret'
    }
  })
  
  afterEach(() => {
    process.env = originalEnv
  })
  
  describe('POST /api/clerk/webhooks', () => {
    it('should verify webhook signature', async () => {
      const mockVerify = vi.fn().mockReturnValue({
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [
            { 
              id: 'email_1',
              email_address: 'test@example.com'
            }
          ],
          primary_email_address_id: 'email_1',
          first_name: 'Test',
          last_name: 'User',
          image_url: 'https://example.com/avatar.jpg',
          public_metadata: {}
        }
      })
      
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: mockVerify
      } as any))
      
      vi.mocked(zepOperations.createZepUser).mockResolvedValue({
        user_id: 'zep_123',
        email: 'test@example.com',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      vi.mocked(airtableOperations.createUserMapping).mockResolvedValue({
        id: 'rec123',
        clerk_user_id: 'user_123',
        zep_user_id: 'zep_123',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user'],
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      const request = new Request('http://localhost:3000/api/clerk/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.created',
          data: {}
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toEqual({ received: true })
      expect(mockVerify).toHaveBeenCalled()
    })
    
    it('should handle user.created event', async () => {
      const userData = {
        id: 'user_123',
        email_addresses: [
          { 
            id: 'email_1',
            email_address: 'test@example.com'
          }
        ],
        primary_email_address_id: 'email_1',
        first_name: 'Test',
        last_name: 'User',
        image_url: 'https://example.com/avatar.jpg',
        public_metadata: { custom: 'data' }
      }
      
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: vi.fn().mockReturnValue({
          type: 'user.created',
          data: userData
        })
      } as any))
      
      vi.mocked(zepOperations.createZepUser).mockResolvedValue({
        user_id: 'zep_123',
        email: 'test@example.com',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      vi.mocked(airtableOperations.createUserMapping).mockResolvedValue({
        id: 'rec123',
        clerk_user_id: 'user_123',
        zep_user_id: 'zep_123',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user'],
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      const request = new Request('http://localhost:3000/api/clerk/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.created',
          data: userData
        })
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(zepOperations.createZepUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        metadata: {
          clerk_user_id: 'user_123',
          custom: 'data'
        }
      })
      expect(airtableOperations.createUserMapping).toHaveBeenCalled()
      expect(permissionSync.syncUserPermissions).toHaveBeenCalledWith('user_123', 'zep_123')
    })
    
    it('should handle user.updated event', async () => {
      const userData = {
        id: 'user_123',
        email_addresses: [
          { 
            id: 'email_1',
            email_address: 'updated@example.com'
          }
        ],
        primary_email_address_id: 'email_1',
        first_name: 'Updated',
        last_name: 'User',
        image_url: 'https://example.com/new-avatar.jpg',
        public_metadata: {}
      }
      
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: vi.fn().mockReturnValue({
          type: 'user.updated',
          data: userData
        })
      } as any))
      
      vi.mocked(airtableOperations.getUserMapping).mockResolvedValue({
        id: 'rec123',
        clerk_user_id: 'user_123',
        zep_user_id: 'zep_123',
        email: 'old@example.com',
        name: 'Old User',
        roles: ['user'],
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      const request = new Request('http://localhost:3000/api/clerk/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.updated',
          data: userData
        })
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(zepOperations.updateZepUser).toHaveBeenCalledWith('zep_123', {
        email: 'updated@example.com',
        name: 'Updated User',
        avatar_url: 'https://example.com/new-avatar.jpg',
        metadata: {
          clerk_user_id: 'user_123'
        }
      })
      expect(airtableOperations.updateUserMapping).toHaveBeenCalled()
    })
    
    it('should handle user.deleted event', async () => {
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: vi.fn().mockReturnValue({
          type: 'user.deleted',
          data: {
            id: 'user_123'
          }
        })
      } as any))
      
      vi.mocked(airtableOperations.getUserMapping).mockResolvedValue({
        id: 'rec123',
        clerk_user_id: 'user_123',
        zep_user_id: 'zep_123',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user'],
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      const request = new Request('http://localhost:3000/api/clerk/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.deleted',
          data: { id: 'user_123' }
        })
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(zepOperations.deleteZepUser).toHaveBeenCalledWith('zep_123')
      expect(airtableOperations.deleteUserMapping).toHaveBeenCalledWith('rec123')
    })
    
    it('should return 400 for invalid signature', async () => {
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: vi.fn().mockImplementation(() => {
          throw new Error('Invalid signature')
        })
      } as any))
      
      const request = new Request('http://localhost:3000/api/clerk/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.created',
          data: {}
        })
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
    
    it('should handle missing webhook secret', async () => {
      delete process.env.CLERK_WEBHOOK_SECRET
      
      const request = new Request('http://localhost:3000/api/clerk/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.created',
          data: {}
        })
      })
      
      await expect(POST(request)).rejects.toThrow('Please add CLERK_WEBHOOK_SECRET')
    })
    
    it('should handle errors gracefully and return 200', async () => {
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: vi.fn().mockReturnValue({
          type: 'user.created',
          data: {
            id: 'user_123',
            email_addresses: [],
            primary_email_address_id: 'email_1'
          }
        })
      } as any))
      
      const request = new Request('http://localhost:3000/api/clerk/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.created',
          data: {}
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toEqual({ 
        error: 'Error processing webhook',
        received: true 
      })
    })
  })
})