import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile, UserPlan } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  userPlans: UserPlan[];
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  authLoading: boolean;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPlans, setUserPlans] = useState<UserPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Ref para debug
  const loadingStateRef = useRef({ 
    authStateChangeRan: false,
    loadingDisabled: false
  });

  // Função explícita para finalizar loading com log extra
  const finishLoading = useCallback(() => {
    console.log('[AuthContext] CRITICAL: Explicitly setting loading to FALSE');
    loadingStateRef.current.loadingDisabled = true;
    setLoading(false);
  }, []);

  const fetchUserProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log('[AuthContext] Fetching profile for user:', userId);
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && status !== 406) {
        console.error('[AuthContext] Error fetching profile:', error);
        return null;
      }
      console.log('[AuthContext] Profile data fetched:', data);
      return data;
    } catch (error) {
      console.error('[AuthContext] Catch block: Error fetching user profile:', error);
      return null;
    }
  }, []);

  const fetchUserPlans = useCallback(async (userId: string): Promise<UserPlan[]> => {
    console.log('[AuthContext] Fetching plans for user:', userId);
    try {
      const today = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', userId)
        .gte('expires_at', today);

      if (error) {
        console.error('[AuthContext] Error fetching plans:', error);
        return [];
      }
      console.log('[AuthContext] Plans data fetched:', data);
      return data || [];
    } catch (error) {
      console.error('[AuthContext] Catch block: Error fetching user plans:', error);
      return [];
    }
  }, []);

  // Efeito para forçar o fim do loading após 5 segundos como rede de segurança
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading && !loadingStateRef.current.loadingDisabled) {
        console.error('[AuthContext] SAFETY TIMEOUT: Loading state was still true after 5s, forcing to false');
        finishLoading();
      }
    }, 5000); // 5 segundos como timeout de segurança

    return () => clearTimeout(timeoutId);
  }, [loading, finishLoading]);

  useEffect(() => {
    console.log('[AuthContext] Setting up onAuthStateChange listener and setting loading=true');
    setLoading(true);
    loadingStateRef.current.loadingDisabled = false;
    loadingStateRef.current.authStateChangeRan = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        loadingStateRef.current.authStateChangeRan = true;
        console.log(`[AuthContext] onAuthStateChange Event: ${event}`, session?.user?.id || 'no-user');
        
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
            console.log('[AuthContext] No user found. Clearing profile/plans.');
            setProfile(null);
            setUserPlans([]);
            finishLoading();
            return;
        }
        
        console.log('[AuthContext] User found. Fetching profile and plans...');
        try {
            const [profileData, plansData] = await Promise.all([
                fetchUserProfile(currentUser.id),
                fetchUserPlans(currentUser.id)
            ]);
            
            console.log('[AuthContext] Setting profile and plans state.');
            setProfile(profileData);
            setUserPlans(plansData);

        } catch (error) {
            console.error('[AuthContext] Error in Promise.all for profile/plans:', error);
            setProfile(null);
            setUserPlans([]);
        } finally {
            console.log('[AuthContext] Finally block reached after fetch operations');
            finishLoading();
        }
      }
    );

    // Adicional: verificando se não recebemos eventos em um tempo razoável
    const initialCheckTimeout = setTimeout(() => {
      if (!loadingStateRef.current.authStateChangeRan) {
        console.error('[AuthContext] CRITICAL: No auth state change events received after 2s. Checking session...');
        // Hack de verificação manual da sessão
        supabase.auth.getSession().then(({ data: { session } }) => {
          console.log('[AuthContext] Manual session check result:', session?.user?.id || 'no-session');
          if (!session) {
            console.log('[AuthContext] No active session found in manual check');
            finishLoading();
          }
          // Se tiver sessão, esperamos que onAuthStateChange seja chamado eventualmente
        });
      }
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(initialCheckTimeout);
      console.log('[AuthContext] Unsubscribing from onAuthStateChange.');
    };
  }, [fetchUserProfile, fetchUserPlans, finishLoading]);

  const signIn = async (email: string, password: string) => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
        throw error;
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('[AuthContext] Sign in error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        toast({ title: "Google login failed", description: error.message, variant: "destructive" });
        throw error;
      }
    } catch (error) {
      console.error('[AuthContext] Google sign in error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setAuthLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (authError) {
        toast({ title: "Registration failed", description: authError.message, variant: "destructive" });
        throw authError;
      }

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ 
            id: authData.user.id,
            full_name: fullName,
            updated_at: new Date().toISOString(),
          });
        
        if (profileError) {
          console.error('[AuthContext] Error inserting profile:', profileError);
          toast({ title: "Profile creation issue", description: "Profile details could not be saved.", variant: "warning" });
        }
      }

      toast({ title: "Registration successful", description: "Please check your email for confirmation." });
      navigate('/login');
    } catch (error) {
      console.error('[AuthContext] Sign up error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({ title: "Error signing out", description: error.message, variant: "destructive" });
        throw error;
      }
      navigate('/');
      toast({ title: "Signed out successfully", description: "You have been logged out." });
    } catch (error) {
      console.error('[AuthContext] Sign out error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: "Password reset failed", description: error.message, variant: "destructive" });
        throw error;
      }
      toast({ title: "Password reset email sent", description: "Please check your email for instructions." });
    } catch (error) {
      console.error('[AuthContext] Password reset error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  // Log de debug para verificar o estado atual
  useEffect(() => {
    console.log(`[AuthContext] Loading state changed to: ${loading}`);
  }, [loading]);

  const value = {
    session,
    user,
    profile,
    userPlans,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    loading,
    authLoading,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
