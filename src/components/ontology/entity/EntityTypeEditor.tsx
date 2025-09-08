import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Save, X } from 'lucide-react'
import type { EntityTypeDefinition, EntityField, ValidationResult } from '@/types/ontology'
import { validateEntityType } from '@/lib/ontology/validation'
import { generatePydanticCode } from '@/lib/ontology/codeGenerator'
import EntityTypeForm from './EntityTypeForm'
import FieldList from './FieldList'
import CodePreview from './CodePreview'
import ValidationPanel from './ValidationPanel'

interface EntityTypeEditorProps {
  initialEntity?: EntityTypeDefinition
  ontologyId: string
  onSave: (entity: EntityTypeDefinition) => void
  onCancel: () => void
}

export default function EntityTypeEditor({
  initialEntity,
  ontologyId,
  onSave,
  onCancel
}: EntityTypeEditorProps) {
  const [entity, setEntity] = useState<EntityTypeDefinition>(
    initialEntity || {
      id: '',
      ontologyId,
      name: '',
      description: '',
      baseClass: 'BaseModel',
      fields: [],
      metadata: {},
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      }
    }
  )

  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  })

  const [generatedCode, setGeneratedCode] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('form')

  useEffect(() => {
    const result = validateEntityType(entity)
    setValidation(result)
    setEntity(prev => ({
      ...prev,
      validation: result
    }))
    
    if (entity.name && entity.fields.length > 0) {
      try {
        const code = generatePydanticCode(entity)
        setGeneratedCode(code)
      } catch (error) {
        console.error('Code generation error:', error)
        setGeneratedCode('# Error generating code')
      }
    } else {
      setGeneratedCode('')
    }
  }, [entity])

  const updateEntity = (updates: Partial<EntityTypeDefinition>) => {
    setEntity(prev => ({ ...prev, ...updates }))
  }

  const addField = () => {
    const newField: EntityField = {
      name: `field_${entity.fields.length + 1}`,
      type: 'str',
      isOptional: false,
      metadata: {
        uiOrder: entity.fields.length
      }
    }
    updateEntity({ fields: [...entity.fields, newField] })
  }

  const updateField = (index: number, field: EntityField) => {
    const updatedFields = [...entity.fields]
    updatedFields[index] = field
    updateEntity({ fields: updatedFields })
  }

  const removeField = (index: number) => {
    const updatedFields = entity.fields.filter((_, i) => i !== index)
    updatedFields.forEach((field, i) => {
      if (field.metadata) {
        field.metadata.uiOrder = i
      }
    })
    updateEntity({ fields: updatedFields })
  }

  const reorderFields = (fields: EntityField[]) => {
    fields.forEach((field, i) => {
      if (!field.metadata) {
        field.metadata = { uiOrder: i }
      } else {
        field.metadata.uiOrder = i
      }
    })
    updateEntity({ fields })
  }

  const handleSave = () => {
    if (validation.isValid) {
      onSave({
        ...entity,
        id: entity.id || `entity-${Date.now()}`
      })
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>Entity Type Editor</CardTitle>
          <CardDescription>
            Define Pydantic-based entity types with custom attributes
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="form">Definition</TabsTrigger>
              <TabsTrigger value="fields">Fields</TabsTrigger>
              <TabsTrigger value="preview">Code Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="form" className="flex-1 mt-4">
              <EntityTypeForm
                entity={entity}
                onUpdate={updateEntity}
              />
            </TabsContent>
            
            <TabsContent value="fields" className="flex-1 mt-4">
              <FieldList
                fields={entity.fields}
                onAdd={addField}
                onUpdate={updateField}
                onRemove={removeField}
                onReorder={reorderFields}
              />
            </TabsContent>
            
            <TabsContent value="preview" className="flex-1 mt-4">
              {generatedCode ? (
                <CodePreview code={generatedCode} />
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Add entity name and fields to see generated code
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
          
          {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="mt-4">
              <ValidationPanel validation={validation} />
            </div>
          )}
          
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!validation.isValid}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Entity Type
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}