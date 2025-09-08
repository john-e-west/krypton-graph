import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileJson, FileCode, FileText, Database } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import TestDataForm from '../components/ontology/testing/TestDataForm'
import CSVImportDialog from '../components/ontology/testing/CSVImportDialog'
import EdgeTestCreator from '../components/ontology/testing/EdgeTestCreator'
import TextGenerator from '../components/ontology/testing/TextGenerator'
import PythonFixtureExporter from '../components/ontology/testing/PythonFixtureExporter'
import ValidationReport from '../components/ontology/testing/ValidationReport'
import type { EntityTypeDefinition, EdgeTypeDefinition } from '@/types/ontology'
import type { TestEntity, TestEdge, TestDataSet, SampleText } from '@/types/testing'

export default function TestDataCreation() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('entities')
  const [showCSVDialog, setShowCSVDialog] = useState(false)
  const [testDataSet, setTestDataSet] = useState<TestDataSet>({
    id: `test-set-${Date.now()}`,
    name: 'Test Dataset 1',
    ontologyId: 'test-ontology-1',
    entities: [],
    edges: [],
    sampleTexts: [],
    metadata: {
      createdAt: new Date(),
      purpose: 'Testing Story 3.4 functionality',
      validationStatus: 'pending'
    }
  })

  // Sample entity types for testing
  const sampleEntityTypes: EntityTypeDefinition[] = [
    {
      id: 'entity-patient',
      ontologyId: 'test-ontology-1',
      name: 'Patient',
      description: 'A person receiving medical care',
      baseClass: 'BaseModel',
      fields: [
        {
          name: 'first_name',
          type: 'string',
          required: true,
          description: 'Patient first name',
          constraints: { minLength: 1, maxLength: 100 }
        },
        {
          name: 'last_name',
          type: 'string',
          required: true,
          description: 'Patient last name',
          constraints: { minLength: 1, maxLength: 100 }
        },
        {
          name: 'date_of_birth',
          type: 'date',
          required: true,
          description: 'Patient date of birth'
        },
        {
          name: 'medical_record_number',
          type: 'string',
          required: false,
          description: 'Unique medical record identifier',
          constraints: { pattern: '^MRN-[0-9]{6}$' }
        },
        {
          name: 'email',
          type: 'email',
          required: false,
          description: 'Patient email address'
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
          name: 'first_name',
          type: 'string',
          required: true,
          description: 'Doctor first name'
        },
        {
          name: 'last_name',
          type: 'string',
          required: true,
          description: 'Doctor last name'
        },
        {
          name: 'specialization',
          type: 'string',
          required: true,
          description: 'Medical specialization',
          constraints: {
            enum: ['Cardiology', 'Neurology', 'Pediatrics', 'Surgery', 'General Practice']
          }
        },
        {
          name: 'license_number',
          type: 'string',
          required: true,
          description: 'Medical license number'
        },
        {
          name: 'years_experience',
          type: 'integer',
          required: false,
          description: 'Years of medical practice',
          constraints: { min: 0, max: 60 }
        }
      ],
      metadata: {},
      validation: { isValid: true, errors: [], warnings: [] }
    }
  ]

  // Sample edge types for testing - matching EdgeTestCreator interface
  const sampleEdgeTypes: any[] = [
    {
      id: 'edge-treats',
      name: 'TREATS',
      sourceTypes: ['Doctor'],  // Array of valid source entity types
      targetTypes: ['Patient'],  // Array of valid target entity types
      attributes: [  // Using 'attributes' instead of 'properties'
        {
          name: 'treatment_date',
          type: 'datetime',
          isOptional: false,
          description: 'Date of treatment'
        },
        {
          name: 'diagnosis',
          type: 'str',
          isOptional: false,
          description: 'Medical diagnosis'
        },
        {
          name: 'treatment_plan',
          type: 'str',
          isOptional: true,
          description: 'Detailed treatment plan'
        }
      ]
    }
  ]

  const handleEntityCreated = (entity: TestEntity) => {
    setTestDataSet(prev => ({
      ...prev,
      entities: [...prev.entities, entity]
    }))
  }

  const handleEdgeCreated = (edge: TestEdge) => {
    setTestDataSet(prev => ({
      ...prev,
      edges: [...prev.edges, edge]
    }))
  }

  const handleTextGenerated = (text: SampleText) => {
    setTestDataSet(prev => ({
      ...prev,
      sampleTexts: [...prev.sampleTexts, text]
    }))
  }

  const handleCSVImport = (entities: TestEntity[]) => {
    setTestDataSet(prev => ({
      ...prev,
      entities: [...prev.entities, ...entities]
    }))
  }

  const handleValidation = (status: 'passed' | 'failed' | 'partial') => {
    setTestDataSet(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        validationStatus: status
      }
    }))
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
          
          <h1 className="text-3xl font-bold">Story 3.4: Test Dataset Creation</h1>
          <p className="text-muted-foreground mt-2">
            Create test instances using custom entity and edge types with validation
          </p>
        </div>

        {/* Dataset Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Test Dataset</CardTitle>
            <CardDescription>
              {testDataSet.name} - {testDataSet.metadata.purpose}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{testDataSet.entities.length}</div>
                <div className="text-sm text-muted-foreground">Entities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{testDataSet.edges.length}</div>
                <div className="text-sm text-muted-foreground">Edges</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{testDataSet.sampleTexts.length}</div>
                <div className="text-sm text-muted-foreground">Sample Texts</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold capitalize ${
                  testDataSet.metadata.validationStatus === 'passed' ? 'text-green-600' :
                  testDataSet.metadata.validationStatus === 'failed' ? 'text-red-600' :
                  testDataSet.metadata.validationStatus === 'partial' ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                  {testDataSet.metadata.validationStatus}
                </div>
                <div className="text-sm text-muted-foreground">Validation</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="entities">
              <Database className="mr-2 h-4 w-4" />
              Entities
            </TabsTrigger>
            <TabsTrigger value="edges">
              <Database className="mr-2 h-4 w-4" />
              Edges
            </TabsTrigger>
            <TabsTrigger value="csv">
              <FileText className="mr-2 h-4 w-4" />
              CSV Import
            </TabsTrigger>
            <TabsTrigger value="text">
              <FileText className="mr-2 h-4 w-4" />
              Text Gen
            </TabsTrigger>
            <TabsTrigger value="export">
              <FileCode className="mr-2 h-4 w-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="validation">
              <FileJson className="mr-2 h-4 w-4" />
              Validation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entities" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Test Entities</CardTitle>
                <CardDescription>
                  Use dynamic forms to create test entity instances with validation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TestDataForm
                  entityTypes={sampleEntityTypes}
                  onEntityCreated={handleEntityCreated}
                  existingEntities={testDataSet.entities}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edges" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Test Edges</CardTitle>
                <CardDescription>
                  Define relationships between test entities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sampleEdgeTypes.length > 0 ? (
                  <EdgeTestCreator
                    edgeType={sampleEdgeTypes[0]}  // Pass single edge type
                    availableEntities={testDataSet.entities}
                    onSave={handleEdgeCreated}
                    onCancel={() => {}}
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No edge types available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="csv" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Import from CSV</CardTitle>
                <CardDescription>
                  Batch import test entities from CSV files with column mapping
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowCSVDialog(true)}>
                  Open CSV Import Dialog
                </Button>
                {showCSVDialog && sampleEntityTypes.length > 0 && (
                  <CSVImportDialog
                    open={showCSVDialog}
                    onOpenChange={setShowCSVDialog}
                    entityType={sampleEntityTypes[0]}  // Pass single entity type
                    onImport={handleCSVImport}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="text" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Sample Text</CardTitle>
                <CardDescription>
                  Create sample text containing entities and relationships for extraction testing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TextGenerator
                  entities={testDataSet.entities}
                  edges={testDataSet.edges}
                  onTextGenerated={handleTextGenerated}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Test Fixtures</CardTitle>
                <CardDescription>
                  Export test data as Python fixtures or JSON for automated testing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PythonFixtureExporter
                  testDataSet={testDataSet}
                  entityTypes={sampleEntityTypes}
                  edgeTypes={sampleEdgeTypes}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Validation Report</CardTitle>
                <CardDescription>
                  View comprehensive validation results for all test data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ValidationReport
                  testDataSet={testDataSet}
                  entityTypes={sampleEntityTypes}
                  edgeTypes={sampleEdgeTypes}
                  onValidationComplete={handleValidation}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Test Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Test Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li><strong>Entities Tab:</strong> Create test entity instances using dynamic forms with field validation</li>
              <li><strong>Edges Tab:</strong> Define relationships between created entities with attribute validation</li>
              <li><strong>CSV Import:</strong> Upload CSV files and map columns to entity fields for batch creation</li>
              <li><strong>Text Gen:</strong> Generate sample text containing entities and relationships</li>
              <li><strong>Export:</strong> Export test data as Python fixtures or JSON format</li>
              <li><strong>Validation:</strong> View comprehensive validation report for all test data</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}