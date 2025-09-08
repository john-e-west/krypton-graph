import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EntityTypeEditor from '../EntityTypeEditor'
import type { EntityTypeDefinition } from '@/types/ontology'

describe('EntityTypeEditor', () => {
  const mockOnSave = vi.fn()
  const mockOnCancel = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it('renders with initial empty state', () => {
    render(
      <EntityTypeEditor
        ontologyId="test-ontology"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    expect(screen.getByText('Entity Type Editor')).toBeInTheDocument()
    expect(screen.getByText('Definition')).toBeInTheDocument()
    expect(screen.getByText('Fields')).toBeInTheDocument()
    expect(screen.getByText('Code Preview')).toBeInTheDocument()
  })
  
  it('loads initial entity data', () => {
    const initialEntity: EntityTypeDefinition = {
      id: 'test-entity',
      ontologyId: 'test-ontology',
      name: 'TestEntity',
      description: 'Test description',
      baseClass: 'BaseModel',
      fields: [{
        name: 'test_field',
        type: 'str',
        isOptional: false
      }],
      metadata: {},
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      }
    }
    
    render(
      <EntityTypeEditor
        initialEntity={initialEntity}
        ontologyId="test-ontology"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    expect(screen.getByDisplayValue('TestEntity')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()
  })
  
  it('validates entity name format', async () => {
    render(
      <EntityTypeEditor
        ontologyId="test-ontology"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    const nameInput = screen.getByPlaceholderText('PersonEntity')
    fireEvent.change(nameInput, { target: { value: 'invalid_name' } })
    
    await waitFor(() => {
      expect(screen.getByText(/Entity name must be PascalCase/)).toBeInTheDocument()
    })
  })
  
  it('generates code preview for valid entity', async () => {
    render(
      <EntityTypeEditor
        ontologyId="test-ontology"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    const nameInput = screen.getByPlaceholderText('PersonEntity')
    fireEvent.change(nameInput, { target: { value: 'PersonEntity' } })
    
    const fieldsTab = screen.getByText('Fields')
    fireEvent.click(fieldsTab)
    
    const addFieldButton = screen.getByText('Add Field')
    fireEvent.click(addFieldButton)
    
    const previewTab = screen.getByText('Code Preview')
    fireEvent.click(previewTab)
    
    await waitFor(() => {
      expect(screen.getByText('Generated Pydantic Model')).toBeInTheDocument()
      expect(screen.getByText(/class PersonEntity/)).toBeInTheDocument()
    })
  })
  
  it('prevents saving with validation errors', () => {
    render(
      <EntityTypeEditor
        ontologyId="test-ontology"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    const nameInput = screen.getByPlaceholderText('PersonEntity')
    fireEvent.change(nameInput, { target: { value: 'invalid name' } })
    
    const saveButton = screen.getByText('Save Entity Type')
    expect(saveButton).toBeDisabled()
  })
  
  it('calls onSave with valid entity data', async () => {
    render(
      <EntityTypeEditor
        ontologyId="test-ontology"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    const nameInput = screen.getByPlaceholderText('PersonEntity')
    fireEvent.change(nameInput, { target: { value: 'PersonEntity' } })
    
    const saveButton = screen.getByText('Save Entity Type')
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PersonEntity',
          ontologyId: 'test-ontology'
        })
      )
    })
  })
  
  it('calls onCancel when cancel button clicked', () => {
    render(
      <EntityTypeEditor
        ontologyId="test-ontology"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  describe('Constraint Validation Edge Cases', () => {
    it('validates regex patterns with special characters', async () => {
      const entity: EntityTypeDefinition = {
        id: 'test',
        ontologyId: 'test-ontology',
        name: 'TestEntity',
        description: 'Test',
        baseClass: 'BaseModel',
        fields: [{
          name: 'email_field',
          type: 'str',
          isOptional: false,
          constraints: {
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
          }
        }],
        metadata: {},
        validation: { isValid: true, errors: [], warnings: [] }
      }
      
      render(
        <EntityTypeEditor
          initialEntity={entity}
          ontologyId="test-ontology"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )
      
      await waitFor(() => {
        expect(screen.queryByText(/Invalid regex pattern/)).not.toBeInTheDocument()
      })
    })

    it('validates enum constraints with empty values', async () => {
      const entity: EntityTypeDefinition = {
        id: 'test',
        ontologyId: 'test-ontology',
        name: 'TestEntity',
        description: 'Test',
        baseClass: 'BaseModel',
        fields: [{
          name: 'status_field',
          type: 'str',
          isOptional: false,
          constraints: {
            enum: ['', 'active', 'inactive']
          }
        }],
        metadata: {},
        validation: { isValid: true, errors: [], warnings: [] }
      }
      
      render(
        <EntityTypeEditor
          initialEntity={entity}
          ontologyId="test-ontology"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )
      
      const previewTab = screen.getByText('Code Preview')
      fireEvent.click(previewTab)
      
      await waitFor(() => {
        expect(screen.getByText(/Literal\['', 'active', 'inactive'\]/)).toBeInTheDocument()
      })
    })

    it('validates numeric constraints with boundary values', async () => {
      const entity: EntityTypeDefinition = {
        id: 'test',
        ontologyId: 'test-ontology',
        name: 'TestEntity',
        description: 'Test',
        baseClass: 'BaseModel',
        fields: [{
          name: 'age_field',
          type: 'int',
          isOptional: false,
          constraints: {
            ge: 0,
            le: 150
          }
        }],
        metadata: {},
        validation: { isValid: true, errors: [], warnings: [] }
      }
      
      render(
        <EntityTypeEditor
          initialEntity={entity}
          ontologyId="test-ontology"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )
      
      const previewTab = screen.getByText('Code Preview')
      fireEvent.click(previewTab)
      
      await waitFor(() => {
        expect(screen.getByText(/ge=0/)).toBeInTheDocument()
        expect(screen.getByText(/le=150/)).toBeInTheDocument()
      })
    })

    it('handles invalid regex patterns gracefully', async () => {
      const entity: EntityTypeDefinition = {
        id: 'test',
        ontologyId: 'test-ontology',
        name: 'TestEntity',
        description: 'Test',
        baseClass: 'BaseModel',
        fields: [{
          name: 'pattern_field',
          type: 'str',
          isOptional: false,
          constraints: {
            pattern: '[invalid(regex'
          }
        }],
        metadata: {},
        validation: { isValid: false, errors: [{ field: 'pattern_field', message: 'Invalid regex pattern' }], warnings: [] }
      }
      
      render(
        <EntityTypeEditor
          initialEntity={entity}
          ontologyId="test-ontology"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid regex pattern/)).toBeInTheDocument()
      })
    })

    it('validates list constraints with min/max length', async () => {
      const entity: EntityTypeDefinition = {
        id: 'test',
        ontologyId: 'test-ontology',
        name: 'TestEntity',
        description: 'Test',
        baseClass: 'BaseModel',
        fields: [{
          name: 'tags_field',
          type: { list: 'str' },
          isOptional: false,
          constraints: {
            minLength: 1,
            maxLength: 10
          }
        }],
        metadata: {},
        validation: { isValid: true, errors: [], warnings: [] }
      }
      
      render(
        <EntityTypeEditor
          initialEntity={entity}
          ontologyId="test-ontology"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )
      
      const previewTab = screen.getByText('Code Preview')
      fireEvent.click(previewTab)
      
      await waitFor(() => {
        expect(screen.getByText(/min_length=1/)).toBeInTheDocument()
        expect(screen.getByText(/max_length=10/)).toBeInTheDocument()
      })
    })

    it('validates conflicting constraints', async () => {
      const entity: EntityTypeDefinition = {
        id: 'test',
        ontologyId: 'test-ontology',
        name: 'TestEntity',
        description: 'Test',
        baseClass: 'BaseModel',
        fields: [{
          name: 'value_field',
          type: 'int',
          isOptional: false,
          constraints: {
            gt: 100,
            lt: 50  // Conflicting: gt > lt
          }
        }],
        metadata: {},
        validation: { 
          isValid: false, 
          errors: [{ field: 'value_field', message: 'Conflicting constraints: gt (100) must be less than lt (50)' }], 
          warnings: [] 
        }
      }
      
      render(
        <EntityTypeEditor
          initialEntity={entity}
          ontologyId="test-ontology"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByText(/Conflicting constraints/)).toBeInTheDocument()
      })
      
      const saveButton = screen.getByText('Save Entity Type')
      expect(saveButton).toBeDisabled()
    })
  })
})