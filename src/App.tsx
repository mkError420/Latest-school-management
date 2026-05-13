/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/src/lib/auth';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { Toaster } from '@/components/ui/sonner';

// Pages
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
import WebsiteManager from '@/src/pages/WebsiteManager';

// Website Pages
import Home from '@/src/pages/website/Home';
import About from '@/src/pages/website/About';
import Contact from '@/src/pages/website/Contact';
import Gallery from '@/src/pages/website/Gallery';
import Results from '@/src/pages/website/Results';
import Administration from '@/src/pages/website/Administration';
import Academic from '@/src/pages/website/Academic';
import WebsiteLayout from '@/src/components/website/WebsiteLayout';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Website Routes */}
          <Route path="/" element={<WebsiteLayout><Home /></WebsiteLayout>} />
          <Route path="/about" element={<WebsiteLayout><About /></WebsiteLayout>} />
          <Route path="/gallery" element={<WebsiteLayout><Gallery /></WebsiteLayout>} />
          <Route path="/website-results" element={<WebsiteLayout><Results /></WebsiteLayout>} />
          <Route path="/contact" element={<WebsiteLayout><Contact /></WebsiteLayout>} />
          <Route path="/administration" element={<WebsiteLayout><Administration /></WebsiteLayout>} />
          <Route path="/academic" element={<WebsiteLayout><Academic /></WebsiteLayout>} />

          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/website-manager" element={
            <ProtectedRoute allowedRoles={['admin', 'staff']}>
              <WebsiteManager />
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
            <ProtectedRoute allowedRoles={['admin', 'teacher', 'staff']}>
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
            <ProtectedRoute allowedRoles={['admin', 'staff']}>
              <Payroll />
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['admin', 'staff']}>
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

