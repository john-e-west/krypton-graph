import type { EntityTypeDefinition } from '@/types/ontology'

export function generateFieldValidator(fieldName: string, validator: string, index: number): string {
  return `
    @validator('${fieldName}')
    def validate_${fieldName}_${index}(cls, v):
        ${validator}
        return v`
}

export function generateValidators(entity: EntityTypeDefinition): string {
  const validators: string[] = []
  
  entity.fields.forEach(field => {
    if (field.constraints?.validators && field.constraints.validators.length > 0) {
      field.constraints.validators.forEach((validator, index) => {
        validators.push(generateFieldValidator(field.name, validator, index))
      })
    }
  })
  
  return validators.join('\n')
}