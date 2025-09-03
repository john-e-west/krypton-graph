import React from 'react';
import { Box, Grid, Paper, Typography, Card, CardContent } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { TestResult } from './TestResultsPanel';
import {
  Speed,
  Memory,
  CheckCircle,
  Error as ErrorIcon,
  Timeline,
  Assessment,
} from '@mui/icons-material';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MetricsPanelProps {
  results: TestResult[];
}

export function MetricsPanel({ results }: MetricsPanelProps) {
  if (results.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <Typography color="textSecondary">
          No test results available for metrics analysis.
        </Typography>
      </Box>
    );
  }

  // Performance over time data
  const performanceData = {
    labels: results.map((r, i) => `${i + 1}. ${r.name.substring(0, 15)}...`),
    datasets: [
      {
        label: 'Execution Time (ms)',
        data: results.map(r => r.duration || 0),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  // Status distribution
  const statusCounts = {
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    running: results.filter(r => r.status === 'running').length,
  };

  const statusData = {
    labels: ['Passed', 'Failed', 'Skipped', 'Running'],
    datasets: [
      {
        data: [statusCounts.passed, statusCounts.failed, statusCounts.skipped, statusCounts.running],
        backgroundColor: [
          '#4caf50',
          '#f44336', 
          '#ff9800',
          '#2196f3',
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  // Category performance
  const categoryMetrics = results.reduce((acc, r) => {
    const category = r.category || 'General';
    if (!acc[category]) {
      acc[category] = { total: 0, passed: 0, durations: [] };
    }
    acc[category].total++;
    if (r.status === 'passed') acc[category].passed++;
    if (r.duration) acc[category].durations.push(r.duration);
    return acc;
  }, {} as Record<string, any>);

  Object.keys(categoryMetrics).forEach(cat => {
    const durations = categoryMetrics[cat].durations;
    categoryMetrics[cat].avgDuration = durations.length > 0
      ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
      : 0;
    categoryMetrics[cat].passRate = (categoryMetrics[cat].passed / categoryMetrics[cat].total) * 100;
  });

  const categoryData = {
    labels: Object.keys(categoryMetrics),
    datasets: [
      {
        label: 'Pass Rate (%)',
        data: Object.values(categoryMetrics).map((m: any) => m.passRate.toFixed(1)),
        backgroundColor: 'rgba(33, 150, 243, 0.7)',
        borderColor: '#2196f3',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        label: 'Avg Duration (ms)',
        data: Object.values(categoryMetrics).map((m: any) => m.avgDuration.toFixed(0)),
        backgroundColor: 'rgba(255, 152, 0, 0.7)',
        borderColor: '#ff9800',
        borderWidth: 1,
        yAxisID: 'y1',
      },
    ],
  };

  // Performance statistics
  const durations = results.filter(r => r.duration).map(r => r.duration!);
  const stats = {
    total: results.length,
    passed: statusCounts.passed,
    failed: statusCounts.failed,
    successRate: results.length > 0 ? (statusCounts.passed / results.length) * 100 : 0,
    avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    minDuration: durations.length > 0 ? Math.min(...durations) : 0,
    maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
    fastTests: durations.filter(d => d < 1000).length,
    slowTests: durations.filter(d => d > 5000).length,
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Grid container spacing={3}>
      {/* Key Metrics Cards */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" color="success.main">
                  {stats.successRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Success Rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Speed sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                <Typography variant="h4" color="info.main">
                  {formatDuration(stats.avgDuration)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Avg Duration
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Timeline sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4" color="warning.main">
                  {stats.slowTests}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Slow Tests (&gt;5s)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ErrorIcon sx={{ fontSize: 32, color: 'error.main', mb: 1 }} />
                <Typography variant="h4" color="error.main">
                  {stats.failed}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Failed Tests
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Test Execution Time Chart */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Test Execution Time
          </Typography>
          <Line
            data={performanceData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top' as const },
                tooltip: {
                  callbacks: {
                    afterLabel: (context) => {
                      const result = results[context.dataIndex];
                      return [
                        `Status: ${result.status}`,
                        `Category: ${result.category || 'General'}`,
                      ];
                    },
                  },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Duration (ms)',
                  },
                },
                x: {
                  title: {
                    display: true,
                    text: 'Test Execution Order',
                  },
                },
              },
            }}
            height={300}
          />
        </Paper>
      </Grid>

      {/* Test Status Distribution */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Test Status Distribution
          </Typography>
          <Box sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Doughnut
              data={statusData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' as const },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.label || '';
                        const value = context.parsed;
                        const percentage = ((value / results.length) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                      },
                    },
                  },
                },
              }}
            />
          </Box>
        </Paper>
      </Grid>

      {/* Performance by Category */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Performance by Category
          </Typography>
          <Bar
            data={categoryData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top' as const },
              },
              scales: {
                y: {
                  type: 'linear',
                  display: true,
                  position: 'left',
                  beginAtZero: true,
                  max: 100,
                  title: {
                    display: true,
                    text: 'Pass Rate (%)',
                  },
                },
                y1: {
                  type: 'linear',
                  display: true,
                  position: 'right',
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Average Duration (ms)',
                  },
                  grid: {
                    drawOnChartArea: false,
                  },
                },
              },
            }}
            height={300}
          />
        </Paper>
      </Grid>

      {/* Detailed Performance Statistics */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Performance Statistics
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center" p={2}>
                <Typography variant="h4" color="primary">
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total Tests
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center" p={2}>
                <Typography variant="h4" color="success.main">
                  {formatDuration(stats.minDuration)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Fastest Test
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center" p={2}>
                <Typography variant="h4" color="warning.main">
                  {formatDuration(stats.maxDuration)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Slowest Test
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center" p={2}>
                <Typography variant="h4" color="info.main">
                  {stats.fastTests}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Fast Tests (&lt;1s)
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
}