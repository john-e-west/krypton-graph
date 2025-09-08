import { useEffect } from 'react'
import { useAuth, useOrganization } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export interface SSOMetadata {
  provider: string
  externalUserId: string
  sessionInfo: {
    createdAt: string
    expiresAt?: string
  }
}

export function SSOHandler() {
  const { isSignedIn, isLoaded, userId } = useAuth()
  const { organization } = useOrganization()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && userId) {
      handleSSOLogin(userId)
    }
  }, [isSignedIn, isLoaded, userId])

  const handleSSOLogin = async (clerkUserId: string) => {
    try {
      const response = await fetch('/api/auth/sso-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkUserId,
          organizationId: organization?.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to sync SSO user')
      }

      const data = await response.json()
      
      if (data.firstTimeLogin) {
        toast.success('Welcome! Your account has been created successfully.')
        router.push('/onboarding')
      } else {
        toast.success('Welcome back!')
      }
    } catch (error) {
      console.error('SSO sync error:', error)
      toast.error('Failed to complete SSO login. Please try again.')
    }
  }

  return null
}

export function useSSOMetadata() {
  const { userId, sessionId } = useAuth()
  
  const getSSOMetadata = async (): Promise<SSOMetadata | null> => {
    if (!userId || !sessionId) return null
    
    try {
      const response = await fetch(`/api/auth/sso-metadata?userId=${userId}`)
      if (!response.ok) return null
      
      return await response.json()
    } catch {
      return null
    }
  }
  
  return { getSSOMetadata }
}