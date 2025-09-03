import React, { useState, useEffect } from 'react';
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
  Fab,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as CloneIcon,
  PlayArrow as TestIcon,
  Publish as PublishIcon,
  Schema as SchemaIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { airtableService } from '../services/airtableService';

interface Ontology {
  id: string;
  name: string;
  domain: string;
  version: string;
  status: string;
  createdDate: string;
  notes: string;
  entityCount?: number;
  edgeCount?: number;
}

const OntologyManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedOntology, setSelectedOntology] = useState<Ontology | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    domain: 'Healthcare',
    version: '1.0',
    notes: '',
  });

  // Fetch ontologies
  const { data: ontologies = [], isLoading, error } = useQuery(
    'ontologies',
    () => airtableService.getOntologies(),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Create ontology mutation
  const createMutation = useMutation(
    (data: typeof formData) => airtableService.createOntology(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('ontologies');
        handleCloseDialog();
      },
    }
  );

  // Update ontology mutation
  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: any }) =>
      airtableService.updateOntology(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('ontologies');
      },
    }
  );

  // Clone ontology mutation
  const cloneMutation = useMutation(
    (id: string) => airtableService.cloneOntology(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('ontologies');
      },
    }
  );

  const handleOpenDialog = (ontology?: Ontology) => {
    if (ontology) {
      setSelectedOntology(ontology);
      setFormData({
        name: ontology.name,
        domain: ontology.domain,
        version: ontology.version,
        notes: ontology.notes,
      });
    } else {
      setSelectedOntology(null);
      setFormData({
        name: '',
        domain: 'Healthcare',
        version: '1.0',
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedOntology(null);
  };

  const handleSubmit = () => {
    if (selectedOntology) {
      updateMutation.mutate({
        id: selectedOntology.id,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    updateMutation.mutate({
      id,
      data: { status: newStatus },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Published':
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

  if (isLoading) return <Typography>Loading ontologies...</Typography>;
  if (error) return <Alert severity="error">Error loading ontologies</Alert>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Ontology Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Create Ontology
        </Button>
      </Box>

      <Grid container spacing={3}>
        {(ontologies as any[]).map((ontology: any) => (
          <Grid item xs={12} md={6} lg={4} key={ontology.id}>
            <Card sx={{ height: '100%', position: 'relative' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {ontology.name}
                    </Typography>
                    <Chip
                      label={ontology.status}
                      color={getStatusColor(ontology.status) as any}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                  </Box>
                  <SchemaIcon color="primary" />
                </Box>

                <Typography color="textSecondary" gutterBottom>
                  Domain: {ontology.domain}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  Version: {ontology.version}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Created: {new Date(ontology.createdDate).toLocaleDateString()}
                </Typography>

                {ontology.entityCount !== undefined && (
                  <Box mt={2}>
                    <Chip
                      label={`${ontology.entityCount} Entities`}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={`${ontology.edgeCount} Edges`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                )}

                <Box mt={2} display="flex" justifyContent="space-between">
                  <Box>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(ontology)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Clone">
                      <IconButton
                        size="small"
                        onClick={() => cloneMutation.mutate(ontology.id)}
                      >
                        <CloneIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Test">
                      <IconButton size="small">
                        <TestIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {ontology.status === 'Testing' && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<PublishIcon />}
                      onClick={() => handleStatusChange(ontology.id, 'Published')}
                    >
                      Publish
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedOntology ? 'Edit Ontology' : 'Create New Ontology'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            select
            label="Domain"
            value={formData.domain}
            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            margin="normal"
            required
          >
            <MenuItem value="Healthcare">Healthcare</MenuItem>
            <MenuItem value="Finance">Finance</MenuItem>
            <MenuItem value="Technology">Technology</MenuItem>
            <MenuItem value="Legal">Legal</MenuItem>
            <MenuItem value="Education">Education</MenuItem>
            <MenuItem value="Manufacturing">Manufacturing</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Version"
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {selectedOntology ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OntologyManager;