'use client'

import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TypeLimitIndicatorProps {
  entityCount: number
  edgeCount: number
  maxEntities?: number
  maxEdges?: number
  className?: string
}

export function TypeLimitIndicator({
  entityCount,
  edgeCount,
  maxEntities = 10,
  maxEdges = 10,
  className
}: TypeLimitIndicatorProps) {
  const entityPercentage = (entityCount / maxEntities) * 100
  const edgePercentage = (edgeCount / maxEdges) * 100

  const getColorClass = (percentage: number) => {
    if (percentage <= 60) return 'text-green-600'
    if (percentage <= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage <= 60) return 'bg-green-600'
    if (percentage <= 80) return 'bg-yellow-600'
    return 'bg-red-600'
  }

  const getStatusIcon = (percentage: number) => {
    if (percentage <= 60) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (percentage <= 80) return <AlertCircle className="h-4 w-4 text-yellow-600" />
    return <XCircle className="h-4 w-4 text-red-600" />
  }

  const getStatusBadgeVariant = (percentage: number): "default" | "secondary" | "destructive" => {
    if (percentage <= 60) return "default"
    if (percentage <= 80) return "secondary"
    return "destructive"
  }

  const getStatusText = (count: number, max: number) => {
    const remaining = max - count
    if (remaining > 3) return `${remaining} slots available`
    if (remaining > 0) return `Only ${remaining} slots left`
    return 'Limit reached'
  }

  return (
    <TooltipProvider>
      <div className={cn("space-y-4 p-4 border rounded-lg bg-card", className)}>
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(entityPercentage)}
                <span className="text-sm font-medium">Entity Types</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-semibold", getColorClass(entityPercentage))}>
                      {entityCount} / {maxEntities}
                    </span>
                    <Badge variant={getStatusBadgeVariant(entityPercentage)} className="text-xs">
                      {getStatusText(entityCount, maxEntities)}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-2">
                    <p className="font-semibold">Entity Type Usage</p>
                    <div className="text-sm space-y-1">
                      <p>Current: {entityCount} types</p>
                      <p>Maximum: {maxEntities} types</p>
                      <p>Available: {maxEntities - entityCount} types</p>
                      <p>Usage: {Math.round(entityPercentage)}%</p>
                    </div>
                    <div className="pt-2 border-t text-xs text-muted-foreground">
                      <p>Zep v3 limit: Maximum {maxEntities} entity types</p>
                      <p>Each item can only have one type</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <Progress 
              value={entityPercentage} 
              className={cn("h-2", getProgressColor(entityPercentage))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(edgePercentage)}
                <span className="text-sm font-medium">Edge Types</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-semibold", getColorClass(edgePercentage))}>
                      {edgeCount} / {maxEdges}
                    </span>
                    <Badge variant={getStatusBadgeVariant(edgePercentage)} className="text-xs">
                      {getStatusText(edgeCount, maxEdges)}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-2">
                    <p className="font-semibold">Edge Type Usage</p>
                    <div className="text-sm space-y-1">
                      <p>Current: {edgeCount} types</p>
                      <p>Maximum: {maxEdges} types</p>
                      <p>Available: {maxEdges - edgeCount} types</p>
                      <p>Usage: {Math.round(edgePercentage)}%</p>
                    </div>
                    <div className="pt-2 border-t text-xs text-muted-foreground">
                      <p>Zep v3 limit: Maximum {maxEdges} edge types</p>
                      <p>Define relationships between entities</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <Progress 
              value={edgePercentage} 
              className={cn("h-2", getProgressColor(edgePercentage))}
            />
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Usage</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {entityCount + edgeCount} / {maxEntities + maxEdges}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(((entityCount + edgeCount) / (maxEntities + maxEdges)) * 100)}%
                  </Badge>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-2">
              <p className="font-semibold">Overall Type Limits</p>
              <div className="text-sm space-y-1">
                <p>Total types used: {entityCount + edgeCount}</p>
                <p>Total limit: {maxEntities + maxEdges}</p>
                <p>Remaining: {(maxEntities + maxEdges) - (entityCount + edgeCount)}</p>
              </div>
              <div className="pt-2 border-t text-xs text-muted-foreground">
                <p>Target: {'>'} 95% classification rate</p>
                <p>Optimize types for better coverage</p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}