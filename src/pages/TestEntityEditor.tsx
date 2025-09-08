import { useState } from 'react'
import EntityTypeEditor from '../components/ontology/entity/EntityTypeEditor'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { EntityTypeDefinition } from '@/types/ontology'

export default function TestEntityEditor() {
  const navigate = useNavigate()
  const [savedEntity, setSavedEntity] = useState<EntityTypeDefinition | null>(null)
  const [testResults, setTestResults] = useState<string[]>([])

  const handleSave = (entity: EntityTypeDefinition) => {
    console.log('Entity saved:', entity)
    setSavedEntity(entity)
    
    // Run validation tests
    const results: string[] = []
    
    // Test 1: Entity has required properties
    if (entity.name && entity.id && entity.ontologyId) {
      results.push('✓ Entity has required properties (name, id, ontologyId)')
    } else {
      results.push('✗ Missing required entity properties')
    }
    
    // Test 2: Fields are properly defined
    if (entity.fields && entity.fields.length > 0) {
      results.push(`✓ Entity has ${entity.fields.length} field(s) defined`)
    } else {
      results.push('✗ No fields defined')
    }
    
    // Test 3: Validation is working
    if (entity.validation) {
      results.push(`✓ Validation status: ${entity.validation.isValid ? 'Valid' : 'Invalid'}`)
      if (entity.validation.errors.length > 0) {
        results.push(`  - ${entity.validation.errors.length} error(s) found`)
      }
      if (entity.validation.warnings.length > 0) {
        results.push(`  - ${entity.validation.warnings.length} warning(s) found`)
      }
    }
    
    // Test 4: Metadata is present
    if (entity.metadata && entity.metadata.version) {
      results.push(`✓ Metadata present (version: ${entity.metadata.version})`)
    }
    
    setTestResults(results)
  }

  const handleCancel = () => {
    console.log('Edit cancelled')
    navigate('/ontologies')
  }

  // Sample entity for testing
  const sampleEntity: EntityTypeDefinition = {
    id: 'test-entity-1',
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
        constraints: {
          minLength: 1,
          maxLength: 100
        }
      },
      {
        name: 'last_name',
        type: 'string',
        required: true,
        description: 'Patient last name',
        constraints: {
          minLength: 1,
          maxLength: 100
        }
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
        constraints: {
          pattern: '^MRN-[0-9]{6}$'
        }
      }
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0'
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: []
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/ontologies')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Ontologies
        </Button>
        
        <h1 className="text-3xl font-bold">Story 3.2: Entity Type Definition Builder Test</h1>
        <p className="text-muted-foreground mt-2">
          Testing the Entity Type Definition Builder with a sample Patient entity
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

      {savedEntity && (
        <Card className="mb-6 p-4 bg-green-50 border-green-200">
          <h3 className="font-semibold text-green-800">Entity Saved Successfully!</h3>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-green-700">View saved entity JSON</summary>
            <pre className="mt-2 text-xs text-green-700 overflow-auto">
              {JSON.stringify(savedEntity, null, 2)}
            </pre>
          </details>
        </Card>
      )}

      <Card className="mb-6 p-4">
        <h3 className="font-semibold mb-2">Test Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>Switch between Definition, Fields, and Code Preview tabs</li>
          <li>Try adding new fields using the "Add Field" button</li>
          <li>Edit field properties (name, type, required, constraints)</li>
          <li>Reorder fields using drag-and-drop handles</li>
          <li>Remove fields using the delete button</li>
          <li>View generated Pydantic code in the Code Preview tab</li>
          <li>Click "Save Entity Type" to test validation and save functionality</li>
        </ol>
      </Card>

      <EntityTypeEditor
        initialEntity={sampleEntity}
        ontologyId="test-ontology-1"
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}