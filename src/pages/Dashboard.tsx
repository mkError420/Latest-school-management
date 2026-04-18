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
  AlertCircle
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
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
  const [stats, setStats] = useState({
    feesCollected: 0,
    avgAttendance: 0,
    libraryIssues: 0,
    totalStudents: 0,
    totalStaff: 0,
    totalClasses: 0,
    growthRate: 0,
    admissionTrend: data
  });

  useEffect(() => {
    // Upcoming Exams
    const examsQ = query(
      collection(db, 'exams'), 
      where('status', '==', 'scheduled'),
      orderBy('date', 'asc'),
      limit(5)
    );
    
    const unsubscribeExams = onSnapshot(examsQ, (snapshot) => {
      setUpcomingExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Recent Transactions
    const transactionsQ = query(
      collection(db, 'fees'),
      orderBy('date', 'desc'),
      limit(5)
    );

    const unsubscribeTransactions = onSnapshot(transactionsQ, (snapshot) => {
      setRecentTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Total Students & Trends
    const studentsQ = query(collection(db, 'students'));
    const unsubscribeStudents = onSnapshot(studentsQ, (snapshot) => {
      const studentDocs = snapshot.docs.map(doc => doc.data());
      const total = studentDocs.length;
      
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const studentLastMonth = studentDocs.filter(s => s.createdAt && new Date(s.createdAt) < lastMonth).length;
      const growth = studentLastMonth > 0 ? ((total - studentLastMonth) / studentLastMonth) * 100 : 100;

      const months: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = format(d, 'MMM');
        const monthStart = d;
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const count = studentDocs.filter(s => {
          if (!s.createdAt) return false;
          const date = new Date(s.createdAt);
          return date >= monthStart && date <= monthEnd;
        }).length;
        months.push({ name: monthName, students: Math.max(5, count), revenue: 0 }); 
      }

      setStats(prev => ({ 
        ...prev, 
        totalStudents: total, 
        growthRate: growth,
        admissionTrend: months
      }));
    });

    // Staff Count
    const staffQ = query(collection(db, 'staff'));
    const unsubscribeStaff = onSnapshot(staffQ, (snapshot) => {
      setStats(prev => ({ ...prev, totalStaff: snapshot.docs.length }));
    });

    // Classes Count
    const classesQ = query(collection(db, 'classes'));
    const unsubscribeClasses = onSnapshot(classesQ, (snapshot) => {
      setStats(prev => ({ ...prev, totalClasses: snapshot.docs.length }));
    });

    // Fees Collected
    const feesQ = query(collection(db, 'fees'), where('status', '==', 'paid'));
    const unsubscribeFees = onSnapshot(feesQ, (snapshot) => {
      const total = snapshot.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
      setStats(prev => ({ ...prev, feesCollected: total }));
    });

    // Library Issues
    const libraryQ = query(collection(db, 'library_issues'), where('status', '==', 'issued'));
    const unsubscribeLibrary = onSnapshot(libraryQ, (snapshot) => {
      setStats(prev => ({ ...prev, libraryIssues: snapshot.docs.length }));
    });

    // Attendance
    const attendanceQ = query(collection(db, 'attendance'), limit(200));
    const unsubscribeAttendance = onSnapshot(attendanceQ, (snapshot) => {
      if (snapshot.empty) {
        setStats(prev => ({ ...prev, avgAttendance: 95.0 }));
        return;
      }
      const present = snapshot.docs.filter(d => d.data().status === 'present').length;
      const avg = (present / snapshot.docs.length) * 100;
      setStats(prev => ({ ...prev, avgAttendance: avg }));
    });

    return () => {
      unsubscribeExams();
      unsubscribeTransactions();
      unsubscribeStudents();
      unsubscribeStaff();
      unsubscribeClasses();
      unsubscribeFees();
      unsubscribeLibrary();
      unsubscribeAttendance();
    };
  }, []);

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
            title="Total Students" 
            value={stats.totalStudents.toLocaleString()} 
            trend={`${stats.growthRate.toFixed(1)}% growth`}
          />
          <StatCard 
            title="Total Staff" 
            value={stats.totalStaff} 
            trend="Active Members" 
          />
          <StatCard 
            title="Fees Collected" 
            value={`৳${(stats.feesCollected / 1000).toFixed(1)}k`} 
            trend="Total Revenue" 
          />
          <StatCard 
            title="Total Classes" 
            value={stats.totalClasses} 
            trend="Academic Units" 
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-2 lg:row-span-2 bg-card border-border rounded-xl p-5 flex flex-col shadow-none">
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm font-semibold text-white">Student Admission Trends</span>
              <span className="text-[11px] text-sidebar-foreground">Last 6 Months</span>
            </div>
            <div className="flex-1 flex items-end gap-2 pt-2 min-h-[200px]">
              {stats.admissionTrend.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div 
                    className={cn(
                      "w-full rounded-t-md transition-all duration-300",
                      i === stats.admissionTrend.length - 1 ? "bg-primary" : "bg-[#23262D] group-hover:bg-[#2D3139]"
                    )}
                    style={{ height: `${Math.max(10, (item.students / (stats.totalStudents || 100)) * 100)}%` }}
                  />
                  <span className="text-[9px] text-slate-600 font-bold uppercase">{item.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-8">
              <div>
                <p className="text-[11px] text-sidebar-foreground">Total Students</p>
                <p className="text-2xl font-bold text-white">{stats.totalStudents.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] text-sidebar-foreground">Growth Rate</p>
                <p className={cn("text-2xl font-bold", stats.growthRate >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2 bg-card border-border rounded-xl p-5 flex flex-col shadow-none">
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm font-semibold text-white">Upcoming Examinations</span>
            </div>
            <div className="space-y-0">
              {upcomingExams.length > 0 ? upcomingExams.map((event, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <h4 className="text-[13px] font-medium text-white">{event.subject}</h4>
                    <p className="text-[11px] text-sidebar-foreground">{event.type} • {event.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] text-white">
                      {formatDistanceToNow(new Date(event.date), { addSuffix: true })}
                    </p>
                    <p className="text-[11px] text-sidebar-foreground">{format(new Date(event.date), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
              )) : (
                <div className="py-8 text-center text-sidebar-foreground text-sm">
                  No upcoming exams scheduled.
                </div>
              )}
            </div>
          </Card>

          <Card className="lg:col-span-2 bg-card border-border rounded-xl p-5 flex flex-col shadow-none">
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm font-semibold text-white">Recent Transactions</span>
            </div>
            <div className="space-y-0">
              {recentTransactions.length > 0 ? recentTransactions.map((tx, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <h4 className="text-[13px] font-medium text-white">{tx.studentName}</h4>
                    <p className="text-[11px] text-sidebar-foreground capitalize">{tx.type} Fee • ৳{tx.amount.toFixed(2)}</p>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                    tx.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" : 
                    tx.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                    "bg-rose-500/10 text-rose-500"
                  )}>
                    {tx.status}
                  </div>
                </div>
              )) : (
                <div className="py-8 text-center text-sidebar-foreground text-sm">
                  No recent transactions.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
