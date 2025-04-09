
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Catalog from "./pages/Catalog";
import CountryDetail from "./pages/CountryDetail";
import Collection from "./pages/Collection";
import Marketplace from "./pages/Marketplace";
import MarketplaceItemDetail from "./pages/MarketplaceItemDetail";
import Community from "./pages/Community";
import Messaging from "./pages/Messaging";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Banknote from "./pages/Banknote";
import BanknoteCatalogDetail from "./pages/BanknoteCatalogDetail";
import BanknoteCollectionDetail from "./pages/BanknoteCollectionDetail";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Forum from "./pages/Forum";
import ForumPost from "./pages/ForumPost";
import CreateForumPost from "./pages/CreateForumPost";
import Members from "./pages/Members";
import CollectionItem from "./pages/CollectionItem";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/catalog/:countryName" element={<CountryDetail />} />
                <Route path="/collection" element={<Collection />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/marketplace/:id" element={<MarketplaceItemDetail />} />
                <Route path="/community" element={<Community />} />
                <Route path="/community/forum" element={<Forum />} />
                <Route path="/community/forum/:id" element={<ForumPost />} />
                <Route path="/community/forum/new" element={<CreateForumPost />} />
                <Route path="/community/members" element={<Members />} />
                <Route path="/messaging" element={<Messaging />} />
                <Route path="/banknote/:id" element={<Banknote />} />
                <Route path="/catalog-banknote/:id" element={<BanknoteCatalogDetail />} />
                <Route path="/collection-banknote/:id" element={<BanknoteCollectionDetail />} />
                <Route path="/collection-item/:id" element={<CollectionItem />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:id" element={<Profile />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
