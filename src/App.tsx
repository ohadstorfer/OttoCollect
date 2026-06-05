import { useLocation, type RouteObject } from "react-router-dom";
import { CachedRoutes } from "@/CachedRoutes";
import { Toaster } from "@/components/ui/toaster";
import { HelmetProvider } from 'react-helmet-async';
import { usePerformanceOptimization } from "@/hooks/usePerformanceOptimization";
import Navbar from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Index from "@/pages/Index";
import Home from "@/pages/Home";
import NoMatch from "@/pages/NoMatch";
import Auth from "@/pages/Auth";
import Catalog from "@/pages/Catalog";
import CountryDetail from "@/pages/CountryDetail";
import BanknoteCatalogDetail from "@/pages/BanknoteCatalogDetail";
import Profile from "@/pages/Profile";
import Collection from "@/pages/Collection";
import CollectionItem from "@/pages/CollectionItem";
import CountrySelection from "@/pages/CountrySelection";
import BanknoteCollectionDetail from "@/pages/BanknoteCollectionDetail";
import Marketplace from "@/pages/Marketplace";
import MarketplaceItemDetail from "@/pages/MarketplaceItemDetail";
import Forum from "@/pages/Forum";
import ForumPost from "@/pages/ForumPost";
import CreateForumPost from "@/pages/CreateForumPost";
import CreateForumAnnouncement from "@/pages/CreateForumAnnouncement";
import ForumPostAnnouncements from "@/pages/ForumPostAnnouncements";
import Messaging from "@/pages/Messaging";
import Members from "@/pages/Members";
import NotFound from "@/pages/NotFound";
import Admin from "@/pages/Admin";
import Community from "@/pages/Community";
import Settings from "@/pages/Settings";
import DeleteProcessedImages from "@/pages/DeleteProcessedImages";
import WatermarkPreview from "@/pages/WatermarkPreview";
import { PageBackground } from "./components/ui/page-background";
import { useTheme } from "./context/ThemeContext";
import { useAuth } from "./context/AuthContext";
import "./App.css";
import CountryDetailCollection from "./pages/CountryDetailCollection";
import CollectionItemUnlisted from "./pages/CollectionItemUnlisted";
import MarketplaceItemDetailUnlisted from "./pages/MarketplaceItemDetailUnlisted";
import ResetPassword from "@/pages/ResetPassword";
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { Router } from "react-router-dom";
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import '@/i18n/config';  // Import this at the top
import AboutUs from "./pages/AboutUs";
import Blog from "./pages/Blog";
import Guide from "./pages/Guide";
import BlogPost from "./pages/BlogPost";
import CreateBlogPost from "./pages/CreateBlogPost";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ContactUs from "./pages/ContactUs";
import { CookieConsent } from "@/components/ui/cookie-consent";
import CookiePolicy from "./pages/CookiePolicy";
import { TutorialPopup } from '@/components/tutorial/TutorialPopup';
import { TutorialTriggers } from '@/components/tutorial/TutorialTriggers';
import { TutorialDebug } from '@/components/tutorial/TutorialDebug';
import { statisticsService } from '@/services/statisticsService';
import TestCleanup from "./pages/TestCleanup";
import SEOChecker from "@/components/seo/SEOChecker";

// Route table as config objects so <CachedRoutes> can render the active page
// through a single <KeepAlive> boundary. Routes with props keep them here.
const appRoutes: RouteObject[] = [
  { path: "/", element: <Index /> },
  { path: "/home", element: <Home /> },
  { path: "/auth", element: <Auth /> },
  { path: "/catalog", element: <Catalog /> },
  { path: "/catalog/:country", element: <CountryDetail /> },
  { path: "/banknote-details/:id", element: <BanknoteCatalogDetail /> },
  { path: "/catalog-banknote/:id", element: <BanknoteCatalogDetail /> },
  { path: "/profile/:username", element: <Profile /> },
  { path: "/profile/:username/:country", element: <Profile /> },
  { path: "/collection", element: <CountrySelection /> },
  { path: "/collectionNew/:country", element: <CountryDetailCollection onBackToCountries={() => {}} /> },
  { path: "/collection/:countryId", element: <Collection /> },
  { path: "/collection-item/:id", element: <CollectionItem /> },
  { path: "/collection-item-unlisted/:id", element: <CollectionItemUnlisted /> },
  { path: "/banknote-collection/:id", element: <BanknoteCollectionDetail isOwner={true} /> },
  { path: "/collection-banknote/:id", element: <BanknoteCollectionDetail isOwner={true} /> },
  { path: "/marketplace", element: <Marketplace /> },
  { path: "/marketplace-item/:id", element: <MarketplaceItemDetail /> },
  { path: "/marketplace-item-unlisted/:id", element: <MarketplaceItemDetailUnlisted /> },
  { path: "/forum", element: <Forum /> },
  { path: "/forum-post/:id", element: <ForumPost /> },
  { path: "/create-forum-post", element: <CreateForumPost /> },
  { path: "/create-forum-announcement", element: <CreateForumAnnouncement /> },
  { path: "/forum-announcements/:id", element: <ForumPostAnnouncements /> },
  { path: "/messaging", element: <Messaging /> },
  { path: "/messaging/:userId", element: <Messaging /> },
  { path: "/members", element: <Members /> },
  { path: "/admin", element: <Admin /> },
  { path: "/community", element: <Community /> },
  { path: "/settings", element: <Settings /> },
  { path: "/delete-processed-images", element: <DeleteProcessedImages /> },
  { path: "/admin/watermark-preview", element: <WatermarkPreview /> },
  { path: "/about", element: <AboutUs /> },
  { path: "/blog", element: <Blog /> },
  { path: "/blog-post/:id", element: <BlogPost /> },
  { path: "/create-blog-post", element: <CreateBlogPost /> },
  { path: "/contact", element: <ContactUs /> },
  { path: "/privacy", element: <PrivacyPolicy /> },
  { path: "/privacy-policy", element: <PrivacyPolicy /> },
  { path: "/cookie-policy", element: <CookiePolicy /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/terms", element: <TermsOfService /> },
  { path: "/terms-of-service", element: <TermsOfService /> },
  { path: "/guide", element: <Guide /> },
  { path: "/test-cleanup", element: <TestCleanup /> },
  { path: "*", element: <NotFound /> },
];

function App() {
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  
  // Initialize performance optimizations
  usePerformanceOptimization();
  const location = useLocation();
  
  // Auto-scroll to top on route changes
  useScrollToTop();

  // Track page views for analytics
  useEffect(() => {
    // Analytics tracking can be added here when needed
    // Currently using statisticsService for other metrics
  }, [user, location.pathname]); // Track on route changes for better page view counting

  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <HelmetProvider>
              <div data-theme={theme} className="flex flex-col min-h-screen">
                <PageBackground>
                  <Navbar />
                  <main className="flex-grow">
                    <CachedRoutes routes={appRoutes} />
                  </main>
                  <CookieConsent />
                  <Footer />
                  <Toaster />
                  <TutorialPopup />
                  <TutorialTriggers />
                  <SEOChecker />
                  {/* <TutorialDebug /> */}
                </PageBackground>
              </div>
            </HelmetProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;