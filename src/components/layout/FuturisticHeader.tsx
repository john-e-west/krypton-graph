import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { cn } from '@/lib/utils'
import { 
  Bell, 
  Search, 
  User, 
  Menu, 
  X,
  Globe,
  Wifi,
  Shield,
  Terminal,
  ChevronDown
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  className?: string
  onMenuToggle?: () => void
  isMenuOpen?: boolean
}

const FuturisticHeader = ({ className, onMenuToggle, isMenuOpen }: HeaderProps) => {
  const navigate = useNavigate()
  const [time, setTime] = useState(new Date())
  const [notifications, setNotifications] = useState(3)
  const [searchFocused, setSearchFocused] = useState(false)
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className={cn(
      "h-16 bg-black/90 backdrop-blur-xl border-b border-cyan-500/30 relative overflow-hidden",
      className
    )}>
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(90deg, transparent 0%, cyan 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'sweep 10s linear infinite'
          }}
        />
      </div>

      <div className="relative h-full px-6 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-6">
          {/* Menu toggle */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/10 transition-all"
          >
            {isMenuOpen ? <X className="h-5 w-5 text-cyan-400" /> : <Menu className="h-5 w-5 text-cyan-400" />}
          </button>

          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Terminal className="h-6 w-6 text-black" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                KRYPTON
              </h1>
              <p className="text-xs text-cyan-400/60 font-mono">NEURAL INTERFACE</p>
            </div>
          </div>

          {/* System Status */}
          <div className="hidden lg:flex items-center gap-4 ml-8">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-400" />
              <span className="text-xs text-cyan-400/60">ONLINE</span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span className="text-xs text-cyan-400/60">5G</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-cyan-400/60">SECURE</span>
            </div>
          </div>
        </div>

        {/* Center - Search */}
        <div className="hidden lg:block flex-1 max-w-xl mx-8">
          <div className={cn(
            "relative transition-all duration-300",
            searchFocused && "scale-105"
          )}>
            {searchFocused && (
              <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-lg" />
            )}
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-cyan-400/60" />
              <input
                type="text"
                placeholder="Search neural network..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className={cn(
                  "w-full pl-10 pr-4 py-2 bg-black/50 rounded-lg",
                  "border border-cyan-500/30 text-cyan-400 placeholder-cyan-400/30",
                  "focus:border-cyan-400 focus:outline-none transition-all"
                )}
              />
              <div className="absolute right-3 text-xs text-cyan-400/40 font-mono">
                ⌘K
              </div>
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* Time display */}
          <div className="hidden lg:block text-right">
            <div className="text-sm text-cyan-400 font-mono">
              {time.toLocaleTimeString('en-US', { hour12: false })}
            </div>
            <div className="text-xs text-cyan-400/60 font-mono">
              {time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <button className="relative p-2 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/10 transition-all group">
            <Bell className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            {notifications > 0 && (
              <>
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {notifications}
                </span>
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full animate-ping" />
              </>
            )}
          </button>

          {/* User menu */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/10 transition-all">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <User className="h-4 w-4 text-black" />
              </div>
              <span className="hidden lg:block text-sm text-cyan-400">Admin</span>
              <ChevronDown className="h-4 w-4 text-cyan-400/60" />
            </button>
            
            {/* Dropdown menu (hidden by default) */}
            <div className="absolute right-0 mt-2 w-48 py-2 bg-black/95 backdrop-blur-xl border border-cyan-500/30 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
              <button 
                onClick={() => navigate('/settings')}
                className="w-full px-4 py-2 text-left text-sm text-cyan-400/80 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all"
              >
                Settings
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-cyan-400/80 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all">
                Profile
              </button>
              <div className="my-1 border-t border-cyan-500/20" />
              <button className="w-full px-4 py-2 text-left text-sm text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px">
        <div 
          className="h-full w-32 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
          style={{
            animation: 'scan 4s linear infinite'
          }}
        />
      </div>

      <style jsx>{`
        @keyframes sweep {
          0% { background-position: -100% 0; }
          100% { background-position: 100% 0; }
        }
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(calc(100vw + 8rem)); }
        }
      `}</style>
    </header>
  )
}

export default FuturisticHeader