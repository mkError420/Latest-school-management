import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  Plus, 
  Search, 
  Book, 
  User, 
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  ArrowRightLeft
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
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  available: number;
  total: number;
}

export default function Library() {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'library_books'), orderBy('title'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Book[];
      setBooks(bookData);
    });
    return () => unsubscribe();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Library Management</h1>
            <p className="text-sidebar-foreground">Manage book inventory and student borrowings.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-border text-sidebar-foreground hover:bg-sidebar-accent">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Issue/Return
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Book
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-xs font-medium text-sidebar-foreground uppercase tracking-wider mb-5">Total Books</span>
            <div className="text-[28px] font-bold text-white mb-1">4,285</div>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-xs font-medium text-primary uppercase tracking-wider mb-5">Issued Books</span>
            <div className="text-[28px] font-bold text-white mb-1">342</div>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-xs font-medium text-rose-500 uppercase tracking-wider mb-5">Overdue</span>
            <div className="text-[28px] font-bold text-white mb-1">18</div>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-xs font-medium text-emerald-500 uppercase tracking-wider mb-5">New Arrivals</span>
            <div className="text-[28px] font-bold text-white mb-1">24</div>
          </Card>
        </div>

        <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-none">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
            <Input 
              placeholder="Search by title, author, or ISBN..." 
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
                <TableHead className="font-semibold text-sidebar-foreground">Book Details</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Category</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">ISBN</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Availability</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Status</TableHead>
                <TableHead className="text-right font-semibold text-sidebar-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.length > 0 ? (
                books.map((book) => (
                  <TableRow key={book.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Book className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{book.title}</p>
                          <p className="text-xs text-sidebar-foreground">{book.author}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-sidebar-accent text-sidebar-foreground">
                        {book.category}
                      </div>
                    </TableCell>
                    <TableCell className="text-sidebar-foreground font-mono text-xs">{book.isbn}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="text-[10px] text-sidebar-foreground uppercase font-bold">
                          {book.available} / {book.total} available
                        </div>
                        <div className="w-24 h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${(book.available / book.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {book.available > 0 ? (
                        <div className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500">
                          In Stock
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500">
                          Out of Stock
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-primary hover:bg-sidebar-accent">Details</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-sidebar-foreground">
                    No books found in the library.
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
