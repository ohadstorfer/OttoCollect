
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenSquare, Search } from 'lucide-react';
import ForumPostCard from '@/components/forum/ForumPostCard';
import { fetchForumPosts } from '@/services/forumService';
import { ForumPost } from '@/types/forum';
import { useAuth } from '@/context/AuthContext';

const Forum = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<ForumPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="page-title mb-4 sm:mb-0">Community Forum</h1>
        {user && (
          <Button 
            onClick={handleCreatePost} 
            className="flex-shrink-0"
          >
            <PenSquare className="mr-2 h-4 w-4" />
            Create Post
          </Button>
        )}
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="relative">
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

        <Tabs defaultValue="all" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Posts</TabsTrigger>
            {user && (
              <TabsTrigger value="my-posts">My Posts</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="all">
            {loading ? (
              <div className="text-center py-10">
                <p>Loading forum posts...</p>
              </div>
            ) : (
              <>
                {filteredPosts.length > 0 ? (
                  <div className="space-y-4">
                    {filteredPosts.map((post) => (
                      <ForumPostCard key={post.id} post={post} />
                    ))}
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
            <TabsContent value="my-posts">
              {loading ? (
                <div className="text-center py-10">
                  <p>Loading your posts...</p>
                </div>
              ) : (
                <>
                  {filteredPosts.filter(post => post.authorId === user.id).length > 0 ? (
                    <div className="space-y-4">
                      {filteredPosts
                        .filter(post => post.authorId === user.id)
                        .map((post) => (
                          <ForumPostCard key={post.id} post={post} />
                        ))}
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
  );
};

export default Forum;
