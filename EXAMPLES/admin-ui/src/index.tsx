import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConvexReactClient } from 'convex/react';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

const convex = new ConvexReactClient(
  process.env.REACT_APP_CONVEX_URL as string
);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || ''}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>
);