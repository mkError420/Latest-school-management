import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Megaphone, 
  ArrowRight, 
  BookOpen, 
  GraduationCap, 
  ExternalLink,
  ChevronRight,
  User,
  Calendar,
  Award,
  Link as LinkIcon,
  Globe,
  FileText,
  Clock,
  Shield,
  Heart,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '@/src/lib/auth';
import { collection, query, limit, getDocs, orderBy, where } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { cn } from '@/lib/utils';

interface Notice {
  id: string;
  title: string;
  date: string;
  content: string;
  type?: 'notice' | 'exam';
}

export default function Home() {
  const { systemConfig } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [importantLinks, setImportantLinks] = useState<{name: string, url: string}[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const nq = query(collection(db, 'notices'), orderBy('date', 'desc'), limit(5));
        const nSnap = await getDocs(nq);
        setNotices(nSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]);

        const lq = query(collection(db, 'important_links'), orderBy('order', 'asc'));
        const lSnap = await getDocs(lq);
        const linksData = lSnap.docs.map(doc => doc.data()) as any[];
        
        if (linksData.length > 0) {
          setImportantLinks(linksData);
        } else {
          setImportantLinks([
            { name: 'Ministry of Education', url: 'http://www.moedu.gov.bd/' },
            { name: 'Directorate of Secondary and Higher Education', url: 'http://www.dshe.gov.bd/' },
            { name: 'Dhaka Education Board', url: 'http://www.dhakaeducationboard.gov.bd/' },
            { name: 'National Curriculum & Textbook Board', url: 'http://www.nctb.gov.bd/' },
            { name: 'BANBEIS', url: 'http://www.banbeis.gov.bd/' },
            { name: 'Teachers Portal', url: 'https://www.teachers.gov.bd/' },
          ]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="bg-[#f0f2f5] min-h-screen pt-40 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Sidebar - Important Links */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-emerald-700 text-white px-4 py-2.5 flex items-center gap-2 border-b-2 border-red-600">
                <LinkIcon className="w-4 h-4" />
                <h3 className="text-[12px] font-bold uppercase tracking-widest">Important Links</h3>
              </div>
              <ul className="divide-y divide-gray-100">
                {importantLinks.map((link, i) => (
                  <li key={i}>
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-4 py-3 text-[11px] text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-between group transition-all"
                    >
                      <span className="font-bold flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-700 rounded-full"></div>
                        {link.name}
                      </span>
                      <ChevronRight className="w-3 h-3 text-gray-300 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded shadow-sm border border-gray-200 p-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded p-4 text-center">
                <Globe className="w-8 h-8 text-emerald-700 mx-auto mb-2" />
                <h4 className="text-xs font-black text-emerald-900 uppercase">National Portal</h4>
                <a href="https://bangladesh.gov.bd" target="_blank" className="text-[9px] text-emerald-600 font-bold block mt-1 hover:underline">bangladesh.gov.bd</a>
              </div>
            </div>
            
            {/* Student Welfare */}
            <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-emerald-700 text-white px-4 py-2.5 flex items-center gap-2 border-b-2 border-red-600">
                <Shield className="w-4 h-4" />
                <h3 className="text-[12px] font-bold uppercase tracking-widest">Student Welfare</h3>
              </div>
              <div className="p-4 space-y-3">
                 <Link to="/academic" className="flex items-center gap-3 p-2 rounded hover:bg-emerald-50 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors shrink-0">
                      <Heart className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-tighter">Student Aid Fund</span>
                 </Link>
                 <Link to="/academic" className="flex items-center gap-3 p-2 rounded hover:bg-emerald-50 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-tighter">Counseling Center</span>
                 </Link>
                 <Link to="/academic" className="flex items-center gap-3 p-2 rounded hover:bg-emerald-50 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-tighter">Stipend Program</span>
                 </Link>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-6 space-y-6">
            {/* Banner Area */}
            <div className="relative aspect-[16/9] bg-gray-200 rounded shadow-sm overflow-hidden border border-gray-200">
              <img 
                src="https://images.unsplash.com/photo-1523050854058-8df91d10c715?q=80&w=2670&auto=format&fit=crop" 
                alt="School Building" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/20 to-transparent flex flex-col justify-end p-8 text-white">
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter leading-none mb-2 border-l-4 border-red-600 pl-4">
                  Welcome to {systemConfig?.schoolName || 'Govt. Model School & College'}
                </h1>
                <p className="text-xs font-bold opacity-90 max-w-lg leading-relaxed uppercase tracking-wider">
                   Establishing Excellence in Education, Character and Discipline.
                </p>
              </div>
            </div>

            {/* Notice Board Area */}
            <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
               <div className="bg-emerald-700 text-white px-6 py-3.5 flex items-center justify-between border-b-2 border-red-600">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5" />
                    <h3 className="text-[13px] font-black uppercase tracking-widest">Notice Board</h3>
                  </div>
                  <Link to="/notices" className="text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></Link>
               </div>
               <div className="bg-emerald-50/30">
                  {notices.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {notices.map((notice) => (
                        <div key={notice.id} className="p-5 hover:bg-white transition-all flex gap-5 items-start group">
                          <div className="bg-white border border-emerald-100 p-2.5 rounded shadow-sm text-center min-w-[75px]">
                            <span className="block text-emerald-700 font-black text-2xl leading-none">
                              {new Date(notice.date).getDate()}
                            </span>
                            <span className="text-[11px] text-gray-500 font-black uppercase tracking-tighter">
                              {new Date(notice.date).toLocaleString('default', { month: 'short' })}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-[13px] font-black text-emerald-900 group-hover:text-red-600 transition-colors uppercase leading-tight">
                              {notice.title}
                            </h4>
                            <p className="text-[11px] text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                              {notice.content}
                            </p>
                            <div className="flex items-center gap-4 mt-3">
                               <Link to={`/notice/${notice.id}`} className="flex items-center gap-1 text-[10px] text-emerald-700 font-black hover:underline uppercase tracking-tighter">
                                  Read Details
                               </Link>
                               <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                               <span className="text-[9px] text-gray-400 font-bold uppercase">{notice.date}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-24 text-center text-gray-400">
                       <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-10" />
                       <p className="text-xs font-bold uppercase tracking-widest italic">No current notices posted</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Functional Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               {[
                 { label: 'Admission', icon: FileText, color: 'bg-emerald-700' },
                 { label: 'Syllabus', icon: BookOpen, color: 'bg-red-700' },
                 { label: 'Results', icon: Award, color: 'bg-emerald-900' },
                 { label: 'Calendar', icon: Calendar, color: 'bg-emerald-800' },
               ].map((item, i) => (
                 <Link key={i} to={`/${item.label.toLowerCase()}`} className="bg-white p-5 rounded shadow-sm border border-gray-200 text-center group hover:bg-emerald-50 transition-all border-b-4 border-b-transparent hover:border-b-red-600">
                    <div className={cn("w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center text-white transition-all group-hover:-translate-y-1", item.color)}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">{item.label}</span>
                 </Link>
               ))}
            </div>
          </main>

          {/* Right Sidebar */}
          <aside className="lg:col-span-3 space-y-6">
            {/* Head of Institution */}
            <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-emerald-700 text-white px-4 py-2.5 border-b-2 border-red-600">
                <h3 className="text-[12px] font-bold uppercase tracking-widest">Message from Principal</h3>
              </div>
              <div className="p-6 text-center">
                 <div className="relative inline-block mb-4">
                    <div className="w-36 h-44 rounded bg-gray-100 overflow-hidden mx-auto border-2 border-gray-200 shadow-sm">
                      <img 
                        src={systemConfig?.principalImageUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=2574&auto=format&fit=crop"}
                        alt="Principal" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                 </div>
                 <h4 className="text-emerald-950 font-black text-[13px] uppercase tracking-tight mt-2">{systemConfig?.principalName || 'Prof. Md. Abdullah'}</h4>
                 <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-4">Principal</p>
                 <div className="text-[11px] text-gray-600 font-medium px-2 mt-2 leading-relaxed text-left border-t border-gray-50 pt-4 italic">
                    "{systemConfig?.principalMessage || "We envision an institution that provides inclusive and balanced education for all citizens of the country..."}"
                 </div>
                 <Link to="/about" className="block mt-6 text-[10px] font-black text-emerald-700 uppercase tracking-widest hover:underline bg-emerald-50 py-2 rounded">
                    Read Full Message
                 </Link>
              </div>
            </div>

            {/* Quick Stats Dashboard */}
            <div className="bg-emerald-900 rounded shadow-sm p-6 text-white border-b-4 border-red-600">
               <h3 className="text-center text-[11px] font-black uppercase tracking-[0.2em] mb-5 text-emerald-400 border-b border-white/10 pb-3">Academic Overview</h3>
               <div className="space-y-4">
                  <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest border-b border-white/5 pb-2">
                    <span className="text-white/60">Total Students</span>
                    <span className="text-emerald-300">4,250</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest border-b border-white/5 pb-2">
                    <span className="text-white/60">Academic Staff</span>
                    <span className="text-emerald-300">145</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest">
                    <span className="text-white/60">Success Rate</span>
                    <span className="text-emerald-300">99.2%</span>
                  </div>
               </div>
            </div>

            {/* External Portals Section */}
            <div className="bg-white rounded shadow-sm border border-gray-200 p-5">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-5">E-Services & Portals</h4>
                <div className="grid grid-cols-2 gap-3">
                   <a href="#" className="flex flex-col items-center justify-center p-3 rounded bg-gray-50 hover:bg-emerald-50 transition-colors border border-gray-100">
                      <FileText className="w-5 h-5 text-emerald-700 mb-1" />
                      <span className="text-[8px] font-black text-gray-600 uppercase">Admission</span>
                   </a>
                   <a href="#" className="flex flex-col items-center justify-center p-3 rounded bg-gray-50 hover:bg-emerald-50 transition-colors border border-gray-100">
                      <Clock className="w-5 h-5 text-emerald-700 mb-1" />
                      <span className="text-[8px] font-black text-gray-600 uppercase">Routine</span>
                   </a>
                </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
