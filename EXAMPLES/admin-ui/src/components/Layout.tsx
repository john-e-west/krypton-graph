import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser, UserButton } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Schema as SchemaIcon,
  Psychology as PsychologyIcon,
  Science as ScienceIcon,
  Assignment as AssignmentIcon,
  CloudUpload as CloudUploadIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isSignedIn } = useUser();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Always call useQuery but skip execution when not signed in
  const ontologies = useQuery(
    api.ontologies.list,
    isSignedIn ? {} : ("skip" as any)
  );
  
  const menuItems = isSignedIn ? [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Ontologies', icon: <SchemaIcon />, path: '/ontologies' },
    { text: 'Test Runner', icon: <ScienceIcon />, path: '/test-runner' },
    { text: 'Assignments', icon: <AssignmentIcon />, path: '/assignments' },
    { text: 'Import Monitor', icon: <CloudUploadIcon />, path: '/imports' },
  ] : [];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
          Krypton Graph
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Ontology Management System
          </Typography>
          {ontologies !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              <CheckCircleIcon sx={{ color: 'lightgreen', mr: 1 }} />
              <Typography variant="body2" sx={{ mr: 2 }}>Connected</Typography>
            </Box>
          )}
          {isSignedIn ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">
                {user?.primaryEmailAddress?.emailAddress}
              </Typography>
              <UserButton afterSignOutUrl="/sign-in" />
            </Box>
          ) : (
            <Typography variant="body2">Not signed in</Typography>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;