import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { PenSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import SEOHead from '@/components/seo/SEOHead';
import { SEO_CONFIG } from '@/config/seoConfig';
import { fetchQaCategoriesWithTranslations, fetchQaEntriesWithTranslations } from '@/services/qaService';
import {
  groupEntriesByCategory, getLocalizedEntry, getLocalizedCategoryName,
  type QaCategoryGroup,
} from '@/types/qa';

const Guide = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { currentLanguage, direction } = useLanguage();
  const { t } = useTranslation(['qa']);

  const [groups, setGroups] = useState<QaCategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user ? user.role === 'Super Admin' || !!user.role?.includes('Admin') : false;
  const tf = useMemo(
    () => (key: string, fallback: string) => {
      const v = t(key);
      return v === key ? fallback : v;
    },
    [t]
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchQaCategoriesWithTranslations(currentLanguage),
      fetchQaEntriesWithTranslations(currentLanguage),
    ])
      .then(([cats, entries]) => setGroups(groupEntriesByCategory(cats, entries)))
      .finally(() => setLoading(false));
  }, [currentLanguage]);

  return (
    <div>
      <SEOHead
        title={SEO_CONFIG.pages.guide.title}
        description={SEO_CONFIG.pages.guide.description}
        keywords={SEO_CONFIG.pages.guide.keywords}
        type="website"
        canonical="https://ottocollect.com/guide/"
      />

      <section className={`${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-600'} py-12 mb-10`}>
        <div className="container mx-auto px-4 text-center">
          <h1 className={`text-3xl md:text-4xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'}`}>
            <span>{tf('title', 'Frequently Asked Questions')}</span>
          </h1>
          <p className={`mt-4 ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl mx-auto`}>
            {tf('subtitle', 'Find answers to common questions about OttoCollect')}
          </p>
        </div>
      </section>

      <div className="page-container">
        <div className="max-w-3xl mx-auto px-4">
          {isAdmin && (
            <div className="flex justify-end mb-6">
              <Button variant="outline" size="sm" onClick={() => navigate('/create-guide-post')}>
                <PenSquare className="h-4 w-4 mr-2" />
                {tf('actions.create', 'New question')}
              </Button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-10">{tf('status.loading', 'Loading...')}</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-10">{tf('status.empty', 'No questions yet.')}</div>
          ) : (
            groups.map((group) => (
              <div key={group.category.id} className="mb-10">
                <h2 className="text-xl font-bold mb-4 text-foreground">
                  <span>{getLocalizedCategoryName(group.category, currentLanguage)}</span>
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {group.entries.map((entry) => {
                    const localized = getLocalizedEntry(entry, currentLanguage);
                    return (
                      <AccordionItem key={entry.id} value={entry.id}>
                        <AccordionTrigger className={direction === 'rtl' ? 'text-right' : 'text-left'}>
                          <span>{localized.headline}</span>
                        </AccordionTrigger>
                        <AccordionContent
                          dir={direction === 'rtl' ? 'rtl' : 'ltr'}
                          className={direction === 'rtl' ? 'text-right' : 'text-left'}
                        >
                          <p className="text-muted-foreground mb-3 leading-relaxed">
                            {localized.shortDescription}
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate(`/guide-post/${entry.id}`)}
                            className="text-primary hover:underline text-sm font-medium"
                          >
                            {direction === 'rtl' ? `« ${tf('learnMore', 'Learn more')}` : `${tf('learnMore', 'Learn more')} »`}
                          </button>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Guide;
