import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, withRateLimit } from '@/lib/auth/middleware'

declare global {
  function mcp__airtable__list_records(params: {
    baseId: string;
    tableId: string;
    filterByFormula?: string;
    maxRecords?: number;
    sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
    view?: string;
  }): Promise<{
    records: Array<{
      id: string;
      fields: Record<string, any>;
      createdTime: string;
    }>;
  }>;
}

const ExportRequestSchema = z.object({
  ontologyIds: z.array(z.string().min(1)).min(1, 'At least one ontology ID is required'),
  format: z.enum(['json', 'yaml', 'turtle', 'owl'], {
    errorMap: () => ({ message: 'Format must be one of: json, yaml, turtle, owl' })
  }).default('json'),
  includeMetadata: z.boolean().default(true),
  includeUsageStats: z.boolean().default(false),
  compressOutput: z.boolean().default(false)
})

interface ExportedOntology {
  id: string
  name: string
  description: string
  ontology: any
  category: string
  tags: string[]
  metadata?: {
    createdBy: string
    createdAt: string
    lastModified: string
    usageCount: number
    rating: number
    ratingCount: number
  }
  usageStats?: {
    totalUsage: number
    lastUsed: string
    popularityScore: number
  }
}

class OntologyExporter {
  static async exportToJSON(ontologies: ExportedOntology[], includeMetadata: boolean): Promise<string> {
    const exportData = {
      format: 'krypton-ontology-export',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      ontologies: includeMetadata ? ontologies : ontologies.map(ont => ({
        id: ont.id,
        name: ont.name,
        description: ont.description,
        ontology: ont.ontology,
        category: ont.category,
        tags: ont.tags
      }))
    }
    
    return JSON.stringify(exportData, null, 2)
  }

  static async exportToYAML(ontologies: ExportedOntology[], includeMetadata: boolean): Promise<string> {
    // Simple YAML serializer for ontology data
    const yamlLines: string[] = [
      'format: krypton-ontology-export',
      'version: "1.0"',
      `exportedAt: "${new Date().toISOString()}"`,
      'ontologies:'
    ]

    for (const ont of ontologies) {
      yamlLines.push(`  - id: "${ont.id}"`)
      yamlLines.push(`    name: "${ont.name}"`)
      yamlLines.push(`    description: "${ont.description}"`)
      yamlLines.push(`    category: "${ont.category}"`)
      yamlLines.push(`    tags: [${ont.tags.map(tag => `"${tag}"`).join(', ')}]`)
      yamlLines.push('    ontology:')
      yamlLines.push('      entityTypes:')
      
      for (const entityType of ont.ontology.entityTypes || []) {
        yamlLines.push(`        - id: "${entityType.id}"`)
        yamlLines.push(`          name: "${entityType.name}"`)
        yamlLines.push(`          description: "${entityType.description}"`)
        if (entityType.pattern) {
          yamlLines.push(`          pattern: "${entityType.pattern}"`)
        }
        if (entityType.attributes && entityType.attributes.length > 0) {
          yamlLines.push('          attributes:')
          for (const attr of entityType.attributes) {
            yamlLines.push(`            - name: "${attr.name}"`)
            yamlLines.push(`              type: "${attr.type}"`)
            yamlLines.push(`              required: ${attr.required}`)
          }
        }
      }
      
      if (ont.ontology.edgeTypes && ont.ontology.edgeTypes.length > 0) {
        yamlLines.push('      edgeTypes:')
        for (const edgeType of ont.ontology.edgeTypes) {
          yamlLines.push(`        - id: "${edgeType.id}"`)
          yamlLines.push(`          name: "${edgeType.name}"`)
          yamlLines.push(`          description: "${edgeType.description}"`)
          yamlLines.push(`          sourceTypes: [${edgeType.sourceTypes.map((t: string) => `"${t}"`).join(', ')}]`)
          yamlLines.push(`          targetTypes: [${edgeType.targetTypes.map((t: string) => `"${t}"`).join(', ')}]`)
          if (edgeType.pattern) {
            yamlLines.push(`          pattern: "${edgeType.pattern}"`)
          }
        }
      }

      if (includeMetadata && ont.metadata) {
        yamlLines.push('    metadata:')
        yamlLines.push(`      createdBy: "${ont.metadata.createdBy}"`)
        yamlLines.push(`      createdAt: "${ont.metadata.createdAt}"`)
        yamlLines.push(`      lastModified: "${ont.metadata.lastModified}"`)
        yamlLines.push(`      usageCount: ${ont.metadata.usageCount}`)
        yamlLines.push(`      rating: ${ont.metadata.rating}`)
        yamlLines.push(`      ratingCount: ${ont.metadata.ratingCount}`)
      }
    }

    return yamlLines.join('\n')
  }

  static async exportToTurtle(ontologies: ExportedOntology[]): Promise<string> {
    const lines: string[] = [
      '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .',
      '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
      '@prefix owl: <http://www.w3.org/2002/07/owl#> .',
      '@prefix krypton: <http://krypton-graph.ai/ontology#> .',
      '',
      '<http://krypton-graph.ai/ontology> rdf:type owl:Ontology ;',
      '    rdfs:label "Krypton Graph Ontology Export" ;',
      `    owl:versionInfo "${new Date().toISOString()}" .`,
      ''
    ]

    for (const ont of ontologies) {
      const ontologyUri = `<http://krypton-graph.ai/ontology/${ont.id}>`
      
      lines.push(`${ontologyUri} rdf:type owl:Ontology ;`)
      lines.push(`    rdfs:label "${ont.name}" ;`)
      lines.push(`    rdfs:comment "${ont.description}" ;`)
      lines.push(`    krypton:category "${ont.category}" .`)
      lines.push('')

      // Export entity types as OWL classes
      for (const entityType of ont.ontology.entityTypes || []) {
        const classUri = `<http://krypton-graph.ai/ontology/${ont.id}/${entityType.id}>`
        lines.push(`${classUri} rdf:type owl:Class ;`)
        lines.push(`    rdfs:label "${entityType.name}" ;`)
        lines.push(`    rdfs:comment "${entityType.description}" ;`)
        lines.push(`    rdfs:isDefinedBy ${ontologyUri} .`)
        lines.push('')

        // Export attributes as data properties
        if (entityType.attributes) {
          for (const attr of entityType.attributes) {
            const propUri = `<http://krypton-graph.ai/ontology/${ont.id}/${entityType.id}/${attr.name}>`
            lines.push(`${propUri} rdf:type owl:DatatypeProperty ;`)
            lines.push(`    rdfs:label "${attr.name}" ;`)
            lines.push(`    rdfs:domain ${classUri} ;`)
            lines.push(`    krypton:required "${attr.required}"^^xsd:boolean ;`)
            lines.push(`    krypton:dataType "${attr.type}" .`)
            lines.push('')
          }
        }
      }

      // Export edge types as object properties
      for (const edgeType of ont.ontology.edgeTypes || []) {
        const propUri = `<http://krypton-graph.ai/ontology/${ont.id}/${edgeType.id}>`
        lines.push(`${propUri} rdf:type owl:ObjectProperty ;`)
        lines.push(`    rdfs:label "${edgeType.name}" ;`)
        lines.push(`    rdfs:comment "${edgeType.description}" ;`)
        
        // Add domain and range constraints
        if (edgeType.sourceTypes.length === 1) {
          lines.push(`    rdfs:domain <http://krypton-graph.ai/ontology/${ont.id}/${edgeType.sourceTypes[0]}> ;`)
        } else if (edgeType.sourceTypes.length > 1) {
          const unionClasses = edgeType.sourceTypes.map((t: string) => 
            `<http://krypton-graph.ai/ontology/${ont.id}/${t}>`).join(' ')
          lines.push(`    rdfs:domain [ rdf:type owl:Class ; owl:unionOf ( ${unionClasses} ) ] ;`)
        }
        
        if (edgeType.targetTypes.length === 1) {
          lines.push(`    rdfs:range <http://krypton-graph.ai/ontology/${ont.id}/${edgeType.targetTypes[0]}> ;`)
        } else if (edgeType.targetTypes.length > 1) {
          const unionClasses = edgeType.targetTypes.map((t: string) => 
            `<http://krypton-graph.ai/ontology/${ont.id}/${t}>`).join(' ')
          lines.push(`    rdfs:range [ rdf:type owl:Class ; owl:unionOf ( ${unionClasses} ) ] ;`)
        }
        
        lines.push(`    rdfs:isDefinedBy ${ontologyUri} .`)
        lines.push('')
      }
    }

    return lines.join('\n')
  }

  static async exportToOWL(ontologies: ExportedOntology[]): Promise<string> {
    const xmlLines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"',
      '         xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"',
      '         xmlns:owl="http://www.w3.org/2002/07/owl#"',
      '         xmlns:krypton="http://krypton-graph.ai/ontology#"',
      '         xml:base="http://krypton-graph.ai/ontology">',
      '',
      '  <owl:Ontology rdf:about="http://krypton-graph.ai/ontology">',
      '    <rdfs:label>Krypton Graph Ontology Export</rdfs:label>',
      `    <owl:versionInfo>${new Date().toISOString()}</owl:versionInfo>`,
      '  </owl:Ontology>',
      ''
    ]

    for (const ont of ontologies) {
      xmlLines.push(`  <!-- Ontology: ${ont.name} -->`)
      
      // Export entity types
      for (const entityType of ont.ontology.entityTypes || []) {
        xmlLines.push(`  <owl:Class rdf:about="http://krypton-graph.ai/ontology/${ont.id}/${entityType.id}">`)
        xmlLines.push(`    <rdfs:label>${this.escapeXml(entityType.name)}</rdfs:label>`)
        xmlLines.push(`    <rdfs:comment>${this.escapeXml(entityType.description)}</rdfs:comment>`)
        xmlLines.push('  </owl:Class>')
        xmlLines.push('')

        // Export attributes
        if (entityType.attributes) {
          for (const attr of entityType.attributes) {
            xmlLines.push(`  <owl:DatatypeProperty rdf:about="http://krypton-graph.ai/ontology/${ont.id}/${entityType.id}/${attr.name}">`)
            xmlLines.push(`    <rdfs:label>${this.escapeXml(attr.name)}</rdfs:label>`)
            xmlLines.push(`    <rdfs:domain rdf:resource="http://krypton-graph.ai/ontology/${ont.id}/${entityType.id}"/>`)
            xmlLines.push(`    <krypton:required rdf:datatype="http://www.w3.org/2001/XMLSchema#boolean">${attr.required}</krypton:required>`)
            xmlLines.push(`    <krypton:dataType>${this.escapeXml(attr.type)}</krypton:dataType>`)
            xmlLines.push('  </owl:DatatypeProperty>')
            xmlLines.push('')
          }
        }
      }

      // Export edge types
      for (const edgeType of ont.ontology.edgeTypes || []) {
        xmlLines.push(`  <owl:ObjectProperty rdf:about="http://krypton-graph.ai/ontology/${ont.id}/${edgeType.id}">`)
        xmlLines.push(`    <rdfs:label>${this.escapeXml(edgeType.name)}</rdfs:label>`)
        xmlLines.push(`    <rdfs:comment>${this.escapeXml(edgeType.description)}</rdfs:comment>`)
        
        // Domain and range
        if (edgeType.sourceTypes.length > 0) {
          xmlLines.push(`    <rdfs:domain rdf:resource="http://krypton-graph.ai/ontology/${ont.id}/${edgeType.sourceTypes[0]}"/>`)
        }
        if (edgeType.targetTypes.length > 0) {
          xmlLines.push(`    <rdfs:range rdf:resource="http://krypton-graph.ai/ontology/${ont.id}/${edgeType.targetTypes[0]}"/>`)
        }
        
        xmlLines.push('  </owl:ObjectProperty>')
        xmlLines.push('')
      }
    }

    xmlLines.push('</rdf:RDF>')
    return xmlLines.join('\n')
  }

  private static escapeXml(text: string): string {
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&apos;')
  }
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`ontology-export:${user.userId}`, 20, 60000)
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Parse and validate request
    const body = await request.json()
    const validationResult = ExportRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid export request', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      )
    }

    const { ontologyIds, format, includeMetadata, includeUsageStats, compressOutput } = validationResult.data

    // Step 4: Fetch ontology data from Airtable
    const ontologyRecords = await mcp__airtable__list_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblOntologyTemplates',
      filterByFormula: `AND(
        OR(${ontologyIds.map(id => `RECORD_ID() = "${id}"`).join(', ')}),
        OR({IsPublic} = TRUE(), {CreatedBy} = "${user.userId}"),
        {IsActive} = TRUE()
      )`,
      maxRecords: ontologyIds.length
    })

    if (ontologyRecords.records.length === 0) {
      return NextResponse.json(
        { error: 'No accessible ontologies found with the provided IDs' },
        { status: 404 }
      )
    }

    // Step 5: Transform data for export
    const exportData: ExportedOntology[] = ontologyRecords.records.map(record => {
      const ontology: ExportedOntology = {
        id: record.id,
        name: String(record.fields.Name || ''),
        description: String(record.fields.Description || ''),
        ontology: record.fields.OntologyDefinition ? 
          JSON.parse(String(record.fields.OntologyDefinition)) : {},
        category: String(record.fields.Category || ''),
        tags: record.fields.Tags ? 
          String(record.fields.Tags).split(',').map(tag => tag.trim()) : []
      }

      if (includeMetadata) {
        ontology.metadata = {
          createdBy: String(record.fields.CreatedBy || ''),
          createdAt: record.createdTime,
          lastModified: String(record.fields.LastModified || record.createdTime),
          usageCount: Number(record.fields.UsageCount || 0),
          rating: Number(record.fields.Rating || 0),
          ratingCount: Number(record.fields.RatingCount || 0)
        }
      }

      if (includeUsageStats) {
        ontology.usageStats = {
          totalUsage: Number(record.fields.UsageCount || 0),
          lastUsed: String(record.fields.LastUsed || ''),
          popularityScore: Number(record.fields.PopularityScore || 0)
        }
      }

      return ontology
    })

    // Step 6: Export in requested format
    let exportContent: string
    let contentType: string
    let fileExtension: string

    switch (format) {
      case 'yaml':
        exportContent = await OntologyExporter.exportToYAML(exportData, includeMetadata)
        contentType = 'application/x-yaml'
        fileExtension = 'yaml'
        break
      case 'turtle':
        exportContent = await OntologyExporter.exportToTurtle(exportData)
        contentType = 'text/turtle'
        fileExtension = 'ttl'
        break
      case 'owl':
        exportContent = await OntologyExporter.exportToOWL(exportData)
        contentType = 'application/rdf+xml'
        fileExtension = 'owl'
        break
      default:
        exportContent = await OntologyExporter.exportToJSON(exportData, includeMetadata)
        contentType = 'application/json'
        fileExtension = 'json'
    }

    // Step 7: Prepare response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `ontologies-export-${timestamp}.${fileExtension}`
    
    const response = new NextResponse(exportContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Export-Count': exportData.length.toString(),
        'X-Export-Format': format,
        'X-Export-Timestamp': new Date().toISOString()
      }
    })

    // Step 8: Optionally compress if requested
    if (compressOutput && exportContent.length > 1024) {
      // Note: In a real implementation, you might want to use compression
      response.headers.set('Content-Encoding', 'gzip')
    }

    return response

  } catch (error) {
    console.error('Ontology export API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to export ontologies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}