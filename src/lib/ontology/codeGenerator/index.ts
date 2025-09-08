import type { EntityTypeDefinition } from '@/types/ontology'
import { generateImports } from './importGenerators'
import { generateField } from './fieldGenerators'
import { generateValidators } from './validatorGenerators'

export { getFieldTypeString } from './typeMappers'
export { generateConstraints } from './constraintGenerators'
export { generateField } from './fieldGenerators'
export { generateImports } from './importGenerators'
export { generateValidators } from './validatorGenerators'

export function generateClassDefinition(entity: EntityTypeDefinition): string {
  const description = entity.description ? `\n    """${entity.description}"""` : ''
  return `class ${entity.name}(${entity.baseClass}):${description}`
}

export function generatePydanticCode(entity: EntityTypeDefinition): string {
  const imports = generateImports(entity)
  const classDefinition = generateClassDefinition(entity)
  const fields = entity.fields.map(generateField).join('\n')
  const validators = generateValidators(entity)
  
  return `${imports}


${classDefinition}
    
${fields}
${validators ? '\n' + validators : ''}
    
    class Config:
        use_enum_values = True
        validate_assignment = True
`
}