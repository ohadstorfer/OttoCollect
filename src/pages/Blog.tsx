import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenSquare, Search, ArrowLeft } from 'lucide-react';
import BlogPostCard from '@/components/blog/BlogPostCard';
import { fetchBlogPosts, checkUserDailyBlogLimit } from '@/services/blogService';
import { BlogPost } from '@/types/blog';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from "@/context/ThemeContext";
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import SEOHead from '@/components/seo/SEOHead';
import { SEO_CONFIG } from '@/config/seoConfig';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

interface Author {
  id: string;
  username: string;
  avatarUrl?: string;
  rank: string;
}

interface BlogPostWithAuthor extends Omit<BlogPost, 'author'> {
  author: Author;
}

const Blog = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation(['blog']);
  const { direction, currentLanguage } = useLanguage();
  const [posts, setPosts] = useState<BlogPostWithAuthor[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPostWithAuthor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const [hasReachedDailyLimit, setHasReachedDailyLimit] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);

  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);

  // Check if user is admin
  const isAdmin = user ? user.role === 'Super Admin' || user.role?.includes('Admin') : false;

  // Check if user is in limited ranks
  const isLimitedRank = user ? ['Newbie Collector', 'Beginner Collector', 'Mid Collector'].includes(user.rank || '') : false;

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      try {
        const fetchedPosts = await fetchBlogPosts();
        // Ensure all posts have the required rank property
        const postsWithAuthorRank = fetchedPosts.map(post => ({
          ...post,
          author: {
            ...post.author,
            rank: post.author.rank || 'Unknown' // Provide a default rank if missing
          }
        })) as BlogPostWithAuthor[];

        setPosts(postsWithAuthorRank);
        setFilteredPosts(postsWithAuthorRank);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  useEffect(() => {
    const checkDailyLimit = async () => {
      if (!user || !isLimitedRank) return;

      try {
        const { hasReachedLimit, dailyCount: count } = await checkUserDailyBlogLimit(user.id);
        setHasReachedDailyLimit(hasReachedLimit);
        setDailyCount(count);
      } catch (error) {
        console.error('Error checking daily limit:', error);
      }
    };

    checkDailyLimit();
  }, [user, isLimitedRank]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (term.trim() === '') {
      setFilteredPosts(posts);
    } else {
      const filtered = posts.filter(post =>
        post.title.toLowerCase().includes(term.toLowerCase()) ||
        post.content.toLowerCase().includes(term.toLowerCase()) ||
        (post.excerpt && post.excerpt.toLowerCase().includes(term.toLowerCase()))
      );
      setFilteredPosts(filtered);
    }
  };

  const handleCreatePost = () => {
    navigate('/create-blog-post');
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div>
      <SEOHead
        title={SEO_CONFIG.pages.blog.title}
        description={SEO_CONFIG.pages.blog.description}
        keywords={SEO_CONFIG.pages.blog.keywords}
      />
      <section className={`${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-600'} py-12 relative overflow-hidden mb-10`}>
        <div className="absolute inset-0 -z-10">
          <div className={`absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] ${theme === 'light'
            ? 'bg-ottoman-500/10 shadow-ottoman-300/20 ring-ottoman-400/10'
            : 'bg-dark-500/40 shadow-ottoman-900/20 ring-ottoman-900/10'
            } shadow-xl ring-1 ring-inset`} aria-hidden="true" />
        </div>

        <div className="container mx-auto px-4 relative z-10 flex items-center justify-center">

          <h1 className={`text-3xl md:text-4xl font-serif font-bold text-center ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} fade-bottom`}>
            <span>{tWithFallback('title', 'Blog')}</span>
          </h1>

        </div>
        <p className={`mt-4 text-center ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl mx-auto fade-bottom`}>
          {tWithFallback('subtitle', 'Discover insights, stories, and knowledge about banknote collecting')}
        </p>
      </section>

      <div className="page-container">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="all" className="mb-10">
            <div className="flex items-center justify-center gap-2 sm:gap-4">


              <div className="relative w-32 sm:w-64">
                <Search
                  className={`absolute ${direction === 'rtl' ? 'right-2.5' : 'left-2.5'} top-2.5 h-4 w-4 text-muted-foreground`}
                />
                <Input
                  type="search"
                  dir={direction === 'rtl' ? 'rtl' : 'ltr'}
                  placeholder={tWithFallback('search.placeholder', 'Search blog posts...')}
                  className={`${direction === 'rtl' ? 'pr-8 text-right' : 'pl-8 text-left'} text-sm`}
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>

              {user && isAdmin && (
                <Button
                  onClick={handleCreatePost}
                  className="flex-shrink-0 px-2 sm:px-4"
                  size="sm"
                  variant="outline"
                >
                  <PenSquare className="h-4 w-4" />
                  <span className="hidden sm:inline-block sm:ml-2">{tWithFallback('actions.post', 'Post')}</span>
                </Button>
              )}

              {user && hasReachedDailyLimit && (
                <div className="text-yellow-600 text-xs sm:text-sm">
                  {tWithFallback('status.dailyLimitReached', 'Daily Limit Reached')}
                </div>
              )}
            </div>

            {/* Daily activity warning for limited ranks */}
            {user && isLimitedRank && hasReachedDailyLimit && (
              <div className="mt-4 text-center">
                <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-md border border-red-200 dark:border-red-800 max-w-md mx-auto">
                  <p className="text-red-600 dark:text-red-400 text-sm">
                    {tWithFallback('limits.dailyLimitWarning', 'You have reached your daily limit of 3 blog activities (posts + comments).')}
                  </p>
                </div>
              </div>
            )}

            <TabsContent value="all" className="mt-8">
              {loading ? (
                <div className="text-center py-10 mb-20 ">
                  <p>{tWithFallback('status.loading', 'Loading blog posts...')}</p>
                </div>
              ) : (
                <>
                  {filteredPosts.length > 0 ? (
                    <div className="px-4">
                      <div className="columns-1 md:columns-2 lg:columns-3 gap-4 md:gap-6 [column-fill:_balance] w-full">
                        {filteredPosts.map((post) => (
                          <div
                            key={post.id}
                            className="break-inside-avoid mb-4 md:mb-6 transform transition-all duration-300 hover:scale-[1.02]"
                          >
                            <BlogPostCard post={post} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      {searchTerm ? (
                        <p>{tWithFallback('search.noResults', 'No blog posts found matching your search.')}</p>
                      ) : (
                        <p>{tWithFallback('search.noPostsYet', 'No blog posts yet. Be the first to create one!')}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            {user && (
              <TabsContent value="my-posts" className="mt-8">
                {loading ? (
                  <div className="text-center py-10">
                    <p>{tWithFallback('status.loadingMyPosts', 'Loading your posts...')}</p>
                  </div>
                ) : (
                  <>
                    {filteredPosts.filter(post => post.authorId === user.id).length > 0 ? (
                      <div className="px-4">
                        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 md:gap-6 [column-fill:_balance] w-full">
                          {filteredPosts
                            .filter(post => post.authorId === user.id)
                            .map((post) => (
                              <div
                                key={post.id}
                                className="break-inside-avoid mb-4 md:mb-6 transform transition-all duration-300 hover:scale-[1.02]"
                              >
                                <BlogPostCard post={post} />
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <p>{tWithFallback('status.noMyPosts', 'You haven\'t created any blog posts yet.')}</p>
                        {isAdmin && (
                          <Button
                            onClick={handleCreatePost}
                            variant="outline"
                            className="mt-4"
                          >
                            {tWithFallback('actions.createFirstPost', 'Create Your First Post')}
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Blog;