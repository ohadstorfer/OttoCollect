import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreateAnnouncementForm } from "@/components/forum/CreateAnnouncementForm";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from 'react-i18next';

export default function CreateForumAnnouncement() {
  const { t } = useTranslation(['forum']);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if user is not logged in or not an admin
  if (!user) {
    return (
      <div className="container py-8">
        <div className="ottoman-card p-8 text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-serif mb-4"><span>{t('auth.authenticationRequired')}</span></h2>
          <p className="mb-6 text-muted-foreground">
            {t('auth.mustBeSignedIn')}
          </p>
          <Button onClick={() => navigate('/auth')}>{t('auth.signIn')}</Button>
        </div>
      </div>
    );
  }

  // Check if user is Super Admin
  const isSuperAdmin = user.role === 'Super Admin';
  if (!isSuperAdmin) {
    return (
      <div className="container py-8">
        <div className="ottoman-card p-8 text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-serif mb-4"><span>{t('auth.accessDenied')}</span></h2>
          <p className="mb-6 text-muted-foreground">
            {t('auth.onlySuperAdmins')}
          </p>
          <Button onClick={() => navigate('/community/forum')}>{t('navigation.backToForum')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/community/forum')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('navigation.backToForum')}
      </Button>

      <div className="mb-6">
      <h1 className="text-3xl font-serif"> <span> {t('forms.createNewAnnouncement')} </span> </h1>
        <p className="text-muted-foreground mt-2">
          {t('forms.announcementDescription')}
        </p>
      </div>

      <CreateAnnouncementForm />
    </div>
  );
}