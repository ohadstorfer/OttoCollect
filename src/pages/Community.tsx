import React from "react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogIn, MessageCircle, Users, BookOpen, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import SEOHead from "@/components/seo/SEOHead";
import { SEO_CONFIG } from "@/config/seoConfig";
import { useTranslation } from 'react-i18next';

export default function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(['pages']);

  const communityFeatures = [
    {
      title: t('community.features.messages.title'),
      description: t('community.features.messages.description'),
      icon: <MessageCircle className="h-8 w-8 text-ottoman-500" />,
      action: () => navigate('/messaging'),
      buttonText: t('community.features.messages.button')
    },
    {
      title: t('community.features.blog.title'),
      description: t('community.features.blog.description'),
      icon: <BookOpen className="h-8 w-8 text-ottoman-500" />,
      action: () => navigate('/blog'),
      buttonText: t('community.features.blog.button'),
      comingSoon: false
    },
    {
      title: t('community.features.forum.title'),
      description: t('community.features.forum.description'),
      icon: <Users className="h-8 w-8 text-ottoman-500" />,
      action: () => navigate('/forum'),
      buttonText: t('community.features.forum.button'),
      comingSoon: false
    },
    {
      title: t('community.features.badges.title'),
      description: t('community.features.badges.description'),
      icon: <Award className="h-8 w-8 text-ottoman-500" />,
      action: () => {},
      buttonText: t('community.features.badges.button'),
      comingSoon: false
    }
  ];

  if (!user) {
    return (
      <div className="page-container">
        <h1 className="page-title"><span>{t('community.title')}</span></h1>
        
        <div className="max-w-2xl mx-auto text-center">
          <div className="ottoman-card p-8 flex flex-col items-center">
            <h2 className="text-2xl font-serif mb-4"><span>{t('community.join.title')}</span></h2>
            <p className="mb-6 text-muted-foreground">
              {t('community.join.description')}
            </p>
            <Button onClick={() => navigate('/auth')}>
              <LogIn className="mr-2 h-4 w-4" />
              {t('community.join.signIn')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <SEOHead
        title={SEO_CONFIG.pages.community.title}
        description={SEO_CONFIG.pages.community.description}
        keywords={SEO_CONFIG.pages.community.keywords}
        type="website"
        canonical="https://ottocollect.com/community/"
      />
      <h1 className="page-title"><span>{t('community.title')}</span></h1>
      
      <div className="flex flex-col mb-10">
        <p className="text-muted-foreground mb-6">
          {t('community.description')}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {communityFeatures.map((feature) => (
            <Card key={feature.title} className="border shadow-md">
              <CardHeader className="flex flex-row items-center gap-4">
                {feature.icon}
                <div>
                  <CardTitle className="text-xl"><span>{feature.title}</span></CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{feature.description}</p>
                {feature.title === t('community.features.badges.title') ? (
                  <div className="text-sm text-muted-foreground italic">
                   
                  </div>
                ) : (
                  <Button 
                    onClick={feature.action} 
                    variant="default"
                  >
                    {feature.buttonText}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
