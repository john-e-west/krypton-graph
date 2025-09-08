import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ClassificationPreview } from '../ClassificationPreview'
import '@testing-library/jest-dom'

const mockPreviewMetrics = {
  totalItems: 100,
  classifiedCount: 85,
  unclassifiedCount: 15,
  classificationRate: 85,
  averageConfidence: 78.5,
  byType: [
    {
      entityType: 'Person',
      confidence: 0.85,
      count: 40,
      samples: [
        { text: 'John Smith', confidence: 0.9 },
        { text: 'Jane Doe', confidence: 0.85 }
      ]
    },
    {
      entityType: 'Organization',
      confidence: 0.72,
      count: 25,
      samples: [
        { text: 'Acme Corp', confidence: 0.75 },
        { text: 'Global Tech', confidence: 0.7 }
      ]
    },
    {
      entityType: 'Location',
      confidence: 0.8,
      count: 20,
      samples: [
        { text: 'New York', confidence: 0.82 },
        { text: 'San Francisco', confidence: 0.78 }
      ]
    }
  ]
}

const mockCurrentMetrics = {
  totalItems: 100,
  classifiedCount: 75,
  unclassifiedCount: 25,
  classificationRate: 75,
  averageConfidence: 70.5,
  byType: [
    {
      entityType: 'Person',
      confidence: 0.8,
      count: 35,
      samples: [
        { text: 'John Smith', confidence: 0.85 }
      ]
    },
    {
      entityType: 'Organization',
      confidence: 0.68,
      count: 20,
      samples: [
        { text: 'Acme Corp', confidence: 0.7 }
      ]
    },
    {
      entityType: 'Location',
      confidence: 0.75,
      count: 20,
      samples: [
        { text: 'New York', confidence: 0.75 }
      ]
    }
  ]
}

describe('ClassificationPreview', () => {
  it('renders preview metrics', () => {
    render(
      <ClassificationPreview
        previewMetrics={mockPreviewMetrics}
      />
    )
    
    expect(screen.getByText('Classification Preview')).toBeInTheDocument()
    expect(screen.getByText('85.0% Success Rate')).toBeInTheDocument()
    expect(screen.getByText('Preview how your types will classify the document')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(
      <ClassificationPreview
        previewMetrics={mockPreviewMetrics}
        isLoading={true}
      />
    )
    
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('displays comparison when current metrics provided', () => {
    render(
      <ClassificationPreview
        currentMetrics={mockCurrentMetrics}
        previewMetrics={mockPreviewMetrics}
      />
    )
    
    expect(screen.getByText('Current')).toBeInTheDocument()
    expect(screen.getByText('75.0%')).toBeInTheDocument()
    expect(screen.getByText('After Changes')).toBeInTheDocument()
    expect(screen.getByText('+10.0%')).toBeInTheDocument()
  })

  it('shows distribution tab content', () => {
    render(
      <ClassificationPreview
        previewMetrics={mockPreviewMetrics}
      />
    )
    
    expect(screen.getByText('Total Items')).toBeInTheDocument()
    expect(screen.getAllByText('100')[0]).toBeInTheDocument()
    expect(screen.getByText('Classified')).toBeInTheDocument()
    expect(screen.getAllByText('85')[0]).toBeInTheDocument()
    expect(screen.getByText('Unclassified')).toBeInTheDocument()
    expect(screen.getAllByText('15')[0]).toBeInTheDocument()
  })

  it('displays classification metrics', () => {
    render(
      <ClassificationPreview
        previewMetrics={mockPreviewMetrics}
      />
    )
    
    expect(screen.getByText('Success Rate')).toBeInTheDocument()
    expect(screen.getByText('85.0%')).toBeInTheDocument()
    expect(screen.getByText('Avg Confidence')).toBeInTheDocument()
    expect(screen.getByText('78.5%')).toBeInTheDocument()
    expect(screen.getByText('Type Count')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows tabs for different views', () => {
    render(
      <ClassificationPreview
        previewMetrics={mockPreviewMetrics}
      />
    )
    
    expect(screen.getByRole('tab', { name: 'Distribution' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Samples' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Comparison' })).toBeInTheDocument()
  })

  it('displays trend indicators for improvements', () => {
    render(
      <ClassificationPreview
        currentMetrics={mockCurrentMetrics}
        previewMetrics={mockPreviewMetrics}
      />
    )
    
    const trendingUpIcon = document.querySelector('.lucide-trending-up')
    expect(trendingUpIcon).toBeInTheDocument()
  })

  it('shows negative trend for decreased performance', () => {
    const worseMetrics = {
      ...mockPreviewMetrics,
      classificationRate: 70,
      averageConfidence: 65
    }
    
    render(
      <ClassificationPreview
        currentMetrics={mockCurrentMetrics}
        previewMetrics={worseMetrics}
      />
    )
    
    const trendingDownIcon = document.querySelector('.lucide-trending-down')
    expect(trendingDownIcon).toBeInTheDocument()
    expect(screen.getByText('-5.0%')).toBeInTheDocument()
  })

  it('handles missing current metrics gracefully', () => {
    render(
      <ClassificationPreview
        previewMetrics={mockPreviewMetrics}
      />
    )
    
    expect(screen.queryByText('Current')).not.toBeInTheDocument()
    expect(screen.queryByText('After Changes')).not.toBeInTheDocument()
  })
})