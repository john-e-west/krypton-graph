import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle,
  Activity,
  FileText,
  Gauge
} from 'lucide-react'
import { ProcessingMetricsSummary } from '@/types/processing'
import { cn } from '@/lib/utils'

interface ProcessingMetricsProps {
  metrics: ProcessingMetricsSummary
  previousMetrics?: ProcessingMetricsSummary
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<any>
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue,
  className 
}: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && trendValue && (
          <div className="flex items-center mt-2">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            ) : null}
            <span className={cn(
              "text-xs",
              trend === 'up' ? 'text-green-500' : 
              trend === 'down' ? 'text-red-500' : 
              'text-muted-foreground'
            )}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ProcessingMetrics({ metrics, previousMetrics }: ProcessingMetricsProps) {
  const formatTime = (minutes: number) => {
    if (minutes < 1) return '<1 min'
    if (minutes < 60) return `${Math.round(minutes)} min`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  const formatThroughput = (docsPerHour: number) => {
    if (docsPerHour < 1) {
      const docsPerDay = Math.round(docsPerHour * 24)
      return `${docsPerDay}/day`
    }
    return `${Math.round(docsPerHour)}/hr`
  }

  const calculateTrend = (current: number, previous?: number): 'up' | 'down' | 'neutral' => {
    if (!previous) return 'neutral'
    if (current > previous) return 'up'
    if (current < previous) return 'down'
    return 'neutral'
  }

  const calculateTrendPercentage = (current: number, previous?: number): string => {
    if (!previous || previous === 0) return ''
    const change = ((current - previous) / previous) * 100
    const sign = change > 0 ? '+' : ''
    return `${sign}${Math.round(change)}%`
  }

  const successRateTrend = calculateTrend(metrics.successRate, previousMetrics?.successRate)
  const throughputTrend = calculateTrend(metrics.throughput, previousMetrics?.throughput)
  const avgTimeTrend = calculateTrend(
    previousMetrics?.averageProcessingTime || 0,
    metrics.averageProcessingTime
  ) // Inverted because lower is better

  return (
    <div className="space-y-4">
      {/* Primary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Processing"
          value={metrics.activeProcessing}
          subtitle={`${metrics.queuedCount} queued`}
          icon={Activity}
          className="border-blue-200 bg-blue-50/50"
        />

        <MetricCard
          title="Success Rate"
          value={`${Math.round(metrics.successRate)}%`}
          subtitle={`${metrics.successCount} completed`}
          icon={CheckCircle}
          trend={successRateTrend}
          trendValue={calculateTrendPercentage(metrics.successRate, previousMetrics?.successRate)}
          className="border-green-200 bg-green-50/50"
        />

        <MetricCard
          title="Failed Documents"
          value={metrics.failureCount}
          subtitle={`${Math.round((metrics.failureCount / metrics.totalDocuments) * 100)}% of total`}
          icon={XCircle}
          className={metrics.failureCount > 0 ? "border-red-200 bg-red-50/50" : ""}
        />

        <MetricCard
          title="Throughput"
          value={formatThroughput(metrics.throughput)}
          subtitle={`Peak: ${formatThroughput(metrics.peakThroughput)}`}
          icon={Gauge}
          trend={throughputTrend}
          trendValue={calculateTrendPercentage(metrics.throughput, previousMetrics?.throughput)}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Documents"
          value={metrics.totalDocuments}
          icon={FileText}
        />

        <MetricCard
          title="Avg Processing Time"
          value={formatTime(metrics.averageProcessingTime / 60)}
          icon={Clock}
          trend={avgTimeTrend}
          trendValue={calculateTrendPercentage(
            previousMetrics?.averageProcessingTime || 0,
            metrics.averageProcessingTime
          )}
        />

        <MetricCard
          title="Est. Time Remaining"
          value={formatTime(metrics.estimatedTimeRemaining)}
          subtitle={`for ${metrics.queuedCount} documents`}
          icon={Clock}
        />
      </div>

      {/* Throughput Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Processing Throughput</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            {/* TODO: Add actual chart component here */}
            <p className="text-sm">Throughput chart will be displayed here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}