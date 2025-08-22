
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from 'react-i18next';

const ChangePassword: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation(['settings']);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error(t('changePassword.errors.fillAllFields'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error(t('changePassword.errors.passwordsDoNotMatch'));
      return;
    }
    setSubmitting(true);

    // Step 1: Re-authenticate the user by logging in
    const userSession = await supabase.auth.getSession();
    const userEmail = userSession.data.session?.user.email;
    if (!userEmail) {
      toast.error(t('changePassword.errors.sessionNotFound'));
      setSubmitting(false);
      return;
    }
    // Try to sign in again with the old password for security
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });
    if (loginError) {
      toast.error(t('changePassword.errors.incorrectCurrentPassword'));
      setSubmitting(false);
      return;
    }

    // Step 2: Update password
    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
    if (pwError) {
      toast.error(pwError.message || t('changePassword.errors.updateFailed'));
      setSubmitting(false);
      return;
    }
    toast.success(t('changePassword.success.passwordUpdated'));
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <Card className="ottoman-card shadow-lg ">
        <div className="space-y-6 px-6 py-4">
          <div className="text-center">
            <h3 className="text-2xl font-serif font-semibold mb-2 text-gold-500"><span>{t('changePassword.title')}</span></h3>
            <p className="text-ottoman-200 text-sm">
              {t('changePassword.description')}
            </p>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="current-password" className="text-sm font-medium text-ottoman-200">
                {t('changePassword.fields.currentPassword')}
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
                {t('changePassword.fields.newPassword')}
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
                {t('changePassword.fields.confirmNewPassword')}
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
                  <p className="text-xs text-red-500 mt-1">{t('changePassword.validation.passwordsDoNotMatch')}</p>
              )}
            </div>
            <Button type="submit" className="ottoman-button w-full" disabled={submitting}>
              {submitting ? t('changePassword.buttons.updating') : t('changePassword.buttons.changePassword')}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default ChangePassword;
