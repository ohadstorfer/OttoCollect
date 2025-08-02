
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
        toast.error(error.message || "Login failed");
      } else {
        // fetchUserProfile will run in useEffect, so nothing to do here
        toast.success("Login successful!");
      }
    } catch (error: any) {
      toast.error("Login failed");
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
      } else {
        toast.success("Registration successful! Please check your email for verification.");
      }
    } catch (error: any) {
      toast.error("Registration failed");
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
