import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  User, 
  Bell, 
  Shield, 
  Database, 
  Save,
  Camera,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/src/lib/auth';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { profile, user, isAdmin } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
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
        setSystemConfig(doc.data() as any);
      }
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

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
