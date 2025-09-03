import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Box,
  Button,
} from '@mui/material';
import {
  DragIndicator,
  AccountBox,
  Business,
  Category,
  Hub,
  Storage,
  Event,
  Assignment,
  LocationOn,
} from '@mui/icons-material';

const entityTypes = [
  { type: 'Person', icon: AccountBox, color: '#FF6B6B', description: 'Individual person entity' },
  { type: 'Organization', icon: Business, color: '#4ECDC4', description: 'Company or institution' },
  { type: 'Concept', icon: Hub, color: '#45B7D1', description: 'Abstract idea or concept' },
  { type: 'Resource', icon: Storage, color: '#96CEB4', description: 'Digital or physical resource' },
  { type: 'Event', icon: Event, color: '#FFEAA7', description: 'Time-based occurrence' },
  { type: 'Document', icon: Assignment, color: '#DDA0DD', description: 'Textual document or record' },
  { type: 'Location', icon: LocationOn, color: '#FFB347', description: 'Physical or virtual place' },
  { type: 'Category', icon: Category, color: '#98D8C8', description: 'Classification or grouping' },
];

const templates = [
  {
    name: 'Healthcare Ontology',
    description: 'Medical entities and relationships',
    entities: ['Patient', 'Doctor', 'Diagnosis', 'Treatment'],
  },
  {
    name: 'Organization Chart',
    description: 'Corporate hierarchy template',
    entities: ['Employee', 'Department', 'Role', 'Project'],
  },
  {
    name: 'Knowledge Base',
    description: 'Information management template',
    entities: ['Article', 'Topic', 'Author', 'Tag'],
  },
  {
    name: 'Supply Chain',
    description: 'Logistics and inventory template',
    entities: ['Supplier', 'Product', 'Warehouse', 'Order'],
  },
];

const EntityPalette: React.FC = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleTemplateSelect = (template: typeof templates[0]) => {
    // TODO: Implement template loading functionality
    console.log('Loading template:', template.name);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 280,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
          top: 64, // Account for app bar height
          height: 'calc(100vh - 64px)',
          overflowY: 'auto',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Entity Types
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Drag entities to the canvas to create new nodes
        </Typography>
      </Box>
      
      <Divider />
      
      <List sx={{ px: 1 }}>
        {entityTypes.map((entity) => {
          const IconComponent = entity.icon;
          return (
            <ListItem
              key={entity.type}
              draggable
              onDragStart={(e) => onDragStart(e, entity.type)}
              sx={{
                cursor: 'grab',
                borderRadius: 1,
                mb: 0.5,
                transition: 'all 0.2s',
                '&:hover': { 
                  bgcolor: 'action.hover',
                  transform: 'translateX(4px)',
                },
                '&:active': { 
                  cursor: 'grabbing',
                  transform: 'scale(0.98)',
                },
              }}
            >
              <ListItemIcon>
                <DragIndicator sx={{ color: 'action.disabled', mr: 1 }} />
              </ListItemIcon>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <IconComponent sx={{ color: entity.color, fontSize: 24 }} />
              </ListItemIcon>
              <ListItemText 
                primary={entity.type}
                secondary={entity.description}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          );
        })}
      </List>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ px: 2 }}>
        <Typography variant="h6" gutterBottom>
          Templates
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Quick start with pre-built ontologies
        </Typography>
      </Box>
      
      <List sx={{ px: 1 }}>
        {templates.map((template) => (
          <ListItem
            key={template.name}
            button
            onClick={() => handleTemplateSelect(template)}
            sx={{
              borderRadius: 1,
              mb: 1,
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': { 
                bgcolor: 'action.hover',
                borderColor: 'primary.main',
              },
            }}
          >
            <ListItemText
              primary={template.name}
              secondary={
                <Box>
                  <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                    {template.description}
                  </Typography>
                  <Typography variant="caption" color="primary">
                    {template.entities.join(', ')}
                  </Typography>
                </Box>
              }
              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
            />
          </ListItem>
        ))}
      </List>

      <Box sx={{ p: 2, mt: 'auto' }}>
        <Button 
          variant="outlined" 
          fullWidth 
          size="small"
          sx={{ mb: 1 }}
        >
          Import Template
        </Button>
        <Button 
          variant="outlined" 
          fullWidth 
          size="small"
        >
          Save as Template
        </Button>
      </Box>
    </Drawer>
  );
};

export default EntityPalette;