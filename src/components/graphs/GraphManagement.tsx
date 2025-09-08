import React, { useState } from 'react'
import { Plus, Archive, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GraphList } from './GraphList'
import { NewGraphDialog } from './dialogs/NewGraphDialog'
import { EditGraphDialog } from './dialogs/EditGraphDialog'
import { ExportGraphDialog } from './dialogs/ExportGraphDialog'
import { GraphVisualization } from './GraphVisualization'
import { KnowledgeGraph } from '@/lib/types/graph'

export function GraphManagement() {
  const [newGraphOpen, setNewGraphOpen] = useState(false)
  const [editGraphOpen, setEditGraphOpen] = useState(false)
  const [exportGraphOpen, setExportGraphOpen] = useState(false)
  const [selectedGraph, setSelectedGraph] = useState<KnowledgeGraph | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleEdit = (graph: KnowledgeGraph) => {
    setSelectedGraph(graph)
    setEditGraphOpen(true)
  }

  const handleExport = (graph: KnowledgeGraph) => {
    setSelectedGraph(graph)
    setExportGraphOpen(true)
  }

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Graphs</h1>
          <p className="text-muted-foreground mt-1">
            Manage and organize your knowledge graphs across different domains
          </p>
        </div>
        <Button onClick={() => setNewGraphOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Graph
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Graphs</TabsTrigger>
          <TabsTrigger value="visualization">
            <Eye className="mr-2 h-4 w-4" />
            Visualization
          </TabsTrigger>
          <TabsTrigger value="archived">
            <Archive className="mr-2 h-4 w-4" />
            Archived
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-4">
          <GraphList
            key={`active-${refreshKey}`}
            onEdit={handleEdit}
            onExport={handleExport}
            showArchived={false}
          />
        </TabsContent>
        
        <TabsContent value="visualization" className="mt-4">
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Interactive graph visualization with force-directed layout. Click and drag nodes to explore relationships.
            </div>
            <GraphVisualization
              nodes={[
                { id: '1', label: 'Knowledge Graph', type: 'core', x: 0, y: 0 },
                { id: '2', label: 'Entity', type: 'entity', x: 0, y: 0 },
                { id: '3', label: 'Edge', type: 'edge', x: 0, y: 0 },
                { id: '4', label: 'Document', type: 'document', x: 0, y: 0 },
                { id: '5', label: 'Ontology', type: 'ontology', x: 0, y: 0 },
                { id: '6', label: 'Processing', type: 'process', x: 0, y: 0 },
                { id: '7', label: 'Query', type: 'query', x: 0, y: 0 },
                { id: '8', label: 'Export', type: 'export', x: 0, y: 0 }
              ]}
              edges={[
                { id: 'e1', source: '1', target: '2', label: 'contains' },
                { id: 'e2', source: '1', target: '3', label: 'defines' },
                { id: 'e3', source: '1', target: '4', label: 'processes' },
                { id: 'e4', source: '1', target: '5', label: 'uses' },
                { id: 'e5', source: '2', target: '3', label: 'connects' },
                { id: 'e6', source: '4', target: '6', label: 'triggers' },
                { id: 'e7', source: '6', target: '2', label: 'creates' },
                { id: 'e8', source: '7', target: '1', label: 'queries' },
                { id: 'e9', source: '1', target: '8', label: 'exports to' }
              ]}
              height={600}
              onNodeClick={(node) => console.log('Node clicked:', node)}
              onEdgeClick={(edge) => console.log('Edge clicked:', edge)}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="archived" className="mt-4">
          <GraphList
            key={`archived-${refreshKey}`}
            onEdit={handleEdit}
            onExport={handleExport}
            showArchived={true}
          />
        </TabsContent>
      </Tabs>

      <NewGraphDialog
        open={newGraphOpen}
        onOpenChange={setNewGraphOpen}
        onSuccess={handleSuccess}
      />

      {selectedGraph && (
        <>
          <EditGraphDialog
            open={editGraphOpen}
            onOpenChange={setEditGraphOpen}
            graph={selectedGraph}
            onSuccess={handleSuccess}
          />
          
          <ExportGraphDialog
            open={exportGraphOpen}
            onOpenChange={setExportGraphOpen}
            graph={selectedGraph}
          />
        </>
      )}
    </div>
  )
}