import { NavLink } from 'react-router-dom'
import { Home, FileText, Network, GitBranch, Settings, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: FileText, label: 'Documents', path: '/documents' },
  { icon: Network, label: 'Ontologies', path: '/ontologies' },
  { icon: GitBranch, label: 'Graphs', path: '/graphs' },
  { icon: Settings, label: 'Settings', path: '/settings' },
]

const NavigationMenu = () => {
  return (
    <nav className="p-4">
      <ul className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default NavigationMenu