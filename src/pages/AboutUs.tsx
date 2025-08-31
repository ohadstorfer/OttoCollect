import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { getUserProfile } from '@/services/profileService';
import {
    Users,
    BookOpen,
    Globe,
    History,
    Award,
    ArrowRight,
    ExternalLink,
    Database,
    DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import SEOHead from '@/components/seo/SEOHead';
import { SEO_CONFIG } from '@/config/seoConfig';
import { useLanguage } from '@/context/LanguageContext';
import { profileTranslationService } from '@/services/profileTranslationService';

// Custom hook for managing localized about content
const useLocalizedAbout = (userId: string, currentLanguage: string) => {
    const [localizedAbout, setLocalizedAbout] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!userId || currentLanguage === 'en') {
            return;
        }

        const fetchLocalizedAbout = async () => {
            setIsLoading(true);
            try {
                const result = await profileTranslationService.getLocalizedAbout(
                    userId,
                    currentLanguage as 'ar' | 'tr'
                );
                
                if (result.success && result.translatedContent) {
                    setLocalizedAbout(result.translatedContent);
                }
            } catch (error) {
                console.error('Error fetching localized about:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLocalizedAbout();
    }, [userId, currentLanguage]);

    return { localizedAbout, isLoading };
};

const AboutUs: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { theme } = useTheme();
    const { t } = useTranslation(['pages']);
    const { direction, currentLanguage } = useLanguage();
    const skewedBgColor = theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-700';


    // Founder user IDs
    const founderIds = [
        'e0ceafe0-0a02-42a9-a72f-6232af4b2579', // Assaf
        '64681131-4747-4036-9c32-fe60a560bf78' // Dror
    ];

         // Fetch founder profiles
     const { data: founders, isLoading: foundersLoading } = useQuery({
         queryKey: ['founders', founderIds, currentLanguage],
         queryFn: async () => {
             const profiles = await Promise.all(
                 founderIds.map(id => getUserProfile(id, currentLanguage))
             );
             return profiles.filter(Boolean);
         },
         enabled: founderIds.length > 0,
     });

         const handleFounderClick = (username: string) => {
         navigate(`/profile/${username}`);
     };

     // Use the localized about hook for each founder
     const assafLocalizedAbout = useLocalizedAbout(
         founders?.[0]?.id || '',
         currentLanguage
     );
     
     const drorLocalizedAbout = useLocalizedAbout(
         founders?.[1]?.id || '',
         currentLanguage
     );

    return (
        <div className="min-h-screen bg-gradient-to-br from-ottoman-50 to-ottoman-100 dark:from-dark-900 dark:to-dark-800 -mb-20">
            <SEOHead
                title={SEO_CONFIG.pages.aboutUs.title}
                description={SEO_CONFIG.pages.aboutUs.description}
                keywords={SEO_CONFIG.pages.aboutUs.keywords}
            />
            <div className="container mx-auto px-4 py-8 max-w-6xl">

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-ottoman-900 dark:text-ottoman-100 mb-4">
                        <span>{t('aboutUs.title')} </span>
                    </h1>
                    <div className="w-24 h-1 bg-ottoman-600 mx-auto rounded-full"></div>
                </div>

                {/* About the Project Section */}
                <section className="mb-16">
                    <Card className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border-ottoman-200 dark:border-ottoman-800">
                        <CardContent className="p-8">
                            <h2 className="text-3xl font-serif font-bold text-ottoman-900 dark:text-ottoman-100 mb-6 flex items-center gap-3">
                                <BookOpen className="h-8 w-8 text-ottoman-600" />
                                <span>{t('aboutUs.aboutProject.title')}</span>
                            </h2>

                            <div className="space-y-6 text-lg leading-relaxed text-ottoman-800 dark:text-ottoman-200 ${direction === 'rtl' ? 'text-right' : 'text-left'}">
                                <p className={direction === 'rtl' ? 'text-right' : 'text-left'}>
                                    {t('aboutUs.aboutProject.description1')}
                                </p>

                                <p className={direction === 'rtl' ? 'text-right' : 'text-left'}>
                                    {t('aboutUs.aboutProject.description2')}
                                </p>

                                <p className={direction === 'rtl' ? 'text-right' : 'text-left'}>
                                    {t('aboutUs.aboutProject.description3')}
                                </p>

                                <p className={direction === 'rtl' ? 'text-right' : 'text-left'}>
                                    {t('aboutUs.aboutProject.description4')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Founders Section */}
                <section className="mb-16">
                    <Card className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border-ottoman-200 dark:border-ottoman-800">
                        <CardContent className="p-8">
                            <h2 className="text-3xl font-serif font-bold text-ottoman-900 dark:text-ottoman-100 mb-8 flex items-center gap-3">
                                <Users className="h-8 w-8 text-ottoman-600" />
                                <span>{t('aboutUs.founders.title')}</span>
                            </h2>


                            {foundersLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Assaf Unger */}
                                    <Card
                                        className="bg-gradient-to-br from-ottoman-50 to-ottoman-100 dark:from-dark-700 dark:to-dark-600 border-ottoman-300 dark:border-ottoman-700 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                                        onClick={() => handleFounderClick(founders?.[0]?.username || '')}
                                    >
                                        <CardContent className="p-6 text-center">
                                            <div className="mb-4">
                                                {founders?.[0]?.avatarUrl ? (
                                                    <img
                                                        src={founders[0].avatarUrl}
                                                        alt="Assaf Unger"
                                                        className="w-24 h-24 rounded-full mx-auto border-4 border-ottoman-300 dark:border-ottoman-600 object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-24 h-24 rounded-full mx-auto border-4 border-ottoman-300 dark:border-ottoman-600 bg-ottoman-200 dark:bg-ottoman-800 flex items-center justify-center">
                                                        <span className="text-2xl font-bold text-ottoman-600 dark:text-ottoman-400">
                                                            A
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="text-xl font-bold text-ottoman-900 dark:text-ottoman-100 mb-2">
                                                <span>{ t('aboutUs.founders.assaf.name')}</span>
                                            </h3>

                                            {founders?.[0]?.rank && (
                                                <Badge variant="user" rank={founders[0].rank} className="mb-3" />
                                            )}

                                                                                         <p className="text-ottoman-700 dark:text-ottoman-300 mb-4 leading-relaxed">
                                                 {assafLocalizedAbout.isLoading ? (
                                                     <span className="text-muted-foreground">Loading...</span>
                                                 ) : currentLanguage === 'en' ? (
                                                     founders?.[0]?.about || t('aboutUs.founders.assaf.description')
                                                 ) : (
                                                     assafLocalizedAbout.localizedAbout || founders?.[0]?.about || t('aboutUs.founders.assaf.description')
                                                 )}
                                             </p>

                                            <Button
                                                variant="outline"
                                                className="group-hover:bg-ottoman-600 group-hover:text-white transition-colors duration-300"
                                            >
                                                <BookOpen className="h-4 w-4 mr-2" />
                                                {t('aboutUs.founders.viewCollection')}
                                                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    {/* Dror Korcharz */}
                                    <Card
                                        className="bg-gradient-to-br from-ottoman-50 to-ottoman-100 dark:from-dark-700 dark:to-dark-600 border-ottoman-300 dark:border-ottoman-700 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                                        onClick={() => handleFounderClick(founders?.[1]?.username || '')}
                                    >
                                        <CardContent className="p-6 text-center">
                                            <div className="mb-4">
                                                {founders?.[1]?.avatarUrl ? (
                                                    <img
                                                        src={founders[1].avatarUrl}
                                                        alt="Dror Korcharz"
                                                        className="w-24 h-24 rounded-full mx-auto border-4 border-ottoman-300 dark:border-ottoman-600 object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-24 h-24 rounded-full mx-auto border-4 border-ottoman-300 dark:border-ottoman-600 bg-ottoman-200 dark:bg-ottoman-800 flex items-center justify-center">
                                                        <span className="text-2xl font-bold text-ottoman-600 dark:text-ottoman-400">
                                                            D
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="text-xl font-bold text-ottoman-900 dark:text-ottoman-100 mb-2">
                                                <span>{ t('aboutUs.founders.dror.name')}</span>
                                            </h3>

                                            {founders?.[1]?.rank && (
                                                <Badge variant="user" rank={founders[1].rank} className="mb-3" />
                                            )}

                                                                                         <div className="text-ottoman-700 dark:text-ottoman-300 mb-4 leading-relaxed space-y-3">
                                                 <p>
                                                     {drorLocalizedAbout.isLoading ? (
                                                         <span className="text-muted-foreground">Loading...</span>
                                                     ) : currentLanguage === 'en' ? (
                                                         founders?.[1]?.about || (
                                                             <>
                                                                 {t('aboutUs.founders.dror.description1')}
                                                                 <br />
                                                                 {t('aboutUs.founders.dror.description2')}
                                                             </>
                                                         )
                                                     ) : (
                                                         drorLocalizedAbout.localizedAbout || founders?.[1]?.about || (
                                                             <>
                                                                 {t('aboutUs.founders.dror.description1')}
                                                                 <br />
                                                                 {t('aboutUs.founders.dror.description2')}
                                                             </>
                                                         )
                                                     )}
                                                 </p>
                                             </div>

                                            <Button
                                                variant="outline"
                                                className="group-hover:bg-ottoman-600 group-hover:text-white transition-colors duration-300"
                                            >
                                                <BookOpen className="h-4 w-4 mr-2" />
                                                {t('aboutUs.founders.viewCollection')}
                                                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>

                {/* Platform Features Section */}
                <section className="mb-16">
                    <Card className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border-ottoman-200 dark:border-ottoman-800">
                        <CardContent className="p-8">
                            <div className="text-center max-w-3xl mx-auto mb-16">
                                <h2 className="text-3xl md:text-4xl font-serif font-bold text-ottoman-900 dark:text-ottoman-100 mb-4">
                                    <span>{t('aboutUs.platformFeatures.title')}</span>
                                </h2>
                                <p className="text-lg text-ottoman-700 dark:text-ottoman-200">
                                    {t('aboutUs.platformFeatures.subtitle')}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {/* Catalogues */}
                                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-ottoman-50 to-ottoman-100 dark:from-dark-700 dark:to-dark-600 border border-ottoman-200 dark:border-ottoman-700" onClick={() => navigate('/catalog')}>
                                    <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                                        <Database className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-serif font-semibold mb-2 text-ottoman-800 dark:text-ottoman-200">
                                        <span>{t('aboutUs.platformFeatures.catalogues.title')}</span>
                                    </h3>
                                    <p className="text-ottoman-600 dark:text-ottoman-300">
                                        {t('aboutUs.platformFeatures.catalogues.description')}
                                    </p>
                                </div>

                                {/* Collection Tools */}
                                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-ottoman-50 to-ottoman-100 dark:from-dark-700 dark:to-dark-600 border border-ottoman-200 dark:border-ottoman-700" onClick={() => navigate('/collection')}>

                                    <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                                        <BookOpen className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-serif font-semibold mb-2 text-ottoman-800 dark:text-ottoman-200">
                                        <span>{t('aboutUs.platformFeatures.collectionTools.title')}</span>
                                    </h3>
                                    <p className="text-ottoman-600 dark:text-ottoman-300">
                                        {t('aboutUs.platformFeatures.collectionTools.description')}
                                    </p>
                                </div>

                                {/* Marketplace */}
                                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-ottoman-50 to-ottoman-100 dark:from-dark-700 dark:to-dark-600 border border-ottoman-200 dark:border-ottoman-700" onClick={() => navigate('/marketplace')}>

                                    <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                                        <DollarSign className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-serif font-semibold mb-2 text-ottoman-800 dark:text-ottoman-200">
                                        <span>{t('aboutUs.platformFeatures.marketplace.title')}</span>
                                    </h3>
                                    <p className="text-ottoman-600 dark:text-ottoman-300">
                                        {t('aboutUs.platformFeatures.marketplace.description')}
                                    </p>
                                </div>

                                {/* Community */}
                                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-ottoman-50 to-ottoman-100 dark:from-dark-700 dark:to-dark-600 border border-ottoman-200 dark:border-ottoman-700" onClick={() => navigate('/community')}>

                                    <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                                        <Users className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-serif font-semibold mb-2 text-ottoman-800 dark:text-ottoman-200">
                                        <span>{t('aboutUs.platformFeatures.communityFeature.title')}</span>
                                    </h3>
                                    <p className="text-ottoman-600 dark:text-ottoman-300">
                                        {t('aboutUs.platformFeatures.communityFeature.description')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Call to Action */}
                <section className="text-center">
                    <Card className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border-ottoman-200 dark:border-ottoman-800">
                        <CardContent className="p-8">
                            <h2 className="text-3xl font-serif font-bold mb-4 text-ottoman-800 dark:text-white">
                                <span>{t('aboutUs.callToAction.title')}</span>
                            </h2>
                            <p className="mb-6 text-lg text-ottoman-700 dark:text-ottoman-100">
                                {t('aboutUs.callToAction.description')}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    size="lg"
                                    variant="secondary"
                                    onClick={() => navigate('/catalog')}
                                    className="bg-white text-ottoman-600 hover:bg-ottoman-50"
                                >
                                    <BookOpen className="h-5 w-5 mr-2" />
                                    {t('aboutUs.callToAction.exploreCatalogues')}
                                </Button>
                                {!user && (
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={() => navigate('/auth')}
                                        className="border-white text-white hover:bg-white hover:text-ottoman-600"
                                    >
                                        <Users className="h-5 w-5 mr-2" />
                                        {t('aboutUs.callToAction.joinCommunity')}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </section>

            </div>
        </div>
    );
};

export default AboutUs; 