import React, { useState, useEffect, useCallback } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../ui/alert-dialog'
import { Alert, AlertDescription } from '../../ui/alert'
import { Badge } from '../../ui/badge'
import { ontologyService } from '../../../lib/airtable/services'
import { OntologyRecord } from '../../../lib/types/airtable'
import { AlertTriangle } from 'lucide-react'

interface DeleteOntologyDialogProps {
  ontology: OntologyRecord
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface Dependencies {
  entityCount: number
  edgeCount: number
  canDelete: boolean
  message?: string
}

export const DeleteOntologyDialog: React.FC<DeleteOntologyDialogProps> = ({
  ontology,
  open,
  onOpenChange,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dependencies, setDependencies] = useState<Dependencies | null>(null)
  const [checkingDependencies, setCheckingDependencies] = useState(false)

  // Using singleton service from services index

  const checkDependencies = useCallback(async () => {
    setCheckingDependencies(true)
    setError(null)
    
    try {
      // Check for linked entities and edges
      const entityCount = ontology.fields.EntityDefinitions?.length || 0
      const edgeCount = ontology.fields.EdgeDefinitions?.length || 0
      
      const deps: Dependencies = {
        entityCount,
        edgeCount,
        canDelete: entityCount === 0 && edgeCount === 0
      }

      if (!deps.canDelete) {
        deps.message = `This ontology has ${entityCount} entity types and ${edgeCount} edge types defined. Please remove all definitions before deleting the ontology.`
      }

      setDependencies(deps)
    } catch {
      setError('Failed to check dependencies')
    } finally {
      setCheckingDependencies(false)
    }
  }, [ontology])

  useEffect(() => {
    if (open && ontology) {
      checkDependencies()
    }
  }, [open, ontology, checkDependencies])


  const handleDelete = async () => {
    if (!dependencies?.canDelete) return

    setLoading(true)
    setError(null)

    try {
      await ontologyService.delete(ontology.id)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ontology')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Ontology</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{ontology?.fields.Name}"?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {checkingDependencies && (
            <div className="text-sm text-muted-foreground">
              Checking dependencies...
            </div>
          )}

          {dependencies && !dependencies.canDelete && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>{dependencies.message}</p>
                  <div className="flex gap-2">
                    {dependencies.entityCount > 0 && (
                      <Badge variant="outline">
                        {dependencies.entityCount} Entity Types
                      </Badge>
                    )}
                    {dependencies.edgeCount > 0 && (
                      <Badge variant="outline">
                        {dependencies.edgeCount} Edge Types
                      </Badge>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {dependencies && dependencies.canDelete && (
            <Alert>
              <AlertDescription>
                This action cannot be undone. The ontology and all its metadata will be permanently deleted.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading || checkingDependencies || !dependencies?.canDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete Ontology'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}