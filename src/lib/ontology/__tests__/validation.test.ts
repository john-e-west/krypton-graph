import { describe, it, expect } from 'vitest'
import { validateEntityType, PROTECTED_ATTRIBUTES, PYTHON_RESERVED } from '../validation'
import type { EntityTypeDefinition } from '@/types/ontology'

describe('validateEntityType', () => {
  const createTestEntity = (overrides?: Partial<EntityTypeDefinition>): EntityTypeDefinition => ({
    id: 'test',
    ontologyId: 'test-ontology',
    name: 'TestEntity',
    description: 'Test entity',
    baseClass: 'BaseModel',
    fields: [],
    metadata: {},
    validation: {
      isValid: true,
      errors: [],
      warnings: []
    },
    ...overrides
  })
  
  describe('Entity name validation', () => {
    it('accepts valid PascalCase names', () => {
      const entity = createTestEntity({ name: 'PersonEntity' })
      const result = validateEntityType(entity)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
    
    it('rejects snake_case names', () => {
      const entity = createTestEntity({ name: 'person_entity' })
      const result = validateEntityType(entity)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          message: 'Entity name must be PascalCase'
        })
      )
    })
    
    it('rejects names starting with lowercase', () => {
      const entity = createTestEntity({ name: 'personEntity' })
      const result = validateEntityType(entity)
      expect(result.isValid).toBe(false)
    })
  })
  
  describe('Field name validation', () => {
    it('accepts valid snake_case field names', () => {
      const entity = createTestEntity({
        fields: [
          { name: 'first_name', type: 'str', isOptional: false },
          { name: 'age', type: 'int', isOptional: false }
        ]
      })
      const result = validateEntityType(entity)
      expect(result.isValid).toBe(true)
    })
    
    it('rejects protected attribute names', () => {
      const entity = createTestEntity({
        fields: [
          { name: 'uuid', type: 'str', isOptional: false }
        ]
      })
      const result = validateEntityType(entity)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'uuid',
          message: "Field name 'uuid' is protected"
        })
      )
    })
    
    it('rejects Python reserved words', () => {
      const entity = createTestEntity({
        fields: [
          { name: 'class', type: 'str', isOptional: false }
        ]
      })
      const result = validateEntityType(entity)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'class',
          message: "Field name 'class' is a Python reserved word"
        })
      )
    })
    
    it('detects duplicate field names', () => {
      const entity = createTestEntity({
        fields: [
          { name: 'email', type: 'str', isOptional: false },
          { name: 'email', type: 'str', isOptional: true }
        ]
      })
      const result = validateEntityType(entity)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'email',
          message: 'Duplicate field name: email'
        })
      )
    })
    
    it('rejects CamelCase field names', () => {
      const entity = createTestEntity({
        fields: [
          { name: 'FirstName', type: 'str', isOptional: false }
        ]
      })
      const result = validateEntityType(entity)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'FirstName',
          message: "Field name 'FirstName' must be snake_case"
        })
      )
    })
  })
  
  describe('Warnings', () => {
    it('warns about missing entity description', () => {
      const entity = createTestEntity({ description: '' })
      const result = validateEntityType(entity)
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'description',
          message: 'Consider adding a description for better documentation'
        })
      )
    })
    
    it('warns about fields without descriptions', () => {
      const entity = createTestEntity({
        fields: [
          { name: 'email', type: 'str', isOptional: false }
        ]
      })
      const result = validateEntityType(entity)
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'email',
          message: "Consider adding a description for field 'email'"
        })
      )
    })
  })
  
  describe('Protected attributes', () => {
    it('includes all expected protected attributes', () => {
      expect(PROTECTED_ATTRIBUTES).toContain('uuid')
      expect(PROTECTED_ATTRIBUTES).toContain('id')
      expect(PROTECTED_ATTRIBUTES).toContain('name')
      expect(PROTECTED_ATTRIBUTES).toContain('created_at')
      expect(PROTECTED_ATTRIBUTES).toContain('updated_at')
      expect(PROTECTED_ATTRIBUTES).toContain('entity_type')
    })
  })
  
  describe('Python reserved words', () => {
    it('includes common Python keywords', () => {
      expect(PYTHON_RESERVED).toContain('class')
      expect(PYTHON_RESERVED).toContain('def')
      expect(PYTHON_RESERVED).toContain('import')
      expect(PYTHON_RESERVED).toContain('True')
      expect(PYTHON_RESERVED).toContain('False')
      expect(PYTHON_RESERVED).toContain('None')
    })
  })
  
  describe('Complex constraint validation edge cases', () => {
    it('validates regex patterns with invalid regex', () => {
      const entity = createTestEntity({
        fields: [
          { 
            name: 'email', 
            type: 'str', 
            isOptional: false,
            constraints: {
              pattern: '[invalid(regex'
            }
          }
        ]
      })
      const result = validateEntityType(entity)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'email',
          message: expect.stringContaining('Invalid regex pattern')
        })
      )
    })
    
    it('validates enum constraints with empty array', () => {
      const entity = createTestEntity({
        fields: [
          {
            name: 'status',
            type: 'str',
            isOptional: false,
            constraints: {
              enum: []
            }
          }
        ]
      })
      const result = validateEntityType(entity)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'status',
          message: 'Enum constraint must have at least one value'
        })
      )
    })
    
    it('validates numeric constraints with conflicting min/max', () => {
      const entity = createTestEntity({
        fields: [
          {
            name: 'age',
            type: 'int',
            isOptional: false,
            constraints: {
              ge: 100,
              le: 50
            }
          }
        ]
      })
      const result = validateEntityType(entity)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'age',
          message: 'Minimum value (100) cannot be greater than maximum value (50)'
        })
      )
    })
    
    it('validates string length constraints with negative values', () => {
      const entity = createTestEntity({
        fields: [
          {
            name: 'username',
            type: 'str',
            isOptional: false,
            constraints: {
              minLength: -1,
              maxLength: 10
            }
          }
        ]
      })
      const result = validateEntityType(entity)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'username',
          message: 'String length constraints must be non-negative'
        })
      )
    })
    
    it('validates enum constraints with duplicate values', () => {
      const entity = createTestEntity({
        fields: [
          {
            name: 'category',
            type: 'str',
            isOptional: false,
            constraints: {
              enum: ['A', 'B', 'A', 'C']
            }
          }
        ]
      })
      const result = validateEntityType(entity)
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'category',
          message: 'Enum contains duplicate values'
        })
      )
    })
    
    it('validates regex patterns with valid complex expressions', () => {
      const entity = createTestEntity({
        fields: [
          {
            name: 'phone',
            type: 'str',
            isOptional: false,
            constraints: {
              pattern: '^\\+?[1-9]\\d{1,14}$'
            }
          }
        ]
      })
      const result = validateEntityType(entity)
      expect(result.errors.filter(e => e.field === 'phone')).toHaveLength(0)
    })
    
    it('validates mixed type enum values', () => {
      const entity = createTestEntity({
        fields: [
          {
            name: 'mixed_field',
            type: { union: ['str', 'int'] },
            isOptional: false,
            constraints: {
              enum: ['active', 1, 'pending', 0]
            }
          }
        ]
      })
      const result = validateEntityType(entity)
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'mixed_field',
          message: 'Enum contains mixed types - ensure this is intentional'
        })
      )
    })
    
    it('validates default values against constraints', () => {
      const entity = createTestEntity({
        fields: [
          {
            name: 'score',
            type: 'int',
            isOptional: false,
            default: 150,
            constraints: {
              ge: 0,
              le: 100
            }
          }
        ]
      })
      const result = validateEntityType(entity)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'score',
          message: 'Default value (150) violates field constraints'
        })
      )
    })
  })
})