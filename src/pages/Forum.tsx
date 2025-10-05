import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenSquare, Search, ArrowLeft, Users, MessageSquare, TrendingUp, Award } from 'lucide-react';
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

      {/* Static SEO Content - Always visible to crawlers */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <Users className="h-8 w-8 mx-auto mb-4 text-ottoman-600" />
              <h3 className="text-lg font-semibold mb-2">Active Community</h3>
              <p className="text-gray-600 dark:text-gray-300">Connect with fellow Ottoman Empire banknote collectors from around the world.</p>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-4 text-ottoman-600" />
              <h3 className="text-lg font-semibold mb-2">Expert Discussions</h3>
              <p className="text-gray-600 dark:text-gray-300">Share knowledge about authentication, grading, and historical context.</p>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <TrendingUp className="h-8 w-8 mx-auto mb-4 text-ottoman-600" />
              <h3 className="text-lg font-semibold mb-2">Market Insights</h3>
              <p className="text-gray-600 dark:text-gray-300">Stay updated on market trends and investment opportunities.</p>
            </div>
          </div>

          {/* Forum Topics */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-center">Popular Discussion Topics</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Award className="h-5 w-5 mr-2 text-ottoman-600" />
                  Authentication & Grading
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Learn how to authenticate Ottoman Empire banknotes, identify watermarks, and grade condition properly.
                </p>
                <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <li>• Watermark identification techniques</li>
                  <li>• Security feature verification</li>
                  <li>• Professional grading standards</li>
                  <li>• Counterfeit detection methods</li>
                </ul>
              </div>
              <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Award className="h-5 w-5 mr-2 text-ottoman-600" />
                  Historical Context
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Explore the rich history behind Ottoman Empire currency and its successor states.
                </p>
                <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <li>• Ottoman Empire monetary history</li>
                  <li>• Successor state currencies</li>
                  <li>• Historical banknote designs</li>
                  <li>• Cultural significance</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Forum Guidelines */}
          <div className="mb-12 p-6 bg-ottoman-50 dark:bg-gray-800 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Forum Guidelines</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Posting Guidelines</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Be respectful and constructive</li>
                  <li>• Use descriptive titles</li>
                  <li>• Include relevant images when possible</li>
                  <li>• Search before posting duplicate topics</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Content Quality</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Share authentic information only</li>
                  <li>• Provide sources when possible</li>
                  <li>• Help fellow collectors</li>
                  <li>• Report suspicious content</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  placeholder={tWithFallback('search.placeholder', 'Search forum posts...')}
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
                        <div className="text-center py-10">
                          <p className="text-lg font-semibold mb-4">{tWithFallback('search.noPostsYet', 'No forum posts yet. Be the first to create one!')}</p>
                          <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Join our community of Ottoman Empire banknote collectors and start the conversation!
                          </p>
                          {!user && (
                            <Button onClick={() => navigate('/auth')} variant="outline">
                              Sign In to Post
                            </Button>
                          )}
                        </div>
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
