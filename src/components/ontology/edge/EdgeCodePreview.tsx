import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { Copy, Download } from 'lucide-react'
import { EdgeTypeDefinition } from './EdgeTypeEditor'

interface EdgeCodePreviewProps {
  edgeType: EdgeTypeDefinition
}

export const EdgeCodePreview: React.FC<EdgeCodePreviewProps> = ({ edgeType }) => {
  const generatePythonCode = (): string => {
    const attributes = edgeType.attributes.map(attr => {
      const typeMap: Record<string, string> = {
        'str': 'str',
        'int': 'int',
        'float': 'float',
        'bool': 'bool',
        'datetime': 'datetime',
        'date': 'date',
        'List[str]': 'List[str]',
        'Dict[str, Any]': 'Dict[str, Any]',
        'UUID': 'UUID',
        'Enum': 'str'  // Simplified for now
      }
      
      const pythonType = typeMap[attr.type] || 'Any'
      const fieldType = attr.isOptional ? `Optional[${pythonType}]` : pythonType
      const defaultValue = attr.isOptional ? ' = Field(None' : ' = Field('
      const description = attr.description ? `, description="${attr.description}"` : ''
      
      return `    ${attr.name}: ${fieldType}${defaultValue}${description})`
    }).join('\n')

    const imports = generateImports()
    
    return `${imports}

class ${edgeType.name}(BaseModel):
    """${edgeType.description || `${edgeType.name} edge type`}"""
${attributes || '    pass'}
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }`
  }

  const generateImports = (): string => {
    const imports = new Set<string>()
    imports.add('from pydantic import BaseModel, Field')
    
    if (edgeType.attributes.some(a => a.isOptional)) {
      imports.add('from typing import Optional')
    }
    
    const typeImports = new Set<string>()
    edgeType.attributes.forEach(attr => {
      if (attr.type === 'datetime') typeImports.add('from datetime import datetime')
      if (attr.type === 'date') typeImports.add('from datetime import date')
      if (attr.type === 'UUID') typeImports.add('from uuid import UUID')
      if (attr.type.startsWith('List')) typeImports.add('from typing import List')
      if (attr.type.startsWith('Dict')) typeImports.add('from typing import Dict, Any')
    })
    
    return [...imports, ...typeImports].join('\n')
  }

  const generateEdgeMapping = (): string => {
    if (edgeType.mappings.length === 0) {
      return '# No mappings defined'
    }

    const mappings = edgeType.mappings.map(mapping => {
      const cardinalityMap: Record<string, string> = {
        '1:1': 'one-to-one',
        '1:n': 'one-to-many',
        'n:1': 'many-to-one',
        'n:n': 'many-to-many'
      }
      
      return `    "${edgeType.name}": {
        "source": "${mapping.sourceEntity}",
        "target": "${mapping.targetEntity}",
        "cardinality": "${cardinalityMap[mapping.cardinality] || mapping.cardinality}",
        "directional": ${edgeType.metadata.isDirectional ? 'True' : 'False'}
    }`
    })

    return `# Edge Type Mapping
edge_type_map = {
${mappings.join(',\n')}
}`
  }

  const generateFullCode = (): string => {
    return `# Generated Edge Type Definition
# ${new Date().toISOString()}

${generatePythonCode()}

${generateEdgeMapping()}

# Usage Example
def create_${edgeType.name.toLowerCase()}_edge(${edgeType.attributes.filter(a => !a.isOptional).map(a => a.name).join(', ')}):
    """Create a new ${edgeType.name} edge instance"""
    return ${edgeType.name}(
${edgeType.attributes.filter(a => !a.isOptional).map(a => `        ${a.name}=${a.name}`).join(',\n')}
    )`
  }

  const generateJsonSchema = (): string => {
    const schema = {
      name: edgeType.name,
      description: edgeType.description,
      metadata: edgeType.metadata,
      attributes: edgeType.attributes.map(attr => ({
        name: attr.name,
        type: attr.type,
        required: !attr.isOptional,
        description: attr.description
      })),
      mappings: edgeType.mappings.map(mapping => ({
        source: mapping.sourceEntity,
        target: mapping.targetEntity,
        cardinality: mapping.cardinality,
        constraints: mapping.constraints
      }))
    }
    
    return JSON.stringify(schema, null, 2)
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generated Code</CardTitle>
          <CardDescription>
            Preview the generated code for your edge type definition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="python">
            <TabsList>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="mapping">Edge Mapping</TabsTrigger>
              <TabsTrigger value="json">JSON Schema</TabsTrigger>
            </TabsList>

            <TabsContent value="python" className="space-y-4">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(generateFullCode())}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(generateFullCode(), `${edgeType.name.toLowerCase()}_edge.py`)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
              
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className="text-sm">{generateFullCode()}</code>
              </pre>
            </TabsContent>

            <TabsContent value="mapping" className="space-y-4">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(generateEdgeMapping())}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
              
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className="text-sm">{generateEdgeMapping()}</code>
              </pre>
            </TabsContent>

            <TabsContent value="json" className="space-y-4">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(generateJsonSchema())}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(generateJsonSchema(), `${edgeType.name.toLowerCase()}_edge.json`)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
              
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className="text-sm">{generateJsonSchema()}</code>
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {!edgeType.validation.isValid && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Validation Issues</CardTitle>
            <CardDescription>
              Fix these issues before the edge type can be saved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {edgeType.validation.errors.map((error, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span>
                    <strong>{error.field}:</strong> {error.message}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}