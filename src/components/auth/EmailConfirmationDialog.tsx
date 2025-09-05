import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, CheckCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface EmailConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onBackToLogin: () => void;
}

export const EmailConfirmationDialog: React.FC<EmailConfirmationDialogProps> = ({
  isOpen,
  onClose,
  email,
  onBackToLogin
}) => {
  const { t } = useTranslation(['pages']);
  const { resendConfirmationEmail } = useAuth();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [lastResendTime, setLastResendTime] = useState<Date | null>(null);

  const handleResendEmail = async () => {
    if (resendCount >= 3) {
      toast({
        variant: "destructive",
        title: t('auth.emailConfirmation.resendLimit.title'),
        description: t('auth.emailConfirmation.resendLimit.description'),
      });
      return;
    }

    // Check if enough time has passed since last resend (30 seconds)
    if (lastResendTime && Date.now() - lastResendTime.getTime() < 30000) {
      toast({
        variant: "destructive",
        title: t('auth.emailConfirmation.resendTooSoon.title'),
        description: t('auth.emailConfirmation.resendTooSoon.description'),
      });
      return;
    }

    setIsResending(true);
    try {
      const result = await resendConfirmationEmail(email);
      if (result.success) {
        setResendCount(prev => prev + 1);
        setLastResendTime(new Date());
        toast({
          title: t('auth.emailConfirmation.resendSuccess.title'),
          description: t('auth.emailConfirmation.resendSuccess.description'),
        });
      } else {
        toast({
          variant: "destructive",
          title: t('auth.emailConfirmation.resendError.title'),
          description: result.error || t('auth.emailConfirmation.resendError.description'),
        });
      }
    } catch (error) {
      console.error('Error resending confirmation email:', error);
      toast({
        variant: "destructive",
        title: t('auth.emailConfirmation.resendError.title'),
        description: t('auth.emailConfirmation.resendError.description'),
      });
    } finally {
      setIsResending(false);
    }
  };

  const getResendButtonText = () => {
    if (isResending) {
      return t('auth.emailConfirmation.resending');
    }
    if (resendCount === 0) {
      return t('auth.emailConfirmation.resendButton');
    }
    return t('auth.emailConfirmation.resendAgain', { count: resendCount });
  };

  const getResendButtonVariant = () => {
    if (resendCount >= 3) {
      return "secondary" as const;
    }
    return "outline" as const;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            <span>
            {t('auth.emailConfirmation.title')}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Email Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <Mail className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              
            </div>
          </div>

          {/* Main Message */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-lg font-medium">
                  {t('auth.emailConfirmation.message')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('auth.emailConfirmation.emailSent', { email })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('auth.emailConfirmation.checkSpam')}
                </p>
              </div>
            </CardContent>
          </Card>

         
          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleResendEmail}
              variant={getResendButtonVariant()}
              disabled={isResending || resendCount >= 3}
              className="w-full"
            >
              {isResending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              {getResendButtonText()}
            </Button>

            <Button
              onClick={onBackToLogin}
              variant="ghost"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('auth.emailConfirmation.backToLogin')}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {t('auth.emailConfirmation.helpText')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
