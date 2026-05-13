import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogIn, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/src/lib/auth';
import { cn } from '@/lib/utils';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { systemConfig, user } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'About Us', href: '/about' },
    { name: 'Administration', href: '/administration' },
    { name: 'Academic', href: '/academic' },
    { name: 'Gallery', href: '/gallery' },
    { name: 'Result', href: '/website-results' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header className="fixed top-0 w-full z-50 transition-all bg-white border-b-4 border-emerald-700 shadow-md">
      {/* Top Bar - Scrolling Ticker */}
      <div className="bg-emerald-800 text-white overflow-hidden py-1.5 border-b border-emerald-900/20">
        <div className="max-w-7xl mx-auto px-4 flex items-center">
          <div className="bg-red-600 px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-sm mr-4 animate-pulse shrink-0">
            Latest News
          </div>
          <div className="flex-1 overflow-hidden whitespace-nowrap">
            <div className="inline-block animate-marquee hover:pause-marquee cursor-default text-[11px] font-medium tracking-wide">
              Welcome to {systemConfig?.schoolName || 'Our Institution'} Online Portal • Admissions for 2024 Academic Session in Classes VI-IX are now open • Term-1 Examination results have been published • Follow us for latest updates.
            </div>
          </div>
        </div>
      </div>

      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link to="/" className="flex items-center gap-4 group">
            {systemConfig?.schoolLogoUrl ? (
              <img src={systemConfig.schoolLogoUrl} alt="Logo" className="h-14 w-auto" />
            ) : (
              <div className="w-14 h-14 bg-emerald-700 rounded-lg flex items-center justify-center text-white font-bold text-2xl border-4 border-red-600 shadow-inner">
                {systemConfig?.schoolName?.[0] || 'G'}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black text-emerald-900 leading-tight tracking-tighter uppercase">
                {systemConfig?.schoolName || 'Govt. Model School & College'}
              </span>
              <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mt-0.5">
                Ministry of Education, Bangladesh
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                to={item.href} 
                className={cn(
                  "text-[12px] font-bold uppercase tracking-wider transition-colors py-2",
                  location.pathname === item.href ? "text-emerald-700 border-b-2 border-emerald-700" : "text-gray-600 hover:text-emerald-700"
                )}
              >
                {item.name}
              </Link>
            ))}
            <Button variant="default" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-md px-5 font-bold uppercase tracking-widest text-[10px]">
              <Link to={user ? "/dashboard" : "/login"} className="flex items-center">
                <LogIn className="w-4 h-4 mr-2" />
                {user ? "Dashboard" : "Portal Login"}
              </Link>
            </Button>
          </div>


          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile nav */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}
          <Button className="w-full mt-4">
            <Link to={user ? "/dashboard" : "/login"}>
              {user ? "Dashboard" : "Login"}
            </Link>
          </Button>
        </div>
      )}
    </header>
  );
}
