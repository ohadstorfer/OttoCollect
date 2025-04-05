
import { User, UserRank, UserRole } from "@/types";
import { MOCK_USERS } from "@/lib/constants";
import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  getUserRankFromPoints: (points: number, role: UserRole) => UserRank;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize user session on load
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, sessionData) => {
        setSession(sessionData);
        
        // When the session changes, fetch the user profile
        if (sessionData?.user) {
          fetchUserProfile(sessionData.user.id);
        } else {
          setUser(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        fetchUserProfile(currentSession.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user profile from profiles table
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        setUser(null);
      } else if (data) {
        // Transform database user to our User type
        const userProfile: User = {
          id: data.id,
          username: data.username,
          email: data.email,
          role: data.role as UserRole,
          rank: data.rank as UserRank,
          points: data.points,
          createdAt: data.created_at,
          avatarUrl: data.avatar_url || '/placeholder.svg',
          ...(data.country && { country: data.country })
        };
        setUser(userProfile);
      }
    } catch (error) {
      console.error("Error in profile fetch:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const getUserRankFromPoints = (points: number, role: UserRole): UserRank => {
    if (role === 'SuperAdmin') {
      if (points >= 1000) return 'Super Admin Advance Collector';
      if (points >= 500) return 'Super Admin Known Collector';
      if (points >= 200) return 'Super Admin Mid Collector';
      if (points >= 50) return 'Super Admin Beginner';
      return 'Super Admin Newbie';
    } else if (role === 'Admin') {
      if (points >= 1000) return 'Admin Advance Collector';
      if (points >= 500) return 'Admin Known Collector';
      if (points >= 200) return 'Admin Mid Collector';
      if (points >= 50) return 'Admin Beginner';
      return 'Admin Newbie';
    } else {
      if (points >= 1000) return 'Advance Collector';
      if (points >= 500) return 'Known Collector';
      if (points >= 200) return 'Mid Collector';
      if (points >= 50) return 'Beginner';
      return 'Newbie';
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast.error(error.message || "Login failed");
        console.error("Login error:", error);
      } else {
        toast.success("Login successful!");
      }
    } catch (error: any) {
      toast.error("Login failed");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });

      if (error) {
        toast.error(error.message || "Registration failed");
        console.error("Registration error:", error);
      } else {
        toast.success("Registration successful! Please check your email for verification.");
      }
    } catch (error: any) {
      toast.error("Registration failed");
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      toast.info("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed");
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    getUserRankFromPoints,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
