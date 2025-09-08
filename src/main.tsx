import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routes } from './router/routes'
import RootLayout from './components/layout/RootLayout'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary'
import { ActiveGraphProvider } from './components/graphs/context/ActiveGraphContext'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: routes,
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ActiveGraphProvider>
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <RouterProvider router={router} />
          </Suspense>
        </ErrorBoundary>
      </ActiveGraphProvider>
    </QueryClientProvider>
  </StrictMode>,
)