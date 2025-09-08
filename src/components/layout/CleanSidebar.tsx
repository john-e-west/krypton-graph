import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { 
  Home,
  Search,
  FileText,
  Network,
  GitBranch,
  Settings,
  Activity,
  Database,
  ChevronRight,
  Sparkles,
  Circle
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface SidebarProps {
  className?: string
}

const CleanSidebar = ({ className }: SidebarProps) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: Home, color: 'blue', description: 'Overview & Analytics' },
    { path: '/search', label: 'Search', icon: Search, color: 'purple', description: 'Find Resources' },
    { path: '/documents', label: 'Documents', icon: FileText, color: 'green', description: 'Manage Files' },
    { path: '/ontologies', label: 'Ontologies', icon: Network, color: 'orange', description: 'Knowledge Models' },
    { path: '/graphs', label: 'Graphs', icon: GitBranch, color: 'pink', description: 'Visualizations' },
    { path: '/settings', label: 'Settings', icon: Settings, color: 'gray', description: 'Configuration' }
  ]

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      blue: isActive ? 'bg-blue-50 text-blue-600 border-blue-200' : 'hover:bg-blue-50/50',
      purple: isActive ? 'bg-purple-50 text-purple-600 border-purple-200' : 'hover:bg-purple-50/50',
      green: isActive ? 'bg-green-50 text-green-600 border-green-200' : 'hover:bg-green-50/50',
      orange: isActive ? 'bg-orange-50 text-orange-600 border-orange-200' : 'hover:bg-orange-50/50',
      pink: isActive ? 'bg-pink-50 text-pink-600 border-pink-200' : 'hover:bg-pink-50/50',
      gray: isActive ? 'bg-gray-50 text-gray-600 border-gray-200' : 'hover:bg-gray-50/50'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const getIconColor = (color: string) => {
    const colors = {
      blue: 'text-blue-500',
      purple: 'text-purple-500',
      green: 'text-green-500',
      orange: 'text-orange-500',
      pink: 'text-pink-500',
      gray: 'text-gray-500'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <aside className={cn(
      "w-64 bg-white border-r border-border transition-all duration-300",
      className
    )}>
      {/* Logo Section */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg animate-subtle-float">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-soft-pulse border-2 border-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              <span className="light-gradient-text">Krypton</span>
            </h1>
            <p className="text-xs text-muted-foreground">Knowledge Graph</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <div className="space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={({ isActive }) => {
                  if (isActive) setActiveIndex(index)
                  return cn(
                    "group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    "border-2 border-transparent",
                    isActive && "shadow-sm border-opacity-50 animate-fade-scale",
                    getColorClasses(item.color, isActive),
                    !isActive && "hover:translate-x-1"
                  )
                }}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {({ isActive }) => (
                  <>
                    <div className={cn(
                      "p-2 rounded-lg transition-all duration-200",
                      isActive ? `bg-${item.color}-100` : "bg-gray-50",
                      hoveredIndex === index && "scale-110"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5 transition-colors",
                        isActive ? getIconColor(item.color) : "text-gray-400"
                      )} />
                    </div>
                    
                    <div className="flex-1">
                      <div className={cn(
                        "font-medium text-sm transition-colors",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {item.label}
                      </div>
                      {hoveredIndex === index && (
                        <div className="text-xs text-muted-foreground mt-0.5 animate-smooth-slide">
                          {item.description}
                        </div>
                      )}
                    </div>

                    {isActive && (
                      <ChevronRight className={cn(
                        "h-4 w-4 animate-smooth-slide",
                        getIconColor(item.color)
                      )} />
                    )}

                    {/* Active indicator dot */}
                    {isActive && (
                      <div className={cn(
                        "absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-full animate-smooth-slide",
                        item.color === 'blue' && "bg-blue-500",
                        item.color === 'purple' && "bg-purple-500",
                        item.color === 'green' && "bg-green-500",
                        item.color === 'orange' && "bg-orange-500",
                        item.color === 'pink' && "bg-pink-500",
                        item.color === 'gray' && "bg-gray-500"
                      )} />
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

    </aside>
  )
}

export default CleanSidebar