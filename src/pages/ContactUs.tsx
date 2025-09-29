import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Instagram, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { getSuperAdmins } from '@/services/adminService';
import { User } from '@/types';
import UserProfileLink from '@/components/common/UserProfileLink';
import { useTheme } from '@/context/ThemeContext';
import SEOHead from '@/components/seo/SEOHead';
import { SEO_CONFIG } from '@/config/seoConfig';
import { useTranslation } from 'react-i18next';

export default function ContactUs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [superAdmins, setSuperAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const { t } = useTranslation(['contactUs']);

 
  useEffect(() => {
    const fetchSuperAdmins = async () => {
      try {
        const admins = await getSuperAdmins();
        // Filter to only show specific admin users
        const specificAdminIds = [
          'e0ceafe0-0a02-42a9-a72f-6232af4b2579',
          '64681131-4747-4036-9c32-fe60a560bf78'
        ];
        const filteredAdmins = admins.filter(admin => specificAdminIds.includes(admin.id));
        setSuperAdmins(filteredAdmins);
      } catch (error) {
        console.error('Error fetching super admins:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuperAdmins();
  }, []);

  const handleMessageAdmin = (adminId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/messaging/${adminId}`);
  };

  return (
<div >
<SEOHead
                title={SEO_CONFIG.pages.contactUs.title}
                description={SEO_CONFIG.pages.contactUs.description}
                keywords={SEO_CONFIG.pages.contactUs.keywords}
                type="website"
                canonical="https://ottocollect.com/contact/"
            />
    <section className={`${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-600'} py-12 relative overflow-hidden mb-10`}>
        <div className="absolute inset-0 -z-10">
          <div className={`absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] ${theme === 'light'
              ? 'bg-ottoman-500/10 shadow-ottoman-300/20 ring-ottoman-400/10'
              : 'bg-dark-500/40 shadow-ottoman-900/20 ring-ottoman-900/10'
            } shadow-xl ring-1 ring-inset`} aria-hidden="true" />
        </div>

        <div className="container mx-auto px-4 relative z-10 flex items-center justify-center">
          
          <h1 className={`text-3xl md:text-4xl font-serif font-bold text-center ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} fade-bottom`}>
            <span>{t('pageTitle')}</span>
          </h1>
          
        </div>
        <p className={`mt-4 text-center ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl mx-auto fade-bottom`}>
          {t('pageDescription')}
          </p>
      </section>

    

      
      <div className="max-w-4xl mx-auto space-y-6">


        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email Section */}
          <Card className="ottoman-card">
            <CardHeader className="text-center">
              <Mail className="h-8 w-8 mx-auto mb-2 text-primary" />
              <CardTitle><span>{t('emailSection.title')}</span></CardTitle>
              <CardDescription>
                {t('emailSection.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center sm:mt-4">
              <a 
                href="mailto:info@ottocollect.com" 
                className="text-primary hover:underline font-medium"
              >
                info@ottocollect.com
              </a>
            </CardContent>
          </Card>

          {/* Social Media Section */}  
          <Card className="ottoman-card">
            <CardHeader className="text-center">
              <Instagram className="h-8 w-8 mx-auto mb-2 text-primary" />
              <CardTitle><span>{t('socialMediaSection.title')}</span></CardTitle>
              <CardDescription>
                {t('socialMediaSection.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                variant="outline"
                onClick={() => window.open('https://www.instagram.com/ottocollect?igsh=MXdnN2M2bTEwZjlwZg%3D%3D&utm_source=qr', '_blank')}
                className="w-full sm:mt-3"
              >
                <Instagram className="h-4 w-4 mr-2" />
                @ottocollect
              </Button>
            </CardContent>
          </Card>

          {/* Direct Messaging Section */}
          <Card className="ottoman-card">
            <CardHeader className="text-center">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
              <CardTitle><span>{t('directMessageSection.title')}</span></CardTitle>
              <CardDescription>
                {t('directMessageSection.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!user ? (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('auth.signInToMessage')}
                  </p>
                  <Button onClick={() => navigate('/auth')} className="w-full">
                    {t('auth.signIn')}
                  </Button>
                </div>
              ) : loading ? (
                <div className="text-center text-muted-foreground">
                  {t('status.loadingAdministrators')}
                </div>
              ) : superAdmins.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  {t('status.noAdministratorsAvailable')}
                </div>
              ) : (
                <div className="flex flex-wrap justify-center gap-2 mb-0">
  {superAdmins.map((admin) => (
    <Button
      key={admin.id}
      variant="ghost"
      className="flex flex-col items-center w-25 p-1 h-auto text-center"
      onClick={() => handleMessageAdmin(admin.id)}
    >
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden mb-0">
        {admin.avatarUrl ? (
          <img 
            src={admin.avatarUrl} 
            alt={admin.username} 
            className="w-full h-full object-cover"
          />
        ) : (
          <MessageCircle className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div>
        <p className="font-medium text-sm">{admin.username}</p>
      </div>
    </Button>
  ))}
</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <Card className="ottoman-card mt-8">
          <CardHeader>
            <CardTitle className="text-center"><span>{t('helpSection.title')}</span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2 text-sm text-muted-foreground">
              <p>
                • {t('helpSection.emailTip')}
              </p>
              <p>
                • {t('helpSection.instagramTip')}
              </p>
              <p>
                • {t('helpSection.adminMessageTip')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}