import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { Alert, AlertDescription } from '../../ui/alert'
import { OntologyRecord } from '../../../lib/types/airtable'
import { Download, FileCode, FileJson } from 'lucide-react'
import { Textarea } from '../../ui/textarea'

interface ExportDialogProps {
  ontology: OntologyRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  ontology,
  open,
  onOpenChange
}) => {
  const [format, setFormat] = useState<'python' | 'json'>('python')

  const generatePythonCode = () => {
    const code = `# ${ontology.fields.Name} Ontology v${ontology.fields.Version || '1.0.0'}
# Generated on ${new Date().toISOString()}
# Domain: ${ontology.fields.Domain || 'General'}

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ============================================================================
# Entity Definitions
# ============================================================================

# TODO: Add entity definitions based on EntityDefinitions
# Currently showing template structure

class ExampleEntity(BaseModel):
    """Example entity type - replace with actual entities"""
    id: str = Field(description="Unique identifier")
    name: str = Field(description="Entity name")
    created_at: datetime = Field(description="Creation timestamp")
    
# ============================================================================
# Edge Definitions
# ============================================================================

# Edge type mapping
edge_types = {
    # TODO: Add edge definitions based on EdgeDefinitions
    # "EdgeName": {"source": "EntityType", "target": "EntityType"}
}

# ============================================================================
# Ontology Metadata
# ============================================================================

ONTOLOGY_METADATA = {
    "name": "${ontology.fields.Name}",
    "version": "${ontology.fields.Version || '1.0.0'}",
    "domain": "${ontology.fields.Domain || 'General'}",
    "status": "${ontology.fields.Status || 'Draft'}",
    "description": """${ontology.fields.Description || 'No description'}""",
    "created": "${ontology.createdTime}",
}
`
    return code
  }

  const generateJsonExport = () => {
    const jsonData = {
      metadata: {
        name: ontology.fields.Name,
        version: ontology.fields.Version || '1.0.0',
        domain: ontology.fields.Domain || 'General',
        status: ontology.fields.Status || 'Draft',
        description: ontology.fields.Description || '',
        exportDate: new Date().toISOString(),
      },
      entityTypes: [
        // TODO: Populate with actual entity definitions
        {
          name: "ExampleEntity",
          description: "Replace with actual entities",
          fields: [
            { name: "id", type: "string", required: true },
            { name: "name", type: "string", required: true },
            { name: "created_at", type: "datetime", required: true }
          ]
        }
      ],
      edgeTypes: [
        // TODO: Populate with actual edge definitions
        {
          name: "ExampleEdge",
          source: "EntityType1",
          target: "EntityType2",
          cardinality: "one-to-many",
          bidirectional: false
        }
      ]
    }
    return JSON.stringify(jsonData, null, 2)
  }

  const handleDownload = () => {
    const content = format === 'python' ? generatePythonCode() : generateJsonExport()
    const blob = new Blob([content], { type: format === 'python' ? 'text/plain' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${ontology.fields.Name.toLowerCase().replace(/\s+/g, '_')}_ontology.${format === 'python' ? 'py' : 'json'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopyToClipboard = () => {
    const content = format === 'python' ? generatePythonCode() : generateJsonExport()
    navigator.clipboard.writeText(content)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Export Ontology</DialogTitle>
          <DialogDescription>
            Export "{ontology?.fields.Name}" as code or JSON
          </DialogDescription>
        </DialogHeader>

        <Tabs value={format} onValueChange={(v) => setFormat(v as 'python' | 'json')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="python">
              <FileCode className="mr-2 h-4 w-4" />
              Python Code
            </TabsTrigger>
            <TabsTrigger value="json">
              <FileJson className="mr-2 h-4 w-4" />
              JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="python" className="space-y-4">
            <div className="rounded-md bg-muted">
              <Textarea
                value={generatePythonCode()}
                readOnly
                className="font-mono text-sm"
                rows={20}
              />
            </div>
            <Alert>
              <AlertDescription>
                Python export includes Pydantic models for type safety and validation.
                Entity and edge definitions will be populated once they are defined.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="json" className="space-y-4">
            <div className="rounded-md bg-muted">
              <Textarea
                value={generateJsonExport()}
                readOnly
                className="font-mono text-sm"
                rows={20}
              />
            </div>
            <Alert>
              <AlertDescription>
                JSON export includes metadata and structure definitions.
                Can be imported into other systems or used for versioning.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleCopyToClipboard}>
            Copy to Clipboard
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download {format === 'python' ? '.py' : '.json'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}