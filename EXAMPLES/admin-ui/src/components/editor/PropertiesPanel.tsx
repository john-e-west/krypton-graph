import React, { useState } from 'react';
import { Node, Edge } from 'reactflow';
import {
  Drawer,
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  IconButton,
  Divider,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Alert,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Close,
  Edit,
  Delete,
  Save,
  Cancel,
  Visibility,
  VisibilityOff,
  Link,
  AccountBox,
  Business,
  Category,
  Hub,
  Storage,
  Event,
  Assignment,
  LocationOn,
} from '@mui/icons-material';

import PropertySchemaBuilder from './PropertySchemaBuilder';

interface PropertiesPanelProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  onEdgeUpdate: (edgeId: string, updates: any) => void;
  onDelete: (type: 'node' | 'edge', id: string) => void;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
  </div>
);

const getEntityIcon = (type: string) => {
  const iconMap: Record<string, React.ElementType> = {
    Person: AccountBox,
    Organization: Business,
    Concept: Hub,
    Resource: Storage,
    Event: Event,
    Document: Assignment,
    Location: LocationOn,
    Category: Category,
  };
  return iconMap[type] || Category;
};

const cardinalityOptions = [
  { value: 'one-to-one', label: 'One to One (1:1)' },
  { value: 'one-to-many', label: 'One to Many (1:N)' },
  { value: 'many-to-one', label: 'Many to One (N:1)' },
  { value: 'many-to-many', label: 'Many to Many (N:N)' },
];

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedNode,
  selectedEdge,
  onNodeUpdate,
  onEdgeUpdate,
  onDelete,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<any>({});

  const currentItem = selectedNode || selectedEdge;
  
  React.useEffect(() => {
    if (currentItem) {
      setEditingData({
        ...currentItem.data,
        id: currentItem.id,
      });
      setIsEditing(false);
    }
  }, [currentItem]);

  const handleSave = () => {
    if (selectedNode) {
      onNodeUpdate(selectedNode.id, editingData);
    } else if (selectedEdge) {
      onEdgeUpdate(selectedEdge.id, editingData);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingData({
      ...currentItem?.data,
      id: currentItem?.id,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (selectedNode) {
      onDelete('node', selectedNode.id);
    } else if (selectedEdge) {
      onDelete('edge', selectedEdge.id);
    }
  };

  const handlePropertiesChange = (properties: any[]) => {
    setEditingData({
      ...editingData,
      properties: properties.reduce((acc, prop) => {
        acc[prop.name] = prop;
        return acc;
      }, {}),
    });
  };

  if (!currentItem) {
    return (
      <Drawer
        anchor="right"
        open={true}
        variant="persistent"
        sx={{
          width: 360,
          '& .MuiDrawer-paper': {
            width: 360,
            top: 64,
            height: 'calc(100vh - 64px)',
          },
        }}
      >
        <Box sx={{ p: 2, textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="textSecondary">
            No Selection
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Click on an entity or relationship to edit its properties
          </Typography>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{ mt: 2 }}
          >
            Close Panel
          </Button>
        </Box>
      </Drawer>
    );
  }

  const IconComponent = selectedNode ? getEntityIcon(currentItem.data.type) : Link;

  return (
    <Drawer
      anchor="right"
      open={true}
      variant="persistent"
      sx={{
        width: 360,
        '& .MuiDrawer-paper': {
          width: 360,
          top: 64,
          height: 'calc(100vh - 64px)',
          overflow: 'auto',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <IconComponent color="primary" />
            <Typography variant="h6">
              {selectedNode ? 'Entity' : 'Relationship'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
        
        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
          {currentItem.data.label}
        </Typography>

        {/* Action Buttons */}
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          {isEditing ? (
            <>
              <Button
                size="small"
                variant="contained"
                startIcon={<Save />}
                onClick={handleSave}
              >
                Save
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Cancel />}
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </>
          )}
        </Stack>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab label="Basic" />
          <Tab label="Properties" />
          {selectedEdge && <Tab label="Relationship" />}
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flexGrow: 1 }}>
        {/* Basic Tab */}
        <TabPanel value={activeTab} index={0}>
          <Stack spacing={2} sx={{ p: 2 }}>
            {/* Name/Label */}
            <TextField
              label="Name"
              value={editingData.label || ''}
              onChange={(e) =>
                setEditingData({ ...editingData, label: e.target.value })
              }
              fullWidth
              disabled={!isEditing}
            />

            {/* Type (for nodes) */}
            {selectedNode && (
              <FormControl fullWidth disabled={!isEditing}>
                <InputLabel>Entity Type</InputLabel>
                <Select
                  value={editingData.type || ''}
                  onChange={(e) =>
                    setEditingData({ ...editingData, type: e.target.value })
                  }
                >
                  <MenuItem value="Person">Person</MenuItem>
                  <MenuItem value="Organization">Organization</MenuItem>
                  <MenuItem value="Concept">Concept</MenuItem>
                  <MenuItem value="Resource">Resource</MenuItem>
                  <MenuItem value="Event">Event</MenuItem>
                  <MenuItem value="Document">Document</MenuItem>
                  <MenuItem value="Location">Location</MenuItem>
                  <MenuItem value="Category">Category</MenuItem>
                </Select>
              </FormControl>
            )}

            {/* Description */}
            <TextField
              label="Description"
              value={editingData.description || ''}
              onChange={(e) =>
                setEditingData({ ...editingData, description: e.target.value })
              }
              fullWidth
              multiline
              rows={3}
              disabled={!isEditing}
            />

            {/* Visibility Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={!editingData.isHidden}
                  onChange={(e) =>
                    setEditingData({ ...editingData, isHidden: !e.target.checked })
                  }
                  disabled={!isEditing}
                />
              }
              label="Visible"
            />

            {/* Status Info */}
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="subtitle2" gutterBottom>
                  Status Information
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip 
                    label={selectedNode ? 'Entity' : 'Relationship'} 
                    size="small" 
                    color="primary" 
                  />
                  <Chip 
                    label={editingData.isHidden ? 'Hidden' : 'Visible'} 
                    size="small" 
                    color={editingData.isHidden ? 'warning' : 'success'}
                  />
                  {editingData.validationErrors?.length > 0 && (
                    <Chip 
                      label={`${editingData.validationErrors.length} Errors`} 
                      size="small" 
                      color="error" 
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </TabPanel>

        {/* Properties Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 2 }}>
            {isEditing ? (
              <PropertySchemaBuilder
                properties={
                  Object.values(editingData.properties || {}).map((prop: any) => ({
                    id: prop.id || prop.name,
                    ...prop,
                  }))
                }
                onChange={handlePropertiesChange}
              />
            ) : (
              <PropertySchemaBuilder
                properties={
                  Object.values(editingData.properties || {}).map((prop: any) => ({
                    id: prop.id || prop.name,
                    ...prop,
                  }))
                }
                onChange={() => {}}
                readonly
              />
            )}
          </Box>
        </TabPanel>

        {/* Relationship Tab (edges only) */}
        {selectedEdge && (
          <TabPanel value={activeTab} index={2}>
            <Stack spacing={2} sx={{ p: 2 }}>
              {/* Cardinality */}
              <FormControl fullWidth disabled={!isEditing}>
                <InputLabel>Cardinality</InputLabel>
                <Select
                  value={editingData.cardinality || 'one-to-many'}
                  onChange={(e) =>
                    setEditingData({ ...editingData, cardinality: e.target.value })
                  }
                >
                  {cardinalityOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Bidirectional */}
              <FormControlLabel
                control={
                  <Switch
                    checked={editingData.bidirectional || false}
                    onChange={(e) =>
                      setEditingData({ ...editingData, bidirectional: e.target.checked })
                    }
                    disabled={!isEditing}
                  />
                }
                label="Bidirectional"
              />

              {/* Source and Target Info */}
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Connection Details
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Source: {selectedEdge.source}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Target: {selectedEdge.target}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Type: {editingData.cardinality?.replace('-', ' → ')}
                  </Typography>
                </CardContent>
              </Card>

              {/* Validation */}
              {editingData.validationErrors?.length > 0 && (
                <Alert severity="error">
                  <Typography variant="subtitle2" gutterBottom>
                    Validation Errors:
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {editingData.validationErrors.map((error: string, index: number) => (
                      <li key={index}>
                        <Typography variant="body2">{error}</Typography>
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}
            </Stack>
          </TabPanel>
        )}
      </Box>
    </Drawer>
  );
};

export default PropertiesPanel;