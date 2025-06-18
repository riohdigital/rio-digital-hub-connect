
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  plan?: string;
  google_email?: string;
  allowed_assistants?: string[];
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
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
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const fetchUserProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log('[AuthContext] Fetching profile for user:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
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

  useEffect(() => {
    console.log('[AuthContext] Setting up auth state management');
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[AuthContext] Auth state changed: ${event}`, currentSession?.user?.id || 'no user');
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        const profileData = await fetchUserProfile(currentSession.user.id);
        setProfile(profileData);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] Getting initial session');
        const { data } = await supabase.auth.getSession();
        
        if (!data.session) {
          console.log('[AuthContext] No initial session found');
          setLoading(false);
        }
      } catch (error) {
        console.error('[AuthContext] Error getting initial session:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
      console.log('[AuthContext] Cleanup: Unsubscribed from auth changes');
    };
  }, [fetchUserProfile]);

  const signIn = async (email: string, password: string) => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ 
          title: "Erro no login", 
          description: error.message, 
          variant: "destructive" 
        });
        throw error;
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('[AuthContext] Sign in error:', error);
      throw error;
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
        toast({ 
          title: "Erro no login com Google", 
          description: error.message, 
          variant: "destructive" 
        });
        throw error;
      }
    } catch (error) {
      console.error('[AuthContext] Google sign in error:', error);
      throw error;
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
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (authError) {
        toast({ 
          title: "Erro no cadastro", 
          description: authError.message, 
          variant: "destructive" 
        });
        throw authError;
      }

      toast({ 
        title: "Cadastro realizado", 
        description: "Verifique seu email para confirmar a conta." 
      });
    } catch (error) {
      console.error('[AuthContext] Sign up error:', error);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    setAuthLoading(true);
    try {
      console.log('[AuthContext] Signing out...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({ 
          title: "Erro ao sair", 
          description: error.message, 
          variant: "destructive" 
        });
        throw error;
      }
      
      setUser(null);
      setSession(null);
      setProfile(null);
      
      toast({ 
        title: "Logout realizado", 
        description: "Você foi desconectado com sucesso." 
      });
      navigate('/');
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
        toast({ 
          title: "Erro ao redefinir senha", 
          description: error.message, 
          variant: "destructive" 
        });
        throw error;
      }
      toast({ 
        title: "Email enviado", 
        description: "Verifique seu email para redefinir a senha." 
      });
    } catch (error) {
      console.error('[AuthContext] Password reset error:', error);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const value = {
    session,
    user,
    profile,
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
