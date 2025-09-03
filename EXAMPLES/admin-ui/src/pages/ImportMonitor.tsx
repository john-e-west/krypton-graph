import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const ImportMonitor: React.FC = () => {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Import Monitor
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Import documents and monitor extraction progress
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          color="primary"
        >
          New Import
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Imports
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="No imports yet"
              secondary="Upload your first document to begin extraction"
            />
          </ListItem>
        </List>
      </Paper>
    </Box>
  );
};

export default ImportMonitor;