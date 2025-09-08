import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) return savedTheme
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })

  useEffect(() => {
    // Apply theme on mount and when it changes
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "relative w-10 h-10 rounded-lg",
        "border-2 transition-all duration-500",
        theme === 'dark' 
          ? "border-cyan-500/50 hover:border-cyan-400 bg-black/50 hover:bg-cyan-500/10" 
          : "border-slate-400/50 hover:border-blue-500 bg-slate-100/50 hover:bg-blue-100/50",
        "group",
        className
      )}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Sun icon for light mode */}
        <Sun className={cn(
          "absolute h-5 w-5 transition-all duration-500",
          theme === 'dark' 
            ? "rotate-90 scale-0 text-cyan-400" 
            : "rotate-0 scale-100 text-amber-500"
        )} />
        
        {/* Moon icon for dark mode */}
        <Moon className={cn(
          "absolute h-5 w-5 transition-all duration-500",
          theme === 'dark' 
            ? "rotate-0 scale-100 text-cyan-400" 
            : "-rotate-90 scale-0 text-slate-600"
        )} />
      </div>
      
      {/* Glow effect */}
      <div className={cn(
        "absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10",
        theme === 'dark' 
          ? "bg-cyan-500/30" 
          : "bg-amber-500/30"
      )} />
      
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}