import React from 'react';
import AuthForm from "@/components/auth/AuthForm";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTheme } from '@/context/ThemeContext';

const Auth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  
  useEffect(() => {
    // If user is already logged in, redirect to home
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);
  
  return (
    <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-900'} py-12 px-4 sm:px-6 lg:px-8 animate-fade-in`}>
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] bg-dark-600/40 shadow-xl shadow-ottoman-900/20 ring-1 ring-inset ring-ottoman-900/10"
          aria-hidden="true"
        />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-serif font-bold tracking-tight text-gradient sm:text-5xl">
            <span>Ottocollect</span>
          </h2>
          <p className="mt-4 text-lg text-ottoman-300">
            Join our community of collectors and explore the rich history of Ottoman Empire banknotes.
          </p>
        </div>
        
        <AuthForm />
      </div>
    </div>
  );
};

export default Auth;
