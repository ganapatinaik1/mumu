import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, isConfigured } = useAuth();

  // If Supabase credentials are missing, allow looking at the pages to see the warning card
  if (!isConfigured) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-radial-gradient flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
          <p className="mt-4 text-neutral-400 font-medium animate-pulse">Synchronizing session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
