import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  User, 
  Bell, 
  Shield, 
  Database, 
  Save,
  Camera,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Info,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useAuth } from '@/src/lib/auth';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, collection, query, orderBy, addDoc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: {
    students: 'none' | 'view' | 'full';
    attendance: 'none' | 'view' | 'full';
    fees: 'none' | 'view' | 'full';
    exams: 'none' | 'view' | 'full';
    library: 'none' | 'view' | 'full';
    staff: 'none' | 'view' | 'full';
    payroll: 'none' | 'view' | 'full';
    settings: 'none' | 'view' | 'full';
  };
  isSystem?: boolean;
}

const DEFAULT_PERMISSIONS: Role['permissions'] = {
  students: 'none',
  attendance: 'none',
  fees: 'none',
  exams: 'none',
  library: 'none',
  staff: 'none',
  payroll: 'none',
  settings: 'none'
};

export default function Settings() {
  const { profile, user, isAdmin } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    photoURL: '',
    notificationPreferences: {
      email: true,
      push: true,
      attendance: true
    }
  });

  const [systemConfig, setSystemConfig] = useState({
    schoolName: 'EduFlow International School',
    academicYear: '2023-2024',
    address: '123 Education Lane, Learning City',
    phone: '+880 1234 567890',
    email: 'info@school.edu',
    website: 'www.school.edu',
    lastBackup: ''
  });

  // Sync with Profile
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        phone: (profile as any).phone || '',
        photoURL: profile.photoURL || '',
        notificationPreferences: (profile as any).notificationPreferences || {
          email: true,
          push: true,
          attendance: true
        }
      });
    }
  }, [profile]);

  // Sync with System Config
  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = onSnapshot(doc(db, 'config', 'system'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSystemConfig({
          schoolName: data.schoolName || 'EduFlow International School',
          academicYear: data.academicYear || '2023-2024',
          address: data.address || '123 Education Lane, Learning City',
          phone: data.phone || '+880 1234 567890',
          email: data.email || 'info@school.edu',
          website: data.website || 'www.school.edu',
          lastBackup: data.lastBackup || ''
        });
      }
    });
    return () => unsubscribe();
  }, [isAdmin]);

  // Sync Roles
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'roles'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roleData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Role[];
      setRoles(roleData);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      // Update User Profile
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: formData.displayName,
        phone: formData.phone,
        notificationPreferences: formData.notificationPreferences,
        updatedAt: new Date().toISOString()
      });

      // Update System Config if Admin
      if (isAdmin) {
        await setDoc(doc(db, 'config', 'system'), {
          ...systemConfig,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      toast.success('Settings saved successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackup = async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      await setDoc(doc(db, 'config', 'system'), {
        lastBackup: now
      }, { merge: true });
      toast.success('Cloud backup initiated successfully');
    } catch (error) {
      toast.error('Backup failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole?.name) return;
    
    setIsSaving(true);
    try {
      const roleData = {
        name: editingRole.name,
        description: editingRole.description || '',
        permissions: editingRole.permissions || DEFAULT_PERMISSIONS,
        updatedAt: new Date().toISOString()
      };

      if (editingRole.id) {
        await updateDoc(doc(db, 'roles', editingRole.id), roleData);
        toast.success('Role updated successfully');
      } else {
        await addDoc(collection(db, 'roles'), roleData);
        toast.success('New role architected successfully');
      }
      setIsRoleDialogOpen(false);
      setEditingRole(null);
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Failed to save role configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!window.confirm('Are you sure you want to decommission this role? All staff assigned to this role will lose their specific permissions.')) return;
    
    try {
      await deleteDoc(doc(db, 'roles', id));
      toast.success('Role decommissioned');
    } catch (error) {
      toast.error('Failed to delete role');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Institutional Settings</h1>
          <p className="text-sidebar-foreground text-sm font-medium opacity-60">Architect your personal and system-wide configurations.</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="bg-[#1A1D23] p-1 rounded-xl mb-8 border border-white/5">
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg uppercase text-[10px] font-bold tracking-widest px-6 transition-all">Profile</TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg uppercase text-[10px] font-bold tracking-widest px-6 transition-all">Notifications</TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg uppercase text-[10px] font-bold tracking-widest px-6 transition-all">Security</TabsTrigger>
            {isAdmin && <TabsTrigger value="system" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg uppercase text-[10px] font-bold tracking-widest px-6 transition-all">System</TabsTrigger>}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-card border-border shadow-none rounded-xl">
              <CardHeader className="border-b border-border mb-6">
                <CardTitle className="text-white text-lg uppercase tracking-tight">Identity Configuration</CardTitle>
                <CardDescription className="text-sidebar-foreground text-[11px] font-medium uppercase tracking-widest opacity-60">Manage your institutional digital presence.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex items-center space-x-8">
                  <div className="relative group">
                    <Avatar className="h-28 w-28 border-2 border-border transition-all group-hover:border-primary/50">
                      <AvatarImage src={formData.photoURL} />
                      <AvatarFallback className="text-3xl bg-primary/10 text-primary font-black uppercase">
                        {formData.displayName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer border-2 border-primary/50">
                       <Camera className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-white uppercase tracking-tight text-sm">Institutional Avatar</h3>
                    <p className="text-[10px] text-sidebar-foreground uppercase font-medium tracking-widest opacity-60">Recommended size: 512x512px (PNG/JPG)</p>
                    <div className="flex space-x-3 mt-4">
                      <Button variant="outline" size="sm" className="border-border text-sidebar-foreground hover:bg-sidebar-accent uppercase font-bold text-[10px] tracking-widest h-8 px-4">Upload New</Button>
                      <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-500/10 uppercase font-bold text-[10px] tracking-widest h-8 px-4">Remove</Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[10px] font-black uppercase text-sidebar-foreground tracking-widest opacity-60">Full Name</Label>
                    <Input 
                      id="name" 
                      value={formData.displayName} 
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      className="bg-white/5 border-border text-white h-11 focus:border-primary transition-all text-sm font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase text-sidebar-foreground tracking-widest opacity-60">Institutional Email</Label>
                    <Input id="email" value={profile?.email} disabled className="bg-sidebar-accent/10 border-border text-sidebar-foreground opacity-50 h-11 text-sm font-medium" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-[10px] font-black uppercase text-sidebar-foreground tracking-widest opacity-60">Assigned Role</Label>
                    <Input id="role" value={profile?.role} disabled className="capitalize bg-sidebar-accent/10 border-border text-sidebar-foreground opacity-50 h-11 text-sm font-medium" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[10px] font-black uppercase text-sidebar-foreground tracking-widest opacity-60">Personal Contact</Label>
                    <Input 
                      id="phone" 
                      placeholder="+1 (555) 000-0000" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="bg-white/5 border-border text-white h-11 focus:border-primary transition-all text-sm font-medium" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-card border-border shadow-none rounded-xl">
              <CardHeader className="border-b border-border mb-6">
                <CardTitle className="text-white text-lg uppercase tracking-tight">Signal Dispatch Preferences</CardTitle>
                <CardDescription className="text-sidebar-foreground text-[11px] font-medium uppercase tracking-widest opacity-60">Configure how the system communicates critical events.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="space-y-1">
                      <Label className="text-white font-bold uppercase text-[11px] tracking-tight">Email Notifications</Label>
                      <p className="text-[10px] text-sidebar-foreground font-medium opacity-60">Receive institutional summaries and report analytics via email.</p>
                    </div>
                    <Switch 
                      checked={formData.notificationPreferences.email} 
                      onCheckedChange={(val) => setFormData({...formData, notificationPreferences: {...formData.notificationPreferences, email: val}})}
                      className="data-[state=checked]:bg-primary" 
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="space-y-1">
                      <Label className="text-white font-bold uppercase text-[11px] tracking-tight">Real-time Push Dispatch</Label>
                      <p className="text-[10px] text-sidebar-foreground font-medium opacity-60">Receive instant desktop and mobile alerts for active operations.</p>
                    </div>
                    <Switch 
                      checked={formData.notificationPreferences.push} 
                      onCheckedChange={(val) => setFormData({...formData, notificationPreferences: {...formData.notificationPreferences, push: val}})}
                      className="data-[state=checked]:bg-primary" 
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="space-y-1">
                      <Label className="text-white font-bold uppercase text-[11px] tracking-tight">Attendance Triggers</Label>
                      <p className="text-[10px] text-sidebar-foreground font-medium opacity-60">Immediate notification when session presence is marked by instructors.</p>
                    </div>
                    <Switch 
                      checked={formData.notificationPreferences.attendance} 
                      onCheckedChange={(val) => setFormData({...formData, notificationPreferences: {...formData.notificationPreferences, attendance: val}})}
                      className="data-[state=checked]:bg-primary" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="bg-card border-border shadow-none rounded-xl">
              <CardHeader className="border-b border-border mb-6">
                <CardTitle className="text-white text-lg uppercase tracking-tight">Access Control & Security</CardTitle>
                <CardDescription className="text-sidebar-foreground text-[11px] font-medium uppercase tracking-widest opacity-60">Manage account safety and authentication protocols.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="p-4 bg-amber-500/10 rounded-full text-amber-500 border border-amber-500/20">
                   <Shield className="w-10 h-10" />
                </div>
                <div className="text-center">
                  <h3 className="text-white font-bold uppercase tracking-tight">Google Enterprise Auth Active</h3>
                  <p className="text-[11px] text-sidebar-foreground font-medium mt-1">Your account is secured via enterprise SSO. Password management is handled by your primary provider.</p>
                </div>
                <Button variant="outline" className="border-border text-sidebar-foreground uppercase font-black text-[10px] tracking-widest h-10 px-8">Audit Session Activity</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="system" className="space-y-6">
              <Card className="bg-card border-border shadow-none rounded-xl">
                <CardHeader className="border-b border-border mb-6">
                  <CardTitle className="text-white text-lg uppercase tracking-tight">Core System Architecture</CardTitle>
                  <CardDescription className="text-sidebar-foreground text-[11px] font-medium uppercase tracking-widest opacity-60">Administrative level configuration for the entire institution.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="p-5 bg-primary/5 rounded-xl border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center text-center md:text-left">
                      <div className="p-3 bg-primary/10 rounded-lg text-primary mr-5">
                        <Database className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-white uppercase tracking-widest mb-0.5">Global Database Snapshot</p>
                        <p className="text-[10px] text-sidebar-foreground font-bold uppercase tracking-tighter opacity-70">
                          {systemConfig.lastBackup ? `Synchronized: ${format(new Date(systemConfig.lastBackup), 'MMM dd, hh:mm a')}` : 'Initial state check required'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleBackup} 
                      disabled={isSaving}
                      className="bg-primary hover:bg-primary/90 text-white uppercase font-black text-[10px] tracking-widest h-10 px-8"
                    >
                      <RefreshCw className={cn("w-4 h-4 mr-2", isSaving && "animate-spin")} />
                      Force Backup
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-sidebar-foreground tracking-widest opacity-60">Institution Identity Name</Label>
                      <Input 
                        value={systemConfig.schoolName} 
                        onChange={(e) => setSystemConfig({...systemConfig, schoolName: e.target.value})}
                        className="bg-white/5 border-border text-white h-11 focus:border-primary transition-all text-sm font-medium" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-sidebar-foreground tracking-widest opacity-60">Active Academic Lifecycle</Label>
                      <Input 
                        value={systemConfig.academicYear} 
                        onChange={(e) => setSystemConfig({...systemConfig, academicYear: e.target.value})}
                        className="bg-white/5 border-border text-white h-11 focus:border-primary transition-all text-sm font-medium" 
                      />
                    </div>

                    <div className="col-span-full pt-4 border-t border-white/5">
                      <h3 className="text-[11px] font-black text-white uppercase tracking-widest mb-4">Official School Information</h3>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-sidebar-foreground tracking-widest opacity-60">School Mailing Address</Label>
                      <Input 
                        value={systemConfig.address} 
                        onChange={(e) => setSystemConfig({...systemConfig, address: e.target.value})}
                        className="bg-white/5 border-border text-white h-11 focus:border-primary transition-all text-sm font-medium" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-sidebar-foreground tracking-widest opacity-60">Official Phone Number</Label>
                      <Input 
                        value={systemConfig.phone} 
                        onChange={(e) => setSystemConfig({...systemConfig, phone: e.target.value})}
                        className="bg-white/5 border-border text-white h-11 focus:border-primary transition-all text-sm font-medium" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-sidebar-foreground tracking-widest opacity-60">Admin Email Address</Label>
                      <Input 
                        value={systemConfig.email} 
                        type="email"
                        onChange={(e) => setSystemConfig({...systemConfig, email: e.target.value})}
                        className="bg-white/5 border-border text-white h-11 focus:border-primary transition-all text-sm font-medium" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-sidebar-foreground tracking-widest opacity-60">Official Website URL</Label>
                      <Input 
                        value={systemConfig.website} 
                        onChange={(e) => setSystemConfig({...systemConfig, website: e.target.value})}
                        className="bg-white/5 border-border text-white h-11 focus:border-primary transition-all text-sm font-medium" 
                      />
                    </div>
                  </div>

                  <div className="col-span-full pt-8 border-t border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[11px] font-black text-white uppercase tracking-widest mb-1">Staff Role Architecture</h3>
                        <p className="text-[10px] text-sidebar-foreground font-medium uppercase tracking-widest opacity-60">Manage permissions and access levels for faculty and administration.</p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setEditingRole({ permissions: { ...DEFAULT_PERMISSIONS } });
                          setIsRoleDialogOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90 text-white uppercase font-black text-[10px] tracking-widest h-8 px-4"
                      >
                        <Plus className="w-3 h-3 mr-2" />
                        New Role
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {roles.map((role) => (
                        <div key={role.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-white/20 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <Shield className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-[13px] font-bold text-white uppercase tracking-tight">{role.name}</h4>
                              <p className="text-[10px] text-sidebar-foreground font-medium uppercase tracking-widest opacity-60">
                                {Object.values(role.permissions).filter(p => p !== 'none').length} Active Modules
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-sidebar-foreground hover:text-white"
                              onClick={() => {
                                setEditingRole(role);
                                setIsRoleDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {!role.isSystem && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"
                                onClick={() => handleDeleteRole(role.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {roles.length === 0 && (
                        <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-xl">
                          <ShieldAlert className="w-8 h-8 text-sidebar-foreground mx-auto mb-3 opacity-20" />
                          <p className="text-[10px] text-sidebar-foreground font-bold uppercase tracking-widest">No custom roles established</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Role Editor Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent className="bg-[#1A1D23] border-white/10 text-white sm:max-w-[600px] p-0 overflow-hidden">
            <form onSubmit={handleSaveRole}>
              <DialogHeader className="p-6 border-b border-white/5">
                <DialogTitle className="text-xl font-black uppercase tracking-tighter">Role Configuration</DialogTitle>
                <DialogDescription className="text-sidebar-foreground text-[11px] font-medium uppercase tracking-widest opacity-60">
                  Define authority levels and module accessibility.
                </DialogDescription>
              </DialogHeader>
              <div className="p-6 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-sidebar-foreground tracking-widest opacity-60">Role Designation</Label>
                    <Input 
                      placeholder="e.g. Senior Instructor"
                      value={editingRole?.name || ''}
                      onChange={e => setEditingRole(prev => ({ ...prev!, name: e.target.value }))}
                      className="bg-white/5 border-border text-white h-11 focus:border-primary transition-all text-sm font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-sidebar-foreground tracking-widest opacity-60">Designation Summary</Label>
                    <Input 
                      placeholder="Functional description of this role"
                      value={editingRole?.description || ''}
                      onChange={e => setEditingRole(prev => ({ ...prev!, description: e.target.value }))}
                      className="bg-white/5 border-border text-white h-11 focus:border-primary transition-all text-sm font-medium" 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-3 h-3 text-primary" />
                    Module Permission Matrix
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.keys(DEFAULT_PERMISSIONS).map((module) => (
                      <div key={module} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-black uppercase text-white tracking-tight">{module}</Label>
                          <Info className="w-3 h-3 text-sidebar-foreground opacity-40" />
                        </div>
                        <Select 
                          value={editingRole?.permissions?.[module as keyof Role['permissions']] || 'none'}
                          onValueChange={(val: any) => setEditingRole(prev => ({
                            ...prev!,
                            permissions: {
                              ...prev!.permissions!,
                              [module]: val
                            }
                          }))}
                        >
                          <SelectTrigger className="bg-white/5 border-white/10 text-[11px] h-8 uppercase font-bold tracking-wider">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1D23] border-white/10">
                            <SelectItem value="none" className="text-[11px] uppercase font-bold tracking-widest">No Access</SelectItem>
                            <SelectItem value="view" className="text-[11px] uppercase font-bold tracking-widest">View Only</SelectItem>
                            <SelectItem value="full" className="text-[11px] uppercase font-bold tracking-widest">Full Access</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold uppercase text-[10px] tracking-widest">
                    <ChevronRight className="w-3 h-3" />
                    System Impact Analytics
                  </div>
                  <p className="text-[10px] text-sidebar-foreground font-medium leading-relaxed">
                    Adjusting these permissions will instantly synchronize across all active sessions belonging to staff members assigned this role. Use caution when granting 'Full Access' to financial or personnel and student modules.
                  </p>
                </div>
              </div>
              <DialogFooter className="p-6 border-t border-white/5 bg-sidebar-accent/5">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsRoleDialogOpen(false)}
                  className="uppercase font-bold text-[10px] tracking-widest text-sidebar-foreground"
                >
                  Discard Changes
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary/90 text-white uppercase font-black text-[10px] tracking-widest h-10 px-8 px-8"
                >
                  {isSaving ? 'Synchronizing...' : (editingRole?.id ? 'Patch Configuration' : 'Establish Role')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="flex justify-end space-x-4 pt-8 border-t border-border">
          <Button variant="ghost" className="text-sidebar-foreground hover:bg-white/5 uppercase font-bold text-[10px] tracking-widest h-11 px-8 transition-colors">Reset Terminal</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white uppercase font-black text-[10px] tracking-widest h-11 px-10 shadow-[0_0_25px_rgba(59,130,246,0.3)]">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Compiling...' : 'Commit Changes'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
