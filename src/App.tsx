
import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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
import '@/i18n/config';  // Import this at the top
import AboutUs from "./pages/AboutUs";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import CreateBlogPost from "./pages/CreateBlogPost";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    // Force a re-render when language changes
    const handleLanguageChanged = () => {
      document.documentElement.lang = i18n.language;
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <div data-theme={theme} className="flex flex-col min-h-screen">
              <PageBackground>
                <Navbar />
                <main className="flex-grow">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/catalog" element={<Catalog />} />
                    <Route path="/catalog/:country" element={<CountryDetail />} />
                    <Route path="/banknote-details/:id" element={<BanknoteCatalogDetail />} />
                    <Route path="/catalog-banknote/:id" element={<BanknoteCatalogDetail />} />
                    <Route path="/profile/:username" element={<Profile />} />
                    <Route path="/profile/:username/:country" element={<Profile />} />
                    <Route path="/collection" element={<CountrySelection />} />
                    <Route path="/collectionNew/:country" element={<CountryDetailCollection />} />
                    <Route path="/collection/:countryId" element={<Collection />} />
                    <Route path="/collection-item/:id" element={<CollectionItem />} />
                    <Route path="/collection-item-unlisted/:id" element={<CollectionItemUnlisted />} />
                    <Route path="/banknote-collection/:id" element={<BanknoteCollectionDetail isOwner={true} />} />
                    <Route path="/collection-banknote/:id" element={<BanknoteCollectionDetail isOwner={true} />} />
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/marketplace/:id" element={<MarketplaceItemDetail />} />
                    <Route path="/marketplace-unlisted/:id" element={<MarketplaceItemDetailUnlisted />} />
                    <Route path="/community" element={<Community />} />
                    <Route path="/community/forum" element={<Forum />} />
                    <Route path="/community/forum/post/:id" element={<ForumPost />} />
                    <Route path="/community/forum/:id" element={<ForumPost />} />
                    <Route path="/community/forum/new" element={<CreateForumPost />} />
                    <Route path="/community/forum/announcement/new" element={<CreateForumAnnouncement />} />
                    <Route path="/community/forum/announcement/:id" element={<ForumPostAnnouncements />} />
                    <Route path="/messaging" element={<Messaging />} />
                    <Route path="/messaging/:userId" element={<Messaging />} />
                    <Route path="/members" element={<Members />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/delete-processed-images" element={<DeleteProcessedImages />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/about-us" element={<AboutUs />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:id" element={<BlogPost />} />
                    <Route path="/blog/new" element={<CreateBlogPost />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
                <Toaster />
              </PageBackground>
            </div>
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
