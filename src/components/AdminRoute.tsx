import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile?.is_admin) return <Navigate to="/" replace />;
  return <>{children}</>;
};
