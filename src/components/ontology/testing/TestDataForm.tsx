import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Save, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import FieldRenderer from './FieldRenderer'
import type { EntityTypeDefinition } from '@/types/ontology'
import type { TestEntity } from '@/types/testing'
import { validateEntityType } from '@/lib/ontology/validation'

interface TestDataFormProps {
  entityTypes: EntityTypeDefinition[]
  onEntityCreated: (testEntity: TestEntity) => void
  existingEntities?: TestEntity[]
}

export default function TestDataForm({
  entityTypes,
  onEntityCreated,
  existingEntities = []
}: TestDataFormProps) {
  const [selectedEntityTypeId, setSelectedEntityTypeId] = useState<string>('')
  const entityType = entityTypes.find(et => et.id === selectedEntityTypeId)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const updateField = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
    // Clear field errors when user modifies the field
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
  }

  const validateForm = (): boolean => {
    if (!entityType) return false
    
    const errors: Record<string, string[]> = {}
    const globalErrors: string[] = []
    
    // Check required fields
    entityType.fields.forEach(field => {
      const value = formData[field.name]
      
      if (!field.isOptional && (value === undefined || value === null || value === '')) {
        if (!errors[field.name]) errors[field.name] = []
        errors[field.name].push('This field is required')
      }
      
      // Type-specific validation
      if (value !== undefined && value !== null) {
        const fieldType = field.type
        
        if (typeof fieldType === 'string') {
          switch (fieldType) {
            case 'int':
              if (!Number.isInteger(Number(value))) {
                if (!errors[field.name]) errors[field.name] = []
                errors[field.name].push('Must be an integer')
              }
              break
            case 'float':
              if (isNaN(Number(value))) {
                if (!errors[field.name]) errors[field.name] = []
                errors[field.name].push('Must be a number')
              }
              break
            case 'datetime':
              if (!Date.parse(value)) {
                if (!errors[field.name]) errors[field.name] = []
                errors[field.name].push('Invalid date format')
              }
              break
          }
        }
        
        // Apply constraints
        if (field.constraints) {
          const constraints = field.constraints
          
          if (typeof value === 'string') {
            if (constraints.minLength && value.length < constraints.minLength) {
              if (!errors[field.name]) errors[field.name] = []
              errors[field.name].push(`Minimum length is ${constraints.minLength}`)
            }
            if (constraints.maxLength && value.length > constraints.maxLength) {
              if (!errors[field.name]) errors[field.name] = []
              errors[field.name].push(`Maximum length is ${constraints.maxLength}`)
            }
            if (constraints.pattern) {
              const regex = new RegExp(constraints.pattern)
              if (!regex.test(value)) {
                if (!errors[field.name]) errors[field.name] = []
                errors[field.name].push('Does not match required pattern')
              }
            }
          }
          
          if (typeof value === 'number') {
            if (constraints.gt !== undefined && value <= constraints.gt) {
              if (!errors[field.name]) errors[field.name] = []
              errors[field.name].push(`Must be greater than ${constraints.gt}`)
            }
            if (constraints.ge !== undefined && value < constraints.ge) {
              if (!errors[field.name]) errors[field.name] = []
              errors[field.name].push(`Must be greater than or equal to ${constraints.ge}`)
            }
            if (constraints.lt !== undefined && value >= constraints.lt) {
              if (!errors[field.name]) errors[field.name] = []
              errors[field.name].push(`Must be less than ${constraints.lt}`)
            }
            if (constraints.le !== undefined && value > constraints.le) {
              if (!errors[field.name]) errors[field.name] = []
              errors[field.name].push(`Must be less than or equal to ${constraints.le}`)
            }
          }
          
          if (constraints.enum && !constraints.enum.includes(value)) {
            if (!errors[field.name]) errors[field.name] = []
            errors[field.name].push('Value not in allowed options')
          }
        }
      }
    })
    
    setFieldErrors(errors)
    setValidationErrors(globalErrors)
    
    return Object.keys(errors).length === 0 && globalErrors.length === 0
  }

  const handleSave = () => {
    if (!entityType || !validateForm()) {
      return
    }
    
    const testEntity: TestEntity = {
      id: `test-entity-${Date.now()}`,
      entityTypeId: entityType.id,
      entityTypeName: entityType.name,
      data: formData,
      validation: {
        isValid: true,
        errors: []
      },
      metadata: {
        createdAt: new Date(),
        createdBy: 'user',
        isTestData: true
      }
    }
    
    // Run entity validation
    const validationResult = validateEntityType({
      ...entityType,
      fields: entityType.fields.map(field => ({
        ...field,
        name: formData[field.name] !== undefined ? field.name : field.name
      }))
    })
    
    testEntity.validation = {
      isValid: validationResult.isValid,
      errors: validationResult.errors
    }
    
    onEntityCreated(testEntity)
    // Reset form
    setFormData({})
    setFieldErrors({})
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Test Entity</CardTitle>
        <CardDescription>
          Select an entity type and fill in the fields to create a test instance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Entity Type</Label>
          <Select value={selectedEntityTypeId} onValueChange={setSelectedEntityTypeId}>
            <SelectTrigger>
              <SelectValue placeholder="Select an entity type" />
            </SelectTrigger>
            <SelectContent>
              {entityTypes.map(et => (
                <SelectItem key={et.id} value={et.id}>
                  {et.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {entityType && entityType.fields.map(field => (
          <FieldRenderer
            key={field.name}
            field={field}
            value={formData[field.name]}
            onChange={(value) => updateField(field.name, value)}
            errors={fieldErrors[field.name]}
          />
        ))}
        
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {validationErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {entityType && (
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setFormData({})
                setFieldErrors({})
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Test Entity
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}