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
  const [userPlans, setUserPlans] = useState<UserPlan[]>([]); // Mantém o estado, mas não busca por enquanto
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const loadingStateRef = useRef({ loadingDisabled: false }); // Simplificado ref

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
    try {
      console.log('[AuthContext] BEFORE supabase.from(profiles)...');
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      console.log('[AuthContext] AFTER supabase.from(profiles)... Status:', status, 'Error:', error);

      if (error && status !== 406) {
        console.error('[AuthContext] Error fetching profile:', error);
        return null; // Retorna null no erro
      }
      console.log('[AuthContext] Profile data fetched:', data);
      return data; // Retorna dados ou null se não encontrado (status 406)
    } catch (error) {
      console.error('[AuthContext] CATCH block fetchUserProfile:', error);
      return null; // Retorna null no erro
    }
  }, []);

  // Efeito principal - AGORA SÓ BUSCA PERFIL
  useEffect(() => {
    console.log('[AuthContext] Setting up onAuthStateChange listener and setting loading=true');
    setLoading(true);
    loadingStateRef.current.loadingDisabled = false; // Reseta a flag

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthContext] onAuthStateChange Event: ${event}`, session?.user?.id || 'no-user');

        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
            console.log('[AuthContext] No user found. Clearing profile/plans.');
            setProfile(null);
            setUserPlans([]); // Limpa planos também
            finishLoading(); // Termina o loading
            return;
        }

        // *** TESTE: SÓ BUSCA PERFIL ***
        console.log('[AuthContext] User found. Fetching ONLY profile...');
        try {
            const profileData = await fetchUserProfile(currentUser.id);
            console.log('[AuthContext] Setting profile state.');
            setProfile(profileData);
            // setUserPlans([]); // Mantém planos vazios por enquanto

        } catch (error) {
            // Erro durante fetchUserProfile já é logado dentro da função
            console.error('[AuthContext] Error fetching profile:', error);
            setProfile(null);
            // setUserPlans([]);
        } finally {
            console.log('[AuthContext] Finally block reached after fetch PROFILE operation');
            finishLoading(); // Termina o loading após buscar só o perfil
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      console.log('[AuthContext] Unsubscribing from onAuthStateChange.');
    };
  // Depende apenas de fetchUserProfile e finishLoading
  }, [fetchUserProfile, finishLoading]);

  // --- Funções de Ação (SignIn, SignUp, SignOut, etc.) ---
  // Nenhuma mudança necessária aqui, elas usam authLoading

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
            updated_at: new Date().toISOString(), // Adicionado para manter compatibilidade
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
    userPlans, // Continua vazio neste teste
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
