import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/src/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && profile) {
    const isActuallyAdmin = profile.role === 'admin' || profile.role === 'Admin' || user?.email === 'mk.rabbani.cse@gmail.com' || user?.email === 'jakir995627@gmail.com';
    const isAuthorized = allowedRoles.some(role => {
      if (role === 'admin') return isActuallyAdmin;
      return role.toLowerCase() === profile.role.toLowerCase();
    });

    if (!isAuthorized) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
