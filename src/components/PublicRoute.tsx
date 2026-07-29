import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading, isConfigured } = useAuth();

  if (!isConfigured) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-radial-gradient flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
          <p className="mt-4 text-neutral-400 font-medium animate-pulse">Checking credentials...</p>
        </div>
      </div>
    );
  }

  // If already authenticated, redirect to Home page
  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
