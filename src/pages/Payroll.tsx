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
  FileText,
  Edit
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
  SelectGroup,
  SelectItem, 
  SelectLabel,
  SelectSeparator,
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
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useAuth } from '@/src/lib/auth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Staff {
  id: string;
  name: string;
  role: string;
  salary: number;
  joinDate: string;
  department: string;
  status: 'active' | 'inactive';
  phone?: string;
  nid?: string;
}

interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  month: string;
  amount: number;
  bonus: number;
  bonusType?: string;
  deductions: number;
  netSalary: number;
  status: 'paid' | 'pending';
  paymentDate: string;
  paymentMethod: string;
}

export default function Payroll() {
  const { systemConfig } = useAuth();
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);
  const [isProcessPayrollOpen, setIsProcessPayrollOpen] = useState(false);
  const [isViewPayslipOpen, setIsViewPayslipOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [processPayrollRole, setProcessPayrollRole] = useState('all');
  const [processPayrollSearch, setProcessPayrollSearch] = useState('');

  const [newStaff, setNewStaff] = useState({
    name: '',
    role: 'Teacher',
    department: '',
    salary: '',
    joinDate: new Date().toISOString().split('T')[0],
    phone: '',
    nid: '',
    status: 'active' as const
  });

  const [newPayroll, setNewPayroll] = useState({
    staffId: '',
    month: format(new Date(), 'MMMM yyyy'),
    bonus: '0',
    bonusType: 'Performance Bonus',
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
      setNewStaff({ name: '', role: 'Teacher', department: '', salary: '', joinDate: new Date().toISOString().split('T')[0], phone: '', nid: '', status: 'active' });
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
        bonusType: newPayroll.bonusType,
        deductions,
        netSalary,
        status: newPayroll.status,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: newPayroll.paymentMethod,
        createdAt: new Date().toISOString()
      });

      setIsProcessPayrollOpen(false);
      setNewPayroll({ staffId: '', month: format(new Date(), 'MMMM yyyy'), bonus: '0', bonusType: 'Performance Bonus', deductions: '0', status: 'paid', paymentMethod: 'Bank Transfer' });
      setProcessPayrollRole('all');
      setProcessPayrollSearch('');
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

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member? This will not delete their payroll history.')) return;
    try {
      await deleteDoc(doc(db, 'staff', id));
      toast.success('Staff member removed');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `staff/${id}`);
    }
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      const { id, ...data } = editingStaff;
      await updateDoc(doc(db, 'staff', id), {
        ...data,
        salary: Number(data.salary)
      });
      setIsEditStaffOpen(false);
      setEditingStaff(null);
      toast.success('Staff details updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `staff/${editingStaff.id}`);
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

  const handleExportStaffCSV = () => {
    const filteredStaffList = staff.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });

    if (filteredStaffList.length === 0) {
      toast.error('No staff records found to export');
      return;
    }
    
    const headers = ['Name', 'Role', 'Department', 'Phone', 'NID', 'Salary', 'Join Date', 'Status'];
    const rows = filteredStaffList.map(s => [
      `"${s.name}"`,
      `"${s.role}"`,
      `"${s.department || ''}"`,
      `"${s.phone || ''}"`,
      `"${s.nid || ''}"`,
      s.salary,
      `"${s.joinDate}"`,
      `"${s.status}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Staff_Directory_${format(new Date(), 'yyyy-MM-dd')}.csv`);
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

  const filteredStaffData = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const staffByRole = filteredStaffData.reduce((acc, s) => {
    const role = s.role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(s);
    return acc;
  }, {} as Record<string, Staff[]>);

  const roleOrder = ['Admin', 'Teacher', 'Accountant', 'Librarian', 'Support Staff'];
  const sortedRoles = Object.keys(staffByRole).sort((a, b) => {
    const indexA = roleOrder.indexOf(a);
    const indexB = roleOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  const handlePrint = () => {
    document.body.classList.add('report-printing');
    window.print();
    document.body.classList.remove('report-printing');
  };

  return (
    <DashboardLayout>
      {/* Print Only Payslip Container */}
      <div className="print-only p-8 max-w-[210mm] mx-auto bg-white text-black font-sans">
        {selectedRecord && (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold uppercase tracking-tight">Salary Payslip</h1>
                <h2 className="text-xl font-semibold text-gray-800">{systemConfig?.schoolName || 'School Management System'}</h2>
                <p className="text-sm text-gray-600">{systemConfig?.address || '123 Education Lane, Learning City'}</p>
                <p className="text-sm text-gray-600">
                  Phone: {systemConfig?.phone || '+880 1234 567890'} | Email: {systemConfig?.email || 'hr@school.edu'}
                </p>
                {systemConfig?.website && <p className="text-sm text-gray-600">Website: {systemConfig.website}</p>}
              </div>
              <div className="text-right space-y-1">
                <div className="bg-black text-white px-3 py-1 text-xs font-bold inline-block mb-2">CONFIDENTIAL</div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Payslip ID</p>
                <p className="text-lg font-mono font-bold">#{selectedRecord.id.slice(-8).toUpperCase()}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">Pay Period</p>
                <p className="text-sm font-semibold">{selectedRecord.month}</p>
              </div>
            </div>

            {/* Employee Info */}
            <div className="grid grid-cols-2 gap-12 py-4">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-1">Employee Details</h3>
                <div className="space-y-1">
                  <p className="text-base font-bold">{selectedRecord.staffName}</p>
                  <p className="text-sm text-gray-700">Designation: <span className="font-semibold">{selectedRecord.role}</span></p>
                  <p className="text-sm text-gray-700">Payment Date: <span className="font-semibold">{format(new Date(selectedRecord.paymentDate), 'MMMM dd, yyyy')}</span></p>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-1">Payment Summary</h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-700">Payment Method: <span className="font-semibold">{selectedRecord.paymentMethod}</span></p>
                  <p className="text-sm text-gray-700">Status: <span className="font-bold text-emerald-600 uppercase">{selectedRecord.status}</span></p>
                </div>
              </div>
            </div>

            {/* Earnings & Deductions */}
            <div className="mt-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left text-xs font-bold uppercase">Description</th>
                    <th className="border border-gray-300 px-4 py-2 text-right text-xs font-bold uppercase w-32">Earnings</th>
                    <th className="border border-gray-300 px-4 py-2 text-right text-xs font-bold uppercase w-32">Deductions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-4 text-sm font-medium">Basic Salary</td>
                    <td className="border border-gray-300 px-4 py-4 text-right text-sm font-mono font-bold">৳{selectedRecord.amount.toLocaleString()}</td>
                    <td className="border border-gray-300 px-4 py-4 text-right text-sm font-mono text-gray-400">-</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-4 text-sm font-medium">Bonus / Allowances</td>
                    <td className="border border-gray-300 px-4 py-4 text-right text-sm font-mono font-bold text-emerald-600">+৳{selectedRecord.bonus.toLocaleString()}</td>
                    <td className="border border-gray-300 px-4 py-4 text-right text-sm font-mono text-gray-400">-</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-4 text-sm font-medium">Tax / Other Deductions</td>
                    <td className="border border-gray-300 px-4 py-4 text-right text-sm font-mono text-gray-400">-</td>
                    <td className="border border-gray-300 px-4 py-4 text-right text-sm font-mono font-bold text-rose-600">-৳{selectedRecord.deductions.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 text-right text-sm font-bold">Totals</td>
                    <td className="border border-gray-300 px-4 py-2 text-right text-sm font-mono font-bold text-emerald-600">৳{(selectedRecord.amount + selectedRecord.bonus).toLocaleString()}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right text-sm font-mono font-bold text-rose-600">৳{selectedRecord.deductions.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="border border-gray-300 px-4 py-3 text-right text-base font-bold uppercase">Net Payable Amount</td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-xl font-mono font-bold bg-gray-100">৳{selectedRecord.netSalary.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-16 flex justify-between items-end">
              <div className="space-y-4">
                <div className="w-48 border-b border-black"></div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Authorized Signature</p>
              </div>
              <div className="text-right space-y-2">
                <p className="text-[10px] text-gray-400 italic max-w-[250px]">
                  This is a computer-generated payslip. No physical signature is required for its validity.
                </p>
                <p className="text-[10px] font-bold text-gray-500">Generated on: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
              </div>
            </div>
          </div>
        )}
      </div>

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
                        <Select value={newStaff.role} onValueChange={val => setNewStaff({...newStaff, role: val || 'Teacher'})}>
                          <SelectTrigger className="bg-background border-border text-foreground">
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
                        <label className="text-sm font-medium text-sidebar-foreground">Department</label>
                        <Input 
                          required 
                          value={newStaff.department} 
                          onChange={e => setNewStaff({...newStaff, department: e.target.value})}
                          placeholder="Science / Admin" 
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Phone Number</label>
                        <Input 
                          required 
                          placeholder="01712xxxxxx" 
                          value={newStaff.phone || ''} 
                          onChange={e => setNewStaff({...newStaff, phone: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">NID Number</label>
                        <Input 
                          required 
                          placeholder="19xxxxxxxx" 
                          value={newStaff.nid || ''} 
                          onChange={e => setNewStaff({...newStaff, nid: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Joining Date</label>
                        <Input 
                          type="date" 
                          required 
                          value={newStaff.joinDate} 
                          onChange={e => setNewStaff({...newStaff, joinDate: e.target.value})}
                          className="bg-background border-border text-foreground"
                        />
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

            <Dialog open={isProcessPayrollOpen} onOpenChange={(open) => {
              setIsProcessPayrollOpen(open);
              if (!open) {
                setProcessPayrollRole('all');
                setProcessPayrollSearch('');
              }
            }}>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Filter by Role</label>
                        <Select value={processPayrollRole} onValueChange={val => {
                          setProcessPayrollRole(val || 'all');
                          setNewPayroll({...newPayroll, staffId: ''});
                        }}>
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue placeholder="All Roles" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="Teacher">Teacher</SelectItem>
                            <SelectItem value="Admin">Administrator</SelectItem>
                            <SelectItem value="Accountant">Accountant</SelectItem>
                            <SelectItem value="Librarian">Librarian</SelectItem>
                            <SelectItem value="Support Staff">Support Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Search Staff</label>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-sidebar-foreground" />
                          <Input
                            placeholder="Type to search..."
                            value={processPayrollSearch}
                            onChange={e => setProcessPayrollSearch(e.target.value)}
                            className="bg-background border-border pl-9"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Select Staff</label>
                      <Select value={newPayroll.staffId} onValueChange={val => setNewPayroll({...newPayroll, staffId: val || ''})}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Select Employee">
                            {newPayroll.staffId && staff.find(s => s.id === newPayroll.staffId) 
                              ? staff.find(s => s.id === newPayroll.staffId)?.name 
                              : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {sortedRoles.map((role) => {
                            const roleStaff = staffByRole[role]
                              .filter(s => s.status === 'active')
                              .filter(s => processPayrollRole === 'all' || s.role === processPayrollRole)
                              .filter(s => s.name.toLowerCase().includes(processPayrollSearch.toLowerCase()));
                            
                            if (roleStaff.length === 0) return null;

                            return (
                              <SelectGroup key={role}>
                                <SelectLabel className="bg-sidebar-accent/30 text-primary font-bold uppercase text-[10px] tracking-widest">{role}</SelectLabel>
                                {roleStaff.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                                <SelectSeparator className="opacity-50" />
                              </SelectGroup>
                            );
                          })}
                          {Object.keys(staffByRole).length === 0 && (
                            <div className="p-2 text-center text-xs text-sidebar-foreground">No matching staff found</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Bonus Type</label>
                        <Select value={newPayroll.bonusType} onValueChange={val => setNewPayroll({...newPayroll, bonusType: val || 'Performance Bonus'})}>
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="Performance Bonus">Performance Bonus</SelectItem>
                            <SelectItem value="Festival Bonus">Festival Bonus</SelectItem>
                            <SelectItem value="Others">Others</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Bonus Amount (৳)</label>
                        <Input 
                          type="number" 
                          value={newPayroll.bonus} 
                          onChange={e => setNewPayroll({...newPayroll, bonus: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                        <Select value={newPayroll.paymentMethod} onValueChange={val => setNewPayroll({...newPayroll, paymentMethod: val || 'Bank Transfer'})}>
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
                        <Select value={newPayroll.status} onValueChange={(val: any) => setNewPayroll({...newPayroll, status: val || 'paid'})}>
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

        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="bg-card border border-border p-1">
            <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Payroll History
            </TabsTrigger>
            <TabsTrigger value="staff" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Staff Directory
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="staff" className="space-y-6">
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-none">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="font-semibold text-white">Staff Directory</h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-sidebar-accent/50 rounded-lg border border-border">
                    <span className="text-xs font-medium text-sidebar-foreground">Role:</span>
                    <Select value={roleFilter || 'all'} onValueChange={val => setRoleFilter(val || 'all')}>
                      <SelectTrigger className="h-7 w-[130px] bg-transparent border-none text-xs text-white focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="Teacher">Teacher</SelectItem>
                        <SelectItem value="Admin">Administrator</SelectItem>
                        <SelectItem value="Accountant">Accountant</SelectItem>
                        <SelectItem value="Librarian">Librarian</SelectItem>
                        <SelectItem value="Support Staff">Support Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
                    <Input 
                      placeholder="Search staff..." 
                      className="pl-10 h-9 bg-background border-border text-foreground" 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportStaffCSV}
                    className="border-border text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader className="bg-sidebar-accent/30">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-semibold text-sidebar-foreground">Name</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Role</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Department</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Phone</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Base Salary</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Join Date</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Status</TableHead>
                    <TableHead className="text-right font-semibold text-sidebar-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRoles.length > 0 ? (
                    sortedRoles.map((role) => (
                      <React.Fragment key={role}>
                        <TableRow className="bg-sidebar-accent/5 hover:bg-sidebar-accent/5 border-border">
                          <TableCell colSpan={8} className="py-2.5 px-4 font-semibold text-white">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase text-[10px] font-bold tracking-widest px-2.5 py-1">
                                {role === 'Admin' ? 'Administration' : role}
                              </Badge>
                              <div className="h-px flex-1 bg-border/50"></div>
                              <span className="text-[10px] text-sidebar-foreground font-semibold uppercase tracking-wider bg-background px-2 py-0.5 rounded border border-border/50">
                                {staffByRole[role].length} {staffByRole[role].length === 1 ? 'Member' : 'Members'}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                        {staffByRole[role].map((s) => (
                          <TableRow key={s.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                            <TableCell className="font-semibold text-white pl-8">{s.name}</TableCell>
                            <TableCell className="capitalize text-sidebar-foreground font-medium">{s.role}</TableCell>
                            <TableCell className="text-sidebar-foreground italic">{s.department || 'N/A'}</TableCell>
                            <TableCell className="text-sidebar-foreground">{s.phone || 'N/A'}</TableCell>
                            <TableCell className="font-medium text-white">৳{s.salary.toLocaleString()}</TableCell>
                            <TableCell className="text-sidebar-foreground">{format(new Date(s.joinDate), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                {s.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-primary hover:bg-primary/10 h-8 w-8"
                                  onClick={() => {
                                    setEditingStaff(s);
                                    setIsEditStaffOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-rose-500 hover:bg-rose-500/10 h-8 w-8"
                                  onClick={() => handleDeleteStaff(s.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-sidebar-foreground">
                        No staff members found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Staff Dialog */}
        <Dialog open={isEditStaffOpen} onOpenChange={setIsEditStaffOpen}>
          <DialogContent className="bg-card border-border text-foreground">
            <form onSubmit={handleEditStaff}>
              <DialogHeader>
                <DialogTitle className="text-white">Edit Staff Details</DialogTitle>
                <DialogDescription className="text-sidebar-foreground">Update employee information.</DialogDescription>
              </DialogHeader>
              {editingStaff && (
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Full Name</label>
                    <Input 
                      required 
                      value={editingStaff.name || ''} 
                      onChange={e => setEditingStaff({...editingStaff, name: e.target.value})}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Role</label>
                      <Select value={editingStaff.role} onValueChange={val => setEditingStaff({...editingStaff, role: val || ''})}>
                        <SelectTrigger className="bg-background border-border text-foreground">
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
                      <label className="text-sm font-medium text-sidebar-foreground">Department</label>
                      <Input 
                        required 
                        value={editingStaff.department || ''} 
                        onChange={e => setEditingStaff({...editingStaff, department: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Phone Number</label>
                      <Input 
                        required 
                        value={editingStaff.phone || ''} 
                        onChange={e => setEditingStaff({...editingStaff, phone: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">NID Number</label>
                      <Input 
                        required 
                        value={editingStaff.nid || ''} 
                        onChange={e => setEditingStaff({...editingStaff, nid: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Status</label>
                      <Select value={editingStaff.status} onValueChange={(val: any) => setEditingStaff({...editingStaff, status: val || 'active'})}>
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Base Salary (৳)</label>
                      <Input 
                        type="number" 
                        required 
                        value={editingStaff.salary ?? ''} 
                        onChange={e => setEditingStaff({...editingStaff, salary: Number(e.target.value)})}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditStaffOpen(false)} className="border-border text-sidebar-foreground">Cancel</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Payslip Dialog */}
        <Dialog open={isViewPayslipOpen} onOpenChange={setIsViewPayslipOpen}>
          <DialogContent className="bg-white text-black sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
            <div className="p-8 font-sans relative">
              {selectedRecord && (
                <div className="space-y-8">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 border-black pb-6">
                    <div className="space-y-1">
                      <h1 className="text-2xl font-bold uppercase tracking-tight">Salary Payslip</h1>
                      <h2 className="text-xl font-semibold text-gray-800">{systemConfig?.schoolName || 'School Management System'}</h2>
                      <p className="text-sm text-gray-600">{systemConfig?.address || '123 Education Lane, Learning City'}</p>
                      <p className="text-sm text-gray-600">
                        Phone: {systemConfig?.phone || '+880 1234 567890'} | Email: {systemConfig?.email || 'hr@school.edu'}
                      </p>
                      {systemConfig?.website && <p className="text-sm text-gray-600">Website: {systemConfig.website}</p>}
                    </div>
                    <div className="text-right space-y-1">
                      <div className="bg-black text-white px-3 py-1 text-xs font-bold inline-block mb-2">CONFIDENTIAL</div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Payslip ID</p>
                      <p className="text-lg font-mono font-bold">#{selectedRecord.id.slice(-8).toUpperCase()}</p>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">Pay Period</p>
                      <p className="text-sm font-semibold">{selectedRecord.month}</p>
                    </div>
                  </div>

                  {/* Employee Info */}
                  <div className="grid grid-cols-2 gap-12 py-4">
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-1">Employee Details</h3>
                      <div className="space-y-1">
                        <p className="text-base font-bold">{selectedRecord.staffName}</p>
                        <p className="text-sm text-gray-700">Designation: <span className="font-semibold">{selectedRecord.role}</span></p>
                        <p className="text-sm text-gray-700">Payment Date: <span className="font-semibold">{format(new Date(selectedRecord.paymentDate), 'MMMM dd, yyyy')}</span></p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-1">Payment Summary</h3>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-700">Payment Method: <span className="font-semibold">{selectedRecord.paymentMethod}</span></p>
                        <p className="text-sm text-gray-700">Status: <span className="font-bold text-emerald-600 uppercase">{selectedRecord.status}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* earnings & deductions */}
                  <div className="mt-8 border border-black overflow-hidden">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b border-black">
                          <th className="px-4 py-2 text-left text-xs font-bold uppercase">Transaction Details</th>
                          <th className="px-4 py-2 text-right text-xs font-bold uppercase w-32 border-l border-black">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-black">
                          <td className="px-4 py-3 text-sm flex justify-between">
                            <span>Basic Salary</span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono border-l border-black">
                            +৳{selectedRecord.amount.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="px-4 py-3 text-sm flex justify-between">
                            <span>{selectedRecord.bonusType || 'Performance Bonus'}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono border-l border-black text-emerald-600">
                            +৳{selectedRecord.bonus.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="px-4 py-3 text-sm flex justify-between">
                            <span>Statutory Deductions</span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono border-l border-black text-rose-600">
                            -৳{selectedRecord.deductions.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-4 py-4 text-right text-base font-bold uppercase">Net Amount Payable</td>
                          <td className="px-4 py-4 text-right text-lg font-mono font-bold border-l border-black bg-gray-100">
                            ৳{selectedRecord.netSalary.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Footer */}
                  <div className="mt-16 flex justify-between items-end">
                    <div className="space-y-4">
                      <div className="w-48 border-b border-black"></div>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Authorized Signature</p>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="text-[10px] text-gray-400 italic max-w-[250px]">
                        This is a computer-generated payslip. No physical signature is required for its validity.
                      </p>
                      <p className="text-[10px] font-bold text-gray-500">Generated on: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex sm:justify-between gap-2">
              <Button variant="outline" onClick={handlePrint} className="border-gray-300 text-gray-700 hover:bg-gray-100">
                <Download className="w-4 h-4 mr-2" />
                Print Payslip (PDF)
              </Button>
              <Button onClick={() => setIsViewPayslipOpen(false)} className="bg-gray-800 text-white hover:bg-gray-700">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
