import { EntityDefinitionRecord } from '../../types/airtable'

export class EntityGenerator {
  generateAll(entities: EntityDefinitionRecord[]): string {
    return entities
      .map(entity => this.generateEntity(entity))
      .join('\n\n')
  }

  generateEntity(entity: EntityDefinitionRecord): string {
    const className = this.formatClassName(entity.fields['Entity Name'] || 'Entity')
    const description = entity.fields.Description || `${className} entity`
    const properties = this.parseProperties(entity.fields['Properties JSON'])

    const fields = this.generateFields(properties)
    const validators = this.generateValidators(properties)
    const config = this.generateConfig()

    return `
class ${className}(BaseModel):
    """${description}"""
    ${fields}
    ${validators ? `\n${validators}` : ''}
    ${config}
`.trim()
  }

  private formatClassName(name: string): string {
    // Ensure PascalCase
    return name
      .split(/[\s_-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }

  private parseProperties(propertiesJson?: string): any {
    if (!propertiesJson) {
      return { fields: [] }
    }

    try {
      return JSON.parse(propertiesJson)
    } catch {
      return { fields: [] }
    }
  }

  private generateFields(properties: any): string {
    if (!properties.fields || properties.fields.length === 0) {
      return 'pass  # No fields defined'
    }

    const requiredFields = properties.fields.filter((f: any) => !f.isOptional)
    const optionalFields = properties.fields.filter((f: any) => f.isOptional)

    const fieldStrings: string[] = []

    // Generate required fields
    if (requiredFields.length > 0) {
      fieldStrings.push('# Required fields')
      requiredFields.forEach((field: any) => {
        fieldStrings.push(this.generateField(field, false))
      })
    }

    // Generate optional fields
    if (optionalFields.length > 0) {
      if (requiredFields.length > 0) {
        fieldStrings.push('')
        fieldStrings.push('# Optional fields')
      }
      optionalFields.forEach((field: any) => {
        fieldStrings.push(this.generateField(field, true))
      })
    }

    return fieldStrings.join('\n    ')
  }

  private generateField(field: any, isOptional: boolean): string {
    const fieldName = this.formatFieldName(field.name)
    const pythonType = this.mapToPythonType(field.type)
    const fieldType = isOptional ? `Optional[${pythonType}]` : pythonType
    
    const constraints = this.generateConstraints(field)
    const description = field.description ? `, description="${field.description}"` : ''
    const defaultValue = isOptional ? 'None' : '...'

    if (constraints) {
      return `${fieldName}: ${fieldType} = Field(${defaultValue}${description}, ${constraints})`
    } else {
      return `${fieldName}: ${fieldType} = Field(${defaultValue}${description})`
    }
  }

  private formatFieldName(name: string): string {
    // Convert to snake_case
    return name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/[\s-]+/g, '_')
  }

  private mapToPythonType(fieldType: string): string {
    const typeMap: Record<string, string> = {
      'str': 'str',
      'string': 'str',
      'text': 'str',
      'int': 'int',
      'integer': 'int',
      'float': 'float',
      'decimal': 'Decimal',
      'bool': 'bool',
      'boolean': 'bool',
      'datetime': 'datetime',
      'date': 'date',
      'time': 'time',
      'uuid': 'UUID',
      'list': 'List[Any]',
      'List[str]': 'List[str]',
      'List[int]': 'List[int]',
      'dict': 'Dict[str, Any]',
      'Dict[str, Any]': 'Dict[str, Any]',
      'json': 'Dict[str, Any]',
      'email': 'EmailStr',
      'url': 'HttpUrl',
      'any': 'Any'
    }

    return typeMap[fieldType] || 'Any'
  }

  private generateConstraints(field: any): string {
    const constraints: string[] = []

    if (field.constraints) {
      if (field.constraints.minLength !== undefined) {
        constraints.push(`min_length=${field.constraints.minLength}`)
      }
      if (field.constraints.maxLength !== undefined) {
        constraints.push(`max_length=${field.constraints.maxLength}`)
      }
      if (field.constraints.ge !== undefined) {
        constraints.push(`ge=${field.constraints.ge}`)
      }
      if (field.constraints.le !== undefined) {
        constraints.push(`le=${field.constraints.le}`)
      }
      if (field.constraints.gt !== undefined) {
        constraints.push(`gt=${field.constraints.gt}`)
      }
      if (field.constraints.lt !== undefined) {
        constraints.push(`lt=${field.constraints.lt}`)
      }
      if (field.constraints.regex !== undefined) {
        constraints.push(`regex="${field.constraints.regex}"`)
      }
    }

    return constraints.join(', ')
  }

  private generateValidators(properties: any): string {
    if (!properties.fields || properties.fields.length === 0) {
      return ''
    }

    const validators: string[] = []

    properties.fields.forEach((field: any) => {
      if (field.validators && field.validators.length > 0) {
        validators.push(this.generateFieldValidator(field))
      }
    })

    return validators.join('\n    ')
  }

  private generateFieldValidator(field: any): string {
    const fieldName = this.formatFieldName(field.name)
    const validatorName = `validate_${fieldName}`

    return `
    @validator('${fieldName}')
    def ${validatorName}(cls, v):
        """Validate ${field.name}"""
        # Custom validation logic here
        return v`
  }

  private generateConfig(): string {
    return `
    class Config:
        """Pydantic model configuration"""
        use_enum_values = True
        validate_assignment = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
            date: lambda v: v.isoformat() if v else None,
            UUID: lambda v: str(v) if v else None
        }`
  }

  generateSimpleEntity(name: string, fields: Array<{name: string, type: string, required: boolean}>): string {
    const className = this.formatClassName(name)
    
    const fieldLines = fields.map(field => {
      const fieldName = this.formatFieldName(field.name)
      const pythonType = this.mapToPythonType(field.type)
      const fieldType = field.required ? pythonType : `Optional[${pythonType}]`
      const defaultValue = field.required ? '...' : 'None'
      
      return `    ${fieldName}: ${fieldType} = Field(${defaultValue})`
    })

    return `
class ${className}(BaseModel):
    """${className} entity"""
${fieldLines.join('\n')}
    
    class Config:
        use_enum_values = True
        validate_assignment = True
`.trim()
  }
}