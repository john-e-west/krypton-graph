import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Badge,
  IconButton,
  Tooltip,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  ExpandMore,
  PlayArrow,
  Pause,
  Settings,
  Help,
  CheckBox,
  CheckBoxOutlineBlank,
  IndeterminateCheckBox,
} from '@mui/icons-material';

interface TestCase {
  id: string;
  name: string;
  category: string;
  description: string;
  timeout?: number;
  required?: boolean;
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCount: number;
  tests?: TestCase[];
  config: {
    parallel: boolean;
    stopOnFailure: boolean;
    retryCount: number;
    timeout: number;
  };
  categories: string[];
}

interface TestSelectionPanelProps {
  suites?: TestSuite[];
  selectedSuite: string;
  selectedTests: Set<string>;
  onTestSelect: (tests: Set<string>) => void;
  onSuiteSelect?: (suiteId: string) => void;
  disabled?: boolean;
}

export function TestSelectionPanel({
  suites = [],
  selectedSuite,
  selectedTests,
  onTestSelect,
  onSuiteSelect,
  disabled = false,
}: TestSelectionPanelProps) {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['structure']));

  const currentSuite = suites.find(suite => suite.id === selectedSuite);
  const testsByCategory = currentSuite?.tests?.reduce((acc, test) => {
    if (!acc[test.category]) {
      acc[test.category] = [];
    }
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, TestCase[]>) || {};

  const handleTestToggle = (testId: string) => {
    const newSelection = new Set(selectedTests);
    if (newSelection.has(testId)) {
      newSelection.delete(testId);
    } else {
      newSelection.add(testId);
    }
    onTestSelect(newSelection);
  };

  const handleCategoryToggle = (category: string) => {
    const categoryTests = testsByCategory[category] || [];
    const categoryTestIds = categoryTests.map(test => test.id);
    const allSelected = categoryTestIds.every(id => selectedTests.has(id));
    
    const newSelection = new Set(selectedTests);
    
    if (allSelected) {
      // Unselect all tests in category
      categoryTestIds.forEach(id => newSelection.delete(id));
    } else {
      // Select all tests in category
      categoryTestIds.forEach(id => newSelection.add(id));
    }
    
    onTestSelect(newSelection);
  };

  const handleSelectAll = () => {
    if (!currentSuite?.tests) return;
    
    const allTestIds = currentSuite.tests.map(test => test.id);
    onTestSelect(new Set(allTestIds));
  };

  const handleSelectNone = () => {
    onTestSelect(new Set());
  };

  const getCategorySelectionState = (category: string) => {
    const categoryTests = testsByCategory[category] || [];
    const selectedCount = categoryTests.filter(test => selectedTests.has(test.id)).length;
    
    if (selectedCount === 0) return 'none';
    if (selectedCount === categoryTests.length) return 'all';
    return 'partial';
  };

  const getCategoryIcon = (category: string) => {
    const state = getCategorySelectionState(category);
    if (state === 'all') return <CheckBox />;
    if (state === 'partial') return <IndeterminateCheckBox />;
    return <CheckBoxOutlineBlank />;
  };

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const getCategoryChipColor = (category: string) => {
    const colors: Record<string, any> = {
      'structure': 'primary',
      'integrity': 'secondary',
      'performance': 'warning',
      'integration': 'info',
      'security': 'error',
    };
    return colors[category] || 'default';
  };

  if (!currentSuite) {
    return (
      <Paper sx={{ p: 3, width: 350 }}>
        <Typography color="textSecondary" textAlign="center">
          Select a test suite to view available tests
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: 350, height: 'fit-content', maxHeight: '80vh', overflow: 'auto' }}>
      {/* Suite Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="h6" gutterBottom>
            {currentSuite.name}
          </Typography>
          <Tooltip title="Configure test settings">
            <IconButton size="small" onClick={() => setConfigDialogOpen(true)}>
              <Settings />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Typography variant="body2" color="textSecondary" paragraph>
          {currentSuite.description}
        </Typography>
        
        <Box display="flex" gap={1} alignItems="center" mb={2}>
          <Chip
            size="small"
            label={`${currentSuite.testCount} tests`}
            color="info"
          />
          <Chip
            size="small"
            label={currentSuite.config.parallel ? 'Parallel' : 'Sequential'}
            color={currentSuite.config.parallel ? 'success' : 'default'}
          />
        </Box>

        {/* Selection Controls */}
        <Box display="flex" gap={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleSelectAll}
            disabled={disabled}
            startIcon={<CheckBox />}
          >
            All
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleSelectNone}
            disabled={disabled}
            startIcon={<CheckBoxOutlineBlank />}
          >
            None
          </Button>
        </Box>
      </Box>

      {/* Test Categories */}
      <Box sx={{ p: 2 }}>
        {Object.entries(testsByCategory).map(([category, tests]) => (
          <Accordion
            key={category}
            expanded={expandedCategories.has(category)}
            onChange={() => toggleCategoryExpansion(category)}
            disabled={disabled}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={2} width="100%">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCategoryToggle(category);
                  }}
                  disabled={disabled}
                >
                  {getCategoryIcon(category)}
                </IconButton>
                
                <Box display="flex" alignItems="center" gap={1} flex={1}>
                  <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                    {category}
                  </Typography>
                  <Chip
                    size="small"
                    label={tests.length}
                    color={getCategoryChipColor(category)}
                    sx={{ minWidth: 'auto' }}
                  />
                </Box>

                <Badge
                  badgeContent={tests.filter(test => selectedTests.has(test.id)).length}
                  color="primary"
                  sx={{ mr: 1 }}
                >
                  <Box width={16} />
                </Badge>
              </Box>
            </AccordionSummary>
            
            <AccordionDetails>
              <FormGroup>
                {tests.map((test) => (
                  <Box key={test.id} mb={1}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedTests.has(test.id)}
                          onChange={() => handleTestToggle(test.id)}
                          disabled={disabled}
                          size="small"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {test.name}
                            {test.required && (
                              <Chip
                                size="small"
                                label="Required"
                                color="error"
                                sx={{ ml: 1, height: 16, fontSize: '10px' }}
                              />
                            )}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {test.description}
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start', width: '100%' }}
                    />
                  </Box>
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Selection Summary */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
        <Typography variant="body2" color="textSecondary">
          <strong>{selectedTests.size}</strong> of <strong>{currentSuite.testCount}</strong> tests selected
        </Typography>
      </Box>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Test Configuration</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Current Configuration:
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Execution Mode"
                value={currentSuite.config.parallel ? 'Parallel' : 'Sequential'}
                disabled
                size="small"
              />
              <TextField
                label="Stop on Failure"
                value={currentSuite.config.stopOnFailure ? 'Yes' : 'No'}
                disabled
                size="small"
              />
              <TextField
                label="Retry Count"
                value={currentSuite.config.retryCount}
                disabled
                size="small"
              />
              <TextField
                label="Timeout (ms)"
                value={currentSuite.config.timeout}
                disabled
                size="small"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}