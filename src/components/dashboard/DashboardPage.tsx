import { Card } from "@/components/ui/card"
import { StatsCard } from "./StatsCard"
import { ConnectionStatus } from "./ConnectionStatus"
import { ActivityFeed } from "./ActivityFeed"
import { useQuery } from "@tanstack/react-query"
import { airtableService } from "@/lib/services/airtable-service"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [testDatasets, ontologies, entityDefs] = await Promise.all([
        airtableService.listRecords('TestDatasets'),
        airtableService.listRecords('Ontologies'),
        airtableService.listRecords('EntityDefinitions')
      ])
      
      return {
        totalDocuments: testDatasets.length,
        totalOntologies: ontologies.length,
        totalGraphs: entityDefs.length
      }
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000 // Consider data stale after 30 seconds
  })

  return (
    <div className="container mx-auto p-6 space-y-6 relative">
      {/* Fortress of Solitude crystal background */}
      <div className="fixed inset-0 fortress-crystal opacity-30 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        {/* Solar energy orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl solar-powered" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl solar-powered animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-secondary/10 rounded-full blur-2xl heat-vision-glow" />
      </div>
      
      {/* Superman shield logo */}
      <div className="absolute top-6 right-6 w-16 h-16 superman-shield opacity-20 animate-pulse" />
      
      <div className="flex justify-between items-center mb-8 relative">
        <div>
          <h1 className="text-5xl font-bold kryptonian-text tracking-wider">
            KRYPTON COMMAND
          </h1>
          <p className="text-sm text-muted-foreground mt-1 tracking-widest uppercase">Fortress of Solitude Interface</p>
        </div>
        <ConnectionStatus />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statsLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatsCard
              title="Test Datasets"
              value={stats?.totalDocuments ?? 0}
              icon="📊"
            />
            <StatsCard
              title="Ontologies"
              value={stats?.totalOntologies ?? 0}
              icon="🧬"
            />
            <StatsCard
              title="Entity Definitions"
              value={stats?.totalGraphs ?? 0}
              icon="🔗"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <ActivityFeed />
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.href = '/documents'}
                className="w-full text-left px-4 py-2 hover:bg-accent rounded-md transition-colors"
              >
                → Upload Document
              </button>
              <button 
                onClick={() => window.location.href = '/ontologies'}
                className="w-full text-left px-4 py-2 hover:bg-accent rounded-md transition-colors"
              >
                → Create Ontology
              </button>
              <button 
                onClick={() => window.location.href = '/graphs'}
                className="w-full text-left px-4 py-2 hover:bg-accent rounded-md transition-colors"
              >
                → Generate Graph
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}