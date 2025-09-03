import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Slider,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  PlayArrow as TestIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { airtableService } from '../services/airtableService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const FactRatingConfig: React.FC = () => {
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [testDialog, setTestDialog] = useState(false);
  const [minRating, setMinRating] = useState(0.3);
  
  const [formData, setFormData] = useState({
    name: '',
    ontologyId: '',
    instruction: '',
    highExample: '',
    mediumExample: '',
    lowExample: '',
    domainContext: '',
    defaultMinRating: 0.3,
  });

  const [testData, setTestData] = useState({
    sampleFacts: ['', '', ''],
  });

  // Fetch configurations
  const { data: configs = [], isLoading } = useQuery(
    'factRatingConfigs',
    () => airtableService.getFactRatingConfigs()
  );

  // Fetch ontologies for dropdown
  const { data: ontologies = [] } = useQuery(
    'ontologies',
    () => airtableService.getOntologies()
  );

  // Create mutation
  const createMutation = useMutation(
    (data: typeof formData) => airtableService.createFactRatingConfig(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('factRatingConfigs');
        handleCloseDialog();
      },
    }
  );

  // Update mutation
  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: any }) =>
      airtableService.updateFactRatingConfig(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('factRatingConfigs');
      },
    }
  );

  const handleOpenDialog = (config?: any) => {
    if (config) {
      setSelectedConfig(config);
      setFormData({
        name: config.name,
        ontologyId: config.ontologyId || '',
        instruction: config.instruction,
        highExample: config.highExample,
        mediumExample: config.mediumExample,
        lowExample: config.lowExample,
        domainContext: config.domainContext || '',
        defaultMinRating: config.defaultMinRating || 0.3,
      });
    } else {
      setSelectedConfig(null);
      setFormData({
        name: '',
        ontologyId: '',
        instruction: '',
        highExample: '',
        mediumExample: '',
        lowExample: '',
        domainContext: '',
        defaultMinRating: 0.3,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedConfig(null);
  };

  const handleSubmit = () => {
    if (selectedConfig) {
      updateMutation.mutate({
        id: selectedConfig.id,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleRunTest = (configId: string) => {
    setTestDialog(true);
    // Would trigger test execution here
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Testing':
        return 'warning';
      case 'Draft':
        return 'default';
      case 'Deprecated':
        return 'error';
      default:
        return 'default';
    }
  };

  const getRatingLevel = (rating: number) => {
    if (rating >= 0.7) return { label: 'High', color: 'success' };
    if (rating >= 0.3) return { label: 'Medium', color: 'warning' };
    return { label: 'Low', color: 'error' };
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Fact Rating Configuration</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Create Configuration
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Configurations" />
          <Tab label="Test Results" />
          <Tab label="Effectiveness" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {configs.map((config: any) => (
            <Grid item xs={12} md={6} key={config.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {config.name}
                      </Typography>
                      <Chip
                        label={config.status}
                        color={getStatusColor(config.status) as any}
                        size="small"
                      />
                    </Box>
                    <PsychologyIcon color="primary" />
                  </Box>

                  <Typography variant="body2" color="textSecondary" paragraph>
                    {config.instruction}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="primary">
                        High Example:
                      </Typography>
                      <Typography variant="body2" noWrap>
                        {config.highExample}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="warning.main">
                        Medium Example:
                      </Typography>
                      <Typography variant="body2" noWrap>
                        {config.mediumExample}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="error">
                        Low Example:
                      </Typography>
                      <Typography variant="body2" noWrap>
                        {config.lowExample}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Box mt={2}>
                    <Typography variant="body2" gutterBottom>
                      Default Min Rating: {config.defaultMinRating}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={config.defaultMinRating * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  {config.effectivenessScore !== undefined && (
                    <Box mt={2} display="flex" alignItems="center">
                      <TrendingUpIcon fontSize="small" sx={{ mr: 1 }} />
                      <Typography variant="body2">
                        Effectiveness: {(config.effectivenessScore * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  )}

                  <Box mt={2} display="flex" justifyContent="space-between">
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenDialog(config)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Run Test">
                        <IconButton size="small" onClick={() => handleRunTest(config.id)}>
                          <TestIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    {config.status === 'Testing' && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => updateMutation.mutate({
                          id: config.id,
                          data: { Status: 'Active' }
                        })}
                      >
                        Activate
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          Recent Test Results
        </Typography>
        {/* Test results would be displayed here */}
        <Alert severity="info">
          Test results will appear here after running configuration tests
        </Alert>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          Effectiveness Metrics
        </Typography>
        {/* Effectiveness charts would be displayed here */}
        <Alert severity="info">
          Effectiveness metrics and trends will be displayed here
        </Alert>
      </TabPanel>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedConfig ? 'Edit Rating Configuration' : 'Create Rating Configuration'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Configuration Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Ontology"
                value={formData.ontologyId}
                onChange={(e) => setFormData({ ...formData, ontologyId: e.target.value })}
                margin="normal"
                SelectProps={{ native: true }}
              >
                <option value="">Select Ontology</option>
                {ontologies.map((ont: any) => (
                  <option key={ont.id} value={ont.id}>
                    {ont.name}
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rating Instruction"
                value={formData.instruction}
                onChange={(e) => setFormData({ ...formData, instruction: e.target.value })}
                margin="normal"
                multiline
                rows={3}
                required
                helperText="Explain how facts should be rated for your use case"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="High Relevance Example"
                value={formData.highExample}
                onChange={(e) => setFormData({ ...formData, highExample: e.target.value })}
                margin="normal"
                multiline
                rows={2}
                required
                helperText="Example of a highly relevant fact (0.7-1.0)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Medium Relevance Example"
                value={formData.mediumExample}
                onChange={(e) => setFormData({ ...formData, mediumExample: e.target.value })}
                margin="normal"
                multiline
                rows={2}
                required
                helperText="Example of a moderately relevant fact (0.3-0.7)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Low Relevance Example"
                value={formData.lowExample}
                onChange={(e) => setFormData({ ...formData, lowExample: e.target.value })}
                margin="normal"
                multiline
                rows={2}
                required
                helperText="Example of a low relevance fact (0.0-0.3)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Domain Context"
                value={formData.domainContext}
                onChange={(e) => setFormData({ ...formData, domainContext: e.target.value })}
                margin="normal"
                multiline
                rows={2}
                helperText="Additional context about your domain (optional)"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>
                Default Minimum Rating: {formData.defaultMinRating.toFixed(2)}
              </Typography>
              <Slider
                value={formData.defaultMinRating}
                onChange={(e, v) => setFormData({ ...formData, defaultMinRating: v as number })}
                step={0.05}
                marks
                min={0}
                max={1}
                valueLabelDisplay="auto"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {selectedConfig ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={testDialog} onClose={() => setTestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Test Rating Configuration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Enter sample facts to test how they will be rated:
          </Typography>
          {testData.sampleFacts.map((fact, index) => (
            <TextField
              key={index}
              fullWidth
              label={`Sample Fact ${index + 1}`}
              value={fact}
              onChange={(e) => {
                const newFacts = [...testData.sampleFacts];
                newFacts[index] = e.target.value;
                setTestData({ sampleFacts: newFacts });
              }}
              margin="normal"
              multiline
              rows={2}
            />
          ))}
          <Button
            onClick={() => setTestData({ 
              sampleFacts: [...testData.sampleFacts, ''] 
            })}
            sx={{ mt: 1 }}
          >
            Add Another Fact
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialog(false)}>Cancel</Button>
          <Button variant="contained" color="primary">
            Run Test
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FactRatingConfig;