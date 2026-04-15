import React from 'react';
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

  const StatCard = ({ title, value, trend, color, trendDown }: any) => (
    <Card className="bg-card border-border rounded-xl p-5 flex flex-col shadow-none">
      <div className="flex justify-between items-start mb-5">
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <div className="text-[28px] font-bold text-white mb-1">{value}</div>
      {trend && (
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
            title="Fees Collected" 
            value="$428.5k" 
            trend="8.2% vs target" 
          />
          <StatCard 
            title="Avg Attendance" 
            value="96.4%" 
            trend="0.2% vs prev" 
            trendDown
          />
          <StatCard 
            title="Library Circulation" 
            value="1,102" 
          />
          <StatCard 
            title="Total Students" 
            value="2,842" 
            trend="12.4% growth"
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
              {data.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div 
                    className={cn(
                      "w-full rounded-t-md transition-all duration-300",
                      i === data.length - 1 ? "bg-primary" : "bg-[#23262D] group-hover:bg-[#2D3139]"
                    )}
                    style={{ height: `${(item.students / 600) * 100}%` }}
                  />
                  <span className="text-[9px] text-slate-600 font-bold uppercase">{item.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-8">
              <div>
                <p className="text-[11px] text-sidebar-foreground">Total Students</p>
                <p className="text-2xl font-bold text-white">2,842</p>
              </div>
              <div>
                <p className="text-[11px] text-sidebar-foreground">Growth Rate</p>
                <p className="text-2xl font-bold text-emerald-500">+12.4%</p>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2 bg-card border-border rounded-xl p-5 flex flex-col shadow-none">
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm font-semibold text-white">Upcoming Examinations</span>
            </div>
            <div className="space-y-0">
              {[
                { title: 'Advanced Mathematics', subtitle: 'Grade 12 • Hall A-1', time: '9:00 AM', relative: 'In 2 Days' },
                { title: 'Physical Sciences', subtitle: 'Grade 11 • Lab South', time: '1:30 PM', relative: 'In 4 Days' },
                { title: 'English Literature', subtitle: 'Grade 10 • Room 204', time: '10:30 AM', relative: 'In 5 Days' },
              ].map((event, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <h4 className="text-[13px] font-medium text-white">{event.title}</h4>
                    <p className="text-[11px] text-sidebar-foreground">{event.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] text-white">{event.relative}</p>
                    <p className="text-[11px] text-sidebar-foreground">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-2 bg-card border-border rounded-xl p-5 flex flex-col shadow-none">
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm font-semibold text-white">Recent Transactions</span>
            </div>
            <div className="space-y-0">
              {[
                { name: 'Sarah Jenkins', type: 'Tuition Fee • Grade 9', status: 'paid' },
                { name: 'Marcus Thorne', type: 'Transport Fee • Grade 11', status: 'pending' },
                { name: 'Elena Rodriguez', type: 'Library Fee • Grade 12', status: 'paid' },
              ].map((tx, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <h4 className="text-[13px] font-medium text-white">{tx.name}</h4>
                    <p className="text-[11px] text-sidebar-foreground">{tx.type}</p>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                    tx.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                  )}>
                    {tx.status}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
