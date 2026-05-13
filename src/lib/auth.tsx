import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from './firebase';

export type UserRole = 'admin' | 'teacher' | 'parent' | 'student' | 'staff';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  photoURL?: string;
}

interface UserRolePermissions {
  students: 'none' | 'view' | 'full';
  attendance: 'none' | 'view' | 'full';
  fees: 'none' | 'view' | 'full';
  exams: 'none' | 'view' | 'full';
  library: 'none' | 'view' | 'full';
  staff: 'none' | 'view' | 'full';
  payroll: 'none' | 'view' | 'full';
  settings: 'none' | 'view' | 'full';
  routine: 'none' | 'view' | 'full';
}

interface UserRoleDefinition {
  id: string;
  name: string;
  permissions: UserRolePermissions;
}

interface SystemConfig {
  schoolName: string;
  academicYear: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  schoolLogoUrl?: string;
  lastBackup?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  roleDefinition: UserRoleDefinition | null;
  systemConfig: SystemConfig | null;
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isParent: boolean;
  isStudent: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roleDefinition, setRoleDefinition] = useState<UserRoleDefinition | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial static config fallback
    setSystemConfig({
      schoolName: 'EduFlow International School',
      academicYear: '2023-2024'
    });

    const unsubscribeConfig = onSnapshot(doc(db, 'config', 'system'), (snapshot) => {
      if (snapshot.exists()) {
        setSystemConfig(snapshot.data() as SystemConfig);
      }
    }, (error) => {
      console.error("Config listener error:", error);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setRoleDefinition(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeConfig();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        setProfile(userData);

        // Fetch role definition if exists
        const roleName = userData.role;
        const roleBasics = ['admin', 'student', 'parent'];
        if (roleName && !roleBasics.includes(roleName.toLowerCase())) {
          // 1. Try slugified ID first (new strategy)
          const roleId = roleName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          
          getDoc(doc(db, 'roles', roleId)).then(roleDoc => {
            if (roleDoc.exists()) {
              setRoleDefinition({ id: roleDoc.id, ...roleDoc.data() } as UserRoleDefinition);
              setLoading(false);
            } else {
              // 2. Fallback to name query (old strategy)
              const roleQ = query(collection(db, 'roles'), where('name', '==', roleName), limit(1));
              getDocs(roleQ).then(snap => {
                if (!snap.empty) {
                  setRoleDefinition({ id: snap.docs[0].id, ...snap.docs[0].data() } as UserRoleDefinition);
                } else {
                  setRoleDefinition(null);
                }
                setLoading(false);
              }).catch(() => {
                setLoading(false);
              });
            }
          }).catch(() => {
            setLoading(false);
          });
        } else {
          setRoleDefinition(null);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setRoleDefinition(null);
        setLoading(false);
      }
    }, (error) => {
      console.error("Error fetching user profile:", error);
      setLoading(false);
    });

    return () => unsubscribeProfile();
  }, [user]);

  const value = {
    user,
    profile,
    roleDefinition,
    systemConfig,
    loading,
    isAdmin: profile?.role?.toLowerCase() === 'admin' || user?.email === 'mk.rabbani.cse@gmail.com' || user?.email === 'jakir995627@gmail.com' || user?.email === 'akondsourov786@gmail.com',
    isTeacher: profile?.role?.toLowerCase() === 'teacher',
    isParent: profile?.role?.toLowerCase() === 'parent',
    isStudent: profile?.role?.toLowerCase() === 'student',
    isStaff: profile?.role ? !['student', 'parent', 'admin'].includes(profile.role.toLowerCase()) : false,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
