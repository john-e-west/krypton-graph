export interface EntityTypeDefinition {
  id: string
  ontologyId: string
  name: string  // PascalCase class name
  description: string
  baseClass: 'BaseModel' | 'CustomBase'
  fields: EntityField[]
  metadata: {
    icon?: string
    color?: string
    category?: string
  }
  validation: {
    isValid: boolean
    errors: ValidationError[]
    warnings: ValidationWarning[]
  }
}

export interface EntityField {
  name: string
  type: FieldType
  isOptional: boolean
  description?: string
  default?: any
  constraints?: FieldConstraints
  metadata?: {
    uiOrder: number
    uiHidden?: boolean
  }
}

export type PrimitiveFieldType = 'str' | 'int' | 'float' | 'bool' | 'datetime'

export type FieldType = 
  | PrimitiveFieldType
  | { list: FieldType }
  | { dict: { key: FieldType, value: FieldType } }
  | { union: FieldType[] }
  | { custom: string }

export interface FieldConstraints {
  // String constraints
  minLength?: number
  maxLength?: number
  pattern?: string
  
  // Numeric constraints
  gt?: number
  ge?: number
  lt?: number
  le?: number
  
  // General constraints
  enum?: any[]
  const?: any
  
  // Custom validators
  validators?: string[]
}

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationWarning {
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}