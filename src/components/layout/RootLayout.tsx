import { Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import FuturisticHeader from './FuturisticHeader'
import FuturisticSidebar from './FuturisticSidebar'
import CleanHeader from './CleanHeader'
import CleanSidebar from './CleanSidebar'
import ContentArea from './ContentArea'
import MobileNav from './MobileNav'

const RootLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    
    checkTheme()
    
    // Listen for theme changes
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  const Sidebar = isDark ? FuturisticSidebar : CleanSidebar
  const Header = isDark ? FuturisticHeader : CleanHeader

  return (
    <div className={`flex h-screen ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:block" />
      
      {/* Mobile Navigation Sheet */}
      <MobileNav 
        open={isMobileMenuOpen} 
        onOpenChange={setIsMobileMenuOpen}
      />
      
      <div className="flex flex-1 flex-col">
        <Header 
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMenuOpen={isMobileMenuOpen}
        />
        <ContentArea>
          <Outlet />
        </ContentArea>
      </div>
    </div>
  )
}

export default RootLayout