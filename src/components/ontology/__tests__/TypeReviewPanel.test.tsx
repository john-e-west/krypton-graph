import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TypeReviewPanel } from '../TypeReviewPanel'
import '@testing-library/jest-dom'

const mockEntityTypes = [
  {
    id: '1',
    name: 'Person',
    description: 'Individual person entity',
    expectedCount: 150,
    confidence: 0.85,
    examples: ['John Doe', 'Jane Smith', 'Robert Johnson'],
    attributes: [
      { name: 'name', type: 'string', required: true },
      { name: 'age', type: 'number', required: false }
    ]
  },
  {
    id: '2',
    name: 'Organization',
    description: 'Company or organization entity',
    expectedCount: 50,
    confidence: 0.72,
    examples: ['Acme Corp', 'Global Tech Inc'],
    attributes: [
      { name: 'name', type: 'string', required: true },
      { name: 'industry', type: 'string', required: false }
    ]
  }
]

const mockEdgeTypes = [
  {
    id: 'e1',
    name: 'WORKS_FOR',
    description: 'Employment relationship',
    sourceTypes: ['Person'],
    targetTypes: ['Organization'],
    confidence: 0.9,
    examples: ['John works for Acme', 'Jane employed by Global Tech']
  },
  {
    id: 'e2',
    name: 'MANAGES',
    description: 'Management relationship',
    sourceTypes: ['Person'],
    targetTypes: ['Person'],
    confidence: 0.65,
    examples: ['Alice manages Bob', 'Charlie supervises David']
  }
]

describe('TypeReviewPanel', () => {
  it('renders entity and edge types', () => {
    render(
      <TypeReviewPanel
        entityTypes={mockEntityTypes}
        edgeTypes={mockEdgeTypes}
      />
    )
    
    expect(screen.getByText('Entity Types')).toBeInTheDocument()
    expect(screen.getByText('Edge Types')).toBeInTheDocument()
    expect(screen.getByText('Person')).toBeInTheDocument()
    expect(screen.getByText('Organization')).toBeInTheDocument()
    expect(screen.getByText('WORKS_FOR')).toBeInTheDocument()
    expect(screen.getByText('MANAGES')).toBeInTheDocument()
  })

  it('displays confidence badges with correct styling', () => {
    render(
      <TypeReviewPanel
        entityTypes={mockEntityTypes}
        edgeTypes={mockEdgeTypes}
      />
    )
    
    expect(screen.getByText('High (85%)')).toBeInTheDocument()
    expect(screen.getByText('Medium (72%)')).toBeInTheDocument()
    expect(screen.getByText('High (90%)')).toBeInTheDocument()
    expect(screen.getByText('Medium (65%)')).toBeInTheDocument()
  })

  it('shows expected count for entity types', () => {
    render(
      <TypeReviewPanel
        entityTypes={mockEntityTypes}
        edgeTypes={mockEdgeTypes}
      />
    )
    
    expect(screen.getByText('~150 items')).toBeInTheDocument()
    expect(screen.getByText('~50 items')).toBeInTheDocument()
  })

  it('expands and collapses type details', async () => {
    render(
      <TypeReviewPanel
        entityTypes={mockEntityTypes}
        edgeTypes={mockEdgeTypes}
      />
    )
    
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    
    const expandButtons = screen.getAllByRole('button')
    const personExpandButton = expandButtons[0]
    fireEvent.click(personExpandButton)
    
    await waitFor(() => {
      expect(screen.getByText('"John Doe"')).toBeInTheDocument()
    })
    
    fireEvent.click(personExpandButton)
    
    await waitFor(() => {
      expect(screen.queryByText('"John Doe"')).not.toBeInTheDocument()
    })
  })

  it('shows attributes when entity is expanded', async () => {
    render(
      <TypeReviewPanel
        entityTypes={mockEntityTypes}
        edgeTypes={mockEdgeTypes}
      />
    )
    
    const expandButtons = screen.getAllByRole('button')
    fireEvent.click(expandButtons[0])
    
    await waitFor(() => {
      expect(screen.getByText('Attributes')).toBeInTheDocument()
      expect(screen.getByText('name')).toBeInTheDocument()
      expect(screen.getByText('string')).toBeInTheDocument()
      expect(screen.getByText('Required')).toBeInTheDocument()
    })
  })

  it('shows relationships for edge types when expanded', async () => {
    render(
      <TypeReviewPanel
        entityTypes={mockEntityTypes}
        edgeTypes={mockEdgeTypes}
      />
    )
    
    const expandButtons = screen.getAllByRole('button')
    const worksForButton = expandButtons.find(btn => 
      btn.closest('.rounded-lg')?.textContent?.includes('WORKS_FOR')
    )
    
    if (worksForButton) {
      fireEvent.click(worksForButton)
      
      await waitFor(() => {
        expect(screen.getByText('Relationships')).toBeInTheDocument()
        expect(screen.getByText('From: Person')).toBeInTheDocument()
        expect(screen.getByText('To: Organization')).toBeInTheDocument()
      })
    }
  })

  it('calls onTypeEdit when edit button is clicked', () => {
    const mockOnTypeEdit = vi.fn()
    
    render(
      <TypeReviewPanel
        entityTypes={mockEntityTypes}
        edgeTypes={mockEdgeTypes}
        onTypeEdit={mockOnTypeEdit}
      />
    )
    
    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])
    
    expect(mockOnTypeEdit).toHaveBeenCalledWith('1', 'entity')
  })

  it('supports drag and drop reordering', async () => {
    const mockOnTypeReorder = vi.fn()
    
    render(
      <TypeReviewPanel
        entityTypes={mockEntityTypes}
        edgeTypes={mockEdgeTypes}
        onTypeReorder={mockOnTypeReorder}
      />
    )
    
    const personCard = screen.getByText('Person').closest('div[draggable="true"]')
    const orgCard = screen.getByText('Organization').closest('div[draggable="true"]')
    
    if (personCard && orgCard) {
      const dragStartEvent = new Event('dragstart', { bubbles: true })
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: {
          effectAllowed: '',
          setData: vi.fn(),
          getData: vi.fn(() => '1')
        }
      })
      
      const dropEvent = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: vi.fn(() => '1')
        }
      })
      
      fireEvent(personCard, dragStartEvent)
      fireEvent.dragOver(orgCard)
      fireEvent(orgCard, dropEvent)
      
      await waitFor(() => {
        expect(mockOnTypeReorder).toHaveBeenCalled()
      })
    }
  })
})