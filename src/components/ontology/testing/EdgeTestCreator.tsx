import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Link2, Save } from 'lucide-react'
import FieldRenderer from './FieldRenderer'
import type { TestEntity, TestEdge } from '@/types/testing'
import type { EntityField } from '@/types/ontology'

interface EdgeTypeDefinition {
  id: string
  name: string
  sourceTypes: string[]
  targetTypes: string[]
  attributes: EntityField[]
}

interface EdgeTestCreatorProps {
  edgeType: EdgeTypeDefinition
  availableEntities: TestEntity[]
  onSave: (edge: TestEdge) => void
  onCancel: () => void
}

export default function EdgeTestCreator({
  edgeType,
  availableEntities,
  onSave,
  onCancel
}: EdgeTestCreatorProps) {
  const [sourceEntityId, setSourceEntityId] = useState<string>('')
  const [targetEntityId, setTargetEntityId] = useState<string>('')
  const [attributes, setAttributes] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<string[]>([])

  // Filter entities by valid source/target types
  const validSources = availableEntities.filter(e => 
    edgeType.sourceTypes.includes(e.entityTypeName)
  )
  const validTargets = availableEntities.filter(e => 
    edgeType.targetTypes.includes(e.entityTypeName)
  )

  const updateAttribute = (name: string, value: any) => {
    setAttributes(prev => ({ ...prev, [name]: value }))
  }

  const validate = (): boolean => {
    const validationErrors: string[] = []

    if (!sourceEntityId) {
      validationErrors.push('Source entity is required')
    }
    if (!targetEntityId) {
      validationErrors.push('Target entity is required')
    }
    if (sourceEntityId === targetEntityId) {
      validationErrors.push('Source and target must be different entities')
    }

    // Validate required attributes
    edgeType.attributes.forEach(attr => {
      if (!attr.isOptional && !attributes[attr.name]) {
        validationErrors.push(`${attr.name} is required`)
      }
    })

    setErrors(validationErrors)
    return validationErrors.length === 0
  }

  const handleSave = () => {
    if (!validate()) return

    const testEdge: TestEdge = {
      id: `test-edge-${Date.now()}`,
      edgeTypeId: edgeType.id,
      edgeTypeName: edgeType.name,
      sourceEntityId,
      targetEntityId,
      attributes,
      validation: {
        isValid: true,
        errors: []
      }
    }

    onSave(testEdge)
  }

  const getEntityLabel = (entity: TestEntity) => {
    // Try to find a name field for display
    const nameField = entity.data.name || entity.data.title || entity.data.label || 
                     entity.data.first_name || Object.values(entity.data)[0]
    return `${entity.entityTypeName}: ${nameField || entity.id}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Create Test Edge: {edgeType.name}
        </CardTitle>
        <CardDescription>
          Connect two entities with a {edgeType.name} relationship
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Source Entity</Label>
            <Select value={sourceEntityId} onValueChange={setSourceEntityId}>
              <SelectTrigger>
                <SelectValue placeholder="Select source entity" />
              </SelectTrigger>
              <SelectContent>
                {validSources.length === 0 ? (
                  <div className="py-2 px-2 text-sm text-muted-foreground">
                    No valid source entities
                  </div>
                ) : (
                  validSources.map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {getEntityLabel(entity)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {edgeType.sourceTypes.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Valid types: {edgeType.sourceTypes.join(', ')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Target Entity</Label>
            <Select value={targetEntityId} onValueChange={setTargetEntityId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target entity" />
              </SelectTrigger>
              <SelectContent>
                {validTargets.length === 0 ? (
                  <div className="py-2 px-2 text-sm text-muted-foreground">
                    No valid target entities
                  </div>
                ) : (
                  validTargets.map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {getEntityLabel(entity)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {edgeType.targetTypes.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Valid types: {edgeType.targetTypes.join(', ')}
              </p>
            )}
          </div>
        </div>

        {sourceEntityId && targetEntityId && (
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">
                {getEntityLabel(availableEntities.find(e => e.id === sourceEntityId)!)}
              </span>
              <Link2 className="h-4 w-4" />
              <span className="font-medium">
                {getEntityLabel(availableEntities.find(e => e.id === targetEntityId)!)}
              </span>
            </div>
          </div>
        )}

        {edgeType.attributes.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium">Edge Attributes</h3>
            {edgeType.attributes.map(attr => (
              <FieldRenderer
                key={attr.name}
                field={attr}
                value={attributes[attr.name]}
                onChange={(value) => updateAttribute(attr.name, value)}
              />
            ))}
          </div>
        )}

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Create Edge
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}