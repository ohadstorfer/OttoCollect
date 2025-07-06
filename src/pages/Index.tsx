import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { MOCK_BANKNOTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, Database, BookOpen, Users, DollarSign } from "lucide-react";
import LatestForumPosts from "@/components/home/LatestForumPosts";
import MarketplaceHighlights from "@/components/home/MarketplaceHighlights";
import { fetchForumPosts } from "@/services/forumService";
import { fetchMarketplaceItems } from "@/services/marketplaceService";
import { ForumPost } from '@/types/forum';
import { MarketplaceItem } from '@/types';
import { useTheme } from "@/context/ThemeContext";

const Index = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
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
          <div className="flex flex-col items-center">
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} leading-tight mb-[-1rem]`}>
              <span className="animate-shimmer inline-block">
                OttoCollect
              </span>
            </h1>
            <img
              src="/favicon.PNG"
              alt="OttoCollect Logo"
              className="w-[200px] h-[200px] object-contain animate-floating "
            />
            
          </div>

          <h3 className={`mb-1 text-2xl sm:text-2xl lg:text-3xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} leading-tight line-clamp-2`}>
            <span>
            Discover the Legacy of Ottoman empire and it's successor countries Banknotes
            </span>
          </h3>

          <p
            className={`text-lg ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-100'
              } w-[90vw] max-w-2xl`}
          >
            Explore, collect, and trade historical banknotes from across regions
            and eras. Join our <span className={`${theme === 'light' ? 'text-ottoman-600' : 'text-ottoman-300'} font-medium animate-pulse-subtle`}>
              community of passionate collectors.
            </span>
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button
              className="ottoman-button bg-ottoman-600 hover:bg-ottoman-700 text-white py-6 px-8 text-lg group"
              onClick={() => navigate('/catalog')}
            >
              <span className="group-hover:animate-bounce-subtle">Explore Catalogue</span>
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
              <span>Comprehensive Platform for Collectors</span>
            </h2>
            <p className={`mt-4 text-lg ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-200'}`}>
              Everything you need to manage, showcase, and grow your Ottoman and it's successor countries banknotes collection
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div
              className="glass-card p-6 reveal fade-bottom cursor-pointer hover:shadow-lg transition"
              style={{ animationDelay: '100ms' }}
              onClick={() => navigate('/catalog')}
              tabIndex={0}
              role="button"
              aria-label="Go to Catalogue"
              onKeyDown={e => { if (e.key === 'Enter') navigate('/catalog'); }}
            >
              <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                <Database className="h-6 w-6 text-white" />
              </div>
              <h3 className={`text-xl font-serif font-semibold mb-2 ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-200'}`}><span>Catalogues</span></h3>
              <p className={`${theme === 'light' ? 'text-ottoman-600' : 'text-ottoman-300'}`}>Browse comprehensive
catalogue of ottoman and it's
successor countries banknotes</p>
            </div>

            <div
              className="glass-card p-6 reveal fade-bottom cursor-pointer hover:shadow-lg transition"
              style={{ animationDelay: '200ms' }}
              onClick={() => navigate('/collection')}
              tabIndex={0}
              role="button"
              aria-label="Go to Collection"
              onKeyDown={e => { if (e.key === 'Enter') navigate('/collection'); }}
            >
              <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h3 className={`text-xl font-serif font-semibold mb-2 ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-200'}`}><span>Collection Tools</span></h3>
              <p className={`${theme === 'light' ? 'text-ottoman-600' : 'text-ottoman-300'}`}>Track your collection, wishlist, and display missing items with detailed information</p>
            </div>

            <div
              className="glass-card p-6 reveal fade-bottom cursor-pointer hover:shadow-lg transition"
              style={{ animationDelay: '300ms' }}
              onClick={() => navigate('/marketplace')}
              tabIndex={0}
              role="button"
              aria-label="Go to Marketplace"
              onKeyDown={e => { if (e.key === 'Enter') navigate('/marketplace'); }}
            >
              <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <h3 className={`text-xl font-serif font-semibold mb-2 ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-200'}`}><span>Marketplace</span></h3>
              <p className={`${theme === 'light' ? 'text-ottoman-600' : 'text-ottoman-300'}`}>Buy and sell banknotes within the community through our integrated marketplace</p>
            </div>

            <div
              className="glass-card p-6 reveal fade-bottom cursor-pointer hover:shadow-lg transition"
              style={{ animationDelay: '400ms' }}
              onClick={() => navigate('/community')}
              tabIndex={0}
              role="button"
              aria-label="Go to Community"
              onKeyDown={e => { if (e.key === 'Enter') navigate('/community'); }}
            >
              <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className={`text-xl font-serif font-semibold mb-2 ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-200'}`}><span>Community</span></h3>
              <p className={`${theme === 'light' ? 'text-ottoman-600' : 'text-ottoman-300'}`}>View other personal collection.
Connect interact and follow
other collectors from around the
world.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10">
            <div className="reveal fade-right">
              <h2 className={`text-3xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} mb-3`}>
                <span>Community Discussions</span>
              </h2>
              <p className={`${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl`}>
                Join the conversation with fellow Ottoman and it's successor countries banknotes collectors
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
                <span>Marketplace Highlights</span>
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

      <section className="py-20">
        <div className="container mx-auto px-4 reveal fade-bottom">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className={`text-3xl md:text-4xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} mb-3`}>
                <span>Our full list of banknotes catalogues and collections that will be supported</span>
              </h2>
              <p className={`text-lg ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-200'}`}>
              Ottoman Empire's successor countries from 1840 to the present days

              </p>
            </div>

            <div className={`${theme === 'light' ? 'border-ottoman-400 text-ottoman-800 ' : 'border-ottoman-700 text-ottoman-100'} rounded-xl shadow-lg overflow-hidden`}>
              {/* Ottoman Empire Header */}
              <div className={`${theme === 'light' ? 'bg-ottoman-600' : 'bg-ottoman-800'} p-6 flex items-center justify-center`}>
                <div className={`text-white text-2xl md:text-3xl font-serif font-bold text-center`}>
                  Ottoman Empire
                </div>
              </div>

              <div className="p-6">
                {/* Middle East and North Africa */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className={`text-xl font-serif font-semibold ${theme === 'light' ? 'text-ottoman-900' : 'text-ottoman-100'}`}>
                      <span>Middle East and North Africa</span>
                    </h3>
                    <div className={`h-px flex-1 ${theme === 'light' ? 'bg-ottoman-200' : 'bg-ottoman-800'}`}></div>
                  </div>
                  <div className="grid auto-rows-fr grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                    {['Turkey', 'Egypt', 'Iraq', 'Israel', 'Jordan', 'Libya', 'Kuwait', 'Lebanon', 'Palestine', 'Saudi Arabia', 'Syria'].map((country) => (
                      <div
                        key={typeof country === 'string' ? country : country.name}
                        className={`group p-3 rounded-lg border transition-all cursor-pointer
                        ${theme === 'light' 
                          ? 'bg-ottoman-50 hover:bg-ottoman-100 border-ottoman-200 hover:border-ottoman-300' 
                          : 'bg-dark-600 hover:bg-dark-500 border-ottoman-800 hover:border-ottoman-700'}
                        ${typeof country === 'object' && country.wide ? 'sm:col-span-2' : ''}`}
                      >
                        <div className={`text-center font-medium ${theme === 'light' ? 'text-ottoman-900' : 'text-ottoman-100'}`}>
                          {typeof country === 'string' ? country : country.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Balkans */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className={`text-xl font-serif font-semibold ${theme === 'light' ? 'text-ottoman-900' : 'text-ottoman-100'}`}>
                      <span>Balkans</span>
                    </h3>
                    <div className={`h-px flex-1 ${theme === 'light' ? 'bg-ottoman-200' : 'bg-ottoman-800'}`}></div>
                  </div>
                  <div className="grid auto-rows-fr grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                    {['Albania', { name: 'Bosnia & Herzegovina', wide: true }, 'Bulgaria', 'Kosovo', 'Macedonia', 'Montenegro', 'Serbia'].map((country) => (
                      <div
                        key={typeof country === 'string' ? country : country.name}
                        className={`group p-3 rounded-lg border transition-all cursor-pointer
                        ${theme === 'light' 
                          ? 'bg-ottoman-50 hover:bg-ottoman-100 border-ottoman-200 hover:border-ottoman-300' 
                          : 'bg-dark-600 hover:bg-dark-500 border-ottoman-800 hover:border-ottoman-700'}
                        ${typeof country === 'object' && country.wide ? 'sm:col-span-2' : ''}`}
                      >
                        <div className={`text-center font-medium ${theme === 'light' ? 'text-ottoman-900' : 'text-ottoman-100'}`}>
                          {typeof country === 'string' ? country : country.name}
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
                          <span>Join Our Community Today</span>
          </h2>
          <p className={`text-lg ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-200'} max-w-2xl mx-auto mb-10`}>
            Connect with fellow collectors, track your collection, and explore the rich history of Ottoman banknotes
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              className="ottoman-button bg-ottoman-600 hover:bg-ottoman-700 text-white py-6 px-8 text-lg"
              onClick={() => navigate('/catalog')}
            >
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
    </div>
  );
};

export default Index;
