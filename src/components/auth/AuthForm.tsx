import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, UserPlus, X } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useRef } from "react";
import { toast } from "sonner";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import { useTranslation } from 'react-i18next';
import { EmailConfirmationDialog } from "./EmailConfirmationDialog";
import { getAuthRedirectUrl, logRedirectInfo, getDeploymentEnvironment } from '@/utils/authRedirect';
import { safeNavigate, safeNavigateBack, getSafeFallbackPath, chromeSafeAuthRedirect } from '@/utils/safeNavigation';

interface AuthFormProps {
  mode?: 'login' | 'register' | 'reset';
}

const AuthForm: React.FC<AuthFormProps> = ({ mode: initialMode = 'login' }) => {
  const { t } = useTranslation(['pages']);
  const { login, register, blockedNotice, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [emailConfirmationOpen, setEmailConfirmationOpen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

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
      .eq('email', email.toLowerCase() as string)
      .maybeSingle();
    return !!data;
  };

  const [blockedError, setBlockedError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setBlockedError(null);
    setLoginError(null);
    
    try {
      console.log('Starting login process...');
      
      const isBlocked = await checkBlockedEmail(loginEmail);
      if (isBlocked) {
        console.log('Email is blocked');
        const errorMsg = t('auth.errors.accountBlocked.description');
        setLoginError(errorMsg);
        toast({
          variant: "destructive",
          title: t('auth.errors.accountBlocked.title'),
          description: errorMsg,
        });
      return;
    }

      console.log('Attempting to login with Supabase...');
      const result = await login(loginEmail, loginPassword);
      
      if (result.success) {
        console.log('Login successful, navigating to home page...');
        // Clear form and errors on success
        setLoginEmail("");
        setLoginPassword("");
        setLoginError(null);
        // Small delay to let the success toast show
        setTimeout(() => {
          // Use Chrome-specific redirect protection to prevent external redirects
          chromeSafeAuthRedirect(navigate, '/');
        }, 500);
      } else {
        console.log('Login failed:', result.error);
        // Set local error state for visual feedback
        setLoginError(result.error || "Login failed");
        // Clear password field for security
        setLoginPassword("");
      }
    } catch (error: any) {
      console.error("Unexpected login error:", error);
      const errorMsg = "An unexpected error occurred. Please try again.";
      setLoginError(errorMsg);
      toast({
        variant: "destructive",
        title: "Login Error",
        description: errorMsg,
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockedError(null);
    setRegisterError(null);
    
    // Comprehensive frontend validation
    if (!registerUsername.trim()) {
      toast({
        variant: "destructive",
        title: t('auth.errors.usernameRequired.title'),
        description: t('auth.errors.usernameRequired.description'),
      });
      return;
    }

    if (registerUsername.length < 3) {
      toast({
        variant: "destructive",
        title: t('auth.errors.usernameTooShort.title'),
        description: t('auth.errors.usernameTooShort.description'),
      });
      return;
    }

    if (!registerEmail.trim()) {
      toast({
        variant: "destructive",
        title: t('auth.errors.emailRequired.title'),
        description: t('auth.errors.emailRequired.description'),
      });
      return;
    }

    if (!registerConfirmEmail.trim()) {
      toast({
        variant: "destructive",
        title: t('auth.errors.emailConfirmationRequired.title'),
        description: t('auth.errors.emailConfirmationRequired.description'),
      });
      return;
    }

    if (registerEmail !== registerConfirmEmail) {
      setEmailsMatch(false);
      toast({
        variant: "destructive",
        title: t('auth.errors.emailMismatch.title'),
        description: t('auth.errors.emailMismatch.description'),
      });
      return;
    }

    if (!registerPassword) {
      toast({
        variant: "destructive",
        title: t('auth.errors.passwordRequired.title'),
        description: t('auth.errors.passwordRequired.description'),
      });
      return;
    }
    
    if (registerPassword.length < 6) {
      toast({
        variant: "destructive",
        title: t('auth.errors.passwordTooShort.title'),
        description: t('auth.errors.passwordTooShort.description'),
      });
      return;
    }
    
    if (!registerConfirmPassword) {
      toast({
        variant: "destructive",
        title: t('auth.errors.passwordConfirmationRequired.title'),
        description: t('auth.errors.passwordConfirmationRequired.description'),
      });
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setPasswordsMatch(false);
      toast({
        variant: "destructive",
        title: t('auth.errors.passwordMismatch.title'),
        description: t('auth.errors.passwordMismatch.description'),
      });
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail)) {
      toast({
        variant: "destructive",
        title: t('auth.errors.invalidEmailFormat.title'),
        description: t('auth.errors.invalidEmailFormat.description'),
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
          title: t('auth.errors.emailBlocked.title'),
          description: t('auth.errors.emailBlocked.description'),
        });
        return;
      }

      console.log('Attempting to register with Supabase...');
      const result = await register(registerUsername, registerEmail, registerPassword);
      
      if (result.success) {
        console.log('Registration successful, showing email confirmation dialog...');
        // Store the registered email and show confirmation dialog
        setRegisteredEmail(registerEmail);
        setEmailConfirmationOpen(true);
        
        // Clear form and errors on success
        setRegisterUsername("");
        setRegisterEmail("");
        setRegisterConfirmEmail("");
        setRegisterPassword("");
        setRegisterConfirmPassword("");
        setEmailsMatch(true);
        setPasswordsMatch(true);
        setRegisterError(null);
      } else {
        console.log('Registration failed:', result.error);
        // Set local error state for visual feedback
        setRegisterError(result.error || "Registration failed");
        // Clear password fields for security
        setRegisterPassword("");
        setRegisterConfirmPassword("");
        setPasswordsMatch(true);
      }
    } catch (error: any) {
      console.error("Unexpected registration error:", error);
      const errorMsg = "An unexpected error occurred. Please try again.";
      setRegisterError(errorMsg);
      toast({
        variant: "destructive",
        title: "Registration Error",
        description: errorMsg,
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      // Get the redirect URL and log debug information
      const redirectUrl = getAuthRedirectUrl();
      const environment = getDeploymentEnvironment();
      
      logRedirectInfo('Google Auth');
      
      console.log('🔐 Google Auth Environment:', {
        environment,
        redirectUrl,
        expectedBehavior: environment === 'localhost' ? 'Should redirect to localhost' : 
                         environment === 'preview' ? 'Should redirect to preview domain' : 
                         'Should redirect to production domain'
      });
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) throw error;
      
      toast({
        title: t('auth.errors.redirectingToGoogle.title'),
        description: t('auth.errors.redirectingToGoogle.description'),
      });
    } catch (err: any) {
      console.error('❌ Google Auth Error:', err);
      toast({
        variant: "destructive",
        title: t('auth.errors.googleSignInError.title'),
        description: err?.message || t('auth.errors.googleSignInError.description'),
      });
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${getAuthRedirectUrl()}/reset-password?`
      });

      if (error) {
        toast({
          variant: "destructive",
          title: t('auth.passwordReset.errorTitle'),
          description: error.message || t('auth.passwordReset.errorDescription'),
        });
      } else {
        toast({
          title: t('auth.passwordReset.successTitle'),
          description: t('auth.passwordReset.successDescription'),
        });
        setResetOpen(false);
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t('auth.passwordReset.errorTitle'),
        description: t('auth.passwordReset.errorDescription'),
      });
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
          onValueChange={(value) => setActiveTab(value as 'login' | 'register' | 'reset')}
                className="w-full" 
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login" className="font-medium">
              {t('auth.login.loginButton')}
            </TabsTrigger>
            <TabsTrigger value="register" className="font-medium">
              {t('auth.register.registerButton')}
            </TabsTrigger>
          </TabsList>

          {/* ========== Login Form Tab ========== */}
          <TabsContent value="login">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-serif font-semibold mb-2 text-gold-500">
                  <span>{t('auth.login.title')}</span>
                </h3>
                <p className="text-ottoman-200 text-sm">
                  {t('auth.login.subtitle')}
                </p>
                {(blockedError || loginError) && (
                  <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    {blockedError || loginError}
              </div>
                )}
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-ottoman-200">
                    {t('auth.login.email')}
                  </label>
                <Input
                  id="email"
                  type="email"
                    placeholder={t('auth.login.emailPlaceholder')}
                  required
                    className="ottoman-input"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      // Clear errors when user starts typing
                      if (loginError) setLoginError(null);
                      if (blockedError) setBlockedError(null);
                    }}
                />
              </div>

              <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-ottoman-200"
                    >
                      {t('auth.login.password')}
                    </label>
                    <button
                      type="button"
                      className="text-xs text-ottoman-400 hover:text-ottoman-300 px-0 underline"
                      onClick={() => setResetOpen(true)}
                    >
                      {t('auth.login.forgotPassword')}
                    </button>
                  </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                      placeholder={t('auth.login.passwordPlaceholder')}
                    required
                      className="ottoman-input pr-10"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        // Clear errors when user starts typing
                        if (loginError) setLoginError(null);
                        if (blockedError) setBlockedError(null);
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

              <Button 
                type="submit" 
                  className="ottoman-button w-full"
                  disabled={authLoading || loginLoading}
                >
                  {(authLoading || loginLoading) ? (
                    <span className="animate-pulse">{t('auth.login.loggingIn')}</span>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      {t('auth.login.loginButton')}
                    </>
                  )}
              </Button>
              </form>

              {/* Google login button */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              
                <Button 
                variant="outline"
                type="button"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleGoogleAuth}
                disabled={authLoading || loginLoading}
              >
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                  className="w-5 h-5"
                />
                Sign in with Google
                </Button>

              <div className="text-center">
                <p className="text-sm text-ottoman-400">
                  {t('auth.login.noAccount')}{" "}
                  <button
                    className="text-ottoman-300 hover:text-ottoman-100"
                    onClick={() => setActiveTab("register")}
                  >
                    {t('auth.login.registerLink')}
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
                  <span>{t('auth.register.title')}</span>
                </h3>
                <p className="text-ottoman-200 text-sm">
                  {t('auth.register.subtitle')}
                </p>
                {(blockedError || registerError) && (
                  <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    {blockedError || registerError}
                  </div>
                )}
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                  <label
                    htmlFor="username"
                    className="text-sm font-medium text-ottoman-200"
                  >
                    {t('auth.register.username')}
                  </label>
                <Input
                  id="username"
                    placeholder={t('auth.register.usernamePlaceholder')}
                  required
                    className="ottoman-input"
                    value={registerUsername}
                    onChange={(e) => {
                      setRegisterUsername(e.target.value);
                      // Clear errors when user starts typing
                      if (registerError) setRegisterError(null);
                      if (blockedError) setBlockedError(null);
                    }}
                />
              </div>

              <div className="space-y-2">
                  <label
                    htmlFor="register-email"
                    className="text-sm font-medium text-ottoman-200"
                  >
                    {t('auth.register.email')}
                  </label>
                <Input
                    id="register-email"
                  type="email"
                    placeholder={t('auth.register.emailPlaceholder')}
                  required
                    className={`ottoman-input ${
                      !emailsMatch && registerConfirmEmail
                        ? "border-red-500"
                        : ""
                    }`}
                    value={registerEmail}
                    onChange={(e) => {
                      setRegisterEmail(e.target.value);
                      setEmailsMatch(e.target.value === registerConfirmEmail);
                      // Clear errors when user starts typing
                      if (registerError) setRegisterError(null);
                      if (blockedError) setBlockedError(null);
                    }}
                />
              </div>

              <div className="space-y-2">
                  <label
                    htmlFor="confirm-email"
                    className="text-sm font-medium text-ottoman-200"
                  >
                    {t('auth.register.confirmEmail')}
                  </label>
                  <Input
                    id="confirm-email"
                    type="email"
                    placeholder={t('auth.register.emailPlaceholder')}
                    required
                    className={`ottoman-input ${
                      !emailsMatch && registerConfirmEmail
                        ? "border-red-500"
                        : ""
                    }`}
                    value={registerConfirmEmail}
                    onChange={(e) => {
                      setRegisterConfirmEmail(e.target.value);
                      setEmailsMatch(registerEmail === e.target.value);
                      // Clear errors when user starts typing
                      if (registerError) setRegisterError(null);
                      if (blockedError) setBlockedError(null);
                    }}
                  />
                  {!emailsMatch && registerConfirmEmail && (
                    <p className="text-xs text-red-500 mt-1">
                      {t('auth.register.emailMismatch')}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="register-password"
                    className="text-sm font-medium text-ottoman-200"
                  >
                    {t('auth.register.password')}
                  </label>
                <div className="relative">
                  <Input
                      id="register-password"
                    type={showPassword ? "text" : "password"}
                      placeholder={t('auth.register.passwordPlaceholder')}
                    required
                      className="ottoman-input pr-10"
                      value={registerPassword}
                      onChange={(e) => {
                        setRegisterPassword(e.target.value);
                        setPasswordsMatch(
                          e.target.value === registerConfirmPassword
                        );
                        // Clear errors when user starts typing
                        if (registerError) setRegisterError(null);
                        if (blockedError) setBlockedError(null);
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
                    {t('auth.register.confirmPassword')}
                  </label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('auth.register.passwordPlaceholder')}
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
                      // Clear errors when user starts typing
                      if (registerError) setRegisterError(null);
                      if (blockedError) setBlockedError(null);
                    }}
                  />
                  {!passwordsMatch && registerConfirmPassword && (
                    <p className="text-xs text-red-500 mt-1">
                      {t('auth.register.passwordMismatch')}
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
                    {t('auth.register.termsAgreement')}{" "}
                    <button
                    type="button"
                      onClick={() => setTermsOpen(true)}
                      className="text-ottoman-400 hover:text-ottoman-300 underline"
                    >
                      {t('auth.register.termsOfService')}
                    </button>{" "}
                    {t('auth.register.and')}{" "}
                    <button
                      type="button"
                      onClick={() => setPrivacyOpen(true)}
                      className="text-ottoman-400 hover:text-ottoman-300 underline"
                    >
                      {t('auth.register.privacyPolicy')}
                    </button>
                  </label>
              </div>

              <Button 
                type="submit" 
                  className="ottoman-button w-full"
                  disabled={authLoading || registerLoading || !passwordsMatch || !emailsMatch}
                >
                  {(authLoading || registerLoading) ? (
                    <span className="animate-pulse">{t('auth.register.creatingAccount')}</span>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t('auth.register.registerButton')}
                    </>
                  )}
              </Button>
            </form>

              {/* Google sign-up button */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            variant="outline"
                type="button"
                className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleAuth}
                disabled={authLoading || registerLoading}
              >
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                  className="w-5 h-5"
                />
                Sign up with Google
          </Button>

              <div className="text-center">
                <p className="text-sm text-ottoman-400">
                  {t('auth.register.hasAccount')}{" "}
                  <button
                    className="text-ottoman-300 hover:text-ottoman-100"
                    onClick={() => setActiveTab("login")}
                  >
                    {t('auth.register.loginLink')}
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
            <DialogTitle><span>{t('auth.passwordReset.title')}</span></DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4 mt-2">
            <div className="space-y-1">
              <label htmlFor="reset-email" className="text-sm font-medium">
                {t('auth.passwordReset.description')}
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
                {t('auth.passwordReset.cancel')}
              </Button>
              <Button
                type="submit"
                className="ottoman-button"
                disabled={resetLoading}
              >
                {resetLoading ? t('auth.passwordReset.sending') : t('auth.passwordReset.sendButton')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Terms of Service dialog */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto mx-auto mt-4 mb-4 sm:my-4">

          <div className="mt-4 px-2 sm:px-0">
            <div className="prose prose-sm max-w-none text-sm sm:text-base">
              <h1 className="text-xl sm:text-2xl font-bold mb-6">
                <span>Terms of Service</span>
              </h1>

              <h2 className="text-base sm:text-lg font-semibold mt-6 mb-3">
                <span>1. Your Acceptance</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> By using and/or visiting this website, whether by an application, a web browser, Ottocollect API, or any other form, (collectively, including all content and functionality available through the Ottocollect domain names, such as Ottocollect.com and others, the "Ottocollect Website", or "Website"), you signify your agreement to (1) these terms and conditions (the "Terms of Service"), (2) Ottocollect's privacy policy, found at: https://Ottocollect.com and incorporated here by reference. If you do not agree to any of these terms or the Ottocollect privacy policy, please do not use the Website.
              </p>
              <p className="mb-3">
                <strong>B.</strong> Although we may attempt to notify you when major changes are made to these Terms of Service, you should periodically review the most up-to-date version at https://Ottocollect.com. Ottocollect may, in its sole discretion, modify or revise these Terms of Service and policies at any time, and you agree to be bound by such modifications or revisions.
              </p>
              <p className="mb-3">
                <strong>C.</strong> While the "Terms of Service" may appear in different languages, only the English language version is the binding one. Ottocollect is translated by volunteers, ai and macune translation.
              </p>
              <p className="mb-3">
                <strong>D.</strong> Nothing in this Agreement shall be deemed to confer any third-party rights or benefits.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>2. Ottocollect Website</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> These Terms of Service apply to all users of the Ottocollect Website. The Ottocollect Website includes all aspects of Ottocollect.
              </p>
              <p className="mb-3">
                <strong>B.</strong> The Ottocollect Website may contain links to third party websites that are not owned or controlled by Ottocollect. Ottocollect has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third party websites. In addition, Ottocollect cannot censor or edit the content of any third-party site. By using the Website, you expressly relieve Ottocollect from any and all liability arising from your use of any third-party website.
              </p>
              <p className="mb-3">
                <strong>C.</strong> Accordingly, we encourage you to be aware when you leave the Ottocollect Website and to read the terms and conditions and privacy policy of each other website that you visit.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>3. Ottocollect Accounts</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> In order to access some key-features of Ottocillect, such as personal collection management and others, you will have to create an Ottocollect account. You may never use another's account without permission. When creating your account, you must provide accurate and complete information. You are solely responsible for the activity that occurs on your account, and you must keep your account password secure. You must notify Ottocollect immediately of any breach of security or unauthorized use of your account.
              </p>
              <p className="mb-3">
                <strong>B.</strong> Although Ottocollect will not be liable for your losses caused by any unauthorized use of your account, you may be liable for the losses of Ottocollect or others due to such unauthorized use.
              </p>
              <p className="mb-3">
                <strong>C.</strong> You are not allowed to create more than one account on Ottocollect. People having more than one account may have all their accounts deactivated and be permanently banned from Ottocollect.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>4. General Use of the Website—Permissions and Restrictions</span>
              </h2>
              <p className="mb-3">
                Ottocollect hereby grants you permission to access and use the Website as set forth in these Terms of Service, provided that:
              </p>
              <p className="mb-3">
                <strong>A.</strong> You agree not to distribute in any medium any part of the Website without Ottocollect's prior written authorization.
              </p>
              <p className="mb-3">
                <strong>B.</strong> You agree not to alter or modify any part of the Website.
              </p>
              <p className="mb-3">
                <strong>C.</strong> You agree not to access Ottocollect's content through any technology or means other than the pages of the Website itself, or other explicitly authorized means Ottocollect may designate.
              </p>
              <p className="mb-3">
                <strong>D.</strong> You agree not to use the Website for any commercial use, without the prior written authorization of Ottocollect. Prohibited commercial uses include any of the following actions taken without Ottocollect's express approval:
              </p>
              <ul className="list-disc pl-6 mb-3">
                <li>sale of access to the Website or its related services on another website;</li>
                <li>use of the Website or its related services, for the primary purpose of gaining advertising;</li>
                <li>and any use of the Website or its related services that Ottocollect finds, in its sole discretion, to use Ottocollect's resources with the effect of competing with or displacing the market for Ottocollect.</li>
              </ul>
              <p className="mb-3">
                <strong>E.</strong> Prohibited commercial uses do not include:
              </p>
              <ul className="list-disc pl-6 mb-3">
                <li>adding items you sell to your Swap List;</li>
                <li>any use that Ottocollect expressly authorizes in writing.</li>
              </ul>
              <p className="mb-3">
                <strong>F.</strong> You agree not to use or launch any automated system, including without limitation, "robots," "spiders," or "offline readers," that accesses the Website in a manner that sends more request messages to the Ottocollect servers in a given period of time than a human can reasonably produce in the same period by using a conventional on-line web browser. Notwithstanding the foregoing, Ottocollect grants the operators of public search engines permission to use spiders to copy materials from the site for the sole purpose of and solely to the extent necessary for creating publicly available searchable indices of the materials, but not caches or archives of such materials. Ottocollect reserves the right to revoke these exceptions either generally or in specific cases. You agree not to collect or harvest any personally identifiable information, including, but not limited to, names, personal lists and ratings, from the Website, nor to use the communication systems provided by the Website (e.g. forums, private messages) for any commercial solicitation purposes. You agree not to solicit, for commercial purposes, any users of the Website.
              </p>
              <p className="mb-3">
                <strong>G.</strong> In your use of the website, you will otherwise comply with the terms and conditions of these Terms of Service and all applicable local, national, and international laws and regulations.
              </p>
              <p className="mb-3">
                <strong>H.</strong> Ottocollect reserves the right to discontinue any aspect of the Ottocollect Website at any time.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>5. Your Use of Content on the Site</span>
              </h2>
              <p className="mb-3">
                In addition to the general restrictions above, the following restrictions and conditions apply specifically to your use of content on the Ottocollect Website.
              </p>
              <p className="mb-3">
                <strong>A.</strong> The content on the Ottocollect Website, except all User Submissions (as defined below), including without limitation, the text, software, scripts, graphics, photos, sounds, music, videos, interactive features and the like ("Content") and the trademarks, service marks and logos contained therein ("Marks"), are owned by or licensed to Ottocollect, subject to copyright and other intellectual property rights under the law. Content on the Website is provided to you AS IS for your information and personal use only and may not be downloaded, copied, reproduced, distributed, transmitted, broadcast, displayed, sold, licensed, or otherwise exploited for any other purposes whatsoever without the prior written consent of the respective owners. Ottocollect reserves all rights not expressly granted in and to the Website and the Content.
              </p>
              <p className="mb-3">
                <strong>B.</strong> You may manage your "personal collection" on Ottocollect. While information you provide in your "personal collection" does not have to be complete, it must be true. You should not add items you do not have in your possession to either your collection or swap lists.
              </p>
              <p className="mb-3">
                <strong>C.</strong> When contributing information to Ottocollect's catalog, including adding items or comments regarding items, you should be fairly convinced of the accuracy of the information provided. Providing wrong or misleading information intentionally, either for commercial benefit or otherwise, will be prosecuted by Ottocollect.
              </p>
              <p className="mb-3">
                <strong>D.</strong> You may access Ottocollect Content only as permitted under this Agreement. Colnect reserves all rights not expressly granted in and to the Ottocollect Content and the Ottocollect Service.
              </p>
              <p className="mb-3">
                <strong>E.</strong> You agree to not engage in the use, copying, or distribution of any of the Content other than expressly permitted herein.
              </p>
              <p className="mb-3">
                <strong>F.</strong> You agree not to circumvent, disable or otherwise interfere with security-related features of the Ottocollect Website or features that prevent or restrict use or copying of any Content or enforce limitations on use of the Ottocollect Website or the Content therein.
              </p>
              <p className="mb-3">
                <strong>G.</strong> You understand that when using the Ottocollect Website, you will be exposed to information gathered from a variety of sources, and that Ottocollect is not responsible for the accuracy, usefulness, safety, or intellectual property rights of or relating to such User Submissions. You further understand and acknowledge that you may be exposed to information that is inaccurate, offensive, indecent, or objectionable, and you agree to waive, and hereby do waive, any legal or equitable rights or remedies you have or may have against Ottocollect with respect thereto, and agree to indemnify and hold Ottocollect, its Owners/Operators, affiliates, and/or licensors, harmless to the fullest extent allowed by law regarding all matters related to your use of the site.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>6. Your User Contributions and Conduct</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> As a Ottocollect account holder you may submit relevant content. Adding items to the catalogs, editing the catalogs, adding item comments, translations, posting in the forums or sending private messages are collectively referred to as "User Contributions." You understand that Ottocollect does not guarantee any confidentiality with respect to any User Contributions.
              </p>
              <p className="mb-3">
                <strong>B.</strong> You shall be solely responsible for your own User Contributions and the consequences of posting or publishing them. In connection with User Contributions, you affirm, represent, and/or warrant that: you own or have the necessary licenses, rights, consents, and permissions to use and authorize Ottocollect to use all patent, trademark, trade secret, copyright or other proprietary rights in and to any and all User Contributions to enable inclusion and use of the User Contributions in the manner contemplated by the Website and these Terms of Service.
              </p>
              <p className="mb-3">
                <strong>C.</strong> For the sake of clarity, you are transferring all of your proprietary rights in your User Contributions to Ottocollect.
              </p>
              <p className="mb-3">
                <strong>D.</strong> In connection with User Contributions, you further agree that you will not submit material that is copyrighted, protected by trade secret or otherwise subject to third party proprietary rights, including privacy and publicity rights, unless you are the owner of such rights or have permission from their rightful owner to post the material and to grant Ottocollect all of the license rights granted herein.
              </p>
              <p className="mb-3">
                <strong>E.</strong> You further agree that you will not, in connection with User Contributions, submit material that is contrary to applicable local, national, and international laws and regulations.
              </p>
              <p className="mb-3">
                <strong>F.</strong> Ottocollect does not endorse any User Contributions or any opinion, recommendation, or advice expressed therein, and Ottocollect expressly disclaims any and all liability in connection with User Contributions. Ottocollect does not permit copyright infringing activities and infringement of intellectual property rights on its Website, and Colnect will remove all Content and User Contributions if properly notified that such Content or User Contributions infringes on another's intellectual property rights. Ottocollect reserves the right to remove Content and User Contributions without prior notice.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>7. Account Termination Policy</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> Ottocollect will terminate a User's access to its Website if, under appropriate circumstances, they are determined to be a repeat infringer. In addition, any activity which may be regarded as an abuse of the Website and/or which may be suspected as possibly harmful to the Website or its users may cause an immediate deactivation of a User's account without prior notice.
              </p>
              <p className="mb-3">
                <strong>B.</strong> Ottocollect reserves the right to decide whether Content or a User Contributions is appropriate and complies with these Terms of Service for violations other than copyright infringement, such as, but not limited to, pornography, obscene or defamatory material. Ottocollect may remove such User Contributions and/or terminate a User's access for submitting such material in violation of these Terms of Service at any time, without prior notice and at its sole discretion.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>8. Subscriptions and Paid Services</span>
              </h2>
              <p className="mb-3">
                Service-Specific Rules relating to our Subscription Service are available at https://Ottocollect.com
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>9. Marketplace</span>
              </h2>
              <p className="mb-3">
                Service-Specific Rules relating to our Marketplace are available at https://Ottocollect.com
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>10. Ottocollect Application Programming Interface</span>
              </h2>
              <p className="mb-3">
                Ottocollect Application Programming Interface, OAPI, offers access to information on Ottocollect. To use OAPI, you must fill in a OAPI access request.
              </p>
              <p className="mb-3">
                <strong>A.</strong> You declare that all information you provide on your OAPI access request is correct, truthful and as complete as possible.
              </p>
              <p className="mb-3">
                <strong>B.</strong> You may only access OAPI with prior written permission, hereby the "license", and only for the goals you have provided in the request you have made. Ottocollect may revoke your license at any time at its own disclosure.
              </p>
              <p className="mb-3">
                <strong>C.</strong> You may access OAPI only using documented features. If something in OAPI does not work according to the documentation, you agree to report it immediately to Ottocollect in writing.
              </p>
              <p className="mb-3">
                <strong>D.</strong> You may access OAPI only with the access keys you have been provided. You must keep the access keys confidential. You will be held responsible for any misuse of OAPI done with your access keys.
              </p>
              <p className="mb-3">
                <strong>E.</strong> Unless specifically mentioned, Ottocollect owns all rights to content extracted from Ottocollect or content created using content extracted from Ottocollect, either by using OAPI or other means. You are not allowed to provide third parties with access to such content in any means other than the ones described in your OAPI access request. When your OAPI usage license is revoked, you should immediately delete all such content.
              </p>
              <p className="mb-3">
                <strong>F.</strong> A free OAPI license may be revoked at Ottocollect's discretion for breach of license, excessive traffic or any other reason situation. Paid license may equally be revoked but Ottocollect will refund the part of the amount paid for any unused license time or traffic.
              </p>
              <p className="mb-3">
                <strong>G.</strong> You are required to mention Ottocollect as a source of information used for your product by including the following statement on your application's website or as a part of your application in a visible place: "Catalog information courtesy of Ottocollect, an online collectors community." and have a link to any page on Ottocollect that you find most relevant.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>11. Warranty Disclaimer</span>
              </h2>
              <p className="mb-3">
                YOU AGREE THAT YOUR USE OF THE Ottocollect WEBSITE SHALL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, Ottocollect, ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE WEBSITE AND YOUR USE THEREOF. Ottocollect MAKES NO WARRANTIES OR REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF THIS SITE'S CONTENT OR THE CONTENT OF ANY SITES LINKED TO THIS SITE AND ASSUMES NO LIABILITY OR RESPONSIBILITY FOR ANY (I) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT, (II) PERSONAL INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER, RESULTING FROM YOUR ACCESS TO AND USE OF OUR WEBSITE, (III) ANY UNAUTHORIZED ACCESS TO OR USE OF OUR SECURE SERVERS AND/OR ANY AND ALL PERSONAL INFORMATION AND/OR FINANCIAL INFORMATION STORED THEREIN, (IV) ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM OUR WEBSITE, (IV) ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE WHICH MAY BE TRANSMITTED TO OR THROUGH OUR WEBSITE BY ANY THIRD PARTY, AND/OR (V) ANY ERRORS OR OMISSIONS IN ANY CONTENT OR FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF YOUR USE OF ANY CONTENT POSTED, EMAILED, TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE Ottocollect WEBSITE. Ottocollect DOES NOT WARRANT, ENDORSE, GUARANTEE, OR ASSUME RESPONSIBILITY FOR ANY PRODUCT OR SERVICE ADVERTISED OR OFFERED BY A THIRD PARTY THROUGH THE Ottocollect WEBSITE OR ANY HYPERLINKED WEBSITE OR FEATURED IN ANY BANNER OR OTHER ADVERTISING, AND Ottocollect WILL NOT BE A PARTY TO OR IN ANY WAY BE RESPONSIBLE FOR MONITORING ANY TRANSACTION BETWEEN YOU AND THIRD-PARTY PROVIDERS OF PRODUCTS OR SERVICES. AS WITH THE PURCHASE OF A PRODUCT OR SERVICE THROUGH ANY MEDIUM OR IN ANY ENVIRONMENT, YOU SHOULD USE YOUR BEST JUDGMENT AND EXERCISE CAUTION WHERE APPROPRIATE.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>12. Limitation of Liability</span>
              </h2>
              <p className="mb-3">
                IN NO EVENT SHALL Ottocollect, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS, BE LIABLE TO YOU FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES WHATSOEVER RESULTING FROM ANY (I) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT, (II) PERSONAL INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER, RESULTING FROM YOUR ACCESS TO AND USE OF OUR WEBSITE, (III) ANY UNAUTHORIZED ACCESS TO OR USE OF OUR SECURE SERVERS AND/OR ANY AND ALL PERSONAL INFORMATION AND/OR FINANCIAL INFORMATION STORED THEREIN, (IV) ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM OUR WEBSITE, (IV) ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE, WHICH MAY BE TRANSMITTED TO OR THROUGH OUR WEBSITE BY ANY THIRD PARTY, AND/OR (V) ANY ERRORS OR OMISSIONS IN ANY CONTENT OR FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF YOUR USE OF ANY CONTENT POSTED, EMAILED, TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE Ottocollect WEBSITE, WHETHER BASED ON WARRANTY, CONTRACT, TORT, OR ANY OTHER LEGAL THEORY, AND WHETHER OR NOT THE COMPANY IS ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. THE FOREGOING LIMITATION OF LIABILITY SHALL APPLY TO THE FULLEST EXTENT PERMITTED BY LAW IN THE APPLICABLE JURISDICTION.
              </p>
              <p className="mb-3">
                YOU SPECIFICALLY ACKNOWLEDGE THAT Ottocollect SHALL NOT BE LIABLE FOR USER SUBMISSIONS OR THE DEFAMATORY, OFFENSIVE, OR ILLEGAL CONDUCT OF ANY THIRD PARTY AND THAT THE RISK OF HARM OR DAMAGE FROM THE FOREGOING RESTS ENTIRELY WITH YOU.
              </p>
              <p className="mb-3">
                The Website is controlled and offered by Ottocollect from its facilities in the middleeast. Though available in multiple languages, Ottocollect makes no representations that the Ottocollect Website is appropriate or available for use in other locations. Those who access or use the Ottocollect Website from other jurisdictions do so at their own volition and are responsible for compliance with local law.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>13. Indemnity</span>
              </h2>
              <p className="mb-3">
                You agree to defend, indemnify and hold harmless Ottocollect, its officers, directors, employees and agents, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees) arising from: (i) your use of and access to the Ottocollect Website; (ii) your violation of any term of these Terms of Service; (iii) your violation of any third party right, including without limitation any copyright, property, or privacy right; or (iv) any claim that one of your User Contributions caused damage to a third party. This defense and indemnification obligation will survive these Terms of Service and your use of the Ottocollect Website.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>14. Child Sexual Abuse and Exploitation (CSAE)</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> Users are strictly prohibited from engaging in any activity or uploading any content that is related to child sexual abuse and exploitation (CSAE). This includes but is not limited to:
              </p>
              <ul className="list-disc pl-6 mb-3">
                <li>Sharing, creating, or distributing any material involving CSAE.</li>
                <li>Engaging in behavior, communication, or actions that exploit or harm minors.</li>
                <li>Soliciting or encouraging CSAE-related activities on the platform.</li>
              </ul>
              <p className="mb-3">
                <strong>B.</strong> Any violation of this clause will result in immediate account termination, removal of offending content, and potential reporting to relevant authorities as required by applicable law.
              </p>
              <p className="mb-3">
                <strong>C.</strong> Users are required to report any suspicious activity or content related to CSAE encountered on Ottocollect's platform. Reports can be made via our Contact Us page.
              </p>
              <p className="mb-3">
                <strong>D.</strong> Failure to report known violations may be considered a breach of these Terms of Service.
              </p>
              <p className="mb-3">
                <strong>E.</strong> Ottocollect cooperates with law enforcement and relevant authorities in investigations related to CSAE. This may include providing user data in accordance with applicable laws.
              </p>
              <p className="mb-3">
                <strong>F.</strong> By using Ottocollect, you acknowledge and agree that we may take actions as required to comply with legal obligations concerning CSAE incidents.
              </p>
              <p className="mb-3">
                <strong>G.</strong> If you are found to be in violation of these terms regarding CSAE, Ottocollect may take the following actions:
              </p>
              <ul className="list-disc pl-6 mb-3">
                <li>Immediate suspension or termination of your account.</li>
                <li>Removal of any related content.</li>
                <li>Notification to relevant authorities.</li>
              </ul>
              <p className="mb-3">
                <strong>H.</strong> Ottocollect reserves the right to take additional legal action as deemed necessary.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>15. Ability to Accept Terms of Service</span>
              </h2>
              <p className="mb-3">
                You affirm that you are either more than 18 years of age, or an emancipated minor, or possess legal parental or guardian consent, and are fully able and competent to enter into the terms, conditions, obligations, affirmations, representations, and warranties set forth in these Terms of Service, and to abide by and comply with these Terms of Service. In any case, you affirm that you are over the age of 18, as the Ottocollect Website is not intended for children under 18. If you are under 18 years of age, then please do not use the Ottocollect Website. There are lots of other great web sites for you. Talk to your parents about what sites are appropriate for you.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>16. Assignment</span>
              </h2>
              <p className="mb-3">
                These Terms of Service, and any rights and licenses granted hereunder, may not be transferred or assigned by you, but may be assigned by Colnect without restriction.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>17. General</span>
              </h2>
              <p className="mb-3">
                You agree that: (i) the Ottocollect Website shall be deemed solely based in Petah-Tiqwa, Israel ; and (ii) the Ottocollect Website shall be deemed a passive website that does not give rise to personal jurisdiction over Ottocollect, either specific or general, in jurisdictions other than Petah-Tiqwa, Israel. These Terms of Service shall be governed by the internal substantive laws of the State of Israel, without respect to its conflict of laws principles. Any claim or dispute between you and Ottocollect that arises in whole or in part from the Ottocollect Website shall be decided exclusively by a court of competent jurisdiction located in Petah-Tiqwa, Israel. These Terms of Service, together with the Privacy Notice and any other legal notices published by Ottocollect on the Website, shall constitute the entire agreement between you and Ottocollect concerning the Ottocollect Website. If any provision of these Terms of Service is deemed invalid by a court of competent jurisdiction, the invalidity of such provision shall not affect the validity of the remaining provisions of these Terms of Service, which shall remain in full force and effect. No waiver of any term of this these Terms of Service shall be deemed a further or continuing waiver of such term or any other term, and Ottocollect's failure to assert any right or provision under these Terms of Service shall not constitute a waiver of such right or provision. Ottocollect reserves the right to amend these Terms of Service at any time and without notice, and it is your responsibility to review these Terms of Service for any changes. Your use of the Ottocollect Website following any amendment of these Terms of Service will signify your assent to and acceptance of its revised terms. YOU AND Ottocollect AGREE THAT ANY CAUSE OF ACTION ARISING OUT OF OR RELATED TO THE Ottocollect WEBSITE MUST COMMENCE WITHIN ONE (1) YEAR AFTER THE CAUSE OF ACTION ACCRUES. OTHERWISE, SUCH CAUSE OF ACTION IS PERMANENTLY BARRED.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button onClick={() => setTermsOpen(false)} className="w-full sm:w-auto">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy dialog */}
      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto mx-auto mt-4 mb-4 sm:my-4">

          <div className="mt-4 px-2 sm:px-0">
            <div className="prose prose-sm max-w-none text-sm sm:text-base">
              <h1 className="text-xl sm:text-2xl font-bold mb-6">
                <span>Privacy Policy</span>
              </h1>

              <h2 className="text-base sm:text-lg font-semibold mt-6 mb-3">
                <span>1. Information We Collect</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> Personal Information: When you create an account, we collect your email address, username, and any other information you choose to provide.
              </p>
              <p className="mb-3">
                <strong>B.</strong> Collection Information: We collect information about your banknote collection, including images, descriptions, and metadata you upload.
              </p>
              <p className="mb-3">
                <strong>C.</strong> Usage Information: We collect information about how you use our platform, including your interactions with other users and content.
              </p>
              <p className="mb-3">
                <strong>D.</strong> Technical Information: We automatically collect certain technical information, including your IP address, browser type, and device information.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>2. How We Use Your Information</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> To provide and maintain our services
              </p>
              <p className="mb-3">
                <strong>B.</strong> To process your transactions and manage your account
              </p>
              <p className="mb-3">
                <strong>C.</strong> To communicate with you about our services
              </p>
              <p className="mb-3">
                <strong>D.</strong> To improve our platform and develop new features
              </p>
              <p className="mb-3">
                <strong>E.</strong> To ensure the security and integrity of our platform
              </p>
              <p className="mb-3">
                <strong>F.</strong> To comply with legal obligations
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>3. Information Sharing</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
              </p>
              <p className="mb-3">
                <strong>B.</strong> We may share your information with service providers who assist us in operating our platform.
              </p>
              <p className="mb-3">
                <strong>C.</strong> We may disclose your information if required by law or to protect our rights and safety.
              </p>
              <p className="mb-3">
                <strong>D.</strong> Your collection information may be visible to other users as part of the platform's social features.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>4. Data Security</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> We implement appropriate security measures to protect your personal information.
              </p>
              <p className="mb-3">
                <strong>B.</strong> We use encryption to protect sensitive data during transmission and storage.
              </p>
              <p className="mb-3">
                <strong>C.</strong> We regularly review and update our security practices.
              </p>
              <p className="mb-3">
                <strong>D.</strong> However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>5. Your Rights</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> You have the right to access, update, or delete your personal information.
              </p>
              <p className="mb-3">
                <strong>B.</strong> You can control your privacy settings through your account dashboard.
              </p>
              <p className="mb-3">
                <strong>C.</strong> You may opt out of certain communications from us.
              </p>
              <p className="mb-3">
                <strong>D.</strong> You can request a copy of your data or deletion of your account.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>6. Cookies and Tracking</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> We use cookies and similar technologies to enhance your experience on our platform.
              </p>
              <p className="mb-3">
                <strong>B.</strong> These technologies help us remember your preferences and provide personalized content.
              </p>
              <p className="mb-3">
                <strong>C.</strong> You can control cookie settings through your browser preferences.
              </p>
              <p className="mb-3">
                <strong>D.</strong> We do not use tracking technologies for advertising purposes without your consent.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>7. Data Retention</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> We retain your personal information for as long as your account is active or as needed to provide services.
              </p>
              <p className="mb-3">
                <strong>B.</strong> We may retain certain information for legal, regulatory, or business purposes.
              </p>
              <p className="mb-3">
                <strong>C.</strong> You can request deletion of your data, subject to certain legal obligations.
              </p>
              <p className="mb-3">
                <strong>D.</strong> Deleted information may remain in our backup systems for a limited time.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>8. International Transfers</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> Your information may be transferred to and processed in countries other than your own.
              </p>
              <p className="mb-3">
                <strong>B.</strong> We ensure appropriate safeguards are in place for international data transfers.
              </p>
              <p className="mb-3">
                <strong>C.</strong> We comply with applicable data protection laws and regulations.
              </p>
              <p className="mb-3">
                <strong>D.</strong> By using our platform, you consent to such transfers.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>9. Children's Privacy</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> Our platform is not intended for children under 18 years of age.
              </p>
              <p className="mb-3">
                <strong>B.</strong> We do not knowingly collect personal information from children under 18.
              </p>
              <p className="mb-3">
                <strong>C.</strong> If we become aware that we have collected information from a child under 18, we will take steps to delete it.
              </p>
              <p className="mb-3">
                <strong>D.</strong> Parents or guardians should contact us if they believe their child has provided personal information.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>10. Changes to This Policy</span>
              </h2>
              <p className="mb-3">
                <strong>A.</strong> We may update this privacy policy from time to time.
              </p>
              <p className="mb-3">
                <strong>B.</strong> We will notify you of any material changes through our platform or email.
              </p>
              <p className="mb-3">
                <strong>C.</strong> Your continued use of our platform after changes constitutes acceptance of the new policy.
              </p>
              <p className="mb-3">
                <strong>D.</strong> We encourage you to review this policy periodically.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">
                <span>11. Contact Us</span>
              </h2>
              <p className="mb-3">
                If you have any questions about this privacy policy or our data practices, please contact us at:
              </p>
              <p className="mb-3">
                Email: privacy@ottocollect.com
              </p>
              <p className="mb-3">
                Address: Petah-Tiqwa, Israel
              </p>
              <p className="mb-3">
                We will respond to your inquiry within a reasonable timeframe.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button onClick={() => setPrivacyOpen(false)} className="w-full sm:w-auto">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Confirmation Dialog */}
      <EmailConfirmationDialog
        isOpen={emailConfirmationOpen}
        onClose={() => setEmailConfirmationOpen(false)}
        email={registeredEmail}
        onBackToLogin={() => {
          setEmailConfirmationOpen(false);
          setActiveTab("login");
        }}
      />
    </div>
  );
};

export default AuthForm;
