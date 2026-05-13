import React from 'react';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function Contact() {
  return (
    <div className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">Get in Touch</h1>
          <p className="text-gray-500 text-xl font-medium">Have questions? We're here to help you. Reach out to us via any of the channels below.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-8">
            {[
              { icon: Phone, title: 'Call Us', value: '+1 (234) 567 890', sub: 'Mon-Fri from 8am to 5pm' },
              { icon: Mail, title: 'Email Us', value: 'admission@school.edu', sub: 'Our friendly team is here to help.' },
              { icon: MapPin, title: 'Visit Us', value: '123 Education Lane', sub: 'Learning City, State 54321' },
              { icon: Clock, title: 'Office Hours', value: '8:00 AM - 4:00 PM', sub: 'Sunday to Thursday' },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shrink-0 border border-primary/10">
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-1">{item.title}</h4>
                  <p className="text-lg font-bold text-gray-900">{item.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 sm:p-12 rounded-[40px] border border-gray-100 shadow-2xl shadow-gray-200/50"
            >
              <form className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Full Name</label>
                  <input type="text" placeholder="John Doe" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Email Address</label>
                  <input type="email" placeholder="john@example.com" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Subject</label>
                  <input type="text" placeholder="Admission Inquiry" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Message</label>
                  <textarea rows={6} placeholder="Tell us how we can help..." className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"></textarea>
                </div>
                <div className="sm:col-span-2 pt-4">
                  <Button className="w-full sm:w-auto px-12 h-14 rounded-full font-bold uppercase tracking-widest text-sm shadow-xl shadow-primary/20">
                    Send Message <Send className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
