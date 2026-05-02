import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/src/lib/auth';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { systemConfig } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const from = location.state?.from?.pathname || '/';

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Successfully logged in');
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to login with email. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create new user profile with default role 'student' (or based on email if needed)
        // For this demo, we'll make the first user an admin
        const isFirstUser = user.email === 'mk.rabbani.cse@gmail.com';
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: isFirstUser ? 'admin' : 'student',
          createdAt: new Date().toISOString(),
        });
        toast.success(`Welcome ${user.displayName}! Your account has been created.`);
      } else {
        toast.success(`Welcome back, ${user.displayName}!`);
      }

      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to login. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl">
        <CardHeader className="text-center space-y-1">
          <div className="flex justify-center mb-4">
            {systemConfig?.schoolLogoUrl ? (
              <img 
                src={systemConfig.schoolLogoUrl} 
                alt="School Logo" 
                className="w-24 h-24 object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
            )}
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white mb-2">
            {systemConfig?.schoolName || 'EduFlow'}
          </CardTitle>
          <CardDescription className="text-sidebar-foreground">
            {systemConfig?.schoolName ? 'School Management System' : 'Comprehensive School Management System'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-sidebar-foreground ml-1">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground opacity-40" />
                <Input 
                  id="email"
                  type="email" 
                  placeholder="name@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-white/5 border-border text-[13px] text-white focus:ring-primary focus:border-primary transition-all rounded-xl"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-sidebar-foreground ml-1">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground opacity-40" />
                <Input 
                  id="password"
                  type="password" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-white/5 border-border text-[13px] text-white focus:ring-primary focus:border-primary transition-all rounded-xl"
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-[11px] rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border opacity-50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-[9px] font-black tracking-widest text-sidebar-foreground">OR CONTINUE WITH</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-11 text-white font-bold uppercase tracking-widest text-[10px] border-border bg-white/5 hover:bg-white/10 transition-all rounded-xl"
            onClick={handleGoogleLogin}
            type="button"
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google" 
              className="w-4 h-4 mr-3"
            />
            Google Workspace
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-center">
          <p className="text-xs text-sidebar-foreground px-8">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
