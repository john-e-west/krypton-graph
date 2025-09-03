import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignIn, SignUp, useUser } from '@clerk/clerk-react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from 'react-query';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import OntologyManager from './pages/OntologyManager';
import OntologyEditor from './pages/OntologyEditor';
import EntityEditor from './pages/EntityEditor';
import TestRunner from './pages/TestRunner';
import UserAssignments from './pages/UserAssignments';
import ImportMonitor from './pages/ImportMonitor';
import NotFound from './pages/NotFound';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const { isSignedIn, isLoaded } = useUser();
  
  if (!isLoaded) {
    return <div>Loading...</div>;
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Layout>
          <Routes>
            <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
            <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/ontologies" element={<OntologyManager />} />
              <Route path="/ontologies/:id/edit" element={<OntologyEditor />} />
              <Route path="/ontologies/:id" element={<EntityEditor />} />
              <Route path="/test-runner" element={<TestRunner />} />
              <Route path="/assignments" element={<UserAssignments />} />
              <Route path="/imports" element={<ImportMonitor />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;