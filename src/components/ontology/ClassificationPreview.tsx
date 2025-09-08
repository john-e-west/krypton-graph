'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface ClassificationResult {
  entityType: string
  confidence: number
  count: number
  samples: Array<{
    text: string
    confidence: number
  }>
}

interface ClassificationMetrics {
  totalItems: number
  classifiedCount: number
  unclassifiedCount: number
  classificationRate: number
  averageConfidence: number
  byType: ClassificationResult[]
}

interface ClassificationPreviewProps {
  currentMetrics?: ClassificationMetrics
  previewMetrics: ClassificationMetrics
  isLoading?: boolean
  className?: string
}

export function ClassificationPreview({
  currentMetrics,
  previewMetrics,
  isLoading = false,
  className
}: ClassificationPreviewProps) {
  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
    '#82CA9D', '#FFC658', '#8DD1E1', '#D084D0', '#FFB6C1'
  ]

  const getChartData = (metrics: ClassificationMetrics) => {
    const data = metrics.byType.map(type => ({
      name: type.entityType,
      value: type.count,
      percentage: ((type.count / metrics.totalItems) * 100).toFixed(1)
    }))
    
    if (metrics.unclassifiedCount > 0) {
      data.push({
        name: 'Unclassified',
        value: metrics.unclassifiedCount,
        percentage: ((metrics.unclassifiedCount / metrics.totalItems) * 100).toFixed(1)
      })
    }
    
    return data
  }

  const getTrendIcon = (current: number, preview: number) => {
    if (preview > current) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (preview < current) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getTrendColor = (current: number, preview: number) => {
    if (preview > current) return 'text-green-600'
    if (preview < current) return 'text-red-600'
    return 'text-gray-600'
  }

  const formatChange = (current: number, preview: number) => {
    const change = preview - current
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  const previewChartData = getChartData(previewMetrics)
  const currentChartData = currentMetrics ? getChartData(currentMetrics) : null

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Classification Preview
          <Badge variant="outline" className="text-lg px-3 py-1">
            {previewMetrics.classificationRate.toFixed(1)}% Success Rate
          </Badge>
        </CardTitle>
        <CardDescription>
          Preview how your types will classify the document
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {currentMetrics && (
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Current</p>
              <p className="text-2xl font-bold">{currentMetrics.classificationRate.toFixed(1)}%</p>
            </div>
            
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">After Changes</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{previewMetrics.classificationRate.toFixed(1)}%</p>
                {getTrendIcon(currentMetrics.classificationRate, previewMetrics.classificationRate)}
              </div>
            </div>
            
            <div className={cn("text-sm font-medium", getTrendColor(currentMetrics.classificationRate, previewMetrics.classificationRate))}>
              {formatChange(currentMetrics.classificationRate, previewMetrics.classificationRate)}
            </div>
          </div>
        )}

        <Tabs defaultValue="distribution" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="samples">Samples</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>
          
          <TabsContent value="distribution" className="space-y-4">
            <div className="h-64 flex items-center justify-center">
              <div className="w-full max-w-sm space-y-2">
                {previewChartData.map((entry, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        {entry.name}
                      </span>
                      <span className="font-medium">{entry.percentage}%</span>
                    </div>
                    <Progress 
                      value={parseFloat(entry.percentage)} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Items</span>
                  <span className="font-medium">{previewMetrics.totalItems}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Classified</span>
                  <span className="font-medium text-green-600">{previewMetrics.classifiedCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Unclassified</span>
                  <span className="font-medium text-red-600">{previewMetrics.unclassifiedCount}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Success Rate</span>
                  <span className="font-medium">{previewMetrics.classificationRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Confidence</span>
                  <span className="font-medium">{previewMetrics.averageConfidence.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Type Count</span>
                  <span className="font-medium">{previewMetrics.byType.length}</span>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="samples" className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {previewMetrics.byType.map((type, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{type.entityType}</h4>
                      <Badge variant="outline">{type.count} items</Badge>
                    </div>
                    <div className="space-y-1">
                      {type.samples.slice(0, 3).map((sample, sIdx) => (
                        <div key={sIdx} className="p-2 bg-muted rounded text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground truncate flex-1 mr-2">
                              "{sample.text}"
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {(sample.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="comparison" className="space-y-4">
            {currentMetrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Current Types</h4>
                    <div className="space-y-2">
                      {currentChartData?.map((type, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="truncate">{type.name}</span>
                          <Badge variant="outline">{type.value}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Preview Types</h4>
                    <div className="space-y-2">
                      {previewChartData.map((type, idx) => {
                        const currentType = currentChartData?.find(t => t.name === type.name)
                        const change = currentType ? type.value - currentType.value : type.value
                        
                        return (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="truncate">{type.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{type.value}</Badge>
                              {change !== 0 && (
                                <span className={cn(
                                  "text-xs",
                                  change > 0 ? "text-green-600" : "text-red-600"
                                )}>
                                  {change > 0 ? '+' : ''}{change}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Impact Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Items reclassified</span>
                      <span className="font-medium">
                        {Math.abs(previewMetrics.classifiedCount - currentMetrics.classifiedCount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Classification improvement</span>
                      <span className={cn(
                        "font-medium",
                        getTrendColor(currentMetrics.classificationRate, previewMetrics.classificationRate)
                      )}>
                        {formatChange(currentMetrics.classificationRate, previewMetrics.classificationRate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidence change</span>
                      <span className={cn(
                        "font-medium",
                        getTrendColor(currentMetrics.averageConfidence, previewMetrics.averageConfidence)
                      )}>
                        {formatChange(currentMetrics.averageConfidence, previewMetrics.averageConfidence)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No current classification to compare
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}