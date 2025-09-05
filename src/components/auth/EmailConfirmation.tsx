import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mail, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface EmailConfirmationProps {
  email: string;
  onBackToLogin: () => void;
}

export const EmailConfirmation: React.FC<EmailConfirmationProps> = ({
  email,
  onBackToLogin,
}) => {
  const { t } = useTranslation(['auth']);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleResendConfirmation = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        toast.error(
          error.message.includes('rate limit') 
            ? t('confirmation.rateLimitError')
            : t('confirmation.resendError')
        );
      } else {
        toast.success(t('confirmation.resendSuccess'));
        // Start cooldown
        setResendCooldown(60);
        const countdown = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(countdown);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error: any) {
      toast.error(t('confirmation.resendError'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <Card className="ottoman-card shadow-lg p-6">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-gold-600" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-serif font-semibold text-gold-500 mb-2">
              {t('confirmation.title')}
            </h2>
            <p className="text-ottoman-200 text-sm">
              {t('confirmation.subtitle')}
            </p>
          </div>

          {/* Email address */}
          <div className="bg-ottoman-50 border border-ottoman-200 rounded-lg p-4">
            <p className="text-sm text-ottoman-300 mb-1">
              {t('confirmation.emailSentTo')}
            </p>
            <p className="font-medium text-ottoman-600 break-all">{email}</p>
          </div>

          {/* Instructions */}
          <div className="text-left space-y-3">
            <h3 className="font-medium text-ottoman-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              {t('confirmation.nextSteps')}
            </h3>
            <ol className="text-sm text-ottoman-300 space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-gold-600 mt-0.5">1.</span>
                <span>{t('confirmation.step1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-gold-600 mt-0.5">2.</span>
                <span>{t('confirmation.step2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-gold-600 mt-0.5">3.</span>
                <span>{t('confirmation.step3')}</span>
              </li>
            </ol>
          </div>

          {/* Troubleshooting */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h4 className="font-medium text-blue-800 mb-2">
              {t('confirmation.troubleshootingTitle')}
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• {t('confirmation.checkSpam')}</li>
              <li>• {t('confirmation.checkPromoTab')}</li>
              <li>• {t('confirmation.waitTime')}</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleResendConfirmation}
              disabled={isResending || resendCooldown > 0}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t('confirmation.resending')}
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('confirmation.resendCooldown', { seconds: resendCooldown })}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('confirmation.resendButton')}
                </>
              )}
            </Button>

            <Button
              onClick={onBackToLogin}
              variant="ghost"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('confirmation.backToLogin')}
            </Button>
          </div>

          {/* Support info */}
          <div className="text-xs text-ottoman-400 border-t border-ottoman-200 pt-4">
            <p>
              {t('confirmation.needHelp')}{' '}
              <a 
                href="mailto:support@ottocollect.com" 
                className="text-gold-600 hover:text-gold-700 underline"
              >
                support@ottocollect.com
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};