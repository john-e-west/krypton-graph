import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DocumentProcessingCard } from '../DocumentProcessingCard'
import { DocumentProcessingStatus } from '@/types/processing'

describe('DocumentProcessingCard', () => {
  const mockDocument: DocumentProcessingStatus = {
    documentId: 'doc-1',
    name: 'test-document.pdf',
    type: 'pdf',
    status: 'processing',
    currentPhase: 'chunking',
    phases: {
      upload: {
        status: 'completed',
        progress: 100,
        startedAt: new Date('2024-01-01T10:00:00'),
        completedAt: new Date('2024-01-01T10:01:00'),
        duration: 60000
      },
      conversion: {
        status: 'completed',
        progress: 100,
        startedAt: new Date('2024-01-01T10:01:00'),
        completedAt: new Date('2024-01-01T10:03:00'),
        duration: 120000
      },
      chunking: {
        status: 'in_progress',
        progress: 45,
        startedAt: new Date('2024-01-01T10:03:00')
      },
      staging: {
        status: 'pending',
        progress: 0
      }
    },
    startedAt: new Date('2024-01-01T10:00:00'),
    metrics: {
      fileSize: 1048576,
      pageCount: 10,
      processingTime: 180000,
      conversionTime: 120000,
      chunkingTime: 60000
    },
    retryCount: 0,
    canRetry: false
  }

  it('renders document information correctly', () => {
    render(<DocumentProcessingCard document={mockDocument} />)
    
    expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('1 MB')).toBeInTheDocument()
    expect(screen.getByText('10 pages')).toBeInTheDocument()
  })

  it('displays correct status badge', () => {
    render(<DocumentProcessingCard document={mockDocument} />)
    
    expect(screen.getByText('processing')).toBeInTheDocument()
  })

  it('shows phase indicators with correct status', () => {
    render(<DocumentProcessingCard document={mockDocument} />)
    
    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.getByText('Convert')).toBeInTheDocument()
    expect(screen.getByText('Chunk')).toBeInTheDocument()
    expect(screen.getByText('Stage')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
  })

  it('displays progress bar for processing documents', () => {
    render(<DocumentProcessingCard document={mockDocument} />)
    
    expect(screen.getByText('Overall Progress')).toBeInTheDocument()
    expect(screen.getByText('61%')).toBeInTheDocument() // (100+100+45+0)/4
  })

  it('shows error message for failed documents', () => {
    const failedDoc: DocumentProcessingStatus = {
      ...mockDocument,
      status: 'failed',
      error: {
        code: 'CONVERSION_ERROR',
        message: 'Failed to convert document',
        category: 'format',
        details: { reason: 'Unsupported format' }
      }
    }

    render(<DocumentProcessingCard document={failedDoc} />)
    
    expect(screen.getByText('Failed to convert document')).toBeInTheDocument()
  })

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn()
    const retryableDoc: DocumentProcessingStatus = {
      ...mockDocument,
      status: 'failed',
      canRetry: true,
      retryCount: 1
    }

    render(<DocumentProcessingCard document={retryableDoc} onRetry={onRetry} />)
    
    const retryButton = screen.getByText(/Retry/)
    fireEvent.click(retryButton)
    
    expect(onRetry).toHaveBeenCalledWith('doc-1')
  })

  it('calls onViewDetails when view details button is clicked', () => {
    const onViewDetails = vi.fn()

    render(<DocumentProcessingCard document={mockDocument} onViewDetails={onViewDetails} />)
    
    const detailsButton = screen.getByText('View Details')
    fireEvent.click(detailsButton)
    
    expect(onViewDetails).toHaveBeenCalledWith('doc-1')
  })

  it('displays correct status icon', () => {
    const completedDoc: DocumentProcessingStatus = {
      ...mockDocument,
      status: 'completed'
    }

    const { rerender } = render(<DocumentProcessingCard document={completedDoc} />)
    expect(screen.getByText('completed')).toBeInTheDocument()

    const failedDoc: DocumentProcessingStatus = {
      ...mockDocument,
      status: 'failed'
    }
    rerender(<DocumentProcessingCard document={failedDoc} />)
    expect(screen.getByText('failed')).toBeInTheDocument()
  })
})