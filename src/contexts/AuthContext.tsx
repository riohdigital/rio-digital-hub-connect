// src/contexts/AuthContext.tsx - Nova Tentativa com Verificações Extras

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile, UserPlan } from '@/lib/supabase'; // Importa cliente e tipos
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
  const isMounted = useRef(true); // Para evitar setar estado se desmontado

  // Função segura para setar loading=false
  const finishLoading = useCallback(() => {
    // Só atualiza se o componente ainda estiver montado
    if (isMounted.current) { 
      console.log('[AuthContext] Attempting to set loading to FALSE');
      setLoading(false);
    } else {
       console.log('[AuthContext] Component unmounted, skipping final setLoading(false)');
    }
  }, []);

  // --- Funções Fetch com Verificação Extra ---
  const fetchUserProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const functionName = 'fetchUserProfile';
    console.log(`[AuthContext:${functionName}] Fetching for user: ${userId}`);
    if (!supabase) {
      console.error(`[AuthContext:${functionName}] Supabase client is null or undefined! Cannot fetch.`);
      return null;
    }
    if (typeof supabase.from !== 'function') {
       console.error(`[AuthContext:${functionName}] supabase.from is not a function! Client state is invalid.`);
       return null;
    }
    console.log(`[AuthContext:${functionName}] Client looks valid, proceeding to query...`);
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      console.log(`[AuthContext:${functionName}] Query completed. Status: ${status}, Error: ${JSON.stringify(error)}`);
      if (error && status !== 406) throw error; // Joga erro real para o catch
      return data;
    } catch (error: any) {
      console.error(`[AuthContext:${functionName}] CATCH block:`, error.message || error);
      return null;
    }
  }, []);

  const fetchUserPlans = useCallback(async (userId: string): Promise<UserPlan[]> => {
    const functionName = 'fetchUserPlans';
    console.log(`[AuthContext:${functionName}] Fetching for user: ${userId}`);
     if (!supabase) {
      console.error(`[AuthContext:${functionName}] Supabase client is null or undefined! Cannot fetch.`);
      return [];
    }
     if (typeof supabase.from !== 'function') {
       console.error(`[AuthContext:${functionName}] supabase.from is not a function! Client state is invalid.`);
       return [];
    }
    console.log(`[AuthContext:${functionName}] Client looks valid, proceeding to query...`);
    try {
      const today = new Date().toISOString();
      const { data, error, status } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', userId)
        .gte('expires_at', today);
      console.log(`[AuthContext:${functionName}] Query completed. Status: ${status}, Error: ${JSON.stringify(error)}`);
      if (error) throw error; // Joga erro real para o catch
      return data || [];
    } catch (error: any) {
      console.error(`[AuthContext:${functionName}] CATCH block:`, error.message || error);
      return [];
    }
  }, []);

  // --- Efeito Principal ---
  useEffect(() => {
    isMounted.current = true; // Marca como montado
    console.log('[AuthContext] useEffect Mount: Setting up listener, setLoading(true)');
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthContext] === onAuthStateChange Event: ${event}, User: ${session?.user?.id || 'None'} ===`);
        
        // Atualiza sessão e usuário imediatamente
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
            console.log('[AuthContext] No user. Cleaning state and finishing loading.');
            setProfile(null);
            setUserPlans([]);
            finishLoading(); // Chama a função segura
            return;
        }
        
        // Se temos usuário, busca dados
        console.log('[AuthContext] User detected. Attempting to fetch profile and plans...');
        try {
            // Chama as funções fetch. Elas agora retornam null/[] em caso de erro interno.
            const profileData = await fetchUserProfile(currentUser.id);
            const plansData = await fetchUserPlans(currentUser.id);

            console.log('[AuthContext] Fetches completed. Profile:', profileData ? 'OK' : 'Failed/Null', 'Plans:', `[${plansData.length}]`);
            
            // Só atualiza o estado se o componente ainda estiver montado
            if (isMounted.current) {
              setProfile(profileData); 
              setUserPlans(plansData);
            } else {
               console.log('[AuthContext] Component unmounted before setting profile/plans state.');
            }

        } catch (fetchError) {
            // Este catch agora pegaria erros relançados pelas funções fetch (ex: erro de rede)
            console.error('[AuthContext] CATCH block for fetch operations:', fetchError);
             if (isMounted.current) {
               setProfile(null); 
               setUserPlans([]);
             }
        } finally {
            // Garante que o loading termine INDEPENDENTE de sucesso ou erro nas buscas
            console.log('[AuthContext] FINALLY block reached after fetch attempt.');
            finishLoading(); // Chama a função segura
        }
      }
    );

    // Cleanup do useEffect
    return () => {
      console.log('[AuthContext] useEffect Cleanup: Unsubscribing listener, isMounted=false.');
      isMounted.current = false; // Marca como desmontado
      subscription.unsubscribe();
    };
  // Dependências corretas
  }, [fetchUserProfile, fetchUserPlans, finishLoading]);

  // --- Funções de Ação (SignIn, etc.) ---
  // (Mantenha as funções signIn, signInWithGoogle, signUp, signOut, resetPassword como estavam antes)
  const signIn = async (email: string, password: string) => {
    setAuthLoading(true); console.log('[AuthContext] Attempting sign in...');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { console.error('[AuthContext] Sign in error:', error); toast({ title: "Login failed", description: error.message, variant: "destructive" }); throw error; }
      console.log('[AuthContext] Sign in successful.'); navigate('/dashboard'); 
    } catch (error) {} finally { setAuthLoading(false); }
  };
  const signInWithGoogle = async () => {
    setAuthLoading(true); console.log('[AuthContext] Attempting Google sign in...');
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard`, },});
      if (error) { console.error('[AuthContext] Google sign in error:', error); toast({ title: "Google login failed", description: error.message, variant: "destructive" }); throw error; }
      console.log('[AuthContext] Google sign in initiated.');
    } catch (error) {} finally { setAuthLoading(false); }
  };
  const signUp = async (email: string, password: string, fullName: string) => {
    setAuthLoading(true); console.log('[AuthContext] Attempting sign up...');
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
      if (authError) { console.error('[AuthContext] Sign up error:', authError); toast({ title: "Registration failed", description: authError.message, variant: "destructive" }); throw authError; }
      if (authData.user) {
        console.log('[AuthContext] User created, inserting profile...');
        const { error: profileError } = await supabase.from('profiles').insert({ id: authData.user.id, full_name: fullName, updated_at: new Date().toISOString(), });
        if (profileError) { console.error('[AuthContext] Error inserting profile:', profileError); toast({ title: "Profile issue", description: "Profile save failed.", variant: "warning" });
        } else { console.log('[AuthContext] Profile inserted.'); }
      } else { console.warn('[AuthContext] Sign up ok but no user data.'); }
      toast({ title: "Registration successful", description: "Check email." }); navigate('/login'); 
    } catch (error) {} finally { setAuthLoading(false); }
  };
  const signOut = async () => {
    setAuthLoading(true); console.log('[AuthContext] Attempting sign out...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) { console.error('[AuthContext] Sign out error:', error); toast({ title: "Sign out error", description: error.message, variant: "destructive" }); throw error; }
      console.log('[AuthContext] Sign out successful.'); navigate('/'); toast({ title: "Signed out", description: "Logged out." });
    } catch (error) {} finally { setAuthLoading(false); }
  };
  const resetPassword = async (email: string) => {
    setAuthLoading(true); console.log('[AuthContext] Attempting password reset...');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password`, });
      if (error) { console.error('[AuthContext] Password reset error:', error); toast({ title: "Reset failed", description: error.message, variant: "destructive" }); throw error; }
      console.log('[AuthContext] Password reset email sent.'); toast({ title: "Reset email sent", description: "Check email." });
    } catch (error) {} finally { setAuthLoading(false); }
  };

  // Log para debug do estado loading
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
