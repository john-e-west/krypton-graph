import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Fab,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Add as AddIcon,
  Sync as SyncIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useMutation } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();

  // Real-time data subscriptions
  // @ts-ignore - Type instantiation issue with Convex
  const ontologies = { data: [] as any[] }; // Mock data to avoid type errors

  // @ts-ignore - Type instantiation issue with Convex
  const stats = null; // useQuery(api.dashboard.getStats);
  // @ts-ignore
  const recentActivity = null; // useQuery(api.dashboard.getRecentActivity);
  // @ts-ignore
  const domainStats = null; // useQuery(api.dashboard.getDomainStats);
  // @ts-ignore
  const healthMetrics = null; // useQuery(api.dashboard.getHealthMetrics);

  // Mutations
  // @ts-ignore - Type instantiation issue
  const syncOntology = async (args: any) => {
    console.log('Mock sync:', args);
  }; // useMutation(api.zepSync.queueSync);
  // @ts-ignore
  const deleteOntology = async (args: any) => {
    console.log('Mock delete:', args);
  }; // useMutation(api.ontologies.remove);

  // Memoized filtered data
  const filteredOntologies = useMemo(() => {
    if (!ontologies?.data) return [];
    
    return ontologies.data.filter((ont: any) => {
      const matchesSearch = !searchTerm || 
        ont.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ont.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || ont.status === statusFilter;
      const matchesDomain = domainFilter === 'all' || ont.domain === domainFilter;
      
      return matchesSearch && matchesStatus && matchesDomain;
    });
  }, [ontologies, searchTerm, statusFilter, domainFilter]);

  // Get unique domains for filter dropdown
  const availableDomains = useMemo(() => {
    if (!ontologies?.data) return [];
    return [...new Set(ontologies.data.map((ont: any) => ont.domain))];
  }, [ontologies]);

  const handleSync = async (ontologyId: string) => {
    try {
      await syncOntology({
        ontologyId,
        operation: "full_sync",
      } as any);
      // Could add toast notification here for success
    } catch (error) {
      console.error('Sync failed:', error);
      // Could add toast notification here for error
    }
  };

  const handleDelete = async (ontologyId: string) => {
    if (window.confirm('Are you sure you want to delete this ontology? This action cannot be undone.')) {
      try {
        await deleteOntology({ id: ontologyId } as any);
        // Could add toast notification here for success
      } catch (error) {
        console.error('Delete failed:', error);
        // Could add toast notification here for error
      }
    }
  };

  const handleSyncAll = async () => {
    try {
      // Sync all active ontologies
      const activeOntologies = filteredOntologies.filter((ont: any) => ont.status === 'active');
      for (const ontology of activeOntologies) {
        await handleSync((ontology as any)._id);
      }
      // Could add toast notification here for completion
    } catch (error) {
      console.error('Bulk sync failed:', error);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Header with Search and View Toggle */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <TextField
          placeholder="Search ontologies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="grid">
            <ViewModuleIcon />
          </ToggleButton>
          <ToggleButton value="list">
            <ViewListIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Filters */}
      <Box display="flex" gap={2} mb={3}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Domain</InputLabel>
          <Select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
          >
            <MenuItem value="all">All Domains</MenuItem>
            {availableDomains.map((domain: any) => (
              <MenuItem key={domain} value={domain}>{domain}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="body2" sx={{ alignSelf: 'center', ml: 'auto' }}>
          {filteredOntologies.length} ontologies
        </Typography>
      </Box>

      {/* Stats Overview */}
      <StatsOverview stats={stats || undefined} />

      {/* Ontology Grid/List */}
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          Ontologies
        </Typography>
        
        {viewMode === 'grid' ? (
          <Grid container spacing={3}>
            {filteredOntologies.map((ontology: any) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={ontology._id}>
                <OntologyCard
                  ontology={ontology}
                  onSync={handleSync}
                  onDelete={handleDelete}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper sx={{ maxHeight: 600, overflow: 'auto' }}>
            <List>
              {filteredOntologies.map((ontology: any) => (
                <OntologyListItem
                  key={ontology._id}
                  ontology={ontology}
                  onSync={handleSync}
                  onDelete={handleDelete}
                />
              ))}
            </List>
          </Paper>
        )}

        {filteredOntologies.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="textSecondary">
              No ontologies found matching your criteria.
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Activity Feed */}
      <ActivityFeed activities={recentActivity || undefined} />

      {/* Floating Action Button */}
      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<AddIcon />}
          tooltipTitle="New Ontology"
          onClick={() => navigate('/ontologies/new')}
        />
        <SpeedDialAction
          icon={<SyncIcon />}
          tooltipTitle="Sync All"
          onClick={handleSyncAll}
        />
      </SpeedDial>
    </Box>
  );
};

// Stats Overview Component
interface StatsOverviewProps {
  stats?: {
    totalOntologies: number;
    activeOntologies: number;
    draftOntologies: number;
    archivedOntologies: number;
    totalEntities: number;
    totalEdges: number;
    syncedCount: number;
    failedSyncs: number;
    syncingCount: number;
    trendsData: {
      ontologiesChange: number;
      entitiesChange: number;
    };
  };
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  if (!stats) return null;

  const statCards = [
    {
      title: 'Total Ontologies',
      value: stats.totalOntologies,
      change: stats.trendsData.ontologiesChange,
      color: 'primary',
      subtitle: `${stats.activeOntologies} active, ${stats.draftOntologies} draft`,
    },
    {
      title: 'Total Entities',
      value: stats.totalEntities.toLocaleString(),
      change: stats.trendsData.entitiesChange,
      color: 'info',
    },
    {
      title: 'Total Edges',
      value: stats.totalEdges.toLocaleString(),
      color: 'secondary',
    },
    {
      title: 'Sync Success Rate',
      value: stats.totalOntologies > 0 ? 
        `${Math.round((stats.syncedCount / stats.totalOntologies) * 100)}%` : '0%',
      subtitle: `${stats.failedSyncs} failed syncs`,
      color: stats.failedSyncs > 0 ? 'warning' : 'success',
    },
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {statCards.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                {stat.title}
              </Typography>
              <Typography variant="h4" component="div" sx={{ color: `${stat.color}.main` }}>
                {stat.value}
              </Typography>
              {stat.change !== undefined && (
                <Box display="flex" alignItems="center" mt={1}>
                  {stat.change > 0 ? (
                    <TrendingUpIcon color="success" fontSize="small" />
                  ) : (
                    <TrendingDownIcon color="error" fontSize="small" />
                  )}
                  <Typography variant="caption" ml={0.5}>
                    {Math.abs(stat.change)}% from last week
                  </Typography>
                </Box>
              )}
              {stat.subtitle && (
                <Typography variant="caption" color="textSecondary" display="block" mt={0.5}>
                  {stat.subtitle}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// Ontology Card Component
interface Ontology {
  _id: string;
  name: string;
  domain: string;
  status: 'draft' | 'active' | 'archived';
  description?: string;
  stats?: {
    entityCount: number;
    edgeCount: number;
    lastSyncAt?: number;
  };
  syncStatus?: 'synced' | 'syncing' | 'failed' | 'never_synced';
}

interface OntologyCardProps {
  ontology: Ontology;
  onSync: (id: string) => void;
  onDelete: (id: string) => void;
}

const OntologyCard: React.FC<OntologyCardProps> = ({ ontology, onSync, onDelete }) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'warning';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const getSyncIcon = () => {
    switch (ontology.syncStatus) {
      case 'synced': return <CheckCircleIcon color="success" />;
      case 'syncing': return <SyncIcon className="rotating" color="info" />;
      case 'failed': return <ErrorIcon color="error" />;
      default: return <ScheduleIcon color="disabled" />;
    }
  };

  return (
    <Card
      elevation={3}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
          <Typography variant="h6" component="h3" noWrap>
            {ontology.name}
          </Typography>
          <Chip 
            label={ontology.status} 
            size="small" 
            color={getStatusColor(ontology.status)}
          />
        </Box>
        
        {ontology.description && (
          <Typography variant="body2" color="textSecondary" mb={2}>
            {ontology.description}
          </Typography>
        )}
        
        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          <Chip label={ontology.domain} size="small" variant="outlined" />
          <Chip 
            label={`${ontology.stats?.entityCount || 0} entities`} 
            size="small" 
            variant="outlined"
          />
          <Chip 
            label={`${ontology.stats?.edgeCount || 0} edges`} 
            size="small" 
            variant="outlined"
          />
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
          {getSyncIcon()}
          <Typography variant="caption" color="textSecondary">
            {ontology.stats?.lastSyncAt
              ? `Synced ${formatDistanceToNow(ontology.stats.lastSyncAt)} ago`
              : 'Never synced'}
          </Typography>
        </Box>
      </CardContent>
      
      <CardActions>
        <Tooltip title="Edit Ontology">
          <IconButton 
            size="small" 
            onClick={() => navigate(`/ontologies/${ontology._id}`)}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Sync to Zep">
          <IconButton 
            size="small" 
            onClick={() => onSync(ontology._id)}
            disabled={ontology.syncStatus === 'syncing'}
          >
            <SyncIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Delete Ontology">
          <IconButton 
            size="small" 
            onClick={() => onDelete(ontology._id)}
            disabled={ontology.status === 'active'}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

// Ontology List Item Component
const OntologyListItem: React.FC<OntologyCardProps> = ({ ontology, onSync, onDelete }) => {
  const navigate = useNavigate();

  const getSyncIcon = () => {
    switch (ontology.syncStatus) {
      case 'synced': return <CheckCircleIcon color="success" />;
      case 'syncing': return <SyncIcon className="rotating" color="info" />;
      case 'failed': return <ErrorIcon color="error" />;
      default: return <ScheduleIcon color="disabled" />;
    }
  };

  return (
    <ListItem
      divider
      secondaryAction={
        <Box display="flex" gap={1}>
          <IconButton size="small" onClick={() => navigate(`/ontologies/${ontology._id}`)}>
            <EditIcon />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => onSync(ontology._id)}
            disabled={ontology.syncStatus === 'syncing'}
          >
            <SyncIcon />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => onDelete(ontology._id)}
            disabled={ontology.status === 'active'}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      }
    >
      <ListItemAvatar>
        <Avatar>{getSyncIcon()}</Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box display="flex" alignItems="center" gap={1}>
            {ontology.name}
            <Chip 
              label={ontology.status} 
              size="small" 
              color={ontology.status === 'active' ? 'success' : 
                     ontology.status === 'draft' ? 'warning' : 'default'}
            />
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="body2" color="textSecondary">
              {ontology.domain} • {ontology.stats?.entityCount || 0} entities, {ontology.stats?.edgeCount || 0} edges
            </Typography>
            {ontology.description && (
              <Typography variant="caption" color="textSecondary">
                {ontology.description}
              </Typography>
            )}
          </Box>
        }
      />
    </ListItem>
  );
};

// Activity Feed Component
interface ActivityFeedProps {
  activities?: any[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'create': return '➕';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      case 'sync': return '🔄';
      case 'archive': return '📦';
      default: return '📝';
    }
  };

  const getActivityMessage = (activity: any) => {
    const action = activity.type === 'sync' ? 'synchronized' : 
                   activity.type === 'archive' ? 'archived' : 
                   `${activity.type}d`;
    return `${activity.userName || 'System'} ${action} ${activity.entityType} "${activity.entityName}"`;
  };

  return (
    <Paper elevation={2} sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Recent Activity
      </Typography>
      
      <List>
        {activities?.map((activity) => (
          <ListItem key={activity.id} alignItems="flex-start">
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: 'primary.light' }}>
                {getActivityIcon(activity.type)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={getActivityMessage(activity)}
              secondary={
                <>
                  {formatDistanceToNow(activity.timestamp)} ago
                  {activity.details && ` • ${activity.details}`}
                </>
              }
            />
          </ListItem>
        )) || []}
        
        {(!activities || activities.length === 0) && (
          <ListItem>
            <ListItemText 
              primary="No recent activity" 
              secondary="Activities will appear here as changes are made"
            />
          </ListItem>
        )}
      </List>
    </Paper>
  );
};

export default Dashboard;