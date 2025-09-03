import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

export default function ProtectedRoute() {
  const { isSignedIn, isLoaded } = useUser();
  
  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <Navigate to="/sign-in" />;
  
  return <Outlet />;
}