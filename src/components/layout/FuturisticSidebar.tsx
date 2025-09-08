import { NavLink, useLocation } from 'react-router-dom'
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from '@/lib/utils'
import {
  Home,
  Search,
  FileText,
  Network,
  GitBranch,
  Settings,
  Terminal,
  Cpu,
  Database,
  Layers,
  Zap,
  Activity
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface SidebarProps {
  className?: string
}

const menuItems = [
  { path: '/', label: 'DASHBOARD', icon: Home, color: 'cyan' },
  { path: '/search', label: 'SEARCH', icon: Search, color: 'blue' },
  { path: '/documents', label: 'DOCUMENTS', icon: FileText, color: 'purple' },
  { path: '/ontologies', label: 'ONTOLOGIES', icon: Network, color: 'pink' },
  { path: '/graphs', label: 'GRAPHS', icon: GitBranch, color: 'green' },
  { path: '/settings', label: 'SETTINGS', icon: Settings, color: 'orange' },
]

const FuturisticSidebar = ({ className }: SidebarProps) => {
  const location = useLocation()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [pulseAnimation, setPulseAnimation] = useState(false)

  useEffect(() => {
    setPulseAnimation(true)
    const timer = setTimeout(() => setPulseAnimation(false), 1000)
    return () => clearTimeout(timer)
  }, [location.pathname])

  return (
    <aside className={cn(
      "w-64 bg-black/90 backdrop-blur-xl border-r border-cyan-500/30 relative overflow-hidden",
      className
    )}>
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(45deg, transparent 30%, cyan 50%, transparent 70%),
              linear-gradient(-45deg, transparent 30%, purple 50%, transparent 70%)
            `,
            backgroundSize: '20px 20px',
            animation: 'slide 20s linear infinite'
          }}
        />
      </div>

      {/* Header Logo */}
      <div className="relative p-6 border-b border-cyan-500/30">
        <div className="relative">
          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            NEXUS
          </div>
          <div className="text-xs text-cyan-400/60 font-mono tracking-wider mt-1">
            SYSTEM v3.0.1
          </div>
          
          {/* Status indicator */}
          <div className="absolute -top-1 -right-1">
            <div className="relative">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping" />
            </div>
          </div>
        </div>

        {/* Energy bar */}
        <div className="mt-4 h-1 bg-black/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 animate-gradient-shift"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-120px)]">
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            const isHovered = hoveredItem === item.path
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  "relative block group transition-all duration-300",
                  isActive && pulseAnimation && "animate-pulse"
                )}
              >
                {/* Glow effect for active/hover */}
                {(isActive || isHovered) && (
                  <div 
                    className={cn(
                      "absolute inset-0 rounded-lg opacity-20 blur-xl transition-opacity duration-300",
                      isActive ? "opacity-30" : "opacity-20"
                    )}
                    style={{
                      background: `radial-gradient(circle, ${item.color} 0%, transparent 70%)`
                    }}
                  />
                )}

                <div className={cn(
                  "relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300",
                  "border border-transparent",
                  isActive ? 
                    `bg-${item.color}-500/10 border-${item.color}-500/50` : 
                    "hover:bg-white/5 hover:border-cyan-500/30",
                  isHovered && !isActive && "transform translate-x-1"
                )}>
                  {/* Icon container */}
                  <div className="relative">
                    <Icon className={cn(
                      "h-5 w-5 transition-all duration-300",
                      isActive ? `text-${item.color}-400` : "text-cyan-400/60",
                      isHovered && !isActive && "text-cyan-400 scale-110"
                    )} />
                    
                    {/* Icon glow */}
                    {isActive && (
                      <div className="absolute inset-0 blur-sm">
                        <Icon className={`h-5 w-5 text-${item.color}-400`} />
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <span className={cn(
                    "text-sm font-medium tracking-wider transition-all duration-300",
                    isActive ? "text-white" : "text-cyan-400/60",
                    isHovered && !isActive && "text-cyan-400"
                  )}>
                    {item.label}
                  </span>

                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-transparent via-cyan-400 to-transparent rounded-full" />
                  )}

                  {/* Hover effect line */}
                  {isHovered && !isActive && (
                    <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                  )}
                </div>

                {/* Data flow animation for active item */}
                {isActive && (
                  <div className="absolute left-0 right-0 top-0 h-px overflow-hidden">
                    <div 
                      className="h-full w-8 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                      style={{
                        animation: 'scan 2s linear infinite'
                      }}
                    />
                  </div>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* System Stats */}
        <div className="p-4 mt-4 border-t border-cyan-500/30">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-400/60 flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                CPU
              </span>
              <span className="text-cyan-400 font-mono">42%</span>
            </div>
            <div className="h-1 bg-black/50 rounded-full overflow-hidden">
              <div className="h-full w-[42%] bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" />
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-400/60 flex items-center gap-1">
                <Database className="h-3 w-3" />
                MEM
              </span>
              <span className="text-cyan-400 font-mono">67%</span>
            </div>
            <div className="h-1 bg-black/50 rounded-full overflow-hidden">
              <div className="h-full w-[67%] bg-gradient-to-r from-purple-400 to-pink-500 rounded-full" />
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-400/60 flex items-center gap-1">
                <Activity className="h-3 w-3" />
                NET
              </span>
              <span className="text-cyan-400 font-mono">23ms</span>
            </div>
            <div className="h-1 bg-black/50 rounded-full overflow-hidden">
              <div className="h-full w-[23%] bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

      <style jsx>{`
        @keyframes slide {
          0% { transform: translateX(0) translateY(0); }
          100% { transform: translateX(20px) translateY(20px); }
        }
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(calc(100% + 16rem)); }
        }
      `}</style>
    </aside>
  )
}

export default FuturisticSidebar