import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage } from '../DashboardPage'

vi.mock('@/lib/services/airtable-service', () => ({
  airtableService: {
    listRecords: vi.fn().mockResolvedValue([]),
    testConnection: vi.fn().mockResolvedValue(true)
  }
}))

describe('DashboardPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  })

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    )
  }

  it('renders dashboard title', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByText('Dashboard')).toBeDefined()
  })

  it('renders stats cards section', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByText('Total Documents')).toBeDefined()
    expect(screen.getByText('Ontologies')).toBeDefined()
    expect(screen.getByText('Knowledge Graphs')).toBeDefined()
  })

  it('renders activity feed section', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByText('Recent Activity')).toBeDefined()
  })

  it('renders quick actions section', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByText('Quick Actions')).toBeDefined()
    expect(screen.getByText('→ Upload Document')).toBeDefined()
    expect(screen.getByText('→ Create Ontology')).toBeDefined()
    expect(screen.getByText('→ Generate Graph')).toBeDefined()
  })
})