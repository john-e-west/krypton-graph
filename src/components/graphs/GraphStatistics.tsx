import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  FileText, 
  Users, 
  Network, 
  Calendar,
  HardDrive,
  Activity
} from 'lucide-react'
import { KnowledgeGraph } from '@/types/graph'
import { format } from 'date-fns'

interface GraphStatisticsProps {
  graph: KnowledgeGraph
}

export function GraphStatistics({ graph }: GraphStatisticsProps) {
  const stats = graph.statistics
  const metadata = graph.metadata
  
  // Calculate some derived metrics
  const avgEdgesPerEntity = stats.entityCount > 0 
    ? (stats.edgeCount / stats.entityCount).toFixed(1) 
    : '0'
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const statCards = [
    {
      title: 'Total Entities',
      value: stats.entityCount.toLocaleString(),
      description: 'Knowledge entities',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Total Edges',
      value: stats.edgeCount.toLocaleString(),
      description: 'Relationships',
      icon: Network,
      color: 'text-green-600'
    },
    {
      title: 'Documents',
      value: stats.documentCount.toLocaleString(),
      description: 'Processed documents',
      icon: FileText,
      color: 'text-purple-600'
    },
    {
      title: 'Avg Connections',
      value: avgEdgesPerEntity,
      description: 'Edges per entity',
      icon: Activity,
      color: 'text-orange-600'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{graph.name} Statistics</h2>
        <p className="text-muted-foreground">{graph.description}</p>
        <div className="flex gap-2 mt-3">
          <Badge variant={graph.status === 'active' ? 'default' : 'secondary'}>
            {graph.status}
          </Badge>
          {graph.settings.isActive && <Badge variant="outline">Active</Badge>}
          {graph.settings.isPublic && <Badge variant="outline">Public</Badge>}
          {graph.settings.processingEnabled && <Badge variant="outline">Processing Enabled</Badge>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Graph Details</CardTitle>
            <CardDescription>Metadata and configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm font-medium">
                {format(metadata.createdAt, 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Last Modified</span>
              <span className="text-sm font-medium">
                {format(metadata.updatedAt, 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created By</span>
              <span className="text-sm font-medium">{metadata.createdBy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Storage Size</span>
              <span className="text-sm font-medium">
                {formatBytes(stats.sizeInBytes || 0)}
              </span>
            </div>
            {stats.lastProcessedAt && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last Processed</span>
                <span className="text-sm font-medium">
                  {format(stats.lastProcessedAt, 'MMM d, yyyy HH:mm')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tags & Categories</CardTitle>
            <CardDescription>Organization metadata</CardDescription>
          </CardHeader>
          <CardContent>
            {metadata.tags && metadata.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {metadata.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tags assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Growth Over Time</CardTitle>
          <CardDescription>Entity and edge growth metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Entity Capacity</span>
                <span className="text-sm text-muted-foreground">
                  {stats.entityCount} / 10,000
                </span>
              </div>
              <Progress value={(stats.entityCount / 10000) * 100} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Edge Capacity</span>
                <span className="text-sm text-muted-foreground">
                  {stats.edgeCount} / 50,000
                </span>
              </div>
              <Progress value={(stats.edgeCount / 50000) * 100} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Document Processing</span>
                <span className="text-sm text-muted-foreground">
                  {stats.documentCount} documents
                </span>
              </div>
              <Progress value={Math.min((stats.documentCount / 100) * 100, 100)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}