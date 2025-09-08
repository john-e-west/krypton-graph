import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { airtableService } from "@/lib/services/airtable-service"

export function ConnectionStatus() {
  const { data: status, isLoading, error, refetch } = useQuery({
    queryKey: ['connection-status'],
    queryFn: async () => {
      try {
        const startTime = Date.now()
        await airtableService.testConnection()
        const responseTime = Date.now() - startTime
        
        return {
          connected: true,
          service: 'Airtable',
          responseTime
        }
      } catch (err) {
        return {
          connected: false,
          service: 'Airtable',
          error: err instanceof Error ? err.message : 'Connection failed'
        }
      }
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1
  })

  if (isLoading) {
    return (
      <Badge variant="secondary" className="animate-pulse">
        Checking connection...
      </Badge>
    )
  }

  if (error || !status?.connected) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive">
          <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
          Disconnected
        </Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          className="h-7"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <Badge variant="default" className="bg-green-600">
      <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
      Connected ({status.responseTime}ms)
    </Badge>
  )
}