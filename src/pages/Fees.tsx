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

export default function Fees() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFee, setNewFee] = useState({
    studentName: '',
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
    return () => unsubscribe();
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
      setNewFee({ studentName: '', amount: '', type: 'tuition', status: 'paid', date: new Date().toISOString().split('T')[0] });
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
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground">
              <form onSubmit={handleAddFee}>
                <DialogHeader>
                  <DialogTitle className="text-white">Record New Payment</DialogTitle>
                  <DialogDescription className="text-sidebar-foreground">Enter payment details for the student.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Student Name</label>
                    <Input 
                      required 
                      value={newFee.studentName} 
                      onChange={e => setNewFee({...newFee, studentName: e.target.value})}
                      placeholder="Search student..." 
                      className="bg-background border-border"
                    />
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
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
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
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
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
                      <Button variant="ghost" size="sm" className="text-primary hover:bg-sidebar-accent">View Receipt</Button>
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
      </div>
    </DashboardLayout>
  );
}
