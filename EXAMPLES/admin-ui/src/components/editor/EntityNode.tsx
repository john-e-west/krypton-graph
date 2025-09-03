import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  IconButton, 
  Box,
  Tooltip,
  Badge,
} from '@mui/material';
import { 
  Edit, 
  Delete, 
  AccountBox,
  Business,
  Category,
  Hub,
  Storage,
  Event,
  Assignment,
  LocationOn,
  VisibilityOff,
} from '@mui/icons-material';

// Entity type to icon mapping
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

// Entity type to color mapping
const getEntityColor = (type: string) => {
  const colorMap: Record<string, string> = {
    Person: '#FF6B6B',
    Organization: '#4ECDC4',
    Concept: '#45B7D1',
    Resource: '#96CEB4',
    Event: '#FFEAA7',
    Document: '#DDA0DD',
    Location: '#FFB347',
    Category: '#98D8C8',
  };
  return colorMap[type] || '#98D8C8';
};

interface EntityNodeData {
  label: string;
  type: string;
  properties?: Record<string, any>;
  description?: string;
  isHidden?: boolean;
  validationErrors?: string[];
}

const EntityNode = memo(({ data, selected }: NodeProps<EntityNodeData>) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const IconComponent = getEntityIcon(data.type);
  const entityColor = getEntityColor(data.type);
  const propertyCount = data.properties ? Object.keys(data.properties).length : 0;
  const hasErrors = data.validationErrors && data.validationErrors.length > 0;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Trigger edit mode
    console.log('Edit entity:', data.label);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Trigger delete confirmation
    console.log('Delete entity:', data.label);
  };

  return (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        minWidth: 180,
        maxWidth: 220,
        border: selected ? '2px solid' : '1px solid',
        borderColor: selected ? 'primary.main' : hasErrors ? 'error.main' : 'divider',
        boxShadow: selected ? 4 : isHovered ? 2 : 1,
        transition: 'all 0.2s ease-in-out',
        opacity: data.isHidden ? 0.6 : 1,
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        bgcolor: 'background.paper',
        position: 'relative',
      }}
    >
      {/* Connection Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{
          width: 10,
          height: 10,
          backgroundColor: entityColor,
          border: '2px solid white',
        }}
      />
      
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {/* Entity Icon and Type */}
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <IconComponent 
                sx={{ 
                  color: entityColor, 
                  fontSize: 20,
                  flexShrink: 0,
                }} 
              />
              <Chip 
                label={data.type} 
                size="small" 
                sx={{ 
                  height: 20,
                  fontSize: '0.7rem',
                  bgcolor: entityColor + '20',
                  color: entityColor,
                  border: `1px solid ${entityColor}40`,
                }}
              />
            </Box>
            
            {/* Entity Name */}
            <Tooltip title={data.label} placement="top">
              <Typography 
                variant="subtitle2" 
                fontWeight="bold"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  mb: 0.5,
                }}
              >
                {data.label}
              </Typography>
            </Tooltip>
            
            {/* Description */}
            {data.description && (
              <Tooltip title={data.description} placement="bottom">
                <Typography 
                  variant="caption" 
                  color="textSecondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.2,
                  }}
                >
                  {data.description}
                </Typography>
              </Tooltip>
            )}
          </Box>
          
          {/* Action Buttons - Show on hover */}
          {isHovered && !data.isHidden && (
            <Box display="flex" gap={0.5} ml={1}>
              <Tooltip title="Edit">
                <IconButton 
                  size="small" 
                  onClick={handleEdit}
                  sx={{ 
                    width: 24, 
                    height: 24,
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                  }}
                >
                  <Edit sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton 
                  size="small" 
                  onClick={handleDelete}
                  sx={{ 
                    width: 24, 
                    height: 24,
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
                  }}
                >
                  <Delete sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
        
        {/* Property Count and Status Indicators */}
        <Box mt={1} display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            {propertyCount > 0 && (
              <Badge 
                badgeContent={propertyCount} 
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.6rem',
                    minWidth: 16,
                    height: 16,
                  }
                }}
              >
                <Chip 
                  label="Props" 
                  size="small" 
                  variant="outlined"
                  sx={{ height: 18, fontSize: '0.6rem' }}
                />
              </Badge>
            )}
            
            {hasErrors && (
              <Tooltip title={`${data.validationErrors!.length} validation errors`}>
                <Chip 
                  label="Errors" 
                  size="small" 
                  color="error"
                  sx={{ height: 18, fontSize: '0.6rem' }}
                />
              </Tooltip>
            )}
          </Box>
          
          {data.isHidden && (
            <Tooltip title="Hidden entity">
              <VisibilityOff sx={{ fontSize: 14, color: 'action.disabled' }} />
            </Tooltip>
          )}
        </Box>
      </CardContent>
      
      {/* Bottom Handle */}
      <Handle 
        type="source" 
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
          backgroundColor: entityColor,
          border: '2px solid white',
        }}
      />
      
      {/* Side Handles for more connection options */}
      <Handle 
        type="source" 
        position={Position.Right}
        id="right"
        style={{
          width: 8,
          height: 8,
          backgroundColor: entityColor,
          border: '2px solid white',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      />
      <Handle 
        type="target" 
        position={Position.Left}
        id="left"
        style={{
          width: 8,
          height: 8,
          backgroundColor: entityColor,
          border: '2px solid white',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      />
    </Card>
  );
});

EntityNode.displayName = 'EntityNode';

export default EntityNode;