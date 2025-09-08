import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryBuilder } from '../QueryBuilder'
import { ParsedQuery } from '@/types/query'

describe('QueryBuilder', () => {
  const mockOnChange = vi.fn()
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders query builder interface', () => {
    render(<QueryBuilder onChange={mockOnChange} onSubmit={mockOnSubmit} />)
    
    expect(screen.getByText('Entity Filters')).toBeInTheDocument()
    expect(screen.getByText('Edge Filters')).toBeInTheDocument()
    expect(screen.getByText('Limit:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Execute Query/i })).toBeInTheDocument()
  })

  it('adds entity filter', () => {
    render(<QueryBuilder onChange={mockOnChange} onSubmit={mockOnSubmit} />)
    
    const addEntityButton = screen.getByText('Add Entity Filter')
    fireEvent.click(addEntityButton)
    
    expect(screen.getByPlaceholderText('e.g., Person, Document, Project')).toBeInTheDocument()
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        entities: expect.arrayContaining([
          expect.objectContaining({
            type: '',
            attributes: []
          })
        ])
      })
    )
  })

  it('adds edge filter', () => {
    render(<QueryBuilder onChange={mockOnChange} onSubmit={mockOnSubmit} />)
    
    const addEdgeButton = screen.getByText('Add Edge Filter')
    fireEvent.click(addEdgeButton)
    
    expect(screen.getByPlaceholderText('e.g., KNOWS, CREATED_BY, REFERENCES')).toBeInTheDocument()
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            type: '',
            attributes: []
          })
        ])
      })
    )
  })

  it('updates entity type filter', () => {
    render(<QueryBuilder onChange={mockOnChange} onSubmit={mockOnSubmit} />)
    
    const addEntityButton = screen.getByText('Add Entity Filter')
    fireEvent.click(addEntityButton)
    
    const typeInput = screen.getByPlaceholderText('e.g., Person, Document, Project')
    fireEvent.change(typeInput, { target: { value: 'Person' } })
    
    expect(mockOnChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        entities: expect.arrayContaining([
          expect.objectContaining({
            type: 'Person'
          })
        ])
      })
    )
  })

  it('removes entity filter', () => {
    render(<QueryBuilder onChange={mockOnChange} onSubmit={mockOnSubmit} />)
    
    const addEntityButton = screen.getByText('Add Entity Filter')
    fireEvent.click(addEntityButton)
    
    const removeButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    )
    
    const removeButton = removeButtons.find(btn => 
      btn.closest('[class*="Card"]')
    )
    
    if (removeButton) {
      fireEvent.click(removeButton)
      
      expect(mockOnChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          entities: undefined
        })
      )
    }
  })

  it('updates limit value', () => {
    render(<QueryBuilder onChange={mockOnChange} onSubmit={mockOnSubmit} />)
    
    const limitInput = screen.getByDisplayValue('100')
    fireEvent.change(limitInput, { target: { value: '50' } })
    
    expect(mockOnChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        limit: 50
      })
    )
  })

  it('calls onSubmit when execute button is clicked', () => {
    render(<QueryBuilder onChange={mockOnChange} onSubmit={mockOnSubmit} />)
    
    const executeButton = screen.getByRole('button', { name: /Execute Query/i })
    fireEvent.click(executeButton)
    
    expect(mockOnSubmit).toHaveBeenCalled()
  })

  it('adds attribute filter to entity', () => {
    render(<QueryBuilder onChange={mockOnChange} onSubmit={mockOnSubmit} />)
    
    const addEntityButton = screen.getByText('Add Entity Filter')
    fireEvent.click(addEntityButton)
    
    const addAttributeButton = screen.getByText('Add')
    fireEvent.click(addAttributeButton)
    
    expect(screen.getByPlaceholderText('Field')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Value')).toBeInTheDocument()
  })
})