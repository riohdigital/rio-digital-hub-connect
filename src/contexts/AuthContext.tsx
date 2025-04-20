// src/contexts/AuthContext.tsx - TESTE: SÓ VALIDA SESSÃO

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile, UserPlan } from '@/lib/supabase'; // Importa cliente e tipos
import { useToast } from '@/components/ui/use-toast';

// Tipos (mantém para consistência)
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null; // Será sempre null neste teste
  userPlans: UserPlan[]; // Será sempre [] neste teste
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
  // Estado de profile e plans não são usados ativamente neste teste
  const [profile, setProfile] = useState<Profile | null>(null); 
  const [userPlans, setUserPlans] = useState<UserPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMounted = useRef(true);

  // Função segura para setar loading=false
  const finishLoading = useCallback(() => {
    if (isMounted.current) { 
      console.log('[AuthContext TESTE] Setting loading to FALSE');
      setLoading(false);
    } else {
       console.log('[AuthContext TESTE] Component unmounted, skipping setLoading(false)');
    }
  }, []);

  // Efeito principal - APENAS OUVE O ESTADO DE AUTH
  useEffect(() => {
    isMounted.current = true;
    console.log('[AuthContext TESTE] Setting up listener, setLoading(true)');
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
       (event, session) => { // Tornando o callback SÍNCRONO
        console.log(`[AuthContext TESTE] === onAuthStateChange Event: ${event}, User: ${session?.user?.id || 'None'} ===`);
        
        // Atualiza sessão e usuário
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        // *** NENHUMA BUSCA DE DADOS AQUI ***
        // Apenas define loading como false
        console.log('[AuthContext TESTE] Auth state received, finishing loading.');
        finishLoading(); 
      }
    );

    // Cleanup
    return () => {
      console.log('[AuthContext TESTE] Unsubscribing listener, isMounted=false.');
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [finishLoading]); // Depende apenas do finishLoading

  // --- Funções de Ação (SignIn, etc.) ---
  // (Mantenha as funções como estavam, elas não devem interferir no loading inicial)
    const signIn = async (email: string, password: string) => { /* ...código anterior... */ };
    const signInWithGoogle = async () => { /* ...código anterior... */ };
    const signUp = async (email: string, password: string, fullName: string) => { /* ...código anterior... */ };
    const signOut = async () => { /* ...código anterior... */ };
    const resetPassword = async (email: string) => { /* ...código anterior... */ };

  // Log para debug
  useEffect(() => {
    console.log(`[AuthContext TESTE] Loading state changed to: ${loading}`);
  }, [loading]);

  const value = {
    session, user, 
    profile: null, // Retorna null explicitamente
    userPlans: [], // Retorna [] explicitamente
    signIn, signInWithGoogle, signUp, signOut,
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
