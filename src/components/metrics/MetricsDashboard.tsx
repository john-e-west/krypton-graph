'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Activity, Users, Target, AlertCircle, Download, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClassificationMetrics {
  graphId: string
  totalEntities: number
  totalEdges: number
  averageAccuracy: number
  classificationRate: number
  topEntityTypes: Array<{
    name: string
    count: number
    accuracy: number
  }>
  topEdgeTypes: Array<{
    name: string
    count: number
    accuracy: number
  }>
  timeSeriesData: Array<{
    date: string
    entities: number
    edges: number
    accuracy: number
  }>
  dailyTrends: Array<{
    date: string
    entities: number
    edges: number
    accuracy: number
    successRate: number
  }>
  weeklyTrends: Array<{
    weekStart: string
    entities: number
    edges: number
    accuracy: number
    successRate: number
  }>
  monthlyTrends: Array<{
    monthStart: string
    entities: number
    edges: number
    accuracy: number
    successRate: number
  }>
  performanceMetrics: {
    avgProcessingTime: number
    successRate: number
    errorRate: number
    throughputPerHour: number
  }
  lastUpdated: string
}

interface MetricsDashboardProps {
  graphId: string
  className?: string
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1']

export function MetricsDashboard({ graphId, className }: MetricsDashboardProps) {
  const [metrics, setMetrics] = useState<ClassificationMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [refreshing, setRefreshing] = useState(false)

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/metrics/classification/${graphId}?timeRange=${timeRange}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`)
      }
      
      const data = await response.json()
      setMetrics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchMetrics()
    setRefreshing(false)
  }

  const exportMetrics = () => {
    if (!metrics) return
    
    const dataStr = JSON.stringify(metrics, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `metrics-${graphId}-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  useEffect(() => {
    fetchMetrics()
  }, [graphId, timeRange])

  if (loading) {
    return (
      <div className={cn("p-6", className)}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading classification metrics...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("p-6", className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <Button onClick={fetchMetrics} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className={cn("p-6", className)}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No classification data available for this graph.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const getTrendData = () => {
    switch (timeRange) {
      case 'weekly':
        return metrics.weeklyTrends
      case 'monthly':
        return metrics.monthlyTrends
      default:
        return metrics.dailyTrends
    }
  }

  const formatXAxisLabel = (value: string) => {
    const date = new Date(value)
    switch (timeRange) {
      case 'weekly':
        return `Week ${date.getMonth() + 1}/${date.getDate()}`
      case 'monthly':
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      default:
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getAccuracyTrend = () => {
    const data = getTrendData()
    if (data.length < 2) return 'neutral'
    
    const latest = data[data.length - 1].accuracy
    const previous = data[data.length - 2].accuracy
    
    if (latest > previous) return 'up'
    if (latest < previous) return 'down'
    return 'neutral'
  }

  const getSuccessRateTrend = () => {
    const data = getTrendData()
    if (data.length < 2) return 'neutral'
    
    const latest = data[data.length - 1].successRate
    const previous = data[data.length - 2].successRate
    
    if (latest > previous) return 'up'
    if (latest < previous) return 'down'
    return 'neutral'
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Classification Metrics</h2>
          <p className="text-muted-foreground">
            Graph: {graphId} • Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportMetrics}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total Entities</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{metrics.totalEntities.toLocaleString()}</div>
              <div className="flex items-center mt-1">
                <Badge variant="secondary" className="text-xs">
                  {metrics.averageAccuracy.toFixed(1)}% accuracy
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Total Edges</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{metrics.totalEdges.toLocaleString()}</div>
              <div className="flex items-center mt-1">
                <Badge variant="secondary" className="text-xs">
                  {metrics.classificationRate.toFixed(1)} per hour
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              {getAccuracyTrend() === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : getAccuracyTrend() === 'down' ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Activity className="h-4 w-4 text-gray-500" />
              )}
              <span className="text-sm font-medium">Avg Accuracy</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{metrics.averageAccuracy.toFixed(1)}%</div>
              <Progress value={metrics.averageAccuracy} className="mt-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              {getSuccessRateTrend() === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : getSuccessRateTrend() === 'down' ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Activity className="h-4 w-4 text-gray-500" />
              )}
              <span className="text-sm font-medium">Success Rate</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{metrics.performanceMetrics.successRate.toFixed(1)}%</div>
              <Progress value={metrics.performanceMetrics.successRate} className="mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="types">Type Breakdown</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Classification Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getTrendData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={timeRange === 'weekly' ? 'weekStart' : timeRange === 'monthly' ? 'monthStart' : 'date'} tickFormatter={formatXAxisLabel} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(value) => formatXAxisLabel(value)}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toLocaleString() : value,
                      name
                    ]}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="entities" stroke="#8884d8" name="Entities" />
                  <Line yAxisId="left" type="monotone" dataKey="edges" stroke="#82ca9d" name="Edges" />
                  <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#ffc658" name="Accuracy %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Entity Types</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.topEntityTypes.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Edge Types</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.topEdgeTypes.slice(0, 5)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {metrics.topEdgeTypes.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Type Accuracy Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Entity Type Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.topEntityTypes.slice(0, 8).map((type) => (
                    <div key={type.name} className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium">{type.name}</span>
                        <span className="text-sm text-muted-foreground">{type.count.toLocaleString()} entities</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={type.accuracy} className="w-20" />
                        <span className="text-sm font-medium w-12">{type.accuracy.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Edge Type Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.topEdgeTypes.slice(0, 8).map((type) => (
                    <div key={type.name} className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium">{type.name}</span>
                        <span className="text-sm text-muted-foreground">{type.count.toLocaleString()} edges</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={type.accuracy} className="w-20" />
                        <span className="text-sm font-medium w-12">{type.accuracy.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Avg Processing Time</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold">{metrics.performanceMetrics.avgProcessingTime.toFixed(2)}s</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Success Rate</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold">{metrics.performanceMetrics.successRate.toFixed(1)}%</div>
                  <Progress value={metrics.performanceMetrics.successRate} className="mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Error Rate</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold">{metrics.performanceMetrics.errorRate.toFixed(1)}%</div>
                  <Progress value={metrics.performanceMetrics.errorRate} className="mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Throughput</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold">{metrics.performanceMetrics.throughputPerHour.toFixed(0)}/hr</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}