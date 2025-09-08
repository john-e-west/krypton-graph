import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Textarea } from '../../ui/textarea'
import { Label } from '../../ui/label'
import { Alert, AlertDescription } from '../../ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { ontologyService } from '../../../lib/airtable/services'
import { Upload, FileJson } from 'lucide-react'

interface ImportOntologyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export const ImportOntologyDialog: React.FC<ImportOntologyDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [format, setFormat] = useState<'json' | 'file'>('json')
  const [jsonContent, setJsonContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<any>(null)

  // Using singleton service from services index

  const validateJson = (content: string) => {
    try {
      const data = JSON.parse(content)
      
      // Basic validation
      if (!data.metadata?.name) {
        throw new Error('Missing ontology name in metadata')
      }

      setValidationResult({
        valid: true,
        name: data.metadata.name,
        version: data.metadata.version || '1.0.0',
        entityCount: data.entityTypes?.length || 0,
        edgeCount: data.edgeTypes?.length || 0
      })
      
      setError(null)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON format')
      setValidationResult(null)
      return null
    }
  }

  const handleJsonChange = (content: string) => {
    setJsonContent(content)
    if (content.trim()) {
      validateJson(content)
    } else {
      setValidationResult(null)
      setError(null)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setJsonContent(content)
      validateJson(content)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!validationResult?.valid) return

    setLoading(true)
    setError(null)

    try {
      const data = JSON.parse(jsonContent)
      
      // Create the ontology
      await ontologyService.createOntology({
        name: data.metadata.name,
        description: data.metadata.description || `Imported on ${new Date().toLocaleDateString()}`,
        domain: data.metadata.domain,
        version: data.metadata.version || '1.0.0',
        notes: `Imported from ${format === 'json' ? 'JSON' : 'file'}`
      })

      // TODO: Import entity and edge definitions
      // This would require additional API calls to create related records
      
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import ontology')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setJsonContent('')
      setError(null)
      setValidationResult(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Ontology</DialogTitle>
          <DialogDescription>
            Import an ontology definition from JSON format
          </DialogDescription>
        </DialogHeader>

        <Tabs value={format} onValueChange={(v) => setFormat(v as 'json' | 'file')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="json">
              <FileJson className="mr-2 h-4 w-4" />
              Paste JSON
            </TabsTrigger>
            <TabsTrigger value="file">
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="json" className="space-y-4">
            <div className="grid gap-2">
              <Label>JSON Content</Label>
              <Textarea
                placeholder={`{
  "metadata": {
    "name": "My Ontology",
    "version": "1.0.0",
    "domain": "Healthcare",
    "description": "..."
  },
  "entityTypes": [...],
  "edgeTypes": [...]
}`}
                value={jsonContent}
                onChange={(e) => handleJsonChange(e.target.value)}
                className="font-mono text-sm"
                rows={12}
                disabled={loading}
              />
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
            <div className="grid gap-2">
              <Label>Select File</Label>
              <div className="rounded-lg border-2 border-dashed p-6 text-center">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={loading}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Choose JSON file or drag and drop</span>
                </label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {validationResult && validationResult.valid && (
          <Alert>
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">Valid ontology detected:</p>
                <p>Name: {validationResult.name}</p>
                <p>Version: {validationResult.version}</p>
                <p>Entities: {validationResult.entityCount}, Edges: {validationResult.edgeCount}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading || !validationResult?.valid}
          >
            {loading ? 'Importing...' : 'Import Ontology'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}