import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenSquare, Search, ArrowLeft } from 'lucide-react';
import ForumPostCard from '@/components/forum/ForumPostCard';
import { fetchForumPosts } from '@/services/forumService';
import { ForumPost } from '@/types/forum';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from "@/context/ThemeContext";
import { supabase } from '@/integrations/supabase/client';


const Forum = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<ForumPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const [isUserBlocked, setIsUserBlocked] = useState(false);

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
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <TabsList className="shrink-0">
                <TabsTrigger value="all">All Posts</TabsTrigger>
                {user && (
                  <TabsTrigger value="my-posts">My Posts</TabsTrigger>
                )}
              </TabsList>

              {user && !isUserBlocked && (
                <Button
                  onClick={handleCreatePost}
                  className="flex-shrink-0"
                >
                  <PenSquare className="mr-2 h-4 w-4" />
                  Create Post
                </Button>
              )}

              {user && isUserBlocked && (
                <div className="text-red-600 text-sm">
                  You have been blocked from creating posts
                </div>
              )}

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search forum posts..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>



            </div>




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
