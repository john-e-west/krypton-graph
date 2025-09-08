'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Archive, 
  Trash2, 
  Play, 
  Pause, 
  BarChart3,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Users,
  Activity,
  Download,
  Upload
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface GraphSummary {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'archived' | 'processing'
  createdBy: string
  createdAt: string
  lastModified: string
  lastActivity: string
  ontologyId: string
  ontologyName?: string
  nodeCount: number
  edgeCount: number
  dataSize: number
  tags: string[]
}

interface GraphManagementInterfaceProps {
  className?: string
  onGraphSelect?: (graph: GraphSummary) => void
  onGraphCreate?: (graph: GraphSummary) => void
  onGraphUpdate?: (graph: GraphSummary) => void
  onGraphDelete?: (graphId: string) => void
}

interface CreateGraphForm {
  name: string
  description: string
  ontologyId: string
  configuration: {
    maxNodes: number
    maxEdges: number
    autoClassification: boolean
    retentionDays: number
    processingPriority: 'low' | 'normal' | 'high'
  }
  tags: string[]
  initialStatus: 'active' | 'inactive'
}

const DEFAULT_CREATE_FORM: CreateGraphForm = {
  name: '',
  description: '',
  ontologyId: '',
  configuration: {
    maxNodes: 10000,
    maxEdges: 50000,
    autoClassification: true,
    retentionDays: 30,
    processingPriority: 'normal'
  },
  tags: [],
  initialStatus: 'active'
}

export function GraphManagementInterface({
  className,
  onGraphSelect,
  onGraphCreate,
  onGraphUpdate,
  onGraphDelete
}: GraphManagementInterfaceProps) {
  const [graphs, setGraphs] = useState<GraphSummary[]>([])
  const [availableOntologies, setAvailableOntologies] = useState<Array<{id: string, name: string}>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState('created')
  const [sortOrder, setSortOrder] = useState('desc')
  
  // Create/Edit dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingGraph, setEditingGraph] = useState<GraphSummary | null>(null)
  const [createForm, setCreateForm] = useState<CreateGraphForm>(DEFAULT_CREATE_FORM)
  const [submitting, setSubmitting] = useState(false)

  // Pagination and summary
  const [summary, setSummary] = useState({
    totalGraphs: 0,
    totalNodes: 0,
    totalEdges: 0,
    totalDataSize: 0,
    statusCounts: {} as Record<string, number>
  })

  const fetchGraphs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      if (searchTerm) {
        params.set('search', searchTerm)
      }
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)
      params.set('includeOntologyNames', 'true')
      params.set('limit', '100')

      const response = await fetch(`/api/graphs?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch graphs: ${response.statusText}`)
      }

      const data = await response.json()
      setGraphs(data.graphs)
      setSummary(data.summary)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch graphs')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, sortBy, sortOrder])

  const fetchOntologies = useCallback(async () => {
    try {
      const response = await fetch('/api/ontologies/templates?limit=100&sortBy=name&sortOrder=asc')
      if (!response.ok) {
        throw new Error('Failed to fetch ontologies')
      }

      const data = await response.json()
      setAvailableOntologies(data.templates.map((template: any) => ({
        id: template.id,
        name: template.name
      })))
    } catch (err) {
      console.error('Failed to fetch ontologies:', err)
    }
  }, [])

  useEffect(() => {
    fetchGraphs()
    fetchOntologies()
  }, [fetchGraphs, fetchOntologies])

  const handleCreateGraph = async () => {
    if (!createForm.name || !createForm.ontologyId) {
      setError('Graph name and ontology are required')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create graph')
      }

      const newGraph = await response.json()
      setGraphs(prev => [newGraph, ...prev])
      setShowCreateDialog(false)
      setCreateForm(DEFAULT_CREATE_FORM)
      
      if (onGraphCreate) {
        onGraphCreate(newGraph)
      }

      // Refresh graphs to get updated summary
      fetchGraphs()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create graph')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateGraph = async (graphId: string, updates: Partial<GraphSummary>) => {
    try {
      const response = await fetch(`/api/graphs/${graphId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update graph')
      }

      const updatedGraph = await response.json()
      setGraphs(prev => prev.map(g => g.id === graphId ? { ...g, ...updatedGraph } : g))
      
      if (onGraphUpdate) {
        onGraphUpdate(updatedGraph)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update graph')
    }
  }

  const handleArchiveGraph = async (graph: GraphSummary) => {
    if (!confirm(`Are you sure you want to archive "${graph.name}"? This action can be undone.`)) {
      return
    }

    try {
      await handleUpdateGraph(graph.id, { status: 'archived' })
      fetchGraphs() // Refresh to remove from list if filtering out archived
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive graph')
    }
  }

  const handleDeleteGraph = async (graph: GraphSummary) => {
    if (!confirm(`Are you sure you want to permanently delete "${graph.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/graphs/${graph.id}`, { method: 'DELETE' })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete graph')
      }

      setGraphs(prev => prev.filter(g => g.id !== graph.id))
      
      if (onGraphDelete) {
        onGraphDelete(graph.id)
      }

      fetchGraphs() // Refresh summary

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete graph')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'inactive':
        return <Pause className="h-4 w-4 text-gray-500" />
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'archived':
        return <Archive className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'archived': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-red-100 text-red-800'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const filteredGraphs = graphs.filter(graph => {
    const matchesSearch = !searchTerm || 
      graph.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      graph.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      graph.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || graph.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Graph Management</h2>
          <p className="text-muted-foreground">
            Manage your knowledge graphs, monitor performance, and control access
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Graph
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Graph</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Graph Name *</Label>
                  <Input
                    id="name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Knowledge Graph"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ontology">Ontology *</Label>
                  <Select
                    value={createForm.ontologyId}
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, ontologyId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an ontology" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOntologies.map(ontology => (
                        <SelectItem key={ontology.id} value={ontology.id}>
                          {ontology.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the purpose and scope of this graph..."
                />
              </div>

              <Tabs defaultValue="basic" className="w-full">
                <TabsList>
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced Configuration</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="initialStatus">Initial Status</Label>
                      <Select
                        value={createForm.initialStatus}
                        onValueChange={(value: 'active' | 'inactive') => 
                          setCreateForm(prev => ({ ...prev, initialStatus: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags</Label>
                      <Input
                        id="tags"
                        value={createForm.tags.join(', ')}
                        onChange={(e) => setCreateForm(prev => ({ 
                          ...prev, 
                          tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                        }))}
                        placeholder="tag1, tag2, tag3"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="advanced" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxNodes">Max Nodes</Label>
                      <Input
                        id="maxNodes"
                        type="number"
                        value={createForm.configuration.maxNodes}
                        onChange={(e) => setCreateForm(prev => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            maxNodes: parseInt(e.target.value) || 10000
                          }
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxEdges">Max Edges</Label>
                      <Input
                        id="maxEdges"
                        type="number"
                        value={createForm.configuration.maxEdges}
                        onChange={(e) => setCreateForm(prev => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            maxEdges: parseInt(e.target.value) || 50000
                          }
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="retentionDays">Data Retention (Days)</Label>
                      <Input
                        id="retentionDays"
                        type="number"
                        value={createForm.configuration.retentionDays}
                        onChange={(e) => setCreateForm(prev => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            retentionDays: parseInt(e.target.value) || 30
                          }
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="processingPriority">Processing Priority</Label>
                      <Select
                        value={createForm.configuration.processingPriority}
                        onValueChange={(value: 'low' | 'normal' | 'high') => 
                          setCreateForm(prev => ({
                            ...prev,
                            configuration: {
                              ...prev.configuration,
                              processingPriority: value
                            }
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="autoClassification"
                      checked={createForm.configuration.autoClassification}
                      onCheckedChange={(checked) => setCreateForm(prev => ({
                        ...prev,
                        configuration: {
                          ...prev.configuration,
                          autoClassification: checked as boolean
                        }
                      }))}
                    />
                    <Label htmlFor="autoClassification">Enable automatic classification</Label>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGraph} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Graph'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total Graphs</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{summary.totalGraphs}</div>
              <div className="flex items-center space-x-2 mt-1">
                {Object.entries(summary.statusCounts).map(([status, count]) => (
                  <Badge key={status} variant="secondary" className={cn("text-xs", getStatusColor(status))}>
                    {status}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Total Nodes</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{summary.totalNodes.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Total Edges</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{summary.totalEdges.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Total Data Size</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{formatFileSize(summary.totalDataSize)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search graphs by name, description, or tags..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
            const [field, order] = value.split('-')
            setSortBy(field)
            setSortOrder(order)
          }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created-desc">Latest First</SelectItem>
              <SelectItem value="created-asc">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="nodes-desc">Most Nodes</SelectItem>
              <SelectItem value="activity-desc">Most Active</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={fetchGraphs}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Graphs List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading graphs...</span>
        </div>
      ) : filteredGraphs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No graphs found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first knowledge graph to get started'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Graph
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredGraphs.map((graph) => (
            <Card key={graph.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(graph.status)}
                      <h3 className="text-lg font-semibold">{graph.name}</h3>
                      <Badge className={cn("text-xs", getStatusColor(graph.status))}>
                        {graph.status}
                      </Badge>
                    </div>
                    
                    <p className="text-muted-foreground mb-3">{graph.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {graph.nodeCount.toLocaleString()} nodes
                      </span>
                      <span className="flex items-center">
                        <Activity className="h-4 w-4 mr-1" />
                        {graph.edgeCount.toLocaleString()} edges
                      </span>
                      <span className="flex items-center">
                        <Database className="h-4 w-4 mr-1" />
                        {formatFileSize(graph.dataSize)}
                      </span>
                      {graph.ontologyName && (
                        <span className="flex items-center">
                          <Settings className="h-4 w-4 mr-1" />
                          {graph.ontologyName}
                        </span>
                      )}
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(graph.lastActivity || graph.lastModified).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {graph.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {graph.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onGraphSelect?.(graph)}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {graph.status === 'active' && (
                        <DropdownMenuItem onClick={() => handleUpdateGraph(graph.id, { status: 'inactive' })}>
                          <Pause className="h-4 w-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      )}
                      {graph.status === 'inactive' && (
                        <DropdownMenuItem onClick={() => handleUpdateGraph(graph.id, { status: 'active' })}>
                          <Play className="h-4 w-4 mr-2" />
                          Activate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleArchiveGraph(graph)}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteGraph(graph)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}