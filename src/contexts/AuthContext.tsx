// src/contexts/AuthContext.tsx - Versão COMPLETA (Perfil + Planos) com Logs Detalhados

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
// Importa o cliente supabase inicializado e os tipos
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
        // console.log('[AuthContext] Loading already false, skipping redundant set.'); // Opcional: reduzir verbosidade
    }
  }, []);

  const fetchUserProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log(`[AuthContext] Fetching profile for user: ${userId} at ${new Date().toISOString()}`);
    const startTime = performance.now();
    try {
      // Verifica se o cliente supabase existe ANTES da chamada
      if (!supabase) {
         console.error('[AuthContext] ERRO: Cliente Supabase não está inicializado antes de chamar fetchUserProfile!');
         return null;
      }
      console.log('[AuthContext] BEFORE supabase.from(profiles).select()...');
      
      const { data, error, status, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' }) // Pede a contagem também para debug
        .eq('id', userId)
        .single(); // single() retorna erro se não achar exatamente 1 ou 0 (dependendo do status)
        
      const endTime = performance.now();
      console.log(`[AuthContext] AFTER supabase.from(profiles)... (${(endTime - startTime).toFixed(2)} ms)`);
      console.log('[AuthContext] Profile Result -> Status:', status, 'Count:', count, 'Error:', JSON.stringify(error), 'Data:', data ? '{...profile exists...}' : 'null');

      if (error && status !== 406) {
        console.error(`[AuthContext] Error fetching profile (Status: ${status}):`, error);
        // Não joga erro aqui, apenas retorna null para Promise.all continuar
        return null; 
      }
      
      console.log('[AuthContext] Profile data fetched successfully or not found.');
      return data as Profile | null; 

    } catch (error: any) {
      const catchEndTime = performance.now();
      console.error(`[AuthContext] CATCH block fetchUserProfile (${(catchEndTime - startTime).toFixed(2)} ms):`, error.message || error);
      return null; // Retorna null no catch
    }
  }, []);

  const fetchUserPlans = useCallback(async (userId: string): Promise<UserPlan[]> => {
    console.log(`[AuthContext] Fetching plans for user: ${userId} at ${new Date().toISOString()}`);
    const startTime = performance.now();
    try {
       // Verifica se o cliente supabase existe ANTES da chamada
      if (!supabase) {
         console.error('[AuthContext] ERRO: Cliente Supabase não está inicializado antes de chamar fetchUserPlans!');
         return [];
      }
      console.log('[AuthContext] BEFORE supabase.from(user_plans).select()...');
      const today = new Date().toISOString();
      const { data, error, status, count } = await supabase
        .from('user_plans')
        .select('*', { count: 'exact' }) 
        .eq('user_id', userId)
        .gte('expires_at', today);
      const endTime = performance.now();
      console.log(`[AuthContext] AFTER supabase.from(user_plans)... (${(endTime - startTime).toFixed(2)} ms)`);
      console.log('[AuthContext] Plans Result -> Status:', status, 'Count:', count, 'Error:', JSON.stringify(error), 'Data:', data ? `[${data.length} plan(s)]` : 'null/empty');

      if (error) {
        console.error(`[AuthContext] Error fetching plans (Status: ${status}):`, error);
        return []; // Retorna array vazio no erro
      }
      console.log('[AuthContext] Plans data fetched successfully.');
      return (data || []) as UserPlan[];

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
             const [profileData, plansData] = await Promise.all([
                fetchUserProfile(currentUser.id),
                fetchUserPlans(currentUser.id)
            ]);
            
            console.log('[AuthContext] Promise.all completed. Setting profile and plans state.');
            setProfile(profileData); 
            setUserPlans(plansData);

        } catch (error) {
            console.error('[AuthContext] Unexpected Error in Promise.all for profile/plans:', error);
            setProfile(null); 
            setUserPlans([]);
        } finally {
             console.log('[AuthContext] Finally block reached after fetch operations');
             finishLoading(); 
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      console.log('[AuthContext] Unsubscribing from onAuthStateChange.');
    };
  }, [fetchUserProfile, fetchUserPlans, finishLoading]); 

  // --- Funções de Ação (SignIn, SignUp, SignOut, etc.) ---
  // (Mantenha as funções signIn, signInWithGoogle, signUp, signOut, resetPassword como estavam antes)
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
      } catch (error) { } finally { setAuthLoading(false); }
    };
  
    const signInWithGoogle = async () => {
      setAuthLoading(true);
      console.log('[AuthContext] Attempting Google sign in...');
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/dashboard`, },
        });
        if (error) {
           console.error('[AuthContext] Google sign in error:', error);
          toast({ title: "Google login failed", description: error.message, variant: "destructive" });
          throw error;
        }
         console.log('[AuthContext] Google sign in initiated.');
      } catch (error) { } finally { setAuthLoading(false); }
    };
  
    const signUp = async (email: string, password: string, fullName: string) => {
      setAuthLoading(true);
      console.log('[AuthContext] Attempting sign up...');
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: fullName } }
        });
        if (authError) {
          console.error('[AuthContext] Sign up error:', authError);
          toast({ title: "Registration failed", description: authError.message, variant: "destructive" });
          throw authError;
        }
        if (authData.user) {
          console.log('[AuthContext] User created, attempting to insert profile...');
          const { error: profileError } = await supabase.from('profiles').insert({ 
              id: authData.user.id, full_name: fullName, updated_at: new Date().toISOString(),
          });
          if (profileError) {
            console.error('[AuthContext] Error inserting profile:', profileError);
            toast({ title: "Profile issue", description: "Profile details could not be saved.", variant: "warning" });
          } else { console.log('[AuthContext] Profile inserted.'); }
        } else { console.warn('[AuthContext] Sign up succeeded but no user data returned.'); }
        toast({ title: "Registration successful", description: "Please check email." });
        navigate('/login'); 
      } catch (error) { } finally { setAuthLoading(false); }
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
        console.log('[AuthContext] Sign out successful.');
        navigate('/'); 
        toast({ title: "Signed out", description: "Logged out." });
      } catch (error) { } finally { setAuthLoading(false); }
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
          toast({ title: "Reset failed", description: error.message, variant: "destructive" });
          throw error;
        }
        console.log('[AuthContext] Password reset email sent.');
        toast({ title: "Reset email sent", description: "Check your email." });
      } catch (error) { } finally { setAuthLoading(false); }
    };

  // Log de debug para verificar o estado de loading geral
  useEffect(() => {
    console.log(`[AuthContext] Loading state changed to: ${loading}`);
  }, [loading]);

  const value = {
    session, user, profile, userPlans, signIn, signInWithGoogle, signUp, signOut,
    loading, authLoading, resetPassword,
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
