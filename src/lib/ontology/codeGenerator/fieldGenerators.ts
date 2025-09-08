import type { EntityField } from '@/types/ontology'
import { getFieldTypeString } from './typeMappers'
import { generateConstraints } from './constraintGenerators'

export function formatDefaultValue(value: any, fieldType: string): string {
  if (value === undefined) {
    return '...'
  }
  
  if (value === null) {
    return 'None'
  }
  
  if (typeof value === 'string') {
    return `"${value}"`
  }
  
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False'
  }
  
  return String(value)
}

export function generateFieldAnnotation(field: EntityField): string {
  const typeStr = getFieldTypeString(field.type)
  return field.isOptional ? `Optional[${typeStr}]` : typeStr
}

export function generateFieldDefault(field: EntityField): string {
  if (field.default !== undefined) {
    return formatDefaultValue(field.default, getFieldTypeString(field.type))
  }
  return field.isOptional ? 'None' : '...'
}

export function generateField(field: EntityField): string {
  const annotation = generateFieldAnnotation(field)
  const defaultValue = generateFieldDefault(field)
  const constraints = generateConstraints(field.constraints)
  const description = field.description ? `\n        description="${field.description}",` : ''
  
  return `    ${field.name}: ${annotation} = Field(
        ${defaultValue}${description}${constraints}
    )`
}