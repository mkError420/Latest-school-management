import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Target, Heart, Award, ShieldCheck, Zap, Users } from 'lucide-react';
import { useAuth } from '@/src/lib/auth';

export default function About() {
  const { systemConfig } = useAuth();

  return (
    <div className="flex flex-col pt-36">
      {/* Header Bio */}
      <section className="py-24 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 text-emerald-700 font-bold tracking-[0.2em] text-[10px] uppercase">
                 History & Legacy
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-emerald-900 tracking-tight leading-none uppercase">
                Established for <span className="text-red-700">Excellence</span> and Pride
              </h1>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                {systemConfig?.history || "Our institution stands as a testament to the commitment of providing world-class education within a traditional setting. Since its inception, we have been dedicated to nurturing the intellectual, social, and moral growth of our students, preparing them for the challenges of a globalized world."}
              </p>
              <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="border-l-4 border-emerald-700 pl-4">
                  <h4 className="text-2xl font-black text-emerald-900 leading-none">25+ Years</h4>
                  <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 mt-2">Glorious Years</p>
                </div>
                <div className="border-l-4 border-red-600 pl-4">
                  <h4 className="text-2xl font-black text-emerald-900 leading-none">10,000+</h4>
                  <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 mt-2">Brilliant Alumni</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-lg overflow-hidden shadow-2xl border-4 border-white ring-1 ring-gray-200">
                <img 
                  src="https://images.unsplash.com/photo-1544717297-fa157df0961f?q=80&w=2670&auto=format&fit=crop" 
                  alt="School Campus" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-24 bg-emerald-950 text-white relative border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="p-12 rounded-lg bg-white/5 border border-white/10 text-left">
              <h2 className="text-2xl font-black mb-6 tracking-tight uppercase text-emerald-400 border-b border-white/10 pb-4">Our Mission</h2>
              <p className="text-emerald-50/70 text-[13px] leading-relaxed font-medium italic">
                "{systemConfig?.mission || "To implement modern, inclusive, and quality education systems that foster creativity and critical thinking among students while maintaining traditional values."}"
              </p>
            </div>
            <div className="p-12 rounded-lg bg-white/5 border border-white/10 text-left">
              <h2 className="text-2xl font-black mb-6 tracking-tight uppercase text-emerald-400 border-b border-white/10 pb-4">Our Vision</h2>
              <p className="text-emerald-50/70 text-[13px] leading-relaxed font-medium italic">
                "{systemConfig?.vision || "To be an exemplary center of learning in the national landscape, producing disciplined and enlightened citizens for a Digitally Smart Bangladesh."}"
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
