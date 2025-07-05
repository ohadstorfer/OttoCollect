import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Find access_token from query params (should be set by Supabase recovery link)
  // The Supabase client will handle the session if user lands here with a valid token in the URL

  const [tokenChecked, setTokenChecked] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    // Check for token in both query params and hash
    const accessToken = searchParams.get("access_token") || new URLSearchParams(window.location.hash.substring(1)).get("access_token");
    const type = searchParams.get("type") || new URLSearchParams(window.location.hash.substring(1)).get("type");
    
    if (accessToken && type === "recovery") {
      setTokenValid(true);
      // If token is in hash, update URL to use query params instead
      if (window.location.hash && !searchParams.get("access_token")) {
        const newUrl = window.location.pathname + "?" + window.location.hash.substring(1);
        window.history.replaceState({}, "", newUrl);
      }
    }
    setTokenChecked(true);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "Missing password",
        description: "Please enter and confirm your new password.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password Mismatch",
        description: "Passwords do not match.",
      });
      return;
    }
    setSubmitting(true);

    // Supabase client will use the session established via the recovery token (from in the URL)
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: error.message || "Could not reset password. The link may be invalid or expired.",
      });
      return;
    }

    toast({
      title: "Password Reset",
      description: "Your password was updated. Please log in with your new password.",
    });
    setTimeout(() => {
      navigate("/auth");
    }, 1200);
  };

  // Show loading until the token check is done
  if (!tokenChecked) {
    return (
      <div className="flex items-center min-h-screen justify-center">
        <span className="text-lg text-ottoman-400">Checking reset link...</span>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="flex items-center min-h-screen justify-center">
        <Card className="ottoman-card shadow-lg p-8">
          <h3 className="text-2xl font-serif font-semibold mb-2 text-gold-500"><span>Invalid or expired link</span></h3>
          <p className="text-ottoman-200 text-sm mb-2">The password reset link is invalid or has expired.</p>
          <Button onClick={() => navigate("/auth")}>Back to Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in min-h-screen flex items-center justify-center">
      <Card className="ottoman-card shadow-lg w-full">
        <div className="space-y-6 px-6 py-6">
          <div className="text-center">
            <h3 className="text-2xl font-serif font-semibold mb-2 text-gold-500"><span>Set New Password</span></h3>
            <p className="text-ottoman-200 text-sm">Enter your new password below.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium text-ottoman-200">
                New Password
              </label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                autoComplete="new-password"
                required
                className="ottoman-input"
                minLength={8}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium text-ottoman-200">
                Confirm New Password
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                autoComplete="new-password"
                required
                className={`ottoman-input ${
                  !!newPassword && !!confirmPassword && newPassword !== confirmPassword ? "border-red-500" : ""
                }`}
                minLength={8}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              {!!newPassword &&
                !!confirmPassword &&
                newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
            </div>
            <Button className="ottoman-button w-full" type="submit" disabled={submitting}>
              {submitting ? "Updating..." : "Set New Password"}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default ResetPassword;
