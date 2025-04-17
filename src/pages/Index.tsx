import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { PageBackground } from '@/components/ui/page-background';
import LatestForumPosts from '@/components/home/LatestForumPosts';
import MarketplaceHighlights from '@/components/home/MarketplaceHighlights';

const Index = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const animatedWords = ["Rare", "Historic", "Valuable", "Unique", "Exquisite"];
  
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
  
  useEffect(() => {
    const loadMarketplaceItems = async () => {
      setLoadingMarketplace(true);
      try {
        const items = await fetchMarketplaceItems();
        setMarketplaceItems(items.slice(0, 4));
      } catch (error) {
        console.error("Failed to fetch marketplace items:", error);
      } finally {
        setLoadingMarketplace(false);
      }
    };
    
    loadMarketplaceItems();
  }, []);
  
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
      <section className="relative py-16 px-4 overflow-hidden text-center">
        <div className="absolute inset-0 -z-10">
          <div
            className={`absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] ${skewedBgColor} shadow-xl ring-1 ring-inset`}
            aria-hidden="true"
          />
        </div>

        <div className="container mx-auto max-w-4xl flex flex-col items-center justify-center animate-fade-in">
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} leading-tight`}>
            Discover the Legacy of
            <br />
            <span className="relative inline-flex flex-col h-[1.5em] overflow-hidden mt-2">
              <span className="text-gradient animate-typewriter">
                {animatedWords[currentWordIndex]}
              </span>
              <span className="text-gradient absolute top-full animate-slide-down">
                {animatedWords[(currentWordIndex + 1) % animatedWords.length]}
              </span>
            </span>
            <br />
            <span className="animate-shimmer inline-block mt-2">
              Ottoman Banknotes
            </span>
          </h1>

          <p className={`mt-6 text-lg ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-100'} max-w-2xl animate-floating`}>
            Explore, collect, and trade historical Ottoman Empire banknotes from across regions 
            and eras. Join our <span className={`${theme === 'light' ? 'text-ottoman-600' : 'text-ottoman-300'} font-medium animate-pulse-subtle`}>
              community of passionate collectors
            </span> and numismatic enthusiasts.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button className="ottoman-button bg-ottoman-600 hover:bg-ottoman-700 text-white py-6 px-8 text-lg group">
              <span className="group-hover:animate-bounce-subtle">Explore Catalog</span>
              <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
            </Button>
            {!user && (
              <Link to="/auth">
                <Button
                  variant="outline"
                  className={`${theme === 'light' 
                    ? 'border-ottoman-400 text-ottoman-800 hover:bg-ottoman-200/50' 
                    : 'border-ottoman-700 text-ottoman-100 hover:bg-ottoman-800/50'} py-6 px-8 text-lg`}
                >
                  Join Community
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
      
      <section className={`py-20 ${featuresBgColor} border-y`}>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 reveal fade-bottom">
            <h2 className={`text-3xl md:text-4xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'}`}>
              Comprehensive Platform for Collectors
            </h2>
            <p className={`mt-4 text-lg ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-200'}`}>
              Everything you need to manage, showcase, and grow your Ottoman banknote collection
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="glass-card p-6 reveal fade-bottom" style={{ animationDelay: '100ms' }}>
              <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                <Database className="h-6 w-6 text-white" />
              </div>
              <h3 className={`text-xl font-serif font-semibold mb-2 ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-200'}`}>Catalog Management</h3>
              <p className={`${theme === 'light' ? 'text-ottoman-600' : 'text-ottoman-300'}`}>
                Browse comprehensive catalog of Ottoman banknotes organized by country and era
              </p>
            </div>
            
            <div className="glass-card p-6 reveal fade-bottom" style={{ animationDelay: '200ms' }}>
              <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h3 className={`text-xl font-serif font-semibold mb-2 ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-200'}`}>Collection Tools</h3>
              <p className={`${theme === 'light' ? 'text-ottoman-600' : 'text-ottoman-300'}`}>
                Track your collection, wishlist, and display missing items with detailed information
              </p>
            </div>
            
            <div className="glass-card p-6 reveal fade-bottom" style={{ animationDelay: '300ms' }}>
              <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <h3 className={`text-xl font-serif font-semibold mb-2 ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-200'}`}>Marketplace</h3>
              <p className={`${theme === 'light' ? 'text-ottoman-600' : 'text-ottoman-300'}`}>
                Buy and sell banknotes within the community through our integrated marketplace
              </p>
            </div>
            
            <div className="glass-card p-6 reveal fade-bottom" style={{ animationDelay: '400ms' }}>
              <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className={`text-xl font-serif font-semibold mb-2 ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-200'}`}>Community</h3>
              <p className={`${theme === 'light' ? 'text-ottoman-600' : 'text-ottoman-300'}`}>
                Connect with fellow collectors through forums, blogs, and private messaging
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10">
            <div className="reveal fade-right">
              <h2 className={`text-3xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} mb-3`}>
                Community Discussions
              </h2>
              <p className={`${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl`}>
                Join the conversation with fellow Ottoman banknote enthusiasts
              </p>
            </div>
            <div className="mt-4 md:mt-0 reveal fade-left">
              <Link to="/community/forum">
                <Button variant="outline" className={`${theme === 'light' 
                  ? 'border-ottoman-400 text-ottoman-800 hover:bg-ottoman-200/50' 
                  : 'border-ottoman-700 text-ottoman-100 hover:bg-ottoman-800/50'}`}>
                  View All Discussions
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
              <h2 className={`text-3xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} mb-3`}>
                Marketplace Highlights
              </h2>
              <p className={`${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl`}>
                Currently available items from our collector community
              </p>
            </div>
            <div className="mt-4 md:mt-0 reveal fade-left">
              <Link to="/marketplace">
                <Button variant="outline" className={`${theme === 'light' 
                  ? 'border-ottoman-400 text-ottoman-800 hover:bg-ottoman-200/50' 
                  : 'border-ottoman-700 text-ottoman-100 hover:bg-ottoman-800/50'}`}>
                  Visit Marketplace
                </Button>
              </Link>
            </div>
          </div>
          <div className="animate-floating">
            <MarketplaceHighlights items={marketplaceItems} loading={loadingMarketplace} />
          </div>
        </div>
      </section>
      
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div
            className={`absolute inset-y-0 left-1/2 -z-10 ml-16 w-[200%] origin-bottom-right skew-x-[-30deg] ${skewedBgColor} shadow-xl ring-1 ring-inset`}
            aria-hidden="true"
          />
        </div>
        
        <div className="container mx-auto px-4 text-center reveal fade-bottom">
          <h2 className={`text-3xl md:text-4xl lg:text-5xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} mb-6`}>
            Join Our Community Today
          </h2>
          <p className={`text-lg ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-200'} max-w-2xl mx-auto mb-10`}>
            Connect with fellow collectors, track your collection, and explore the rich history of Ottoman banknotes
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button className="ottoman-button bg-ottoman-600 hover:bg-ottoman-700 text-white py-6 px-8 text-lg">
              Start Exploring
            </Button>
            
            {!user && (
              <Link to="/auth">
                <Button variant="outline" className={`${theme === 'light' 
                  ? 'border-ottoman-400 text-ottoman-800 hover:bg-ottoman-200/50' 
                  : 'border-ottoman-700 text-ottoman-100 hover:bg-ottoman-800/50'} py-6 px-8 text-lg`}>
                  Sign Up Now
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
      
      <section className={`py-12 ${theme === 'light' ? 'bg-ottoman-100 border-ottoman-300' : 'bg-ottoman-800 border-none'} border-t`}>
        <div className="container mx-auto px-4 reveal fade-bottom">
          <div className="max-w-4xl mx-auto">
            <h3 className={`text-2xl font-serif font-semibold text-center ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} mb-6`}>
              Search Our Catalog
            </h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by country, denomination, year, or catalog ID..."
                className={`w-full px-4 py-4 pr-12 rounded-lg ${
                  theme === 'light' 
                    ? 'bg-white border-ottoman-300 text-ottoman-800 focus:border-ottoman-500' 
                    : 'bg-dark-500 border-ottoman-700 text-ottoman-100 focus:border-ottoman-500'
                } border focus:outline-none`}
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
