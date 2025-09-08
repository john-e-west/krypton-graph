import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { FileText, Brain, Network } from "lucide-react"

interface ActivityItemProps {
  activity: {
    id: string
    type: 'document_added' | 'ontology_updated' | 'graph_created'
    title: string
    description: string
    timestamp: Date
    status: 'success' | 'pending' | 'error'
  }
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const getIcon = () => {
    switch (activity.type) {
      case 'document_added':
        return <FileText className="w-4 h-4" />
      case 'ontology_updated':
        return <Brain className="w-4 h-4" />
      case 'graph_created':
        return <Network className="w-4 h-4" />
    }
  }

  const getStatusVariant = () => {
    switch (activity.status) {
      case 'success':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'error':
        return 'destructive'
    }
  }

  return (
    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex-shrink-0 mt-1 text-muted-foreground">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{activity.title}</p>
          <Badge variant={getStatusVariant()} className="text-xs">
            {activity.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {activity.description}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}