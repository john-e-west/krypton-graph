import { useQuery } from "@tanstack/react-query"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { ActivityItem } from "./ActivityItem"
import { airtableService } from "@/lib/services/airtable-service"

interface Activity {
  id: string
  type: 'document_added' | 'ontology_updated' | 'graph_created'
  title: string
  description: string
  timestamp: Date
  status: 'success' | 'pending' | 'error'
}

export function ActivityFeed() {
  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: async () => {
      const [testDatasets, ontologies, entityDefs] = await Promise.all([
        airtableService.listRecords('TestDatasets', { maxRecords: 10 }),
        airtableService.listRecords('Ontologies', { maxRecords: 10 }),
        airtableService.listRecords('EntityDefinitions', { maxRecords: 10 })
      ])

      const allActivities: Activity[] = [
        ...testDatasets.map((doc: any) => ({
          id: doc.id,
          type: 'document_added' as const,
          title: doc.fields.Name || doc.fields.name || 'Test Dataset',
          description: `Test dataset ${doc.fields.datasetType || 'added'}`,
          timestamp: new Date(doc.fields.createdTime || doc.fields.Created || Date.now()),
          status: 'success' as const
        })),
        ...ontologies.map((ont: any) => ({
          id: ont.id,
          type: 'ontology_updated' as const,
          title: ont.fields.Name || ont.fields.name || 'Untitled Ontology',
          description: `Ontology ${ont.fields.status === 'Active' ? 'activated' : 'updated'}`,
          timestamp: new Date(ont.fields.createdTime || ont.fields.Created || Date.now()),
          status: 'success' as const
        })),
        ...entityDefs.map((entity: any) => ({
          id: entity.id,
          type: 'graph_created' as const,
          title: entity.fields.Name || entity.fields.name || 'Entity Definition',
          description: 'Entity definition created',
          timestamp: new Date(entity.fields.createdTime || entity.fields.Created || Date.now()),
          status: 'success' as const
        }))
      ]

      return allActivities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10)
    },
    refetchInterval: 30000,
    retry: 2
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load activities. Please try again later.
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No recent activity to display
      </div>
    )
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3 pr-4">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </ScrollArea>
  )
}