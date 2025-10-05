import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenSquare, Search, ArrowLeft } from 'lucide-react';
import ForumPostCard from '@/components/forum/ForumPostCard';
import { fetchForumPosts, checkUserDailyForumLimit } from '@/services/forumService';
import { ForumPost } from '@/types/forum';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from "@/context/ThemeContext";
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import ForumPostCardAnnouncements from '@/components/forum/ForumPostCardAnnouncements';
import { CreatePostDialog } from '@/components/forum/CreatePostDialog';
import { CreateAnnouncementDialog } from '@/components/forum/CreateAnnouncementDialog';
import SEOHead from '@/components/seo/SEOHead';
import Canonical from '@/components/seo/Canonical';
import { SEO_CONFIG } from '@/config/seoConfig';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

interface Author {
  id: string;
  username: string;
  avatarUrl?: string;
  rank: string;
}

interface ForumPostWithAuthor extends Omit<ForumPost, 'author'> {
  author: Author;
}

const Forum = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation(['forum']);
  const { direction } = useLanguage();
  const [posts, setPosts] = useState<ForumPostWithAuthor[]>([]);
  const [announcements, setAnnouncements] = useState<ForumPostWithAuthor[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<ForumPostWithAuthor[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<ForumPostWithAuthor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [hasReachedDailyLimit, setHasReachedDailyLimit] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [showCreatePostDialog, setShowCreatePostDialog] = useState(false);
  const [showCreateAnnouncementDialog, setShowCreateAnnouncementDialog] = useState(false);

  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);

  // Check if user is in limited ranks
  const isLimitedRank = user ? ['Newbie Collector', 'Beginner Collector', 'Mid Collector'].includes(user.rank || '') : false;

  // Check if user is Super Admin
  const isSuperAdmin = user?.role === 'Super Admin';

  useEffect(() => {
    const loadPostsAndAnnouncements = async () => {
      setLoading(true);
      try {
        const fetchedPosts = await fetchForumPosts();
        // Ensure all posts have the required rank property
        const postsWithAuthorRank = fetchedPosts.map(post => ({
          ...post,
          author: {
            ...post.author,
            rank: post.author.rank || 'Unknown' // Provide a default rank if missing
          }
        })) as ForumPostWithAuthor[];

        setPosts(postsWithAuthorRank);
        setFilteredPosts(postsWithAuthorRank);

        // Load announcements
        const { data: announcementsData, error } = await supabase
          .from('forum_announcements')
          .select(`
            *,
            original_language,
            author:profiles!forum_announcements_author_id_fkey(id, username, avatar_url, rank)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch comment counts for each announcement
        const announcementsWithCommentCounts = await Promise.all(
          (announcementsData || []).map(async (announcement) => {
            // Get comment count for this announcement
            const { count: commentCount } = await supabase
              .from('forum_announcement_comments')
              .select('*', { count: 'exact', head: true })
              .eq('announcement_id', announcement.id);

            return {
              ...announcement,
              commentCount: commentCount || 0
            };
          })
        );

        const announcementsWithAuthorRank = announcementsWithCommentCounts.map(announcement => {
          return {
            id: announcement.id,
            title: announcement.title,
            content: announcement.content,
            authorId: announcement.author_id,
            author_id: announcement.author_id,
            author: {
              ...announcement.author,
              avatarUrl: announcement.author.avatar_url, // Fix: map avatar_url to avatarUrl
              rank: announcement.author.rank || 'Unknown'
            },
            imageUrls: announcement.image_urls || [],
            created_at: announcement.created_at,
            updated_at: announcement.updated_at,
            commentCount: announcement.commentCount, // Use fetched comment count
            original_language: announcement.original_language,
          };
        }) as ForumPostWithAuthor[];

        setAnnouncements(announcementsWithAuthorRank);
        setFilteredAnnouncements(announcementsWithAuthorRank);
      } catch (error) {
        console.error('Error fetching forum posts and announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPostsAndAnnouncements();
  }, []);

  useEffect(() => {
    const checkUserBlockStatus = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_forum_blocked')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setIsUserBlocked(data?.is_forum_blocked || false);
      } catch (error) {
        console.error('Error checking user block status:', error);
      }
    };

    checkUserBlockStatus();
  }, [user]);

  useEffect(() => {
    const checkDailyLimit = async () => {
      if (!user || !isLimitedRank) return;

      try {
        const { hasReachedLimit, dailyCount: count } = await checkUserDailyForumLimit(user.id);
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
      setFilteredAnnouncements(announcements);
    } else {
      // Search in both posts and announcements
      const filteredPosts = posts.filter(post =>
        post.title.toLowerCase().includes(term.toLowerCase()) ||
        post.content.toLowerCase().includes(term.toLowerCase())
      );

      const filteredAnnouncements = announcements.filter(announcement =>
        announcement.title.toLowerCase().includes(term.toLowerCase()) ||
        announcement.content.toLowerCase().includes(term.toLowerCase())
      );

      // Set filtered results
      setFilteredPosts(filteredPosts);
      setFilteredAnnouncements(filteredAnnouncements);
    }
  };

  const handleCreatePost = () => {
    setShowCreatePostDialog(true);
  };

  const handleCreateAnnouncement = () => {
    setShowCreateAnnouncementDialog(true);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handlePostCreated = (postId: string) => {
    // Refresh the posts list
    window.location.reload();
  };

  const handleAnnouncementCreated = (announcementId: string) => {
    // Refresh the announcements list
    window.location.reload();
  };

  return (
    <div>
      <Canonical />
      <SEOHead
        title={SEO_CONFIG.pages.forum.title}
        description={SEO_CONFIG.pages.forum.description}
        keywords={SEO_CONFIG.pages.forum.keywords}
        type="website"
        canonical="https://ottocollect.com/forum/"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "OttoCollect Forum",
          "description": "Join the OttoCollect community of Ottoman Empire banknote collectors. Discuss rare Turkish currency, share authentication tips, and connect with enthusiasts.",
          "url": "https://ottocollect.com/forum/",
          "mainEntity": {
            "@type": "DiscussionForumPosting",
            "name": "Ottoman Banknote Collectors Forum",
            "description": "Community discussion forum for Ottoman Empire banknote collectors"
          },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://ottocollect.com/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Forum",
                "item": "https://ottocollect.com/forum/"
              }
            ]
          }
        }}
      />
      
      {/* Hidden SEO Content - Visible to crawlers but not users */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
        <h1>OttoCollect Forum - Ottoman Empire Banknote Collectors Community</h1>
        <h2>Ottoman Banknote Discussion Forum</h2>
        <p>Join our community of Ottoman Empire banknote collectors. Discuss authentication, grading, historical context, and market trends. Connect with fellow numismatists and share your expertise.</p>
        
        <h3>Popular Forum Topics</h3>
        <ul>
          <li>Ottoman Empire banknote authentication</li>
          <li>Turkish currency grading and condition</li>
          <li>Historical banknote identification</li>
          <li>Watermark verification techniques</li>
          <li>Counterfeit detection methods</li>
          <li>Market value and pricing</li>
          <li>Preservation and storage tips</li>
          <li>Rare Ottoman banknotes</li>
          <li>Successor state currencies</li>
          <li>Investment opportunities</li>
        </ul>
        
        <h3>Forum Features</h3>
        <ul>
          <li>Expert collector discussions</li>
          <li>Authentication help and tips</li>
          <li>Market insights and trends</li>
          <li>Historical context sharing</li>
          <li>Community networking</li>
          <li>Buy and sell discussions</li>
        </ul>
        
        <p>Our forum is dedicated to serious collectors of Ottoman Empire banknotes, Turkish lira paper money, and historical currency from successor states. Share your knowledge, ask questions, and connect with fellow enthusiasts.</p>
        
        <h3>Ottoman Empire Banknote Collecting</h3>
        <p>Learn about Ottoman Empire banknotes, Turkish lira paper money, historical currency, rare banknotes, collector banknotes, numismatics, vintage paper money, and authentic Ottoman currency. Our community discusses authentication, grading, watermarks, security features, and market values.</p>
        
        <h3>Forum Categories</h3>
        <ul>
          <li>General Discussion</li>
          <li>Authentication Help</li>
          <li>Market Discussion</li>
          <li>Historical Context</li>
          <li>Buy and Sell</li>
          <li>New Collector Help</li>
          <li>Expert Advice</li>
        </ul>
        
        <h3>Ottoman Empire Banknote Resources</h3>
        <p>Access expert knowledge about Ottoman Empire banknotes, Turkish lira currency, historical paper money, rare collectibles, numismatic authentication, grading standards, watermark identification, security features, market values, investment opportunities, and preservation techniques.</p>
        
        <h3>Community Benefits</h3>
        <ul>
          <li>Connect with expert collectors</li>
          <li>Learn authentication techniques</li>
          <li>Share market insights</li>
          <li>Get grading help</li>
          <li>Discover rare finds</li>
          <li>Network with enthusiasts</li>
        </ul>
        
        <h3>Ottoman Empire Currency History</h3>
        <p>Explore the rich history of Ottoman Empire banknotes, Turkish lira evolution, successor state currencies, Palestine Mandate banknotes, Syria historical currency, Lebanon vintage banknotes, Iraq Ottoman paper money, Jordan historical currency, Egypt Ottoman banknotes, Greece Ottoman currency, Bulgaria historical banknotes, and Israel currency development.</p>
        
        <h3>Collector Resources</h3>
        <p>Find information about Ottoman banknote values, Turkish currency prices, historical paper money worth, rare Ottoman banknotes for sale, authentic Turkish currency, vintage Ottoman Empire money, collector banknote prices, numismatic investment, and paper money collecting tips.</p>
        
        <h3>Ottoman Empire Banknote Community</h3>
        <p>Join thousands of collectors discussing Ottoman Empire banknotes, Turkish lira paper money, historical currency, rare banknotes, numismatics, authentication, grading, watermarks, security features, market values, investment opportunities, and preservation techniques. Our active community shares knowledge, helps with authentication, and connects collectors worldwide.</p>
        
        <h3>Forum Discussion Topics</h3>
        <ul>
          <li>Ottoman Empire banknote authentication and verification</li>
          <li>Turkish lira paper money grading and condition assessment</li>
          <li>Historical banknote identification and research</li>
          <li>Watermark verification techniques and security features</li>
          <li>Counterfeit detection methods and authentication</li>
          <li>Market value analysis and pricing trends</li>
          <li>Preservation and storage techniques for paper money</li>
          <li>Rare Ottoman banknotes and unique finds</li>
          <li>Successor state currencies and historical context</li>
          <li>Investment opportunities in numismatic collecting</li>
        </ul>
      </div>
      
      <section className={`${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-600'} py-12 relative overflow-hidden mb-10`}>
        <div className="absolute inset-0 -z-10">
          <div className={`absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] ${theme === 'light'
            ? 'bg-ottoman-500/10 shadow-ottoman-300/20 ring-ottoman-400/10'
            : 'bg-dark-500/40 shadow-ottoman-900/20 ring-ottoman-900/10'
            } shadow-xl ring-1 ring-inset`} aria-hidden="true" />
        </div>

        <div className="container mx-auto px-4 relative z-10 flex items-center justify-center">

          <h1 className={`text-3xl md:text-4xl font-serif font-bold text-center ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} fade-bottom`}>
            <span>{tWithFallback('title', 'Forum')}</span>
          </h1>

        </div>
        <p className={`mt-4 text-center ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl mx-auto fade-bottom`}>
          {tWithFallback('subtitle', 'Discuss banknotes and collecting strategies')}
        </p>
      </section>

      <div className="page-container">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="all" className="mb-10">
            <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
              <TabsList className="shrink-0">
                <TabsTrigger value="all">{tWithFallback('tabs.allPosts', 'All Posts')}</TabsTrigger>
                {user && (
                  <TabsTrigger value="my-posts">{tWithFallback('tabs.myPosts', 'My Posts')}</TabsTrigger>
                )}
              </TabsList>

              <div className="relative w-32 sm:w-64">
                <Search className={`absolute ${direction === 'rtl' ? 'right-2.5' : 'left-2.5'} top-2.5 h-4 w-4 text-muted-foreground`} />
                <Input
                  type="search"
                  dir={direction === 'rtl' ? 'rtl' : 'ltr'}
                  placeholder={tWithFallback('search.placeholder', 'Search blog posts...')}
                  className={`${direction === 'rtl' ? 'pr-8 text-right' : 'pl-8 text-left'} text-sm`}
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>

              {/* Action Buttons - Better mobile layout */}
              <div className="flex gap-2 flex-shrink-0">
                {user && !isUserBlocked && !hasReachedDailyLimit && (
                  <Button
                    onClick={handleCreatePost}
                    className="px-2 sm:px-4"
                    size="sm"
                    variant="outline"
                  >
                    <PenSquare className="h-4 w-4" />
                    <span className={!isSuperAdmin ? "hidden sm:inline-block sm:ml-2" : "ml-2"}>{tWithFallback('actions.post', 'Post')}</span>
                  </Button>
                )}

                {user && isSuperAdmin && !isUserBlocked && !hasReachedDailyLimit && (
                  <Button
                    onClick={handleCreateAnnouncement}
                    className="px-2 sm:px-4"
                    size="sm"
                    variant="outline"
                  >
                    <PenSquare className="h-4 w-4" />
                    <span className={!isSuperAdmin ? "hidden sm:inline-block sm:ml-2" : "ml-2"}>{tWithFallback('actions.announcement', 'Announcement')}</span>
                  </Button>
                )}
              </div>

              {user && isUserBlocked && (
                <div className="text-red-600 text-xs sm:text-sm">
                  {tWithFallback('status.blocked', 'Blocked')}
                </div>
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
                    {tWithFallback('limits.dailyLimitWarning', 'You have reached your daily limit of 6 forum activities (posts + comments).')}
                  </p>
                </div>
              </div>
            )}

            <TabsContent value="all" className="mt-8">
              {loading ? (
                <div className="text-center py-10 mb-20 ">
                  <p>{tWithFallback('status.loading', 'Loading forum posts...')}</p>
                </div>
              ) : (
                <>
                  {(filteredAnnouncements.length > 0 || filteredPosts.length > 0) ? (
                    <div className="max-w-4xl mx-auto">
                      <div className="space-y-0">
                        {/* Render announcements first */}
                        {filteredAnnouncements.map((announcement) => (
                          <ForumPostCardAnnouncements key={`announcement-${announcement.id}`} post={announcement} />
                        ))}

                        {/* Render regular posts */}
                        {filteredPosts.map((post) => (
                          <ForumPostCard key={post.id} post={post} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      {searchTerm ? (
                        <p>{tWithFallback('search.noResults', 'No posts or announcements found matching your search.')}</p>
                      ) : (
                        <p>{tWithFallback('search.noPostsYet', 'No forum posts yet. Be the first to create one!')}</p>
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
                    {(filteredPosts.filter(post => post.authorId === user.id).length > 0 ||
                      filteredAnnouncements.filter(announcement => announcement.authorId === user.id).length > 0) ? (
                      <div className="max-w-4xl mx-auto">
                        <div className="space-y-0">
                          {/* Render user's announcements first */}
                          {filteredAnnouncements
                            .filter(announcement => announcement.authorId === user.id)
                            .map((announcement) => (
                              <ForumPostCardAnnouncements key={`my-announcement-${announcement.id}`} post={announcement} />
                            ))}

                          {/* Render user's posts */}
                          {filteredPosts
                            .filter(post => post.authorId === user.id)
                            .map((post) => (
                              <ForumPostCard key={`my-post-${post.id}`} post={post} />
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <p>{tWithFallback('status.noMyPosts', 'You haven\'t created any posts or announcements yet.')}</p>
                        <div className="flex gap-2 justify-center mt-4">
                          <Button
                            onClick={handleCreatePost}
                            variant="outline"
                          >
                            {tWithFallback('actions.createFirstPost', 'Create Your First Post')}
                          </Button>
                          {isSuperAdmin && (
                            <Button
                              onClick={handleCreateAnnouncement}
                              variant="outline"
                            >
                              {tWithFallback('actions.createAnnouncement', 'Create Announcement')}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={showCreatePostDialog}
        onOpenChange={setShowCreatePostDialog}
        onPostCreated={handlePostCreated}
      />

      {/* Create Announcement Dialog */}
      <CreateAnnouncementDialog
        open={showCreateAnnouncementDialog}
        onOpenChange={setShowCreateAnnouncementDialog}
        onAnnouncementCreated={handleAnnouncementCreated}
      />
    </div>
  );
};

export default Forum;
