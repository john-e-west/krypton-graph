import React, { useState } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Button,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Typography,
  Tooltip,
  Divider,
  Stack,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import { 
  Add, 
  Delete, 
  ExpandMore, 
  DragHandle,
  Code,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

interface PropertyConstraint {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
  format?: string;
}

interface Property {
  id: string;
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: any;
  constraints?: PropertyConstraint;
  examples?: string[];
  isHidden?: boolean;
}

interface PropertySchemaBuilderProps {
  properties: Property[];
  onChange: (properties: Property[]) => void;
  readonly?: boolean;
}

const propertyTypes = [
  { value: 'string', label: 'Text (String)', icon: '📝' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'integer', label: 'Integer', icon: '#️⃣' },
  { value: 'boolean', label: 'True/False (Boolean)', icon: '✅' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'datetime', label: 'Date & Time', icon: '🕐' },
  { value: 'email', label: 'Email Address', icon: '📧' },
  { value: 'url', label: 'URL/Link', icon: '🔗' },
  { value: 'array', label: 'List (Array)', icon: '📋' },
  { value: 'object', label: 'Object/Structure', icon: '🏗️' },
  { value: 'enum', label: 'Choice (Enum)', icon: '🎯' },
];

const PropertySchemaBuilder: React.FC<PropertySchemaBuilderProps> = ({ 
  properties, 
  onChange, 
  readonly = false 
}) => {
  const [expanded, setExpanded] = useState<string | false>(false);
  const [showValidation, setShowValidation] = useState(false);

  const generateId = () => `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleAddProperty = () => {
    const newProperty: Property = {
      id: generateId(),
      name: `property_${properties.length + 1}`,
      type: 'string',
      required: false,
      description: '',
    };
    
    onChange([...properties, newProperty]);
    setExpanded(newProperty.id);
  };

  const handleUpdateProperty = (id: string, updates: Partial<Property>) => {
    const updated = properties.map(prop =>
      prop.id === id ? { ...prop, ...updates } : prop
    );
    onChange(updated);
  };

  const handleDeleteProperty = (id: string) => {
    onChange(properties.filter(prop => prop.id !== id));
    if (expanded === id) {
      setExpanded(false);
    }
  };

  const handleAccordionChange = (panel: string) => (
    event: React.SyntheticEvent, 
    isExpanded: boolean
  ) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleConstraintChange = (id: string, constraintKey: string, value: any) => {
    const property = properties.find(p => p.id === id);
    if (!property) return;

    const newConstraints = {
      ...property.constraints,
      [constraintKey]: value,
    };

    handleUpdateProperty(id, { constraints: newConstraints });
  };

  const handleEnumChange = (id: string, enumValues: string) => {
    const values = enumValues.split(',').map(v => v.trim()).filter(v => v);
    handleConstraintChange(id, 'enum', values);
  };

  const validateProperty = (property: Property): string[] => {
    const errors: string[] = [];
    
    if (!property.name?.trim()) {
      errors.push('Property name is required');
    }
    
    if (property.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(property.name)) {
      errors.push('Property name must start with letter or underscore, contain only letters, numbers, and underscores');
    }
    
    if (property.type === 'enum' && (!property.constraints?.enum || property.constraints.enum.length === 0)) {
      errors.push('Enum type requires at least one choice');
    }

    return errors;
  };

  const renderConstraints = (property: Property) => {
    switch (property.type) {
      case 'string':
        return (
          <Stack spacing={2}>
            <Box display="flex" gap={2}>
              <TextField
                label="Min Length"
                type="number"
                size="small"
                value={property.constraints?.minLength || ''}
                onChange={(e) => 
                  handleConstraintChange(property.id, 'minLength', parseInt(e.target.value) || undefined)
                }
              />
              <TextField
                label="Max Length"
                type="number"
                size="small"
                value={property.constraints?.maxLength || ''}
                onChange={(e) => 
                  handleConstraintChange(property.id, 'maxLength', parseInt(e.target.value) || undefined)
                }
              />
            </Box>
            <TextField
              label="Pattern (Regex)"
              value={property.constraints?.pattern || ''}
              onChange={(e) => handleConstraintChange(property.id, 'pattern', e.target.value)}
              fullWidth
              size="small"
              placeholder="e.g., ^[A-Z][a-z]+$"
              helperText="Regular expression to validate input format"
            />
          </Stack>
        );
      
      case 'number':
      case 'integer':
        return (
          <Box display="flex" gap={2}>
            <TextField
              label="Min Value"
              type="number"
              size="small"
              value={property.constraints?.min || ''}
              onChange={(e) => 
                handleConstraintChange(property.id, 'min', parseFloat(e.target.value) || undefined)
              }
            />
            <TextField
              label="Max Value"
              type="number"
              size="small"
              value={property.constraints?.max || ''}
              onChange={(e) => 
                handleConstraintChange(property.id, 'max', parseFloat(e.target.value) || undefined)
              }
            />
          </Box>
        );
      
      case 'enum':
        return (
          <TextField
            label="Choices (comma-separated)"
            value={property.constraints?.enum?.join(', ') || ''}
            onChange={(e) => handleEnumChange(property.id, e.target.value)}
            fullWidth
            size="small"
            placeholder="Option 1, Option 2, Option 3"
            helperText="Comma-separated list of allowed values"
            multiline
            rows={2}
          />
        );
      
      default:
        return null;
    }
  };

  if (properties.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="textSecondary" gutterBottom>
            No properties defined
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Add properties to define the structure of this entity
          </Typography>
          {!readonly && (
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={handleAddProperty}
            >
              Add First Property
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Properties ({properties.length})
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Toggle validation display">
            <IconButton
              size="small"
              onClick={() => setShowValidation(!showValidation)}
              color={showValidation ? 'primary' : 'default'}
            >
              <Code />
            </IconButton>
          </Tooltip>
          {!readonly && (
            <Button
              startIcon={<Add />}
              onClick={handleAddProperty}
              variant="outlined"
              size="small"
            >
              Add Property
            </Button>
          )}
        </Stack>
      </Box>

      {properties.map((property) => {
        const errors = showValidation ? validateProperty(property) : [];
        const hasErrors = errors.length > 0;
        const typeInfo = propertyTypes.find(t => t.value === property.type);
        
        return (
          <Accordion
            key={property.id}
            expanded={expanded === property.id}
            onChange={handleAccordionChange(property.id)}
            sx={{ 
              mb: 1,
              border: hasErrors ? '1px solid' : 'none',
              borderColor: 'error.main',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={1} width="100%">
                <DragHandle sx={{ color: 'action.disabled', cursor: 'grab' }} />
                
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip 
                    label={`${typeInfo?.icon} ${typeInfo?.label || property.type}`} 
                    size="small" 
                    color="primary"
                    variant="outlined"
                  />
                  <Typography fontWeight="medium">
                    {property.name}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={0.5} ml="auto" mr={2}>
                  {property.required && (
                    <Chip label="Required" size="small" color="error" />
                  )}
                  {property.isHidden && (
                    <Tooltip title="Hidden property">
                      <VisibilityOff sx={{ fontSize: 16, color: 'action.disabled' }} />
                    </Tooltip>
                  )}
                  {hasErrors && (
                    <Chip label={`${errors.length} errors`} size="small" color="error" />
                  )}
                </Stack>

                {!readonly && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProperty(property.id);
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </AccordionSummary>
            
            <AccordionDetails>
              {hasErrors && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              
              <Stack spacing={2}>
                {/* Basic Info */}
                <Box display="flex" gap={2}>
                  <TextField
                    label="Property Name"
                    value={property.name}
                    onChange={(e) => handleUpdateProperty(property.id, { name: e.target.value })}
                    size="small"
                    sx={{ flex: 1 }}
                    error={hasErrors && !property.name?.trim()}
                    disabled={readonly}
                  />
                  
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={property.type}
                      onChange={(e) => handleUpdateProperty(property.id, { type: e.target.value })}
                      disabled={readonly}
                    >
                      {propertyTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Description */}
                <TextField
                  label="Description"
                  value={property.description || ''}
                  onChange={(e) => handleUpdateProperty(property.id, { description: e.target.value })}
                  multiline
                  rows={2}
                  size="small"
                  placeholder="Describe what this property represents..."
                  disabled={readonly}
                />

                {/* Flags */}
                <Box display="flex" gap={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={property.required}
                        onChange={(e) => handleUpdateProperty(property.id, { required: e.target.checked })}
                        disabled={readonly}
                      />
                    }
                    label="Required"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={property.isHidden || false}
                        onChange={(e) => handleUpdateProperty(property.id, { isHidden: e.target.checked })}
                        disabled={readonly}
                      />
                    }
                    label="Hidden"
                  />
                </Box>

                {/* Constraints */}
                {renderConstraints(property) && (
                  <>
                    <Divider />
                    <Typography variant="subtitle2" color="textSecondary">
                      Validation Rules
                    </Typography>
                    {renderConstraints(property)}
                  </>
                )}

                {/* Default Value */}
                <TextField
                  label="Default Value"
                  value={property.defaultValue || ''}
                  onChange={(e) => handleUpdateProperty(property.id, { defaultValue: e.target.value })}
                  size="small"
                  placeholder="Optional default value"
                  disabled={readonly}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export default PropertySchemaBuilder;