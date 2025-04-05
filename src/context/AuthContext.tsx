
import { User, UserRank, UserRole } from "@/types";
import { MOCK_USERS } from "@/lib/constants";
import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user in localStorage
    const storedUser = localStorage.getItem("ottoman_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

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
      // In a real app, this would be an API call
      // For demo purposes, we're using mock data
      const foundUser = MOCK_USERS.find(u => u.email === email);
      
      if (foundUser) {
        // In a real app, we'd check the password hash
        setUser(foundUser);
        localStorage.setItem("ottoman_user", JSON.stringify(foundUser));
        toast.success("Login successful!");
      } else {
        toast.error("Invalid credentials");
      }
    } catch (error) {
      toast.error("Login failed");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setLoading(true);
    try {
      // In a real app, this would be an API call
      // For demo purposes, we'll create a mock user
      if (MOCK_USERS.some(u => u.email === email || u.username === username)) {
        toast.error("User already exists");
        return;
      }

      // Create a new user with country as undefined, ensuring it matches the User type where country is optional
      const newUser: User = {
        id: (MOCK_USERS.length + 1).toString(),
        username,
        email,
        role: 'User' as UserRole,
        rank: 'Newbie' as UserRank,
        points: 0,
        createdAt: new Date().toISOString(),
        avatarUrl: '/placeholder.svg'
        // country is intentionally not set here since it's optional
      };

      // In a real app, we'd store this in a database
      // Since we're adding to MOCK_USERS which expects the same shape, we ensure type compatibility
      MOCK_USERS.push(newUser);
      
      setUser(newUser);
      localStorage.setItem("ottoman_user", JSON.stringify(newUser));
      toast.success("Registration successful!");
    } catch (error) {
      toast.error("Registration failed");
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("ottoman_user");
    toast.info("Logged out successfully");
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
