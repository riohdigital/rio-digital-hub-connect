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

  useEffect(() => {
    console.log('[AuthContext] Setting up auth state management');
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log(`[AuthContext] Auth state changed: ${event}`, currentSession?.user?.id || 'no user');
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        setTimeout(async () => {
          try {
            console.log('[AuthContext] Fetching user data after auth state change');
            const [profileData, plansData] = await Promise.all([
              fetchUserProfile(currentSession.user.id),
              fetchUserPlans(currentSession.user.id)
            ]);
            
            setProfile(profileData);
            setUserPlans(plansData);
          } catch (err) {
            console.error('[AuthContext] Error fetching user data after auth change:', err);
          } finally {
            setLoading(false);
          }
        }, 0);
      } else {
        setProfile(null);
        setUserPlans([]);
        setLoading(false);
      }
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

    const safetyTimer = setTimeout(() => {
      if (loading) {
        console.warn('[AuthContext] Safety timeout triggered - forcing loading state to false');
        setLoading(false);
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
      console.log('[AuthContext] Cleanup: Unsubscribed from auth changes');
    };
  }, [fetchUserProfile, fetchUserPlans]);

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
          toast({ 
            title: "Profile creation issue", 
            description: "Profile details could not be saved.", 
            variant: "default" 
          });
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
      console.log('[AuthContext] Signing out...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({ title: "Error signing out", description: error.message, variant: "destructive" });
        throw error;
      }
      
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserPlans([]);
      
      toast({ title: "Signed out successfully", description: "You have been logged out." });
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

  useEffect(() => {
    console.log('[AuthContext] Auth state updated - loading:', loading, 'user:', user?.email);
  }, [loading, user]);

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
