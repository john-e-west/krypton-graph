import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Avatar,
  AvatarGroup,
  Chip,
  IconButton,
  Button,
  Dialog,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  PersonAdd,
  Edit,
  Delete,
  Assignment,
  Timeline,
  Group,
  Visibility,
  CheckCircle,
  Search,
} from '@mui/icons-material';
import { UserListTab } from '../components/userAssignments/UserListTab';
import { AssignmentsTab } from '../components/userAssignments/AssignmentsTab';
import { ActivityTab } from '../components/userAssignments/ActivityTab';
import { WorkloadTab } from '../components/userAssignments/WorkloadTab';
import { AssignmentDialog } from '../components/userAssignments/AssignmentDialog';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'inactive';
  lastActive?: number;
  createdAt: number;
}

interface OntologyAssignment {
  _id: string;
  userId: string;
  ontologyId: string;
  role: 'owner' | 'contributor' | 'reviewer';
  assignedAt: number;
  assignedBy: string;
}

const UserAssignments: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignmentDialog, setAssignmentDialog] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Convex queries
  // @ts-ignore - Type instantiation issue with Convex
  const users: any = null; // useQuery(api.users.list);
  // @ts-ignore
  const assignments: any = null; // useQuery(api.assignments.list);
  // @ts-ignore
  const ontologies: any = null; // useQuery(api.ontologies.list);
  // @ts-ignore
  const activities: any = null; // useQuery(api.activities.getRecent, { limit: 50 });
  // @ts-ignore
  const onlineUsers: any = null; // useQuery(api.presence.getOnlineUsers);
  
  // Mutations
  // @ts-ignore - Type instantiation issue
  const createUser = async (args: any) => {}; // useMutation(api.users.create);
  // @ts-ignore
  const updateUser = async (args: any) => {}; // useMutation(api.users.update);
  // @ts-ignore
  const assignUser = async (args: any) => {}; // useMutation(api.assignments.create);
  // @ts-ignore
  const removeAssignment = async (args: any) => {}; // useMutation(api.assignments.remove);
  // @ts-ignore
  const updateAssignment = async (args: any) => {}; // useMutation(api.assignments.update);
  
  // Filter users
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter((user: any) => {
      const matchesSearch = !searchTerm ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, filterRole]);
  
  const handleAssignment = async (user: User, ontologyId: string, role: string) => {
    try {
      await assignUser({
        userId: user._id,
        ontologyId,
        role: role as 'owner' | 'contributor' | 'reviewer',
      });
    } catch (error) {
      console.error('Failed to assign user:', error);
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">User Assignments</Typography>
          
          <Box display="flex" gap={2}>
            <TextField
              size="small"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search />,
              }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                label="Role"
              >
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="editor">Editor</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => {
                setSelectedUser(null);
                setAssignmentDialog(true);
              }}
            >
              Add User
            </Button>
          </Box>
        </Box>
        
        {/* Online Users Indicator */}
        <Box display="flex" alignItems="center" gap={1} mt={2}>
          <Badge badgeContent={onlineUsers?.length || 0} color="success">
            <Group />
          </Badge>
          <Typography variant="body2" color="textSecondary">
            {onlineUsers?.length || 0} users online
          </Typography>
        </Box>
      </Paper>
      
      {/* Main Content */}
      <Paper sx={{ p: 2 }}>
        <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)}>
          <Tab label="Users" icon={<Group />} iconPosition="start" />
          <Tab label="Assignments" icon={<Assignment />} iconPosition="start" />
          <Tab label="Activity" icon={<Timeline />} iconPosition="start" />
          <Tab label="Workload" icon={<Timeline />} iconPosition="start" />
        </Tabs>
        
        <Box sx={{ mt: 2 }}>
          {currentTab === 0 && (
            <UserListTab
              users={filteredUsers}
              assignments={assignments}
              ontologies={ontologies}
              onlineUsers={onlineUsers}
              onEdit={setSelectedUser}
              onAssign={handleAssignment}
            />
          )}
          
          {currentTab === 1 && (
            <AssignmentsTab
              assignments={assignments}
              users={users}
              ontologies={ontologies}
              onUpdate={updateAssignment}
              onRemove={removeAssignment}
            />
          )}
          
          {currentTab === 2 && (
            <ActivityTab
              activities={activities}
              users={users}
            />
          )}
          
          {currentTab === 3 && (
            <WorkloadTab
              users={users}
              assignments={assignments}
              ontologies={ontologies}
            />
          )}
        </Box>
      </Paper>
      
      {/* Assignment Dialog */}
      <AssignmentDialog
        open={assignmentDialog}
        onClose={() => setAssignmentDialog(false)}
        user={selectedUser}
        ontologies={ontologies}
        onAssign={assignUser}
      />
    </Box>
  );
};

export default UserAssignments;