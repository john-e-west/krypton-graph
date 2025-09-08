import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { cn } from '@/lib/utils'
import { 
  Bell, 
  Search, 
  User, 
  Menu, 
  X,
  ChevronDown,
  Settings as SettingsIcon,
  LogOut,
  HelpCircle,
  Command,
  Sparkles
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  className?: string
  onMenuToggle?: () => void
  isMenuOpen?: boolean
}

const CleanHeader = ({ className, onMenuToggle, isMenuOpen }: HeaderProps) => {
  const navigate = useNavigate()
  const [time, setTime] = useState(new Date())
  const [notifications, setNotifications] = useState(3)
  const [searchFocused, setSearchFocused] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className={cn(
      "h-16 bg-white border-b border-border shadow-sm",
      className
    )}>
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Menu toggle - only visible on mobile */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo - only visible on mobile */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg light-gradient-text">Krypton</span>
          </div>
        </div>

        {/* Center - Search Bar */}
        <div className="flex-1 max-w-2xl mx-4">
          <div className={cn(
            "relative group transition-all duration-300",
            searchFocused && "scale-[1.02]"
          )}>
            {/* Search glow effect */}
            {searchFocused && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl rounded-xl animate-soft-pulse" />
            )}
            
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              <input
                type="text"
                placeholder="Search anything..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className={cn(
                  "w-full pl-10 pr-20 py-2.5 bg-gray-50 rounded-xl",
                  "border-2 border-transparent text-gray-700 placeholder-gray-400",
                  "focus:bg-white focus:border-blue-500/30 focus:outline-none",
                  "transition-all duration-200 text-sm",
                  "hover:bg-gray-100"
                )}
              />
              <div className="absolute right-3 flex items-center gap-1 text-xs text-gray-400">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Time display */}
          <div className="hidden lg:flex flex-col items-end mr-2">
            <div className="text-sm font-medium text-gray-700">
              {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xs text-gray-500">
              {time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle className="border-gray-200 hover:bg-gray-50" />

          {/* Notifications */}
          <button className="relative p-2.5 rounded-xl hover:bg-gray-50 transition-all group">
            <Bell className="h-5 w-5 text-gray-600 group-hover:text-gray-800 transition-colors" />
            {notifications > 0 && (
              <>
                <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {notifications}
                </span>
                <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 bg-red-500 rounded-full animate-ping opacity-50" />
              </>
            )}
          </button>

          {/* User menu */}
          <div className="relative">
            <button 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="hidden lg:block text-sm font-medium text-gray-700">Admin</span>
              <ChevronDown className={cn(
                "h-4 w-4 text-gray-400 transition-transform duration-200",
                userMenuOpen && "rotate-180"
              )} />
            </button>
            
            {/* Dropdown menu */}
            {userMenuOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setUserMenuOpen(false)}
                />
                
                {/* Menu */}
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 animate-fade-scale origin-top-right">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">John Doe</p>
                    <p className="text-xs text-gray-500">admin@krypton.com</p>
                  </div>
                  
                  <div className="p-2">
                    <button 
                      onClick={() => {
                        setUserMenuOpen(false)
                        navigate('/settings')
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <SettingsIcon className="h-4 w-4" />
                      Settings
                    </button>
                    
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                      <HelpCircle className="h-4 w-4" />
                      Help & Support
                    </button>
                  </div>
                  
                  <div className="p-2 border-t border-gray-100">
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom accent line with animation */}
      <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden">
        <div 
          className="h-full w-1/3 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"
          style={{
            animation: 'scan 4s linear infinite',
            transform: 'translateX(-100%)'
          }}
        />
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </header>
  )
}

export default CleanHeader