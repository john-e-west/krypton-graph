import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatsCardProps {
  title: string
  value: number
  icon?: string
  description?: string
}

export function StatsCard({ title, value, icon, description }: StatsCardProps) {
  return (
    <Card className="crystal-bg border-2 border-primary/40 hover:border-accent/60 transition-all duration-500 group relative overflow-hidden hover:scale-105 phantom-zone-effect">
      {/* Kryptonian crystal overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Heat vision scan effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100">
        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-secondary to-transparent animate-scan-line" />
        <div className="absolute inset-y-0 w-0.5 bg-gradient-to-b from-transparent via-secondary to-transparent animate-scan-line" />
      </div>
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-xs font-bold uppercase tracking-[0.3em] text-primary/80">
          {title}
        </CardTitle>
        {icon && (
          <span className="text-4xl solar-powered filter drop-shadow-lg">
            {icon}
          </span>
        )}
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-4xl font-bold kryptonian-text">
          {value.toLocaleString()}
        </div>
        {description && (
          <p className="text-xs text-accent/60 mt-1 font-mono tracking-wider uppercase">{description}</p>
        )}
      </CardContent>
      
      {/* Kryptonian energy bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary via-accent to-secondary animate-crystal-shine" />
      </div>
      
      {/* Corner accents like Kryptonian tech */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary/60" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary/60" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary/60" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary/60" />
    </Card>
  )
}