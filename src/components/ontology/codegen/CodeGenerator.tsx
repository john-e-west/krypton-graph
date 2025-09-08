import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Code, Settings, FileText, AlertCircle } from 'lucide-react'
import type { EntityTypeDefinition, EdgeTypeDefinition } from '@/types/ontology'

interface CodeGeneratorProps {
  entityTypes: EntityTypeDefinition[]
  edgeTypes: EdgeTypeDefinition[]
  ontologyName: string
  onGenerate: (code: string) => void
}

export default function CodeGenerator({
  entityTypes,
  edgeTypes,
  ontologyName,
  onGenerate
}: CodeGeneratorProps) {
  const [includeValidators, setIncludeValidators] = useState(true)
  const [includeDocstrings, setIncludeDocstrings] = useState(true)
  const [includeEdgeMap, setIncludeEdgeMap] = useState(true)
  const [formatWithBlack, setFormatWithBlack] = useState(true)

  const generatePythonCode = () => {
    const lines: string[] = []
    
    // Module docstring
    if (includeDocstrings) {
      lines.push('"""')
      lines.push(`${ontologyName} - Generated Ontology Module`)
      lines.push('Generated for use with the Graphiti API')
      lines.push(`Generated at: ${new Date().toISOString()}`)
      lines.push('"""')
      lines.push('')
    }

    // Imports
    lines.push('from datetime import datetime')
    lines.push('from typing import Optional, List, Dict, Any')
    lines.push('from pydantic import BaseModel, Field')
    if (includeValidators) {
      lines.push('from pydantic import validator')
    }
    lines.push('')
    lines.push('')

    // Generate Entity Classes
    lines.push('# Entity Type Definitions')
    lines.push('# ========================')
    lines.push('')

    entityTypes.forEach(entity => {
      // Class definition
      lines.push(`class ${entity.name}(BaseModel):`)
      
      // Class docstring
      if (includeDocstrings && entity.description) {
        lines.push(`    """${entity.description}"""`)
        lines.push('')
      }

      // Fields
      entity.fields.forEach(field => {
        const fieldType = mapFieldType(field.type as string)
        const isOptional = !field.required
        
        let fieldDef = `    ${field.name}: `
        if (isOptional) {
          fieldDef += `Optional[${fieldType}]`
        } else {
          fieldDef += fieldType
        }

        // Add Field() with description
        if (field.description) {
          if (isOptional) {
            fieldDef += ` = Field(None, description="${field.description}")`
          } else {
            fieldDef += ` = Field(..., description="${field.description}")`
          }
        } else if (isOptional) {
          fieldDef += ' = None'
        }

        lines.push(fieldDef)
      })

      // Add validators if enabled
      if (includeValidators) {
        // Example validator for string fields
        const stringFields = entity.fields.filter(f => f.type === 'string' && f.required)
        if (stringFields.length > 0) {
          lines.push('')
          lines.push(`    @validator('${stringFields[0].name}')`)
          lines.push('    def validate_not_empty(cls, v):')
          lines.push('        if not v or not v.strip():')
          lines.push(`            raise ValueError('${stringFields[0].name} cannot be empty')`)
          lines.push('        return v')
        }
      }

      lines.push('')
      lines.push('    class Config:')
      lines.push('        json_encoders = {')
      lines.push('            datetime: lambda v: v.isoformat()')
      lines.push('        }')
      lines.push('')
      lines.push('')
    })

    // Generate Edge Classes
    if (edgeTypes.length > 0) {
      lines.push('# Edge Type Definitions')
      lines.push('# =====================')
      lines.push('')

      edgeTypes.forEach(edge => {
        const className = `${edge.name}Edge`
        lines.push(`class ${className}(BaseModel):`)
        
        if (includeDocstrings && edge.description) {
          lines.push(`    """${edge.description}"""`)
          lines.push('')
        }

        // Add source and target fields
        lines.push(`    source_id: str = Field(..., description="ID of the ${edge.sourceEntity}")`)
        lines.push(`    target_id: str = Field(..., description="ID of the ${edge.targetEntity}")`)
        
        // Add edge properties
        if (edge.properties && edge.properties.length > 0) {
          edge.properties.forEach(prop => {
            const propType = mapFieldType(prop.type as string)
            const isOptional = !prop.required
            
            let propDef = `    ${prop.name}: `
            if (isOptional) {
              propDef += `Optional[${propType}]`
            } else {
              propDef += propType
            }

            if (prop.description) {
              if (isOptional) {
                propDef += ` = Field(None, description="${prop.description}")`
              } else {
                propDef += ` = Field(..., description="${prop.description}")`
              }
            } else if (isOptional) {
              propDef += ' = None'
            }

            lines.push(propDef)
          })
        }

        lines.push('')
        lines.push('    class Config:')
        lines.push('        json_encoders = {')
        lines.push('            datetime: lambda v: v.isoformat()')
        lines.push('        }')
        lines.push('')
        lines.push('')
      })
    }

    // Generate Edge Type Map
    if (includeEdgeMap && edgeTypes.length > 0) {
      lines.push('# Edge Type Map for Graphiti API')
      lines.push('# ==============================')
      lines.push('')
      lines.push('EDGE_TYPE_MAP = {')
      
      edgeTypes.forEach(edge => {
        lines.push(`    "${edge.name}": {`)
        lines.push(`        "source": "${edge.sourceEntity}",`)
        lines.push(`        "target": "${edge.targetEntity}",`)
        lines.push(`        "cardinality": "${edge.cardinality || 'one-to-many'}",`)
        lines.push(`        "bidirectional": ${edge.bidirectional ? 'True' : 'False'}`)
        lines.push('    },')
      })
      
      lines.push('}')
      lines.push('')

      // Add fallback pattern
      lines.push('# Fallback pattern for undefined edge types')
      lines.push('def get_edge_config(edge_type: str) -> Dict[str, Any]:')
      lines.push('    """Get edge configuration with fallback support."""')
      lines.push('    return EDGE_TYPE_MAP.get(edge_type, {')
      lines.push('        "source": "Entity",')
      lines.push('        "target": "Entity",')
      lines.push('        "cardinality": "one-to-many",')
      lines.push('        "bidirectional": False')
      lines.push('    })')
      lines.push('')
    }

    // Add utility functions
    lines.push('# Utility Functions')
    lines.push('# ================')
    lines.push('')
    lines.push('def validate_ontology():')
    lines.push('    """Validate that all ontology definitions are properly configured."""')
    lines.push('    entity_types = [')
    entityTypes.forEach(entity => {
      lines.push(`        ${entity.name},`)
    })
    lines.push('    ]')
    lines.push('    ')
    lines.push('    edge_types = [')
    edgeTypes.forEach(edge => {
      lines.push(`        ${edge.name}Edge,`)
    })
    lines.push('    ]')
    lines.push('    ')
    lines.push('    return {')
    lines.push('        "entities": entity_types,')
    lines.push('        "edges": edge_types,')
    lines.push('        "edge_map": EDGE_TYPE_MAP if "EDGE_TYPE_MAP" in globals() else {}')
    lines.push('    }')
    lines.push('')

    // Version info
    lines.push('')
    lines.push('# Version Information')
    lines.push(`__version__ = "1.0.0"`)
    lines.push(`__generated__ = "${new Date().toISOString()}"`)
    lines.push(`__ontology__ = "${ontologyName}"`)

    const code = lines.join('\n')
    onGenerate(code)
  }

  const mapFieldType = (fieldType: string): string => {
    const typeMap: Record<string, string> = {
      'string': 'str',
      'text': 'str',
      'integer': 'int',
      'int': 'int',
      'float': 'float',
      'number': 'float',
      'boolean': 'bool',
      'bool': 'bool',
      'datetime': 'datetime',
      'date': 'datetime',
      'array': 'List[Any]',
      'object': 'Dict[str, Any]',
      'json': 'Dict[str, Any]'
    }
    return typeMap[fieldType.toLowerCase()] || 'str'
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="settings">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="preview">
            <FileText className="mr-2 h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="include-validators">Include Validators</Label>
              <Switch
                id="include-validators"
                checked={includeValidators}
                onCheckedChange={setIncludeValidators}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="include-docstrings">Include Docstrings</Label>
              <Switch
                id="include-docstrings"
                checked={includeDocstrings}
                onCheckedChange={setIncludeDocstrings}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="include-edge-map">Include Edge Type Map</Label>
              <Switch
                id="include-edge-map"
                checked={includeEdgeMap}
                onCheckedChange={setIncludeEdgeMap}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="format-black">Format with Black</Label>
              <Switch
                id="format-black"
                checked={formatWithBlack}
                onCheckedChange={setFormatWithBlack}
              />
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Generated code will include {entityTypes.length} entity types and {edgeTypes.length} edge types
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted">
            <h3 className="font-semibold mb-2">Ontology Summary</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Entities:</strong>
                <ul className="list-disc list-inside ml-2">
                  {entityTypes.map(e => (
                    <li key={e.id}>{e.name} ({e.fields.length} fields)</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Edges:</strong>
                <ul className="list-disc list-inside ml-2">
                  {edgeTypes.map(e => (
                    <li key={e.id}>{e.name}: {e.sourceEntity} → {e.targetEntity}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Button onClick={generatePythonCode} className="w-full">
        <Code className="mr-2 h-4 w-4" />
        Generate Python Code
      </Button>
    </div>
  )
}