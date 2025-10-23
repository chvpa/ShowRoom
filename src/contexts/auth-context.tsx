import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Session } from '@supabase/supabase-js';

// Define user type for proper type checking
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'cliente';
  active: boolean;
}

// Define error type for auth operations
interface AuthError {
  message: string;
  code?: string;
}

// Auth context type with proper typing
interface AuthContextType {
  user: User | null;
  loading: boolean;
  session: Session | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check authentication state - memoized with useCallback
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if there's a Supabase session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;

      setSession(sessionData.session);
      
      // If session exists, get user data from our custom table
      if (sessionData.session) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .single();
        
        if (userError) throw userError;
        
        if (userData) {
          // Check if user is active
          if (!userData.active) {
            await logout();
            toast({
              title: "Account deactivated",
              description: "Your account has been deactivated. Please contact an administrator.",
              variant: "destructive",
            });
            return;
          }
          
          setUser(userData as User);
        }
      }
    } catch (error) {
      console.error('Authentication check error:', error);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Set up auth state listener
  useEffect(() => {
    // Initial auth check
    checkAuth();
    
    // Subscribe to auth changes - OPTIMIZADO para evitar refrescos innecesarios
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      setSession(session);
      
      // Solo checkAuth si es un cambio real de sesión, no por cambios de foco
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        checkAuth();
      }
    });
    
    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [checkAuth]);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Try to sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Get user data from our custom table
      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
        
        if (userError) throw userError;
        
        // Check if user is active
        if (!userData.active) {
          await logout();
          toast({
            title: "Account deactivated",
            description: "Your account has been deactivated. Please contact an administrator.",
            variant: "destructive",
          });
          return false;
        }
        
        setUser(userData as User);
        
        toast({
          title: "Login successful",
          description: `Welcome, ${userData.name}`,
        });
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = "Login failed. Please try again.";
      const authError = error as AuthError;
      
      if (authError.message) {
        if (authError.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid credentials. Check your email and password.";
        } else if (authError.message.includes("Email not confirmed")) {
          errorMessage = "Please confirm your email before logging in.";
        }
      }
      
      toast({
        title: "Login error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare context value
  const value: AuthContextType = {
    user,
    loading,
    session,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
