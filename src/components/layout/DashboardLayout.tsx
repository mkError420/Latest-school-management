import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  BookOpen,
  CreditCard, 
  GraduationCap, 
  Library,
  Clock3,
  Banknote, 
  Settings, 
  LogOut, 
  Bell,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/src/lib/auth';
import { auth } from '@/src/lib/firebase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, systemConfig } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const navigationGroups = [
    {
      title: 'Management',
      roles: ['admin', 'teacher', 'parent', 'student'],
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'teacher', 'parent', 'student'] },
      ]
    },
    {
      title: 'Academic',
      roles: ['admin', 'teacher', 'parent', 'student'],
      items: [
        { name: 'Classes', href: '/classes', icon: GraduationCap, roles: ['admin', 'teacher'] },
        { name: 'Students', href: '/students', icon: Users, roles: ['admin', 'teacher'] },
        { name: 'Attendance', href: '/attendance', icon: CalendarCheck, roles: ['admin', 'teacher'] },
        { name: 'Subjects', href: '/subjects', icon: BookOpen, roles: ['admin', 'teacher'] },
        { name: 'Class Routine', href: '/routine', icon: Clock3, roles: ['admin', 'teacher', 'student', 'parent'] },
        { name: 'Exams', href: '/exams', icon: GraduationCap, roles: ['admin', 'teacher', 'student', 'parent'] },
      ]
    },
    {
      title: 'Staff Payroll',
      roles: ['admin'],
      items: [
        { name: 'Staff Directory', href: '/payroll?tab=staff', icon: Users, roles: ['admin'] },
        { name: 'Payroll History', href: '/payroll?tab=history', icon: Banknote, roles: ['admin'] },
        { name: 'Staff Attendance', href: '/payroll?tab=attendance', icon: CalendarCheck, roles: ['admin'] },
      ]
    },
    {
      title: 'Institutional',
      roles: ['admin', 'teacher', 'parent', 'student'],
      items: [
        { name: 'Fees', href: '/fees', icon: CreditCard, roles: ['admin', 'parent'] },
        { name: 'Library', href: '/library', icon: Library, roles: ['admin', 'teacher', 'student'] },
        { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'teacher', 'parent', 'student'] },
      ]
    }
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-6 py-8 mb-4">
        {systemConfig?.schoolLogoUrl ? (
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 shrink-0">
               <img src={systemConfig.schoolLogoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
             </div>
             <div>
               <h1 className="text-sm font-bold tracking-widest text-primary uppercase leading-tight line-clamp-2">{systemConfig?.schoolName || 'EduFlow'}</h1>
             </div>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold tracking-widest text-primary uppercase">{systemConfig?.schoolName.split(' ')[0] || 'EduFlow'}</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{systemConfig?.schoolName.split(' ').slice(1).join(' ') || 'Management System'}</p>
          </>
        )}
      </div>
      <nav className="flex-1 space-y-8 overflow-y-auto custom-scrollbar">
        {navigationGroups.map((group) => {
          const filteredItems = group.items.filter(item => 
            profile && item.roles.includes(profile.role)
          );
          
          if (filteredItems.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1">
              <div className="px-6 mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600/80">{group.title}</p>
              </div>
              {filteredItems.map((item) => {
                const isActive = location.pathname === item.href.split('?')[0] && 
                                (!item.href.includes('?tab=') || location.search.includes(item.href.split('?')[1]));
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center px-6 py-2.5 text-[12px] font-medium transition-all relative group",
                      isActive 
                        ? "bg-primary/10 text-primary border-r-2 border-primary" 
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
                    )}
                  >
                    <item.icon className={cn(
                      "w-4 h-4 mr-3 transition-colors",
                      isActive ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-white"
                    )} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-[13px] text-sidebar-foreground hover:text-white hover:bg-sidebar-accent/50"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden print:h-auto print:overflow-visible">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[220px] lg:fixed lg:inset-y-0 print:hidden">
        <NavContent />
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 lg:pl-[220px] print:pl-0">
        {/* Header */}
        <header className="h-20 bg-background border-b border-border flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10 print:hidden">
          <div className="flex items-center">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger render={
                <Button variant="ghost" size="icon" className="lg:hidden mr-2">
                  <Menu className="w-6 h-6" />
                </Button>
              } />
              <SheetContent side="left" className="p-0 w-64">
                <NavContent />
              </SheetContent>
            </Sheet>
            <div className="page-title">
              <h2 className="text-xl font-semibold text-white capitalize">
                {location.pathname === '/' ? (systemConfig?.schoolName || 'Institutional Overview') : location.pathname.substring(1).replace('-', ' ')}
              </h2>
              <p className="text-xs text-sidebar-foreground">Academic Year: {systemConfig?.academicYear || '2023-2024'} • System status: Healthy.</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-[13px] text-sidebar-foreground hidden md:block">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" className="flex items-center space-x-3 bg-[#1A1D23] hover:bg-[#23262D] border border-border rounded-full px-4 py-6 h-auto">
                  <div className="text-right hidden sm:block">
                    <p className="text-[13px] font-medium text-white">{profile?.displayName}</p>
                  </div>
                  <Avatar className="h-7 w-7 border-none">
                    <AvatarImage src={profile?.photoURL} />
                    <AvatarFallback className="bg-primary text-white text-[10px] font-bold">
                      {profile?.displayName?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              } />
              <DropdownMenuContent align="end" className="w-56 bg-card border-border text-foreground">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-sidebar-accent">Profile Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-rose-500 hover:bg-sidebar-accent">Logout</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 print:p-0 print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}
