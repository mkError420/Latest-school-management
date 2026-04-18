import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  Edit,
  Printer,
  Calendar,
  Phone,
  MapPin,
  Briefcase,
  Building2,
  Fingerprint,
  Wallet
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useAuth } from '@/src/lib/auth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Staff {
  id: string;
  staffId: string;
  name: string;
  role: string;
  salary: number;
  joinDate: string;
  department: string;
  status: 'active' | 'inactive';
  phone?: string;
  nid?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  address?: string;
  photoUrl?: string;
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
  const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffPhotoFile, setStaffPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
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
    emergencyContact: '',
    bloodGroup: '',
    address: '',
    photoUrl: '',
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
    setIsUploading(true);
    try {
      let finalPhotoUrl = '';
      
      // prioritize storage but fallback to base64
      if (staffPhotoFile || photoPreview) {
        try {
          if (staffPhotoFile) {
            const fileRef = ref(storage, `staff-photos/${Date.now()}-${staffPhotoFile.name}`);
            
            // 5 second timeout for upload
            const uploadPromise = uploadBytes(fileRef, staffPhotoFile);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Storage upload timeout')), 5000)
            );
            
            const uploadResult = (await Promise.race([uploadPromise, timeoutPromise])) as any;
            finalPhotoUrl = await getDownloadURL(uploadResult.ref);
          } else {
            finalPhotoUrl = photoPreview || '';
          }
        } catch (storageError: any) {
          console.warn('Storage upload failed, falling back to Base64:', storageError);
          finalPhotoUrl = photoPreview || ''; 
        }
      }

      // Sanitize staffId generation
      const joinYear = newStaff.joinDate ? new Date(newStaff.joinDate).getFullYear() : new Date().getFullYear();
      const rawNid = String(newStaff.nid || '');
      const lastThreeNid = rawNid.length >= 3 ? rawNid.slice(-3) : rawNid.padStart(3, '0');
      const staffId = `${joinYear}${lastThreeNid}`;

      // sanitize data to avoid undefined in firestore
      const staffDoc = {
        name: newStaff.name?.trim() || 'Unnamed Staff',
        role: newStaff.role || 'Teacher',
        department: newStaff.department?.trim() || '',
        salary: Number(newStaff.salary) || 0,
        joinDate: newStaff.joinDate || new Date().toISOString().split('T')[0],
        phone: newStaff.phone?.trim() || '',
        nid: rawNid,
        emergencyContact: newStaff.emergencyContact?.trim() || '',
        bloodGroup: newStaff.bloodGroup?.trim() || '',
        address: newStaff.address?.trim() || '',
        photoUrl: finalPhotoUrl,
        status: newStaff.status || 'active',
        staffId,
        createdAt: new Date().toISOString()
      };

      // Wrap addDoc in a timeout race to prevent infinite loading
      const addDocPromise = addDoc(collection(db, 'staff'), staffDoc);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out. Please check your connection.')), 15000)
      );

      await Promise.race([addDocPromise, timeoutPromise]);
      setIsAddStaffOpen(false);
      setNewStaff({ 
        name: '', 
        role: 'Teacher', 
        department: '', 
        salary: '', 
        joinDate: new Date().toISOString().split('T')[0], 
        phone: '', 
        nid: '', 
        emergencyContact: '', 
        bloodGroup: '', 
        address: '', 
        photoUrl: '', 
        status: 'active' 
      });
      setStaffPhotoFile(null);
      setPhotoPreview(null);
      toast.success(`Staff member added. ID: ${staffId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'staff');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsPhotoProcessing(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400;
            const MAX_HEIGHT = 400;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            setPhotoPreview(dataUrl);
            
            // Manual conversion from dataURL to Blob (safer than fetch)
            const parts = dataUrl.split(',');
            const byteString = atob(parts[1]);
            const mimeString = parts[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeString });
            const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
            
            setStaffPhotoFile(compressedFile);
            setIsPhotoProcessing(false);
          } catch (err) {
            console.error('Image processing error:', err);
            setIsPhotoProcessing(false);
          }
        };
        img.onerror = () => setIsPhotoProcessing(false);
        img.src = reader.result as string;
      };
      reader.onerror = () => setIsPhotoProcessing(false);
      reader.readAsDataURL(file);
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
    setIsUploading(true);
    try {
      let finalPhotoUrl = editingStaff.photoUrl || '';
      
      if (staffPhotoFile || photoPreview) {
        try {
          if (staffPhotoFile) {
            const fileRef = ref(storage, `staff-photos/${Date.now()}-${staffPhotoFile.name}`);
            
            // 5 second timeout for upload
            const uploadPromise = uploadBytes(fileRef, staffPhotoFile);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Storage upload timeout')), 5000)
            );
            
            const uploadResult = (await Promise.race([uploadPromise, timeoutPromise])) as any;
            finalPhotoUrl = await getDownloadURL(uploadResult.ref);
          } else if (photoPreview && photoPreview !== editingStaff.photoUrl) {
            finalPhotoUrl = photoPreview;
          }
        } catch (storageError) {
          console.warn('Storage edit failed, falling back to Base64:', storageError);
          finalPhotoUrl = photoPreview || finalPhotoUrl;
        }
      }

      const { id, ...data } = editingStaff;
      const joinYear = data.joinDate ? new Date(data.joinDate).getFullYear() : new Date().getFullYear();
      const rawNid = String(data.nid || '');
      const lastThreeNid = rawNid.length >= 3 ? rawNid.slice(-3) : rawNid.padStart(3, '0');
      const updatedStaffId = `${joinYear}${lastThreeNid}`;

      // sanitize update fields
      const updateData = {
        name: (data.name || '').trim(),
        role: data.role || 'Teacher',
        department: (data.department || '').trim(),
        salary: Number(data.salary) || 0,
        joinDate: data.joinDate || new Date().toISOString().split('T')[0],
        phone: (data.phone || '').trim(),
        nid: rawNid,
        emergencyContact: (data.emergencyContact || '').trim(),
        bloodGroup: (data.bloodGroup || '').trim(),
        address: (data.address || '').trim(),
        status: data.status || 'active',
        staffId: updatedStaffId,
        photoUrl: finalPhotoUrl,
        updatedAt: new Date().toISOString()
      };

      const updateDocPromise = updateDoc(doc(db, 'staff', id), updateData);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Update request timed out.')), 15000)
      );

      await Promise.race([updateDocPromise, timeoutPromise]);
      setIsEditStaffOpen(false);
      setEditingStaff(null);
      setStaffPhotoFile(null);
      setPhotoPreview(null);
      toast.success(`Staff updated. ID: ${updatedStaffId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `staff/${editingStaff.id}`);
    } finally {
      setIsUploading(false);
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
    
    const headers = ['Staff ID', 'Name', 'Role', 'Department', 'Phone', 'NID', 'Address', 'Salary', 'Join Date', 'Status'];
    const rows = filteredStaffList.map(s => [
      `"${s.staffId || 'N/A'}"`,
      `"${s.name}"`,
      `"${s.role}"`,
      `"${s.department || ''}"`,
      `"${s.phone || ''}"`,
      `"${s.nid || ''}"`,
      `"${s.address || ''}"`,
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

  const profileRef = useRef<HTMLDivElement>(null);

  const handleDownloadProfile = async () => {
    if (!profileRef.current || !viewingStaff) return;

    try {
      toast.loading('Preparing profile document...');
      const canvas = await html2canvas(profileRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Staff_Profile_${viewingStaff.staffId || viewingStaff.id}.pdf`);
      toast.dismiss();
      toast.success('Profile downloaded as PDF');
    } catch (error) {
      console.error('Download failed:', error);
      toast.dismiss();
      toast.error('Failed to download profile');
    }
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
                    <div className="flex justify-center mb-2">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-sidebar-accent flex items-center justify-center overflow-hidden border-2 border-dashed border-border group-hover:border-primary transition-colors">
                          {photoPreview ? (
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <UserPlus className="w-10 h-10 text-sidebar-foreground" />
                          )}
                        </div>
                        <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full cursor-pointer shadow-lg hover:bg-primary/90 transition-transform hover:scale-110">
                          <Plus className="w-4 h-4" />
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                      </div>
                    </div>
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
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Emergency Contact</label>
                        <Input 
                          placeholder="017xxxxxxxx" 
                          value={newStaff.emergencyContact || ''} 
                          onChange={e => setNewStaff({...newStaff, emergencyContact: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Blood Group</label>
                        <Select value={newStaff.bloodGroup || ''} onValueChange={val => setNewStaff({...newStaff, bloodGroup: val || ''})}>
                          <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="O+">O+</SelectItem>
                            <SelectItem value="O-">O-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem>
                            <SelectItem value="AB-">AB-</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Address</label>
                      <Input 
                        placeholder="House #123, Road #4, Dhaka" 
                        value={newStaff.address || ''} 
                        onChange={e => setNewStaff({...newStaff, address: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddStaffOpen(false)} className="border-border text-sidebar-foreground" disabled={isUploading || isPhotoProcessing}>Cancel</Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-white" disabled={isUploading || isPhotoProcessing}>
                      {isUploading ? 'Adding...' : isPhotoProcessing ? 'Processing...' : 'Add Staff'}
                    </Button>
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
                    <TableHead className="font-semibold text-sidebar-foreground">Staff ID</TableHead>
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
                            <TableCell className="font-mono text-[10px] text-white/70">{s.staffId || 'N/A'}</TableCell>
                            <TableCell className="font-semibold text-white pl-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-sidebar-accent overflow-hidden flex-shrink-0 border border-border/50">
                                  {s.photoUrl ? (
                                    <img src={s.photoUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-sidebar-foreground bg-primary/10">
                                      {s.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                {s.name}
                              </div>
                            </TableCell>
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
                                  className="text-amber-500 hover:bg-amber-500/10 h-8 w-8"
                                  onClick={() => {
                                    setViewingStaff(s);
                                    setIsViewProfileOpen(true);
                                  }}
                                  title="View Profile"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
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
                  <div className="flex justify-center mb-2">
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-full bg-sidebar-accent flex items-center justify-center overflow-hidden border-2 border-dashed border-border group-hover:border-primary transition-colors">
                        {photoPreview ? (
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : editingStaff.photoUrl ? (
                          <img src={editingStaff.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserPlus className="w-8 h-8 text-sidebar-foreground" />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full cursor-pointer shadow-lg hover:bg-primary/90 transition-transform hover:scale-110">
                        <Plus className="w-3 h-3" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Full Name</label>
                      <Input 
                        required 
                        value={editingStaff.name || ''} 
                        onChange={e => setEditingStaff({...editingStaff, name: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground italic">Staff ID (Auto)</label>
                      <Input 
                        disabled
                        value={editingStaff.staffId || 'N/A'} 
                        className="bg-sidebar-accent/30 border-border opacity-70 cursor-not-allowed"
                      />
                    </div>
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
                      <label className="text-sm font-medium text-sidebar-foreground">Emergency Contact</label>
                      <Input 
                        value={editingStaff.emergencyContact || ''} 
                        onChange={e => setEditingStaff({...editingStaff, emergencyContact: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Blood Group</label>
                      <Select value={editingStaff.bloodGroup || ''} onValueChange={val => setEditingStaff({...editingStaff, bloodGroup: val || ''})}>
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">NID Number</label>
                      <Input 
                        required 
                        value={editingStaff.nid || ''} 
                        onChange={e => setEditingStaff({...editingStaff, nid: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Joining Date</label>
                      <Input 
                        type="date" 
                        required 
                        value={editingStaff.joinDate || ''} 
                        onChange={e => setEditingStaff({...editingStaff, joinDate: e.target.value})}
                        className="bg-background border-border text-foreground"
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Home Address</label>
                    <Input 
                      value={editingStaff.address || ''} 
                      onChange={e => setEditingStaff({...editingStaff, address: e.target.value})}
                      className="bg-background border-border"
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditStaffOpen(false)} className="border-border text-sidebar-foreground" disabled={isUploading || isPhotoProcessing}>Cancel</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-white" disabled={isUploading || isPhotoProcessing}>
                  {isUploading ? 'Saving...' : isPhotoProcessing ? 'Processing...' : 'Save Changes'}
                </Button>
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

        {/* Staff Profile Dialog */}
        <Dialog open={isViewProfileOpen} onOpenChange={setIsViewProfileOpen}>
          <DialogContent className="bg-white text-black sm:max-w-[750px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
            <div ref={profileRef} id="staff-profile-card" className="p-10 font-sans min-h-[500px]" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
              {viewingStaff && (
                <div className="space-y-10">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 pb-8"
                    style={{ borderBottomColor: 'rgba(99, 102, 241, 0.2)' }}
                  >
                    <div className="flex gap-6 items-center">
                      <div 
                        className="w-24 h-24 rounded-2xl flex items-center justify-center border-2 overflow-hidden"
                        style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', borderColor: 'rgba(99, 102, 241, 0.2)' }}
                      >
                        {viewingStaff.photoUrl ? (
                          <img src={viewingStaff.photoUrl} alt={viewingStaff.name} className="w-full h-full object-cover" />
                        ) : (
                          <UserPlus className="w-12 h-12" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#111827' }}>{viewingStaff.name}</h1>
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-semibold px-3 py-0.5 rounded-full text-xs"
                            style={{ 
                              backgroundColor: 'rgba(99, 102, 241, 0.05)', 
                              color: '#6366F1', 
                              border: '1px solid rgba(99, 102, 241, 0.2)' 
                            }}
                          >
                            {viewingStaff.role}
                          </span>
                          <span style={{ color: '#9CA3AF' }}>•</span>
                          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>{viewingStaff.department}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: '#9CA3AF' }}>Employee ID</p>
                      <p className="text-2xl font-mono font-bold" style={{ color: '#6366F1' }}>{viewingStaff.staffId || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Identity Grid */}
                  <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                    {/* Official Info */}
                    <div className="space-y-6">
                      <h3 
                        className="text-xs font-bold uppercase tracking-widest border-b pb-2"
                        style={{ color: '#6366F1', borderBottomColor: 'rgba(99, 102, 241, 0.1)' }}
                      >
                        Employment Details
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F9FAFB', color: '#9CA3AF' }}>
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: '#9CA3AF' }}>Joining Date</p>
                            <p className="text-sm font-semibold" style={{ color: '#374151' }}>{format(new Date(viewingStaff.joinDate), 'MMMM dd, yyyy')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F9FAFB', color: '#9CA3AF' }}>
                            <Wallet className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: '#9CA3AF' }}>Current Salary</p>
                            <p className="text-sm font-semibold" style={{ color: '#374151' }}>৳{viewingStaff.salary.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F9FAFB', color: '#9CA3AF' }}>
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: '#9CA3AF' }}>Account Status</p>
                            <span 
                              className="mt-0.5 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                              style={{ 
                                backgroundColor: viewingStaff.status === 'active' ? '#10B981' : '#6B7280',
                                color: 'white'
                              }}
                            >
                              {viewingStaff.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Personal Info */}
                    <div className="space-y-6">
                      <h3 
                        className="text-xs font-bold uppercase tracking-widest border-b pb-2"
                        style={{ color: '#6366F1', borderBottomColor: 'rgba(99, 102, 241, 0.1)' }}
                      >
                        Personal Information
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F9FAFB', color: '#9CA3AF' }}>
                            <Phone className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: '#9CA3AF' }}>Phone Number</p>
                            <p className="text-sm font-semibold" style={{ color: '#374151' }}>{viewingStaff.phone || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F9FAFB', color: '#9CA3AF' }}>
                            <Fingerprint className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: '#9CA3AF' }}>NID / ID Number</p>
                            <p className="text-sm font-semibold" style={{ color: '#374151' }}>{viewingStaff.nid || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F9FAFB', color: '#9CA3AF' }}>
                            <Phone className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: '#9CA3AF' }}>Emergency Contact</p>
                            <p className="text-sm font-semibold" style={{ color: '#374151' }}>{viewingStaff.emergencyContact || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F9FAFB', color: '#9CA3AF' }}>
                            <div className="text-[10px] font-bold">B+</div>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: '#9CA3AF' }}>Blood Group</p>
                            <p className="text-sm font-semibold" style={{ color: '#374151' }}>{viewingStaff.bloodGroup || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center mt-0.5" style={{ backgroundColor: '#F9FAFB', color: '#9CA3AF' }}>
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: '#9CA3AF' }}>Residential Address</p>
                            <p className="text-sm font-semibold leading-relaxed" style={{ color: '#374151' }}>{viewingStaff.address || 'No address provided'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Identity Card Footer Branding */}
                  <div 
                    className="pt-12 mt-12 border-t border-dashed flex justify-between items-end"
                    style={{ borderTopColor: '#E5E7EB', opacity: 0.6 }}
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase tracking-tighter" style={{ color: '#1F2937' }}>{systemConfig?.schoolName || 'Education Management System'}</p>
                      <p className="text-[9px]" style={{ color: '#9CA3AF' }}>Office Human Resource Profile Document</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-mono" style={{ color: '#9CA3AF' }}>HASH_{viewingStaff.id.slice(-12).toUpperCase()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="bg-gray-50 border-t border-gray-100 p-6 flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleDownloadProfile} 
                className="flex-1 bg-white border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Profile (PDF)
              </Button>
              <Button onClick={() => setIsViewProfileOpen(false)} className="bg-primary text-white hover:bg-primary/90 font-semibold px-8 border-none">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
