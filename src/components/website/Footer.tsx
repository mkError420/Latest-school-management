import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Users, BookOpen, GraduationCap, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth } from '@/src/lib/auth';

export default function Footer() {
  const { systemConfig } = useAuth();
  
  return (
    <footer className="bg-emerald-950 text-white pt-16 pb-12 border-t-4 border-red-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-black text-emerald-900 border-2 border-red-600">
               {systemConfig?.schoolName?.[0] || 'G'}
             </div>
             <h3 className="text-xl font-black uppercase tracking-tight leading-none">
               {systemConfig?.schoolName || 'Govt. Model School'}
             </h3>
          </div>
          <p className="text-emerald-100/60 text-[11px] font-medium leading-relaxed uppercase tracking-wider">
            Building a smarter Bangladesh through quality education and discipline. An official digital portal of our institution.
          </p>
          <div className="flex space-x-4">
            <a href="#" className="w-8 h-8 rounded bg-white/10 flex items-center justify-center hover:bg-red-600 transition-colors">
              <Globe className="w-4 h-4 text-white" />
            </a>
            <a href="#" className="w-8 h-8 rounded bg-white/10 flex items-center justify-center hover:bg-red-600 transition-colors">
              <Mail className="w-4 h-4 text-white" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-[12px] font-black uppercase tracking-[0.2em] mb-6 text-emerald-400">Institutional Links</h4>
          <ul className="space-y-4 text-[11px] font-bold text-emerald-100/80 uppercase tracking-widest">
            <li><Link to="/about" className="hover:text-white transition-colors">About Institution</Link></li>
            <li><Link to="/gallery" className="hover:text-white transition-colors">Digital Gallery</Link></li>
            <li><Link to="/website-results" className="hover:text-white transition-colors">Public Results</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Communication</Link></li>
            <li><Link to="/login" className="hover:text-white transition-colors">Administrative Access</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[12px] font-black uppercase tracking-[0.2em] mb-6 text-emerald-400">Govt. Portals</h4>
          <ul className="space-y-4 text-[11px] font-bold text-emerald-100/80 uppercase tracking-widest">
            <li><a href="https://bangladesh.gov.bd" target="_blank" className="hover:text-white transition-colors">National Portal</a></li>
            <li><a href="http://moedu.gov.bd" target="_blank" className="hover:text-white transition-colors">Ministry of Education</a></li>
            <li><a href="https://a2i.gov.bd" target="_blank" className="hover:text-white transition-colors">a2i (Access to Info)</a></li>
            <li><a href="http://dshe.gov.bd" target="_blank" className="hover:text-white transition-colors">DSHE Online</a></li>
            <li><a href="https://www.teachers.gov.bd" target="_blank" className="hover:text-white transition-colors">Teachers Portal</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[12px] font-black uppercase tracking-[0.2em] mb-6 text-emerald-400">Official Contact</h4>
          <ul className="space-y-4 text-[11px] font-bold text-emerald-100/80 uppercase tracking-widest">
            <li className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="leading-relaxed">{systemConfig?.address || 'Govt. Colony, Sector-A, Educational Zone, Dhaka'}</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{systemConfig?.phone || '+880 (123) 4567 890'}</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{systemConfig?.email || 'info@govt-school.edu.bd'}</span>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-white/5 text-center flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest">
          © {new Date().getFullYear()} {systemConfig?.schoolName || 'Govt. Model School'}. All Rights Reserved.
        </p>
        <p className="text-[10px] font-black text-emerald-400/40 uppercase tracking-widest">
          Technical Partner: a2i & ICT Division
        </p>
      </div>
    </footer>
  );
}
