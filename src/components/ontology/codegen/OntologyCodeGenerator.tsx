import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Switch } from '../../ui/switch'
import { Label } from '../../ui/label'
import { Alert, AlertDescription } from '../../ui/alert'
import { Copy, Download, FileCode, CheckCircle, XCircle } from 'lucide-react'
import { OntologyCodeGenerator as CodeGen, GenerationOptions } from '../../../lib/ontology/codegen/OntologyCodeGenerator'
import { OntologyRecord, EntityDefinitionRecord, EdgeDefinitionRecord } from '../../../lib/types/airtable'

interface OntologyCodeGeneratorProps {
  ontology: OntologyRecord
  entities: EntityDefinitionRecord[]
  edges: EdgeDefinitionRecord[]
}

export const OntologyCodeGeneratorComponent: React.FC<OntologyCodeGeneratorProps> = ({
  ontology,
  entities,
  edges
}) => {
  const [generatedCode, setGeneratedCode] = useState('')
  const [generationResult, setGenerationResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<GenerationOptions>({
    includeValidators: false,
    includeHelpers: true,
    format: 'python'
  })

  const codeGenerator = new CodeGen(ontology, entities, edges)

  const generateCode = async () => {
    setLoading(true)
    try {
      const result = await codeGenerator.generate(options)
      setGeneratedCode(result.code)
      setGenerationResult(result)
    } catch (error) {
      setGenerationResult({
        code: '',
        isValid: false,
        errors: [{
          message: error instanceof Error ? error.message : 'Code generation failed',
          severity: 'error'
        }],
        metadata: {}
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (entities.length > 0 || edges.length > 0) {
      generateCode()
    }
  }, [entities, edges, options])

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode)
  }

  const handleDownload = (filename?: string) => {
    const blob = new Blob([generatedCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `${ontology.fields.Name?.toLowerCase().replace(/\s+/g, '_') || 'ontology'}.py`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadPackage = async () => {
    const packageData = await codeGenerator.generatePackage()
    
    // Create a zip-like structure (simplified for demo)
    let packageContent = ''
    Object.entries(packageData.files).forEach(([filename, content]) => {
      packageContent += `# ========== ${filename} ==========\n${content}\n\n`
    })
    
    const blob = new Blob([packageContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${ontology.fields.Name?.toLowerCase().replace(/\s+/g, '_') || 'ontology'}_package.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ontology Code Generation</CardTitle>
          <CardDescription>
            Generate Python code for your ontology definitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Generation Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={options.format}
                  onValueChange={(value: any) => setOptions(prev => ({ ...prev, format: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python (.py)</SelectItem>
                    <SelectItem value="json">JSON Schema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="include-helpers"
                  checked={options.includeHelpers}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeHelpers: checked }))}
                />
                <Label htmlFor="include-helpers">Include helper functions</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="include-validators"
                  checked={options.includeValidators}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeValidators: checked }))}
                />
                <Label htmlFor="include-validators">Include custom validators</Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={generateCode} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Code'}
              </Button>
              <Button variant="outline" onClick={handleCopyToClipboard} disabled={!generatedCode}>
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </Button>
              <Button variant="outline" onClick={() => handleDownload()} disabled={!generatedCode}>
                <Download className="mr-2 h-4 w-4" />
                Download .py File
              </Button>
              <Button variant="outline" onClick={handleDownloadPackage} disabled={!generatedCode}>
                <FileCode className="mr-2 h-4 w-4" />
                Download Package
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generation Status */}
      {generationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {generationResult.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Generation Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generationResult.isValid ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Code generated successfully! 
                  {generationResult.metadata && (
                    <div className="mt-2 text-sm">
                      <p>Entities: {generationResult.metadata.entityCount}</p>
                      <p>Edges: {generationResult.metadata.edgeCount}</p>
                      <p>Version: {generationResult.metadata.version}</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div>
                    <p className="font-semibold">Code generation errors:</p>
                    <ul className="mt-2 space-y-1">
                      {generationResult.errors.map((error: any, idx: number) => (
                        <li key={idx} className="text-sm">
                          {error.line && `Line ${error.line}: `}{error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Code Preview */}
      {generatedCode && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Code Preview</CardTitle>
            <CardDescription>
              Preview of your generated ontology code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview">
              <TabsList>
                <TabsTrigger value="preview">Code Preview</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="space-y-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono max-h-96">
                    <code>{generatedCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={handleCopyToClipboard}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="metadata">
                {generationResult?.metadata && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold">Ontology Name</Label>
                        <p className="text-sm text-muted-foreground">
                          {generationResult.metadata.ontologyName}
                        </p>
                      </div>
                      <div>
                        <Label className="font-semibold">Version</Label>
                        <p className="text-sm text-muted-foreground">
                          {generationResult.metadata.version}
                        </p>
                      </div>
                      <div>
                        <Label className="font-semibold">Generated</Label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(generationResult.metadata.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <Label className="font-semibold">Checksum</Label>
                        <p className="text-sm text-muted-foreground font-mono">
                          {generationResult.metadata.checksum}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {generationResult.metadata.entityCount}
                            </div>
                            <p className="text-sm text-muted-foreground">Entity Types</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {generationResult.metadata.edgeCount}
                            </div>
                            <p className="text-sm text-muted-foreground">Edge Types</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. Install dependencies: <code className="bg-muted px-2 py-1 rounded">pip install pydantic</code></p>
          <p>2. Save the generated code as a Python file</p>
          <p>3. Import and use in your Graphiti application:</p>
          <pre className="bg-muted p-2 rounded text-xs">
{`from ontology import Person, Company, Employment, edge_type_map

# Create entities
person = Person(first_name="John", last_name="Doe")
company = Company(name="Acme Corp")

# Create relationships
employment = Employment(role="Engineer", start_date=datetime.now())`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}