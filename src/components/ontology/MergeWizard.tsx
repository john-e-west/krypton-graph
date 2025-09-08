import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, CheckCircle, XCircle, ArrowRight, Merge, Settings } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TypeDefinition {
  id: string
  name: string
  description: string
  pattern?: string
  attributes?: Array<{
    name: string
    type: string
    required: boolean
  }>
}

interface EdgeTypeDefinition {
  id: string
  name: string
  description: string
  sourceTypes: string[]
  targetTypes: string[]
  pattern?: string
}

interface OntologyDefinition {
  entityTypes: TypeDefinition[]
  edgeTypes: EdgeTypeDefinition[]
  domain?: string
  tags?: string[]
}

interface MergeConflict {
  id: string
  type: 'entity_name_conflict' | 'edge_name_conflict' | 'type_mismatch' | 'attribute_conflict'
  description: string
  conflictingItems: Array<{
    ontologyIndex: number
    item: any
    source: string
  }>
  suggestedResolution?: string
}

interface ConflictResolution {
  conflictId: string
  resolution: 'use_first' | 'use_second' | 'merge' | 'rename_first' | 'rename_second'
  newName?: string
  newDescription?: string
  mergedAttributes?: any[]
}

interface MergeWizardProps {
  availableOntologies: Array<{
    id: string
    name: string
    description: string
    ontology: OntologyDefinition
  }>
  onMergeComplete?: (mergedOntology: OntologyDefinition) => void
  onCancel?: () => void
}

type WizardStep = 'select' | 'resolve' | 'preview' | 'complete'

export function MergeWizard({ availableOntologies, onMergeComplete, onCancel }: MergeWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('select')
  const [selectedOntologies, setSelectedOntologies] = useState<string[]>([])
  const [mergeStrategy, setMergeStrategy] = useState<'union' | 'intersection' | 'custom'>('union')
  const [conflicts, setConflicts] = useState<MergeConflict[]>([])
  const [conflictResolutions, setConflictResolutions] = useState<ConflictResolution[]>([])
  const [mergedOntology, setMergedOntology] = useState<OntologyDefinition | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mergeOptions, setMergeOptions] = useState({
    allowRename: true,
    enforceTypeLimits: true,
    preserveMetadata: true
  })

  const selectedOntologyObjects = selectedOntologies
    .map(id => availableOntologies.find(ont => ont.id === id))
    .filter(Boolean) as Array<{
      id: string
      name: string
      description: string
      ontology: OntologyDefinition
    }>

  const handleOntologySelection = useCallback((ontologyId: string, selected: boolean) => {
    setSelectedOntologies(prev => {
      if (selected) {
        return [...prev, ontologyId]
      } else {
        return prev.filter(id => id !== ontologyId)
      }
    })
  }, [])

  const detectConflicts = useCallback(async () => {
    if (selectedOntologyObjects.length < 2) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ontologies/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ontologies: selectedOntologyObjects.map(ont => ont.ontology),
          strategy: mergeStrategy,
          mergeOptions
        })
      })

      const data = await response.json()

      if (response.status === 409) {
        // Conflicts detected
        setConflicts(data.conflicts || [])
        setCurrentStep('resolve')
      } else if (response.ok) {
        // No conflicts, merge successful
        setMergedOntology(data.mergedOntology)
        setCurrentStep('preview')
      } else {
        throw new Error(data.error || 'Failed to analyze ontologies')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [selectedOntologyObjects, mergeStrategy, mergeOptions])

  const performMerge = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ontologies/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ontologies: selectedOntologyObjects.map(ont => ont.ontology),
          strategy: mergeStrategy,
          conflictResolutions,
          mergeOptions
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMergedOntology(data.mergedOntology)
        setCurrentStep('preview')
      } else {
        throw new Error(data.error || 'Failed to merge ontologies')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [selectedOntologyObjects, mergeStrategy, conflictResolutions, mergeOptions])

  const handleConflictResolution = useCallback((conflictId: string, resolution: ConflictResolution) => {
    setConflictResolutions(prev => {
      const existing = prev.findIndex(r => r.conflictId === conflictId)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = resolution
        return updated
      } else {
        return [...prev, resolution]
      }
    })
  }, [])

  const completeWizard = useCallback(() => {
    if (mergedOntology && onMergeComplete) {
      onMergeComplete(mergedOntology)
    }
    setCurrentStep('complete')
  }, [mergedOntology, onMergeComplete])

  const renderStepContent = () => {
    switch (currentStep) {
      case 'select':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Ontologies to Merge</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose 2-5 ontologies to combine. Conflicts will be detected and can be resolved in the next step.
              </p>
              
              <div className="space-y-3">
                {availableOntologies.map((ontology) => (
                  <Card key={ontology.id} className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedOntologies.includes(ontology.id)}
                        onCheckedChange={(checked) => 
                          handleOntologySelection(ontology.id, checked as boolean)
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{ontology.name}</h4>
                          <div className="flex space-x-2">
                            <Badge variant="secondary">
                              {ontology.ontology.entityTypes.length} entities
                            </Badge>
                            <Badge variant="outline">
                              {ontology.ontology.edgeTypes.length} edges
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {ontology.description}
                        </p>
                        {ontology.ontology.domain && (
                          <Badge variant="outline" className="mt-2">
                            {ontology.ontology.domain}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="merge-strategy">Merge Strategy</Label>
                <Select value={mergeStrategy} onValueChange={(value: any) => setMergeStrategy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="union">Union - Combine all types</SelectItem>
                    <SelectItem value="intersection">Intersection - Only common types</SelectItem>
                    <SelectItem value="custom">Custom - Manual control</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Merge Options</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={mergeOptions.allowRename}
                      onCheckedChange={(checked) =>
                        setMergeOptions(prev => ({ ...prev, allowRename: checked as boolean }))
                      }
                    />
                    <Label className="text-sm">Allow renaming conflicting types</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={mergeOptions.enforceTypeLimits}
                      onCheckedChange={(checked) =>
                        setMergeOptions(prev => ({ ...prev, enforceTypeLimits: checked as boolean }))
                      }
                    />
                    <Label className="text-sm">Enforce Zep v3 type limits (10 max each)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={mergeOptions.preserveMetadata}
                      onCheckedChange={(checked) =>
                        setMergeOptions(prev => ({ ...prev, preserveMetadata: checked as boolean }))
                      }
                    />
                    <Label className="text-sm">Preserve metadata from source ontologies</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'resolve':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Resolve Conflicts</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The following conflicts were detected between the selected ontologies. Please choose how to resolve each one.
              </p>
            </div>

            <div className="space-y-4">
              {conflicts.map((conflict) => (
                <ConflictResolutionCard
                  key={conflict.id}
                  conflict={conflict}
                  selectedOntologies={selectedOntologyObjects}
                  onResolutionChange={(resolution) => handleConflictResolution(conflict.id, resolution)}
                />
              ))}
            </div>
          </div>
        )

      case 'preview':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Preview Merged Ontology</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Review the final merged ontology before completing the process.
              </p>
            </div>

            {mergedOntology && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-center">
                      {mergedOntology.entityTypes.length}
                    </div>
                    <div className="text-sm text-center text-muted-foreground">Entity Types</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-center">
                      {mergedOntology.edgeTypes.length}
                    </div>
                    <div className="text-sm text-center text-muted-foreground">Edge Types</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-center">
                      {selectedOntologies.length}
                    </div>
                    <div className="text-sm text-center text-muted-foreground">Source Ontologies</div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Entity Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {mergedOntology.entityTypes.map((type) => (
                          <div key={type.id} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{type.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {type.attributes?.length || 0} attrs
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Edge Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {mergedOntology.edgeTypes.map((type) => (
                          <div key={type.id} className="text-sm">
                            <div className="font-medium">{type.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {type.sourceTypes.join(', ')} → {type.targetTypes.join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )

      case 'complete':
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Merge Complete!</h3>
              <p className="text-sm text-muted-foreground">
                Your ontologies have been successfully merged. The new ontology is ready to use.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const getStepButtons = () => {
    switch (currentStep) {
      case 'select':
        return (
          <>
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={detectConflicts}
              disabled={selectedOntologies.length < 2 || isLoading}
            >
              {isLoading ? 'Analyzing...' : 'Next: Analyze'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </>
        )

      case 'resolve':
        return (
          <>
            <Button
              variant="outline"
              onClick={() => setCurrentStep('select')}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              onClick={performMerge}
              disabled={conflicts.some(c => !conflictResolutions.find(r => r.conflictId === c.id)) || isLoading}
            >
              {isLoading ? 'Merging...' : 'Merge Ontologies'}
              <Merge className="w-4 h-4 ml-2" />
            </Button>
          </>
        )

      case 'preview':
        return (
          <>
            <Button
              variant="outline"
              onClick={() => setCurrentStep(conflicts.length > 0 ? 'resolve' : 'select')}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button onClick={completeWizard}>
              Complete Merge
              <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          </>
        )

      case 'complete':
        return (
          <Button onClick={onCancel}>
            Close
          </Button>
        )

      default:
        return null
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Merge className="w-5 h-5" />
          <span>Ontology Merge Wizard</span>
        </CardTitle>
        <CardDescription>
          Combine multiple ontologies while resolving conflicts and maintaining consistency
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className={`flex items-center space-x-2 ${
              ['select', 'resolve', 'preview', 'complete'].indexOf(currentStep) >= 0 ? 'text-primary' : 'text-muted-foreground'
            }`}>
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                1
              </div>
              <span className="text-sm font-medium">Select</span>
            </div>
            <Separator className="flex-1 mx-4" />
            <div className={`flex items-center space-x-2 ${
              ['resolve', 'preview', 'complete'].indexOf(currentStep) >= 0 ? 'text-primary' : 'text-muted-foreground'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                ['resolve', 'preview', 'complete'].indexOf(currentStep) >= 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Resolve</span>
            </div>
            <Separator className="flex-1 mx-4" />
            <div className={`flex items-center space-x-2 ${
              ['preview', 'complete'].indexOf(currentStep) >= 0 ? 'text-primary' : 'text-muted-foreground'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                ['preview', 'complete'].indexOf(currentStep) >= 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                3
              </div>
              <span className="text-sm font-medium">Preview</span>
            </div>
            <Separator className="flex-1 mx-4" />
            <div className={`flex items-center space-x-2 ${
              currentStep === 'complete' ? 'text-primary' : 'text-muted-foreground'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'complete' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                4
              </div>
              <span className="text-sm font-medium">Complete</span>
            </div>
          </div>
        </div>

        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        <div className="flex justify-between mt-6">
          {getStepButtons()}
        </div>
      </CardContent>
    </Card>
  )
}

interface ConflictResolutionCardProps {
  conflict: MergeConflict
  selectedOntologies: Array<{
    id: string
    name: string
    ontology: OntologyDefinition
  }>
  onResolutionChange: (resolution: ConflictResolution) => void
}

function ConflictResolutionCard({ conflict, selectedOntologies, onResolutionChange }: ConflictResolutionCardProps) {
  const [resolution, setResolution] = useState<ConflictResolution['resolution']>('use_first')
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const handleResolutionChange = useCallback((newResolution: ConflictResolution['resolution']) => {
    setResolution(newResolution)
    onResolutionChange({
      conflictId: conflict.id,
      resolution: newResolution,
      newName: newResolution.includes('rename') ? newName : undefined,
      newDescription: newResolution === 'merge' ? newDescription : undefined
    })
  }, [conflict.id, newName, newDescription, onResolutionChange])

  return (
    <Card className="p-4 border-l-4 border-l-yellow-500">
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-sm">{conflict.description}</h4>
            <div className="mt-2 space-y-2">
              {conflict.conflictingItems.map((item, index) => (
                <div key={index} className="text-xs bg-muted p-2 rounded">
                  <div className="font-medium">{item.source}: {item.item.name}</div>
                  <div className="text-muted-foreground">{item.item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Resolution Strategy</Label>
          <Select value={resolution} onValueChange={handleResolutionChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="use_first">Use first definition</SelectItem>
              <SelectItem value="use_second">Use second definition</SelectItem>
              <SelectItem value="merge">Merge definitions</SelectItem>
              <SelectItem value="rename_first">Rename first and keep both</SelectItem>
              <SelectItem value="rename_second">Rename second and keep both</SelectItem>
            </SelectContent>
          </Select>

          {(resolution === 'rename_first' || resolution === 'rename_second') && (
            <div className="space-y-2">
              <Label className="text-sm">New Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new name..."
              />
            </div>
          )}

          {resolution === 'merge' && (
            <div className="space-y-2">
              <Label className="text-sm">Merged Description</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Enter merged description..."
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}