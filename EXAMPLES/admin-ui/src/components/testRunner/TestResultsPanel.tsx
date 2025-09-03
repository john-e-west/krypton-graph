import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Collapse,
  Box,
  Typography,
  Alert,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  PlayArrow,
  SkipNext,
} from '@mui/icons-material';

export interface TestResult {
  testId: string;
  name: string;
  category?: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  stackTrace?: string;
  metrics?: {
    memory?: number;
    cpu?: number;
  };
}

interface TestResultsPanelProps {
  results: TestResult[];
}

export function TestResultsPanel({ results }: TestResultsPanelProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = (testId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  };

  const getStatusChip = (status: TestResult['status']) => {
    const config = {
      passed: { color: 'success' as const, icon: <CheckCircle sx={{ fontSize: 14 }} />, label: 'PASSED' },
      failed: { color: 'error' as const, icon: <ErrorIcon sx={{ fontSize: 14 }} />, label: 'FAILED' },
      running: { color: 'info' as const, icon: <PlayArrow sx={{ fontSize: 14 }} />, label: 'RUNNING' },
      skipped: { color: 'default' as const, icon: <SkipNext sx={{ fontSize: 14 }} />, label: 'SKIPPED' },
      pending: { color: 'warning' as const, icon: <Schedule sx={{ fontSize: 14 }} />, label: 'PENDING' },
    };

    const { color, icon, label } = config[status] || config.pending;

    return (
      <Chip
        icon={icon}
        label={label}
        color={color}
        size="small"
        sx={{
          fontWeight: 'bold',
          minWidth: 80,
        }}
      />
    );
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const stats = {
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    running: results.filter(r => r.status === 'running').length,
    avgDuration: results.length > 0
      ? results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length
      : 0,
  };

  const successRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;

  if (results.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={200}>
        <Typography color="textSecondary">
          No test results available. Run tests to see results here.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Summary Stats */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <Alert severity="info" sx={{ flex: 1, minWidth: 120 }}>
          <Typography variant="body2">
            <strong>Total:</strong> {stats.total}
          </Typography>
        </Alert>
        
        <Alert severity="success" sx={{ flex: 1, minWidth: 120 }}>
          <Typography variant="body2">
            <strong>Passed:</strong> {stats.passed}
          </Typography>
        </Alert>
        
        <Alert severity="error" sx={{ flex: 1, minWidth: 120 }}>
          <Typography variant="body2">
            <strong>Failed:</strong> {stats.failed}
          </Typography>
        </Alert>
        
        <Alert 
          severity={successRate >= 90 ? "success" : successRate >= 70 ? "warning" : "error"}
          sx={{ flex: 1, minWidth: 140 }}
        >
          <Typography variant="body2">
            <strong>Success Rate:</strong> {successRate.toFixed(1)}%
          </Typography>
        </Alert>
        
        <Alert severity="info" sx={{ flex: 1, minWidth: 140 }}>
          <Typography variant="body2">
            <strong>Avg Duration:</strong> {formatDuration(stats.avgDuration)}
          </Typography>
        </Alert>
      </Box>

      {/* Results Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              <TableCell sx={{ fontWeight: 'bold' }}>Test Name</TableCell>
              <TableCell width={120} sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell width={100} sx={{ fontWeight: 'bold' }}>Duration</TableCell>
              <TableCell width={120} sx={{ fontWeight: 'bold' }}>Category</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((result) => (
              <React.Fragment key={result.testId}>
                <TableRow
                  hover
                  sx={{
                    backgroundColor: result.status === 'failed' ? 'error.50' : 
                                   result.status === 'passed' ? 'success.50' :
                                   result.status === 'running' ? 'info.50' : 'inherit',
                  }}
                >
                  <TableCell>
                    {(result.error || result.stackTrace) && (
                      <Tooltip title="Click to view error details">
                        <IconButton
                          size="small"
                          onClick={() => toggleExpand(result.testId)}
                        >
                          {expandedRows.has(result.testId) ? (
                            <KeyboardArrowUp />
                          ) : (
                            <KeyboardArrowDown />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {result.name}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>{getStatusChip(result.status)}</TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {formatDuration(result.duration)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      label={result.category || 'General'}
                      size="small"
                      variant="outlined"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                </TableRow>

                {/* Error Details Row */}
                {(result.error || result.stackTrace) && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 0, border: 0 }}>
                      <Collapse in={expandedRows.has(result.testId)}>
                        <Box sx={{ p: 2, bgcolor: 'grey.50', m: 1, borderRadius: 1 }}>
                          {result.error && (
                            <>
                              <Typography variant="subtitle2" color="error" gutterBottom>
                                Error Message:
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: 'monospace',
                                  backgroundColor: 'error.50',
                                  p: 1,
                                  borderRadius: 1,
                                  mb: 2,
                                  color: 'error.dark',
                                }}
                              >
                                {result.error}
                              </Typography>
                            </>
                          )}

                          {result.stackTrace && (
                            <>
                              <Typography variant="subtitle2" color="error" gutterBottom>
                                Stack Trace:
                              </Typography>
                              <Typography
                                component="pre"
                                variant="body2"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '11px',
                                  overflow: 'auto',
                                  backgroundColor: 'grey.100',
                                  p: 1,
                                  borderRadius: 1,
                                  maxHeight: 200,
                                  color: 'text.secondary',
                                }}
                              >
                                {result.stackTrace}
                              </Typography>
                            </>
                          )}

                          {result.metrics && (
                            <>
                              <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
                                Performance Metrics:
                              </Typography>
                              <Box display="flex" gap={2}>
                                {result.metrics.memory && (
                                  <Chip
                                    label={`Memory: ${result.metrics.memory}MB`}
                                    size="small"
                                    color="info"
                                  />
                                )}
                                {result.metrics.cpu && (
                                  <Chip
                                    label={`CPU: ${result.metrics.cpu}%`}
                                    size="small"
                                    color="info"
                                  />
                                )}
                              </Box>
                            </>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {stats.running > 0 && (
        <Box mt={2}>
          <Alert severity="info">
            <Typography variant="body2">
              {stats.running} test(s) still running...
            </Typography>
          </Alert>
        </Box>
      )}
    </Box>
  );
}