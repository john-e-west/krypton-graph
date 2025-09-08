import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useQuery } from "@tanstack/react-query"
import { airtableService } from "@/lib/services/airtable-service"
import { useNavigate } from "react-router-dom"
import { 
  Activity,
  TrendingUp,
  Users,
  Database,
  Network,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Circle,
  Info,
  ChevronRight,
  Sparkles,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

export function CleanDashboard() {
  const navigate = useNavigate()
  const [animateCards, setAnimateCards] = useState(false)
  
  useEffect(() => {
    setAnimateCards(true)
  }, [])
  
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
        totalGraphs: entityDefs.length,
        activeNodes: Math.floor(Math.random() * 1000) + 500,
        dataProcessed: Math.floor(Math.random() * 100) + 50,
        systemLoad: Math.floor(Math.random() * 100),
        networkLatency: Math.floor(Math.random() * 50) + 10
      }
    },
    refetchInterval: 5000,
    staleTime: 2500
  })

  const mainMetrics = [
    {
      label: "Total Graphs",
      value: stats?.totalGraphs ?? 0,
      change: 12.5,
      trend: "up",
      icon: Network,
      color: "blue",
      description: "Active knowledge graphs"
    },
    {
      label: "Documents",
      value: stats?.totalDocuments ?? 0,
      change: 8.3,
      trend: "up",
      icon: Database,
      color: "purple",
      description: "Processed documents"
    },
    {
      label: "Ontologies",
      value: stats?.totalOntologies ?? 0,
      change: 23.1,
      trend: "up",
      icon: Globe,
      color: "green",
      description: "Domain models"
    },
    {
      label: "Active Nodes",
      value: stats?.activeNodes ?? 0,
      change: -2.4,
      trend: "down",
      icon: Activity,
      color: "orange",
      description: "Processing nodes"
    }
  ]

  const recentActivity = [
    { time: "2 min ago", action: "Graph Updated", detail: "Healthcare ontology synchronized", status: "success" },
    { time: "5 min ago", action: "Document Processed", detail: "Added 156 new entities", status: "success" },
    { time: "12 min ago", action: "Analysis Complete", detail: "Financial services mapping", status: "info" },
    { time: "18 min ago", action: "Warning", detail: "High memory usage detected", status: "warning" },
    { time: "24 min ago", action: "Optimization", detail: "Graph structure optimized", status: "success" }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
      purple: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
      green: "bg-green-50 text-green-600 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
      orange: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800"
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning": return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "info": return <Info className="h-4 w-4 text-blue-500" />
      default: return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Animated background pattern for light mode */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-subtle-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-subtle-float animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-soft-pulse" />
      </div>

      <div className="relative z-10 container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 animate-smooth-slide">
          <h1 className="text-4xl font-bold mb-2">
            <span className="light-gradient-text">Knowledge System Dashboard</span>
          </h1>
          <p className="text-muted-foreground">
            Create, Tune and Populate Vector-Encoded, Hyper-linked, Time-Aware, Human-Verified Knowledge Graphs
          </p>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {mainMetrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <Card
                key={metric.label}
                className={cn(
                  "relative overflow-hidden border-2 light-card-hover cursor-pointer",
                  animateCards && "animate-fade-scale",
                  getColorClasses(metric.color)
                )}
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => navigate('/graphs')}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn(
                      "p-3 rounded-xl",
                      metric.color === "blue" && "bg-blue-100 dark:bg-blue-900",
                      metric.color === "purple" && "bg-purple-100 dark:bg-purple-900",
                      metric.color === "green" && "bg-green-100 dark:bg-green-900",
                      metric.color === "orange" && "bg-orange-100 dark:bg-orange-900"
                    )}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 text-sm font-medium",
                      metric.trend === "up" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {metric.trend === "up" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      {Math.abs(metric.change)}%
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-3xl font-bold">
                      {metric.value.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium opacity-80">
                      {metric.label}
                    </div>
                    <div className="text-xs opacity-60">
                      {metric.description}
                    </div>
                  </div>

                  {/* Animated accent line */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20 animate-shimmer" />
                </div>
              </Card>
            )
          })}
        </div>

        {/* Recent Activity - Full Width */}
        <Card className="light-glass border-2 animate-fade-scale animation-delay-400">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recent Activity
              </h2>
              <Button variant="ghost" size="sm" className="group">
                View All
                <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl bg-card/50 border transition-all hover:bg-card/80 hover:shadow-md cursor-pointer",
                    animateCards && "animate-smooth-slide"
                  )}
                  style={{ animationDelay: `${600 + index * 100}ms` }}
                >
                  {getStatusIcon(activity.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{activity.action}</span>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{activity.detail}</p>
                  </div>
                  <Sparkles className="h-4 w-4 text-muted-foreground/40 animate-soft-pulse" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}