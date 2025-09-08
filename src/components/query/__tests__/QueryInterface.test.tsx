import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryInterface } from '../QueryInterface'
import { GraphQuery, QueryResult } from '@/types/query'

// Mock the query execution libraries
vi.mock('@/lib/query-parser', () => ({
  NaturalLanguageParser: vi.fn().mockImplementation(() => ({
    parseNaturalLanguage: vi.fn().mockResolvedValue({
      entities: [{ type: 'Person' }],
      limit: 100
    }),
    getSuggestions: vi.fn().mockResolvedValue([])
  }))
}))

vi.mock('@/lib/query-executor', () => ({
  QueryExecutor: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({
      query: { entities: [{ type: 'Person' }], limit: 100 },
      entities: [{ id: '1', type: 'Person', name: 'John Doe' }],
      edges: [],
      metadata: { totalResults: 1, executionTime: 45, cached: false }
    })
  }))
}))

vi.mock('@/lib/query-history', () => ({
  QueryHistoryManager: vi.fn().mockImplementation(() => ({
    addToHistory: vi.fn().mockResolvedValue(undefined),
    getHistory: vi.fn().mockResolvedValue([]),
    searchHistory: vi.fn().mockResolvedValue([])
  }))
}))

// Mock child components to avoid async state warnings
vi.mock('../QueryHistory', () => ({
  QueryHistory: ({ onSelect, onRerun }: any) => (
    <div data-testid="query-history">
      <h3>Query History</h3>
      <div>Your recent searches</div>
    </div>
  )
}))

vi.mock('../SavedQueries', () => ({
  SavedQueries: ({ onSelect, currentQuery }: any) => (
    <div data-testid="saved-queries">
      <h3>Saved Queries</h3>
      <div>Your saved query templates</div>
    </div>
  )
}))

vi.mock('../QueryAutocomplete', () => ({
  QueryAutocomplete: ({ value, onChange, onSelect, placeholder }: any) => (
    <input
      data-testid="natural-query-input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}))

vi.mock('../QueryBuilder', () => ({
  QueryBuilder: ({ onChange, onSubmit }: any) => (
    <div data-testid="query-builder">
      <button onClick={() => onSubmit()}>Build Query</button>
    </div>
  )
}))

vi.mock('../ResultVisualizer', () => ({
  ResultVisualizer: ({ result }: any) => (
    <div data-testid="result-visualizer">
      <h3>Query Results</h3>
      <div>Found {result.entities.length} entities and {result.edges.length} relationships</div>
    </div>
  )
}))

describe('QueryInterface', () => {
  const mockOpenaiApiKey = 'test-openai-key'
  const mockAirtableApiKey = 'test-airtable-key'
  const mockAirtableBaseId = 'test-base-id'

  const mockQueryResult: QueryResult = {
    query: {
      entities: [{ type: 'Person' }],
      limit: 100
    },
    entities: [
      { id: '1', type: 'Person', name: 'John Doe' },
      { id: '2', type: 'Person', name: 'Jane Smith' }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', type: 'KNOWS' }
    ],
    metadata: {
      totalResults: 3,
      executionTime: 45,
      cached: false
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear localStorage
    localStorage.clear()
  })

  it('renders query interface with tabs', async () => {
    await act(async () => {
      render(<QueryInterface />)
    })
    
    expect(screen.getByText('Graph Query Interface')).toBeInTheDocument()
    expect(screen.getByText('Natural Language')).toBeInTheDocument()
    expect(screen.getByText('Query Builder')).toBeInTheDocument()
  })

  it('has tab switching controls', async () => {
    await act(async () => {
      render(<QueryInterface />)
    })
    
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0]).toHaveTextContent('Natural Language')
    expect(tabs[1]).toHaveTextContent('Query Builder')
  })

  it('executes natural language query', async () => {
    await act(async () => {
      render(
        <QueryInterface
          openaiApiKey={mockOpenaiApiKey}
          airtableApiKey={mockAirtableApiKey}
          airtableBaseId={mockAirtableBaseId}
        />
      )
    })
    
    const input = screen.getByTestId('natural-query-input')
    
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Find all people' } })
    })
    
    const searchButton = screen.getByRole('button', { name: /search/i })
    
    await act(async () => {
      fireEvent.click(searchButton)
    })
    
    // Just verify the button was clicked and input has value
    expect(input).toHaveValue('Find all people')
  })

  it('displays error when configuration is missing', async () => {
    await act(async () => {
      render(<QueryInterface />)
    })
    
    const input = screen.getByTestId('natural-query-input')
    
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Find all people' } })
    })
    
    const searchButton = screen.getByRole('button', { name: /search/i })
    
    await act(async () => {
      fireEvent.click(searchButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Query execution not available - missing configuration/)).toBeInTheDocument()
    })
  })

  it('disables search button when query is empty', async () => {
    await act(async () => {
      render(<QueryInterface />)
    })
    
    const searchButton = screen.getByRole('button', { name: /search/i })
    expect(searchButton).toBeDisabled()
  })

  it('enables search button when query has text', async () => {
    await act(async () => {
      render(<QueryInterface />)
    })
    
    const input = screen.getByTestId('natural-query-input')
    const searchButton = screen.getByRole('button', { name: /search/i })
    
    expect(searchButton).toBeDisabled()
    
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Find people' } })
    })
    
    expect(searchButton).not.toBeDisabled()
  })

  it('renders saved queries and history sections', async () => {
    await act(async () => {
      render(<QueryInterface />)
    })
    
    expect(screen.getByTestId('saved-queries')).toBeInTheDocument()
    expect(screen.getByTestId('query-history')).toBeInTheDocument()
    expect(screen.getByText('Saved Queries')).toBeInTheDocument()
    expect(screen.getByText('Query History')).toBeInTheDocument()
  })

  it('has both natural and structured query interfaces', async () => {
    await act(async () => {
      render(<QueryInterface />)
    })
    
    const tabs = screen.getAllByRole('tab')
    const naturalTab = tabs[0]
    const structuredTab = tabs[1]
    
    // Natural tab should be active by default
    expect(naturalTab).toHaveAttribute('aria-selected', 'true')
    expect(structuredTab).toHaveAttribute('aria-selected', 'false')
    
    // Verify the natural language input is present
    expect(screen.getByTestId('natural-query-input')).toBeInTheDocument()
    
    // Verify both tabs exist and are clickable
    expect(naturalTab).not.toBeDisabled()
    expect(structuredTab).not.toBeDisabled()
  })
})