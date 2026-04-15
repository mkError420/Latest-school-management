import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  Plus, 
  Search, 
  CreditCard, 
  History,
  CheckCircle2,
  Clock,
  AlertCircle
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FeeRecord {
  id: string;
  studentName: string;
  amount: number;
  type: string;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
}

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

export default function Fees() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null);
  const [newFee, setNewFee] = useState({
    studentId: '',
    studentName: '',
    classId: '',
    amount: '',
    type: 'tuition',
    status: 'paid' as const,
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const q = query(collection(db, 'fees'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feeData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeeRecord[];
      setFees(feeData);
    });

    const studentsQuery = query(collection(db, 'students'), orderBy('name'));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        rollNumber: doc.data().rollNumber,
        classId: doc.data().classId
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
      unsubscribeStudents();
      unsubscribeClasses();
    };
  }, []);

  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'fees'), {
        ...newFee,
        amount: parseFloat(newFee.amount),
        createdAt: new Date().toISOString()
      });
      setIsAddDialogOpen(false);
      setNewFee({ studentId: '', studentName: '', classId: '', amount: '', type: 'tuition', status: 'paid', date: new Date().toISOString().split('T')[0] });
      toast.success('Fee record added successfully');
    } catch (error) {
      console.error('Error adding fee:', error);
      toast.error('Failed to add fee record');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Fee Collection</h1>
            <p className="text-sidebar-foreground">Manage student fees and payment history.</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger render={
              <Button className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            } />
            <DialogContent className="bg-card border-border text-foreground">
              <form onSubmit={handleAddFee}>
                <DialogHeader>
                  <DialogTitle className="text-white">Record New Payment</DialogTitle>
                  <DialogDescription className="text-sidebar-foreground">Enter payment details for the student.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Class</label>
                      <Select 
                        value={newFee.classId} 
                        onValueChange={val => setNewFee({...newFee, classId: val, studentId: '', studentName: ''})}
                      >
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue placeholder="Select Class">
                            {newFee.classId && classes.find(c => c.id === newFee.classId) 
                              ? `${classes.find(c => c.id === newFee.classId)?.name} - ${classes.find(c => c.id === newFee.classId)?.section}`
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Student Name</label>
                      <Select 
                        value={newFee.studentId} 
                        onValueChange={val => {
                          const student = students.find(s => s.id === val);
                          setNewFee({...newFee, studentId: val, studentName: student?.name || ''});
                        }}
                        disabled={!newFee.classId}
                      >
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue placeholder="Select Student">
                            {newFee.studentName || undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {students
                            .filter(s => s.classId === newFee.classId)
                            .map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.name} ({student.rollNumber})
                              </SelectItem>
                            ))}
                          {students.filter(s => s.classId === newFee.classId).length === 0 && (
                            <SelectItem value="none" disabled>No students in this class</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Amount ($)</label>
                      <Input 
                        type="number" 
                        required 
                        value={newFee.amount} 
                        onChange={e => setNewFee({...newFee, amount: e.target.value})}
                        placeholder="0.00" 
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Fee Type</label>
                      <Select value={newFee.type} onValueChange={val => setNewFee({...newFee, type: val})}>
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue placeholder="Select Type">
                            {newFee.type === 'tuition' && 'Tuition Fee'}
                            {newFee.type === 'exam' && 'Exam Fee'}
                            {newFee.type === 'library' && 'Library Fee'}
                            {newFee.type === 'transport' && 'Transport Fee'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="tuition">Tuition Fee</SelectItem>
                          <SelectItem value="exam">Exam Fee</SelectItem>
                          <SelectItem value="library">Library Fee</SelectItem>
                          <SelectItem value="transport">Transport Fee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Payment Date</label>
                      <Input 
                        type="date" 
                        required 
                        value={newFee.date} 
                        onChange={e => setNewFee({...newFee, date: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Status</label>
                      <Select value={newFee.status} onValueChange={(val: any) => setNewFee({...newFee, status: val})}>
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue placeholder="Select Status">
                            {newFee.status === 'paid' && 'Paid'}
                            {newFee.status === 'pending' && 'Pending'}
                            {newFee.status === 'overdue' && 'Overdue'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-border text-sidebar-foreground">Cancel</Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">Record Payment</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-emerald-500 mb-5">Total Collected</span>
            <div className="text-[28px] font-bold text-white mb-1">$124,500.00</div>
            <p className="text-xs text-sidebar-foreground mt-1">This academic year</p>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-amber-500 mb-5">Pending Dues</span>
            <div className="text-[28px] font-bold text-white mb-1">$12,400.00</div>
            <p className="text-xs text-sidebar-foreground mt-1">From 45 students</p>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-rose-500 mb-5">Overdue Payments</span>
            <div className="text-[28px] font-bold text-white mb-1">$3,200.00</div>
            <p className="text-xs text-sidebar-foreground mt-1">Requires immediate action</p>
          </Card>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-none">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center">
              <History className="w-4 h-4 mr-2 text-primary" />
              Recent Transactions
            </h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
              <Input placeholder="Search transactions..." className="pl-10 h-9 bg-background border-border text-foreground" />
            </div>
          </div>
          <Table>
            <TableHeader className="bg-sidebar-accent/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold text-sidebar-foreground">Date</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Student</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Fee Type</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Amount</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Status</TableHead>
                <TableHead className="text-right font-semibold text-sidebar-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.length > 0 ? (
                fees.map((fee) => (
                  <TableRow key={fee.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                    <TableCell className="text-sidebar-foreground">{format(new Date(fee.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="font-semibold text-white">{fee.studentName}</TableCell>
                    <TableCell className="capitalize text-sidebar-foreground">{fee.type}</TableCell>
                    <TableCell className="font-medium text-white">${fee.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className={cn(
                        "inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                        fee.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" :
                        fee.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                        "bg-rose-500/10 text-rose-500"
                      )}>
                        {fee.status === 'paid' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {fee.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                        {fee.status === 'overdue' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {fee.status}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:bg-sidebar-accent"
                        onClick={() => {
                          setSelectedFee(fee);
                          setIsReceiptDialogOpen(true);
                        }}
                      >
                        View Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-sidebar-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Receipt Dialog */}
        <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Receipt
              </DialogTitle>
              <DialogDescription className="text-sidebar-foreground">
                Official payment confirmation for student fees.
              </DialogDescription>
            </DialogHeader>
            
            {selectedFee && (
              <div className="space-y-6 py-4">
                <div className="flex justify-between items-start border-b border-border pb-4">
                  <div>
                    <h4 className="text-lg font-bold text-white">School Management System</h4>
                    <p className="text-xs text-sidebar-foreground">123 Education Lane, Learning City</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-sidebar-foreground uppercase tracking-wider">Receipt No.</p>
                    <p className="text-sm font-bold text-white">#{selectedFee.id.slice(-8).toUpperCase()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-sidebar-foreground uppercase tracking-wider">Student Name</p>
                    <p className="text-sm font-semibold text-white">{selectedFee.studentName}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs font-medium text-sidebar-foreground uppercase tracking-wider">Payment Date</p>
                    <p className="text-sm font-semibold text-white">{format(new Date(selectedFee.date), 'MMMM dd, yyyy')}</p>
                  </div>
                </div>

                <div className="bg-sidebar-accent/20 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-sidebar-foreground">Fee Description</span>
                    <span className="text-white font-medium capitalize">{selectedFee.type} Fee</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-sidebar-foreground">Status</span>
                    <span className={cn(
                      "font-bold uppercase text-[10px]",
                      selectedFee.status === 'paid' ? "text-emerald-500" : "text-amber-500"
                    )}>{selectedFee.status}</span>
                  </div>
                  <div className="pt-3 border-t border-border flex justify-between items-center">
                    <span className="text-base font-bold text-white">Total Amount</span>
                    <span className="text-xl font-bold text-primary">${selectedFee.amount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-[10px] text-sidebar-foreground italic">
                    This is a computer-generated receipt and does not require a physical signature.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="flex sm:justify-between gap-2">
              <Button variant="outline" onClick={() => window.print()} className="border-border text-sidebar-foreground">
                Print Receipt
              </Button>
              <Button onClick={() => setIsReceiptDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
