// src/contexts/AuthContext.tsx - Versão COMPLETA (Perfil + Planos)

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
  loading: boolean; // Loading inicial
  authLoading: boolean; // Loading de ações
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
  const loadingStateRef = useRef({ loadingDisabled: false });

  const finishLoading = useCallback(() => {
    if (!loadingStateRef.current.loadingDisabled) {
        console.log('[AuthContext] Setting loading to FALSE');
        loadingStateRef.current.loadingDisabled = true;
        setLoading(false);
    } else {
        console.log('[AuthContext] Loading already false, skipping redundant set.');
    }
  }, []);

  const fetchUserProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log('[AuthContext] Fetching profile for user:', userId);
    const startTime = performance.now();
    try {
      console.log('[AuthContext] BEFORE supabase.from(profiles).select()...');
      const { data, error, status, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('id', userId)
        .single();
      const endTime = performance.now();
      console.log(`[AuthContext] AFTER supabase.from(profiles)... (${(endTime - startTime).toFixed(2)} ms)`);
      console.log('[AuthContext] Result -> Status:', status, 'Count:', count, 'Error:', JSON.stringify(error), 'Data:', data ? '{...profile exists...}' : 'null');

      if (error && status !== 406) {
        console.error(`[AuthContext] Error fetching profile (Status: ${status}):`, error);
        return null; // Retorna null mas não joga erro aqui, deixa Promise.all lidar
      }
      console.log('[AuthContext] Profile data fetched successfully or not found.');
      return data as Profile | null;

    } catch (error: any) {
      const catchEndTime = performance.now();
      console.error(`[AuthContext] CATCH block fetchUserProfile (${(catchEndTime - startTime).toFixed(2)} ms):`, error.message || error);
      return null; // Retorna null no catch para não quebrar Promise.all
    }
  }, []);

  const fetchUserPlans = useCallback(async (userId: string): Promise<UserPlan[]> => {
    console.log('[AuthContext] Fetching plans for user:', userId);
    const startTime = performance.now();
    try {
      console.log('[AuthContext] BEFORE supabase.from(user_plans).select()...');
      const today = new Date().toISOString();
      const { data, error, status, count } = await supabase
        .from('user_plans')
        .select('*', { count: 'exact' }) // Pede contagem
        .eq('user_id', userId)
        .gte('expires_at', today);
      const endTime = performance.now();
      console.log(`[AuthContext] AFTER supabase.from(user_plans)... (${(endTime - startTime).toFixed(2)} ms)`);
      console.log('[AuthContext] Result -> Status:', status, 'Count:', count, 'Error:', JSON.stringify(error), 'Data:', data ? `[${data.length} plan(s)]` : 'null/empty');

      if (error) {
        console.error(`[AuthContext] Error fetching plans (Status: ${status}):`, error);
        return []; // Retorna array vazio no erro
      }
      console.log('[AuthContext] Plans data fetched successfully.');
      return (data || []) as UserPlan[]; // Retorna dados ou array vazio

    } catch (error: any) {
      const catchEndTime = performance.now();
      console.error(`[AuthContext] CATCH block fetchUserPlans (${(catchEndTime - startTime).toFixed(2)} ms):`, error.message || error);
      return []; // Retorna array vazio no catch
    }
  }, []);

  // Efeito principal - Busca Perfil E Planos
  useEffect(() => {
    console.log('[AuthContext] Setting up onAuthStateChange listener and setting loading=true');
    setLoading(true);
    loadingStateRef.current.loadingDisabled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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

        console.log('[AuthContext] User found. Fetching profile AND plans in parallel...');
        try {
             // Executa em paralelo
             const [profileData, plansData] = await Promise.all([
                fetchUserProfile(currentUser.id),
                fetchUserPlans(currentUser.id)
            ]);
            
            console.log('[AuthContext] Promise.all completed. Setting profile and plans state.');
            setProfile(profileData); 
            setUserPlans(plansData);

        } catch (error) {
            // Este catch só será atingido se uma das funções jogar um erro não tratado, o que não deve acontecer mais
            console.error('[AuthContext] Unexpected Error in Promise.all for profile/plans:', error);
            setProfile(null); 
            setUserPlans([]);
        } finally {
             // CRUCIAL: Sempre define loading como false após tentar obter os dados
             console.log('[AuthContext] Finally block reached after fetch operations');
             finishLoading(); 
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      console.log('[AuthContext] Unsubscribing from onAuthStateChange.');
    };
  }, [fetchUserProfile, fetchUserPlans, finishLoading]); // Inclui fetchUserPlans de volta

  // --- Funções de Ação (SignIn, SignUp, SignOut, etc.) ---
  // Mantenha as funções de ação como estavam na última versão completa
    const signIn = async (email: string, password: string) => {
      setAuthLoading(true); 
      console.log('[AuthContext] Attempting sign in...');
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error('[AuthContext] Sign in error:', error);
          toast({ title: "Login failed", description: error.message, variant: "destructive" });
          throw error; 
        }
        console.log('[AuthContext] Sign in successful (listener will handle state).');
        navigate('/dashboard'); 
      } catch (error) {
        // Erro já logado
      } finally {
        setAuthLoading(false);
      }
    };
  
    const signInWithGoogle = async () => {
      setAuthLoading(true);
      console.log('[AuthContext] Attempting Google sign in...');
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
             redirectTo: `${window.location.origin}/dashboard`, 
          },
        });
        if (error) {
           console.error('[AuthContext] Google sign in error:', error);
          toast({ title: "Google login failed", description: error.message, variant: "destructive" });
          throw error;
        }
         console.log('[AuthContext] Google sign in initiated (redirect/listener will handle).');
      } catch (error) {
         // Erro já logado
      } finally {
        setAuthLoading(false); 
      }
    };
  
    const signUp = async (email: string, password: string, fullName: string) => {
      setAuthLoading(true);
      console.log('[AuthContext] Attempting sign up...');
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
  
        if (authError) {
          console.error('[AuthContext] Sign up error:', authError);
          toast({ title: "Registration failed", description: authError.message, variant: "destructive" });
          throw authError;
        }
  
        if (authData.user) {
          console.log('[AuthContext] User created, attempting to insert profile...');
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({ 
              id: authData.user.id, 
              full_name: fullName,
              updated_at: new Date().toISOString(),
            });
          
          if (profileError) {
            console.error('[AuthContext] Error inserting profile (user auth succeeded):', profileError);
            toast({ title: "Profile creation issue", description: "Could not save profile details.", variant: "warning" });
          } else {
             console.log('[AuthContext] Profile inserted successfully.');
          }
        } else {
           console.warn('[AuthContext] Sign up call succeeded but no user data returned immediately.');
        }
  
        toast({ title: "Registration successful", description: "Please check email for confirmation." });
        navigate('/login'); 
  
      } catch (error) {
        // Erros já logados
      } finally {
        setAuthLoading(false);
      }
    };
  
    const signOut = async () => {
      setAuthLoading(true); 
      console.log('[AuthContext] Attempting sign out...');
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('[AuthContext] Sign out error:', error);
          toast({ title: "Error signing out", description: error.message, variant: "destructive" });
          throw error;
        }
        console.log('[AuthContext] Sign out successful (listener will handle state).');
        navigate('/'); 
        toast({ title: "Signed out successfully", description: "You have been logged out." });
      } catch (error) {
         // Erro já logado
      } finally {
        setAuthLoading(false);
      }
    };
  
    const resetPassword = async (email: string) => {
      setAuthLoading(true);
      console.log('[AuthContext] Attempting password reset...');
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`, 
        });
        if (error) {
          console.error('[AuthContext] Password reset error:', error);
          toast({ title: "Password reset failed", description: error.message, variant: "destructive" });
          throw error;
        }
        console.log('[AuthContext] Password reset email sent.');
        toast({ title: "Password reset email sent", description: "Check your email." });
      } catch (error) {
         // Erro já logado
      } finally {
        setAuthLoading(false);
      }
    };

  // Log de debug para verificar o estado de loading geral
  useEffect(() => {
    console.log(`[AuthContext] Loading state changed to: ${loading}`);
  }, [loading]);

  const value = {
    session,
    user,
    profile,
    userPlans, // Agora deve ser preenchido
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
