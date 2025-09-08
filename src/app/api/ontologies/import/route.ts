import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, validateRequestBody, withRateLimit } from '@/lib/auth/middleware'

declare global {
  function mcp__airtable__create_record(params: {
    baseId: string;
    tableId: string;
    fields: Record<string, any>;
  }): Promise<{ id: string; fields: Record<string, any>; createdTime: string; }>;

  function mcp__airtable__list_records(params: {
    baseId: string;
    tableId: string;
    filterByFormula?: string;
    maxRecords?: number;
  }): Promise<{
    records: Array<{
      id: string;
      fields: Record<string, any>;
      createdTime: string;
    }>;
  }>;
}

const ImportRequestSchema = z.object({
  source: z.enum(['file', 'url'], {
    errorMap: () => ({ message: 'Source must be either "file" or "url"' })
  }),
  data: z.string().min(1, 'Import data is required'),
  format: z.enum(['json', 'yaml', 'turtle', 'owl']).optional(),
  options: z.object({
    overwriteExisting: z.boolean().default(false),
    createBackup: z.boolean().default(true),
    validateStructure: z.boolean().default(true),
    assignToCategory: z.string().optional(),
    makePublic: z.boolean().default(false),
    addTags: z.array(z.string()).default([])
  }).default({})
})

interface ImportedOntology {
  name: string
  description: string
  ontology: any
  category: string
  tags: string[]
  metadata?: any
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  ontologyCount: number
  entityTypeCount: number
  edgeTypeCount: number
}

class OntologyImporter {
  static async detectFormat(data: string): Promise<'json' | 'yaml' | 'turtle' | 'owl' | null> {
    const trimmedData = data.trim()
    
    // JSON detection
    if (trimmedData.startsWith('{') && trimmedData.endsWith('}')) {
      try {
        JSON.parse(trimmedData)
        return 'json'
      } catch {
        // Not valid JSON
      }
    }
    
    // YAML detection
    if (trimmedData.includes('format: krypton-ontology-export') || 
        trimmedData.match(/^[\w-]+:\s*.+$/m)) {
      return 'yaml'
    }
    
    // Turtle detection
    if (trimmedData.includes('@prefix') || trimmedData.includes('<http://')) {
      return 'turtle'
    }
    
    // OWL/XML detection
    if (trimmedData.includes('<?xml') && 
        (trimmedData.includes('owl:') || trimmedData.includes('rdf:'))) {
      return 'owl'
    }
    
    return null
  }

  static async parseJSON(data: string): Promise<ImportedOntology[]> {
    const parsed = JSON.parse(data)
    
    // Handle different JSON formats
    if (parsed.format === 'krypton-ontology-export' && parsed.ontologies) {
      return parsed.ontologies.map((ont: any) => ({
        name: ont.name || 'Imported Ontology',
        description: ont.description || '',
        ontology: ont.ontology || {},
        category: ont.category || 'imported',
        tags: ont.tags || [],
        metadata: ont.metadata
      }))
    }
    
    // Single ontology format
    if (parsed.entityTypes || parsed.edgeTypes) {
      return [{
        name: parsed.name || 'Imported Ontology',
        description: parsed.description || '',
        ontology: {
          entityTypes: parsed.entityTypes || [],
          edgeTypes: parsed.edgeTypes || [],
          domain: parsed.domain
        },
        category: parsed.category || 'imported',
        tags: parsed.tags || []
      }]
    }
    
    throw new Error('Unrecognized JSON ontology format')
  }

  static async parseYAML(data: string): Promise<ImportedOntology[]> {
    // Simple YAML parser for our specific format
    const lines = data.split('\n')
    const ontologies: ImportedOntology[] = []
    
    let currentOntology: any = null
    let currentEntityType: any = null
    let currentEdgeType: any = null
    let currentAttribute: any = null
    let indent = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()
      
      if (!trimmed || trimmed.startsWith('#')) continue
      
      // Calculate indentation
      const currentIndent = line.length - line.trimStart().length
      
      if (trimmed.startsWith('- id:') && currentIndent === 2) {
        // New ontology
        if (currentOntology) {
          ontologies.push(currentOntology)
        }
        currentOntology = {
          name: '',
          description: '',
          ontology: { entityTypes: [], edgeTypes: [] },
          category: 'imported',
          tags: []
        }
        currentOntology.id = trimmed.replace('- id:', '').replace(/"/g, '').trim()
      } else if (currentOntology) {
        if (trimmed.startsWith('name:')) {
          currentOntology.name = trimmed.replace('name:', '').replace(/"/g, '').trim()
        } else if (trimmed.startsWith('description:')) {
          currentOntology.description = trimmed.replace('description:', '').replace(/"/g, '').trim()
        } else if (trimmed.startsWith('category:')) {
          currentOntology.category = trimmed.replace('category:', '').replace(/"/g, '').trim()
        } else if (trimmed.startsWith('tags:')) {
          const tagString = trimmed.replace('tags:', '').trim()
          if (tagString.startsWith('[') && tagString.endsWith(']')) {
            currentOntology.tags = tagString.slice(1, -1).split(',')
              .map(tag => tag.replace(/"/g, '').trim()).filter(Boolean)
          }
        } else if (trimmed.startsWith('- id:') && currentIndent === 8) {
          // Entity type
          currentEntityType = {
            id: trimmed.replace('- id:', '').replace(/"/g, '').trim(),
            name: '',
            description: '',
            attributes: []
          }
          currentOntology.ontology.entityTypes.push(currentEntityType)
        } else if (currentEntityType && currentIndent === 10) {
          if (trimmed.startsWith('name:')) {
            currentEntityType.name = trimmed.replace('name:', '').replace(/"/g, '').trim()
          } else if (trimmed.startsWith('description:')) {
            currentEntityType.description = trimmed.replace('description:', '').replace(/"/g, '').trim()
          } else if (trimmed.startsWith('pattern:')) {
            currentEntityType.pattern = trimmed.replace('pattern:', '').replace(/"/g, '').trim()
          }
        }
      }
    }
    
    if (currentOntology) {
      ontologies.push(currentOntology)
    }
    
    return ontologies
  }

  static async parseTurtle(data: string): Promise<ImportedOntology[]> {
    // Basic Turtle parser for ontology classes and properties
    const ontologies: ImportedOntology[] = []
    const lines = data.split('\n')
    
    let currentOntology: ImportedOntology = {
      name: 'Turtle Import',
      description: 'Imported from Turtle/RDF format',
      ontology: { entityTypes: [], edgeTypes: [] },
      category: 'imported',
      tags: ['turtle', 'rdf']
    }
    
    const entityTypes: any[] = []
    const edgeTypes: any[] = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Parse OWL classes (entity types)
      if (trimmed.includes('rdf:type owl:Class')) {
        const classMatch = trimmed.match(/<([^>]+)>\s+rdf:type\s+owl:Class/)
        if (classMatch) {
          const classUri = classMatch[1]
          const className = classUri.split('/').pop() || classUri.split('#').pop() || 'UnknownClass'
          entityTypes.push({
            id: className,
            name: className,
            description: `Imported from ${classUri}`,
            attributes: []
          })
        }
      }
      
      // Parse object properties (edge types)
      if (trimmed.includes('rdf:type owl:ObjectProperty')) {
        const propMatch = trimmed.match(/<([^>]+)>\s+rdf:type\s+owl:ObjectProperty/)
        if (propMatch) {
          const propUri = propMatch[1]
          const propName = propUri.split('/').pop() || propUri.split('#').pop() || 'UnknownProperty'
          edgeTypes.push({
            id: propName,
            name: propName,
            description: `Imported from ${propUri}`,
            sourceTypes: [],
            targetTypes: []
          })
        }
      }
    }
    
    currentOntology.ontology.entityTypes = entityTypes
    currentOntology.ontology.edgeTypes = edgeTypes
    ontologies.push(currentOntology)
    
    return ontologies
  }

  static async parseOWL(data: string): Promise<ImportedOntology[]> {
    // Basic XML/OWL parser
    const ontologies: ImportedOntology[] = []
    
    // Extract classes
    const classMatches = data.match(/<owl:Class[^>]*rdf:about="([^"]*)"[^>]*>/g) || []
    const entityTypes = classMatches.map(match => {
      const uriMatch = match.match(/rdf:about="([^"]*)"/)
      const uri = uriMatch ? uriMatch[1] : ''
      const name = uri.split('/').pop() || uri.split('#').pop() || 'UnknownClass'
      
      return {
        id: name,
        name: name,
        description: `Imported from ${uri}`,
        attributes: []
      }
    })
    
    // Extract object properties
    const propMatches = data.match(/<owl:ObjectProperty[^>]*rdf:about="([^"]*)"[^>]*>/g) || []
    const edgeTypes = propMatches.map(match => {
      const uriMatch = match.match(/rdf:about="([^"]*)"/)
      const uri = uriMatch ? uriMatch[1] : ''
      const name = uri.split('/').pop() || uri.split('#').pop() || 'UnknownProperty'
      
      return {
        id: name,
        name: name,
        description: `Imported from ${uri}`,
        sourceTypes: [],
        targetTypes: []
      }
    })
    
    ontologies.push({
      name: 'OWL Import',
      description: 'Imported from OWL/XML format',
      ontology: { entityTypes, edgeTypes },
      category: 'imported',
      tags: ['owl', 'xml', 'rdf']
    })
    
    return ontologies
  }

  static async validateOntology(ontology: any): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Basic structure validation
    if (!ontology.entityTypes || !Array.isArray(ontology.entityTypes)) {
      errors.push('Missing or invalid entityTypes array')
    }
    
    if (!ontology.edgeTypes) {
      ontology.edgeTypes = []
    } else if (!Array.isArray(ontology.edgeTypes)) {
      errors.push('Invalid edgeTypes array')
    }
    
    let entityTypeCount = 0
    let edgeTypeCount = 0
    
    // Validate entity types
    if (ontology.entityTypes) {
      entityTypeCount = ontology.entityTypes.length
      
      if (entityTypeCount === 0) {
        warnings.push('No entity types defined')
      } else if (entityTypeCount > 10) {
        errors.push('Too many entity types (maximum 10 allowed)')
      }
      
      const entityTypeIds = new Set()
      for (const entityType of ontology.entityTypes) {
        if (!entityType.id || !entityType.name) {
          errors.push(`Invalid entity type: missing id or name`)
          continue
        }
        
        if (entityTypeIds.has(entityType.id)) {
          errors.push(`Duplicate entity type ID: ${entityType.id}`)
        }
        entityTypeIds.add(entityType.id)
        
        if (entityType.name.length > 100) {
          errors.push(`Entity type name too long: ${entityType.name}`)
        }
        
        if (entityType.description && entityType.description.length > 500) {
          errors.push(`Entity type description too long for: ${entityType.name}`)
        }
      }
    }
    
    // Validate edge types
    if (ontology.edgeTypes) {
      edgeTypeCount = ontology.edgeTypes.length
      
      if (edgeTypeCount > 10) {
        errors.push('Too many edge types (maximum 10 allowed)')
      }
      
      const edgeTypeIds = new Set()
      for (const edgeType of ontology.edgeTypes) {
        if (!edgeType.id || !edgeType.name) {
          errors.push(`Invalid edge type: missing id or name`)
          continue
        }
        
        if (edgeTypeIds.has(edgeType.id)) {
          errors.push(`Duplicate edge type ID: ${edgeType.id}`)
        }
        edgeTypeIds.add(edgeType.id)
        
        if (!edgeType.sourceTypes || !Array.isArray(edgeType.sourceTypes) || edgeType.sourceTypes.length === 0) {
          errors.push(`Edge type ${edgeType.name} missing source types`)
        }
        
        if (!edgeType.targetTypes || !Array.isArray(edgeType.targetTypes) || edgeType.targetTypes.length === 0) {
          errors.push(`Edge type ${edgeType.name} missing target types`)
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      ontologyCount: 1,
      entityTypeCount,
      edgeTypeCount
    }
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
    const rateLimitError = withRateLimit(`ontology-import:${user.userId}`, 10, 60000)
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Parse and validate request
    const validationResult = await validateRequestBody(request, ImportRequestSchema)
    if (validationResult.error) {
      return validationResult.error
    }
    
    const { source, data, format, options } = validationResult.data

    // Step 4: Detect format if not specified
    const detectedFormat = format || await OntologyImporter.detectFormat(data)
    if (!detectedFormat) {
      return NextResponse.json(
        { error: 'Unable to detect ontology format. Please specify format parameter.' },
        { status: 400 }
      )
    }

    // Step 5: Parse ontologies based on format
    let parsedOntologies: ImportedOntology[]
    
    try {
      switch (detectedFormat) {
        case 'json':
          parsedOntologies = await OntologyImporter.parseJSON(data)
          break
        case 'yaml':
          parsedOntologies = await OntologyImporter.parseYAML(data)
          break
        case 'turtle':
          parsedOntologies = await OntologyImporter.parseTurtle(data)
          break
        case 'owl':
          parsedOntologies = await OntologyImporter.parseOWL(data)
          break
        default:
          throw new Error(`Unsupported format: ${detectedFormat}`)
      }
    } catch (parseError) {
      return NextResponse.json(
        { 
          error: 'Failed to parse ontology data',
          details: parseError instanceof Error ? parseError.message : 'Parse error'
        },
        { status: 400 }
      )
    }

    // Step 6: Validate ontologies
    const validationResults: ValidationResult[] = []
    const validOntologies: ImportedOntology[] = []
    
    if (options.validateStructure) {
      for (const ontology of parsedOntologies) {
        const validation = await OntologyImporter.validateOntology(ontology.ontology)
        validationResults.push(validation)
        
        if (validation.isValid) {
          validOntologies.push(ontology)
        }
      }
      
      if (validOntologies.length === 0) {
        return NextResponse.json(
          { 
            error: 'No valid ontologies found in import data',
            validationResults
          },
          { status: 400 }
        )
      }
    } else {
      validOntologies.push(...parsedOntologies)
    }

    // Step 7: Check for existing ontologies if overwrite is disabled
    const createdOntologies: any[] = []
    const skippedOntologies: string[] = []
    
    for (const ontology of validOntologies) {
      if (!options.overwriteExisting) {
        // Check if ontology with same name exists
        const existingCheck = await mcp__airtable__list_records({
          baseId: 'appvLsaMZqtLc9EIX',
          tableId: 'tblOntologyTemplates',
          filterByFormula: `AND({Name} = "${ontology.name}", {CreatedBy} = "${user.userId}")`,
          maxRecords: 1
        })
        
        if (existingCheck.records.length > 0) {
          skippedOntologies.push(ontology.name)
          continue
        }
      }
      
      // Step 8: Create ontology record
      const templateRecord = {
        Name: ontology.name,
        Description: ontology.description,
        OntologyDefinition: JSON.stringify(ontology.ontology),
        Category: options.assignToCategory || ontology.category,
        IsPublic: options.makePublic,
        Tags: [...ontology.tags, ...options.addTags].join(', '),
        CreatedBy: user.userId,
        LastModified: new Date().toISOString(),
        UsageCount: 0,
        Rating: 0,
        RatingCount: 0,
        IsActive: true,
        Domain: ontology.ontology.domain || '',
        EntityTypeCount: ontology.ontology.entityTypes?.length || 0,
        EdgeTypeCount: ontology.ontology.edgeTypes?.length || 0,
        ImportSource: source,
        ImportFormat: detectedFormat
      }
      
      const result = await mcp__airtable__create_record({
        baseId: 'appvLsaMZqtLc9EIX',
        tableId: 'tblOntologyTemplates',
        fields: templateRecord
      })
      
      createdOntologies.push({
        id: result.id,
        name: ontology.name,
        description: ontology.description,
        category: templateRecord.Category,
        entityTypeCount: templateRecord.EntityTypeCount,
        edgeTypeCount: templateRecord.EdgeTypeCount,
        createdAt: result.createdTime
      })
    }

    // Step 9: Prepare response
    const response = {
      success: true,
      message: `Successfully imported ${createdOntologies.length} ontologies`,
      results: {
        imported: createdOntologies,
        skipped: skippedOntologies,
        validationResults: options.validateStructure ? validationResults : undefined
      },
      summary: {
        totalParsed: parsedOntologies.length,
        totalImported: createdOntologies.length,
        totalSkipped: skippedOntologies.length,
        format: detectedFormat,
        source
      }
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Ontology import API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to import ontologies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}