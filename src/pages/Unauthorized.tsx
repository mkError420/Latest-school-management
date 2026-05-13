import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, Home, UserCheck, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { auth } from '@/src/lib/firebase';
import { signOut } from 'firebase/auth';

export default function Unauthorized() {
  const location = useLocation();
  const isUnapproved = location.state?.reason === 'unapproved';

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="p-4 bg-rose-500/10 rounded-full mb-6">
        {isUnapproved ? (
          <UserCheck className="w-12 h-12 text-amber-500" />
        ) : (
          <ShieldAlert className="w-12 h-12 text-rose-500" />
        )}
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">
        {isUnapproved ? 'Awaiting Approval' : 'Access Denied'}
      </h1>
      <p className="text-sidebar-foreground mb-8 max-w-md">
        {isUnapproved 
          ? "Your account authentication was successful, but you haven't been approved for access yet. Please contact an institutional administrator to activate your identity."
          : "You don't have permission to access this page. Please contact your administrator if you believe this is a mistake."}
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        {!isUnapproved && (
          <Link to="/">
            <Button className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        )}
        <Button 
          variant="outline" 
          className="border-border text-white hover:bg-white/5 w-full sm:w-auto"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
