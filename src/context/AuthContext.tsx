import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { User, UserRank } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      setUserFromSession(session)
    }

    getSession()

    supabase.auth.onAuthStateChange((_event, session) => {
      setUserFromSession(session)
    })
  }, []);

  const setUserFromSession = async (session: Session | null) => {
    if (session?.user) {
      const profile = await fetchUserProfile(session.user.id);
      setUser(profile);
    } else {
      setUser(null);
    }
    setLoading(false);
  }

  const signUp = async (username: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          }
        }
      });

      if (error) {
        console.error("Signup error:", error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Create a user profile in the 'profiles' table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              username: username,
              email: email,
            },
          ]);

        if (profileError) {
          console.error("Error creating profile:", profileError);
          return { success: false, error: profileError.message };
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error("Signup failed:", err);
      return { success: false, error: err.message };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Signin error:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error("Signin failed:", err);
      return { success: false, error: err.message };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Signout error:", error);
      }
    } catch (err: any) {
      console.error("Signout failed:", err);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        console.error("Password reset error:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error("Password reset failed:", err);
      return { success: false, error: err.message };
    }
  };

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (profile) {
        // Calculate rank based on points and role
        let baseRank: UserRank;
        if (profile.points <= 1) {
          baseRank = 'Newbie Collector';
        } else if (profile.points <= 5) {
          baseRank = 'Beginner Collector';
        } else if (profile.points <= 50) {
          baseRank = 'Mid Collector';
        } else if (profile.points <= 150) {
          baseRank = 'Known Collector';
        } else if (profile.points <= 300) {
          baseRank = 'Advance Collector';
        } else {
          baseRank = 'Master Collector';
        }

        // Add role prefix for admins
        let finalRank: UserRank = baseRank;
        if (profile.role && profile.role.toLowerCase().includes('admin')) {
          if (profile.role === 'Super Admin') {
            finalRank = `Super Admin ${baseRank}` as UserRank;
          } else {
            finalRank = `Admin ${baseRank}` as UserRank;
          }
        }

        return {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          role_id: profile.role_id || '',
          role: profile.role || 'User',
          rank: profile.rank || finalRank,
          points: profile.points || 0,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
          avatarUrl: profile.avatar_url,
          country: profile.country,
          about: profile.about,
          blocked: profile.blocked,
          is_forum_blocked: profile.is_forum_blocked
        };
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
    return null;
  };

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
