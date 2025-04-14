
import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Catalog from "@/pages/Catalog";
import CountryDetail from "@/pages/CountryDetail";
import BanknoteCatalogDetail from "@/pages/BanknoteCatalogDetail";
import Profile from "@/pages/Profile";
import Collection from "@/pages/Collection";
import CollectionItem from "@/pages/CollectionItem";
import BanknoteCollectionDetail from "@/pages/BanknoteCollectionDetail";
import Marketplace from "@/pages/Marketplace";
import MarketplaceItemDetail from "@/pages/MarketplaceItemDetail";
import Forum from "@/pages/Forum";
import ForumPost from "@/pages/ForumPost";
import CreateForumPost from "@/pages/CreateForumPost";
import Messaging from "@/pages/Messaging";
import Members from "@/pages/Members";
import NotFound from "@/pages/NotFound";
import Admin from "@/pages/Admin";
import Community from "@/pages/Community";
import { PageBackground } from "./components/ui/page-background";
import { useTheme } from "./context/ThemeContext";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  const { theme } = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <div data-theme={theme}>
        <PageBackground>
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/catalog/:country" element={<CountryDetail />} />
            <Route path="/banknote-details/:id" element={<BanknoteCatalogDetail />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/collection/:id" element={<CollectionItem />} />
            <Route path="/banknote-collection/:id" element={<BanknoteCollectionDetail />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/marketplace/:id" element={<MarketplaceItemDetail />} />
            <Route path="/community" element={<Community />} />
            <Route path="/community/forum" element={<Forum />} />
            <Route path="/community/forum/post/:id" element={<ForumPost />} />
            <Route path="/community/forum/new" element={<CreateForumPost />} />
            <Route path="/messaging" element={<Messaging />} />
            <Route path="/members" element={<Members />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
          <Toaster />
        </PageBackground>
      </div>
    </QueryClientProvider>
  );
}

export default App;
