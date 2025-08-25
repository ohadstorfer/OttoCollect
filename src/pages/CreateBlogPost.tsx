import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreatePostForm } from "@/components/blog/CreatePostForm";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useLanguage } from "@/context/LanguageContext";

export default function CreateBlogPost() {
  const { t } = useTranslation(['blog']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { direction } = useLanguage();
  // Redirect if user is not logged in
  if (!user) {
    return (
      <div className="container py-8">
        <div className="ottoman-card p-12 text-center max-w-2xl mx-auto">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-ottoman-100 dark:bg-ottoman-800 rounded-full flex items-center justify-center">
            <svg 
              className="w-10 h-10 text-ottoman-600 dark:text-ottoman-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </div>
          
          {/* Title */}
          <h2 className="text-3xl font-serif mb-4 text-foreground">
            {t('auth.authenticationRequired')}
          </h2>
          
          {/* Description */}
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            {t('auth.mustBeSignedIn')}
          </p>
          
          {/* Additional info */}
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-md mx-auto">
            {t('auth.joinCommunity')}
          </p>
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/auth')}
              size="lg"
              className="px-8"
            >
              {t('auth.signIn')}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/blog')}
              size="lg"
              className="px-8"
            >
              {t('post.backToBlog')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Button 
  variant="ghost" 
  onClick={() => navigate('/blog')}
  className={`mb-6 flex items-center ${direction === 'rtl' ? 'justify-end' : 'justify-start'}`}
>
  {direction === 'rtl' ? (
    <ArrowRight className="mr-2 h-4 w-4" />
  ) : (
    <ArrowLeft className="ml-2 h-4 w-4" />
  )}    
  {t('post.backToBlog')}
</Button>

      <CreatePostForm />
    </div>
  );
}