import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TypeLimitIndicator } from '../TypeLimitIndicator'
import '@testing-library/jest-dom'

describe('TypeLimitIndicator', () => {
  it('renders entity and edge type counts', () => {
    render(
      <TypeLimitIndicator
        entityCount={5}
        edgeCount={3}
      />
    )
    
    expect(screen.getByText('Entity Types')).toBeInTheDocument()
    expect(screen.getByText('Edge Types')).toBeInTheDocument()
    expect(screen.getByText('5 / 10')).toBeInTheDocument()
    expect(screen.getByText('3 / 10')).toBeInTheDocument()
  })

  it('shows green status when usage is low', () => {
    render(
      <TypeLimitIndicator
        entityCount={4}
        edgeCount={2}
      />
    )
    
    expect(screen.getByText('6 slots available')).toBeInTheDocument()
    expect(screen.getByText('8 slots available')).toBeInTheDocument()
  })

  it('shows yellow status when usage is medium', () => {
    render(
      <TypeLimitIndicator
        entityCount={7}
        edgeCount={8}
      />
    )
    
    expect(screen.getByText('Only 3 slots left')).toBeInTheDocument()
    expect(screen.getByText('Only 2 slots left')).toBeInTheDocument()
  })

  it('shows red status when limit is reached', () => {
    render(
      <TypeLimitIndicator
        entityCount={10}
        edgeCount={10}
      />
    )
    
    expect(screen.getAllByText('Limit reached')).toHaveLength(2)
  })

  it('calculates correct percentages', () => {
    render(
      <TypeLimitIndicator
        entityCount={5}
        edgeCount={7}
      />
    )
    
    expect(screen.getByText('5 slots available')).toBeInTheDocument()
    expect(screen.getByText('Only 3 slots left')).toBeInTheDocument()
  })

  it('shows total usage summary', () => {
    render(
      <TypeLimitIndicator
        entityCount={5}
        edgeCount={3}
      />
    )
    
    expect(screen.getByText('Total Usage')).toBeInTheDocument()
    expect(screen.getByText('8 / 20')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('respects custom max limits', () => {
    render(
      <TypeLimitIndicator
        entityCount={3}
        edgeCount={2}
        maxEntities={5}
        maxEdges={5}
      />
    )
    
    expect(screen.getByText('3 / 5')).toBeInTheDocument()
    expect(screen.getByText('2 / 5')).toBeInTheDocument()
    expect(screen.getByText('5 / 10')).toBeInTheDocument()
  })

  it('displays correct slot availability messages', () => {
    render(
      <TypeLimitIndicator
        entityCount={9}
        edgeCount={6}
      />
    )
    
    expect(screen.getByText('Only 1 slots left')).toBeInTheDocument()
    expect(screen.getByText('4 slots available')).toBeInTheDocument()
  })
})