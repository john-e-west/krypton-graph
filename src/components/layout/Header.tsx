import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ActiveGraphSelector } from "@/components/graphs/selectors/ActiveGraphSelector"

const Header = () => {
  return (
    <header className="flex h-16 items-center justify-between border-b px-4 pl-20 lg:pl-6 lg:px-6">
      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary" />
          <span className="text-xl font-semibold">Krypton</span>
        </div>
        <ActiveGraphSelector />
      </div>
      
      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}

export default Header