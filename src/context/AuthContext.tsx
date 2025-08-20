
import { User, UserRank, UserRole } from "@/types";
import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { statisticsService } from "@/services/statisticsService";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  getUserRankFromPoints: (points: number, role: UserRole) => UserRank;
  updateUserState: (updates: Partial<User>) => void;
  blockedNotice: string | null;
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
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, sessionData) => {
        setSession(sessionData);

        if (sessionData?.user) {
          setTimeout(() => {
            fetchUserProfile(sessionData.user.id);
          }, 0);
        } else {
          setUser(null);
        }
      }
    );

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

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, roles(name, is_country_admin)")
        .eq("id", userId)
        .single();

      if (error) {
        setUser(null);
        setBlockedNotice(null);
        setLoading(false);
      } else if (data) {
        if (data.blocked) {
          // Log out and show a block notice
          setBlockedNotice(
            data.blocked_reason ||
              "Your account has been blocked by an administrator. If you think this is a mistake, please contact support."
          );
          setUser(null);
          await supabase.auth.signOut();
        } else {
          const userProfile: User = {
            id: data.id,
            username: data.username,
            email: data.email,
            role: data.role as UserRole,
            role_id: data.role_id,
            rank: data.rank as UserRank,
            points: data.points,
            createdAt: data.created_at,
            avatarUrl: data.avatar_url || '/placeholder.svg',
            ...(data.country && { country: data.country }),
            ...(data.about && { about: data.about }),
            facebook_url: data.facebook_url,
            instagram_url: data.instagram_url,
            twitter_url: data.twitter_url,
            linkedin_url: data.linkedin_url
          };
          setUser(userProfile);
          setBlockedNotice(null);
          
          // Track user login
          statisticsService.trackUserLogin(data.id);
        }
      }
    } catch (error) {
      setUser(null);
      setBlockedNotice(null);
    } finally {
      setLoading(false);
    }
  };

  const updateUserState = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const getUserRankFromPoints = (points: number, role: UserRole): UserRank => {
    let baseRank: string;
    
    if (points <= 19) {
      baseRank = 'Newbie Collector';
    } else if (points <= 79) {
      baseRank = 'Beginner Collector';
    } else if (points <= 399) {
      baseRank = 'Mid Collector';
    } else if (points <= 999) {
      baseRank = 'Known Collector';
    } else if (points <= 1999) {
      baseRank = 'Advance Collector';
    } else {
      baseRank = 'Master Collector';
    }

    if (role === 'Super Admin') {
      return `Super Admin ${baseRank}` as UserRank;
    } else if (role === 'Admin') {
      return `Admin ${baseRank}` as UserRank;
    } else {
      return baseRank as UserRank;
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setBlockedNotice(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Login error:", error);
        // Handle specific Supabase auth errors
        if (error.message?.includes('Invalid login credentials')) {
          toast.error("Invalid email or password. Please check your credentials and try again.");
        } else if (error.message?.includes('Email not confirmed')) {
          toast.error("Please verify your email address before logging in. Check your inbox for the verification link.");
        } else if (error.message?.includes('Too many requests')) {
          toast.error("Too many login attempts. Please wait a few minutes before trying again.");
        } else if (error.message?.includes('User not found')) {
          toast.error("No account found with this email address. Please check your email or register for a new account.");
        } else {
          toast.error(`Login failed: ${error.message}`);
        }
        throw error;
      } else {
        console.log("Login successful for:", email);
        toast.success("Login successful!");
      }
    } catch (error: any) {
      console.error("Login catch block:", error);
      // Only show generic error if we haven't already shown a specific one
      if (!error.message?.includes('Invalid login credentials') && 
          !error.message?.includes('Email not confirmed') &&
          !error.message?.includes('Too many requests') &&
          !error.message?.includes('User not found')) {
        toast.error("An unexpected error occurred during login. Please try again.");
      }
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
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username
          }
        }
      });

      if (error) {
        console.error("Registration error:", error);
        // Handle specific Supabase auth errors
        if (error.message?.includes('User already registered')) {
          toast.error("An account with this email already exists. Please try logging in instead.");
        } else if (error.message?.includes('Password should be at least')) {
          toast.error("Password must be at least 6 characters long.");
        } else if (error.message?.includes('Invalid email')) {
          toast.error("Please enter a valid email address.");
        } else if (error.message?.includes('Signup is disabled')) {
          toast.error("Registration is currently disabled. Please contact support.");
        } else if (error.message?.includes('Email rate limit exceeded')) {
          toast.error("Too many registration attempts. Please try again later.");
        } else {
          toast.error(`Registration failed: ${error.message}`);
        }
        throw error;
      } else {
        console.log("Registration successful for:", email);
        toast.success("Registration successful! Please check your email for verification.");
      }
    } catch (error: any) {
      console.error("Registration catch block:", error);
      // Only show generic error if we haven't already shown a specific one
      if (!error.message?.includes('User already registered') && 
          !error.message?.includes('Password should be at least') &&
          !error.message?.includes('Invalid email') &&
          !error.message?.includes('Signup is disabled') &&
          !error.message?.includes('Email rate limit exceeded')) {
        toast.error("An unexpected error occurred during registration. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      toast.info("Logged out successfully");
    } catch (error) {
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
    updateUserState,
    blockedNotice,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
