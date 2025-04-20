import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  loading: boolean; // Estado de loading inicial/autenticação
  authLoading: boolean; // Estado de loading para ações específicas (login, signup etc)
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPlans, setUserPlans] = useState<UserPlan[]>([]);
  const [loading, setLoading] = useState(true); // Loading da verificação inicial da sessão
  const [authLoading, setAuthLoading] = useState(false); // Loading para ações como login/signup
  const navigate = useNavigate();
  const { toast } = useToast();

  // Funções para buscar dados (usando useCallback para memoização)
  const fetchUserProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log('[AuthContext] Fetching profile for user:', userId);
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && status !== 406) { // 406 significa 'Not Acceptable', geralmente pq não achou (single())
        console.error('[AuthContext] Error fetching profile:', error);
        throw error;
      }
      console.log('[AuthContext] Profile data fetched:', data);
      return data;
    } catch (error) {
      console.error('[AuthContext] Catch block: Error fetching user profile:', error);
      // Retorna null em caso de erro para não travar o Promise.all
      return null; 
    }
  }, []); // Sem dependências, a função não muda

  const fetchUserPlans = useCallback(async (userId: string): Promise<UserPlan[]> => {
    console.log('[AuthContext] Fetching plans for user:', userId);
    try {
      const today = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', userId)
        // Você pode querer buscar todos e filtrar depois, ou ajustar a query se precisar de inativos
        .gte('expires_at', today); // Use gte para incluir planos que expiram hoje

      if (error) {
        console.error('[AuthContext] Error fetching plans:', error);
        throw error;
      }
      console.log('[AuthContext] Plans data fetched:', data);
      return data || []; // Retorna array vazio se data for null
    } catch (error) {
      console.error('[AuthContext] Catch block: Error fetching user plans:', error);
      return []; // Retorna array vazio em caso de erro
    }
  }, []); // Sem dependências

  // Efeito principal para ouvir mudanças na autenticação
  useEffect(() => {
    setLoading(true); // Começa carregando
    console.log('[AuthContext] Setting up onAuthStateChange listener...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthContext] onAuthStateChange Event: ${event}`, session);
        
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        // Limpa dados antigos imediatamente se não houver usuário
        if (!currentUser) {
            console.log('[AuthContext] No user found. Clearing profile/plans.');
            setProfile(null);
            setUserPlans([]);
            setLoading(false); // *** Importante: Para de carregar se deslogado ***
            // Não navega aqui automaticamente, deixa ProtectedRoute decidir
            return; // Sai cedo se não há usuário
        }
        
        // Se TEM um usuário (eventos: INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED)
        // Busca perfil e planos em paralelo
        console.log('[AuthContext] User found. Fetching profile and plans...');
        try {
             // Executa em paralelo, mas não trava se um falhar (graças ao tratamento de erro individual)
             const [profileData, plansData] = await Promise.all([
                fetchUserProfile(currentUser.id),
                fetchUserPlans(currentUser.id)
            ]);
            
            console.log('[AuthContext] Setting profile and plans state.');
            setProfile(profileData); // Define mesmo se for null (significa erro no fetch)
            setUserPlans(plansData); // Define mesmo se for [] (significa erro no fetch ou sem planos)

        } catch (error) {
            // Embora as funções internas tratem erros, um catch aqui é uma segurança extra
            console.error('[AuthContext] Error in Promise.all for profile/plans:', error);
            setProfile(null); // Garante que esteja limpo em caso de erro geral
            setUserPlans([]);
        } finally {
             // *** CRUCIAL: Sempre define loading como false após tentar obter os dados ***
             console.log('[AuthContext] Setting loading state to false.');
             setLoading(false); 
        }
      }
    );

    // Cleanup: Cancela a inscrição no listener quando o componente desmontar
    return () => {
      console.log('[AuthContext] Unsubscribing from onAuthStateChange.');
      subscription.unsubscribe();
    };
    // Apenas useCallback garante que as funções não causem re-execução desnecessária
  }, [fetchUserProfile, fetchUserPlans]); 

  // --- Funções de Ação (Login, Logout, etc.) ---

  const signIn = async (email: string, password: string) => {
    setAuthLoading(true); // Usa loading específico da ação
    console.log('[AuthContext] Attempting sign in...');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[AuthContext] Sign in error:', error);
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
        throw error; // Re-throw para o componente que chamou, se necessário
      }
      // onAuthStateChange vai lidar com a atualização de estado e busca de dados
      console.log('[AuthContext] Sign in successful (listener will handle state).');
      navigate('/dashboard'); // Navega após o sucesso da chamada
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
          // Redirect para o dashboard pode ser tratado pelo onAuthStateChange ou aqui
           redirectTo: `${window.location.origin}/dashboard`, // Mantém, mas pode ser redundante
        },
      });
      if (error) {
         console.error('[AuthContext] Google sign in error:', error);
        toast({ title: "Google login failed", description: error.message, variant: "destructive" });
        throw error;
      }
       console.log('[AuthContext] Google sign in initiated (redirect/listener will handle).');
      // Não precisa navegar aqui, o redirect ou onAuthStateChange cuidam disso
    } catch (error) {
       // Erro já logado
    } finally {
      // Pode não chegar aqui se houver redirect, mas é bom ter
      setAuthLoading(false); 
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setAuthLoading(true);
    console.log('[AuthContext] Attempting sign up...');
    try {
      // Primeiro, cria o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Adiciona o nome completo aos metadados do usuário no Auth
          data: { full_name: fullName } 
        }
      });

      if (authError) {
        console.error('[AuthContext] Sign up error:', authError);
        toast({ title: "Registration failed", description: authError.message, variant: "destructive" });
        throw authError;
      }

       // Se o usuário foi criado E requer confirmação OU não (depende das config do Supabase)
       // Tentamos criar o perfil. Idealmente, isso seria feito por um Trigger no Supabase DB.
       // Mas fazemos aqui para garantir.
      if (authData.user) {
        console.log('[AuthContext] User created, attempting to insert profile...');
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ 
            id: authData.user.id, // Usa o ID do usuário criado
            full_name: fullName,
            updated_at: new Date().toISOString(), // Adicionado para manter compatibilidade com código original
            // email: email // Opcional, se sua tabela profiles tiver email
          });
        
        if (profileError) {
          // Loga o erro mas não impede o fluxo principal, 
          // pois o usuário já foi criado no Auth.
          console.error('[AuthContext] Error inserting profile (user auth succeeded):', profileError);
          toast({ title: "Profile creation issue", description: "Could not save profile details, please contact support.", variant: "warning" });
        } else {
           console.log('[AuthContext] Profile inserted successfully.');
        }
      } else {
         console.warn('[AuthContext] Sign up call succeeded but no user data returned immediately.');
      }

      toast({ title: "Registration successful", description: "Please check your email for confirmation if required." });
      navigate('/login'); // Navega para login após sucesso

    } catch (error) {
      // Erros já logados
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    setAuthLoading(true); // Usa loading da ação
    console.log('[AuthContext] Attempting sign out...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthContext] Sign out error:', error);
        toast({ title: "Error signing out", description: error.message, variant: "destructive" });
        throw error;
      }
      // Limpar o estado local é redundante pois onAuthStateChange(SIGNED_OUT) vai fazer isso
      // setUser(null); setSession(null); setProfile(null); setUserPlans([]);
      console.log('[AuthContext] Sign out successful (listener will handle state).');
      navigate('/'); // Navega para a home após sucesso
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
        redirectTo: `${window.location.origin}/reset-password`, // URL para onde o usuário vai após clicar no link do email
      });
      if (error) {
        console.error('[AuthContext] Password reset error:', error);
        toast({ title: "Password reset failed", description: error.message, variant: "destructive" });
        throw error;
      }
      console.log('[AuthContext] Password reset email sent.');
      toast({ title: "Password reset email sent", description: "Please check your email for instructions." });
    } catch (error) {
       // Erro já logado
    } finally {
      setAuthLoading(false);
    }
  };

  // Monta o valor do contexto
  const value = {
    session,
    user,
    profile,
    userPlans,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    loading, // Loading inicial
    authLoading, // Loading de ações
    resetPassword,
  };

  // Retorna o Provider com o valor
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook para consumir o contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
