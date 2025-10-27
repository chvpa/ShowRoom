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
      console.log('🔍 [AUTH] Iniciando checkAuth...');
      setLoading(true);
      
      // Check if there's a Supabase session with timeout
      console.log('🔍 [AUTH] Obteniendo sesión de Supabase...');
      
      // Agregar timeout de 5 segundos para evitar bloqueo infinito
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout al obtener sesión')), 5000)
      );
      
      const { data: sessionData, error: sessionError } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as any;
      
      if (sessionError) {
        console.error('❌ [AUTH] Error al obtener sesión:', sessionError);
        throw sessionError;
      }

      console.log('✅ [AUTH] Sesión obtenida:', sessionData.session ? 'Session activa' : 'No hay sesión');
      setSession(sessionData.session);
      
      // If session exists, get user data from our custom table
      if (sessionData.session) {
        console.log('🔍 [AUTH] Consultando datos del usuario en tabla users...');
        console.log('🔍 [AUTH] User ID:', sessionData.session.user.id);
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .single();
        
        if (userError) {
          console.error('❌ [AUTH] Error al obtener usuario:', userError);
          throw userError;
        }
        
        console.log('✅ [AUTH] Usuario obtenido:', userData);
        
        if (userData) {
          // Check if user is active
          if (!userData.active) {
            console.warn('⚠️ [AUTH] Usuario inactivo, cerrando sesión');
            await logout();
            toast({
              title: "Account deactivated",
              description: "Your account has been deactivated. Please contact an administrator.",
              variant: "destructive",
            });
            return;
          }
          
          console.log('✅ [AUTH] Usuario activo, estableciendo en estado');
          setUser(userData as User);
        } else {
          console.warn('⚠️ [AUTH] No se encontraron datos del usuario');
        }
      } else {
        console.log('ℹ️ [AUTH] No hay sesión activa');
      }
      
      console.log('✅ [AUTH] checkAuth completado exitosamente');
    } catch (error) {
      console.error('❌ [AUTH] Error en checkAuth:', error);
      setUser(null);
      setSession(null);
    } finally {
      console.log('🏁 [AUTH] Finalizando checkAuth, setLoading(false)');
      setLoading(false);
    }
  }, [toast]);

  // Set up auth state listener - OPTIMIZADO MÁXIMO
  useEffect(() => {
    let isMounted = true;
    
    console.log('🚀 [AUTH] Montando AuthProvider, ejecutando checkAuth inicial');
    // Initial auth check
    checkAuth();

    // Subscribe to auth changes - Solo eventos CRÍTICOS
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('📡 [AUTH] Evento recibido:', event, 'isMounted:', isMounted);
      
      if (!isMounted) {
        console.log('⏭️ [AUTH] Componente desmontado, ignorando evento');
        return;
      }
      
      // SOLO procesar estos 2 eventos críticos
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        console.log('🔑 [AUTH] Evento crítico detectado:', event);
        setSession(session);
        await checkAuth();
      }
      
      // TOKEN_REFRESHED: solo actualizar session, NO recargar usuario
      if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 [AUTH] Token refrescado, actualizando sesión sin recargar usuario');
        setSession(session);
        // NO llamar checkAuth(), el usuario no cambió
      }
      
      // Ignorar completamente: INITIAL_SESSION, USER_UPDATED, PASSWORD_RECOVERY
      if (!['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED'].includes(event)) {
        console.log('⏭️ [AUTH] Evento ignorado:', event);
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 [AUTH] Desmontando AuthProvider');
      isMounted = false;
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
