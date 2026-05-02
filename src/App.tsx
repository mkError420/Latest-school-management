/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/src/lib/auth';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { Toaster } from '@/components/ui/sonner';

// Pages (to be created)
import Login from '@/src/pages/Login';
import Dashboard from '@/src/pages/Dashboard';
import Classes from '@/src/pages/Classes';
import Students from '@/src/pages/Students';
import Attendance from '@/src/pages/Attendance';
import Fees from '@/src/pages/Fees';
import Exams from '@/src/pages/Exams';
import Library from '@/src/pages/Library';
import ClassRoutine from '@/src/pages/ClassRoutine';
import Subjects from '@/src/pages/Subjects';
import Payroll from '@/src/pages/Payroll';
import Settings from '@/src/pages/Settings';
import Unauthorized from '@/src/pages/Unauthorized';

function DashboardRedirect() {
  const { isAdmin, isTeacher, isStaff } = useAuth();
  if (isAdmin || isTeacher || isStaff) return <Dashboard />;
  return <Navigate to="/classes" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          } />
          
          <Route path="/classes" element={
            <ProtectedRoute>
              <Classes />
            </ProtectedRoute>
          } />
          
          <Route path="/students" element={
            <ProtectedRoute>
              <Students />
            </ProtectedRoute>
          } />
          
          <Route path="/attendance" element={
            <ProtectedRoute>
              <Attendance />
            </ProtectedRoute>
          } />
          
          <Route path="/fees" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Fees />
            </ProtectedRoute>
          } />
          
          <Route path="/exams" element={
            <ProtectedRoute>
              <Exams />
            </ProtectedRoute>
          } />
          
          <Route path="/library" element={
            <ProtectedRoute>
              <Library />
            </ProtectedRoute>
          } />
          
          <Route path="/routine" element={
            <ProtectedRoute>
              <ClassRoutine />
            </ProtectedRoute>
          } />
          
          <Route path="/subjects" element={
            <ProtectedRoute>
              <Subjects />
            </ProtectedRoute>
          } />
          
          <Route path="/payroll" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Payroll />
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Settings />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  );
}

