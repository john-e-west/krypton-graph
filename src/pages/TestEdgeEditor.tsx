import { useState } from 'react'
import { EdgeTypeEditor } from '../components/ontology/edge/EdgeTypeEditor'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface EdgeTypeDefinition {
  id?: string
  ontologyId: string
  name: string
  description: string
  attributes: EdgeAttribute[]
  mappings: EdgeMapping[]
  metadata: {
    isDirectional: boolean
    category?: string
  }
  validation: {
    isValid: boolean
    errors: ValidationError[]
  }
}

interface EdgeAttribute {
  name: string
  type: string
  description?: string
  required?: boolean
  defaultValue?: any
}

interface EdgeMapping {
  sourceEntity: string
  targetEntity: string
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-many'
  constraints?: any
}

interface ValidationError {
  field: string
  message: string
}

export default function TestEdgeEditor() {
  const navigate = useNavigate()
  const [savedEdge, setSavedEdge] = useState<EdgeTypeDefinition | null>(null)
  const [testResults, setTestResults] = useState<string[]>([])

  const handleSave = (edge: EdgeTypeDefinition) => {
    console.log('Edge saved:', edge)
    setSavedEdge(edge)
    
    // Run validation tests
    const results: string[] = []
    
    // Test 1: Edge has required properties
    if (edge.name && edge.ontologyId) {
      results.push('✓ Edge has required properties (name, ontologyId)')
    } else {
      results.push('✗ Missing required edge properties')
    }
    
    // Test 2: Mappings are defined
    if (edge.mappings && edge.mappings.length > 0) {
      results.push(`✓ Edge has ${edge.mappings.length} mapping(s) defined`)
      edge.mappings.forEach((mapping, idx) => {
        if (mapping.sourceEntity && mapping.targetEntity) {
          results.push(`  ✓ Mapping ${idx + 1}: ${mapping.sourceEntity} → ${mapping.targetEntity} (${mapping.cardinality})`)
        }
      })
    } else {
      results.push('✗ No mappings defined')
    }
    
    // Test 3: Attributes are defined
    if (edge.attributes && edge.attributes.length > 0) {
      results.push(`✓ Edge has ${edge.attributes.length} attribute(s) defined`)
    } else {
      results.push('ℹ No attributes defined (optional)')
    }
    
    // Test 4: Directionality is set
    if (edge.metadata) {
      results.push(`✓ Edge is ${edge.metadata.isDirectional ? 'directional' : 'bidirectional'}`)
      if (edge.metadata.category) {
        results.push(`✓ Category: ${edge.metadata.category}`)
      }
    }
    
    // Test 5: Validation status
    if (edge.validation) {
      results.push(`✓ Validation status: ${edge.validation.isValid ? 'Valid' : 'Invalid'}`)
      if (edge.validation.errors.length > 0) {
        edge.validation.errors.forEach(error => {
          results.push(`  ✗ ${error.field}: ${error.message}`)
        })
      }
    }
    
    setTestResults(results)
  }

  const handleCancel = () => {
    console.log('Edit cancelled')
    navigate('/ontologies')
  }

  // Available entity types for testing
  const entityTypes = [
    'Patient',
    'Doctor',
    'Appointment',
    'Diagnosis',
    'Medication',
    'Prescription',
    'MedicalRecord',
    'Insurance',
    'Hospital',
    'Department'
  ]

  // Sample edge for testing
  const sampleEdge: EdgeTypeDefinition = {
    id: 'test-edge-1',
    ontologyId: 'test-ontology-1',
    name: 'TREATS',
    description: 'Represents a doctor treating a patient',
    attributes: [
      {
        name: 'treatment_date',
        type: 'datetime',
        description: 'Date when treatment started',
        required: true
      },
      {
        name: 'treatment_type',
        type: 'string',
        description: 'Type of treatment provided',
        required: true
      },
      {
        name: 'notes',
        type: 'text',
        description: 'Additional treatment notes',
        required: false
      }
    ],
    mappings: [
      {
        sourceEntity: 'Doctor',
        targetEntity: 'Patient',
        cardinality: 'one-to-many'
      },
      {
        sourceEntity: 'Patient',
        targetEntity: 'Diagnosis',
        cardinality: 'one-to-many'
      }
    ],
    metadata: {
      isDirectional: true,
      category: 'Medical'
    },
    validation: {
      isValid: true,
      errors: []
    }
  }

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="container max-w-7xl mx-auto px-6 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/ontologies')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Ontologies
        </Button>
        
        <h1 className="text-3xl font-bold">Story 3.3: Edge Type Definition Builder Test</h1>
        <p className="text-muted-foreground mt-2">
          Testing the Edge Type Definition Builder with sample medical entities and relationships
        </p>
      </div>

      {/* Test Results Panel */}
      {testResults.length > 0 && (
        <Card className="mb-6 p-4 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Test Results:</h3>
          <ul className="space-y-1">
            {testResults.map((result, idx) => (
              <li key={idx} className="text-sm text-blue-700">
                {result}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {savedEdge && (
        <Card className="mb-6 p-4 bg-green-50 border-green-200">
          <h3 className="font-semibold text-green-800">Edge Saved Successfully!</h3>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-green-700">View saved edge JSON</summary>
            <pre className="mt-2 text-xs text-green-700 overflow-auto">
              {JSON.stringify(savedEdge, null, 2)}
            </pre>
          </details>
        </Card>
      )}

      <Card className="mb-6 p-4">
        <h3 className="font-semibold mb-2">Test Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>Switch between Form, Attributes, Mappings, Templates, and Preview tabs</li>
          <li>Fill in edge name and description in the Form tab</li>
          <li>Add attributes (edge properties) in the Attributes tab</li>
          <li>Define entity mappings in the Mappings tab (source, target, cardinality)</li>
          <li>Browse and apply templates from the Templates tab</li>
          <li>Toggle directional/bidirectional in the metadata</li>
          <li>View generated code in the Preview tab</li>
          <li>Click "Save Edge Type" to test validation and save functionality</li>
        </ol>
      </Card>

      <Card className="mb-6 p-4 bg-yellow-50 border-yellow-200">
        <h3 className="font-semibold text-yellow-800 mb-2">Available Test Entity Types:</h3>
        <div className="grid grid-cols-2 gap-2 text-sm text-yellow-700 mt-2">
          {entityTypes.map(entity => (
            <div key={entity}>• {entity}</div>
          ))}
        </div>
      </Card>

      <EdgeTypeEditor
        existingEdge={sampleEdge}
        ontologyId="test-ontology-1"
        entityTypes={entityTypes}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}