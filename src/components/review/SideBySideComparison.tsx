import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ChangeReview, ComparisonView } from '../../types/review'
import { ComparisonGenerator } from '../../services/comparison-generator'
import { ChevronRight, Plus, Minus, Edit } from 'lucide-react'

interface SideBySideComparisonProps {
  review: ChangeReview
}

export function SideBySideComparison({ review }: SideBySideComparisonProps) {
  const [syncScroll, setSyncScroll] = useState(true)
  const [comparison, setComparison] = useState<ComparisonView | null>(null)
  
  const generator = useMemo(() => new ComparisonGenerator(), [])
  
  useEffect(() => {
    // Generate mock snapshots for demonstration
    const currentSnapshot = {
      id: 'current',
      timestamp: new Date(),
      entities: [
        { id: 'entity-1', name: 'Current Entity 1', type: 'concept', properties: { value: 'old' } },
        { id: 'entity-2', name: 'Current Entity 2', type: 'concept', properties: { value: 'unchanged' } }
      ],
      edges: [
        { id: 'edge-1', source: 'entity-1', target: 'entity-2', type: 'relates', properties: {} }
      ],
      metadata: {}
    }
    
    const proposedSnapshot = {
      id: 'proposed',
      timestamp: new Date(),
      entities: [
        { id: 'entity-1', name: 'Updated Entity 1', type: 'concept', properties: { value: 'new' } },
        { id: 'entity-2', name: 'Current Entity 2', type: 'concept', properties: { value: 'unchanged' } },
        { id: 'entity-3', name: 'New Entity 3', type: 'concept', properties: { value: 'created' } }
      ],
      edges: [
        { id: 'edge-1', source: 'entity-1', target: 'entity-2', type: 'relates', properties: { strength: 'high' } },
        { id: 'edge-2', source: 'entity-2', target: 'entity-3', type: 'connects', properties: {} }
      ],
      metadata: {}
    }
    
    const generatedComparison = generator.generateComparison(currentSnapshot, proposedSnapshot)
    setComparison(generatedComparison)
  }, [generator, review])
  
  const handleScroll = (side: 'left' | 'right') => (event: React.UIEvent<HTMLDivElement>) => {
    if (!syncScroll) return
    
    const target = event.target as HTMLDivElement
    const scrollTop = target.scrollTop
    const scrollLeft = target.scrollLeft
    
    // Find the other scroll area and sync
    const otherSide = side === 'left' ? 'right' : 'left'
    const otherScrollArea = document.querySelector(`[data-scroll-area="${otherSide}"]`)
    
    if (otherScrollArea) {
      const scrollViewport = otherScrollArea.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollTop
        scrollViewport.scrollLeft = scrollLeft
      }
    }
  }
  
  if (!comparison) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading comparison...</div>
      </div>
    )
  }
  
  const diffLines = generator.formatDiffForDisplay(comparison.diff)
  
  return (
    <div className="h-full space-y-4">
      {/* Diff Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Comparison Summary</span>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-green-600">
                +{comparison.diff.added.length} Added
              </Badge>
              <Badge variant="outline" className="text-blue-600">
                ~{comparison.diff.modified.length} Modified
              </Badge>
              <Badge variant="outline" className="text-red-600">
                -{comparison.diff.removed.length} Removed
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-1">
            {diffLines.length > 0 ? (
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-32">
                {diffLines.join('\n')}
              </pre>
            ) : (
              <p className="text-muted-foreground">No differences found.</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Side by Side View */}
      <div className="grid grid-cols-2 gap-4 h-[calc(100%-12rem)]">
        {/* Current State */}
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              {comparison.left.title}
              <Badge variant="secondary">Current</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-0">
            <ScrollArea 
              className="h-full"
              data-scroll-area="left"
              onScroll={handleScroll('left')}
            >
              <div className="p-4 space-y-4">
                <Tabs defaultValue="entities">
                  <TabsList>
                    <TabsTrigger value="entities">Entities</TabsTrigger>
                    <TabsTrigger value="edges">Edges</TabsTrigger>
                    <TabsTrigger value="raw">Raw Data</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="entities" className="mt-4">
                    {comparison.left.data.entities.map((entity: any, idx: number) => {
                      const highlight = comparison.left.highlights.find(
                        h => h.path.includes(entity.id)
                      )
                      
                      return (
                        <div
                          key={entity.id}
                          className={`border rounded p-3 mb-2 ${
                            highlight?.type === 'removed' ? 'bg-red-50 border-red-200' :
                            highlight?.type === 'modified' ? 'bg-blue-50 border-blue-200' :
                            'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {highlight?.type === 'removed' && <Minus className="h-4 w-4 text-red-500" />}
                            {highlight?.type === 'modified' && <Edit className="h-4 w-4 text-blue-500" />}
                            <span className="font-medium">{entity.name}</span>
                            <Badge variant="outline" className="text-xs">{entity.type}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {entity.id}
                          </div>
                          {entity.properties && Object.keys(entity.properties).length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs font-medium mb-1">Properties:</div>
                              <pre className="text-xs bg-white p-2 rounded">
                                {JSON.stringify(entity.properties, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </TabsContent>
                  
                  <TabsContent value="edges" className="mt-4">
                    {comparison.left.data.edges.map((edge: any) => {
                      const highlight = comparison.left.highlights.find(
                        h => h.path.includes(edge.id)
                      )
                      
                      return (
                        <div
                          key={edge.id}
                          className={`border rounded p-3 mb-2 ${
                            highlight?.type === 'removed' ? 'bg-red-50 border-red-200' :
                            highlight?.type === 'modified' ? 'bg-blue-50 border-blue-200' :
                            'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {highlight?.type === 'removed' && <Minus className="h-4 w-4 text-red-500" />}
                            {highlight?.type === 'modified' && <Edit className="h-4 w-4 text-blue-500" />}
                            <span className="text-sm">{edge.source}</span>
                            <ChevronRight className="h-3 w-3" />
                            <span className="text-sm">{edge.target}</span>
                            <Badge variant="outline" className="text-xs">{edge.type}</Badge>
                          </div>
                          {edge.properties && Object.keys(edge.properties).length > 0 && (
                            <pre className="text-xs bg-white p-2 rounded">
                              {JSON.stringify(edge.properties, null, 2)}
                            </pre>
                          )}
                        </div>
                      )
                    })}
                  </TabsContent>
                  
                  <TabsContent value="raw" className="mt-4">
                    <pre className="text-xs bg-white p-4 rounded overflow-x-auto">
                      {JSON.stringify(comparison.left.data, null, 2)}
                    </pre>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Proposed State */}
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              {comparison.right.title}
              <Badge variant="default">Proposed</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-0">
            <ScrollArea 
              className="h-full"
              data-scroll-area="right"
              onScroll={handleScroll('right')}
            >
              <div className="p-4 space-y-4">
                <Tabs defaultValue="entities">
                  <TabsList>
                    <TabsTrigger value="entities">Entities</TabsTrigger>
                    <TabsTrigger value="edges">Edges</TabsTrigger>
                    <TabsTrigger value="raw">Raw Data</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="entities" className="mt-4">
                    {comparison.right.data.entities.map((entity: any) => {
                      const highlight = comparison.right.highlights.find(
                        h => h.path.includes(entity.id)
                      )
                      
                      return (
                        <div
                          key={entity.id}
                          className={`border rounded p-3 mb-2 ${
                            highlight?.type === 'added' ? 'bg-green-50 border-green-200' :
                            highlight?.type === 'modified' ? 'bg-blue-50 border-blue-200' :
                            'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {highlight?.type === 'added' && <Plus className="h-4 w-4 text-green-500" />}
                            {highlight?.type === 'modified' && <Edit className="h-4 w-4 text-blue-500" />}
                            <span className="font-medium">{entity.name}</span>
                            <Badge variant="outline" className="text-xs">{entity.type}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {entity.id}
                          </div>
                          {entity.properties && Object.keys(entity.properties).length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs font-medium mb-1">Properties:</div>
                              <pre className="text-xs bg-white p-2 rounded">
                                {JSON.stringify(entity.properties, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </TabsContent>
                  
                  <TabsContent value="edges" className="mt-4">
                    {comparison.right.data.edges.map((edge: any) => {
                      const highlight = comparison.right.highlights.find(
                        h => h.path.includes(edge.id)
                      )
                      
                      return (
                        <div
                          key={edge.id}
                          className={`border rounded p-3 mb-2 ${
                            highlight?.type === 'added' ? 'bg-green-50 border-green-200' :
                            highlight?.type === 'modified' ? 'bg-blue-50 border-blue-200' :
                            'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {highlight?.type === 'added' && <Plus className="h-4 w-4 text-green-500" />}
                            {highlight?.type === 'modified' && <Edit className="h-4 w-4 text-blue-500" />}
                            <span className="text-sm">{edge.source}</span>
                            <ChevronRight className="h-3 w-3" />
                            <span className="text-sm">{edge.target}</span>
                            <Badge variant="outline" className="text-xs">{edge.type}</Badge>
                          </div>
                          {edge.properties && Object.keys(edge.properties).length > 0 && (
                            <pre className="text-xs bg-white p-2 rounded">
                              {JSON.stringify(edge.properties, null, 2)}
                            </pre>
                          )}
                        </div>
                      )
                    })}
                  </TabsContent>
                  
                  <TabsContent value="raw" className="mt-4">
                    <pre className="text-xs bg-white p-4 rounded overflow-x-auto">
                      {JSON.stringify(comparison.right.data, null, 2)}
                    </pre>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}