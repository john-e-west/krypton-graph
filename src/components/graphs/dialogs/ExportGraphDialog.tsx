import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Download } from 'lucide-react'
import { KnowledgeGraph, GraphExport } from '@/types/graph'
import { format } from 'date-fns'

interface ExportGraphDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  graph: KnowledgeGraph
}

export function ExportGraphDialog({ open, onOpenChange, graph }: ExportGraphDialogProps) {
  const [includeData, setIncludeData] = useState(false)
  const [includeStatistics, setIncludeStatistics] = useState(true)
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [includeStructure, setIncludeStructure] = useState(true)

  const handleExport = () => {
    const exportData: GraphExport = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      graph: {
        id: graph.id,
        name: graph.name,
        description: graph.description,
        ontologyId: graph.ontologyId,
        metadata: includeMetadata ? {
          createdAt: graph.metadata.createdAt.toISOString(),
          tags: graph.metadata.tags
        } : {
          createdAt: '',
          tags: []
        },
        statistics: includeStatistics ? {
          entityCount: graph.statistics.entityCount,
          edgeCount: graph.statistics.edgeCount,
          documentCount: graph.statistics.documentCount
        } : {
          entityCount: 0,
          edgeCount: 0,
          documentCount: 0
        },
        structure: includeStructure ? {
          entityTypes: [], // Would be populated from actual data
          edgeTypes: []    // Would be populated from actual data
        } : {
          entityTypes: [],
          edgeTypes: []
        }
      },
      includesData: includeData
    }

    // Create and download the JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${graph.name.replace(/\s+/g, '-').toLowerCase()}-export-${format(new Date(), 'yyyy-MM-dd')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Knowledge Graph</DialogTitle>
          <DialogDescription>
            Export "{graph.name}" as a JSON file. Choose what to include in the export.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="metadata"
                checked={includeMetadata}
                onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
              />
              <Label htmlFor="metadata" className="font-normal">
                Include metadata (creation date, tags)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="statistics"
                checked={includeStatistics}
                onCheckedChange={(checked) => setIncludeStatistics(checked as boolean)}
              />
              <Label htmlFor="statistics" className="font-normal">
                Include statistics (entity/edge counts)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="structure"
                checked={includeStructure}
                onCheckedChange={(checked) => setIncludeStructure(checked as boolean)}
              />
              <Label htmlFor="structure" className="font-normal">
                Include structure (entity/edge types)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="data"
                checked={includeData}
                onCheckedChange={(checked) => setIncludeData(checked as boolean)}
                disabled
              />
              <Label htmlFor="data" className="font-normal text-muted-foreground">
                Include full data (coming soon)
              </Label>
            </div>
          </div>
          
          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-medium mb-2">Export Summary</h4>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>• Graph: {graph.name}</p>
              <p>• Format: JSON</p>
              <p>• Size estimate: ~{Math.ceil((graph.statistics.entityCount + graph.statistics.edgeCount) / 100)}KB</p>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}