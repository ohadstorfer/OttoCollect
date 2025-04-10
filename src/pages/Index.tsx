
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { MOCK_BANKNOTES, MOCK_MARKETPLACE_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, Database, BookOpen, Users, DollarSign } from "lucide-react";
import BanknoteCard from "@/components/banknotes/BanknoteCard";
import MarketplaceItem from "@/components/marketplace/MarketplaceItem";

const Index = () => {
  const { user } = useAuth();
  const [featuredBanknotes, setFeaturedBanknotes] = useState(MOCK_BANKNOTES.slice(0, 4));
  const [marketplaceItems, setMarketplaceItems] = useState(MOCK_MARKETPLACE_ITEMS.slice(0, 2));
  
  // Animation observer for scroll animations
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

  return (
    <div className="min-h-screen bg-dark-500">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 px-4 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] bg-dark-600/40 shadow-xl shadow-ottoman-900/20 ring-1 ring-inset ring-ottoman-900/10"
            aria-hidden="true"
          />
        </div>
        
        <div className="container mx-auto flex flex-col lg:flex-row items-center">
          <div className="lg:w-1/2 lg:pr-12 mb-10 lg:mb-0 animate-fade-in">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-parchment-500 leading-tight">
              Discover the Legacy of <span className="text-gradient">Ottoman Banknotes</span>
            </h1>
            <p className="mt-6 text-lg text-ottoman-100 max-w-2xl">
              Explore, collect, and trade historical Ottoman Empire banknotes from across regions 
              and eras. Join our community of passionate collectors and numismatic enthusiasts.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button className="ottoman-button bg-ottoman-600 hover:bg-ottoman-700 text-white py-6 px-8 text-lg">
                Explore Catalog
              </Button>
              {!user && (
                <Link to="/auth">
                  <Button variant="outline" className="border-ottoman-700 hover:bg-ottoman-800/50 text-ottoman-100 py-6 px-8 text-lg">
                    Join Community
                  </Button>
                </Link>
              )}
            </div>
          </div>
          
          <div className="relative h-[400px] w-full max-w-5xl mx-auto" style={{ transform: "translateX(20%)" }} >
      {/* Image 1 */}
      <div
        className="absolute top-0 left-0 w-48 h-48 rounded-lg shadow-lg overflow-hidden"
        style={{ animation: "floatRotate 3s ease-in-out infinite" }}
      >
        <img
          src="/image1.jpg"
          alt="Image 1"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Image 2 */}
      <div
        className="absolute top-36 left-36 w-48 h-48 rounded-lg shadow-lg overflow-hidden"
        style={{ animation: "floatRotate 3s ease-in-out infinite", animationDelay: "200ms" }}
      >
        <img
          src="/image2.jpg"
          alt="Image 2"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Image 3 */}
      <div
       className="absolute top-72 left-72 w-48 h-48 rounded-lg shadow-lg overflow-hidden"
        style={{ animation: "floatRotate 3s ease-in-out infinite", animationDelay: "400ms" }}
      >
        <img
          src="/image3.jpg"
          alt="Image 3"
          className="w-full h-full object-cover"
        />
      </div>

      <style>{`
        @keyframes floatRotate {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(3deg);
          }
        }
      `}</style>
    </div>
    
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 bg-dark-600">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 reveal fade-bottom">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-parchment-500">
              Comprehensive Platform for Collectors
            </h2>
            <p className="mt-4 text-lg text-ottoman-200">
              Everything you need to manage, showcase, and grow your Ottoman banknote collection
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="glass-card p-6 reveal fade-bottom" style={{ animationDelay: '100ms' }}>
              <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                <Database className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-2 text-ottoman-200">Catalog Management</h3>
              <p className="text-ottoman-300">
                Browse comprehensive catalog of Ottoman banknotes organized by country and era
              </p>
            </div>
            
            <div className="glass-card p-6 reveal fade-bottom" style={{ animationDelay: '200ms' }}>
              <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-2 text-ottoman-200">Collection Tools</h3>
              <p className="text-ottoman-300">
                Track your collection, wishlist, and display missing items with detailed information
              </p>
            </div>
            
            <div className="glass-card p-6 reveal fade-bottom" style={{ animationDelay: '300ms' }}>
              <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-2 text-ottoman-200">Marketplace</h3>
              <p className="text-ottoman-300">
                Buy and sell banknotes within the community through our integrated marketplace
              </p>
            </div>
            
            <div className="glass-card p-6 reveal fade-bottom" style={{ animationDelay: '400ms' }}>
              <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-2 text-ottoman-200">Community</h3>
              <p className="text-ottoman-300">
                Connect with fellow collectors through forums, blogs, and private messaging
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Banknotes */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10">
            <div className="reveal fade-right">
              <h2 className="text-3xl font-serif font-bold text-parchment-500 mb-3">
                Featured Banknotes
              </h2>
              <p className="text-ottoman-300 max-w-2xl">
                Explore these notable Ottoman Empire banknotes from our extensive catalog
              </p>
            </div>
            <div className="mt-4 md:mt-0 reveal fade-left">
              <Link to="/catalog">
                <Button variant="outline" className="border-ottoman-700 hover:bg-ottoman-800/50 text-ottoman-100">
                  View Catalog
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredBanknotes.map((banknote, index) => (
              <div 
                key={banknote.id} 
                className={cn("reveal", index % 2 === 0 ? "fade-right" : "fade-left")}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <BanknoteCard banknote={banknote} />
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Marketplace Preview */}
      <section className="py-20 bg-dark-600">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10">
            <div className="reveal fade-right">
              <h2 className="text-3xl font-serif font-bold text-parchment-500 mb-3">
                Marketplace Highlights
              </h2>
              <p className="text-ottoman-300 max-w-2xl">
                Currently available items from our collector community
              </p>
            </div>
            <div className="mt-4 md:mt-0 reveal fade-left">
              <Link to="/marketplace">
                <Button variant="outline" className="border-ottoman-700 hover:bg-ottoman-800/50 text-ottoman-100">
                  Visit Marketplace
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {marketplaceItems.map((item, index) => (
              <div 
                key={item.id} 
                className={cn("reveal", index % 2 === 0 ? "fade-right" : "fade-left")}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <MarketplaceItem item={item} />
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-y-0 left-1/2 -z-10 ml-16 w-[200%] origin-bottom-right skew-x-[-30deg] bg-dark-600/40 shadow-xl shadow-ottoman-900/20 ring-1 ring-inset ring-ottoman-900/10"
            aria-hidden="true"
          />
        </div>
        
        <div className="container mx-auto px-4 text-center reveal fade-bottom">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-parchment-500 mb-6">
            Join Our Community Today
          </h2>
          <p className="text-lg text-ottoman-200 max-w-2xl mx-auto mb-10">
            Connect with fellow collectors, track your collection, and explore the rich history of Ottoman banknotes
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button className="ottoman-button bg-ottoman-600 hover:bg-ottoman-700 text-white py-6 px-8 text-lg">
              Start Exploring
            </Button>
            
            {!user && (
              <Link to="/auth">
                <Button variant="outline" className="border-ottoman-700 hover:bg-ottoman-800/50 text-ottoman-100 py-6 px-8 text-lg">
                  Sign Up Now
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
      
      {/* Search Bar */}
      <section className="py-12 bg-ottoman-800">
        <div className="container mx-auto px-4 reveal fade-bottom">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-serif font-semibold text-center text-parchment-500 mb-6">
              Search Our Catalog
            </h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by country, denomination, year, or catalog ID..."
                className="w-full px-4 py-4 pr-12 rounded-lg bg-dark-500 border border-ottoman-700 text-ottoman-100 focus:outline-none focus:border-ottoman-500"
              />
              <Button
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-ottoman-600 hover:bg-ottoman-700 rounded-md p-2"
              >
                <Search className="h-5 w-5 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
