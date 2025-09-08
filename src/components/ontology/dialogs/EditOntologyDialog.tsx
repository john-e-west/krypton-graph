import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Alert, AlertDescription } from '../../ui/alert'
import { ontologyService } from '../../../lib/airtable/services'
import { Domain, OntologyStatus, OntologyRecord } from '../../../lib/types/airtable'

interface EditOntologyDialogProps {
  ontology: OntologyRecord
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export const EditOntologyDialog: React.FC<EditOntologyDialogProps> = ({
  ontology,
  open,
  onOpenChange,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    domain: '' as Domain | '',
    version: '',
    status: '' as OntologyStatus | '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Using singleton service from services index

  const domains: Domain[] = ['Healthcare', 'Finance', 'Legal', 'Technology', 'Education', 'Manufacturing']
  const statuses: OntologyStatus[] = ['Draft', 'Testing', 'Published', 'Deprecated']

  useEffect(() => {
    if (ontology) {
      setFormData({
        name: ontology.fields.Name || '',
        description: ontology.fields.Description || '',
        domain: ontology.fields.Domain || '',
        version: ontology.fields.Version || '',
        status: ontology.fields.Status || '',
        notes: ontology.fields.Notes || ''
      })
    }
  }, [ontology])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await ontologyService.update(ontology.id, {
        fields: {
          Name: formData.name,
          Description: formData.description || undefined,
          Domain: formData.domain as Domain || undefined,
          Version: formData.version || undefined,
          Status: formData.status as OntologyStatus || undefined,
          Notes: formData.notes || undefined
        }
      })
      
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ontology')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Ontology</DialogTitle>
          <DialogDescription>
            Update the metadata and configuration for this ontology
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-domain">Domain</Label>
                <Select
                  value={formData.domain}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, domain: value as Domain }))}
                  disabled={loading}
                >
                  <SelectTrigger id="edit-domain">
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map(domain => (
                      <SelectItem key={domain} value={domain}>
                        {domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-version">Version</Label>
                <Input
                  id="edit-version"
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as OntologyStatus }))}
                disabled={loading}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                disabled={loading}
                rows={2}
              />
            </div>

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
              {loading ? 'Updating...' : 'Update Ontology'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}