import React from 'react';
import { Box, Grid, Paper, Typography, LinearProgress, Avatar, Chip } from '@mui/material';

interface WorkloadTabProps {
  users: any[] | undefined;
  assignments: any[] | undefined;
  ontologies: any[] | undefined;
}

export function WorkloadTab({ users, assignments, ontologies }: WorkloadTabProps) {
  // Calculate workload metrics
  const workloadData = users?.map(user => {
    const userAssignments = assignments?.filter(a => a.userId === user._id) || [];
    const ownedCount = userAssignments.filter(a => a.role === 'owner').length;
    const contributorCount = userAssignments.filter(a => a.role === 'contributor').length;
    const reviewerCount = userAssignments.filter(a => a.role === 'reviewer').length;
    
    // Calculate workload score (weighted)
    const workloadScore = ownedCount * 3 + contributorCount * 2 + reviewerCount * 1;
    
    return {
      user,
      owned: ownedCount,
      contributor: contributorCount,
      reviewer: reviewerCount,
      total: userAssignments.length,
      score: workloadScore,
    };
  }) || [];
  
  // Sort by workload
  workloadData.sort((a, b) => b.score - a.score);
  
  // Capacity calculation
  const maxCapacity = 10; // Max ontologies per user
  
  if (!users || users.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="textSecondary">
          No users available to show workload.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      {/* Summary Stats */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4">{users?.length || 0}</Typography>
            <Typography variant="body2" color="textSecondary">
              Total Users
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4">{assignments?.length || 0}</Typography>
            <Typography variant="body2" color="textSecondary">
              Total Assignments
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4">
              {((assignments?.length || 0) / (users?.length || 1)).toFixed(1)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Avg per User
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">
              {workloadData.filter(w => w.score > maxCapacity).length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Overloaded Users
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Individual Workload */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Individual Workload
        </Typography>
        <Box>
          {workloadData.map((data) => (
            <Box key={data.user._id} sx={{ mb: 3 }}>
              <Box display="flex" alignItems="center" gap={2} mb={1}>
                <Avatar src={data.user.avatar}>
                  {data.user.name?.charAt(0)}
                </Avatar>
                <Box flexGrow={1}>
                  <Typography variant="body2" fontWeight="medium">
                    {data.user.name}
                  </Typography>
                  <Box display="flex" gap={1} mt={0.5}>
                    {data.owned > 0 && (
                      <Chip
                        label={`${data.owned} owned`}
                        size="small"
                        color="error"
                      />
                    )}
                    {data.contributor > 0 && (
                      <Chip
                        label={`${data.contributor} contributing`}
                        size="small"
                        color="primary"
                      />
                    )}
                    {data.reviewer > 0 && (
                      <Chip
                        label={`${data.reviewer} reviewing`}
                        size="small"
                        color="success"
                      />
                    )}
                    {data.total === 0 && (
                      <Chip
                        label="No assignments"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
                <Typography
                  variant="body2"
                  color={data.score > maxCapacity ? 'error' : 'textSecondary'}
                >
                  {Math.round((data.score / maxCapacity) * 100)}% capacity
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min((data.score / maxCapacity) * 100, 100)}
                color={data.score > maxCapacity ? 'error' : 'primary'}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </Box>
          ))}
        </Box>
        
        {/* Workload Legend */}
        <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="subtitle2" gutterBottom>
            Workload Calculation
          </Typography>
          <Typography variant="caption" color="textSecondary" component="div">
            • Owner = 3 points | Contributor = 2 points | Reviewer = 1 point
          </Typography>
          <Typography variant="caption" color="textSecondary" component="div">
            • Maximum capacity = {maxCapacity} points per user
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}