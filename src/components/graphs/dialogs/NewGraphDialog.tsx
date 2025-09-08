import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { graphService, ontologyService } from '@/lib/airtable/services'
import { OntologyRecord } from '@/lib/types/airtable'

interface NewGraphDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function NewGraphDialog({ open, onOpenChange, onSuccess }: NewGraphDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [ontologyId, setOntologyId] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [ontologies, setOntologies] = useState<OntologyRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      loadOntologies()
    }
  }, [open])

  const loadOntologies = async () => {
    try {
      const records = await ontologyService.findAll({
        filterByFormula: "{Status} = 'Published'"
      })
      setOntologies(records)
    } catch (error) {
      console.error('Failed to load ontologies:', error)
      setError('Failed to load ontologies')
    }
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()])
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    
    if (!ontologyId) {
      setError('Please select an ontology')
      return
    }

    setLoading(true)
    try {
      await graphService.createGraph({
        Name: name.trim(),
        Description: description.trim(),
        OntologyId: [ontologyId],
        Tags: tags,
        Status: 'active',
        IsActive: true,
        IsArchived: false,
        IsPublic: false,
        AllowCloning: false,
        ProcessingEnabled: true
      })
      
      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Failed to create graph:', error)
      setError('Failed to create graph. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setOntologyId('')
    setTags([])
    setTagInput('')
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Knowledge Graph</DialogTitle>
            <DialogDescription>
              Create a new knowledge graph to organize your domain or project data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter graph name"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this graph"
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="ontology">Ontology *</Label>
              <Select value={ontologyId} onValueChange={setOntologyId}>
                <SelectTrigger id="ontology">
                  <SelectValue placeholder="Select an ontology" />
                </SelectTrigger>
                <SelectContent>
                  {ontologies.map((ontology) => (
                    <SelectItem key={ontology.id} value={ontology.id}>
                      {ontology.fields.Name} 
                      {ontology.fields.Domain && (
                        <span className="text-muted-foreground ml-2">
                          ({ontology.fields.Domain})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type a tag and press Enter"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Graph'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}