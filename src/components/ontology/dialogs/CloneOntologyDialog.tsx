import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { Label } from '../../ui/label'
import { Alert, AlertDescription } from '../../ui/alert'
import { ontologyService } from '../../../lib/airtable/services'
import { OntologyRecord } from '../../../lib/types/airtable'
import { Copy } from 'lucide-react'

interface CloneOntologyDialogProps {
  ontology: OntologyRecord
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export const CloneOntologyDialog: React.FC<CloneOntologyDialogProps> = ({
  ontology,
  open,
  onOpenChange,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    version: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Using singleton service from services index

  React.useEffect(() => {
    if (open && ontology) {
      setFormData({
        name: `${ontology.fields.Name} (Copy)`,
        version: ontology.fields.Version || '1.0.0',
        notes: `Cloned from "${ontology.fields.Name}" on ${new Date().toLocaleDateString()}`
      })
    }
  }, [open, ontology])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Create the new ontology with cloned data
      await ontologyService.createOntology({
        name: formData.name,
        description: ontology.fields.Description || `Cloned from ${ontology.fields.Name}`,
        domain: ontology.fields.Domain,
        version: formData.version,
        notes: formData.notes
      })

      // TODO: Clone entity and edge definitions
      // This would require additional API calls to copy all related records
      
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone ontology')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        version: '',
        notes: ''
      })
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Clone Ontology
            </div>
          </DialogTitle>
          <DialogDescription>
            Create a copy of "{ontology?.fields.Name}" with a new name and version
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Original Ontology</Label>
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                {ontology?.fields.Name} (v{ontology?.fields.Version || '1.0.0'})
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clone-name">New Name *</Label>
              <Input
                id="clone-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                disabled={loading}
                placeholder="Enter a unique name for the cloned ontology"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clone-version">Version</Label>
              <Input
                id="clone-version"
                value={formData.version}
                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                disabled={loading}
                placeholder="1.0.0"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clone-notes">Notes</Label>
              <Textarea
                id="clone-notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                disabled={loading}
                rows={3}
                placeholder="Additional notes about this clone"
              />
            </div>

            <Alert>
              <AlertDescription>
                This will create a new ontology with the same structure as the original. 
                Entity and edge definitions will need to be copied separately.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? 'Cloning...' : 'Clone Ontology'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}