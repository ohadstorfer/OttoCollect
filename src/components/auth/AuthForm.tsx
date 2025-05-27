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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useRef } from "react";
import { toast } from "sonner";

const AuthForm = () => {
  const { login, register, blockedNotice } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  const checkBlockedEmail = async (email: string) => {
    const { data, error } = await supabase
      .from('blocked_emails')
      .select('email')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    return !!data;
  };

  const [blockedError, setBlockedError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setBlockedError(null);
    try {
      console.log('Starting login process...');
      
      const isBlocked = await checkBlockedEmail(loginEmail);
      if (isBlocked) {
        console.log('Email is blocked');
        toast({
          variant: "destructive",
          title: "Account Blocked",
          description: "Your account has been blocked. You probably violated the website terms of service. If you believe this is a mistake, please contact support.",
        });
        setLoginLoading(false);
        return;
      }

      console.log('Attempting to login with Supabase...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        console.log('Login failed:', error.message);
        throw error;
      }

      if (!data?.user) {
        console.log('No user data returned from login');
        throw new Error('Login failed - no user data returned');
      }

      console.log('Login successful, user:', data.user.id);
      await login(loginEmail, loginPassword);
      
      // Only navigate if we have a user and no blocked notice
      if (data.user && !blockedNotice) {
        console.log('Login successful, navigating to home...');
        navigate("/");
      } else {
        console.log('Login successful but not navigating - blocked notice:', blockedNotice);
      }
    } catch (error: any) {
      console.error("Login error details:", error);
      // Handle different error scenarios
      if (error.message?.includes('Invalid login credentials')) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid email or password. Please try again.",
        });
      } else if (error.message?.includes('Email not confirmed')) {
        toast({
          variant: "destructive",
          title: "Email Not Verified",
          description: "Please verify your email address before logging in.",
        });
      } else if (error.message?.includes('Too many requests')) {
        toast({
          variant: "destructive",
          title: "Too Many Attempts",
          description: "Too many login attempts. Please try again later.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Login Error",
          description: "An error occurred during login. Please try again.",
        });
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockedError(null);
    if (registerPassword !== registerConfirmPassword) {
      setPasswordsMatch(false);
      toast({
        variant: "destructive",
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
      });
      return;
    }
    setRegisterLoading(true);
    try {
      console.log('Starting registration process...');
      
      const isBlocked = await checkBlockedEmail(registerEmail);
      if (isBlocked) {
        console.log('Email is blocked');
        toast({
          variant: "destructive",
          title: "Email Blocked",
          description: "This email has been blocked from registering. You probably violated the website terms of service. If you believe this is a mistake, please contact support.",
        });
        setRegisterLoading(false);
        return;
      }

      console.log('Attempting to register with Supabase...');
      const { data, error } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          data: {
            username: registerUsername,
          },
        },
      });

      if (error) {
        console.log('Registration failed:', error.message);
        throw error;
      }

      if (!data?.user) {
        console.log('No user data returned from registration');
        throw new Error('Registration failed - no user data returned');
      }

      console.log('Registration successful, user:', data.user.id);
      await register(registerUsername, registerEmail, registerPassword);
      
      // Only navigate if we have a user
      if (data.user) {
        console.log('Registration successful, navigating to home...');
        navigate("/");
      } else {
        console.log('Registration successful but not navigating - no user data');
      }
    } catch (error: any) {
      console.error("Register error details:", error);
      // Handle different error scenarios
      if (error.message?.includes('User already registered')) {
        toast({
          variant: "destructive",
          title: "Account Exists",
          description: "An account with this email already exists. Please try logging in instead.",
        });
      } else if (error.message?.includes('Username already taken')) {
        toast({
          variant: "destructive",
          title: "Username Taken",
          description: "This username is already taken. Please choose a different one.",
        });
      } else if (error.message?.includes('Password too weak')) {
        toast({
          variant: "destructive",
          title: "Weak Password",
          description: "Password is too weak. Please use a stronger password with at least 8 characters, including numbers and special characters.",
        });
      } else if (error.message?.includes('Invalid email')) {
        toast({
          variant: "destructive",
          title: "Invalid Email",
          description: "Please enter a valid email address.",
        });
      } else if (error.message?.includes('Username too short')) {
        toast({
          variant: "destructive",
          title: "Username Too Short",
          description: "Username must be at least 3 characters long.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Registration Error",
          description: "An error occurred during registration. Please try again.",
        });
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success("Redirecting to Google...");
    } catch (err: any) {
      toast.error("Google sign-in error: " + (err?.message || "Unknown error"));
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: "https://preview--ottoman-banknote-archive-hub.lovable.app/reset-password" , 
      });
      if (error) {
        toast.error(error.message || "Failed to send reset email.");
      } else {
        toast.success("Reset link sent! Please check your email.");
        setResetOpen(false);
      }
    } catch (err: any) {
      toast.error("Failed to send password reset email.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <Card className="ottoman-card shadow-lg">
        {/* Show blocked notice if user is blocked */}
        {blockedNotice && (
          <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded mb-4 text-center animate-fade-in">
            <span>{blockedNotice}</span>
          </div>
        )}
        <Tabs
          defaultValue="login"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login" className="font-medium">
              Login
            </TabsTrigger>
            <TabsTrigger value="register" className="font-medium">
              Register
            </TabsTrigger>
          </TabsList>

          {/* ========== Login Form Tab ========== */}
          <TabsContent value="login">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-serif font-semibold mb-2 text-gold-500">
                  Welcome Back
                </h3>
                <p className="text-ottoman-200 text-sm">
                  Log in to access your Ottoman banknote collection
                </p>
                {blockedError && (
                  <div className="text-red-600 text-sm mt-2">{blockedError}</div>
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
                    placeholder="name@example.com"
                    required
                    className="ottoman-input"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-ottoman-200"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-xs text-ottoman-400 hover:text-ottoman-300 px-0 underline"
                      onClick={() => setResetOpen(true)}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      className="ottoman-input pr-10"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ottoman-400 hover:text-ottoman-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="ottoman-button w-full"
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <span className="animate-pulse">Logging in...</span>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Login
                    </>
                  )}
                </Button>
              </form>

              {/* Google login button */}
              {/* <div className="flex items-center justify-center gap-2 my-2">
                <Button
                  variant="outline"
                  type="button"
                  className="w-full flex items-center justify-center gap-2 mt-2"
                  onClick={handleGoogleAuth}
                >
                  <img
                    src="https://www.svgrepo.com/show/475656/google-color.svg"
                    alt="Google"
                    className="w-5 h-5"
                  />
                  Sign in with Google
                </Button>
              </div> */}

              <div className="text-center">
                <p className="text-sm text-ottoman-400">
                  Don't have an account?{" "}
                  <button
                    className="text-ottoman-300 hover:text-ottoman-100"
                    onClick={() => setActiveTab("register")}
                  >
                    Register
                  </button>
                </p>
              </div>
            </div>
          </TabsContent>

          {/* ========== Register Form Tab ========== */}
          <TabsContent value="register">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-serif font-semibold mb-2 text-gold-500">
                  Create Account
                </h3>
                <p className="text-ottoman-200 text-sm">
                  Join the Ottoman banknote collector community
                </p>
                {blockedError && (
                  <div className="text-red-600 text-sm mt-2">{blockedError}</div>
                )}
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="username"
                    className="text-sm font-medium text-ottoman-200"
                  >
                    Username
                  </label>
                  <Input
                    id="username"
                    placeholder="YourUsername"
                    required
                    className="ottoman-input"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="register-email"
                    className="text-sm font-medium text-ottoman-200"
                  >
                    Email
                  </label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    className="ottoman-input"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="register-password"
                    className="text-sm font-medium text-ottoman-200"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      className="ottoman-input pr-10"
                      value={registerPassword}
                      onChange={(e) => {
                        setRegisterPassword(e.target.value);
                        setPasswordsMatch(
                          e.target.value === registerConfirmPassword
                        );
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ottoman-400 hover:text-ottoman-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="confirm-password"
                    className="text-sm font-medium text-ottoman-200"
                  >
                    Confirm Password
                  </label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    className={`ottoman-input ${
                      !passwordsMatch && registerConfirmPassword
                        ? "border-red-500"
                        : ""
                    }`}
                    value={registerConfirmPassword}
                    onChange={(e) => {
                      setRegisterConfirmPassword(e.target.value);
                      setPasswordsMatch(registerPassword === e.target.value);
                    }}
                  />
                  {!passwordsMatch && registerConfirmPassword && (
                    <p className="text-xs text-red-500 mt-1">
                      Passwords do not match
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="terms"
                    required
                    className="rounded text-ottoman-500 focus:ring-ottoman-500"
                  />
                  <label
                    htmlFor="terms"
                    className="text-xs text-ottoman-300"
                  >
                    I agree to the{" "}
                    <a href="#" className="text-ottoman-400 hover:text-ottoman-300">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-ottoman-400 hover:text-ottoman-300">
                      Privacy Policy
                    </a>
                  </label>
                </div>

                <Button
                  type="submit"
                  className="ottoman-button w-full"
                  disabled={registerLoading || !passwordsMatch}
                >
                  {registerLoading ? (
                    <span className="animate-pulse">Creating account...</span>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Register
                    </>
                  )}
                </Button>
              </form>

              {/* Google sign-up button */}
              {/* <div className="flex items-center justify-center gap-2 my-2">
                <Button
                  variant="outline"
                  type="button"
                  className="w-full flex items-center justify-center gap-2 mt-2"
                  onClick={handleGoogleAuth}
                >
                  <img
                    src="https://www.svgrepo.com/show/475656/google-color.svg"
                    alt="Google"
                    className="w-5 h-5"
                  />
                  Sign up with Google
                </Button>
              </div> */}

              <div className="text-center">
                <p className="text-sm text-ottoman-400">
                  Already have an account?{" "}
                  <button
                    className="text-ottoman-300 hover:text-ottoman-100"
                    onClick={() => setActiveTab("login")}
                  >
                    Login
                  </button>
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Password reset dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4 mt-2">
            <div className="space-y-1">
              <label htmlFor="reset-email" className="text-sm font-medium">
                Enter your email to receive a password reset link:
              </label>
              <Input
                id="reset-email"
                type="email"
                required
                autoFocus
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setResetOpen(false)}
                disabled={resetLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="ottoman-button"
                disabled={resetLoading}
              >
                {resetLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuthForm;
