import React from 'react';
import Header from './Header';
import Footer from './Footer';

interface WebsiteLayoutProps {
  children: React.ReactNode;
}

export default function WebsiteLayout({ children }: WebsiteLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16 sm:pt-20">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
