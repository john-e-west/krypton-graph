import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { UnclassifiedItemsPanel } from '../UnclassifiedItemsPanel'
import '@testing-library/jest-dom'

const mockItems = [
  {
    id: '1',
    text: 'John Smith is a software engineer',
    context: 'Found in employee directory',
    suggestedTypes: [
      { typeName: 'Person', confidence: 0.85 },
      { typeName: 'Employee', confidence: 0.72 }
    ]
  },
  {
    id: '2',
    text: 'Apple Inc. headquarters',
    context: 'Company information section',
    suggestedTypes: [
      { typeName: 'Organization', confidence: 0.9 }
    ]
  },
  {
    id: '3',
    text: 'Meeting scheduled for tomorrow',
    context: 'Calendar event',
    suggestedTypes: []
  }
]

const mockPatterns = [
  {
    pattern: 'Person names pattern',
    regex: '\\b[A-Z][a-z]+ [A-Z][a-z]+\\b',
    count: 5,
    examples: ['John Smith', 'Jane Doe'],
    suggestedTypeName: 'Person'
  },
  {
    pattern: 'Company pattern',
    regex: '\\b[A-Z][a-z]+ (Inc|Corp|Ltd)\\b',
    count: 3,
    examples: ['Apple Inc.', 'Google Inc.'],
    suggestedTypeName: 'Organization'
  }
]

describe('UnclassifiedItemsPanel', () => {
  const defaultProps = {
    items: mockItems,
    patterns: mockPatterns,
    availableTypes: ['Person', 'Organization', 'Location'],
    onCreateType: vi.fn(),
    onAssignToType: vi.fn(),
    onMarkAsIgnored: vi.fn(),
    onSelectionChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders unclassified items', () => {
    render(<UnclassifiedItemsPanel {...defaultProps} />)
    
    expect(screen.getByText('Unclassified Items (3)')).toBeInTheDocument()
    expect(screen.getByText('John Smith is a software engineer')).toBeInTheDocument()
    expect(screen.getByText('Apple Inc. headquarters')).toBeInTheDocument()
    expect(screen.getByText('Meeting scheduled for tomorrow')).toBeInTheDocument()
  })

  it('shows suggested types for items', () => {
    render(<UnclassifiedItemsPanel {...defaultProps} />)
    
    expect(screen.getByText('Person (85%)')).toBeInTheDocument()
    expect(screen.getByText('Employee (72%)')).toBeInTheDocument()
    expect(screen.getByText('Organization (90%)')).toBeInTheDocument()
  })

  it('filters items by search term', async () => {
    render(<UnclassifiedItemsPanel {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search items...')
    fireEvent.change(searchInput, { target: { value: 'Apple' } })
    
    await waitFor(() => {
      expect(screen.getByText('Apple Inc. headquarters')).toBeInTheDocument()
      expect(screen.queryByText('John Smith is a software engineer')).not.toBeInTheDocument()
    })
  })

  it('filters items by suggestion status', async () => {
    render(<UnclassifiedItemsPanel {...defaultProps} />)
    
    // Find and click the filter dropdown
    const filterDropdown = screen.getByRole('combobox')
    fireEvent.click(filterDropdown)
    
    // Wait for dropdown options to appear
    await waitFor(() => {
      const noSuggestionsOption = screen.getByText('No suggestions')
      fireEvent.click(noSuggestionsOption)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Meeting scheduled for tomorrow')).toBeInTheDocument()
      expect(screen.queryByText('John Smith is a software engineer')).not.toBeInTheDocument()
    })
  })

  it('selects and deselects items', async () => {
    render(<UnclassifiedItemsPanel {...defaultProps} />)
    
    const checkboxes = screen.getAllByRole('checkbox')
    const firstItemCheckbox = checkboxes[1] // First checkbox is "select all"
    
    fireEvent.click(firstItemCheckbox)
    
    await waitFor(() => {
      expect(screen.getByText('1 of 3 selected')).toBeInTheDocument()
    })
    
    fireEvent.click(firstItemCheckbox)
    
    await waitFor(() => {
      expect(screen.getByText('0 of 3 selected')).toBeInTheDocument()
    })
  })

  it('selects all items', async () => {
    render(<UnclassifiedItemsPanel {...defaultProps} />)
    
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(selectAllCheckbox)
    
    await waitFor(() => {
      expect(screen.getByText('3 of 3 selected')).toBeInTheDocument()
    })
  })

  it('shows and hides patterns', async () => {
    render(<UnclassifiedItemsPanel {...defaultProps} />)
    
    // Initially patterns should be hidden
    expect(screen.queryByText('Detected Patterns')).not.toBeInTheDocument()
    
    // Show patterns
    const showPatternsButton = screen.getByText('Show Patterns')
    fireEvent.click(showPatternsButton)
    
    await waitFor(() => {
      expect(screen.getByText('Detected Patterns')).toBeInTheDocument()
      expect(screen.getByText('Person names pattern')).toBeInTheDocument()
      expect(screen.getByText('5 items match this pattern')).toBeInTheDocument()
    })
    
    // Hide patterns
    const hidePatternsButton = screen.getByText('Hide Patterns')
    fireEvent.click(hidePatternsButton)
    
    await waitFor(() => {
      expect(screen.queryByText('Detected Patterns')).not.toBeInTheDocument()
    })
  })

  it('calls onCreateType when creating new type', async () => {
    render(<UnclassifiedItemsPanel {...defaultProps} />)
    
    // Select an item
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])
    
    await waitFor(() => {
      const newTypeButton = screen.getByText('New Type')
      fireEvent.click(newTypeButton)
    })
    
    expect(defaultProps.onCreateType).toHaveBeenCalledWith([mockItems[0]], undefined)
  })

  it('calls onAssignToType when assigning to existing type', async () => {
    render(<UnclassifiedItemsPanel {...defaultProps} />)
    
    // Select an item
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])
    
    await waitFor(() => {
      // Open assign dropdown
      const assignDropdown = screen.getByText('Assign to type')
      fireEvent.click(assignDropdown)
    })
    
    await waitFor(() => {
      const personOption = screen.getByText('Person')
      fireEvent.click(personOption)
    })
    
    expect(defaultProps.onAssignToType).toHaveBeenCalledWith([mockItems[0]], 'Person')
  })

  it('calls onMarkAsIgnored when marking items as ignored', async () => {
    render(<UnclassifiedItemsPanel {...defaultProps} />)
    
    // Select an item
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])
    
    await waitFor(() => {
      const ignoreButton = screen.getByText('Ignore')
      fireEvent.click(ignoreButton)
    })
    
    expect(defaultProps.onMarkAsIgnored).toHaveBeenCalledWith([mockItems[0]])
  })

  it('highlights search terms in item text', async () => {
    render(<UnclassifiedItemsPanel {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search items...')
    fireEvent.change(searchInput, { target: { value: 'Apple' } })
    
    await waitFor(() => {
      const highlightedText = document.querySelector('mark')
      expect(highlightedText).toBeInTheDocument()
      expect(highlightedText?.textContent).toBe('Apple')
    })
  })

  it('selects items by pattern', async () => {
    render(<UnclassifiedItemsPanel {...defaultProps} />)
    
    // Show patterns
    const showPatternsButton = screen.getByText('Show Patterns')
    fireEvent.click(showPatternsButton)
    
    await waitFor(() => {
      const selectButtons = screen.getAllByText('Select')
      fireEvent.click(selectButtons[0])
    })
    
    // Should select items matching the pattern
    expect(defaultProps.onSelectionChange).toHaveBeenCalled()
  })

  it('shows empty state when no items match filters', async () => {
    render(<UnclassifiedItemsPanel {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search items...')
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
    
    await waitFor(() => {
      expect(screen.getByText('No items match current filters')).toBeInTheDocument()
    })
  })

  it('shows empty state when no items provided', () => {
    render(<UnclassifiedItemsPanel {...defaultProps} items={[]} />)
    
    expect(screen.getByText('No unclassified items found')).toBeInTheDocument()
  })
})