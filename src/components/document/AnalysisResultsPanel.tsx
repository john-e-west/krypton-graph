'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Brain,
  Sparkles,
  CheckCircle2,
  XCircle,
  Info,
  TrendingUp,
  Hash,
  Link2,
  FileText,
  Clock,
  Database
} from 'lucide-react'

interface TypeSuggestion {
  id: string
  name: string
  description: string
  examples: string[]
  confidence: number
  category: 'entity' | 'edge'
  selected?: boolean
}

interface AnalysisResultsPanelProps {
  documentId: string
  entityTypes: TypeSuggestion[]
  edgeTypes: TypeSuggestion[]
  classificationRate: number
  processingTime: number
  cached?: boolean
  metadata?: {
    documentLength: number
    complexity: 'low' | 'medium' | 'high'
    domain: string
    language: string
  }
  onApplyTypes?: (selectedEntityTypes: TypeSuggestion[], selectedEdgeTypes: TypeSuggestion[]) => void
  onRefresh?: () => void
}

export function AnalysisResultsPanel({
  documentId,
  entityTypes: initialEntityTypes,
  edgeTypes: initialEdgeTypes,
  classificationRate,
  processingTime,
  cached = false,
  metadata,
  onApplyTypes,
  onRefresh
}: AnalysisResultsPanelProps) {
  const [entityTypes, setEntityTypes] = useState<TypeSuggestion[]>(
    initialEntityTypes.map(type => ({ ...type, selected: type.confidence >= 0.7 }))
  )
  const [edgeTypes, setEdgeTypes] = useState<TypeSuggestion[]>(
    initialEdgeTypes.map(type => ({ ...type, selected: type.confidence >= 0.7 }))
  )
  const [isApplying, setIsApplying] = useState(false)

  const selectedEntityCount = entityTypes.filter(t => t.selected).length
  const selectedEdgeCount = edgeTypes.filter(t => t.selected).length

  const toggleEntityType = (id: string) => {
    setEntityTypes(prev => prev.map(type =>
      type.id === id ? { ...type, selected: !type.selected } : type
    ))
  }

  const toggleEdgeType = (id: string) => {
    setEdgeTypes(prev => prev.map(type =>
      type.id === id ? { ...type, selected: !type.selected } : type
    ))
  }

  const handleApplyTypes = async () => {
    if (!onApplyTypes) return
    
    setIsApplying(true)
    const selectedEntities = entityTypes.filter(t => t.selected)
    const selectedEdges = edgeTypes.filter(t => t.selected)
    
    try {
      await onApplyTypes(selectedEntities, selectedEdges)
    } finally {
      setIsApplying(false)
    }
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge className="bg-green-500">High</Badge>
    } else if (confidence >= 0.6) {
      return <Badge className="bg-yellow-500">Medium</Badge>
    } else {
      return <Badge className="bg-red-500">Low</Badge>
    }
  }

  const getClassificationColor = (rate: number) => {
    if (rate >= 75) return 'text-green-600'
    if (rate >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <CardTitle>AI Analysis Results</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {cached && (
                <Badge variant="secondary" className="text-xs">
                  <Database className="mr-1 h-3 w-3" />
                  Cached
                </Badge>
              )}
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh}>
                  Refresh Analysis
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            Review and select the AI-generated type suggestions for your knowledge graph
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Classification Rate</p>
                <p className={`text-2xl font-bold ${getClassificationColor(classificationRate)}`}>
                  {Math.round(classificationRate)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress value={classificationRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Selected Types</p>
                <p className="text-2xl font-bold">
                  {selectedEntityCount + selectedEdgeCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedEntityCount} entities, {selectedEdgeCount} edges
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Processing Time</p>
                <p className="text-2xl font-bold">{processingTime.toFixed(1)}s</p>
                {metadata && (
                  <p className="text-xs text-muted-foreground">
                    {metadata.complexity} complexity
                  </p>
                )}
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="entities" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entities" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Entity Types ({entityTypes.length})
          </TabsTrigger>
          <TabsTrigger value="edges" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Edge Types ({edgeTypes.length})
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entities">
          <Card>
            <CardHeader>
              <CardTitle>Entity Type Suggestions</CardTitle>
              <CardDescription>
                Select the entity types to include in your ontology (max 10)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {entityTypes.map(type => (
                    <div
                      key={type.id}
                      className={`border rounded-lg p-4 space-y-2 ${
                        type.selected ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={type.selected}
                            onCheckedChange={() => toggleEntityType(type.id)}
                            disabled={!type.selected && selectedEntityCount >= 10}
                          />
                          <div className="space-y-1">
                            <h4 className="font-medium">{type.name}</h4>
                            <p className="text-sm text-muted-foreground">{type.description}</p>
                          </div>
                        </div>
                        {getConfidenceBadge(type.confidence)}
                      </div>
                      {type.examples.length > 0 && (
                        <div className="ml-9">
                          <p className="text-xs text-muted-foreground mb-1">Examples:</p>
                          <div className="flex flex-wrap gap-1">
                            {type.examples.map((example, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {example}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edges">
          <Card>
            <CardHeader>
              <CardTitle>Edge Type Suggestions</CardTitle>
              <CardDescription>
                Select the relationship types to include in your ontology (max 10)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {edgeTypes.map(type => (
                    <div
                      key={type.id}
                      className={`border rounded-lg p-4 space-y-2 ${
                        type.selected ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={type.selected}
                            onCheckedChange={() => toggleEdgeType(type.id)}
                            disabled={!type.selected && selectedEdgeCount >= 10}
                          />
                          <div className="space-y-1">
                            <h4 className="font-medium">{type.name}</h4>
                            <p className="text-sm text-muted-foreground">{type.description}</p>
                          </div>
                        </div>
                        {getConfidenceBadge(type.confidence)}
                      </div>
                      {type.examples.length > 0 && (
                        <div className="ml-9">
                          <p className="text-xs text-muted-foreground mb-1">Examples:</p>
                          <div className="flex flex-wrap gap-1">
                            {type.examples.map((example, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {example}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Ontology Preview</CardTitle>
              <CardDescription>
                Preview of your selected types and expected performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Selected Entity Types</h4>
                  <div className="space-y-1">
                    {entityTypes.filter(t => t.selected).map(type => (
                      <div key={type.id} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{type.name}</span>
                      </div>
                    ))}
                    {selectedEntityCount === 0 && (
                      <p className="text-sm text-muted-foreground">No entity types selected</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Selected Edge Types</h4>
                  <div className="space-y-1">
                    {edgeTypes.filter(t => t.selected).map(type => (
                      <div key={type.id} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{type.name}</span>
                      </div>
                    ))}
                    {selectedEdgeCount === 0 && (
                      <p className="text-sm text-muted-foreground">No edge types selected</p>
                    )}
                  </div>
                </div>
              </div>

              {metadata && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Document analysis detected <strong>{metadata.domain}</strong> domain content
                    with <strong>{metadata.complexity}</strong> complexity.
                    The suggested types are optimized for this content type.
                  </AlertDescription>
                </Alert>
              )}

              {selectedEntityCount === 0 || selectedEdgeCount === 0 ? (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please select at least one entity type and one edge type to create an ontology.
                  </AlertDescription>
                </Alert>
              ) : (
                <Button
                  className="w-full"
                  onClick={handleApplyTypes}
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Applying Types...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Apply Selected Types
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}