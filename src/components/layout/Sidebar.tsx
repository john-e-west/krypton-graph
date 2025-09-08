import NavigationMenu from './NavigationMenu'
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
}

const Sidebar = ({ className }: SidebarProps) => {
  return (
    <aside className={cn("w-64 border-r bg-background", className)}>
      <ScrollArea className="h-full">
        <NavigationMenu />
      </ScrollArea>
    </aside>
  )
}

export default Sidebar