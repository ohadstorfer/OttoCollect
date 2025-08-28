import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

const registerSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const resetSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type ResetValues = z.infer<typeof resetSchema>;

interface AuthFormProps {
  mode?: 'login' | 'register' | 'reset';
}

const AuthForm = ({ mode = 'login' }: AuthFormProps) => {
  const { t } = useTranslation();
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmitLogin = async (values: LoginValues) => {
    setIsLoading(true);
    try {
      await signIn(values.email, values.password);
      toast({
        title: t('auth:login.success'),
        description: t('auth:login.redirecting'),
      });
      navigate('/');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('auth:login.error'),
        description: error.message || t('auth:login.errorDescription'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitRegister = async (values: RegisterValues) => {
    setIsLoading(true);
    try {
      await signUp(values.email, values.password, values.username);
      toast({
        title: t('auth:register.success'),
        description: t('auth:register.checkEmail'),
      });
      navigate('/login');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('auth:register.error'),
        description: error.message || t('auth:register.errorDescription'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitReset = async (values: ResetValues) => {
    setIsLoading(true);
    try {
      await resetPassword(values.email);
      toast({
        title: t('auth:reset.success'),
        description: t('auth:reset.checkEmail'),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('auth:reset.error'),
        description: error.message || t('auth:reset.errorDescription'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">{t(`auth:${mode}.title`)}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {mode === 'login' && (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onSubmitLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth:email')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('auth:emailPlaceholder')} type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth:password')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder={t('auth:passwordPlaceholder')}
                          type={showPassword ? "text" : "password"}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          <span className="sr-only">Show password</span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button disabled={isLoading}>{t('auth:login.submit')}</Button>
            </form>
          </Form>
        )}

        {mode === 'register' && (
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onSubmitRegister)} className="space-y-4">
              <FormField
                control={registerForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth:username')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('auth:usernamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth:email')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('auth:emailPlaceholder')} type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth:password')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder={t('auth:passwordPlaceholder')}
                          type={showPassword ? "text" : "password"}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          <span className="sr-only">Show password</span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth:confirmPassword')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder={t('auth:confirmPasswordPlaceholder')}
                          type={showPassword ? "text" : "password"}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          <span className="sr-only">Show password</span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button disabled={isLoading}>{t('auth:register.submit')}</Button>
            </form>
          </Form>
        )}

        {mode === 'reset' && (
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(onSubmitReset)} className="space-y-4">
              <FormField
                control={resetForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth:email')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('auth:emailPlaceholder')} type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button disabled={isLoading}>{t('auth:reset.submit')}</Button>
            </form>
          </Form>
        )}

        <div className="flex items-center justify-center">
          {mode === 'login' && (
            <p className="text-sm text-muted-foreground">
              {t('auth:noAccount')}{" "}
              <Link to="/register" className="text-primary hover:underline">
                {t('auth:registerLink')}
              </Link>
            </p>
          )}

          {mode === 'register' && (
            <p className="text-sm text-muted-foreground">
              {t('auth:alreadyAccount')}{" "}
              <Link to="/login" className="text-primary hover:underline">
                {t('auth:loginLink')}
              </Link>
            </p>
          )}

          {mode === 'login' && (
            <p className="text-sm text-muted-foreground">
              <Link to="/reset" className="text-primary hover:underline">
                {t('auth:forgotPassword')}
              </Link>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthForm;
