import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Chip,
  FormHelperText,
} from '@mui/material';

interface AssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  user: any | null;
  ontologies: any[] | undefined;
  onAssign: (args: any) => void;
}

export function AssignmentDialog({
  open,
  onClose,
  user,
  ontologies,
  onAssign,
}: AssignmentDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'viewer' as 'admin' | 'editor' | 'viewer',
    ontologyId: '',
    assignmentRole: 'contributor' as 'owner' | 'contributor' | 'reviewer',
  });
  
  const [errors, setErrors] = useState<any>({});
  
  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'viewer',
      }));
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'viewer',
        ontologyId: '',
        assignmentRole: 'contributor',
      });
    }
  }, [user]);
  
  const validateForm = () => {
    const newErrors: any = {};
    
    if (!user && !formData.name) {
      newErrors.name = 'Name is required';
    }
    
    if (!user && !formData.email) {
      newErrors.email = 'Email is required';
    } else if (!user && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    if (formData.ontologyId && !ontologies?.find(o => o._id === formData.ontologyId)) {
      newErrors.ontologyId = 'Please select a valid ontology';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      if (user) {
        // Existing user - just assign to ontology if selected
        if (formData.ontologyId) {
          await onAssign({
            userId: user._id,
            ontologyId: formData.ontologyId,
            role: formData.assignmentRole,
          });
        }
      } else {
        // New user - create user first (would need a createUser mutation)
        // For now, just log
        console.log('Creating new user:', formData);
      }
      
      onClose();
      setFormData({
        name: '',
        email: '',
        role: 'viewer',
        ontologyId: '',
        assignmentRole: 'contributor',
      });
      setErrors({});
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {user ? 'Assign User to Ontology' : 'Add New User'}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {!user && (
            <>
              <TextField
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={!!errors.name}
                helperText={errors.name}
                fullWidth
                required
              />
              
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={!!errors.email}
                helperText={errors.email}
                fullWidth
                required
              />
              
              <FormControl fullWidth>
                <InputLabel>User Role</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  label="User Role"
                >
                  <MenuItem value="admin">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip label="Admin" size="small" color="error" />
                      <Typography variant="caption">Full system access</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="editor">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip label="Editor" size="small" color="primary" />
                      <Typography variant="caption">Can edit ontologies</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="viewer">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip label="Viewer" size="small" />
                      <Typography variant="caption">Read-only access</Typography>
                    </Box>
                  </MenuItem>
                </Select>
                <FormHelperText>Determines system-wide permissions</FormHelperText>
              </FormControl>
            </>
          )}
          
          {user && (
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                User Details
              </Typography>
              <Typography variant="body2">{user.name}</Typography>
              <Typography variant="caption" color="textSecondary">{user.email}</Typography>
              <Box mt={1}>
                <Chip label={user.role} size="small" color={user.role === 'admin' ? 'error' : user.role === 'editor' ? 'primary' : 'default'} />
              </Box>
            </Box>
          )}
          
          <FormControl fullWidth>
            <InputLabel>Ontology</InputLabel>
            <Select
              value={formData.ontologyId}
              onChange={(e) => setFormData({ ...formData, ontologyId: e.target.value })}
              label="Ontology"
              error={!!errors.ontologyId}
            >
              <MenuItem value="">
                <em>None (Create user only)</em>
              </MenuItem>
              {ontologies?.map((ont) => (
                <MenuItem key={ont._id} value={ont._id}>
                  {ont.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {errors.ontologyId || 'Select an ontology to assign the user to'}
            </FormHelperText>
          </FormControl>
          
          {formData.ontologyId && (
            <FormControl fullWidth>
              <InputLabel>Assignment Role</InputLabel>
              <Select
                value={formData.assignmentRole}
                onChange={(e) => setFormData({ ...formData, assignmentRole: e.target.value as any })}
                label="Assignment Role"
              >
                <MenuItem value="owner">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip label="Owner" size="small" color="error" />
                    <Typography variant="caption">Full control of ontology</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="contributor">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip label="Contributor" size="small" color="primary" />
                    <Typography variant="caption">Can edit ontology</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="reviewer">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip label="Reviewer" size="small" color="success" />
                    <Typography variant="caption">Can review changes</Typography>
                  </Box>
                </MenuItem>
              </Select>
              <FormHelperText>Role for this specific ontology</FormHelperText>
            </FormControl>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {user ? 'Assign' : 'Add User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}