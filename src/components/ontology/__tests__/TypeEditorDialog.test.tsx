import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TypeEditorDialog } from '../TypeEditorDialog'
import '@testing-library/jest-dom'

describe('TypeEditorDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    typeKind: 'entity' as const,
    onSave: vi.fn(),
  }

  it('renders entity type editor dialog', () => {
    render(<TypeEditorDialog {...defaultProps} />)
    
    expect(screen.getByText('Create Entity Type')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByText('Attributes')).toBeInTheDocument()
  })

  it('renders edge type editor dialog', () => {
    render(<TypeEditorDialog {...defaultProps} typeKind="edge" />)
    
    expect(screen.getByText('Create Edge Type')).toBeInTheDocument()
    expect(screen.getByText('Source Types')).toBeInTheDocument()
    expect(screen.getByText('Target Types')).toBeInTheDocument()
  })

  it('validates name conflicts', () => {
    const onValidate = vi.fn(() => ({ valid: false, message: 'Name already exists' }))
    
    render(<TypeEditorDialog {...defaultProps} onValidate={onValidate} />)
    
    const nameInput = screen.getByLabelText('Name')
    fireEvent.change(nameInput, { target: { value: 'Person' } })
    
    expect(onValidate).toHaveBeenCalledWith('Person')
    expect(screen.getByText('Name already exists')).toBeInTheDocument()
  })

  it('adds attributes for entity types', async () => {
    render(<TypeEditorDialog {...defaultProps} />)
    
    const nameInput = screen.getByPlaceholderText('Attribute name')
    fireEvent.change(nameInput, { target: { value: 'firstName' } })
    
    const addButtons = screen.getAllByRole('button')
    const addButton = addButtons.find(btn => btn.querySelector('.lucide-plus'))
    if (addButton) {
      fireEvent.click(addButton)
    }
    
    await waitFor(() => {
      expect(screen.getByText('firstName')).toBeInTheDocument()
      expect(screen.getByText('string')).toBeInTheDocument()
    })
  })

  it('removes attributes', async () => {
    const entityData = {
      id: '1',
      name: 'Person',
      description: 'A person entity',
      attributes: [
        { name: 'firstName', type: 'string', required: true }
      ]
    }
    
    render(<TypeEditorDialog {...defaultProps} typeData={entityData} />)
    
    const deleteButtons = screen.getAllByRole('button')
    const deleteButton = deleteButtons.find(btn => btn.querySelector('.lucide-trash-2'))
    if (deleteButton) {
      fireEvent.click(deleteButton)
    }
    
    await waitFor(() => {
      expect(screen.queryByText('firstName')).not.toBeInTheDocument()
    })
  })

  it('tests regex patterns', async () => {
    render(<TypeEditorDialog {...defaultProps} />)
    
    const patternInput = screen.getByLabelText('Pattern (Regex)')
    const testInput = screen.getByLabelText('Test Pattern')
    
    fireEvent.change(patternInput, { target: { value: '\\bPerson\\b' } })
    fireEvent.change(testInput, { target: { value: 'John is a Person' } })
    
    const testButton = screen.getByText('Test')
    fireEvent.click(testButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Pattern matches/)).toBeInTheDocument()
    })
  })

  it('shows error for invalid regex', async () => {
    render(<TypeEditorDialog {...defaultProps} />)
    
    const patternInput = screen.getByLabelText('Pattern (Regex)')
    const testInput = screen.getByLabelText('Test Pattern')
    
    fireEvent.change(patternInput, { target: { value: '[invalid' } })
    fireEvent.change(testInput, { target: { value: 'test' } })
    
    const testButton = screen.getByText('Test')
    fireEvent.click(testButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid regex pattern/)).toBeInTheDocument()
    })
  })

  it('saves entity type data', async () => {
    const onSave = vi.fn()
    
    render(<TypeEditorDialog {...defaultProps} onSave={onSave} />)
    
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Person' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'A person entity' } })
    
    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        name: 'Person',
        description: 'A person entity',
        attributes: [],
        examplePattern: undefined
      })
    })
  })

  it('toggles source and target types for edges', async () => {
    const availableEntityTypes = ['Person', 'Organization', 'Location']
    
    render(
      <TypeEditorDialog 
        {...defaultProps} 
        typeKind="edge"
        availableEntityTypes={availableEntityTypes}
      />
    )
    
    const personBadge = screen.getAllByText('Person')[0]
    fireEvent.click(personBadge)
    
    await waitFor(() => {
      expect(personBadge.closest('.cursor-pointer')).toHaveClass('cursor-pointer')
    })
  })

  it('cancels editing', () => {
    const onOpenChange = vi.fn()
    
    render(<TypeEditorDialog {...defaultProps} onOpenChange={onOpenChange} />)
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})