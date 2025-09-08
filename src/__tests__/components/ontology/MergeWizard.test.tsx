import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MergeWizard } from '@/components/ontology/MergeWizard'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock data
const mockOntologies = [
  {
    id: 'ont1',
    name: 'Medical Ontology',
    description: 'Healthcare domain ontology',
    ontology: {
      entityTypes: [
        { id: 'Patient', name: 'Patient', description: 'Medical patient', attributes: [] },
        { id: 'Doctor', name: 'Doctor', description: 'Medical doctor', attributes: [] }
      ],
      edgeTypes: [
        { id: 'treats', name: 'treats', description: 'Doctor treats patient', sourceTypes: ['Doctor'], targetTypes: ['Patient'] }
      ]
    },
    category: 'medical'
  },
  {
    id: 'ont2',
    name: 'Person Ontology',
    description: 'General person ontology',
    ontology: {
      entityTypes: [
        { id: 'Person', name: 'Person', description: 'General person entity', attributes: [] },
        { id: 'Patient', name: 'Patient', description: 'Healthcare patient', attributes: [] }
      ],
      edgeTypes: [
        { id: 'knows', name: 'knows', description: 'Person knows another person', sourceTypes: ['Person'], targetTypes: ['Person'] }
      ]
    },
    category: 'general'
  }
]

describe('MergeWizard', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onMergeComplete: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  it('renders wizard steps correctly', () => {
    render(<MergeWizard {...defaultProps} />)
    
    expect(screen.getByText('Select Ontologies')).toBeInTheDocument()
    expect(screen.getByText('Review Conflicts')).toBeInTheDocument()
    expect(screen.getByText('Configure Merge')).toBeInTheDocument()
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })

  it('allows ontology selection in step 1', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ templates: mockOntologies })
    })

    render(<MergeWizard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    // Select both ontologies
    fireEvent.click(screen.getByLabelText(/Medical Ontology/))
    fireEvent.click(screen.getByLabelText(/Person Ontology/))

    expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(2)
  })

  it('prevents proceeding without selecting ontologies', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ templates: mockOntologies })
    })

    render(<MergeWizard {...defaultProps} />)

    const nextButton = screen.getByRole('button', { name: /next/i })
    expect(nextButton).toBeDisabled()
  })

  it('detects conflicts between ontologies', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockOntologies })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conflicts: [
            {
              type: 'entity_name_collision',
              entityId: 'Patient',
              ontologies: ['ont1', 'ont2'],
              details: {
                conflictingDefinitions: [
                  { ontologyId: 'ont1', name: 'Patient', description: 'Medical patient' },
                  { ontologyId: 'ont2', name: 'Patient', description: 'Healthcare patient' }
                ]
              }
            }
          ]
        })
      })

    render(<MergeWizard {...defaultProps} />)

    // Wait for ontologies to load and select them
    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText(/Medical Ontology/))
    fireEvent.click(screen.getByLabelText(/Person Ontology/))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    // Wait for conflicts to be detected
    await waitFor(() => {
      expect(screen.getByText('Entity Name Collision')).toBeInTheDocument()
    })

    expect(screen.getByText('Patient')).toBeInTheDocument()
    expect(screen.getByText('Medical patient')).toBeInTheDocument()
    expect(screen.getByText('Healthcare patient')).toBeInTheDocument()
  })

  it('allows conflict resolution', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockOntologies })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conflicts: [
            {
              id: 'conflict1',
              type: 'entity_name_collision',
              entityId: 'Patient',
              ontologies: ['ont1', 'ont2'],
              details: {
                conflictingDefinitions: [
                  { ontologyId: 'ont1', name: 'Patient', description: 'Medical patient' },
                  { ontologyId: 'ont2', name: 'Patient', description: 'Healthcare patient' }
                ]
              }
            }
          ]
        })
      })

    render(<MergeWizard {...defaultProps} />)

    // Navigate to conflicts step
    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText(/Medical Ontology/))
    fireEvent.click(screen.getByLabelText(/Person Ontology/))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText('Entity Name Collision')).toBeInTheDocument()
    })

    // Select resolution strategy
    const keepBothRadio = screen.getByLabelText(/Keep both/i)
    fireEvent.click(keepBothRadio)

    expect(keepBothRadio).toBeChecked()
  })

  it('performs merge operation', async () => {
    const mergeResult = {
      success: true,
      mergedOntology: {
        id: 'merged1',
        name: 'Merged Healthcare Ontology',
        entityTypes: 3,
        edgeTypes: 2
      },
      conflicts: [],
      warnings: []
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockOntologies })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ conflicts: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mergeResult
      })

    render(<MergeWizard {...defaultProps} />)

    // Navigate through all steps
    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText(/Medical Ontology/))
    fireEvent.click(screen.getByLabelText(/Person Ontology/))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    // Skip conflicts (none detected)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
    })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    // Configure merge
    const mergeNameInput = screen.getByLabelText(/merged ontology name/i)
    fireEvent.change(mergeNameInput, { target: { value: 'Test Merged Ontology' } })

    const mergeButton = screen.getByRole('button', { name: /merge ontologies/i })
    fireEvent.click(mergeButton)

    // Wait for merge completion
    await waitFor(() => {
      expect(screen.getByText('Merge Complete')).toBeInTheDocument()
    })

    expect(screen.getByText('Merged Healthcare Ontology')).toBeInTheDocument()
    expect(defaultProps.onMergeComplete).toHaveBeenCalledWith(mergeResult)
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<MergeWizard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch ontologies/i)).toBeInTheDocument()
    })
  })

  it('validates merge configuration', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockOntologies })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ conflicts: [] })
      })

    render(<MergeWizard {...defaultProps} />)

    // Navigate to configuration step
    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText(/Medical Ontology/))
    fireEvent.click(screen.getByLabelText(/Person Ontology/))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
    })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    // Try to merge without required fields
    const mergeButton = screen.getByRole('button', { name: /merge ontologies/i })
    fireEvent.click(mergeButton)

    expect(screen.getByText(/merged ontology name is required/i)).toBeInTheDocument()
  })

  it('displays progress during merge operation', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockOntologies })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ conflicts: [] })
      })
      .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<MergeWizard {...defaultProps} />)

    // Navigate to merge step
    await waitFor(() => {
      expect(screen.getByText('Medical Ontology')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText(/Medical Ontology/))
    fireEvent.click(screen.getByLabelText(/Person Ontology/))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
    })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    const mergeNameInput = screen.getByLabelText(/merged ontology name/i)
    fireEvent.change(mergeNameInput, { target: { value: 'Test Merged' } })

    const mergeButton = screen.getByRole('button', { name: /merge ontologies/i })
    fireEvent.click(mergeButton)

    expect(screen.getByText(/merging ontologies/i)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('allows cancellation at any step', () => {
    render(<MergeWizard {...defaultProps} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('resets wizard state when reopened', async () => {
    const { rerender } = render(<MergeWizard {...defaultProps} open={false} />)

    // Reopen wizard
    rerender(<MergeWizard {...defaultProps} open={true} />)

    // Should be back to step 1
    expect(screen.getByText('Select Ontologies to Merge')).toBeInTheDocument()
  })
})