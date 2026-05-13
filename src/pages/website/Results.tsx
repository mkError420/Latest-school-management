import React, { useState } from 'react';
import { Search, GraduationCap, Download, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/src/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

interface Result {
  id: string;
  studentRoll: string;
  studentName: string;
  examName: string;
  grade: string;
  percentage: number;
  date: string;
}

export default function Results() {
  const [rollNumber, setRollNumber] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!rollNumber) {
      toast.error('Please enter a roll number');
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, 'exam_results'), where('studentRoll', '==', rollNumber));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Result[];
      setResults(data);
      if (data.length === 0) {
        toast.info('No results found for this roll number');
      }
    } catch (error) {
      console.error('Error searching results:', error);
      toast.error('Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-24 min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">Student Exam Results</h1>
          <p className="text-gray-500 text-lg font-medium">Verify your academic performance. Enter your unique roll identifier to view results.</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-2 rounded-[32px] border border-gray-100 shadow-2xl shadow-gray-200/50 flex gap-2">
            <input 
              type="text" 
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="Enter Student Roll Number (e.g. S101)" 
              className="flex-1 bg-transparent border-none px-8 py-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 outline-none font-bold uppercase tracking-widest text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button 
              onClick={handleSearch}
              disabled={loading}
              className="rounded-[24px] px-8 py-6 font-bold uppercase tracking-widest text-[11px]"
            >
              {loading ? 'Searching...' : <><Search className="w-4 h-4 mr-2" /> Search Results</>}
            </Button>
          </div>

          <div className="mt-16 space-y-6">
            {results.length > 0 ? results.map((res) => (
              <div key={res.id} className="bg-white rounded-3xl border border-gray-100 p-8 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-primary/20 transition-all shadow-sm">
                <div className="space-y-4 text-center md:text-left">
                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
                    <span className="bg-primary/5 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-primary/10">
                      {res.examName}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> {res.date}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight uppercase">{res.studentName}</h3>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-1">Roll: {res.studentRoll}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8">
                  <div className="text-center">
                    <div className="text-4xl font-extrabold text-primary tracking-tighter">{res.grade}</div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Grade</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-extrabold text-gray-900 tracking-tighter">{res.percentage}%</div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Score</div>
                  </div>
                  <Button variant="outline" size="icon" className="w-12 h-12 rounded-2xl border-gray-100 text-gray-400 hover:text-primary hover:border-primary/20">
                    <Download className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )) : !loading && rollNumber && results.length === 0 ? (
               <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-gray-200">
                  <p className="text-gray-400 uppercase tracking-widest font-bold text-sm">Search to view results</p>
               </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
