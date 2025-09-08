/**
 * Field Type Mappers
 * Modular architecture for mapping field types to Python/Pydantic types
 */

export interface FieldTypeMapper {
  type: string
  toPython: (options?: any) => string
  validate: (value: any) => boolean
  getImports: () => string[]
}

// Base type mappers
export const StringTypeMapper: FieldTypeMapper = {
  type: 'str',
  toPython: () => 'str',
  validate: (value) => typeof value === 'string',
  getImports: () => []
}

export const IntegerTypeMapper: FieldTypeMapper = {
  type: 'int',
  toPython: () => 'int',
  validate: (value) => Number.isInteger(value),
  getImports: () => []
}

export const FloatTypeMapper: FieldTypeMapper = {
  type: 'float',
  toPython: () => 'float',
  validate: (value) => typeof value === 'number',
  getImports: () => []
}

export const BooleanTypeMapper: FieldTypeMapper = {
  type: 'bool',
  toPython: () => 'bool',
  validate: (value) => typeof value === 'boolean',
  getImports: () => []
}

export const DateTimeTypeMapper: FieldTypeMapper = {
  type: 'datetime',
  toPython: () => 'datetime',
  validate: (value) => value instanceof Date || typeof value === 'string',
  getImports: () => ['from datetime import datetime']
}

// Complex type mappers
export class ListTypeMapper implements FieldTypeMapper {
  type = 'list'
  private innerType: FieldTypeMapper
  
  constructor(innerType: FieldTypeMapper) {
    this.innerType = innerType
  }
  
  toPython(): string {
    return `List[${this.innerType.toPython()}]`
  }
  
  validate(value: any): boolean {
    return Array.isArray(value) && value.every(item => this.innerType.validate(item))
  }
  
  getImports(): string[] {
    return ['from typing import List', ...this.innerType.getImports()]
  }
}

export class DictTypeMapper implements FieldTypeMapper {
  type = 'dict'
  private keyType: FieldTypeMapper
  private valueType: FieldTypeMapper
  
  constructor(keyType: FieldTypeMapper, valueType: FieldTypeMapper) {
    this.keyType = keyType
    this.valueType = valueType
  }
  
  toPython(): string {
    return `Dict[${this.keyType.toPython()}, ${this.valueType.toPython()}]`
  }
  
  validate(value: any): boolean {
    if (typeof value !== 'object' || value === null) return false
    return Object.entries(value).every(([k, v]) => 
      this.keyType.validate(k) && this.valueType.validate(v)
    )
  }
  
  getImports(): string[] {
    return [
      'from typing import Dict',
      ...this.keyType.getImports(),
      ...this.valueType.getImports()
    ]
  }
}

export class OptionalTypeMapper implements FieldTypeMapper {
  type = 'optional'
  private innerType: FieldTypeMapper
  
  constructor(innerType: FieldTypeMapper) {
    this.innerType = innerType
  }
  
  toPython(): string {
    return `Optional[${this.innerType.toPython()}]`
  }
  
  validate(value: any): boolean {
    return value === null || value === undefined || this.innerType.validate(value)
  }
  
  getImports(): string[] {
    return ['from typing import Optional', ...this.innerType.getImports()]
  }
}

export class UnionTypeMapper implements FieldTypeMapper {
  type = 'union'
  private types: FieldTypeMapper[]
  
  constructor(types: FieldTypeMapper[]) {
    this.types = types
  }
  
  toPython(): string {
    const typeStrings = this.types.map(t => t.toPython())
    return `Union[${typeStrings.join(', ')}]`
  }
  
  validate(value: any): boolean {
    return this.types.some(t => t.validate(value))
  }
  
  getImports(): string[] {
    const imports = ['from typing import Union']
    this.types.forEach(t => imports.push(...t.getImports()))
    return [...new Set(imports)]
  }
}

export class LiteralTypeMapper implements FieldTypeMapper {
  type = 'literal'
  private values: any[]
  
  constructor(values: any[]) {
    this.values = values
  }
  
  toPython(): string {
    const literals = this.values.map(v => {
      if (typeof v === 'string') return `'${v}'`
      return String(v)
    })
    return `Literal[${literals.join(', ')}]`
  }
  
  validate(value: any): boolean {
    return this.values.includes(value)
  }
  
  getImports(): string[] {
    return ['from typing import Literal']
  }
}

// Type registry
export const TypeMapperRegistry = new Map<string, FieldTypeMapper>([
  ['str', StringTypeMapper],
  ['int', IntegerTypeMapper],
  ['float', FloatTypeMapper],
  ['bool', BooleanTypeMapper],
  ['datetime', DateTimeTypeMapper],
])

// Helper function to get mapper for a field type
export function getFieldTypeMapper(fieldType: any): FieldTypeMapper {
  if (typeof fieldType === 'string') {
    const mapper = TypeMapperRegistry.get(fieldType)
    if (!mapper) {
      throw new Error(`Unknown field type: ${fieldType}`)
    }
    return mapper
  }
  
  if (fieldType.list) {
    const innerMapper = getFieldTypeMapper(fieldType.list)
    return new ListTypeMapper(innerMapper)
  }
  
  if (fieldType.dict) {
    const keyMapper = getFieldTypeMapper(fieldType.dict.key)
    const valueMapper = getFieldTypeMapper(fieldType.dict.value)
    return new DictTypeMapper(keyMapper, valueMapper)
  }
  
  if (fieldType.union) {
    const mappers = fieldType.union.map(getFieldTypeMapper)
    return new UnionTypeMapper(mappers)
  }
  
  if (fieldType.optional) {
    const innerMapper = getFieldTypeMapper(fieldType.optional)
    return new OptionalTypeMapper(innerMapper)
  }
  
  throw new Error(`Unsupported field type structure: ${JSON.stringify(fieldType)}`)
}

// Constraint validation helpers
export function validateRegexPattern(pattern: string): boolean {
  try {
    new RegExp(pattern)
    return true
  } catch {
    return false
  }
}

export function validateNumericConstraints(constraints: any): string[] {
  const errors: string[] = []
  
  if (constraints.gt !== undefined && constraints.ge !== undefined) {
    errors.push('Cannot have both gt and ge constraints')
  }
  
  if (constraints.lt !== undefined && constraints.le !== undefined) {
    errors.push('Cannot have both lt and le constraints')
  }
  
  if (constraints.gt !== undefined && constraints.lt !== undefined) {
    if (constraints.gt >= constraints.lt) {
      errors.push(`Conflicting constraints: gt (${constraints.gt}) must be less than lt (${constraints.lt})`)
    }
  }
  
  if (constraints.ge !== undefined && constraints.le !== undefined) {
    if (constraints.ge > constraints.le) {
      errors.push(`Conflicting constraints: ge (${constraints.ge}) must be less than or equal to le (${constraints.le})`)
    }
  }
  
  return errors
}

export function validateEnumConstraint(enumValues: any[]): string[] {
  const errors: string[] = []
  
  if (enumValues.length === 0) {
    errors.push('Enum constraint must have at least one value')
  }
  
  const uniqueValues = new Set(enumValues)
  if (uniqueValues.size !== enumValues.length) {
    errors.push('Enum values must be unique')
  }
  
  return errors
}