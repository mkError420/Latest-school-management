import { format } from 'date-fns';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell,
} from '@/components/ui/table';
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Printer, Plus, Trash2, Pencil } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { toast } from 'sonner';
import { useAuth } from '@/src/lib/auth';

interface RoutineEntry {
  id: string;
  day: string;
  className: string;
  subject: string;
  startTime: string;
  endTime: string;
  teacher: string;
}

export default function ClassRoutine() {
  const [routine, setRoutine] = useState<RoutineEntry[]>([]);
  const { isAdmin, isTeacher, systemConfig } = useAuth();
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classes, setClasses] = useState<{id: string, name: string, section: string}[]>([]);
  const [teachers, setTeachers] = useState<{id: string, name: string}[]>([]);
  const [newRoutine, setNewRoutine] = useState({
    day: 'Monday',
    className: '',
    subject: '',
    startTime: '',
    endTime: '',
    teacher: ''
  });

  const handleEditRoutine = (entry: RoutineEntry) => {
    setEditingRoutineId(entry.id);
    setNewRoutine({
      day: entry.day,
      className: entry.className,
      subject: entry.subject,
      startTime: entry.startTime,
      endTime: entry.endTime,
      teacher: entry.teacher
    });
    setIsDialogOpen(true);
  };

  useEffect(() => {
    const q = query(collection(db, 'routine'), orderBy('startTime'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const routineData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RoutineEntry[];
      setRoutine(routineData);
    }, (error) => {
      console.error('Error fetching routine:', error);
      toast.error('Failed to load routine');
    });

    const classQ = query(collection(db, 'classes'));
    const unsubscribeClasses = onSnapshot(classQ, (snapshot) => {
      const classData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        section: doc.data().section
      }));
      setClasses(classData);
    });

    let unsubscribeStaff: (() => void) | undefined;
    if (isAdmin || isTeacher) {
      const staffQ = query(collection(db, 'staff'));
      unsubscribeStaff = onSnapshot(staffQ, (snapshot) => {
        const staffData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          role: doc.data().role,
          status: doc.data().status
        }));
        const activeTeachers = staffData.filter(s => s.role.toLowerCase() === 'teacher' && s.status === 'active');
        setTeachers(activeTeachers);
      });
    }

    return () => {
      unsubscribe();
      unsubscribeClasses();
      if (unsubscribeStaff) unsubscribeStaff();
    };
  }, [isAdmin, isTeacher]);

  const handlePrint = () => {
    document.body.classList.add('report-printing');
    window.print();
    document.body.classList.remove('report-printing');
  };

  const filteredRoutine = selectedClass === 'all' 
    ? routine 
    : routine.filter(r => r.className === selectedClass);

  const dayOptions = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const handleSaveRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutine.className || !newRoutine.subject || !newRoutine.startTime || !newRoutine.endTime || !newRoutine.teacher) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check for schedule collisions
    const teacherCollision = routine.some(entry =>
      entry.id !== editingRoutineId &&
      entry.day === newRoutine.day &&
      entry.teacher === newRoutine.teacher &&
      (newRoutine.startTime < entry.endTime && entry.startTime < newRoutine.endTime)
    );

    const classCollision = routine.some(entry =>
      entry.id !== editingRoutineId &&
      entry.day === newRoutine.day &&
      entry.className === newRoutine.className &&
      (newRoutine.startTime < entry.endTime && entry.startTime < newRoutine.endTime)
    );

    if (teacherCollision) {
      toast.error('This teacher is already assigned to another class at this time');
      return;
    }
    if (classCollision) {
      toast.error('This class already has a subject scheduled at this time');
      return;
    }

    try {
      if (editingRoutineId) {
        await updateDoc(doc(db, 'routine', editingRoutineId), newRoutine);
        toast.success('Routine updated successfully');
      } else {
        await addDoc(collection(db, 'routine'), newRoutine);
        toast.success('Routine added successfully');
      }
      setNewRoutine({ day: 'Monday', className: '', subject: '', startTime: '', endTime: '', teacher: '' });
      setEditingRoutineId(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving routine:', error);
      toast.error('Failed to save routine');
    }
  };


  const handleDeleteRoutine = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this routine entry?')) {
      try {
        await deleteDoc(doc(db, 'routine', id));
        toast.success('Routine deleted successfully');
      } catch (error) {
        console.error('Error deleting routine:', error);
        toast.error('Failed to delete routine');
      }
    }
  };

  const timeSlots = Array.from(new Set(filteredRoutine.map(r => `${r.startTime} - ${r.endTime}`)))
    .sort((a, b) => {
      const timeA = a.split(' - ')[0];
      const timeB = b.split(' - ')[0];
      return timeA.localeCompare(timeB);
    });

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            body {
              -webkit-print-color-adjust: exact;
            }
          }
        `}
      </style>
      <div className="print-only p-0 max-w-[297mm] mx-auto bg-white text-black font-sans relative overflow-hidden">
        {/* Colorful Grid Print View - Compacted for 1 Page */}
        <div className="rounded-2xl overflow-hidden shadow-none border-2 border-indigo-100 bg-white">
          {/* Compact Vibrant Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 p-4 flex justify-between items-center relative gap-4">
            <h1 className="text-4xl font-black text-white italic drop-shadow-[2px_2px_0px_rgba(0,0,0,0.2)] tracking-tighter">
              Class Schedule
            </h1>
            
            <div className="bg-white/95 rounded-lg p-2 min-w-[240px] shadow-md border border-white/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-1">
                  <span className="font-bold text-gray-500 min-w-[60px] uppercase text-[10px] tracking-widest">Name :</span>
                  <span className="font-bold text-indigo-900 text-sm">{selectedClass !== 'all' ? selectedClass : 'General Schedule'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-500 min-w-[60px] uppercase text-[10px] tracking-widest">Year :</span>
                  <span className="font-bold text-indigo-900 text-sm">{systemConfig?.academicYear || '2023-2024'}</span>
                </div>
              </div>
            </div>
            
            {systemConfig?.schoolLogoUrl && (
              <img src={systemConfig.schoolLogoUrl} alt="Logo" className="absolute -top-2 -right-2 h-20 w-20 opacity-10 rotate-12" />
            )}
          </div>

          {/* Grid Container - Compact heights */}
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50">
            <div className="grid grid-cols-8 gap-1.5">
              {/* Header: Time + Days */}
              <div className="bg-cyan-400 text-white rounded-lg flex items-center justify-center font-black uppercase tracking-widest text-xs h-10 shadow-sm border-b-2 border-cyan-600">
                Time
              </div>
              {dayOptions.map((day, idx) => (
                <div 
                  key={day} 
                  className={`rounded-lg flex items-center justify-center font-black uppercase tracking-widest text-xs h-10 shadow-sm border-b-2 ${
                    idx % 2 === 0 ? 'bg-pink-300 text-pink-900 border-pink-400' : 'bg-cyan-300 text-cyan-900 border-cyan-400'
                  }`}
                >
                  {day}
                </div>
              ))}

              {/* Rows - Dynamically sizing or smaller fixed heights to ensure single page */}
              {timeSlots.map((slot, rowIdx) => (
                <React.Fragment key={slot}>
                  {/* Time Row Label */}
                  <div className={`rounded-lg flex items-center justify-center font-bold text-[11px] h-14 shadow-sm border-b-2 ${
                    rowIdx % 2 === 0 ? 'bg-pink-100 text-pink-800 border-pink-200' : 'bg-cyan-100 text-cyan-800 border-cyan-200'
                  }`}>
                    {slot}
                  </div>
                  
                  {/* Day Cells */}
                  {dayOptions.map((day) => {
                    const entries = filteredRoutine.filter(r => r.day === day && `${r.startTime} - ${r.endTime}` === slot);
                    return (
                      <div key={`${day}-${slot}`} className="bg-white rounded-lg shadow-inner border border-white/50 p-1 min-h-[56px] flex flex-col items-center justify-center text-center">
                        {entries.map(entry => (
                          <div key={entry.id} className="w-full">
                            <p className="font-black text-indigo-900 text-[10px] leading-[1.1] uppercase break-words px-1">{entry.subject}</p>
                            <p className="text-[8px] text-gray-500 font-bold uppercase overflow-hidden whitespace-nowrap text-ellipsis px-1">{entry.teacher}</p>
                            {selectedClass === 'all' && (
                              <p className="text-[8px] font-black text-cyan-600 uppercase mt-0.5">{entry.className}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
          
          {/* Compact Footer */}
          <div className="p-4 flex justify-between items-end bg-white border-t border-indigo-50">
            <div className="space-y-1">
              <div className="w-48 h-px bg-indigo-900/10 mb-1"></div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-900/30">Principal Signature</p>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-bold text-indigo-900/50 uppercase tracking-widest">
                 {systemConfig?.schoolName || 'Education Management'}
               </p>
               <p className="text-[8px] text-gray-400 italic">
                 Generated on {format(new Date(), 'dd MMM yyyy')}
               </p>
            </div>
          </div>
        </div>
      </div>

      <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div>
            <h2 className="text-3xl font-bold text-white">Class Routine</h2>
            <p className="text-sidebar-foreground">Manage and view weekly class schedules.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-[200px]">
              <Select value={selectedClass} onValueChange={(val) => setSelectedClass(val || 'all')}>
                <SelectTrigger className="bg-sidebar border-border text-white">
                  <SelectValue placeholder="Filter by Class" />
                </SelectTrigger>
                <SelectContent className="bg-sidebar border-border text-white">
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={`${cls.name} - ${cls.section}`}>
                      {cls.name} - {cls.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-white">
              <Printer className="w-4 h-4 mr-2" />
              Print Routine
            </Button>
            
            {(isAdmin || isTeacher) && (
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                if (!open) {
                  setEditingRoutineId(null);
                  setNewRoutine({ day: 'Monday', className: '', subject: '', startTime: '', endTime: '', teacher: '' });
                }
                setIsDialogOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-black hover:bg-gray-200" onClick={() => {
                    setEditingRoutineId(null);
                    setNewRoutine({ day: 'Monday', className: '', subject: '', startTime: '', endTime: '', teacher: '' });
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Routine
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-sidebar border-border text-white">
                  <DialogHeader>
                    <DialogTitle>{editingRoutineId ? 'Edit Class Routine' : 'Add Class Routine'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveRoutine} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="day">Day</Label>
                        <select 
                          id="day" 
                          className="w-full flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                          value={newRoutine.day}
                          onChange={(e) => setNewRoutine({...newRoutine, day: e.target.value})}
                        >
                          {dayOptions.map(day => (
                            <option key={day} value={day} className="text-black">{day}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="className">Class Name</Label>
                        <select 
                          id="className" 
                          className="w-full flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                          value={newRoutine.className}
                          onChange={(e) => setNewRoutine({...newRoutine, className: e.target.value})}
                        >
                          <option value="" disabled className="text-black">Select Class</option>
                          {classes.map(c => (
                            <option key={c.id} value={`${c.name} - ${c.section}`} className="text-black">{c.name} - {c.section}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input 
                          id="subject" 
                          placeholder="e.g. Mathematics"
                          value={newRoutine.subject}
                          onChange={(e) => setNewRoutine({...newRoutine, subject: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="teacher">Teacher Name</Label>
                        <select 
                          id="teacher" 
                          className="w-full flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                          value={newRoutine.teacher}
                          onChange={(e) => setNewRoutine({...newRoutine, teacher: e.target.value})}
                        >
                          <option value="" disabled className="text-black">Select Teacher</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.name} className="text-black">{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input 
                          id="startTime" 
                          type="time"
                          value={newRoutine.startTime}
                          onChange={(e) => setNewRoutine({...newRoutine, startTime: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endTime">End Time</Label>
                        <Input 
                          id="endTime" 
                          type="time"
                          value={newRoutine.endTime}
                          onChange={(e) => setNewRoutine({...newRoutine, endTime: e.target.value})}
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      {editingRoutineId ? 'Save Changes' : 'Save Routine'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <Card className="bg-card border-border print:border-none print:shadow-none">
          <CardHeader className="no-print">
            <CardTitle className="text-white">
              {selectedClass === 'all' ? 'Weekly Schedule' : `Routine: ${selectedClass}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="print:p-0">
            {dayOptions.map(day => {
              const dayEntries = filteredRoutine.filter(r => r.day === day);
              if (dayEntries.length === 0) return null;
              
              return (
                <div key={day} className="mb-6">
                  <h3 className="text-xl font-semibold text-primary mb-3 no-print">{day}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden">
                    {dayEntries.map(entry => (
                      <div key={entry.id} className="bg-sidebar p-4 rounded-lg border border-border relative group">
                        {(isAdmin || isTeacher) && (
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => handleEditRoutine(entry)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteRoutine(entry.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        <p className="font-bold text-white pr-8">{entry.subject}</p>
                        <p className="text-sm text-sidebar-foreground">{entry.className}</p>
                        <p className="text-sm text-sidebar-foreground">Teacher: {entry.teacher}</p>
                        <p className="text-sm font-mono text-primary mt-2">{entry.startTime} - {entry.endTime}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
    </>
  );
}
