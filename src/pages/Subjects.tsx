import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { BookOpen, Plus, Trash2, Pencil, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/src/lib/auth';

interface Subject {
  id: string;
  name: string;
  code: string;
}

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    code: ''
  });

  useEffect(() => {
    const qSubjects = query(collection(db, 'subjects'));
    const unsubscribeSubjects = onSnapshot(qSubjects, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Subject[];
        setSubjects(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching subjects:', error);
        handleFirestoreError(error, OperationType.LIST, 'subjects');
      }
    );

    return () => {
      unsubscribeSubjects();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Subject Name is required');
      return;
    }

    try {
      if (editingSubject) {
        await updateDoc(doc(db, 'subjects', editingSubject.id), formData);
        toast.success('Subject updated successfully');
      } else {
        await addDoc(collection(db, 'subjects'), formData);
        toast.success('Subject added successfully');
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving subject:', error);
      handleFirestoreError(error, editingSubject ? OperationType.UPDATE : OperationType.CREATE, `subjects/${editingSubject?.id || 'new'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await deleteDoc(doc(db, 'subjects', id));
        toast.success('Subject deleted successfully');
      } catch (error) {
        console.error('Error deleting subject:', error);
        handleFirestoreError(error, OperationType.DELETE, `subjects/${id}`);
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', code: '' });
    setEditingSubject(null);
  };

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (subject.code || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              Subjects
            </h1>
            <p className="text-sidebar-foreground">Manage and organize school subjects.</p>
          </div>

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              if (!open) resetForm();
              setIsDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-white hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Subject
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-sidebar border-border text-white">
                <DialogHeader>
                  <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSave} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Subject Name</Label>
                    <Input 
                      id="name" 
                      placeholder="e.g. Mathematics" 
                      className="bg-background border-border"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Subject Code (Optional)</Label>
                    <Input 
                      id="code" 
                      placeholder="e.g. MATH101" 
                      className="bg-background border-border"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                    {editingSubject ? 'Update Subject' : 'Add Subject'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-white">Subject List</CardTitle>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
                  <Input 
                    placeholder="Search subjects..." 
                    className="pl-9 bg-sidebar border-border text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-sidebar/50">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-sidebar-foreground font-bold">Subject Name</TableHead>
                    <TableHead className="text-sidebar-foreground font-bold">Subject Code</TableHead>
                    <TableHead className="text-sidebar-foreground font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-sidebar-foreground">
                        Loading subjects...
                      </TableCell>
                    </TableRow>
                  ) : filteredSubjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-sidebar-foreground">
                        No subjects found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubjects.map((subject) => (
                      <TableRow key={subject.id} className="border-border hover:bg-sidebar/30 transition-colors">
                        <TableCell className="font-medium text-white">{subject.name}</TableCell>
                        <TableCell className="text-sidebar-foreground font-mono">{subject.code || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {isAdmin && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-primary hover:bg-primary/10"
                                  onClick={() => {
                                    setEditingSubject(subject);
                                    setFormData({
                                      name: subject.name,
                                      code: subject.code || ''
                                    });
                                    setIsDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDelete(subject.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
