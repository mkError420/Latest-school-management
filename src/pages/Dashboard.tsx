import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { useAuth } from '@/src/lib/auth';
import { 
  Users, 
  UserCheck, 
  CreditCard, 
  TrendingUp, 
  Calendar, 
  BookOpen,
  AlertCircle,
  CalendarCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { format, formatDistanceToNow } from 'date-fns';

import { cn } from '@/lib/utils';

const data = [
  { name: 'Jan', students: 400, revenue: 2400 },
  { name: 'Feb', students: 420, revenue: 2600 },
  { name: 'Mar', students: 450, revenue: 2800 },
  { name: 'Apr', students: 480, revenue: 3200 },
  { name: 'May', students: 500, revenue: 3500 },
  { name: 'Jun', students: 510, revenue: 3800 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const { profile } = useAuth();
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [feeDocs, setFeeDocs] = useState<any[]>([]);
  const [payrollDocs, setPayrollDocs] = useState<any[]>([]);
  const [studentDocs, setStudentDocs] = useState<any[]>([]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState('all');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCost: 0,
    monthlyRevenue: 0,
    monthlyCost: 0,
    avgAttendance: 0,
    libraryIssues: 0,
    totalStudents: 0,
    totalStaff: 0,
    totalClasses: 0,
    growthRate: 0,
    admissionTrend: data,
    financialTrend: [] as any[]
  });

  // Derived Financial Trend
  useEffect(() => {
    const now = new Date();
    const trend: any[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = format(d, 'MMM');
      const monthStart = d;
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const monthYearStr = format(d, 'MMMM yyyy');

      const revenue = feeDocs
        .filter(f => f.date && new Date(f.date) >= monthStart && new Date(f.date) <= monthEnd)
        .reduce((acc, f) => acc + (f.amount || 0), 0);

      const cost = payrollDocs
        .filter(p => p.month === monthYearStr)
        .reduce((acc, p) => acc + (p.netSalary || 0), 0);

      trend.push({
        name: monthLabel,
        revenue,
        cost,
        profit: revenue - cost
      });
    }

    setStats(prev => ({ ...prev, financialTrend: trend }));
  }, [feeDocs, payrollDocs]);

  // Derived Admission Trend with Filter
  useEffect(() => {
    if (studentDocs.length === 0) return;

    const filteredTrend: any[] = [];
    const year = parseInt(filterYear);

    if (filterMonth === 'all') {
      // Show 12 months for the selected year
      for (let m = 0; m < 12; m++) {
        const d = new Date(year, m, 1);
        const monthLabel = format(d, 'MMM');
        const monthStart = d;
        const monthEnd = new Date(year, m + 1, 0);

        const count = studentDocs.filter(s => {
          const admissionDate = s.admissionDate || s.admittedAt || s.createdAt;
          if (!admissionDate) return false;
          const date = new Date(admissionDate);
          return date >= monthStart && date <= monthEnd;
        }).length;

        filteredTrend.push({ name: monthLabel, students: count });
      }
    } else {
      // Show days for the selected month
      const monthIndex = parseInt(filterMonth);
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, monthIndex, day);
        const dayLabel = format(d, 'dd');
        const dayStart = new Date(year, monthIndex, day, 0, 0, 0);
        const dayEnd = new Date(year, monthIndex, day, 23, 59, 59);

        const count = studentDocs.filter(s => {
          const admissionDate = s.admissionDate || s.admittedAt || s.createdAt;
          if (!admissionDate) return false;
          const date = new Date(admissionDate);
          return date >= dayStart && date <= dayEnd;
        }).length;

        filteredTrend.push({ name: dayLabel, students: count });
      }
    }

    setStats(prev => ({ ...prev, admissionTrend: filteredTrend }));
  }, [studentDocs, filterYear, filterMonth]);

  useEffect(() => {
    if (!profile) return;

    const unsubscribes: (() => void)[] = [];

    // Upcoming Exams - Accessible to all authenticated users
    const examsQ = query(
      collection(db, 'exams'), 
      where('status', '==', 'scheduled'),
      orderBy('date', 'asc'),
      limit(5)
    );
    unsubscribes.push(onSnapshot(examsQ, (snapshot) => {
      setUpcomingExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }));

    // Data only for Admin and Teachers
    if (profile.role === 'admin' || profile.role === 'teacher') {
      // Recent Transactions
      const transactionsQ = query(
        collection(db, 'fees'),
        orderBy('date', 'desc'),
        limit(5)
      );
      unsubscribes.push(onSnapshot(transactionsQ, (snapshot) => {
        setRecentTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }));

      // Total Students & Trends
      const studentsQ = query(collection(db, 'students'));
      unsubscribes.push(onSnapshot(studentsQ, (snapshot) => {
        const studentData = snapshot.docs.map(doc => doc.data());
        setStudentDocs(studentData);
        
        const total = studentData.length;
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const studentLastMonth = studentData.filter(s => {
          const admissionDate = s.admissionDate || s.admittedAt || s.createdAt;
          return admissionDate && new Date(admissionDate) < lastMonth;
        }).length;
        const growth = studentLastMonth > 0 ? ((total - studentLastMonth) / studentLastMonth) * 100 : 100;

        setStats(prev => ({ 
          ...prev, 
          totalStudents: total, 
          growthRate: growth
        }));
      }));

      // Staff Count
      const staffQ = query(collection(db, 'staff'));
      unsubscribes.push(onSnapshot(staffQ, (snapshot) => {
        setStats(prev => ({ ...prev, totalStaff: snapshot.docs.length }));
      }));

      // Classes Count
      const classesQ = query(collection(db, 'classes'));
      unsubscribes.push(onSnapshot(classesQ, (snapshot) => {
        setStats(prev => ({ ...prev, totalClasses: snapshot.docs.length }));
      }));

      // Library Issues
      const libraryQ = query(collection(db, 'library_issues'), where('status', '==', 'issued'));
      unsubscribes.push(onSnapshot(libraryQ, (snapshot) => {
        setStats(prev => ({ ...prev, libraryIssues: snapshot.docs.length }));
      }));
    }

    // Revenue and Payroll - Admin only
    if (profile.role === 'admin') {
      // Revenue (Fees Collected)
      const feesQ = query(collection(db, 'fees'), where('status', '==', 'paid'));
      unsubscribes.push(onSnapshot(feesQ, (snapshot) => {
        const docs = snapshot.docs.map(doc => doc.data());
        setFeeDocs(docs);
        const total = docs.reduce((acc, d) => acc + (d.amount || 0), 0);
        
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthly = docs.filter(d => d.date && new Date(d.date) >= monthStart).reduce((acc, d) => acc + (d.amount || 0), 0);
        
        setStats(prev => ({ ...prev, totalRevenue: total, monthlyRevenue: monthly }));
      }));

      // Cost (Payroll)
      const payrollQ = query(collection(db, 'payroll'), where('status', '==', 'paid'));
      unsubscribes.push(onSnapshot(payrollQ, (snapshot) => {
        const docs = snapshot.docs.map(doc => doc.data());
        setPayrollDocs(docs);
        const total = docs.reduce((acc, d) => acc + (d.netSalary || 0), 0);
        
        const now = new Date();
        const currentMonthStr = format(now, 'MMMM yyyy');
        const monthly = docs.filter(d => d.month === currentMonthStr).reduce((acc, d) => acc + (d.netSalary || 0), 0);
        
        setStats(prev => ({ ...prev, totalCost: total, monthlyCost: monthly }));
      }));
    }

    // Attendance - Accessible to all authenticated users
    const attendanceQ = query(collection(db, 'attendance'), limit(200));
    unsubscribes.push(onSnapshot(attendanceQ, (snapshot) => {
      if (snapshot.empty) {
        setStats(prev => ({ ...prev, avgAttendance: 95.0 }));
        return;
      }
      const present = snapshot.docs.filter(d => d.data().status === 'present').length;
      const avg = (present / snapshot.docs.length) * 100;
      setStats(prev => ({ ...prev, avgAttendance: avg }));
    }));

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [profile]);

  const StatCard = ({ title, value, trend, trendDown }: any) => (
    <Card className="bg-card border-border rounded-xl p-5 flex flex-col shadow-none">
      <div className="flex justify-between items-start mb-5">
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <div className="text-[28px] font-bold text-white mb-1">{value}</div>
      {trend !== undefined && (
        <div className={cn("text-xs flex items-center gap-1", trendDown ? "text-rose-500" : "text-emerald-500")}>
          {trendDown ? "↓" : "↑"} {trend}
        </div>
      )}
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Institutional Revenue" 
            value={`৳${(stats.totalRevenue / 1000).toFixed(1)}k`} 
            trend={`৳${(stats.monthlyRevenue / 1000).toFixed(1)}k this month`} 
          />
          <StatCard 
            title="Institutional Cost" 
            value={`৳${(stats.totalCost / 1000).toFixed(1)}k`} 
            trend={`৳${(stats.monthlyCost / 1000).toFixed(1)}k this month`} 
            trendDown
          />
          <StatCard 
            title="Net Balance" 
            value={`৳${((stats.totalRevenue - stats.totalCost) / 1000).toFixed(1)}k`} 
            trend={stats.monthlyRevenue >= stats.monthlyCost ? "Monthly Surplus" : "Monthly Deficit"}
            trendDown={stats.monthlyRevenue < stats.monthlyCost}
          />
          <StatCard 
            title="Total Students" 
            value={stats.totalStudents.toLocaleString()} 
            trend={`${stats.growthRate.toFixed(1)}% growth`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card border-border rounded-xl p-4 flex items-center gap-4 shadow-none">
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-sidebar-foreground uppercase font-bold tracking-wider">Total Staff</p>
              <p className="text-xl font-bold text-white">{stats.totalStaff}</p>
            </div>
          </Card>
          <Card className="bg-card border-border rounded-xl p-4 flex items-center gap-4 shadow-none">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-sidebar-foreground uppercase font-bold tracking-wider">Avg Attendance</p>
              <p className="text-xl font-bold text-white">{stats.avgAttendance.toFixed(1)}%</p>
            </div>
          </Card>
          <Card className="bg-card border-border rounded-xl p-4 flex items-center gap-4 shadow-none">
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-sidebar-foreground uppercase font-bold tracking-wider">Library Issues</p>
              <p className="text-xl font-bold text-white">{stats.libraryIssues}</p>
            </div>
          </Card>
          <Card className="bg-card border-border rounded-xl p-4 flex items-center gap-4 shadow-none">
            <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-500">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-sidebar-foreground uppercase font-bold tracking-wider">Total Classes</p>
              <p className="text-xl font-bold text-white">{stats.totalClasses}</p>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-2 bg-card border-border rounded-xl p-5 flex flex-col shadow-none overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <TrendingUp className="w-24 h-24 text-primary" />
            </div>
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div>
                <span className="text-sm font-semibold text-white">Financial Performance</span>
                <p className="text-[11px] text-sidebar-foreground mt-0.5">Revenue vs Operational Cost</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[10px] text-sidebar-foreground uppercase font-bold tracking-wider">Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-[10px] text-sidebar-foreground uppercase font-bold tracking-wider">Cost</span>
                </div>
              </div>
            </div>
            <div className="h-[260px] w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.financialTrend}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    dy={12}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickFormatter={(v) => `৳${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#1A1D23]/90 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-2xl">
                            <p className="text-[11px] font-bold text-white mb-2 uppercase tracking-widest">{label}</p>
                            <div className="space-y-1">
                              <p className="text-[11px] flex justify-between gap-4">
                                <span className="text-sidebar-foreground">Revenue:</span>
                                <span className="text-primary font-bold">৳{payload[0].value?.toLocaleString()}</span>
                              </p>
                              <p className="text-[11px] flex justify-between gap-4">
                                <span className="text-sidebar-foreground">Cost:</span>
                                <span className="text-rose-500 font-bold">৳{payload[1].value?.toLocaleString()}</span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorCost)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="lg:col-span-2 bg-card border-border rounded-xl p-5 flex flex-col shadow-none overflow-hidden relative">
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div>
                <span className="text-sm font-semibold text-white">Net Profit Trend</span>
                <p className="text-[11px] text-sidebar-foreground mt-0.5">Institution Sustainability</p>
              </div>
              <div className="px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Health: Positive</span>
              </div>
            </div>
            <div className="h-[260px] w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.financialTrend}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    dy={12}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickFormatter={(v) => `৳${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#1A1D23]/90 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-2xl">
                            <p className="text-[11px] font-bold text-white mb-2 uppercase tracking-widest">{label}</p>
                            <p className="text-[13px] font-bold text-emerald-500">
                              ৳{payload[0].value?.toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#10b981" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4, stroke: '#111827' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="lg:col-span-2 lg:row-span-2 bg-card border-border rounded-xl p-5 flex flex-col shadow-none overflow-hidden relative">
            <div className="absolute -top-12 -left-12 p-8 opacity-5">
              <Users className="w-48 h-48 text-primary" />
            </div>
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div>
                <span className="text-sm font-semibold text-white">Student Admission Trends</span>
                <p className="text-[11px] text-sidebar-foreground mt-0.5">
                  {filterMonth === 'all' ? `${filterYear} Enrollment` : `${format(new Date(2000, parseInt(filterMonth)), 'MMMM')} ${filterYear} Daily`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-sidebar-foreground uppercase font-bold tracking-wider">Growth</p>
                  <p className={cn("text-xs font-bold", stats.growthRate >= 0 ? "text-emerald-500" : "text-rose-500")}>
                    {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                   <Select value={filterYear} onValueChange={(val) => val && setFilterYear(val)}>
                      <SelectTrigger className="h-7 w-20 bg-white/5 border-white/10 text-[10px] uppercase font-bold tracking-wider">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {['2024', '2025', '2026'].map(year => (
                          <SelectItem key={year} value={year} className="text-[10px] uppercase font-bold tracking-wider">{year}</SelectItem>
                        ))}
                      </SelectContent>
                   </Select>
                   <Select value={filterMonth} onValueChange={(val) => val && setFilterMonth(val)}>
                      <SelectTrigger className="h-7 w-24 bg-white/5 border-white/10 text-[10px] uppercase font-bold tracking-wider">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-[10px] uppercase font-bold tracking-wider">All Months</SelectItem>
                        {Array.from({ length: 12 }).map((_, i) => (
                          <SelectItem key={i} value={i.toString()} className="text-[10px] uppercase font-bold tracking-wider">
                            {format(new Date(2000, i), 'MMMM')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                   </Select>
                </div>
              </div>
            </div>
            
            <div className="flex-1 min-h-[240px] w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.admissionTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#1f2937" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    dx={-10}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#1A1D23]/95 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] scale-110 mb-8">
                            <p className="text-[10px] font-black text-sidebar-foreground mb-1 uppercase tracking-[0.2em]">{label}</p>
                            <p className="text-[18px] font-black text-white flex items-baseline gap-1">
                              {payload[0].value}
                              <span className="text-[10px] text-primary uppercase tracking-widest font-bold">Students</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="students" 
                    stroke="#3b82f6" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorStudents)" 
                    dot={{ fill: '#1e293b', stroke: '#3b82f6', strokeWidth: 2, r: 4, fillOpacity: 1 }}
                    activeDot={{ r: 7, strokeWidth: 0, fill: '#60a5fa' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 flex gap-8 relative z-10 border-t border-border pt-4">
              <div>
                <p className="text-[11px] text-sidebar-foreground uppercase font-bold tracking-wider">Total Students</p>
                <p className="text-2xl font-bold text-white">{stats.totalStudents.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] text-sidebar-foreground uppercase font-bold tracking-wider">Active Enrollment</p>
                <p className="text-2xl font-bold text-emerald-500">Live</p>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2 bg-card border-border rounded-xl p-5 flex flex-col shadow-none relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <CalendarCheck className="w-24 h-24 text-primary" />
            </div>
            <div className="flex justify-between items-center mb-5 relative z-10">
              <span className="text-sm font-semibold text-white">Upcoming Examinations</span>
              <div className="px-2 py-0.5 bg-primary/10 rounded text-[10px] text-primary font-bold uppercase tracking-wider border border-primary/20">
                Academic Calendar
              </div>
            </div>
            <div className="space-y-0 relative z-10">
              {upcomingExams.length > 0 ? upcomingExams.map((event, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b border-border/50 last:border-0 group cursor-default hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#1A1D23] border border-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-white uppercase tracking-tight">{event.subject}</h4>
                      <p className="text-[11px] text-sidebar-foreground">{event.type} • {event.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-white">
                      {formatDistanceToNow(new Date(event.date), { addSuffix: true })}
                    </p>
                    <p className="text-[10px] text-sidebar-foreground uppercase font-bold tracking-widest opacity-60">
                      {format(new Date(event.date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center">
                  <AlertCircle className="w-8 h-8 text-sidebar-foreground mx-auto mb-3 opacity-20" />
                  <p className="text-sidebar-foreground text-xs font-medium uppercase tracking-widest">No upcoming exams</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="lg:col-span-2 bg-card border-border rounded-xl p-5 flex flex-col shadow-none relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
              <CreditCard className="w-24 h-24 text-emerald-500" />
            </div>
            <div className="flex justify-between items-center mb-5 relative z-10">
              <span className="text-sm font-semibold text-white">Recent Transactions</span>
              <div className="px-2 py-0.5 bg-emerald-500/10 rounded text-[10px] text-emerald-500 font-bold uppercase tracking-wider border border-emerald-500/20">
                Live Audit
              </div>
            </div>
            <div className="space-y-0 relative z-10">
              {recentTransactions.length > 0 ? recentTransactions.map((tx, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b border-border/50 last:border-0 hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full border flex items-center justify-center transition-all",
                      tx.status === 'paid' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : 
                      tx.status === 'pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                      "bg-rose-500/10 border-rose-500/20 text-rose-500"
                    )}>
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-extrabold text-white uppercase tracking-tight">{tx.studentName}</h4>
                      <p className="text-[11px] text-sidebar-foreground uppercase tracking-widest font-bold opacity-60">
                        {tx.type} Fee • ৳{tx.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                    tx.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : 
                    tx.status === 'pending' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                    "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                  )}>
                    {tx.status}
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center text-sidebar-foreground text-sm">
                   <AlertCircle className="w-8 h-8 text-sidebar-foreground mx-auto mb-3 opacity-20" />
                   <p className="text-sidebar-foreground text-xs font-medium uppercase tracking-widest">No recent transactions</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
