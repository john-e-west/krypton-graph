import { lazy } from 'react'
import { RouteObject } from 'react-router-dom'

// Lazy load route components
const Dashboard = lazy(() => import('../pages/Dashboard'))
const Documents = lazy(() => import('../pages/Documents'))
const Search = lazy(() => import('../pages/Search'))
const Ontologies = lazy(() => import('../pages/Ontologies'))
const Graphs = lazy(() => import('../pages/Graphs'))
const Settings = lazy(() => import('../pages/Settings'))
const NotFound = lazy(() => import('../pages/NotFound'))
const TestEntityEditor = lazy(() => import('../pages/TestEntityEditor'))
const TestEdgeEditor = lazy(() => import('../pages/TestEdgeEditor'))
const TestDataCreation = lazy(() => import('../pages/TestDataCreation'))
const TestCodeGeneration = lazy(() => import('../pages/TestCodeGeneration'))
const DocumentChunking = lazy(() => import('../pages/DocumentChunking'))
const ProcessingDashboard = lazy(() => import('../pages/ProcessingDashboardPage'))

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Dashboard />,
  },
  {
    path: '/documents',
    element: <Documents />,
  },
  {
    path: '/search',
    element: <Search />,
  },
  {
    path: '/document-chunking',
    element: <DocumentChunking />,
  },
  {
    path: '/processing',
    element: <ProcessingDashboard />,
  },
  {
    path: '/ontologies',
    element: <Ontologies />,
  },
  {
    path: '/test-entity-editor',
    element: <TestEntityEditor />,
  },
  {
    path: '/test-edge-editor',
    element: <TestEdgeEditor />,
  },
  {
    path: '/test-data-creation',
    element: <TestDataCreation />,
  },
  {
    path: '/graphs',
    element: <Graphs />,
  },
  {
    path: '/settings',
    element: <Settings />,
  },
  {
    path: '/test-code-generation',
    element: <TestCodeGeneration />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]