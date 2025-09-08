import { EdgeDefinitionRecord } from '../../types/airtable'

export class MapGenerator {
  generate(edges: EdgeDefinitionRecord[]): string {
    if (edges.length === 0) {
      return this.generateEmptyMap()
    }

    const mappings = edges.map(edge => this.generateMapping(edge))
    const fallbackMapping = this.generateFallbackMapping()

    return `edge_type_map = {
${mappings.join(',\n')}${mappings.length > 0 ? ',' : ''}
${fallbackMapping}
}`
  }

  private generateMapping(edge: EdgeDefinitionRecord): string {
    const edgeName = edge.fields['Edge Name'] || 'Edge'
    const sourceEntities = edge.fields['Source Entity'] || []
    const targetEntities = edge.fields['Target Entity'] || []
    const cardinality = this.formatCardinality(edge.fields.Cardinality)
    const bidirectional = edge.fields.Bidirectional || false
    
    // Parse properties to get attribute names
    const attributes = this.extractAttributeNames(edge.fields['Properties JSON'])

    // Format source and target
    const source = this.formatEntityList(sourceEntities)
    const target = this.formatEntityList(targetEntities)

    const lines = [
      `    "${edgeName}": {`,
      `        "source": ${source},`,
      `        "target": ${target},`,
      `        "cardinality": "${cardinality}",`,
      `        "bidirectional": ${bidirectional ? 'True' : 'False'}`
    ]

    if (attributes.length > 0) {
      lines.push(`,        "attributes": [${attributes.map(a => `"${a}"`).join(', ')}]`)
    }

    lines.push('    }')

    return lines.join('\n')
  }

  private formatEntityList(entities: string[]): string {
    if (entities.length === 0) {
      return '"*"'
    }
    if (entities.length === 1) {
      return `"${entities[0]}"`
    }
    return `[${entities.map(e => `"${e}"`).join(', ')}]`
  }

  private formatCardinality(cardinality?: string): string {
    const cardinalityMap: Record<string, string> = {
      'one-to-one': '1:1',
      'one-to-many': '1:n',
      'many-to-many': 'n:n',
      'many-to-one': 'n:1'
    }

    if (!cardinality) {
      return 'n:n'  // Default
    }

    return cardinalityMap[cardinality] || cardinality
  }

  private extractAttributeNames(propertiesJson?: string): string[] {
    if (!propertiesJson) return []

    try {
      const parsed = JSON.parse(propertiesJson)
      const attributes = parsed.attributes || parsed.fields || []
      
      return attributes.map((attr: any) => {
        // Convert to snake_case
        return String(attr.name)
          .replace(/([A-Z])/g, '_$1')
          .toLowerCase()
          .replace(/^_/, '')
          .replace(/[\s-]+/g, '_')
      })
    } catch {
      return []
    }
  }

  private generateFallbackMapping(): string {
    return `    # Fallback pattern for unspecified edge types
    "*": {
        "source": "*",
        "target": "*",
        "cardinality": "n:n",
        "bidirectional": False,
        "attributes": []
    }`
  }

  private generateEmptyMap(): string {
    return `# No edge types defined
edge_type_map = {
    # Fallback pattern for generic edges
    "*": {
        "source": "*",
        "target": "*",
        "cardinality": "n:n",
        "bidirectional": False,
        "attributes": []
    }
}`
  }

  generateSimpleMap(
    edges: Array<{
      name: string,
      source: string | string[],
      target: string | string[],
      cardinality?: string,
      bidirectional?: boolean
    }>
  ): string {
    const mappings = edges.map(edge => {
      const source = Array.isArray(edge.source) 
        ? `[${edge.source.map(s => `"${s}"`).join(', ')}]`
        : `"${edge.source}"`
      
      const target = Array.isArray(edge.target)
        ? `[${edge.target.map(t => `"${t}"`).join(', ')}]`
        : `"${edge.target}"`

      return `    "${edge.name}": {
        "source": ${source},
        "target": ${target},
        "cardinality": "${edge.cardinality || 'n:n'}",
        "bidirectional": ${edge.bidirectional ? 'True' : 'False'}
    }`
    })

    return `edge_type_map = {
${mappings.join(',\n')}${mappings.length > 0 ? ',' : ''}
    # Fallback pattern
    "*": {
        "source": "*",
        "target": "*",
        "cardinality": "n:n",
        "bidirectional": False
    }
}`
  }

  generateAdvancedMap(edges: EdgeDefinitionRecord[]): string {
    // Generate a more detailed map with additional metadata
    const mappings = edges.map(edge => {
      const edgeName = edge.fields['Edge Name'] || 'Edge'
      const edgeClass = edge.fields['Edge Class'] || ''
      const description = edge.fields.Description || ''
      
      const lines = [
        `    "${edgeName}": {`,
        `        "class": "${edgeClass}",`,
        `        "description": "${description}",`,
        `        ${this.generateMapping(edge).split('\n').slice(1).join('\n')}  # Skip opening`
      ]

      return lines.join('\n')
    })

    return `# Advanced edge type mapping with metadata
edge_type_map = {
${mappings.join(',\n')}
}`
  }
}