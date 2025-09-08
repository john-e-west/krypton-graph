import type { EntityTypeDefinition, ValidationResult, ValidationError, ValidationWarning } from '@/types/ontology'

export const PROTECTED_ATTRIBUTES = [
  'uuid', 'id', 'name', 'created_at', 'updated_at',
  'entity_type', 'entity_definition_id', 'document_id'
]

export const PYTHON_RESERVED = [
  'class', 'def', 'return', 'if', 'else', 'elif',
  'for', 'while', 'import', 'from', 'as', 'with',
  'try', 'except', 'finally', 'raise', 'assert',
  'pass', 'break', 'continue', 'del', 'is', 'in',
  'not', 'and', 'or', 'lambda', 'yield', 'global',
  'nonlocal', 'True', 'False', 'None'
]

export function validateEntityType(entity: EntityTypeDefinition): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  
  // Check entity name
  if (!entity.name.match(/^[A-Z][a-zA-Z0-9]*$/)) {
    errors.push({
      field: 'name',
      message: 'Entity name must be PascalCase'
    })
  }
  
  // Check for duplicate fields
  const fieldNames = entity.fields.map(f => f.name)
  const duplicates = new Set(
    fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index)
  )
  
  duplicates.forEach(name => {
    errors.push({
      field: name,
      message: `Duplicate field name: ${name}`
    })
  })
  
  // Check field names and constraints
  entity.fields.forEach(field => {
    if (PROTECTED_ATTRIBUTES.includes(field.name)) {
      errors.push({
        field: field.name,
        message: `Field name '${field.name}' is protected`
      })
    }
    
    if (PYTHON_RESERVED.includes(field.name)) {
      errors.push({
        field: field.name,
        message: `Field name '${field.name}' is a Python reserved word`
      })
    }
    
    // Check field name format
    if (!field.name.match(/^[a-z][a-z0-9_]*$/)) {
      errors.push({
        field: field.name,
        message: `Field name '${field.name}' must be snake_case`
      })
    }
    
    // Validate field constraints
    if (field.constraints) {
      // Check regex pattern validity
      if (field.constraints.pattern) {
        try {
          new RegExp(field.constraints.pattern)
        } catch (e) {
          errors.push({
            field: field.name,
            message: `Invalid regex pattern: ${field.constraints.pattern}`
          })
        }
      }
      
      // Check enum constraints
      if (field.constraints.enum !== undefined) {
        if (!Array.isArray(field.constraints.enum) || field.constraints.enum.length === 0) {
          errors.push({
            field: field.name,
            message: 'Enum constraint must have at least one value'
          })
        } else {
          // Check for duplicate enum values
          const enumSet = new Set(field.constraints.enum)
          if (enumSet.size < field.constraints.enum.length) {
            warnings.push({
              field: field.name,
              message: 'Enum contains duplicate values'
            })
          }
          
          // Check for mixed types in enum
          const types = new Set(field.constraints.enum.map(v => typeof v))
          if (types.size > 1) {
            warnings.push({
              field: field.name,
              message: 'Enum contains mixed types - ensure this is intentional'
            })
          }
        }
      }
      
      // Check numeric constraints
      if (field.type === 'int' || field.type === 'float') {
        const { ge, gt, le, lt } = field.constraints
        
        // Check for conflicting min/max constraints
        const min = ge !== undefined ? ge : gt !== undefined ? gt : null
        const max = le !== undefined ? le : lt !== undefined ? lt : null
        
        if (min !== null && max !== null && min > max) {
          errors.push({
            field: field.name,
            message: `Minimum value (${min}) cannot be greater than maximum value (${max})`
          })
        }
      }
      
      // Check string length constraints
      if (field.type === 'str') {
        if (field.constraints.minLength !== undefined && field.constraints.minLength < 0) {
          errors.push({
            field: field.name,
            message: 'String length constraints must be non-negative'
          })
        }
        if (field.constraints.maxLength !== undefined && field.constraints.maxLength < 0) {
          errors.push({
            field: field.name,
            message: 'String length constraints must be non-negative'
          })
        }
      }
    }
    
    // Validate default values against constraints
    if (field.default !== undefined && field.constraints) {
      const { ge, gt, le, lt, enum: enumValues } = field.constraints
      
      // Check numeric default against constraints
      if (typeof field.default === 'number') {
        if (ge !== undefined && field.default < ge) {
          errors.push({
            field: field.name,
            message: `Default value (${field.default}) violates field constraints`
          })
        }
        if (gt !== undefined && field.default <= gt) {
          errors.push({
            field: field.name,
            message: `Default value (${field.default}) violates field constraints`
          })
        }
        if (le !== undefined && field.default > le) {
          errors.push({
            field: field.name,
            message: `Default value (${field.default}) violates field constraints`
          })
        }
        if (lt !== undefined && field.default >= lt) {
          errors.push({
            field: field.name,
            message: `Default value (${field.default}) violates field constraints`
          })
        }
      }
      
      // Check default against enum values
      if (enumValues && !enumValues.includes(field.default)) {
        errors.push({
          field: field.name,
          message: `Default value (${field.default}) is not in enum values`
        })
      }
    }
  })
  
  // Add warnings for best practices
  if (!entity.description) {
    warnings.push({
      field: 'description',
      message: 'Consider adding a description for better documentation'
    })
  }
  
  entity.fields.forEach(field => {
    if (!field.description) {
      warnings.push({
        field: field.name,
        message: `Consider adding a description for field '${field.name}'`
      })
    }
  })
  
  return { isValid: errors.length === 0, errors, warnings }
}