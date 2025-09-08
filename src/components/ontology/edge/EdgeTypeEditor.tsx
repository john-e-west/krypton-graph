import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { EdgeTypeForm } from './EdgeTypeForm'
import { EdgeAttributeEditor } from './EdgeAttributeEditor'
import { EdgeMappingEditor } from './EdgeMappingEditor'
import { EdgeTemplateLibrary } from './EdgeTemplateLibrary'
import { EdgeCodePreview } from './EdgeCodePreview'
import { Save, X } from 'lucide-react'
import { edgeService } from '../../../lib/airtable/services'
import { Alert, AlertDescription } from '../../ui/alert'

export interface EdgeTypeDefinition {
  id?: string
  ontologyId: string
  name: string
  description: string
  attributes: EdgeAttribute[]
  mappings: EdgeMapping[]
  metadata: {
    isDirectional: boolean
    category?: string
    icon?: string
    color?: string
  }
  validation: {
    isValid: boolean
    errors: ValidationError[]
  }
}

export interface EdgeAttribute {
  name: string
  type: string
  isOptional: boolean
  description?: string
  default?: any
  constraints?: Record<string, any>
}

export interface EdgeMapping {
  sourceEntity: string | '*'
  targetEntity: string | '*'
  cardinality: '1:1' | '1:n' | 'n:1' | 'n:n'
  constraints?: {
    minConnections?: number
    maxConnections?: number
    required?: boolean
  }
}

export interface ValidationError {
  field: string
  message: string
}

interface EdgeTypeEditorProps {
  ontologyId: string
  existingEdge?: EdgeTypeDefinition
  entityTypes: string[]
  onSave: (edge: EdgeTypeDefinition) => void
  onCancel: () => void
}

export const EdgeTypeEditor: React.FC<EdgeTypeEditorProps> = ({
  ontologyId,
  existingEdge,
  entityTypes,
  onSave,
  onCancel
}) => {
  const [activeTab, setActiveTab] = useState('form')
  const [edgeType, setEdgeType] = useState<EdgeTypeDefinition>(() => existingEdge || {
    ontologyId,
    name: '',
    description: '',
    attributes: [],
    mappings: [],
    metadata: {
      isDirectional: true,
      category: undefined
    },
    validation: {
      isValid: false,
      errors: []
    }
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Using singleton service from services index

  useEffect(() => {
    validateEdgeType()
  }, [edgeType])

  const validateEdgeType = () => {
    const errors: ValidationError[] = []

    // Validate name
    if (!edgeType.name) {
      errors.push({ field: 'name', message: 'Edge name is required' })
    } else if (!edgeType.name.match(/^[A-Z][a-zA-Z0-9]*$/)) {
      errors.push({ field: 'name', message: 'Edge name must be PascalCase' })
    }

    // Validate mappings
    if (edgeType.mappings.length === 0) {
      errors.push({ field: 'mappings', message: 'At least one edge mapping is required' })
    }

    // Check for duplicate mappings
    const mappingKeys = edgeType.mappings.map(m => `${m.sourceEntity}->${m.targetEntity}`)
    const duplicates = mappingKeys.filter((key, index) => mappingKeys.indexOf(key) !== index)
    if (duplicates.length > 0) {
      errors.push({ field: 'mappings', message: `Duplicate mapping: ${duplicates[0]}` })
    }

    // Check entity existence
    edgeType.mappings.forEach((mapping, index) => {
      if (mapping.sourceEntity !== '*' && !entityTypes.includes(mapping.sourceEntity)) {
        errors.push({
          field: `mappings.${index}.sourceEntity`,
          message: `Entity type '${mapping.sourceEntity}' not found`
        })
      }
      if (mapping.targetEntity !== '*' && !entityTypes.includes(mapping.targetEntity)) {
        errors.push({
          field: `mappings.${index}.targetEntity`,
          message: `Entity type '${mapping.targetEntity}' not found`
        })
      }
    })

    // Validate attributes
    const attributeNames = edgeType.attributes.map(a => a.name)
    const duplicateAttrs = attributeNames.filter((name, index) => attributeNames.indexOf(name) !== index)
    if (duplicateAttrs.length > 0) {
      errors.push({ field: 'attributes', message: `Duplicate attribute: ${duplicateAttrs[0]}` })
    }

    setEdgeType(prev => ({
      ...prev,
      validation: {
        isValid: errors.length === 0,
        errors
      }
    }))
  }

  const handleFormUpdate = (updates: Partial<EdgeTypeDefinition>) => {
    setEdgeType(prev => ({
      ...prev,
      ...updates
    }))
  }

  const handleAttributesUpdate = (attributes: EdgeAttribute[]) => {
    setEdgeType(prev => ({
      ...prev,
      attributes
    }))
  }

  const handleMappingsUpdate = (mappings: EdgeMapping[]) => {
    setEdgeType(prev => ({
      ...prev,
      mappings
    }))
  }

  const handleTemplateSelect = (template: EdgeTypeDefinition) => {
    setEdgeType({
      ...template,
      ontologyId,
      validation: {
        isValid: false,
        errors: []
      }
    })
    setActiveTab('form')
  }

  const handleSave = async () => {
    if (!edgeType.validation.isValid) {
      setError('Please fix validation errors before saving')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // For now, we'll save the primary mapping to Airtable
      // In a real implementation, we'd need to handle multiple mappings
      const primaryMapping = edgeType.mappings[0]
      
      if (primaryMapping && primaryMapping.sourceEntity !== '*' && primaryMapping.targetEntity !== '*') {
        // Convert cardinality format
        const cardinalityMap: Record<string, 'one-to-one' | 'one-to-many' | 'many-to-many'> = {
          '1:1': 'one-to-one',
          '1:n': 'one-to-many',
          'n:1': 'one-to-many',
          'n:n': 'many-to-many'
        }

        const propertiesJson = JSON.stringify({
          attributes: edgeType.attributes,
          metadata: edgeType.metadata
        })

        // We would need entity IDs here, not just names
        // This is a simplified version - in production we'd look up the entity IDs
        await edgeService.createEdge({
          name: edgeType.name,
          ontologyId: edgeType.ontologyId,
          sourceEntityId: primaryMapping.sourceEntity, // This should be an ID
          targetEntityId: primaryMapping.targetEntity, // This should be an ID
          edgeClass: edgeType.metadata.category,
          propertiesJson,
          cardinality: cardinalityMap[primaryMapping.cardinality],
          bidirectional: !edgeType.metadata.isDirectional,
          description: edgeType.description
        })
      }

      onSave(edgeType)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save edge type')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container max-w-6xl mx-auto space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {existingEdge ? 'Edit Edge Type' : 'Create Edge Type'}
          </h2>
          <p className="text-muted-foreground">
            Define relationships between entity types
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!edgeType.validation.isValid || saving}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Edge Type'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {edgeType.validation.errors.length > 0 && (
        <Alert>
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold">Validation Issues:</p>
              {edgeType.validation.errors.map((err, idx) => (
                <p key={idx} className="text-sm">
                  • {err.field}: {err.message}
                </p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="form">Details</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="mappings">Mappings</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Edge Type Details</CardTitle>
              <CardDescription>
                Basic information about the edge type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EdgeTypeForm
                edgeType={edgeType}
                onChange={handleFormUpdate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attributes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Edge Attributes</CardTitle>
              <CardDescription>
                Define attributes for this edge type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EdgeAttributeEditor
                attributes={edgeType.attributes}
                onChange={handleAttributesUpdate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mappings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Entity Mappings</CardTitle>
              <CardDescription>
                Configure which entities this edge can connect
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EdgeMappingEditor
                mappings={edgeType.mappings}
                entityTypes={entityTypes}
                onChange={handleMappingsUpdate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <EdgeTemplateLibrary
            onSelect={handleTemplateSelect}
            entityTypes={entityTypes}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <EdgeCodePreview edgeType={edgeType} />
        </TabsContent>
      </Tabs>
    </div>
  )
}