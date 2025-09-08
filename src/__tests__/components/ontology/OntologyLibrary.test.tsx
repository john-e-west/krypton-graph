import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OntologyLibrary } from '@/components/ontology/OntologyLibrary'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock data
const mockTemplates = [
  {
    id: 'template1',
    name: 'Medical Ontology',
    description: 'Healthcare domain ontology',
    category: 'healthcare',
    isPublic: true,
    tags: ['medical', 'healthcare'],
    createdBy: 'user1',
    createdAt: '2024-01-01T00:00:00Z',
    lastModified: '2024-01-02T00:00:00Z',
    usageCount: 15,
    rating: 4.5,
    ratingCount: 8,
    ontology: {
      entityTypes: [
        { id: 'Patient', name: 'Patient', description: 'Medical patient' },
        { id: 'Doctor', name: 'Doctor', description: 'Medical doctor' }
      ],
      edgeTypes: [
        { id: 'treats', name: 'treats', description: 'Doctor treats patient', sourceTypes: ['Doctor'], targetTypes: ['Patient'] }
      ]
    }
  },
  {
    id: 'template2',
    name: 'E-commerce Ontology',
    description: 'Online shopping domain',
    category: 'commerce',
    isPublic: false,
    tags: ['ecommerce', 'shopping'],
    createdBy: 'user1',
    createdAt: '2024-01-03T00:00:00Z',
    lastModified: '2024-01-04T00:00:00Z',
    usageCount: 8,
    rating: 4.0,
    ratingCount: 3,
    ontology: {
      entityTypes: [
        { id: 'Product', name: 'Product', description: 'E-commerce product' },
        { id: 'Customer', name: 'Customer', description: 'Online customer' }
      ],
      edgeTypes: [
        { id: 'purchases', name: 'purchases', description: 'Customer purchases product', sourceTypes: ['Customer'], targetTypes: ['Product'] }
      ]
    }
  }
]

describe('OntologyLibrary', () => {
  const defaultProps = {
    onTemplateSelect: vi.fn(),
    onTemplateClone: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  it('renders library interface correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        templates: mockTemplates,
        pagination: { total: 2, limit: 20, hasMore: false },
        filters: {},
        sort: { field: 'created', order: 'desc' }
      })
    })

    render(<OntologyLibrary {...defaultProps} />)

    expect(screen.getByText('Ontology Library')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search ontology templates/i)).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    expect(screen.getByText('E-commerce Ontology')).toBeInTheDocument()
  })

  it('supports search functionality', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          templates: mockTemplates,
          pagination: { total: 2, limit: 20, hasMore: false }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          templates: [mockTemplates[0]],
          pagination: { total: 1, limit: 20, hasMore: false }
        })
      })

    render(<OntologyLibrary {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText(/search ontology templates/i)
    fireEvent.change(searchInput, { target: { value: 'medical' } })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=medical'),
        expect.any(Object)
      )
    })
  })

  it('supports category filtering', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        templates: mockTemplates,
        pagination: { total: 2, limit: 20, hasMore: false }
      })
    })

    render(<OntologyLibrary {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    const categoryFilter = screen.getByRole('combobox', { name: /category/i })
    fireEvent.click(categoryFilter)
    
    await waitFor(() => {
      expect(screen.getByText('healthcare')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('healthcare'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('category=healthcare'),
        expect.any(Object)
      )
    })
  })

  it('displays template details correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        templates: mockTemplates,
        pagination: { total: 2, limit: 20, hasMore: false }
      })
    })

    render(<OntologyLibrary {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    // Check template details
    expect(screen.getByText('Healthcare domain ontology')).toBeInTheDocument()
    expect(screen.getByText('healthcare')).toBeInTheDocument()
    expect(screen.getByText('medical')).toBeInTheDocument()
    expect(screen.getByText('healthcare')).toBeInTheDocument()
    expect(screen.getByText('15 uses')).toBeInTheDocument()
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('2 entity types')).toBeInTheDocument()
    expect(screen.getByText('1 edge type')).toBeInTheDocument()
  })

  it('handles template selection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        templates: mockTemplates,
        pagination: { total: 2, limit: 20, hasMore: false }
      })
    })

    render(<OntologyLibrary {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Medical Ontology'))

    expect(defaultProps.onTemplateSelect).toHaveBeenCalledWith(mockTemplates[0])
  })

  it('handles template cloning', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          templates: mockTemplates,
          pagination: { total: 2, limit: 20, hasMore: false }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'cloned1',
          name: 'Medical Ontology (Copy)',
          message: 'Template cloned successfully'
        })
      })

    render(<OntologyLibrary {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    // Find and click clone button (may be in a dropdown)
    const cloneButton = screen.getByLabelText(/clone template/i) || 
                      screen.getByText(/clone/i)
    fireEvent.click(cloneButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ontologies/templates/template1/clone'),
        expect.objectContaining({
          method: 'POST'
        })
      )
    })

    expect(defaultProps.onTemplateClone).toHaveBeenCalled()
  })

  it('supports grid and list view modes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        templates: mockTemplates,
        pagination: { total: 2, limit: 20, hasMore: false }
      })
    })

    render(<OntologyLibrary {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    // Switch to list view
    const listViewButton = screen.getByLabelText(/list view/i) || 
                          screen.getByRole('button', { name: /list/i })
    fireEvent.click(listViewButton)

    // Check that layout changed
    expect(screen.getByText('Medical Ontology')).toBeInTheDocument()

    // Switch back to grid view
    const gridViewButton = screen.getByLabelText(/grid view/i) || 
                          screen.getByRole('button', { name: /grid/i })
    fireEvent.click(gridViewButton)
  })

  it('supports sorting options', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          templates: mockTemplates,
          pagination: { total: 2, limit: 20, hasMore: false }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          templates: [...mockTemplates].reverse(),
          pagination: { total: 2, limit: 20, hasMore: false }
        })
      })

    render(<OntologyLibrary {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    // Change sort order
    const sortSelect = screen.getByRole('combobox', { name: /sort/i })
    fireEvent.click(sortSelect)
    
    const nameOption = screen.getByText(/name a-z/i) || screen.getByText(/alphabetical/i)
    fireEvent.click(nameOption)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=name'),
        expect.any(Object)
      )
    })
  })

  it('handles template rating display', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        templates: mockTemplates,
        pagination: { total: 2, limit: 20, hasMore: false }
      })
    })

    render(<OntologyLibrary {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    // Check rating display
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('(8 reviews)')).toBeInTheDocument()
  })

  it('displays empty state when no templates found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        templates: [],
        pagination: { total: 0, limit: 20, hasMore: false }
      })
    })

    render(<OntologyLibrary {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/no ontology templates found/i)).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<OntologyLibrary {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load ontology templates/i)).toBeInTheDocument()
    })

    // Should show retry button
    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()
  })

  it('supports template preview', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        templates: mockTemplates,
        pagination: { total: 2, limit: 20, hasMore: false }
      })
    })

    render(<OntologyLibrary {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    // Find and click preview button
    const previewButton = screen.getByLabelText(/preview template/i) || 
                         screen.getByText(/preview/i)
    fireEvent.click(previewButton)

    // Check that preview dialog/panel appears
    expect(screen.getByText('Patient')).toBeInTheDocument()
    expect(screen.getByText('Doctor')).toBeInTheDocument()
    expect(screen.getByText('treats')).toBeInTheDocument()
  })

  it('filters by public/private visibility', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          templates: mockTemplates,
          pagination: { total: 2, limit: 20, hasMore: false }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          templates: [mockTemplates[0]],
          pagination: { total: 1, limit: 20, hasMore: false }
        })
      })

    render(<OntologyLibrary {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    // Filter by public only
    const visibilityFilter = screen.getByRole('combobox', { name: /visibility/i }) ||
                            screen.getByText(/all templates/i)
    fireEvent.click(visibilityFilter)
    
    const publicOption = screen.getByText(/public only/i)
    fireEvent.click(publicOption)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('public=true'),
        expect.any(Object)
      )
    })
  })
})