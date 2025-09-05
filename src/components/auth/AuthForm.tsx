import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import { EmailConfirmation } from './EmailConfirmation';

interface AuthFormProps {
  mode?: 'login' | 'register' | 'reset';
}

const AuthForm = ({ mode = 'login' }: AuthFormProps) => {
  const { t } = useTranslation(['auth', 'pages']);
  const { login, register, blockedNotice, loading: authLoading } = useAuth();
  const { toast: toastHook } = useToast();
  const [activeTab, setActiveTab] = useState(mode);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Email confirmation state
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerConfirmEmail, setRegisterConfirmEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [emailsMatch, setEmailsMatch] = useState(true);

  const checkBlockedEmail = async (email: string) => {
    const { data, error } = await supabase
      .from('blocked_emails')
      .select('email')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    return !!data;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    
    try {
      const isBlocked = await checkBlockedEmail(loginEmail);
      if (isBlocked) {
        const errorMsg = 'This email address has been blocked. Please contact support.';
        setLoginError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      const result = await login(loginEmail, loginPassword);
      
      if (result.success) {
        setLoginEmail("");
        setLoginPassword("");
        setLoginError(null);
        setTimeout(() => {
          navigate(-1);
        }, 500);
      } else {
        setLoginError(result.error || "Login failed");
        setLoginPassword("");
      }
    } catch (error: any) {
      const errorMsg = "An unexpected error occurred. Please try again.";
      setLoginError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    
    // Frontend validation
    if (!registerUsername.trim()) {
      toast.error('Username is required');
      return;
    }
    
    if (registerUsername.length < 3) {
      toast.error('Username must be at least 3 characters long');
      return;
    }
    
    if (!registerEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    
    if (!registerConfirmEmail.trim()) {
      toast.error('Email confirmation is required');
      return;
    }
    
    if (registerEmail !== registerConfirmEmail) {
      setEmailsMatch(false);
      toast.error('Email addresses do not match');
      return;
    }
    
    if (!registerPassword) {
      toast.error('Password is required');
      return;
    }
    
    if (registerPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    if (!registerConfirmPassword) {
      toast.error('Password confirmation is required');
      return;
    }
    
    if (registerPassword !== registerConfirmPassword) {
      setPasswordsMatch(false);
      toast.error('Passwords do not match');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setRegisterLoading(true);
    
    try {
      const isBlocked = await checkBlockedEmail(registerEmail);
      if (isBlocked) {
        toast.error('This email address has been blocked. Please contact support.');
        return;
      }

      const result = await register(registerUsername, registerEmail, registerPassword);
      
      if (result.success) {
        // Store email for confirmation screen
        setConfirmationEmail(registerEmail);
        // Clear form and errors on success
        setRegisterUsername("");
        setRegisterEmail("");
        setRegisterConfirmEmail("");
        setRegisterPassword("");
        setRegisterConfirmPassword("");
        setEmailsMatch(true);
        setPasswordsMatch(true);
        setRegisterError(null);
        // Show email confirmation screen instead of navigating away
        setShowEmailConfirmation(true);
      } else {
        setRegisterError(result.error || "Registration failed");
        setRegisterPassword("");
        setRegisterConfirmPassword("");
        setPasswordsMatch(true);
      }
    } catch (error: any) {
      const errorMsg = "An unexpected error occurred. Please try again.";
      setRegisterError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      {/* Show email confirmation screen after successful registration */}
      {showEmailConfirmation ? (
        <EmailConfirmation
          email={confirmationEmail}
          onBackToLogin={() => {
            setShowEmailConfirmation(false);
            setActiveTab('login');
          }}
        />
      ) : (
        <Card className="ottoman-card shadow-lg p-6">
          {/* Show blocked notice if user is blocked */}
          {blockedNotice && (
            <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded mb-4 text-center animate-fade-in">
              <span>{blockedNotice}</span>
            </div>
          )}
          
          <Tabs
            defaultValue="login"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'login' | 'register')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="font-medium">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="font-medium">
                Sign Up
              </TabsTrigger>
            </TabsList>

            {/* Login Form Tab */}
            <TabsContent value="login">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-serif font-semibold mb-2 text-gold-500">
                    Welcome Back
                  </h3>
                  <p className="text-ottoman-200 text-sm">
                    Sign in to access your Ottoman banknote collection
                  </p>
                  {loginError && (
                    <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                      {loginError}
                    </div>
                  )}
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-ottoman-200">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      required
                      className="ottoman-input"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        if (loginError) setLoginError(null);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-ottoman-200">
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        required
                        className="ottoman-input pr-10"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          if (loginError) setLoginError(null);
                        }}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ottoman-400 hover:text-ottoman-300"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="ottoman-button w-full"
                    disabled={authLoading || loginLoading}
                  >
                    {(authLoading || loginLoading) ? (
                      <span className="animate-pulse">Signing In...</span>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-center">
                  <p className="text-sm text-ottoman-400">
                    Don't have an account?{" "}
                    <button
                      className="text-ottoman-300 hover:text-ottoman-100"
                      onClick={() => setActiveTab("register")}
                    >
                      Sign up here
                    </button>
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Register Form Tab */}
            <TabsContent value="register">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-serif font-semibold mb-2 text-gold-500">
                    Join OttoCollect
                  </h3>
                  <p className="text-ottoman-200 text-sm">
                    Create your account to start collecting Ottoman banknotes
                  </p>
                  {registerError && (
                    <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                      {registerError}
                    </div>
                  )}
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-medium text-ottoman-200">
                      Username
                    </label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Choose a username"
                      required
                      className="ottoman-input"
                      value={registerUsername}
                      onChange={(e) => {
                        setRegisterUsername(e.target.value);
                        if (registerError) setRegisterError(null);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="register-email" className="text-sm font-medium text-ottoman-200">
                      Email
                    </label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Enter your email"
                      required
                      className="ottoman-input"
                      value={registerEmail}
                      onChange={(e) => {
                        setRegisterEmail(e.target.value);
                        if (registerError) setRegisterError(null);
                        if (!emailsMatch) setEmailsMatch(true);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirm-email" className="text-sm font-medium text-ottoman-200">
                      Confirm Email
                    </label>
                    <Input
                      id="confirm-email"
                      type="email"
                      placeholder="Confirm your email"
                      required
                      className={`ottoman-input ${!emailsMatch ? 'border-red-500' : ''}`}
                      value={registerConfirmEmail}
                      onChange={(e) => {
                        setRegisterConfirmEmail(e.target.value);
                        if (registerError) setRegisterError(null);
                        if (!emailsMatch) setEmailsMatch(true);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="register-password" className="text-sm font-medium text-ottoman-200">
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        required
                        className="ottoman-input pr-10"
                        value={registerPassword}
                        onChange={(e) => {
                          setRegisterPassword(e.target.value);
                          if (registerError) setRegisterError(null);
                          if (!passwordsMatch) setPasswordsMatch(true);
                        }}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ottoman-400 hover:text-ottoman-300"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirm-password" className="text-sm font-medium text-ottoman-200">
                      Confirm Password
                    </label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      required
                      className={`ottoman-input ${!passwordsMatch ? 'border-red-500' : ''}`}
                      value={registerConfirmPassword}
                      onChange={(e) => {
                        setRegisterConfirmPassword(e.target.value);
                        if (registerError) setRegisterError(null);
                        if (!passwordsMatch) setPasswordsMatch(true);
                      }}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="ottoman-button w-full"
                    disabled={authLoading || registerLoading}
                  >
                    {(authLoading || registerLoading) ? (
                      <span className="animate-pulse">Creating Account...</span>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Account
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-center">
                  <p className="text-sm text-ottoman-400">
                    Already have an account?{" "}
                    <button
                      className="text-ottoman-300 hover:text-ottoman-100"
                      onClick={() => setActiveTab("login")}
                    >
                      Sign in here
                    </button>
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      )}
    </div>
  );
};

export default AuthForm;