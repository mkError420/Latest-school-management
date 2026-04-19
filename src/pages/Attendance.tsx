import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Save,
  Calendar as CalendarIcon,
  Download,
  Activity,
  UserCheck2,
  UserPlus2,
  Users2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '@/components/ui/dialog';
import { format, subDays } from 'date-fns';
import { collection, onSnapshot, query, where, addDoc, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  classId: string;
}

interface Class {
  id: string;
  name: string;
  section: string;
}

export default function Attendance() {
  const [date, setDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [avgRate, setAvgRate] = useState(0);

  useEffect(() => {
    if (!selectedClass) return;
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const trend: any[] = [];
    
    // Fetch last 7 days of attendance
    const fetchHistory = async () => {
      const hist: any[] = [];
      let totalRate = 0;
      let count = 0;

      for (let i = 6; i >= 0; i--) {
        const d = subDays(now, i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const dayName = dayNames[d.getDay()];
        
        const constraints = [where('date', '==', dateStr)];
        if (selectedClass !== 'all') {
          constraints.push(where('classId', '==', selectedClass));
        }

        const q = query(collection(db, 'attendance'), ...constraints);
        
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => doc.data());
        const sessionTotal = docs.length;
        const present = docs.filter(doc => doc.status === 'present' || doc.status === 'late').length;
        const rate = sessionTotal > 0 ? Math.round((present / sessionTotal) * 100) : 0;
        
        if (sessionTotal > 0) {
          totalRate += rate;
          count++;
        }

        hist.push({
          name: dayName,
          rate,
          fullDate: dateStr
        });
      }
      setHistoryData(hist);
      setAvgRate(count > 0 ? Math.round(totalRate / count) : 0);
    };

    fetchHistory();
    
    // Real-time Audit Logs (Recent submissions)
    const auditQ = query(
      collection(db, 'attendance'),
      orderBy('createdAt', 'desc'),
      limit(200) // Increased limit for better grouping context
    );

    const unsubscribeAudit = onSnapshot(auditQ, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Group by Date & ClassId for the audit log view
      const grouped = logs.reduce((acc: any, log: any) => {
        const key = `${log.date}_${log.classId}`;
        if (!acc[key]) {
          const cls = classes.find(c => c.id === log.classId);
          acc[key] = {
            date: log.date,
            className: cls ? `${cls.name} - ${cls.section}` : 'Loading...',
            createdAt: log.createdAt,
            records: 0,
            present: 0
          };
        }
        acc[key].records++;
        if (log.status === 'present' || log.status === 'late') acc[key].present++;
        return acc;
      }, {});

      setAuditLogs(Object.values(grouped));
    });

    return () => {
      unsubscribeAudit();
    };
  }, [selectedClass, classes]);

  useEffect(() => {
    const classesQuery = query(collection(db, 'classes'), orderBy('name'));
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      const classData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Class[];
      setClasses(classData);
      if (classData.length > 0 && !selectedClass) {
        setSelectedClass(classData[0].id);
      }
    });
    return () => unsubscribeClasses();
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    
    // Fetch students based on class selection
    const constraints = [];
    if (selectedClass !== 'all') {
      constraints.push(where('classId', '==', selectedClass));
    }
    
    const q = query(collection(db, 'students'), ...constraints);
    const unsubscribeStudents = onSnapshot(q, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(studentData);
      
      // Initialize attendance with 'present' as default for taking attendance
      // If we are viewing 'all', we should probably fetch the actual attendance records for the day 
      // instead of blindly setting everyone to 'present'. But the previous behavior for a single class 
      // was to initialize to 'present' so the teacher can modify.
    });
    
    return () => {
      unsubscribeStudents();
    };
  }, [selectedClass]);

  // Fetch actual attendance records for the selected date to populate stats accurately, 
  // especially when viewing "All Classes" or historical data.
  useEffect(() => {
    if (!selectedClass || !date) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const constraints = [where('date', '==', dateStr)];
    if (selectedClass !== 'all') {
      constraints.push(where('classId', '==', selectedClass));
    }
    
    const q = query(collection(db, 'attendance'), ...constraints);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty && selectedClass !== 'all') {
        // If no records and a specific class is selected, let the student effect initialize them
        // We will just keep the current state or reset to 'present' for the selected class's students
        setAttendance(prev => {
          const newState = { ...prev };
          students.forEach(s => {
            if (!newState[s.id]) newState[s.id] = 'present';
          });
          return newState;
        });
      } else {
        const attendanceData: Record<string, 'present' | 'absent' | 'late'> = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          attendanceData[data.studentId] = data.status;
        });
        
        // Merge with existing students so we have a full list even if some aren't marked yet
        setAttendance(prev => {
          const newState = { ...attendanceData };
          if (selectedClass !== 'all') {
            students.forEach(s => {
              if (!newState[s.id]) newState[s.id] = 'present';
            });
          }
          return newState;
        });
      }
    });

    return () => unsubscribe();
  }, [selectedClass, date, students]);

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const saveAttendance = async () => {
    setIsSaving(true);
    try {
      const selectedCls = classes.find(c => c.id === selectedClass);
      const className = selectedCls ? `${selectedCls.name} - ${selectedCls.section}` : (selectedClass === 'all' ? 'All Classes' : selectedClass);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const batch = Object.entries(attendance).map(([studentId, status]) => {
        const studentClassId = selectedClass === 'all' 
          ? students.find(s => s.id === studentId)?.classId || ''
          : selectedClass;

        return addDoc(collection(db, 'attendance'), {
          studentId,
          classId: studentClassId,
          date: dateStr,
          status,
          createdAt: new Date().toISOString()
        });
      });
      
      await Promise.all(batch);
      toast.success(`Attendance for ${className} on ${dateStr} saved successfully`);
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportAttendance = () => {
    if (students.length === 0) {
      toast.error('No attendance data to export');
      return;
    }

    const selectedCls = classes.find(c => c.id === selectedClass);
    const className = selectedCls ? `${selectedCls.name}-${selectedCls.section}` : (selectedClass === 'all' ? 'All_Classes' : 'Class');
    const dateStr = format(date, 'yyyy-MM-dd');

    const headers = ['Roll Number', 'Student Name', 'Status', 'Date', 'Class'];
    const csvData = students.map(student => {
      const studentClass = classes.find(c => c.id === student.classId);
      const studentClassName = studentClass ? `${studentClass.name}-${studentClass.section}` : 'N/A';
      return [
        student.rollNumber,
        student.name,
        attendance[student.id] || 'present',
        dateStr,
        selectedClass === 'all' ? studentClassName : className
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${className}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Attendance exported successfully');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Attendance Tracking</h1>
            <p className="text-sidebar-foreground text-sm font-medium opacity-60">Manage and monitor daily student presence.</p>
          </div>
          <div className="flex items-center flex-wrap gap-3">
            <Popover>
              <PopoverTrigger render={
                <Button variant="outline" className={cn("w-[200px] justify-start text-left font-bold border-border bg-card text-sidebar-foreground hover:bg-sidebar-accent uppercase tracking-wider text-[10px]", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              } />
              <PopoverContent className="w-auto p-0 bg-card border-border" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="bg-card text-foreground" />
              </PopoverContent>
            </Popover>
            
            <Select value={selectedClass} onValueChange={(val) => setSelectedClass(val || '')}>
              <SelectTrigger className="w-[180px] bg-card border-border text-sidebar-foreground uppercase font-bold tracking-wider text-[10px] h-9">
                <SelectValue placeholder="Class">
                  {selectedClass === 'all' 
                    ? 'All Classes' 
                    : selectedClass && classes.find(c => c.id === selectedClass)
                      ? `${classes.find(c => c.id === selectedClass)?.name} - ${classes.find(c => c.id === selectedClass)?.section}`
                      : "Select Class"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} - {cls.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm" 
              className="border-border text-sidebar-foreground hover:bg-sidebar-accent h-9 uppercase font-bold tracking-wider text-[10px]"
              onClick={handleExportAttendance}
            >
              <Download className="w-3.5 h-3.5 mr-2" />
              Export
            </Button>

            <Button onClick={saveAttendance} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white h-9 uppercase font-bold tracking-wider text-[10px]">
              <Save className="w-3.5 h-3.5 mr-2" />
              {isSaving ? 'Saving...' : 'Save Record'}
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card border-border rounded-xl p-5 shadow-none flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-sidebar-foreground font-black uppercase tracking-widest opacity-60">Total Students</p>
              <p className="text-xl font-bold text-white">{students.length}</p>
            </div>
          </Card>
          <Card className="bg-card border-border rounded-xl p-5 shadow-none flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
              <UserCheck2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-sidebar-foreground font-black uppercase tracking-widest opacity-60">Present</p>
              <p className="text-xl font-bold text-white">{Object.values(attendance).filter(v => v === 'present').length}</p>
            </div>
          </Card>
          <Card className="bg-card border-border rounded-xl p-5 shadow-none flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-sidebar-foreground font-black uppercase tracking-widest opacity-60">Late</p>
              <p className="text-xl font-bold text-white">{Object.values(attendance).filter(v => v === 'late').length}</p>
            </div>
          </Card>
          <Card className="bg-card border-border rounded-xl p-5 shadow-none flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 rounded-lg text-rose-500">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-sidebar-foreground font-black uppercase tracking-widest opacity-60">Absent</p>
              <p className="text-xl font-bold text-white">{Object.values(attendance).filter(v => v === 'absent').length}</p>
            </div>
          </Card>
        </div>

        {/* Student Roster Row */}
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-none">
          <div className="p-5 border-b border-border flex justify-between items-center bg-sidebar-accent/5">
             <h3 className="text-sm font-bold text-white uppercase tracking-tight">Student Roster</h3>
             <span className="text-[10px] text-sidebar-foreground font-black uppercase tracking-widest opacity-60">Status: Active Selection</span>
          </div>
          <Table>
            <TableHeader className="bg-sidebar-accent/20">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[120px] font-bold text-[11px] text-sidebar-foreground uppercase tracking-widest">Roll Identifier</TableHead>
                <TableHead className="font-bold text-[11px] text-sidebar-foreground uppercase tracking-widest">Student Identity</TableHead>
                <TableHead className="text-right font-bold text-[11px] text-sidebar-foreground uppercase tracking-widest pr-12">Session Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length > 0 ? (
                students.map((student) => (
                  <TableRow key={student.id} className="border-border hover:bg-white/[0.02] transition-colors group">
                    <TableCell className="font-bold text-sidebar-foreground uppercase tracking-tighter">{student.rollNumber}</TableCell>
                    <TableCell className="font-extrabold text-white text-[13px] uppercase tracking-tight">{student.name}</TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            "rounded-lg px-4 h-9 border-border text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                            attendance[student.id] === 'present' ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                          onClick={() => handleStatusChange(student.id, 'present')}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                          Present
                        </Button>
                        <Button 
                          variant={attendance[student.id] === 'absent' ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            "rounded-lg px-4 h-9 border-border text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                            attendance[student.id] === 'absent' ? "bg-rose-600 hover:bg-rose-700 text-white shadow-[0_0_15px_rgba(244,63,94,0.2)]" : "text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                          onClick={() => handleStatusChange(student.id, 'absent')}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-2" />
                          Absent
                        </Button>
                        <Button 
                          variant={attendance[student.id] === 'late' ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            "rounded-lg px-4 h-9 border-border text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                            attendance[student.id] === 'late' ? "bg-amber-600 hover:bg-amber-700 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                          onClick={() => handleStatusChange(student.id, 'late')}
                        >
                          <Clock className="w-3.5 h-3.5 mr-2" />
                          Late
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-sidebar-foreground">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <Users2 className="w-8 h-8 mb-2" />
                      <p className="text-[10px] uppercase font-bold tracking-widest">Awaiting class selection</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Chart Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-card border-border rounded-xl p-6 flex flex-col shadow-none relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Activity className="w-24 h-24 text-primary" />
            </div>
            <div className="flex justify-between items-center mb-8 relative z-10">
              <div>
                <span className="text-sm font-bold text-white uppercase tracking-tight">Class Participation Trend</span>
                <p className="text-[11px] text-sidebar-foreground font-medium opacity-60">Attendance rate over the last 7 sessions</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full">
                   <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Growth: Secure</span>
                </div>
              </div>
            </div>
            <div className="h-[200px] w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#1A1D23]/90 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-2xl">
                            <p className="text-[11px] font-bold text-white mb-1 uppercase tracking-widest">{label}</p>
                            <p className="text-[14px] font-black text-primary">
                              {payload[0].value}% Participation
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="#3b82f6" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorRate)" 
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4, stroke: '#111827' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="bg-card border-border rounded-xl p-6 flex flex-col shadow-none relative overflow-hidden group hover:border-primary/30 transition-all">
             <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity className="w-32 h-32 text-primary" />
             </div>
             <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 relative z-10">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Activity className="w-8 h-8" />
                  </div>
                  <div className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-card"></span>
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-bold uppercase tracking-tight">Real-time Insights</h3>
                  <div className="flex flex-col items-center gap-1 mt-2">
                    <p className="text-[10px] text-sidebar-foreground font-black uppercase tracking-widest opacity-60">Avg Participation</p>
                    <p className="text-2xl font-black text-white">{avgRate}%</p>
                  </div>
                  <p className="text-[11px] text-sidebar-foreground font-medium px-4 mt-3">
                    Currently performing <span className="text-primary font-bold">{avgRate >= 80 ? 'Above' : 'Below'}</span> institutional benchmark standards.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="text-[10px] font-bold uppercase tracking-widest border-border text-sidebar-foreground h-8 hover:bg-primary hover:text-white transition-colors"
                  onClick={() => setIsAuditOpen(true)}
                >
                  View Full Audit
                </Button>
             </div>
          </Card>
        </div>
      </div>

      <Dialog open={isAuditOpen} onOpenChange={setIsAuditOpen}>
        <DialogContent className="max-w-3xl bg-[#1A1D23] border-white/10 text-white p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-white/5">
            <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
              <Activity className="w-6 h-6 text-primary" />
              Institutional Attendance Audit
            </DialogTitle>
            <DialogDescription className="text-sidebar-foreground text-[11px] font-medium uppercase tracking-widest opacity-60">
              Live log of recent session submissions and participation metrics.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {auditLogs.length > 0 ? auditLogs.map((log, i) => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:bg-white/[0.08] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#1A1D23] border border-white/10 flex items-center justify-center text-sidebar-foreground">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-white uppercase tracking-tight">{log.className}</h4>
                      <p className="text-[10px] text-sidebar-foreground uppercase tracking-widest font-bold opacity-60">
                        Date: {log.date} • Created: {format(new Date(log.createdAt), 'hh:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                       <p className="text-[10px] text-sidebar-foreground uppercase font-black tracking-widest opacity-60">Success Rate</p>
                       <p className={cn(
                         "text-sm font-bold",
                         (log.present / log.records) >= 0.8 ? "text-emerald-500" : "text-amber-500"
                       )}>
                         {Math.round((log.present / log.records) * 100)}%
                       </p>
                    </div>
                    <div className="w-[1px] h-8 bg-white/10" />
                    <div className="text-right min-w-[80px]">
                      <p className="text-[10px] text-sidebar-foreground uppercase font-black tracking-widest opacity-60">Records</p>
                      <p className="text-sm font-bold text-white">{log.records} Students</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center">
                   <Activity className="w-8 h-8 text-sidebar-foreground mx-auto mb-3 opacity-20" />
                   <p className="text-sidebar-foreground text-[11px] font-bold uppercase tracking-widest">No audit logs available for synchronization</p>
                </div>
              )}
            </div>
          </div>
          <div className="p-6 border-t border-white/5 flex justify-end bg-sidebar-accent/5">
             <Button 
               className="bg-primary text-white text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.3)]"
               onClick={() => setIsAuditOpen(false)}
             >
               Close Audit Window
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
