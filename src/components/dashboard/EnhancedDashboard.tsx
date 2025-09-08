import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatsCard } from "./StatsCard"
import { ConnectionStatus } from "./ConnectionStatus"
import { ActivityFeed } from "./ActivityFeed"
import { useQuery } from "@tanstack/react-query"
import { airtableService } from "@/lib/services/airtable-service"
import { Skeleton } from "@/components/ui/skeleton"
import { useNavigate } from "react-router-dom"
import { 
  Upload, 
  Network, 
  GitBranch, 
  TrendingUp, 
  Activity,
  Zap,
  Sparkles,
  Brain,
  FileSearch,
  Layers
} from "lucide-react"
import { cn } from "@/lib/utils"

export function EnhancedDashboard() {
  const navigate = useNavigate()
  
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
    refetchInterval: 60000,
    staleTime: 30000
  })

  const quickActions = [
    {
      label: "Upload Document",
      icon: Upload,
      path: "/documents",
      gradient: "from-blue-500 to-cyan-500",
      description: "Import and process new documents"
    },
    {
      label: "Create Ontology",
      icon: Network,
      path: "/ontologies",
      gradient: "from-purple-500 to-pink-500",
      description: "Define new entity relationships"
    },
    {
      label: "Generate Graph",
      icon: GitBranch,
      path: "/graphs",
      gradient: "from-green-500 to-emerald-500",
      description: "Build knowledge connections"
    },
    {
      label: "Semantic Search",
      icon: FileSearch,
      path: "/search",
      gradient: "from-orange-500 to-red-500",
      description: "Query your knowledge base"
    }
  ]

  const statsCards = [
    {
      title: "Test Datasets",
      value: stats?.totalDocuments ?? 0,
      icon: Layers,
      gradient: "from-blue-600 to-blue-400",
      trend: "+12%",
      trendUp: true
    },
    {
      title: "Ontologies",
      value: stats?.totalOntologies ?? 0,
      icon: Brain,
      gradient: "from-purple-600 to-purple-400",
      trend: "+8%",
      trendUp: true
    },
    {
      title: "Entity Definitions",
      value: stats?.totalGraphs ?? 0,
      icon: Network,
      gradient: "from-green-600 to-green-400",
      trend: "+23%",
      trendUp: true
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Animated background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-4000" />
      </div>

      <div className="relative container mx-auto p-6 space-y-8">
        {/* Header with futuristic styling */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
              <Zap className="h-8 w-8 text-primary animate-pulse" />
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Real-time knowledge graph analytics</p>
          </div>
          <div className="flex items-center gap-4">
            <ConnectionStatus />
            <Button 
              variant="outline" 
              className="border-primary/30 hover:border-primary hover:bg-primary/10 transition-all duration-300"
              onClick={() => navigate('/search')}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Insights
            </Button>
          </div>
        </div>

        {/* Stats Cards with glassmorphism effect */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsLoading ? (
            <>
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
            </>
          ) : (
            statsCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card 
                  key={stat.title}
                  className={cn(
                    "relative overflow-hidden border-0",
                    "bg-gradient-to-br backdrop-blur-xl",
                    "hover:shadow-2xl hover:scale-105 transition-all duration-300",
                    "before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-10",
                    `before:${stat.gradient}`
                  )}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn(
                        "p-3 rounded-lg bg-gradient-to-br",
                        stat.gradient,
                        "shadow-lg"
                      )}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        {stat.trendUp ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                        )}
                        <span className={stat.trendUp ? "text-green-500" : "text-red-500"}>
                          {stat.trend}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={cn(
                      "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r",
                      stat.gradient
                    )} />
                  </div>
                </Card>
              )
            })
          )}
        </div>

        {/* Quick Actions with enhanced styling */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Card
                key={action.path}
                className={cn(
                  "group relative overflow-hidden cursor-pointer",
                  "border-0 hover:shadow-2xl transition-all duration-300",
                  "hover:scale-105 hover:-translate-y-1"
                )}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  animationDelay: `${index * 100}ms`
                }}
                onClick={() => navigate(action.path)}
              >
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity duration-300",
                  action.gradient
                )} />
                <div className="p-6 relative z-10">
                  <div className={cn(
                    "inline-flex p-3 rounded-lg bg-gradient-to-br mb-4",
                    action.gradient,
                    "shadow-lg group-hover:shadow-2xl transition-shadow"
                  )}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                    {action.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <div className={cn(
                  "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300",
                  action.gradient
                )} />
              </Card>
            )
          })}
        </div>

        {/* Activity Feed and Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card 
              className="border-0 shadow-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Recent Activity
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/graphs')}>
                    View All
                  </Button>
                </div>
                <ActivityFeed />
              </div>
            </Card>
          </div>
          
          <div className="lg:col-span-1">
            <Card 
              className="border-0 shadow-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  System Performance
                </h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Query Speed</span>
                      <span className="text-green-500">182ms</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-green-400 w-[95%] animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Graph Processing</span>
                      <span className="text-blue-500">89%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 w-[89%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memory Usage</span>
                      <span className="text-yellow-500">67%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 w-[67%]" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}