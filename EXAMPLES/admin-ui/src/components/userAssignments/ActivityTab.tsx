import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Paper,
} from '@mui/material';
import {
  Assignment,
  Edit,
  Delete,
  PersonAdd,
  Update,
  Check,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

interface ActivityTabProps {
  activities: any[] | undefined;
  users: any[] | undefined;
}

export function ActivityTab({ activities, users }: ActivityTabProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'assignment_created': return <Assignment />;
      case 'assignment_updated': return <Edit />;
      case 'assignment_removed': return <Delete />;
      case 'user_created': return <PersonAdd />;
      case 'user_updated': return <Update />;
      case 'ontology_assigned': return <Check />;
      default: return <Update />;
    }
  };
  
  const getActivityColor = (type: string) => {
    if (type.includes('created')) return 'success';
    if (type.includes('updated')) return 'primary';
    if (type.includes('removed') || type.includes('deleted')) return 'error';
    return 'default';
  };
  
  const getUser = (userId: string) => {
    return users?.find(u => u._id === userId);
  };
  
  if (!activities || activities.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="textSecondary">
          No activity yet. Activities will appear here as users interact with the system.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          Recent Activity Summary
        </Typography>
        <Box display="flex" gap={2}>
          <Chip
            label={`${activities.filter(a => a.type?.includes('created')).length} Created`}
            size="small"
            color="success"
            variant="outlined"
          />
          <Chip
            label={`${activities.filter(a => a.type?.includes('updated')).length} Updated`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${activities.filter(a => a.type?.includes('removed')).length} Removed`}
            size="small"
            color="error"
            variant="outlined"
          />
        </Box>
      </Paper>
      
      <List>
        {activities.map((activity, index) => {
          const user = getUser(activity.userId);
          
          return (
            <ListItem
              key={activity._id || index}
              alignItems="flex-start"
              divider={index < activities.length - 1}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: `${getActivityColor(activity.type)}.main` }}>
                  {getActivityIcon(activity.type)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" fontWeight="medium">
                      {user?.name || 'Unknown User'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {activity.details}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                    <Chip
                      label={activity.type?.replace(/_/g, ' ')}
                      size="small"
                      color={getActivityColor(activity.type) as any}
                      variant="outlined"
                    />
                    <Typography variant="caption" color="textSecondary">
                      {activity.timestamp
                        ? formatDistanceToNow(new Date(activity.timestamp)) + ' ago'
                        : 'Unknown time'}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}