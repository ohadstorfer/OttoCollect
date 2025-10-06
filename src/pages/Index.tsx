import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { MOCK_BANKNOTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, Database, BookOpen, Users, DollarSign, ArrowLeft, ArrowRight } from "lucide-react";
import OptimizedImage from "@/components/ui/OptimizedImage";
import LatestForumPosts from "@/components/home/LatestForumPosts";
import MarketplaceHighlights from "@/components/home/MarketplaceHighlights";
import { fetchForumPosts } from "@/services/forumService";
import { fetchNewestMarketplaceItems } from "@/services/marketplaceService";
import { ForumPost } from '@/types/forum';
import { MarketplaceItem } from '@/types';
import { useTheme } from "@/context/ThemeContext";
import { fetchCountries } from "@/services/countryService";
import { CountryData } from "@/types/filter";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog";
import SEOHead from "@/components/seo/SEOHead";
import Canonical from "@/components/seo/Canonical";
import { SEO_CONFIG } from "@/config/seoConfig";
import { useTranslation } from 'react-i18next';
import { useLanguage } from "@/context/LanguageContext";

const Index = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { direction } = useLanguage();
  const { toast } = useToast();
  const { t } = useTranslation(['pages', 'navigation']);
  

  
  // Remove unnecessary translation reloading - handled by i18next automatically
  
  // Fallback function for translations
  const tWithFallback = (key: string, fallback: string) => {
    const translation = t(key);
    return translation === key ? fallback : translation;
  };

  // Simple test for basic translations
  const testTranslation = t('home.hero.title');
  
  // If basic translations aren't working, use hardcoded fallbacks
  const getTranslationOrFallback = (key: string, fallback: string) => {
    const translation = t(key);
    if (translation === key || translation === '') {
      console.warn(`Translation missing for key: ${key}, using fallback: ${fallback}`);
      return fallback;
    }
    return translation;
  };

  // Country name translation mappings with fallbacks
  const getCountryTranslation = (englishName: string) => {
    const countryMap: { [key: string]: string } = {
      'Turkey': tWithFallback('home.countries.middleEastCountries.turkey', 'Turkey'),
      'Egypt': tWithFallback('home.countries.middleEastCountries.egypt', 'Egypt'),
      'Iraq': tWithFallback('home.countries.middleEastCountries.iraq', 'Iraq'),
      'Israel': tWithFallback('home.countries.middleEastCountries.israel', 'Israel'),
      'Jordan': tWithFallback('home.countries.middleEastCountries.jordan', 'Jordan'),
      'Libya': tWithFallback('home.countries.middleEastCountries.libya', 'Libya'),
      'Kuwait': tWithFallback('home.countries.middleEastCountries.kuwait', 'Kuwait'),
      'Lebanon': tWithFallback('home.countries.middleEastCountries.lebanon', 'Lebanon'),
      'Palestine': tWithFallback('home.countries.middleEastCountries.palestine', 'Palestine'),
      'Saudi Arabia': tWithFallback('home.countries.middleEastCountries.saudiArabia', 'Saudi Arabia'),
      'Syria': tWithFallback('home.countries.middleEastCountries.syria', 'Syria'),
      'Albania': tWithFallback('home.countries.balkanCountries.albania', 'Albania'),
      'Bosnia & Herzegovina': tWithFallback('home.countries.balkanCountries.bosniaHerzegovina', 'Bosnia & Herzegovina'),
      'Bulgaria': tWithFallback('home.countries.balkanCountries.bulgaria', 'Bulgaria'),
      'Kosovo': tWithFallback('home.countries.balkanCountries.kosovo', 'Kosovo'),
      'Macedonia': tWithFallback('home.countries.balkanCountries.macedonia', 'Macedonia'),
      'Montenegro': tWithFallback('home.countries.balkanCountries.montenegro', 'Montenegro'),
      'Serbia': tWithFallback('home.countries.balkanCountries.serbia', 'Serbia')
    };
    return countryMap[englishName] || englishName;
  };

  // Manual reload function for debugging
  const reloadTranslations = async () => {
    try {
      await i18n.reloadResources();
      console.log('Translations manually reloaded');
      // Force re-render
      window.location.reload();
    } catch (error) {
      console.error('Failed to reload translations:', error);
    }
  };

  
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const animatedWords = ["Rare", "Historic", "Valuable", "Unique", "Exquisite"];
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prevIndex) => (prevIndex + 1) % animatedWords.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadForumPosts = async () => {
      setLoadingPosts(true);
      try {
        const posts = await fetchForumPosts();
        setForumPosts(posts.slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch forum posts:", error);
      } finally {
        setLoadingPosts(false);
      }
    };

    loadForumPosts();
  }, []);

  // Load countries for checking existence
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countriesData = await fetchCountries();
        setCountries(countriesData);
      } catch (error) {
        console.error("Failed to fetch countries:", error);
      }
    };

    loadCountries();
  }, []);

  useEffect(() => {
    const loadMarketplaceItems = async () => {
      setLoadingMarketplace(true);
      try {
        // Fetch the 6 newest marketplace items for highlights
        const items = await fetchNewestMarketplaceItems(6);
        setMarketplaceItems(items);
      } catch (error) {
        console.error("Failed to fetch newest marketplace items:", error);
      } finally {
        setLoadingMarketplace(false);
      }
    };

    loadMarketplaceItems();
  }, []);

  // Handler functions for country navigation
  const handleOttomanEmpireClick = () => {
    navigate('/catalog/Ottoman Empire');
  };

  const handleCountryClick = (countryName: string) => {
    const country = countries.find(c => c.name === countryName);
    if (country) {
      navigate(`/catalog/${encodeURIComponent(countryName)}`);
    } else {
      setSelectedCountry(countryName);
      setShowAdminDialog(true);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    const hiddenElements = document.querySelectorAll('.reveal');
    hiddenElements.forEach(el => observer.observe(el));

    return () => {
      hiddenElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  const bgColor = theme === 'light' ? 'bg-page-home' : 'bg-dark-500';
  const skewedBgColor = theme === 'light'
    ? 'bg-ottoman-500/10 shadow-ottoman-300/20 ring-ottoman-400/10'
    : 'bg-dark-600/40 shadow-ottoman-900/20 ring-ottoman-900/10';
  const featuresBgColor = theme === 'light'
    ? 'bg-ottoman-50 border-ottoman-200'
    : 'bg-dark-600 border-none';

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <Canonical />
      <SEOHead
        title={SEO_CONFIG.pages.home.title}
        description={SEO_CONFIG.pages.home.description}
        keywords={SEO_CONFIG.pages.home.keywords}
        type="website"
        image="/OttoCollectIcon.PNG"
        url="https://ottocollect.com/"
      />
      <section className="relative py-16 px-4 overflow-hidden text-center">
        <div className="absolute inset-0 -z-10">
          <div
            className={`absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] ${skewedBgColor} shadow-xl ring-1 ring-inset`}
            aria-hidden="true"
          />
        </div>

        <div className="container mx-auto max-w-4xl flex flex-col items-center justify-center animate-fade-in">
          <div className="flex flex-col items-center">
            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} leading-tight mb-[-1rem]`}>
              <span className="animate-shimmer inline-block">
                OttoCollect
              </span>
            </h1>
            <OptimizedImage
              src="/OttoCollectIcon.PNG"
              alt="OttoCollect Logo"
              className="w-[200px] h-[200px] object-contain animate-floating"
              priority={true}
              lazy={false}
              width={200}
              height={200}
            />

          </div>

          <h3 className={`mb-1 text-2xl sm:text-2xl lg:text-3xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} leading-tight`}>
            <span>
              {t('home.hero.subtitle')}
            </span>
          </h3>

          <p
            className={`text-lg ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-100'
              } w-[90vw] max-w-2xl`}
          >
            {t('home.hero.description')}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button
              className="ottoman-button bg-ottoman-600 hover:bg-ottoman-700 text-white py-6 px-8 text-lg group"
              onClick={() => navigate('/catalog')}
            >
              <span className="group-hover:animate-bounce-subtle">{t('home.hero.exploreButton')}</span>
              <span className="ml-1 group-hover:translate-x-1 transition-transform"> {direction === 'rtl' ? <ArrowLeft /> : <ArrowRight />}</span>
            </Button>
            {!user && (
              <Link to="/auth">
                <Button
                  variant="outline"
                  className={`${theme === 'light'
                    ? 'border-ottoman-400 text-ottoman-800 hover:bg-ottoman-200/50'
                    : 'border-ottoman-700 text-ottoman-100 hover:bg-ottoman-800/50'} py-6 px-8 text-lg`}
                >
                  {t('home.hero.joinButton')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className={`py-24 ${featuresBgColor} border-y relative overflow-hidden`}>
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-32 h-32 bg-ottoman-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-ottoman-400 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-20 reveal fade-bottom">
          <h2  className={`text-3xl md:text-4xl font-serif font-bold mb-6 text-center ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'}`}>
              <span>{t('home.features.title')}</span>
            </h2>
            <p className={`text-center text-xl leading-relaxed ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-200'}`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-1">
            <div
              className="group glass-card p-6 reveal fade-bottom cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-transparent hover:border-ottoman-500/20"
              style={{ animationDelay: '100ms' }}
              onClick={() => navigate('/catalog')}
              tabIndex={0}
              role="button"
              aria-label="Go to Catalogue"
              onKeyDown={e => { if (e.key === 'Enter') navigate('/catalog'); }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-ottoman-600 to-ottoman-700 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg flex-shrink-0">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <h3 className={`text-xl font-serif font-semibold ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-200'}`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                  <span>{t('home.features.catalogues.title')}</span>
                </h3>
              </div>
              <p className={`text-sm leading-relaxed ${theme === 'light' ? 'text-ottoman-600' : 'text-ottoman-300'}`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                {t('home.features.catalogues.description')}
              </p>
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-6 h-0.5 bg-gradient-to-r from-ottoman-500 to-ottoman-600 rounded-full"></div>
              </div>
            </div>

            <div
              className="group glass-card p-6 reveal fade-bottom cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-transparent hover:border-ottoman-500/20"
              style={{ animationDelay: '200ms' }}
              onClick={() => navigate('/collection')}
              tabIndex={0}
              role="button"
              aria-label="Go to Collection"
              onKeyDown={e => { if (e.key === 'Enter') navigate('/collection'); }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-ottoman-600 to-ottoman-700 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <h3 className={`text-xl font-serif font-semibold ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-200'}`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                  <span>{t('home.features.collection.title')}</span>
                </h3>
              </div>
              <p className={`text-sm leading-relaxed ${theme === 'light' ? 'text-ottoman-600' : 'text-ottoman-300'}`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                {t('home.features.collection.description')}
              </p>
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-6 h-0.5 bg-gradient-to-r from-ottoman-500 to-ottoman-600 rounded-full"></div>
              </div>
            </div>

            <div
              className="group glass-card p-6 reveal fade-bottom cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-transparent hover:border-ottoman-500/20"
              style={{ animationDelay: '300ms' }}
              onClick={() => navigate('/marketplace')}
              tabIndex={0}
              role="button"
              aria-label="Go to Marketplace"
              onKeyDown={e => { if (e.key === 'Enter') navigate('/marketplace'); }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-ottoman-600 to-ottoman-700 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <h3 className={`text-xl font-serif font-semibold ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-200'}`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                  <span>{t('home.features.marketplace.title')}</span>
                </h3>
              </div>
              <p className={`text-sm leading-relaxed ${theme === 'light' ? 'text-ottoman-600' : 'text-ottoman-300'}`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                {t('home.features.marketplace.description')}
              </p>
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-6 h-0.5 bg-gradient-to-r from-ottoman-500 to-ottoman-600 rounded-full"></div>
              </div>
            </div>

            <div
              className="group glass-card p-6 reveal fade-bottom cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-transparent hover:border-ottoman-500/20"
              style={{ animationDelay: '400ms' }}
              onClick={() => navigate('/community')}
              tabIndex={0}
              role="button"
              aria-label="Go to Community"
              onKeyDown={e => { if (e.key === 'Enter') navigate('/community'); }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-ottoman-600 to-ottoman-700 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg flex-shrink-0">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className={`text-xl font-serif font-semibold ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-200'}`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                  <span>{t('home.features.communityHome.title')}</span>
                </h3>
              </div>
              <p className={`text-sm leading-relaxed ${theme === 'light' ? 'text-ottoman-600' : 'text-ottoman-300'}`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                {t('home.features.communityHome.description')}
              </p>
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-6 h-0.5 bg-gradient-to-r from-ottoman-500 to-ottoman-600 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10">
            <div className="reveal fade-right">
              <h2 className={`text-3xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} mb-3`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                <span>{t('home.communityDiscussions.title')}</span>
              </h2>
              <p className={`${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                {t('home.communityDiscussions.description')}
              </p>
            </div>
            <div className="mt-4 md:mt-0 reveal fade-left">
              <Link to="/forum">
                <Button variant="outline" className={`${theme === 'light'
                  ? 'border-ottoman-400 text-ottoman-800 hover:bg-ottoman-200/50'
                  : 'border-ottoman-700 text-ottoman-100 hover:bg-ottoman-800/50'}`}>
                  {t('home.communityDiscussions.viewAllButton')}
                </Button>
              </Link>
            </div>
          </div>

          <LatestForumPosts posts={forumPosts} loading={loadingPosts} />
        </div>
      </section>

      <section className={`py-20 ${featuresBgColor} border-y`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10">
            <div className="reveal fade-right">
              <h2 className={`text-3xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} mb-3`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                <span>{t('home.marketplaceHighlights.title')}</span>
              </h2>
              <p className={`${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                {t('home.marketplaceHighlights.description')}
              </p>
            </div>
            <div className="mt-4 md:mt-0 reveal fade-left">
              <Link to="/marketplace">
                <Button variant="outline" className={`${theme === 'light'
                  ? 'border-ottoman-400 text-ottoman-800 hover:bg-ottoman-200/50'
                  : 'border-ottoman-700 text-ottoman-100 hover:bg-ottoman-800/50'}`}>
                  {t('home.marketplaceHighlights.visitButton')}
                </Button>
              </Link>
            </div>
          </div>
          <div className={`animate-floating ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
            <MarketplaceHighlights items={marketplaceItems} loading={loadingMarketplace} />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 reveal fade-bottom">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className={`text-3xl md:text-4xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} mb-3`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                <span>{getTranslationOrFallback('home.countries.header', 'Our full list of banknotes catalogues and collections that will be supported')}</span>
              </h2>
              <p className={`text-lg ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-200'}`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                {getTranslationOrFallback('home.countries.subtitle', "Ottoman Empire's successor countries from 1840 to the present days")}
              </p>
            </div>

            <div className={`${theme === 'light' ? 'border-ottoman-400 text-ottoman-800 ' : 'border-ottoman-700 text-ottoman-100'} rounded-xl shadow-lg overflow-hidden`}>
              {/* Ottoman Empire Header */}
              <div
                className={`${theme === 'light' ? 'bg-ottoman-600' : 'bg-ottoman-800'} p-6 flex items-center justify-center cursor-pointer hover:${theme === 'light' ? 'bg-ottoman-700' : 'bg-ottoman-900'} transition-colors`}
                onClick={handleOttomanEmpireClick}
              >
                <div className={`text-white text-2xl md:text-3xl font-serif font-bold text-center`}>
                  <span>{tWithFallback('home.countries.ottomanEmpire', 'Ottoman Empire')}</span>
                </div>
              </div>

              <div className="p-6">
                {/* Middle East and North Africa */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className={`text-xl font-serif font-semibold ${theme === 'light' ? 'text-ottoman-900' : 'text-ottoman-100'}`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                      <span>{t('home.regions.middleEast')}</span>
                    </h3>
                    <div className={`h-px flex-1 ${theme === 'light' ? 'bg-ottoman-200' : 'bg-ottoman-800'}`}></div>
                  </div>
                  <div className="grid auto-rows-fr grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                    {['Turkey', 'Egypt', 'Iraq', 'Israel', 'Jordan', 'Libya', 'Kuwait', 'Lebanon', 'Palestine', 'Saudi Arabia', 'Syria'].map((country) => (
                      <div
                        key={country}
                        className={`group p-3 rounded-lg border transition-all cursor-pointer
                        ${theme === 'light'
                            ? 'bg-ottoman-50 hover:bg-ottoman-100 border-ottoman-200 hover:border-ottoman-300'
                            : 'bg-dark-600 hover:bg-dark-500 border-ottoman-800 hover:border-ottoman-700'}`}
                        onClick={() => handleCountryClick(country)}
                      >
                        <div className={`text-center font-medium ${theme === 'light' ? 'text-ottoman-900' : 'text-ottoman-100'}`} style={{ textAlign: direction === 'rtl' ? 'center' : 'center' }}>
                          {getCountryTranslation(country)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Balkans */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className={`text-xl font-serif font-semibold ${theme === 'light' ? 'text-ottoman-900' : 'text-ottoman-100'}`} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                      <span>{t('home.regions.balkans')}</span>
                    </h3>
                    <div className={`h-px flex-1 ${theme === 'light' ? 'bg-ottoman-200' : 'bg-ottoman-800'}`}></div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                    {[
                      'Albania',
                      'Bosnia & Herzegovina',
                      'Bulgaria',
                      'Kosovo',
                      'Macedonia',
                      'Montenegro',
                      'Serbia',
                    ].map((country) => (
                      <div
  key={country}
  className={`group rounded-lg border transition-all cursor-pointer flex items-center justify-center
  ${country === 'Bosnia & Herzegovina'
    ? 'p-0 sm:p-1 sm:col-span-2 min-w-0'
    : 'p-3'}
  ${theme === 'light' 
    ? 'bg-ottoman-50 hover:bg-ottoman-100 border-ottoman-200 hover:border-ottoman-300' 
    : 'bg-dark-600 hover:bg-dark-500 border-ottoman-800 hover:border-ottoman-700'}`}
  onClick={() => handleCountryClick(country)}
>
                       <div
  className={`text-center font-medium truncate w-full
    ${theme === 'light' ? 'text-ottoman-900' : 'text-ottoman-100'}
    ${country === 'Bosnia & Herzegovina' ? 'text-sm sm:text-base leading-none px-0 py-0' : ''}`}
  style={{ textAlign: direction === 'rtl' ? 'center' : 'center' }}
>
  {getCountryTranslation(country)}
</div>
                      </div>
                    ))}
                  </div>
                </div>



              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`py-20 relative overflow-hidden ${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-700'}  border-t`}>
        <div className="absolute inset-0 -z-10">
          <div
            className={`absolute inset-y-0 left-1/2 -z-10 ml-16 w-[200%] origin-bottom-right skew-x-[-30deg] ${skewedBgColor} shadow-xl ring-1 ring-inset`}
            aria-hidden="true"
          />
        </div>

        <div className="container mx-auto px-4 text-center reveal fade-bottom ">
          <h2 className={`text-3xl md:text-4xl lg:text-5xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} mb-6`}>
            <span>{t('home.callToAction.title')}</span>
          </h2>
          <p className={`text-lg ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-200'} max-w-4xl mx-auto mb-10`}>
            {t('home.callToAction.description')}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              className="ottoman-button bg-ottoman-600 hover:bg-ottoman-700 text-white py-6 px-8 text-lg"
              onClick={() => navigate('/catalog')}
            >
              {t('home.callToAction.startExploringButton')}
            </Button>

            {!user && (
              <Link to="/auth">
                <Button variant="outline" className={`${theme === 'light'
                  ? 'border-ottoman-400 text-ottoman-800 hover:bg-ottoman-200/50'
                  : 'border-ottoman-700 text-ottoman-100 hover:bg-ottoman-800/50'} py-6 px-8 text-lg`}>
                  {t('home.callToAction.signUpButton')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Admin Dialog */}
      <AlertDialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle className={direction === 'rtl' ? 'text-right' : ''}><span>{t('home.adminDialog.title')}</span></AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className={direction === 'rtl' ? 'text-right' : ''}>
                {t('home.adminDialog.description', { country: selectedCountry })}
              </p>
              <p className={direction === 'rtl' ? 'text-right' : ''}>
                {t('home.adminDialog.contactInfo')}
              </p>
              <p className={direction === 'rtl' ? 'text-right' : ''}>
                {t('home.adminDialog.emailInfo')}{" "}
                <a
                  href="mailto:info@ottocollect.com"
                  className="text-ottoman-600 hover:text-ottoman-700 font-medium"
                >
                  info@ottocollect.com
                </a>
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAdminDialog(false)}>
              {t('home.adminDialog.gotItButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
