import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import NavigationMenu from "./NavigationMenu"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MobileNavProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MobileNav = ({ open, onOpenChange }: MobileNavProps) => {
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-40 lg:hidden"
        onClick={() => onOpenChange(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary" />
              <span>Krypton</span>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full">
            <div onClick={() => onOpenChange(false)}>
              <NavigationMenu />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default MobileNav