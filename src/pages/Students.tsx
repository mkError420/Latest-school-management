import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  UserPlus,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
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
import { collection, onSnapshot, addDoc, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  classId: string;
  status: 'active' | 'inactive';
  email: string;
}

interface Class {
  id: string;
  name: string;
  section: string;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState({
    name: '',
    rollNumber: '',
    classId: '',
    email: '',
    status: 'active' as const
  });

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

    return () => {
      unsubscribe();
      unsubscribeClasses();
    };
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'students'), {
        ...newStudent,
        createdAt: new Date().toISOString()
      });
      setIsAddDialogOpen(false);
      setNewStudent({ name: '', rollNumber: '', classId: '', email: '', status: 'active' });
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
      const studentRef = doc(db, 'students', selectedStudent.id);
      await updateDoc(studentRef, {
        name: selectedStudent.name,
        rollNumber: selectedStudent.rollNumber,
        classId: selectedStudent.classId,
        email: selectedStudent.email,
        status: selectedStudent.status
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

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Student Management</h1>
            <p className="text-sidebar-foreground">View and manage student records.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-border text-sidebar-foreground hover:bg-sidebar-accent">
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Full Name</label>
                      <Input 
                        required 
                        value={newStudent.name} 
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
                          value={newStudent.rollNumber} 
                          onChange={e => setNewStudent({...newStudent, rollNumber: e.target.value})}
                          placeholder="S101" 
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Class</label>
                        <Select 
                          value={newStudent.classId} 
                          onValueChange={val => setNewStudent({...newStudent, classId: val})}
                        >
                          <SelectTrigger className="w-full bg-background border-border">
                            <SelectValue placeholder="Select Class">
                              {newStudent.classId && classes.find(c => c.id === newStudent.classId) 
                                ? `${classes.find(c => c.id === newStudent.classId)?.name} - ${classes.find(c => c.id === newStudent.classId)?.section}`
                                : undefined}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name} - {cls.section}
                              </SelectItem>
                            ))}
                            {classes.length === 0 && (
                              <SelectItem value="none" disabled>No classes available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Email Address</label>
                      <Input 
                        type="email" 
                        required 
                        value={newStudent.email} 
                        onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                        placeholder="john@school.com" 
                        className="bg-background border-border"
                      />
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

        <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
            <Input 
              placeholder="Search by name or roll number..." 
              className="pl-10 bg-background border-border text-foreground"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="border-border text-sidebar-foreground hover:bg-sidebar-accent">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-none">
          <Table>
            <TableHeader className="bg-sidebar-accent/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold text-sidebar-foreground">Roll No.</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Name</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Class</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Email</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Status</TableHead>
                <TableHead className="text-right font-semibold text-sidebar-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow key={student.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                    <TableCell className="font-medium text-sidebar-foreground">{student.rollNumber}</TableCell>
                    <TableCell className="font-semibold text-white">{student.name}</TableCell>
                    <TableCell className="text-sidebar-foreground">
                      {classes.find(c => c.id === student.classId)?.name} - {classes.find(c => c.id === student.classId)?.section || student.classId}
                    </TableCell>
                    <TableCell className="text-sidebar-foreground">{student.email}</TableCell>
                    <TableCell>
                      <div className={cn(
                        "inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                        student.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"
                      )}>
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
                              onSelect={() => {
                                setSelectedStudent(student);
                                setIsViewDialogOpen(true);
                              }}
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
                              onSelect={() => {
                                setSelectedStudent(student);
                                setIsEditDialogOpen(true);
                              }}
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
                              onSelect={() => {
                                setSelectedStudent(student);
                                setIsDeleteDialogOpen(true);
                              }}
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
                  <TableCell colSpan={6} className="h-24 text-center text-sidebar-foreground">
                    No students found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-3 gap-4">
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
                  <div className="text-sm font-medium text-sidebar-foreground">Email:</div>
                  <div className="col-span-2 text-white">{selectedStudent.email}</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-sm font-medium text-sidebar-foreground">Status:</div>
                  <div className="col-span-2">
                    <Badge variant={selectedStudent.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                      {selectedStudent.status}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Full Name</label>
                    <Input 
                      required 
                      value={selectedStudent.name} 
                      onChange={e => setSelectedStudent({...selectedStudent, name: e.target.value})}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Roll Number</label>
                      <Input 
                        required 
                        value={selectedStudent.rollNumber} 
                        onChange={e => setSelectedStudent({...selectedStudent, rollNumber: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Class</label>
                      <Select 
                        value={selectedStudent.classId} 
                        onValueChange={val => setSelectedStudent({...selectedStudent, classId: val})}
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Status</label>
                    <Select 
                      value={selectedStudent.status} 
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
