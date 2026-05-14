import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, FileText, Download, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface DownloadItem { id: string; name: string; url: string; size: string; category: string; }

export default function Academic() {
  const [documents, setDocuments] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDownloads = async () => {
      try {
        const response = await fetch('/api/website/downloads');
        const docs = await response.json();
        // docs might not be an array
        if (Array.isArray(docs) && docs.length > 0) {
          setDocuments(docs.map((d: any) => ({ ...d, id: d._id })));
        } else {
          setDocuments([
            { id: '1', name: 'Academic Calendar 2024', size: '1.2 MB', url: '#', category: 'Academic' },
            { id: '2', name: 'Syllabus for Class VI-X', size: '2.5 MB', url: '#', category: 'Academic' },
            { id: '3', name: 'Class Routine 2024', size: '0.8 MB', url: '#', category: 'Academic' },
          ]);
        }
      } catch (error) {
        console.error("Error fetching downloads:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDownloads();
  }, []);

  return (
    <div className="bg-[#f0f2f5] min-h-screen pt-44 pb-20 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black text-emerald-900 uppercase tracking-tighter">Academic Corner</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Resources and information for students</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
               <div className="flex items-center gap-3 mb-6">
                 <BookOpen className="w-6 h-6 text-emerald-700" />
                 <h2 className="text-xl font-black text-emerald-900 uppercase tracking-tighter">Academic Overview</h2>
               </div>
               <p className="text-sm text-gray-600 leading-relaxed font-medium">
                 Our institution follows the National Curriculum under the Board of Intermediate and Secondary Education, Dhaka. We offer science, commerce, and humanities streams for secondary and higher secondary students. Our teaching methodology is centered on practical learning and values-based education.
               </p>
            </div>

            <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
               <div className="flex items-center gap-3 mb-6">
                 <Calendar className="w-6 h-6 text-emerald-700" />
                 <h2 className="text-xl font-black text-emerald-900 uppercase tracking-tighter">Class Schedule</h2>
               </div>
               <p className="text-sm text-gray-600 leading-relaxed mb-6 font-medium">
                 Classes are held from Sunday to Thursday, starting at 10:00 AM and ending at 4:30 PM. Each period lasts for 45 minutes with a 30-minute prayer and lunch break.
               </p>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-[11px] font-bold uppercase tracking-widest">
                   <thead className="bg-gray-50 text-gray-400">
                     <tr>
                       <th className="p-3">Period</th>
                       <th className="p-3">Time</th>
                       <th className="p-3">Duration</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {['1st', '2nd', 'Break', '3rd', '4th'].map((p, i) => (
                       <tr key={i} className="hover:bg-gray-50">
                          <td className="p-3">{p} Period</td>
                          <td className="p-3">{10 + i}:00 AM</td>
                          <td className="p-3">45 Min</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-emerald-900 text-white rounded-lg p-8 shadow-md">
               <div className="flex items-center gap-3 mb-6">
                 <Download className="w-6 h-6 text-emerald-400" />
                 <h2 className="text-lg font-black uppercase tracking-tighter">Downloads</h2>
               </div>
               <div className="space-y-4">
                  {documents.map((doc) => (
                    <a 
                      key={doc.id} 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex justify-between items-center group cursor-pointer"
                    >
                       <span className="text-[11px] font-bold uppercase tracking-widest group-hover:text-emerald-400 transition-colors">
                         {doc.name}
                       </span>
                       <span className="text-[9px] font-black text-white/40 uppercase group-hover:text-white transition-colors">{doc.size}</span>
                    </a>
                  ))}
               </div>
               <Button className="w-full mt-8 bg-emerald-700 hover:bg-emerald-800 text-white font-black uppercase tracking-widest text-[10px]">
                 Browse All Files
               </Button>
            </div>

            <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm text-center">
               <Award className="w-12 h-12 text-emerald-700 mx-auto mb-4" />
               <h3 className="text-sm font-black text-emerald-900 uppercase tracking-widest">Result History</h3>
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 leading-relaxed">
                 Celebrating 100% GPA-5 results consistently over five years in public examinations.
               </p>
               <Link to="/website-results" className="inline-block mt-4 text-[10px] font-black text-red-600 hover:underline uppercase tracking-widest">View Archives</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
