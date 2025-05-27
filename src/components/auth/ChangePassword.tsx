
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";

const ChangePassword: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setSubmitting(true);

    // Step 1: Re-authenticate the user by logging in
    const userSession = await supabase.auth.getSession();
    const userEmail = userSession.data.session?.user.email;
    if (!userEmail) {
      toast.error("User session not found.");
      setSubmitting(false);
      return;
    }
    // Try to sign in again with the old password for security
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });
    if (loginError) {
      toast.error("Current password is incorrect.");
      setSubmitting(false);
      return;
    }

    // Step 2: Update password
    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
    if (pwError) {
      toast.error(pwError.message || "Password update failed.");
      setSubmitting(false);
      return;
    }
    toast.success("Password updated successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <Card className="ottoman-card shadow-lg mt-8">
        <div className="space-y-6 px-6 py-4">
          <div className="text-center">
            <h3 className="text-2xl font-serif font-semibold mb-2 text-gold-500">Change Password</h3>
            <p className="text-ottoman-200 text-sm">
              Enter your current password and choose a new one.
            </p>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="current-password" className="text-sm font-medium text-ottoman-200">
                Current Password
              </label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPassword ? "text" : "password"}
                  value={currentPassword}
                  required
                  className="ottoman-input pr-10"
                  onChange={e => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ottoman-400 hover:text-ottoman-300"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium text-ottoman-200">
                New Password
              </label>
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                required
                minLength={8}
                className="ottoman-input"
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-new-password" className="text-sm font-medium text-ottoman-200">
                Confirm New Password
              </label>
              <Input
                id="confirm-new-password"
                type={showPassword ? "text" : "password"}
                value={confirmNewPassword}
                required
                className={`ottoman-input ${
                  newPassword && confirmNewPassword && newPassword !== confirmNewPassword
                    ? "border-red-500"
                    : ""
                }`}
                onChange={e => setConfirmNewPassword(e.target.value)}
              />
              {newPassword &&
                confirmNewPassword &&
                newPassword !== confirmNewPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>
            <Button type="submit" className="ottoman-button w-full" disabled={submitting}>
              {submitting ? "Updating..." : "Change Password"}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default ChangePassword;
