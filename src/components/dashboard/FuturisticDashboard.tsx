import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useQuery } from "@tanstack/react-query"
import { airtableService } from "@/lib/services/airtable-service"
import { Skeleton } from "@/components/ui/skeleton"
import { useNavigate } from "react-router-dom"
import { 
  Activity,
  Zap,
  TrendingUp,
  Users,
  Database,
  Network,
  Cpu,
  Globe,
  BarChart3,
  LineChart,
  PieChart,
  Layers,
  GitBranch,
  Cloud,
  Shield,
  Terminal,
  Code2,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ConnectionStatus } from "./ConnectionStatus"
import { useEffect, useState } from "react"

export function FuturisticDashboard() {
  const navigate = useNavigate()
  const [time, setTime] = useState(new Date())
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
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

  const mainStats = [
    {
      label: "Neural Networks",
      value: stats?.totalGraphs ?? 0,
      change: "+12.5%",
      icon: Network,
      color: "from-cyan-500 to-blue-500",
      glow: "cyan"
    },
    {
      label: "Data Streams",
      value: stats?.totalDocuments ?? 0,
      change: "+8.3%",
      icon: Database,
      color: "from-purple-500 to-pink-500",
      glow: "purple"
    },
    {
      label: "Ontologies",
      value: stats?.totalOntologies ?? 0,
      change: "+23.1%",
      icon: Layers,
      color: "from-green-500 to-emerald-500",
      glow: "green"
    },
    {
      label: "Active Nodes",
      value: stats?.activeNodes ?? 0,
      change: "+5.7%",
      icon: Cpu,
      color: "from-orange-500 to-red-500",
      glow: "orange"
    }
  ]

  const systemMetrics = [
    { label: "CPU Usage", value: stats?.systemLoad ?? 0, max: 100, color: "cyan" },
    { label: "Memory", value: 67, max: 100, color: "purple" },
    { label: "Network", value: stats?.networkLatency ?? 0, max: 100, color: "green" },
    { label: "Storage", value: 45, max: 100, color: "orange" }
  ]

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 via-black to-purple-950/20" />
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(cyan 1px, transparent 1px),
              linear-gradient(90deg, cyan 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'grid-move 10s linear infinite',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 70%)'
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-500 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${10 + Math.random() * 20}s`,
              boxShadow: '0 0 10px cyan'
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-6xl font-bold mb-2">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-gradient-shift">
                  NEXUS COMMAND
                </span>
              </h1>
              <p className="text-cyan-400/60 text-sm tracking-[0.3em] uppercase font-mono">
                Quantum Interface v3.0.1 • Neural Link Active
              </p>
            </div>
            <div className="text-right">
              <div className="text-cyan-400 font-mono text-2xl mb-1">
                {time.toLocaleTimeString('en-US', { hour12: false })}
              </div>
              <div className="text-cyan-400/60 text-sm font-mono">
                {time.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
              <ConnectionStatus />
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {mainStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className={cn(
                  "relative group cursor-pointer",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => navigate('/graphs')}
              >
                {/* Glow effect */}
                <div className={cn(
                  "absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl",
                  `bg-${stat.glow}-500/30`
                )} />
                
                {/* Card */}
                <div className="relative bg-black/50 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6 overflow-hidden group-hover:border-cyan-400/60 transition-all duration-500">
                  {/* Background gradient */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity",
                    stat.color
                  )} />
                  
                  {/* Circuit pattern */}
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <path
                        d="M10,10 L90,10 L90,50 L50,50 L50,90 M30,30 L70,30 M30,70 L70,70"
                        stroke="currentColor"
                        strokeWidth="0.5"
                        fill="none"
                        className="text-cyan-400"
                      />
                    </svg>
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <Icon className={cn(
                        "h-8 w-8 text-cyan-400",
                        "group-hover:scale-110 transition-transform duration-500"
                      )} />
                      <span className="text-green-400 text-sm font-mono">
                        {stat.change}
                      </span>
                    </div>
                    
                    <div className="text-4xl font-bold text-white mb-2 font-mono">
                      {stat.value.toLocaleString()}
                    </div>
                    
                    <div className="text-cyan-400/60 text-sm uppercase tracking-wider">
                      {stat.label}
                    </div>
                    
                    {/* Animated bar */}
                    <div className="mt-4 h-1 bg-cyan-950/50 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full bg-gradient-to-r rounded-full animate-pulse",
                          stat.color
                        )}
                        style={{ width: `${Math.min(100, (stat.value / 10) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* System Metrics and Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Performance */}
          <div className="lg:col-span-1">
            <div className="bg-black/50 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
              <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                SYSTEM METRICS
              </h2>
              
              <div className="space-y-4">
                {systemMetrics.map((metric) => (
                  <div key={metric.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-cyan-400/60">{metric.label}</span>
                      <span className="text-cyan-400 font-mono">{metric.value}%</span>
                    </div>
                    <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          `bg-${metric.color}-500`
                        )}
                        style={{
                          width: `${metric.value}%`,
                          boxShadow: `0 0 10px ${metric.color}`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Neural Activity Graph */}
              <div className="mt-6 h-32 relative">
                <svg className="w-full h-full">
                  <polyline
                    points="0,60 20,40 40,50 60,20 80,35 100,25 120,45 140,30 160,50 180,40 200,60"
                    stroke="url(#gradient)"
                    strokeWidth="2"
                    fill="none"
                    className="animate-pulse"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>

          {/* Activity Matrix */}
          <div className="lg:col-span-2">
            <div className="bg-black/50 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
              <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                NEURAL ACTIVITY STREAM
              </h2>
              
              <div className="space-y-2 font-mono text-sm">
                {[
                  { time: "09:42:17", action: "SYNC", status: "SUCCESS", detail: "Neural pathways synchronized" },
                  { time: "09:42:15", action: "SCAN", status: "ACTIVE", detail: "Quantum encryption verified" },
                  { time: "09:42:12", action: "DATA", status: "PROCESS", detail: "156 nodes analyzed" },
                  { time: "09:42:08", action: "LINK", status: "STABLE", detail: "Mesh network optimized" },
                  { time: "09:42:03", action: "INIT", status: "READY", detail: "System cores initialized" }
                ].map((log, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-4 p-3 bg-cyan-950/20 rounded border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
                  >
                    <span className="text-cyan-600">{log.time}</span>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs",
                      log.status === "SUCCESS" ? "bg-green-500/20 text-green-400" :
                      log.status === "ACTIVE" ? "bg-blue-500/20 text-blue-400" :
                      log.status === "PROCESS" ? "bg-purple-500/20 text-purple-400" :
                      "bg-cyan-500/20 text-cyan-400"
                    )}>
                      {log.action}
                    </span>
                    <span className="text-cyan-400/60 flex-1">{log.detail}</span>
                    <Sparkles className="h-4 w-4 text-cyan-500/40 animate-pulse" />
                  </div>
                ))}
              </div>
              
              {/* Command Interface */}
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Enter neural command..."
                  className="flex-1 bg-black/50 border border-cyan-500/30 rounded px-4 py-2 text-cyan-400 placeholder-cyan-400/30 focus:border-cyan-400 focus:outline-none"
                />
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold">
                  EXECUTE
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}