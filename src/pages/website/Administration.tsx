import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Users, Briefcase } from 'lucide-react';

interface StaffMember { id: string; name: string; role: string; imageUrl: string; }
interface CommitteeMember { id: string; name: string; title: string; }

export default function Administration() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [committee, setCommittee] = useState<CommitteeMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [staffRes, committeeRes] = await Promise.all([
          fetch('/api/website/public_staff'),
          fetch('/api/website/committee')
        ]);
        
        const staffData = await staffRes.json();
        const committeeData = await committeeRes.json();
        
        if (Array.isArray(staffData) && staffData.length > 0) {
          setStaff(staffData.map((s: any) => ({ ...s, id: s._id })));
        } else {
          setStaff([
            { id: '1', name: 'Prof. Md. Abdullah', role: 'Principal', imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a' },
            { id: '2', name: 'Mrs. Rokeya Begum', role: 'Vice Principal', imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2' },
          ]);
        }
        
        if (Array.isArray(committeeData) && committeeData.length > 0) {
          setCommittee(committeeData.map((c: any) => ({ ...c, id: c._id })));
        } else {
          setCommittee([
            { id: '1', name: 'Alhaj Md. Karim', title: 'Chairman' },
            { id: '2', name: 'Dr. Sofia Ahmed', title: 'Member' },
          ]);
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="bg-[#f0f2f5] min-h-screen pt-44 pb-20 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black text-emerald-900 uppercase tracking-tighter">Administration</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Meet our leadership and staff</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {staff.map((p, i) => (
            <motion.div 
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-[3/4] relative">
                <img 
                  src={`${p.imageUrl || 'https://via.placeholder.com/600x800'}?q=80&w=1000&auto=format&fit=crop`} 
                  alt={p.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/80 to-transparent flex items-end p-6">
                  <div className="text-white">
                    <h3 className="text-xl font-black uppercase leading-none">{p.name}</h3>
                    <p className="text-xs font-bold text-emerald-300 mt-2 uppercase tracking-widest">{p.role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-white p-12 rounded-lg border border-gray-200 shadow-sm">
           <div className="flex items-center gap-4 mb-8">
              <Shield className="w-8 h-8 text-emerald-700" />
              <h2 className="text-2xl font-black text-emerald-900 uppercase tracking-tighter">Managing Committee</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {committee.map((m) => (
                <div key={m.id} className="flex justify-between items-center border-b border-gray-100 pb-3">
                   <span className="text-[13px] font-black text-gray-700 uppercase">{m.name}</span>
                   <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{m.title}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
