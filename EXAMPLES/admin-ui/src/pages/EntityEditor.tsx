import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useParams } from 'react-router-dom';

const EntityEditor: React.FC = () => {
  const { id } = useParams();
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Entity Editor
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Define entities and edges for ontology
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          color="primary"
        >
          Add Entity
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Entities
              </Typography>
              <Typography variant="body2" color="textSecondary">
                No entities defined yet. Click "Add Entity" to create your first entity.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Edges
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Define relationships between entities after creating them.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EntityEditor;