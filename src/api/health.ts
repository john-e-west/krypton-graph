import { airtableService } from "@/lib/services/airtable-service"

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'error'
  version: string
  services: {
    airtable: {
      status: 'connected' | 'disconnected' | 'error'
      responseTime?: number
      error?: string
    }
    api: {
      status: 'operational' | 'degraded' | 'down'
      uptime: number
    }
  }
  timestamp: string
}

const startTime = Date.now()

export async function healthCheck(): Promise<HealthCheckResponse> {
  let airtableStatus: HealthCheckResponse['services']['airtable'] = {
    status: 'disconnected'
  }
  
  try {
    const checkStart = Date.now()
    await airtableService.testConnection()
    airtableStatus = {
      status: 'connected',
      responseTime: Date.now() - checkStart
    }
  } catch (error) {
    airtableStatus = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  const uptime = Math.floor((Date.now() - startTime) / 1000)
  
  const overallStatus = 
    airtableStatus.status === 'connected' ? 'healthy' :
    airtableStatus.status === 'error' ? 'error' : 'degraded'

  return {
    status: overallStatus,
    version: '1.0.0',
    services: {
      airtable: airtableStatus,
      api: {
        status: 'operational',
        uptime
      }
    },
    timestamp: new Date().toISOString()
  }
}

// API route handler for frameworks like Express/Fastify
export async function handleHealthCheck(_req: unknown, res: { status: (code: number) => { json: (data: unknown) => void } }) {
  try {
    const health = await healthCheck()
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 503 : 500
    
    res.status(statusCode).json(health)
  } catch (_error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    })
  }
}

// For use with Vite/React Router API routes
export async function GET() {
  try {
    const health = await healthCheck()
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 503 : 500
    
    return new Response(JSON.stringify(health), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (_error) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}