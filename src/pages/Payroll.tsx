import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  Banknote, 
  Search, 
  Plus, 
  Download,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  MoreHorizontal,
  Trash2,
  Eye,
  FileText
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Staff {
  id: string;
  name: string;
  role: string;
  salary: number;
  joinDate: string;
  status: 'active' | 'inactive';
}

interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  month: string;
  amount: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  status: 'paid' | 'pending';
  paymentDate: string;
  paymentMethod: string;
}

export default function Payroll() {
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isProcessPayrollOpen, setIsProcessPayrollOpen] = useState(false);
  const [isViewPayslipOpen, setIsViewPayslipOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);

  const [newStaff, setNewStaff] = useState({
    name: '',
    role: 'Teacher',
    salary: '',
    joinDate: new Date().toISOString().split('T')[0],
    status: 'active' as const
  });

  const [newPayroll, setNewPayroll] = useState({
    staffId: '',
    month: format(new Date(), 'MMMM yyyy'),
    bonus: '0',
    deductions: '0',
    status: 'paid' as const,
    paymentMethod: 'Bank Transfer'
  });

  useEffect(() => {
    const q = query(collection(db, 'payroll'), orderBy('month', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const payrollData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PayrollRecord[];
      setPayroll(payrollData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'payroll');
    });

    const staffQ = query(collection(db, 'staff'), orderBy('name'));
    const unsubscribeStaff = onSnapshot(staffQ, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Staff[];
      setStaff(staffData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'staff');
    });

    return () => {
      unsubscribe();
      unsubscribeStaff();
    };
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'staff'), {
        ...newStaff,
        salary: Number(newStaff.salary),
        createdAt: new Date().toISOString()
      });
      setIsAddStaffOpen(false);
      setNewStaff({ name: '', role: 'Teacher', salary: '', joinDate: new Date().toISOString().split('T')[0], status: 'active' });
      toast.success('Staff member added successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'staff');
    }
  };

  const handleProcessPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedStaff = staff.find(s => s.id === newPayroll.staffId);
    if (!selectedStaff) return;

    try {
      const amount = selectedStaff.salary;
      const bonus = Number(newPayroll.bonus);
      const deductions = Number(newPayroll.deductions);
      const netSalary = amount + bonus - deductions;

      await addDoc(collection(db, 'payroll'), {
        staffId: selectedStaff.id,
        staffName: selectedStaff.name,
        role: selectedStaff.role,
        month: newPayroll.month,
        amount,
        bonus,
        deductions,
        netSalary,
        status: newPayroll.status,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: newPayroll.paymentMethod,
        createdAt: new Date().toISOString()
      });

      setIsProcessPayrollOpen(false);
      setNewPayroll({ staffId: '', month: format(new Date(), 'MMMM yyyy'), bonus: '0', deductions: '0', status: 'paid', paymentMethod: 'Bank Transfer' });
      toast.success('Payroll processed successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'payroll');
    }
  };

  const handleDeletePayroll = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payroll record?')) return;
    try {
      await deleteDoc(doc(db, 'payroll', id));
      toast.success('Payroll record deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `payroll/${id}`);
    }
  };

  const handleExportCSV = () => {
    if (payroll.length === 0) return;
    const headers = ['Staff Name', 'Role', 'Month', 'Base Salary', 'Bonus', 'Deductions', 'Net Salary', 'Status', 'Date'];
    const rows = payroll.map(r => [
      `"${r.staffName}"`,
      `"${r.role}"`,
      `"${r.month}"`,
      r.amount,
      r.bonus,
      r.deductions,
      r.netSalary,
      `"${r.status}"`,
      `"${r.paymentDate}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Payroll_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
  };

  const filteredPayroll = payroll.filter(r => 
    r.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalPayout: payroll.filter(r => r.status === 'paid').reduce((acc, curr) => acc + curr.netSalary, 0),
    pendingAmount: payroll.filter(r => r.status === 'pending').reduce((acc, curr) => acc + curr.netSalary, 0),
    pendingCount: payroll.filter(r => r.status === 'pending').length,
    totalDeductions: payroll.reduce((acc, curr) => acc + curr.deductions, 0)
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Staff Payroll</h1>
            <p className="text-sidebar-foreground">Manage staff salaries and payment history.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-border text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleExportCSV}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
              <DialogTrigger render={
                <Button size="sm" variant="outline" className="border-border text-sidebar-foreground hover:bg-sidebar-accent">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Staff
                </Button>
              } />
              <DialogContent className="bg-card border-border text-foreground">
                <form onSubmit={handleAddStaff}>
                  <DialogHeader>
                    <DialogTitle className="text-white">Add New Staff Member</DialogTitle>
                    <DialogDescription className="text-sidebar-foreground">Register a new employee to the payroll system.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Full Name</label>
                      <Input 
                        required 
                        value={newStaff.name} 
                        onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                        placeholder="John Doe" 
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Role</label>
                        <Select value={newStaff.role} onValueChange={val => setNewStaff({...newStaff, role: val})}>
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="Teacher">Teacher</SelectItem>
                            <SelectItem value="Admin">Administrator</SelectItem>
                            <SelectItem value="Accountant">Accountant</SelectItem>
                            <SelectItem value="Librarian">Librarian</SelectItem>
                            <SelectItem value="Support Staff">Support Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Base Salary (৳)</label>
                        <Input 
                          type="number" 
                          required 
                          value={newStaff.salary} 
                          onChange={e => setNewStaff({...newStaff, salary: e.target.value})}
                          placeholder="25000" 
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddStaffOpen(false)} className="border-border text-sidebar-foreground">Cancel</Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">Add Staff</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isProcessPayrollOpen} onOpenChange={setIsProcessPayrollOpen}>
              <DialogTrigger render={
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Process Payroll
                </Button>
              } />
              <DialogContent className="bg-card border-border text-foreground">
                <form onSubmit={handleProcessPayroll}>
                  <DialogHeader>
                    <DialogTitle className="text-white">Process Monthly Salary</DialogTitle>
                    <DialogDescription className="text-sidebar-foreground">Record a salary payment for an employee.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Select Staff</label>
                      <Select value={newPayroll.staffId} onValueChange={val => setNewPayroll({...newPayroll, staffId: val})}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Select Employee" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {staff.filter(s => s.status === 'active').map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Bonus (৳)</label>
                        <Input 
                          type="number" 
                          value={newPayroll.bonus} 
                          onChange={e => setNewPayroll({...newPayroll, bonus: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Deductions (৳)</label>
                        <Input 
                          type="number" 
                          value={newPayroll.deductions} 
                          onChange={e => setNewPayroll({...newPayroll, deductions: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Payment Method</label>
                        <Select value={newPayroll.paymentMethod} onValueChange={val => setNewPayroll({...newPayroll, paymentMethod: val})}>
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Cheque">Cheque</SelectItem>
                            <SelectItem value="Mobile Banking">Mobile Banking</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Status</label>
                        <Select value={newPayroll.status} onValueChange={(val: any) => setNewPayroll({...newPayroll, status: val})}>
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsProcessPayrollOpen(false)} className="border-border text-sidebar-foreground">Cancel</Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">Confirm Payment</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-sidebar-foreground mb-5">Total Monthly Payout</span>
            <div className="text-[28px] font-bold text-white mb-1">৳{stats.totalPayout.toLocaleString()}</div>
            <div className="flex items-center text-xs text-emerald-500 mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              Calculated from paid records
            </div>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-amber-500 mb-5">Pending Payments</span>
            <div className="text-[28px] font-bold text-white mb-1">৳{stats.pendingAmount.toLocaleString()}</div>
            <div className="flex items-center text-xs text-sidebar-foreground mt-1">
              {stats.pendingCount} staff members
            </div>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-sidebar-foreground mb-5">Tax & Deductions</span>
            <div className="text-[28px] font-bold text-white mb-1">৳{stats.totalDeductions.toLocaleString()}</div>
            <div className="flex items-center text-xs text-rose-500 mt-1">
              <ArrowDownRight className="w-3 h-3 mr-1" />
              Total deductions recorded
            </div>
          </Card>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-none">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-white">Payroll History</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
              <Input 
                placeholder="Search staff..." 
                className="pl-10 h-9 bg-background border-border text-foreground" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Table>
            <TableHeader className="bg-sidebar-accent/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold text-sidebar-foreground">Staff Name</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Role</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Month</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Net Salary</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Status</TableHead>
                <TableHead className="text-right font-semibold text-sidebar-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayroll.length > 0 ? (
                filteredPayroll.map((record) => (
                  <TableRow key={record.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                    <TableCell className="font-semibold text-white">{record.staffName}</TableCell>
                    <TableCell className="capitalize text-sidebar-foreground">{record.role}</TableCell>
                    <TableCell className="text-sidebar-foreground">{record.month}</TableCell>
                    <TableCell className="font-medium text-white">৳{record.netSalary.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className={cn(
                        "inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                        record.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                        {record.status === 'paid' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                        {record.status}
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
                                setSelectedRecord(record);
                                setIsViewPayslipOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Payslip
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-rose-500 hover:bg-sidebar-accent cursor-pointer"
                              onClick={() => handleDeletePayroll(record.id)}
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
                    No payroll records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Payslip Dialog */}
        <Dialog open={isViewPayslipOpen} onOpenChange={setIsViewPayslipOpen}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Salary Payslip
              </DialogTitle>
              <DialogDescription className="text-sidebar-foreground">
                Official salary statement for the month of {selectedRecord?.month}.
              </DialogDescription>
            </DialogHeader>
            
            {selectedRecord && (
              <div className="space-y-6 py-4">
                <div className="flex justify-between items-start border-b border-border pb-4">
                  <div>
                    <h4 className="text-lg font-bold text-white">School Management System</h4>
                    <p className="text-xs text-sidebar-foreground">123 Education Lane, Learning City</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-sidebar-foreground uppercase tracking-wider">Payslip No.</p>
                    <p className="text-sm font-bold text-white">#{selectedRecord.id.slice(-8).toUpperCase()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-sidebar-foreground uppercase tracking-wider">Employee Name</p>
                    <p className="text-sm font-semibold text-white">{selectedRecord.staffName}</p>
                    <p className="text-xs text-sidebar-foreground">{selectedRecord.role}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs font-medium text-sidebar-foreground uppercase tracking-wider">Payment Date</p>
                    <p className="text-sm font-semibold text-white">{format(new Date(selectedRecord.paymentDate), 'MMMM dd, yyyy')}</p>
                    <p className="text-xs text-sidebar-foreground">Method: {selectedRecord.paymentMethod}</p>
                  </div>
                </div>

                <div className="bg-sidebar-accent/20 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-sidebar-foreground">Base Salary</span>
                    <span className="text-white font-medium">৳{selectedRecord.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-sidebar-foreground">Bonus</span>
                    <span className="text-emerald-500 font-medium">+৳{selectedRecord.bonus.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-sidebar-foreground">Deductions</span>
                    <span className="text-rose-500 font-medium">-৳{selectedRecord.deductions.toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t border-border flex justify-between items-center">
                    <span className="text-base font-bold text-white">Net Salary</span>
                    <span className="text-xl font-bold text-primary">৳{selectedRecord.netSalary.toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-[10px] text-sidebar-foreground italic">
                    This is a computer-generated payslip and does not require a physical signature.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="flex sm:justify-between gap-2">
              <Button variant="outline" onClick={() => window.print()} className="border-border text-sidebar-foreground">
                Print Payslip
              </Button>
              <Button onClick={() => setIsViewPayslipOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
