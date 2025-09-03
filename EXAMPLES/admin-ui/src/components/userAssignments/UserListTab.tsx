import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  IconButton,
  Box,
  Typography,
  Tooltip,
  Badge,
} from '@mui/material';
import { Edit, Delete, Assignment, Circle } from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

interface UserListTabProps {
  users: any[];
  assignments: any[] | undefined;
  ontologies: any[] | undefined;
  onlineUsers: any[] | undefined;
  onEdit: (user: any) => void;
  onAssign: (user: any, ontologyId: string, role: string) => void;
}

export function UserListTab({
  users,
  assignments,
  ontologies,
  onlineUsers,
  onEdit,
  onAssign,
}: UserListTabProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'editor': return 'primary';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };
  
  const getUserOntologies = (userId: string) => {
    const userAssignments = assignments?.filter(a => a.userId === userId) || [];
    return userAssignments.map(a => {
      const ont = ontologies?.find(o => o._id === a.ontologyId);
      return { ...ont, role: a.role };
    }).filter(Boolean);
  };
  
  const isOnline = (userId: string) => {
    return onlineUsers?.some(u => u.id === userId);
  };
  
  if (!users || users.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="textSecondary">
          No users found. Add your first user to get started.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>User</TableCell>
          <TableCell>Role</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Assigned Ontologies</TableCell>
          <TableCell>Last Active</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user._id}>
            <TableCell>
              <Box display="flex" alignItems="center" gap={2}>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    isOnline(user._id) ? (
                      <Circle sx={{ color: '#44b700', fontSize: 12 }} />
                    ) : null
                  }
                >
                  <Avatar src={user.avatar}>
                    {user.name?.charAt(0).toUpperCase()}
                  </Avatar>
                </Badge>
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {user.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {user.email}
                  </Typography>
                </Box>
              </Box>
            </TableCell>
            
            <TableCell>
              <Chip
                label={user.role}
                size="small"
                color={getRoleColor(user.role) as any}
              />
            </TableCell>
            
            <TableCell>
              <Chip
                label={user.status}
                size="small"
                color={user.status === 'active' ? 'success' : 'default'}
                variant={user.status === 'active' ? 'filled' : 'outlined'}
              />
            </TableCell>
            
            <TableCell>
              <Box display="flex" gap={0.5}>
                {getUserOntologies(user._id).slice(0, 3).map((ont, idx) => (
                  <Tooltip key={idx} title={`${ont?.name} (${ont?.role})`}>
                    <Chip
                      label={ont?.name?.substring(0, 10)}
                      size="small"
                      variant="outlined"
                    />
                  </Tooltip>
                ))}
                {getUserOntologies(user._id).length > 3 && (
                  <Chip
                    label={`+${getUserOntologies(user._id).length - 3}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </TableCell>
            
            <TableCell>
              <Typography variant="caption">
                {user.lastActive
                  ? formatDistanceToNow(new Date(user.lastActive)) + ' ago'
                  : 'Never'}
              </Typography>
            </TableCell>
            
            <TableCell>
              <IconButton size="small" onClick={() => onEdit(user)}>
                <Edit fontSize="small" />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => {
                  // TODO: Implement assignment dialog
                  console.log('Assign user:', user);
                }}
              >
                <Assignment fontSize="small" />
              </IconButton>
              <IconButton size="small" disabled={user.role === 'admin'}>
                <Delete fontSize="small" />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}