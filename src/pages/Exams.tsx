import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  Plus, 
  Search, 
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Exam {
  id: string;
  subject: string;
  classId: string;
  date: string;
  time: string;
  type: string;
  status: 'scheduled' | 'completed' | 'ongoing';
}

export default function Exams() {
  const [exams, setExams] = useState<Exam[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'exams'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const examData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Exam[];
      setExams(examData);
    });
    return () => unsubscribe();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Exam Portal</h1>
            <p className="text-sidebar-foreground">Schedule exams, manage results, and track student performance.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-border text-sidebar-foreground hover:bg-sidebar-accent">
              <FileText className="w-4 h-4 mr-2" />
              Generate Reports
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Exam
            </Button>
          </div>
        </div>

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="bg-sidebar-accent/50 p-1 rounded-lg mb-6 border border-border">
            <TabsTrigger value="schedule" className="data-[state=active]:bg-primary data-[state=active]:text-white">Exam Schedule</TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-primary data-[state=active]:text-white">Results & Grading</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card border-border p-5 flex flex-col shadow-none">
                <span className="text-sm font-semibold text-sidebar-foreground mb-5">Upcoming Exams</span>
                <div className="text-[28px] font-bold text-white mb-1">12</div>
                <p className="text-xs text-sidebar-foreground mt-1">Next 30 days</p>
              </Card>
              <Card className="bg-card border-border p-5 flex flex-col shadow-none">
                <span className="text-sm font-semibold text-primary mb-5">Ongoing Exams</span>
                <div className="text-[28px] font-bold text-white mb-1">2</div>
                <p className="text-xs text-sidebar-foreground mt-1">Currently in progress</p>
              </Card>
              <Card className="bg-card border-border p-5 flex flex-col shadow-none">
                <span className="text-sm font-semibold text-emerald-500 mb-5">Completed</span>
                <div className="text-[28px] font-bold text-white mb-1">45</div>
                <p className="text-xs text-sidebar-foreground mt-1">This semester</p>
              </Card>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-none">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-white">Scheduled Exams</h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
                  <Input placeholder="Search exams..." className="pl-10 h-9 bg-background border-border text-foreground" />
                </div>
              </div>
              <Table>
                <TableHeader className="bg-sidebar-accent/30">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-semibold text-sidebar-foreground">Subject</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Class</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Date & Time</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Type</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Status</TableHead>
                    <TableHead className="text-right font-semibold text-sidebar-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.length > 0 ? (
                    exams.map((exam) => (
                      <TableRow key={exam.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <GraduationCap className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-semibold text-white">{exam.subject}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sidebar-foreground">{exam.classId}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium text-white">{format(new Date(exam.date), 'MMM dd, yyyy')}</p>
                            <p className="text-xs text-sidebar-foreground">{exam.time}</p>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize text-sidebar-foreground">{exam.type}</TableCell>
                        <TableCell>
                          <div className={cn(
                            "inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                            exam.status === 'scheduled' ? "bg-primary/10 text-primary" :
                            exam.status === 'ongoing' ? "bg-amber-500/10 text-amber-500" :
                            "bg-emerald-500/10 text-emerald-500"
                          )}>
                            {exam.status === 'scheduled' && <Calendar className="w-3 h-3 mr-1" />}
                            {exam.status === 'ongoing' && <Clock className="w-3 h-3 mr-1" />}
                            {exam.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {exam.status}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-primary hover:bg-sidebar-accent">Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sidebar-foreground">
                        No exams scheduled.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="results">
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-sidebar-accent/50 rounded-full mb-4">
                  <FileText className="w-12 h-12 text-sidebar-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-white">No Results Found</h3>
                <p className="text-sidebar-foreground max-w-xs mx-auto mt-2">
                  Select an exam from the schedule to start entering grades and generating results.
                </p>
                <Button className="mt-6 bg-primary hover:bg-primary/90 text-white">
                  Enter Grades
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
