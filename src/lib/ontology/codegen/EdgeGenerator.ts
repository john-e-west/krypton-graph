import { EdgeDefinitionRecord } from '../../types/airtable'

export class EdgeGenerator {
  generateAll(edges: EdgeDefinitionRecord[]): string {
    if (edges.length === 0) {
      return '# No edge definitions'
    }

    return edges
      .map(edge => this.generateEdge(edge))
      .join('\n\n')
  }

  generateEdge(edge: EdgeDefinitionRecord): string {
    const className = this.formatClassName(edge.fields['Edge Name'] || 'Edge')
    const description = edge.fields.Description || `${className} relationship`
    const properties = this.parseProperties(edge.fields['Properties JSON'])

    const fields = this.generateFields(properties)
    const metadata = this.generateMetadata(edge)
    const config = this.generateConfig()

    return `
class ${className}(BaseModel):
    """${description}
    
    ${metadata}
    """
    ${fields}
    
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
      return { attributes: [], metadata: {} }
    }

    try {
      const parsed = JSON.parse(propertiesJson)
      // Handle both direct attributes and nested structure
      return {
        attributes: parsed.attributes || parsed.fields || [],
        metadata: parsed.metadata || {}
      }
    } catch {
      return { attributes: [], metadata: {} }
    }
  }

  private generateFields(properties: any): string {
    if (!properties.attributes || properties.attributes.length === 0) {
      return 'pass  # No attributes defined'
    }

    const requiredFields = properties.attributes.filter((a: any) => !a.isOptional)
    const optionalFields = properties.attributes.filter((a: any) => a.isOptional)

    const fieldStrings: string[] = []

    // Generate required fields
    if (requiredFields.length > 0) {
      fieldStrings.push('# Required attributes')
      requiredFields.forEach((attr: any) => {
        fieldStrings.push(this.generateAttribute(attr, false))
      })
    }

    // Generate optional fields
    if (optionalFields.length > 0) {
      if (requiredFields.length > 0) {
        fieldStrings.push('')
        fieldStrings.push('# Optional attributes')
      }
      optionalFields.forEach((attr: any) => {
        fieldStrings.push(this.generateAttribute(attr, true))
      })
    }

    return fieldStrings.join('\n    ')
  }

  private generateAttribute(attr: any, isOptional: boolean): string {
    const attrName = this.formatAttributeName(attr.name)
    const pythonType = this.mapToPythonType(attr.type)
    const fieldType = isOptional ? `Optional[${pythonType}]` : pythonType
    
    const description = attr.description ? `, description="${attr.description}"` : ''
    const defaultValue = this.getDefaultValue(attr, isOptional)

    return `${attrName}: ${fieldType} = Field(${defaultValue}${description})`
  }

  private formatAttributeName(name: string): string {
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
      'int': 'int',
      'integer': 'int',
      'float': 'float',
      'bool': 'bool',
      'boolean': 'bool',
      'datetime': 'datetime',
      'date': 'date',
      'uuid': 'UUID',
      'List[str]': 'List[str]',
      'List[int]': 'List[int]',
      'Dict[str, Any]': 'Dict[str, Any]',
      'any': 'Any'
    }

    return typeMap[fieldType] || 'Any'
  }

  private getDefaultValue(attr: any, isOptional: boolean): string {
    if (attr.default !== undefined && attr.default !== null) {
      if (typeof attr.default === 'string') {
        return `"${attr.default}"`
      }
      return String(attr.default)
    }
    return isOptional ? 'None' : '...'
  }

  private generateMetadata(edge: EdgeDefinitionRecord): string {
    const metadata: string[] = []

    // Source and Target entities
    const sourceEntities = edge.fields['Source Entity'] || []
    const targetEntities = edge.fields['Target Entity'] || []
    
    if (sourceEntities.length > 0 || targetEntities.length > 0) {
      metadata.push('Relationship:')
      metadata.push(`    Source: ${sourceEntities.join(', ') || 'Any'}`)
      metadata.push(`    Target: ${targetEntities.join(', ') || 'Any'}`)
    }

    // Cardinality
    if (edge.fields.Cardinality) {
      metadata.push(`    Cardinality: ${edge.fields.Cardinality}`)
    }

    // Bidirectional
    if (edge.fields.Bidirectional !== undefined) {
      metadata.push(`    Bidirectional: ${edge.fields.Bidirectional ? 'Yes' : 'No'}`)
    }

    return metadata.join('\n    ')
  }

  private generateConfig(): string {
    return `class Config:
        """Pydantic model configuration"""
        use_enum_values = True
        validate_assignment = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
            date: lambda v: v.isoformat() if v else None
        }`
  }

  generateSimpleEdge(
    name: string, 
    attributes: Array<{name: string, type: string, required: boolean}>,
    metadata?: { source?: string, target?: string, cardinality?: string }
  ): string {
    const className = this.formatClassName(name)
    
    const attrLines = attributes.map(attr => {
      const attrName = this.formatAttributeName(attr.name)
      const pythonType = this.mapToPythonType(attr.type)
      const fieldType = attr.required ? pythonType : `Optional[${pythonType}]`
      const defaultValue = attr.required ? '...' : 'None'
      
      return `    ${attrName}: ${fieldType} = Field(${defaultValue})`
    })

    let docstring = `"""${className} relationship`
    if (metadata) {
      if (metadata.source && metadata.target) {
        docstring += `\n    \n    ${metadata.source} -> ${metadata.target}`
      }
      if (metadata.cardinality) {
        docstring += `\n    Cardinality: ${metadata.cardinality}`
      }
    }
    docstring += '\n    """'

    return `
class ${className}(BaseModel):
    ${docstring}
${attrLines.join('\n')}
    
    class Config:
        use_enum_values = True
        validate_assignment = True
`.trim()
  }
}