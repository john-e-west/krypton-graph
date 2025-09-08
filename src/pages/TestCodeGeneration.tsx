import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Copy, Download, Code, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CodeGenerator from '../components/ontology/codegen/CodeGenerator'
import type { EntityTypeDefinition, EdgeTypeDefinition } from '@/types/ontology'

export default function TestCodeGeneration() {
  const navigate = useNavigate()
  const [generatedCode, setGeneratedCode] = useState<string>('')
  const [copied, setCopied] = useState(false)

  // Sample ontology for testing
  const sampleEntities: EntityTypeDefinition[] = [
    {
      id: 'entity-patient',
      ontologyId: 'test-ontology-1',
      name: 'Patient',
      description: 'A person receiving medical care',
      baseClass: 'BaseModel',
      fields: [
        {
          name: 'patient_id',
          type: 'string',
          required: true,
          description: 'Unique patient identifier'
        },
        {
          name: 'first_name',
          type: 'string',
          required: true,
          description: 'Patient first name'
        },
        {
          name: 'last_name',
          type: 'string',
          required: true,
          description: 'Patient last name'
        },
        {
          name: 'date_of_birth',
          type: 'datetime',
          required: true,
          description: 'Patient date of birth'
        },
        {
          name: 'medical_record_number',
          type: 'string',
          required: false,
          description: 'Medical record number'
        }
      ],
      metadata: {},
      validation: { isValid: true, errors: [], warnings: [] }
    },
    {
      id: 'entity-doctor',
      ontologyId: 'test-ontology-1',
      name: 'Doctor',
      description: 'A medical practitioner',
      baseClass: 'BaseModel',
      fields: [
        {
          name: 'doctor_id',
          type: 'string',
          required: true,
          description: 'Unique doctor identifier'
        },
        {
          name: 'full_name',
          type: 'string',
          required: true,
          description: 'Doctor full name'
        },
        {
          name: 'specialization',
          type: 'string',
          required: true,
          description: 'Medical specialization'
        },
        {
          name: 'license_number',
          type: 'string',
          required: true,
          description: 'Medical license number'
        }
      ],
      metadata: {},
      validation: { isValid: true, errors: [], warnings: [] }
    }
  ]

  const sampleEdges: EdgeTypeDefinition[] = [
    {
      id: 'edge-treats',
      ontologyId: 'test-ontology-1',
      name: 'TREATS',
      description: 'Doctor treats patient relationship',
      sourceEntity: 'Doctor',
      targetEntity: 'Patient',
      cardinality: 'one-to-many',
      bidirectional: false,
      properties: [
        {
          name: 'treatment_date',
          type: 'datetime',
          required: true,
          description: 'Date of treatment'
        },
        {
          name: 'diagnosis',
          type: 'string',
          required: true,
          description: 'Medical diagnosis'
        }
      ],
      metadata: {},
      validation: { isValid: true, errors: [], warnings: [] }
    }
  ]

  const handleGenerate = (code: string) => {
    setGeneratedCode(code)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ontology.py'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="container max-w-7xl mx-auto px-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/ontologies')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Ontologies
          </Button>
          
          <h1 className="text-3xl font-bold">Story 3.5: Ontology Code Generation</h1>
          <p className="text-muted-foreground mt-2">
            Generate Python code from ontology definitions for use with Graphiti API
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Code Generator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Code Generator
              </CardTitle>
              <CardDescription>
                Configure and generate Python code from your ontology
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeGenerator
                entityTypes={sampleEntities}
                edgeTypes={sampleEdges}
                ontologyName="Medical Ontology"
                onGenerate={handleGenerate}
              />
            </CardContent>
          </Card>

          {/* Generated Code Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Python Code</CardTitle>
              <CardDescription>
                Preview the generated code before downloading
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedCode ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCopy}
                      variant="outline"
                      size="sm"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy to Clipboard
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download as .py
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto max-h-[600px] overflow-y-auto">
                    <code className="text-sm">{generatedCode}</code>
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Click "Generate Python Code" to see the output
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Test Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Test Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>The Code Generator will create a complete Python module with Pydantic models</li>
              <li>Generated code includes all entity and edge type definitions</li>
              <li>Edge type map dictionary is automatically generated for Graphiti API</li>
              <li>Proper imports and type hints are included</li>
              <li>Click "Generate Python Code" to create the ontology module</li>
              <li>Use "Copy to Clipboard" or "Download as .py" to export the code</li>
              <li>The generated code is ready to use with the Graphiti API</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}