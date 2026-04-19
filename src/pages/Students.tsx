import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  Activity,
  Award,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Eye,
  Filter,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  Trash2,
  TrendingUp,
  Upload,
  User as UserIcon,
  UserCheck,
  UserPlus,
  X
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { collection, onSnapshot, addDoc, query, orderBy, deleteDoc, doc, updateDoc, where, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  studentId: string;
  imageUrl?: string;
  name: string;
  rollNumber: string;
  classId: string;
  status: 'active' | 'inactive';
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  admissionDate: string;
  bloodGroup?: string;
}

interface ResultData {
  id: string;
  studentId: string;
  examId: string;
  marksObtained: number;
  grade: string;
  [key: string]: any;
}

interface Class {
  id: string;
  name: string;
  section: string;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [performanceData, setPerformanceData] = useState<{
    attendance: any[];
    results: any[];
  } | null>(null);
  const [performanceFilters, setPerformanceFilters] = useState({
    attendanceMonth: format(new Date(), 'yyyy-MM'),
    examType: 'all',
  });
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    rollNumber: '',
    classId: '',
    guardianName: '',
    guardianRelation: '',
    guardianPhone: '',
    admissionDate: new Date().toISOString().split('T')[0],
    status: 'active' as const,
    imageUrl: '',
    bloodGroup: ''
  });

  useEffect(() => {
    if (isViewDialogOpen && selectedStudent) {
      fetchStudentPerformance(selectedStudent.id);
    } else {
      setPerformanceData(null);
    }
  }, [isViewDialogOpen, selectedStudent]);

  const fetchStudentPerformance = async (studentId: string) => {
    setLoadingPerformance(true);
    try {
      // Fetch attendance
      const attQuery = query(collection(db, 'attendance'), where('studentId', '==', studentId));
      const attSnap = await getDocs(attQuery);
      const attendance = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch results and join with exams
      const resQuery = query(collection(db, 'results'), where('studentId', '==', studentId));
      const resSnap = await getDocs(resQuery);
      const resultsData = resSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ResultData[];

      // Get exam details for these results
      const examIds = [...new Set(resultsData.map(r => r.examId))];
      const examsData: Record<string, any> = {};
      
      if (examIds.length > 0) {
        // Simple fetch for exams (could be optimized with chunked queries if many)
        const examsSnap = await getDocs(collection(db, 'exams'));
        examsSnap.docs.forEach(doc => {
          if (examIds.includes(doc.id)) {
            examsData[doc.id] = { id: doc.id, ...doc.data() };
          }
        });
      }

      const resultsWithExams = resultsData.map(r => ({
        ...r,
        exam: examsData[r.examId] || null
      }));

      setPerformanceData({
        attendance,
        results: resultsWithExams
      });
    } catch (error) {
      console.error('Error fetching performance:', error);
    } finally {
      setLoadingPerformance(false);
    }
  };

  const filteredStats = React.useMemo(() => {
    if (!performanceData) return null;

    // Filter Attendance
    const [year, month] = performanceFilters.attendanceMonth.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const filteredAtt = performanceData.attendance.filter(a => {
      const d = new Date(a.date);
      return d >= start && d <= end;
    });

    const attTotal = filteredAtt.length;
    const attPresent = filteredAtt.filter(a => a.status === 'present').length;
    const attendanceRate = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

    // Filter Results
    const filteredRes = performanceData.results.filter(r => {
      if (performanceFilters.examType !== 'all') {
        return r.exam?.type === performanceFilters.examType;
      }
      return true;
    });

    const resTotal = filteredRes.length;
    const resMarksSum = filteredRes.reduce((sum, r) => sum + (r.marksObtained || 0), 0);
    const averageMarks = resTotal > 0 ? Math.round(resMarksSum / resTotal) : 0;
    const recentGrade = filteredRes.length > 0 ? filteredRes[0].grade : 'N/A';

    return {
      attendanceRate,
      averageMarks,
      recentGrade,
      totalExams: resTotal,
      totalAttendanceDays: attTotal
    };
  }, [performanceData, performanceFilters]);

  const handlePrintProfile = () => {
    if (!selectedStudent) return;
    const printContent = document.querySelector('.print-profile-content');
    if (!printContent) return;

    const win = window.open('', '', 'height=600,width=800');
    if (!win) return;

    const classInfo = classes.find(c => c.id === selectedStudent.classId);
    const className = classInfo ? `${classInfo.name}${classInfo.section ? ` - ${classInfo.section}` : ''}` : 'N/A';

    const monthLabel = format(new Date(performanceFilters.attendanceMonth + '-01'), 'MMMM yyyy');
    const examTypeLabel = performanceFilters.examType === 'all' 
      ? 'All Exams' 
      : performanceFilters.examType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const schoolLogo = systemConfig?.schoolLogoUrl;
    const schoolName = systemConfig?.schoolName || 'EDUFLOW MANAGEMENT SYSTEM';

    win.document.write(`
      <html>
        <head>
          <title>Student Profile - ${selectedStudent.name}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; position: relative; }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              opacity: 0.05;
              font-size: 80px;
              color: #000;
              z-index: -1;
              pointer-events: none;
              text-transform: uppercase;
              font-weight: 900;
              width: 100%;
              text-align: center;
            }
            .logo-watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              opacity: 0.03;
              width: 500px;
              z-index: -2;
              pointer-events: none;
            }
            .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; position: relative; }
            .school-logo { height: 60px; margin-bottom: 10px; }
            .profile { display: flex; gap: 40px; }
            .photo { width: 150px; height: 150px; border-radius: 10px; border: 1px solid #ddd; object-fit: cover; }
            .details { flex: 1; }
            .row { display: grid; grid-template-columns: 150px 1fr; margin-bottom: 10px; border-bottom: 1px solid #f9f9f9; padding-bottom: 10px; }
            .label { font-weight: bold; color: #666; text-transform: uppercase; font-size: 12px; }
            .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 40px; }
            .stat-card { padding: 20px; border: 1px solid #eee; border-radius: 10px; text-align: center; background: white; }
            .stat-sub { font-size: 10px; color: #999; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; display: block; }
            .stat-val { font-size: 24px; font-weight: 900; color: #000; margin-top: 5px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="watermark">${schoolName}</div>
          ${schoolLogo ? `<img src="${schoolLogo}" class="logo-watermark" />` : ''}
          <div class="header">
            ${schoolLogo ? `<img src="${schoolLogo}" class="school-logo" />` : ''}
            <h1>${schoolName}</h1>
            <p>Academic Year: ${systemConfig?.academicYear || '2024-2025'}</p>
          </div>
          <div class="profile">
            ${selectedStudent.imageUrl ? `<img src="${selectedStudent.imageUrl}" class="photo" />` : '<div class="photo" style="background:#eee; display:flex; align-items:center; justify-content:center;">No Photo</div>'}
            <div class="details">
              <div class="row"><div class="label">Student ID</div><div>${selectedStudent.studentId}</div></div>
              <div class="row"><div class="label">Full Name</div><div>${selectedStudent.name}</div></div>
              <div class="row"><div class="label">Guardian</div><div>${selectedStudent.guardianName} (${selectedStudent.guardianRelation})</div></div>
              <div class="row"><div class="label">Blood Group</div><div>${selectedStudent.bloodGroup || 'Not Specified'}</div></div>
              <div class="row"><div class="label">Roll Number</div><div>${selectedStudent.rollNumber}</div></div>
              <div class="row"><div class="label">Class</div><div>${className}</div></div>
              <div class="row"><div class="label">Guardian Phone</div><div>${selectedStudent.guardianPhone}</div></div>
              <div class="row"><div class="label">Admission Date</div><div>${selectedStudent.admissionDate}</div></div>
            </div>
          </div>
          <div class="stats">
            <div class="stat-card">
              <span class="stat-sub">${monthLabel}</span>
              <div class="label">Attendance rate</div>
              <div class="stat-val">${filteredStats?.attendanceRate || 0}%</div>
            </div>
            <div class="stat-card">
              <span class="stat-sub">${examTypeLabel}</span>
              <div class="label">Result (Avg)</div>
              <div class="stat-val">${filteredStats?.averageMarks || 0} PTS</div>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (isEdit && selectedStudent) {
        setSelectedStudent({ ...selectedStudent, imageUrl: base64String });
      } else {
        setNewStudent({ ...newStudent, imageUrl: base64String });
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const q = query(collection(db, 'students'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(studentData);
    });

    const classesQuery = query(collection(db, 'classes'), orderBy('name'));
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      const classData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Class[];
      setClasses(classData);
    });

    const unsubscribeConfig = onSnapshot(doc(db, 'config', 'system'), (doc) => {
      if (doc.exists()) {
        setSystemConfig(doc.data());
      }
    });

    return () => {
      unsubscribe();
      unsubscribeClasses();
      unsubscribeConfig();
    };
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const year = new Date(newStudent.admissionDate).getFullYear();
      const selectedClass = classes.find(c => c.id === newStudent.classId);
      const classNumber = selectedClass?.name.replace(/\D/g, '') || '';
      const studentId = `${year}${classNumber}${newStudent.rollNumber}`;

      await addDoc(collection(db, 'students'), { 
        ...newStudent,
        studentId,
        createdAt: new Date().toISOString()
      });
      setIsAddDialogOpen(false);
      setNewStudent({ 
        name: '', 
        rollNumber: '', 
        classId: '', 
        guardianName: '',
        guardianRelation: '',
        guardianPhone: '', 
        admissionDate: new Date().toISOString().split('T')[0],
        status: 'active',
        imageUrl: '',
        bloodGroup: ''
      });
      toast.success('Student added successfully');
    } catch (error) {
      console.error('Error adding student:', error);
      if (error instanceof Error && error.message.includes('permission-denied')) {
        toast.error('Permission denied. You must be an admin or teacher.');
      } else {
        toast.error('Failed to add student');
      }
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      const year = new Date(selectedStudent.admissionDate).getFullYear();
      const selectedClass = classes.find(c => c.id === selectedStudent.classId);
      const classNumber = selectedClass?.name.replace(/\D/g, '') || '';
      const studentId = `${year}${classNumber}${selectedStudent.rollNumber}`;

      const studentRef = doc(db, 'students', selectedStudent.id);
      await updateDoc(studentRef, {
        name: selectedStudent.name,
        rollNumber: selectedStudent.rollNumber,
        studentId,
        imageUrl: selectedStudent.imageUrl || '',
        classId: selectedStudent.classId,
        guardianName: selectedStudent.guardianName,
        guardianRelation: selectedStudent.guardianRelation,
        guardianPhone: selectedStudent.guardianPhone,
        admissionDate: selectedStudent.admissionDate,
        status: selectedStudent.status,
        bloodGroup: selectedStudent.bloodGroup || ''
      });
      setIsEditDialogOpen(false);
      toast.success('Student updated successfully');
    } catch (error) {
      console.error('Error updating student:', error);
      if (error instanceof Error && error.message.includes('permission-denied')) {
        toast.error('Permission denied. You do not have rights to edit this record.');
      } else {
        toast.error('Failed to update student');
      }
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    try {
      await deleteDoc(doc(db, 'students', selectedStudent.id));
      setIsDeleteDialogOpen(false);
      setSelectedStudent(null);
      toast.success('Student record deleted');
    } catch (error) {
      console.error('Error deleting student:', error);
      if (error instanceof Error && error.message.includes('permission-denied')) {
        toast.error('Permission denied. You do not have rights to delete this record.');
      } else {
        toast.error('Failed to delete student');
      }
    }
  };

  const handleExportStudents = () => {
    if (filteredStudents.length === 0) {
      toast.error('No students to export');
      return;
    }

    const headers = ['Student ID', 'Roll Number', 'Name', 'Class', 'Guardian Name', 'Relation', 'Guardian Phone', 'Blood Group', 'Status'];
    const csvData = filteredStudents.map(student => {
      const cls = classes.find(c => c.id === student.classId);
      const classInfo = cls ? `${cls.name}${cls.section ? ` - ${cls.section}` : ''}` : student.classId;
      return [
        student.studentId || '',
        student.rollNumber,
        student.name,
        classInfo,
        student.guardianName || '',
        student.guardianRelation || '',
        student.guardianPhone,
        student.bloodGroup || '',
        student.status
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Students exported successfully');
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClassId === 'all' || student.classId === selectedClassId;
    return matchesSearch && matchesClass;
  });

  // Group students by class
  const groupedStudents = classes.reduce((acc, cls) => {
    const classStudents = filteredStudents
      .filter(s => s.classId === cls.id)
      .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));
    
    if (classStudents.length > 0 || selectedClassId === cls.id) {
      acc.push({
        class: cls,
        students: classStudents
      });
    }
    return acc;
  }, [] as { class: Class; students: Student[] }[]);

  // Add a group for students without a class if any
  const unassignedStudents = filteredStudents.filter(s => !classes.find(c => c.id === s.classId));
  if (unassignedStudents.length > 0 && (selectedClassId === 'all' || selectedClassId === 'unassigned')) {
    groupedStudents.push({
      class: { id: 'unassigned', name: 'Unassigned', section: 'N/A' },
      students: unassignedStudents
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Student Management</h1>
            <p className="text-sidebar-foreground">View and manage student records.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-border text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleExportStudents}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger render={
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              } />
              <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
                <form onSubmit={handleAddStudent}>
                  <DialogHeader>
                    <DialogTitle className="text-white">Add New Student</DialogTitle>
                    <DialogDescription className="text-sidebar-foreground">
                      Enter the student's details to create a new record.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="flex flex-col items-center justify-center gap-4 mb-2">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-sidebar-accent/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                          {newStudent.imageUrl ? (
                            <img src={newStudent.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-10 h-10 text-sidebar-foreground opacity-30" />
                          )}
                        </div>
                        <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
                          <Camera className="w-3.5 h-3.5" />
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e)} />
                        </label>
                        {newStudent.imageUrl && (
                          <button 
                            type="button"
                            onClick={() => setNewStudent({...newStudent, imageUrl: ''})}
                            className="absolute -top-1 -right-1 p-1 bg-card border border-border text-rose-500 rounded-full hover:bg-sidebar-accent transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] text-sidebar-foreground uppercase font-bold tracking-widest">Student Photograph</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Full Name</label>
                      <Input 
                        required 
                        value={newStudent.name || ''} 
                        onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                        placeholder="John Doe" 
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Roll Number</label>
                        <Input 
                          required 
                          value={newStudent.rollNumber || ''} 
                          onChange={e => setNewStudent({...newStudent, rollNumber: e.target.value})}
                          placeholder="S101" 
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Class</label>
                        <Select 
                          value={newStudent.classId || ''} 
                          onValueChange={val => setNewStudent({...newStudent, classId: val || ''})}
                        >
                          <SelectTrigger className="w-full bg-background border-border">
                            <SelectValue placeholder="Select Class">
                              {newStudent.classId && classes.find(c => c.id === newStudent.classId) 
                                ? (() => {
                                    const c = classes.find(cl => cl.id === newStudent.classId);
                                    return c ? `${c.name}${c.section ? ` - ${c.section}` : ''}` : undefined;
                                  })()
                                : undefined}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name}{cls.section ? ` - ${cls.section}` : ''}
                              </SelectItem>
                            ))}
                            {classes.length === 0 && (
                              <SelectItem value="none" disabled>No classes available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Guardian Name</label>
                        <Input 
                          required 
                          value={newStudent.guardianName || ''} 
                          onChange={e => setNewStudent({...newStudent, guardianName: e.target.value})}
                          placeholder="Parent Name" 
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Relation</label>
                        <Select 
                          value={newStudent.guardianRelation || ''} 
                          onValueChange={val => setNewStudent({...newStudent, guardianRelation: val || ''})}
                        >
                          <SelectTrigger className="w-full bg-background border-border">
                            <SelectValue placeholder="Relation" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="Father">Father</SelectItem>
                            <SelectItem value="Mother">Mother</SelectItem>
                            <SelectItem value="Brother">Brother</SelectItem>
                            <SelectItem value="Sister">Sister</SelectItem>
                            <SelectItem value="Uncle">Uncle</SelectItem>
                            <SelectItem value="Aunt">Aunt</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Guardian Phone Number</label>
                      <Input 
                        type="tel" 
                        required 
                        value={newStudent.guardianPhone || ''} 
                        onChange={e => setNewStudent({...newStudent, guardianPhone: e.target.value})}
                        placeholder="+880 1XXX XXXXXX" 
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Admission Date</label>
                        <Input 
                          type="date" 
                          required 
                          value={newStudent.admissionDate || ''} 
                          onChange={e => setNewStudent({...newStudent, admissionDate: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Blood Group</label>
                        <Select 
                          value={newStudent.bloodGroup || ''} 
                          onValueChange={val => setNewStudent({...newStudent, bloodGroup: val || ''})}
                        >
                          <SelectTrigger className="w-full bg-background border-border">
                            <SelectValue placeholder="Group" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem>
                            <SelectItem value="AB-">AB-</SelectItem>
                            <SelectItem value="O+">O+</SelectItem>
                            <SelectItem value="O-">O-</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-border text-sidebar-foreground">Cancel</Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">Save Student</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-xl border border-border">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
            <Input 
              placeholder="Search by name or roll number..." 
              className="pl-10 bg-background border-border text-foreground"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={selectedClassId} onValueChange={(val) => setSelectedClassId(val || 'all')}>
              <SelectTrigger className="bg-background border-border text-foreground">
                <div className="flex items-center">
                  <Filter className="w-4 h-4 mr-2 text-sidebar-foreground" />
                  <SelectValue placeholder="Filter by Class">
                    {selectedClassId === 'all' && 'All Classes'}
                    {selectedClassId === 'unassigned' && 'Unassigned'}
                    {selectedClassId !== 'all' && selectedClassId !== 'unassigned' && classes.find(c => c.id === selectedClassId)
                      ? (() => {
                          const c = classes.find(cl => cl.id === selectedClassId);
                          return c ? `${c.name}${c.section ? ` - ${c.section}` : ''}` : undefined;
                        })()
                      : undefined}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}{cls.section ? ` - ${cls.section}` : ''}</SelectItem>
                ))}
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-sidebar-foreground hover:text-white"
            onClick={() => {
              setSearchTerm('');
              setSelectedClassId('all');
            }}
          >
            Reset
          </Button>
        </div>

        <div className="space-y-8">
          {groupedStudents.length > 0 ? (
            groupedStudents.map((group) => (
              <div key={group.class.id} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-primary rounded-full" />
                    <h2 className="text-lg font-bold text-white">
                      {group.class.name} {group.class.section && <span className="text-sidebar-foreground font-normal text-sm ml-2">Section: {group.class.section}</span>}
                    </h2>
                    <Badge variant="outline" className="ml-2 border-primary/30 text-primary bg-primary/5">
                      {group.students.length} Students
                    </Badge>
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-sidebar-accent/30">
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="w-16 font-semibold text-sidebar-foreground">SL</TableHead>
                        <TableHead className="w-32 font-semibold text-sidebar-foreground">Student ID</TableHead>
                        <TableHead className="font-semibold text-sidebar-foreground">Student Name</TableHead>
                        <TableHead className="font-semibold text-sidebar-foreground">Guardian Phone</TableHead>
                        <TableHead className="w-32 font-semibold text-sidebar-foreground">Status</TableHead>
                        <TableHead className="text-right font-semibold text-sidebar-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.students.length > 0 ? (
                        group.students.map((student, index) => (
                          <TableRow key={student.id} className="border-border hover:bg-sidebar-accent/20 transition-colors group">
                            <TableCell className="text-sidebar-foreground font-mono text-xs">{index + 1}</TableCell>
                            <TableCell className="font-bold text-primary tracking-tighter">{student.studentId || 'N/A'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-sidebar-accent/50 border border-border flex-shrink-0 overflow-hidden">
                                  {student.imageUrl ? (
                                    <img src={student.imageUrl} alt={student.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-sidebar-foreground/50 text-xs font-bold">
                                      {student.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-white group-hover:text-primary transition-colors">{student.name}</span>
                                  <span className="text-[10px] text-sidebar-foreground uppercase tracking-wider">Roll: {student.rollNumber}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sidebar-foreground">{student.guardianPhone}</TableCell>
                            <TableCell>
                              <div className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                student.status === 'active' 
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                  : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                              )}>
                                <span className={cn(
                                  "w-1 h-1 rounded-full mr-1.5",
                                  student.status === 'active' ? "bg-emerald-500" : "bg-slate-500"
                                )} />
                                {student.status}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger render={
                                  <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                } />
                                <DropdownMenuContent align="end" className="bg-card border-border text-foreground min-w-[160px]">
                                  <DropdownMenuGroup>
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem 
                                      className="hover:bg-sidebar-accent cursor-pointer"
                                      onClick={() => {
                                        setSelectedStudent(student);
                                        setIsViewDialogOpen(true);
                                      }}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="hover:bg-sidebar-accent cursor-pointer"
                                      onClick={() => {
                                        setSelectedStudent(student);
                                        setIsEditDialogOpen(true);
                                      }}
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-rose-500 hover:bg-sidebar-accent cursor-pointer"
                                      onClick={() => {
                                        setSelectedStudent(student);
                                        setIsDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Record
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-sidebar-foreground italic">
                            No students in this class matching your search.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center bg-card border border-border rounded-xl">
              <Search className="w-12 h-12 text-sidebar-foreground mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-semibold text-white">No Students Found</h3>
              <p className="text-sidebar-foreground">Try adjusting your search or filters.</p>
              <Button 
                variant="link" 
                className="text-primary mt-2"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedClassId('all');
                }}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>

        {/* View Student Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-white">Student Profile</DialogTitle>
              <DialogDescription className="text-sidebar-foreground">
                Detailed information about the student.
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4 py-4 print-profile-content">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-xl mb-3">
                    {selectedStudent.imageUrl ? (
                      <img src={selectedStudent.imageUrl} alt={selectedStudent.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-sidebar-accent flex items-center justify-center text-primary text-2xl font-black">
                        {selectedStudent.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-bold">{selectedStudent.name}</h3>
                  <span className="text-[10px] text-primary uppercase font-black tracking-widest">{selectedStudent.studentId}</span>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-4">
                  <div className="text-sm font-medium text-sidebar-foreground">Name:</div>
                  <div className="col-span-2 text-white">{selectedStudent.name}</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-sm font-medium text-sidebar-foreground">Roll No:</div>
                  <div className="col-span-2 text-white">{selectedStudent.rollNumber}</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-sm font-medium text-sidebar-foreground">Class:</div>
                  <div className="col-span-2 text-white">
                    {classes.find(c => c.id === selectedStudent.classId)?.name} - {classes.find(c => c.id === selectedStudent.classId)?.section}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-sm font-medium text-sidebar-foreground">Guardian:</div>
                  <div className="col-span-2 text-white">
                    {selectedStudent.guardianName} ({selectedStudent.guardianRelation})
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-sm font-medium text-sidebar-foreground">Guardian Phone:</div>
                  <div className="col-span-2 text-white">{selectedStudent.guardianPhone}</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-sm font-medium text-sidebar-foreground">Blood Group:</div>
                  <div className="col-span-2">
                    <Badge variant="outline" className={cn(
                      "uppercase text-[10px] font-bold tracking-widest px-2 py-0.5",
                      selectedStudent.bloodGroup ? "border-rose-500/30 text-rose-500 bg-rose-500/5" : "border-white/10 text-white/40"
                    )}>
                      {selectedStudent.bloodGroup || 'Not Defined'}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-sm font-medium text-sidebar-foreground">Admission Date:</div>
                  <div className="col-span-2 text-white">{selectedStudent.admissionDate}</div>
                </div>
                <div className="space-y-6 mt-6 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Performance Analytics</h4>
                    <div className="flex gap-2">
                      <Select 
                        value={performanceFilters.attendanceMonth} 
                        onValueChange={(val: string | null) => val && setPerformanceFilters(prev => ({ ...prev, attendanceMonth: val }))}
                      >
                        <SelectTrigger className="h-7 text-[9px] uppercase font-bold tracking-widest bg-white/5 border-white/10 w-32">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {Array.from({ length: 12 }).map((_, i) => {
                            const d = subMonths(new Date(), i);
                            const val = format(d, 'yyyy-MM');
                            const label = format(d, 'MMMM yyyy');
                            return <SelectItem key={val} value={val} className="text-[10px] uppercase font-bold">{label}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>

                      <Select 
                        value={performanceFilters.examType} 
                        onValueChange={(val: string | null) => val && setPerformanceFilters(prev => ({ ...prev, examType: val }))}
                      >
                        <SelectTrigger className="h-7 text-[9px] uppercase font-bold tracking-widest bg-white/5 border-white/10 w-32">
                          <SelectValue placeholder="Exam Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="all" className="text-[10px] uppercase font-bold">All Exams</SelectItem>
                          <SelectItem value="class_test" className="text-[10px] uppercase font-bold">Class Test</SelectItem>
                          <SelectItem value="midterm" className="text-[10px] uppercase font-bold">Midterm</SelectItem>
                          <SelectItem value="final" className="text-[10px] uppercase font-bold">Final</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex flex-col items-center text-center group hover:bg-emerald-500/10 transition-colors">
                      <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500 mb-1.5">
                        <UserCheck className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[9px] text-sidebar-foreground uppercase font-black tracking-widest mb-0.5">Attendance</span>
                      {loadingPerformance ? (
                        <div className="h-5 w-10 bg-white/5 animate-pulse rounded" />
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="text-lg font-black text-emerald-500 leading-none">
                            {filteredStats?.attendanceRate}%
                          </div>
                          <span className="text-[8px] text-sidebar-foreground font-medium uppercase opacity-60">
                            {filteredStats?.totalAttendanceDays} Days
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex flex-col items-center text-center group hover:bg-primary/10 transition-colors">
                      <div className="p-1.5 bg-primary/10 rounded-lg text-primary mb-1.5">
                        <Award className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[9px] text-sidebar-foreground uppercase font-black tracking-widest mb-0.5">Result (Avg)</span>
                      {loadingPerformance ? (
                        <div className="h-5 w-10 bg-white/5 animate-pulse rounded" />
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="text-lg font-black text-primary leading-none">
                            {filteredStats?.averageMarks || 0} <span className="text-[9px] font-bold text-sidebar-foreground">PTS</span>
                          </div>
                          <span className="text-[8px] text-sidebar-foreground font-medium uppercase opacity-60">
                            {filteredStats?.totalExams} Exams
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {filteredStats && filteredStats.totalExams > 0 && (
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] text-sidebar-foreground uppercase font-bold tracking-widest">Performance Context</span>
                      </div>
                      <Badge variant="outline" className="border-primary/20 text-primary uppercase text-[10px] font-black">
                        Recent Grade: {filteredStats.recentGrade}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="flex sm:justify-between items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handlePrintProfile}
                className="border-primary/20 text-primary hover:bg-primary/10 h-9 px-4 uppercase text-[10px] font-black tracking-widest gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Profile
              </Button>
              <Button onClick={() => setIsViewDialogOpen(false)} className="h-9 px-4">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Student Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
            <form onSubmit={handleEditStudent}>
              <DialogHeader>
                <DialogTitle className="text-white">Edit Student Details</DialogTitle>
                <DialogDescription className="text-sidebar-foreground">
                  Update the student's information.
                </DialogDescription>
              </DialogHeader>
              {selectedStudent && (
                <div className="grid gap-4 py-4">
                  <div className="flex flex-col items-center justify-center gap-4 mb-2">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full bg-sidebar-accent/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                        {selectedStudent.imageUrl ? (
                          <img src={selectedStudent.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-10 h-10 text-sidebar-foreground opacity-30" />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
                        <Camera className="w-3.5 h-3.5" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
                      </label>
                      {selectedStudent.imageUrl && (
                        <button 
                          type="button"
                          onClick={() => setSelectedStudent({...selectedStudent, imageUrl: ''})}
                          className="absolute -top-1 -right-1 p-1 bg-card border border-border text-rose-500 rounded-full hover:bg-sidebar-accent transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-sidebar-foreground uppercase font-bold tracking-widest">Update Photograph</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Full Name</label>
                    <Input 
                      required 
                      value={selectedStudent.name || ''} 
                      onChange={e => setSelectedStudent({...selectedStudent, name: e.target.value})}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Roll Number</label>
                      <Input 
                        required 
                        value={selectedStudent.rollNumber || ''} 
                        onChange={e => setSelectedStudent({...selectedStudent, rollNumber: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Class</label>
                      <Select 
                        value={selectedStudent.classId || ''} 
                        onValueChange={val => setSelectedStudent({...selectedStudent, classId: val || ''})}
                      >
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue placeholder="Select Class">
                            {selectedStudent.classId && classes.find(c => c.id === selectedStudent.classId)
                              ? `${classes.find(c => c.id === selectedStudent.classId)?.name} - ${classes.find(c => c.id === selectedStudent.classId)?.section}`
                              : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name} - {cls.section}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Guardian Name</label>
                      <Input 
                        required 
                        value={selectedStudent.guardianName || ''} 
                        onChange={e => setSelectedStudent({...selectedStudent, guardianName: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Relation</label>
                      <Select 
                        value={selectedStudent.guardianRelation || ''} 
                        onValueChange={val => setSelectedStudent({...selectedStudent, guardianRelation: val || ''})}
                      >
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue placeholder="Relation" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="Father">Father</SelectItem>
                          <SelectItem value="Mother">Mother</SelectItem>
                          <SelectItem value="Brother">Brother</SelectItem>
                          <SelectItem value="Sister">Sister</SelectItem>
                          <SelectItem value="Uncle">Uncle</SelectItem>
                          <SelectItem value="Aunt">Aunt</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Guardian Phone Number</label>
                    <Input 
                      type="tel"
                      required 
                      value={selectedStudent.guardianPhone || ''} 
                      onChange={e => setSelectedStudent({...selectedStudent, guardianPhone: e.target.value})}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Admission Date</label>
                      <Input 
                        type="date"
                        required 
                        value={selectedStudent.admissionDate || ''} 
                        onChange={e => setSelectedStudent({...selectedStudent, admissionDate: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Blood Group</label>
                      <Select 
                        value={selectedStudent.bloodGroup || ''} 
                        onValueChange={val => setSelectedStudent({...selectedStudent, bloodGroup: val || ''})}
                      >
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue placeholder="Group" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Status</label>
                    <Select 
                      value={selectedStudent.status || ''} 
                      onValueChange={(val: any) => setSelectedStudent({...selectedStudent, status: val})}
                    >
                      <SelectTrigger className="w-full bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-white">Confirm Deletion</DialogTitle>
              <DialogDescription className="text-sidebar-foreground">
                Are you sure you want to delete the record for <span className="text-white font-semibold">{selectedStudent?.name}</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteStudent}>Delete Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
