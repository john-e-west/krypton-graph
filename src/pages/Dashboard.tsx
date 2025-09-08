import { lazy, useEffect, useState } from 'react'

const FuturisticDashboard = lazy(() => import('../components/dashboard/FuturisticDashboard').then(module => ({ default: module.FuturisticDashboard })))
const CleanDashboard = lazy(() => import('../components/dashboard/CleanDashboard').then(module => ({ default: module.CleanDashboard })))

const Dashboard = () => {
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
  
  return isDark ? <FuturisticDashboard /> : <CleanDashboard />
}

export default Dashboard