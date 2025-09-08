import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Share2, 
  Download, 
  Plus, 
  Settings, 
  BarChart3, 
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText
} from 'lucide-react';
import { GraphViewer } from './GraphViewer';
import { GraphData, NodeDatum, LinkDatum } from './types';

interface GraphExplorerProps {
  graphId: string
  initialData?: GraphData
  onAddDocument?: () => void
  onShare?: () => void
  onSettings?: () => void
}

interface GraphMetrics {
  entityCount: number
  edgeCount: number
  classification_rate: number
  unclassified_count: number
  processing_time_ms: number
  created_at: string
  last_updated: string
}

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  action: () => void
}

const GraphExplorer: React.FC<GraphExplorerProps> = ({
  graphId,
  initialData,
  onAddDocument,
  onShare,
  onSettings
}) => {
  const [graphData, setGraphData] = useState<GraphData | null>(initialData || null)
  const [metrics, setMetrics] = useState<GraphMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initialData) {
      loadGraphData()
    }
  }, [graphId, initialData])

  const loadGraphData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // For now, create mock graph data
      // TODO: Replace with actual API call to load graph data
      const mockGraphData: GraphData = {
        nodes: [
          {
            id: '1',
            type: 'entity',
            label: 'John Smith',
            attributes: { type: 'Person', confidence: 0.95 },
            x: 100,
            y: 100
          },
          {
            id: '2',
            type: 'entity',
            label: 'Apple Inc.',
            attributes: { type: 'Organization', confidence: 0.92 },
            x: 200,
            y: 150
          },
          {
            id: '3',
            type: 'concept',
            label: 'Software Engineer',
            attributes: { type: 'Role', confidence: 0.88 },
            x: 150,
            y: 200
          }
        ],
        edges: [
          {
            id: 'e1',
            source: '1',
            target: '2',
            type: 'WORKS_AT',
            label: 'works at',
            attributes: { confidence: 0.85 }
          },
          {
            id: 'e2',
            source: '1',
            target: '3',
            type: 'HAS_ROLE',
            label: 'has role',
            attributes: { confidence: 0.90 }
          }
        ],
        metadata: {
          entityTypes: ['Person', 'Organization', 'Role'],
          edgeTypes: ['WORKS_AT', 'HAS_ROLE'],
          totalNodes: 3,
          totalEdges: 2
        }
      }

      const mockMetrics: GraphMetrics = {
        entityCount: mockGraphData.nodes.length,
        edgeCount: mockGraphData.edges.length,
        classification_rate: 92.5,
        unclassified_count: 15,
        processing_time_ms: 3400,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      }

      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      setGraphData(mockGraphData)
      setMetrics(mockMetrics)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNodeClick = (node: NodeDatum) => {
    console.log('Node clicked:', node)
    // TODO: Show node details panel
  }

  const handleEdgeClick = (edge: LinkDatum) => {
    console.log('Edge clicked:', edge)
    // TODO: Show edge details panel
  }

  const generateQuickActions = (): QuickAction[] => {
    const actions: QuickAction[] = [
      {
        id: 'add-document',
        label: 'Add More Documents',
        icon: <Plus className="h-4 w-4" />,
        description: 'Expand your knowledge graph with additional documents',
        action: () => onAddDocument?.()
      },
      {
        id: 'share',
        label: 'Share Graph',
        icon: <Share2 className="h-4 w-4" />,
        description: 'Share this knowledge graph with your team',
        action: () => onShare?.()
      },
      {
        id: 'export',
        label: 'Export Data',
        icon: <Download className="h-4 w-4" />,
        description: 'Download graph data in various formats',
        action: () => console.log('Export clicked')
      },
      {
        id: 'settings',
        label: 'Graph Settings',
        icon: <Settings className="h-4 w-4" />,
        description: 'Configure visualization and processing options',
        action: () => onSettings?.()
      }
    ]

    return actions
  }

  const renderMetricsCard = () => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <CardTitle className="text-sm">Creation Metrics</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Entities</p>
            <p className="font-semibold">{metrics?.entityCount || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Relationships</p>
            <p className="font-semibold">{metrics?.edgeCount || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Classification</p>
            <div className="flex items-center gap-1">
              <p className="font-semibold">{metrics?.classification_rate.toFixed(1)}%</p>
              {metrics && metrics.classification_rate > 90 ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-yellow-500" />
              )}
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Processing Time</p>
            <p className="font-semibold">
              {metrics ? `${(metrics.processing_time_ms / 1000).toFixed(1)}s` : '-'}
            </p>
          </div>
        </div>

        {metrics && metrics.unclassified_count > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {metrics.unclassified_count} items could not be classified. 
              Consider refining your ontology.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )

  const renderQuickActionsCard = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Quick Actions</CardTitle>
        <CardDescription className="text-xs">
          Common tasks for your knowledge graph
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {generateQuickActions().map(action => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={action.action}
            className="w-full justify-start text-left h-auto p-3"
          >
            <div className="flex items-start gap-3 w-full">
              <div className="mt-0.5">{action.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {action.description}
                </p>
              </div>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  )

  const renderGraphInfo = () => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <CardTitle className="text-sm">Graph Information</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {graphData && (
          <>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Entity Types</p>
              <div className="flex flex-wrap gap-1">
                {graphData.metadata.entityTypes.map(type => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground mb-2">Edge Types</p>
              <div className="flex flex-wrap gap-1">
                {graphData.metadata.edgeTypes.map(type => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            {metrics && (
              <div className="text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3" />
                  <span>Created {new Date(metrics.created_at).toLocaleString()}</span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading knowledge graph...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!graphData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No graph data available</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Main graph visualization */}
      <div className="flex-1">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Knowledge Graph Explorer</CardTitle>
                <CardDescription>
                  Interactive visualization of extracted entities and relationships
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {graphData.metadata.totalNodes} nodes
                </Badge>
                <Badge variant="outline">
                  {graphData.metadata.totalEdges} edges
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="h-[600px]">
              <GraphViewer
                data={graphData}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                className="w-full h-full"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar with metrics and actions */}
      <div className="w-80 space-y-4">
        {renderMetricsCard()}
        {renderQuickActionsCard()}
        {renderGraphInfo()}
      </div>
    </div>
  )
}

export default GraphExplorer