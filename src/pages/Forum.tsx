import React, { useEffect, useState } from 'react';
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
  const [posts, setPosts] = useState<ForumPostWithAuthor[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<ForumPostWithAuthor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [hasReachedDailyLimit, setHasReachedDailyLimit] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);

  // Check if user is in limited ranks
  const isLimitedRank = user ? ['Newbie Collector', 'Beginner Collector', 'Mid Collector'].includes(user.rank || '') : false;

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      try {
        const fetchedPosts = await fetchForumPosts();
        setPosts(fetchedPosts);
        setFilteredPosts(fetchedPosts);
      } catch (error) {
        console.error('Error fetching forum posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
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
    } else {
      const filtered = posts.filter(post =>
        post.title.toLowerCase().includes(term.toLowerCase()) ||
        post.content.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredPosts(filtered);
    }
  };

  const handleCreatePost = () => {
    navigate('/community/forum/new');
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div>
      <section className={`${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-600'} py-12 relative overflow-hidden`}>
        <div className="absolute inset-0 -z-10">
          <div className={`absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] ${theme === 'light'
              ? 'bg-ottoman-500/10 shadow-ottoman-300/20 ring-ottoman-400/10'
              : 'bg-dark-500/40 shadow-ottoman-900/20 ring-ottoman-900/10'
            } shadow-xl ring-1 ring-inset`} aria-hidden="true" />
        </div>

        <div className="container mx-auto px-4 relative z-10 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'}`}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className={`text-3xl md:text-4xl font-serif font-bold text-center ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} fade-bottom`}>
            Forum
          </h1>
          
        </div>
        <p className={`mt-4 text-center ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl mx-auto fade-bottom`}>
          Discuss banknotes and collecting strategies
          </p>
      </section>

      <div className="page-container">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="all" className="mb-10">
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <TabsList className="shrink-0">
                <TabsTrigger value="all">All Posts</TabsTrigger>
                {user && (
                  <TabsTrigger value="my-posts">My Posts</TabsTrigger>
                )}
              </TabsList>

              <div className="relative w-32 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-8 text-sm"
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>

              {user && !isUserBlocked && !hasReachedDailyLimit && (
                <Button
                  onClick={handleCreatePost}
                  className="flex-shrink-0 px-2 sm:px-4"
                  size="sm"
                  variant="outline"
                >
                  <PenSquare className="h-4 w-4" />
                  <span className="hidden sm:inline-block sm:ml-2">Post</span>
                </Button>
              )}

              {user && isUserBlocked && (
                <div className="text-red-600 text-xs sm:text-sm">
                  Blocked
                </div>
              )}

              {user && hasReachedDailyLimit && (
                <div className="text-yellow-600 text-xs sm:text-sm">
                  Daily Limit Reached
                </div>
              )}
            </div>

            {/* Daily activity warning for limited ranks */}
            {user && isLimitedRank && hasReachedDailyLimit &&(
              <div className="mt-4 text-center">
                
                  <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-md border border-red-200 dark:border-red-800 max-w-md mx-auto">
                    <p className="text-red-600 dark:text-red-400 text-sm">
                      You have reached your daily limit of 6 forum activities (posts + comments).
                    </p>
                  </div>
                 
              </div>
            )}

            <TabsContent value="all" className="mt-8">
              {loading ? (
                <div className="text-center py-10">
                  <p>Loading forum posts...</p>
                </div>
              ) : (
                <>
                  {filteredPosts.length > 0 ? (
                    <div className="w-full md:max-w-lg mx-auto px-4">
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 items-start">
                        {filteredPosts.map((post) => {
                          console.log(`Post ${post.id} comment count: ${post.commentCount}`);
                          return <ForumPostCard key={post.id} post={post} />;
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      {searchTerm ? (
                        <p>No posts found matching your search.</p>
                      ) : (
                        <p>No forum posts yet. Be the first to create one!</p>
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
                    <p>Loading your posts...</p>
                  </div>
                ) : (
                  <>
                    {filteredPosts.filter(post => post.authorId === user.id).length > 0 ? (
                      <div className="w-full md:max-w-lg mx-auto px-4">
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 items-start">
                        {filteredPosts
                          .filter(post => post.authorId === user.id)
                          .map((post) => {
                            console.log(`User post ${post.id} comment count: ${post.commentCount}`);
                            return <ForumPostCard key={post.id} post={post} />;
                          })}
                      </div>
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <p>You haven't created any posts yet.</p>
                        <Button
                          onClick={handleCreatePost}
                          variant="outline"
                          className="mt-4"
                        >
                          Create Your First Post
                        </Button>
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

export default Forum;
