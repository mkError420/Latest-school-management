import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/src/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading, isAdmin, isTeacher, isStaff, isStudent, isParent } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center h-screen font-mono text-sidebar-foreground">Loading Security Context...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles) {
    if (!profile) {
      // If we have a user but no profile, they are effectively unauthorized until the profile loads
      // Unless they are one of the hardcoded admins
      if (isAdmin) {
        return <>{children}</>;
      }
      return <Navigate to="/unauthorized" replace />;
    }

    const isAuthorized = allowedRoles.some(role => {
      const lowerRole = role.toLowerCase();
      if (lowerRole === 'admin') return isAdmin;
      if (lowerRole === 'teacher') return isTeacher;
      if (lowerRole === 'staff') return isStaff;
      if (lowerRole === 'student') return isStudent;
      if (lowerRole === 'parent') return isParent;
      return lowerRole === profile.role.toLowerCase();
    });

    if (!isAuthorized) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
