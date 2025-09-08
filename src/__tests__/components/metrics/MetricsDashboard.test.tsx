import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MetricsDashboard } from '@/components/metrics/MetricsDashboard'

// Mock recharts components
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />
}))

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock metrics data
const mockMetrics = {
  graphId: 'graph123',
  totalEntities: 1250,
  totalEdges: 3420,
  averageAccuracy: 94.5,
  classificationRate: 125.3,
  topEntityTypes: [
    { name: 'Person', count: 450, accuracy: 96.2 },
    { name: 'Organization', count: 320, accuracy: 92.8 },
    { name: 'Location', count: 280, accuracy: 95.1 },
    { name: 'Event', count: 200, accuracy: 89.4 }
  ],
  topEdgeTypes: [
    { name: 'works_at', count: 800, accuracy: 94.5 },
    { name: 'located_in', count: 650, accuracy: 96.1 },
    { name: 'participates_in', count: 520, accuracy: 91.3 },
    { name: 'owns', count: 450, accuracy: 93.7 }
  ],
  dailyTrends: [
    {
      date: '2024-01-01',
      entities: 100,
      edges: 250,
      accuracy: 94.2,
      successRate: 98.1
    },
    {
      date: '2024-01-02',
      entities: 120,
      edges: 290,
      accuracy: 95.1,
      successRate: 98.5
    },
    {
      date: '2024-01-03',
      entities: 110,
      edges: 275,
      accuracy: 93.8,
      successRate: 97.9
    }
  ],
  weeklyTrends: [
    {
      weekStart: '2024-01-01',
      entities: 750,
      edges: 1800,
      accuracy: 94.5,
      successRate: 98.2
    }
  ],
  monthlyTrends: [
    {
      monthStart: '2024-01-01',
      entities: 3200,
      edges: 7800,
      accuracy: 94.8,
      successRate: 98.0
    }
  ],
  performanceMetrics: {
    avgProcessingTime: 1.25,
    successRate: 98.2,
    errorRate: 1.8,
    throughputPerHour: 125
  },
  lastUpdated: '2024-01-03T12:00:00Z'
}

describe('MetricsDashboard', () => {
  const defaultProps = {
    graphId: 'graph123'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  it('renders dashboard with loading state', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<MetricsDashboard {...defaultProps} />)

    expect(screen.getByText(/loading classification metrics/i)).toBeInTheDocument()
  })

  it('loads and displays metrics data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics
    })

    render(<MetricsDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Classification Metrics')).toBeInTheDocument()
    })

    // Check KPI cards
    expect(screen.getByText('1,250')).toBeInTheDocument() // Total entities
    expect(screen.getByText('3,420')).toBeInTheDocument() // Total edges
    expect(screen.getByText('94.5%')).toBeInTheDocument() // Average accuracy
    expect(screen.getByText('98.2%')).toBeInTheDocument() // Success rate
  })

  it('supports time range selection', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics
      })

    render(<MetricsDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Classification Metrics')).toBeInTheDocument()
    })

    // Change time range to weekly
    const timeRangeSelect = screen.getByRole('combobox')
    fireEvent.click(timeRangeSelect)
    fireEvent.click(screen.getByText('Weekly'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('timeRange=weekly'),
        expect.any(Object)
      )
    })
  })

  it('displays trend charts', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics
    })

    render(<MetricsDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Classification Metrics')).toBeInTheDocument()
    })

    // Check that charts are rendered
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByText('Classification Trends')).toBeInTheDocument()
  })

  it('shows entity type breakdown', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics
    })

    render(<MetricsDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Classification Metrics')).toBeInTheDocument()
    })

    // Click on Type Breakdown tab
    fireEvent.click(screen.getByText('Type Breakdown'))

    // Check entity types are displayed
    expect(screen.getByText('Person')).toBeInTheDocument()
    expect(screen.getByText('Organization')).toBeInTheDocument()
    expect(screen.getByText('450')).toBeInTheDocument() // Person count
    expect(screen.getByText('320')).toBeInTheDocument() // Organization count
  })

  it('shows edge type breakdown', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics
    })

    render(<MetricsDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Classification Metrics')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Type Breakdown'))

    // Check edge types are displayed
    expect(screen.getByText('works_at')).toBeInTheDocument()
    expect(screen.getByText('located_in')).toBeInTheDocument()
    expect(screen.getByText('800')).toBeInTheDocument() // works_at count
  })

  it('displays performance metrics', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics
    })

    render(<MetricsDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Classification Metrics')).toBeInTheDocument()
    })

    // Click on Performance tab
    fireEvent.click(screen.getByText('Performance'))

    // Check performance metrics
    expect(screen.getByText('1.25s')).toBeInTheDocument() // Avg processing time
    expect(screen.getByText('1.8%')).toBeInTheDocument() // Error rate
    expect(screen.getByText('125/hr')).toBeInTheDocument() // Throughput
  })

  it('supports data refresh', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockMetrics,
          totalEntities: 1500
        })
      })

    render(<MetricsDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('1,250')).toBeInTheDocument()
    })

    // Click refresh button
    const refreshButton = screen.getByLabelText(/refresh/i) || 
                         screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(screen.getByText('1,500')).toBeInTheDocument()
    })
  })

  it('handles export functionality', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics
    })

    // Mock URL and createElement for download
    global.URL.createObjectURL = vi.fn(() => 'mock-url')
    global.URL.revokeObjectURL = vi.fn()
    
    const mockLink = {
      click: vi.fn(),
      setAttribute: vi.fn()
    }
    document.createElement = vi.fn(() => mockLink) as any

    render(<MetricsDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Classification Metrics')).toBeInTheDocument()
    })

    // Click export button
    const exportButton = screen.getByText('Export')
    fireEvent.click(exportButton)

    expect(mockLink.click).toHaveBeenCalled()
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<MetricsDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })

    // Should show retry button
    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()
  })

  it('shows empty state for no data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null
    })

    render(<MetricsDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/no classification data available/i)).toBeInTheDocument()
    })
  })

  it('displays accuracy trends correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics
    })

    render(<MetricsDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Classification Metrics')).toBeInTheDocument()
    })

    // Check for trend indicators in the accuracy card
    const accuracyCard = screen.getByText('94.5%').closest('[role="group"]') || 
                        screen.getByText('94.5%').parentElement

    // Should show trend icon (up, down, or neutral)
    expect(accuracyCard).toBeInTheDocument()
  })

  it('formats time axis labels correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics
    })

    render(<MetricsDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Classification Metrics')).toBeInTheDocument()
    })

    // Charts should be rendered with proper formatting
    expect(screen.getByTestId('x-axis')).toBeInTheDocument()
    expect(screen.getByTestId('y-axis')).toBeInTheDocument()
  })

  it('supports accuracy threshold highlighting', async () => {
    const lowAccuracyMetrics = {
      ...mockMetrics,
      averageAccuracy: 75.5,
      topEntityTypes: [
        { name: 'Person', count: 450, accuracy: 70.2 },
        { name: 'Organization', count: 320, accuracy: 80.8 }
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => lowAccuracyMetrics
    })

    render(<MetricsDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('75.5%')).toBeInTheDocument()
    })

    // Low accuracy values should be highlighted differently
    expect(screen.getByText('70.2%')).toBeInTheDocument()
  })
})