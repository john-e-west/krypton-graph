import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Box,
  Typography,
  Select,
  MenuItem,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

interface AssignmentsTabProps {
  assignments: any[] | undefined;
  users: any[] | undefined;
  ontologies: any[] | undefined;
  onUpdate: (args: any) => void;
  onRemove: (args: any) => void;
}

export function AssignmentsTab({
  assignments,
  users,
  ontologies,
  onUpdate,
  onRemove,
}: AssignmentsTabProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'error';
      case 'contributor': return 'primary';
      case 'reviewer': return 'success';
      default: return 'default';
    }
  };
  
  const handleRoleChange = async (assignmentId: string, newRole: string) => {
    try {
      await onUpdate({
        assignmentId,
        role: newRole as 'owner' | 'contributor' | 'reviewer',
      });
    } catch (error) {
      console.error('Failed to update assignment:', error);
    }
  };
  
  const handleRemove = async (assignmentId: string) => {
    if (window.confirm('Are you sure you want to remove this assignment?')) {
      try {
        await onRemove({ assignmentId });
      } catch (error) {
        console.error('Failed to remove assignment:', error);
      }
    }
  };
  
  if (!assignments || assignments.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="textSecondary">
          No assignments found. Assign users to ontologies to get started.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>User</TableCell>
          <TableCell>Ontology</TableCell>
          <TableCell>Role</TableCell>
          <TableCell>Assigned By</TableCell>
          <TableCell>Assigned</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {assignments.map((assignment) => {
          const user = users?.find(u => u._id === assignment.userId);
          const ontology = ontologies?.find(o => o._id === assignment.ontologyId);
          const assignedBy = users?.find(u => u._id === assignment.assignedBy);
          
          return (
            <TableRow key={assignment._id}>
              <TableCell>
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {assignment.userName || user?.name || 'Unknown User'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {assignment.userEmail || user?.email || ''}
                  </Typography>
                </Box>
              </TableCell>
              
              <TableCell>
                <Typography variant="body2">
                  {assignment.ontologyName || ontology?.name || 'Unknown Ontology'}
                </Typography>
              </TableCell>
              
              <TableCell>
                <Select
                  value={assignment.role}
                  onChange={(e) => handleRoleChange(assignment._id, e.target.value)}
                  size="small"
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="owner">
                    <Chip label="Owner" size="small" color="error" />
                  </MenuItem>
                  <MenuItem value="contributor">
                    <Chip label="Contributor" size="small" color="primary" />
                  </MenuItem>
                  <MenuItem value="reviewer">
                    <Chip label="Reviewer" size="small" color="success" />
                  </MenuItem>
                </Select>
              </TableCell>
              
              <TableCell>
                <Typography variant="caption">
                  {assignment.assignedByName || assignedBy?.name || 'System'}
                </Typography>
              </TableCell>
              
              <TableCell>
                <Typography variant="caption">
                  {assignment.assignedAt
                    ? formatDistanceToNow(new Date(assignment.assignedAt)) + ' ago'
                    : 'Unknown'}
                </Typography>
              </TableCell>
              
              <TableCell>
                <IconButton
                  size="small"
                  onClick={() => handleRemove(assignment._id)}
                  color="error"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}