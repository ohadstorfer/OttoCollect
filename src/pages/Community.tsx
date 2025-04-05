
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { MOCK_FORUM_THREADS, MOCK_BLOG_POSTS } from "@/lib/constants";
import { ForumThread, BlogPost } from "@/types";
import { MessageSquare, Calendar, User, Clock, ChevronRight, Bookmark, ThumbsUp, MessagesSquare, PenSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const Community = () => {
  const { user } = useAuth();
  const [forumThreads, setForumThreads] = useState<ForumThread[]>(MOCK_FORUM_THREADS);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(MOCK_BLOG_POSTS);
  const [activeTab, setActiveTab] = useState("forum");
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
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
    <div className="min-h-screen bg-dark-500 animate-fade-in">
      {/* Header */}
      <section className="bg-dark-600 py-12 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] bg-dark-500/40 shadow-xl shadow-ottoman-900/20 ring-1 ring-inset ring-ottoman-900/10"
            aria-hidden="true"
          />
        </div>
        
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-center text-parchment-500 reveal fade-bottom">
            Community
          </h1>
          <p className="mt-4 text-center text-ottoman-300 max-w-2xl mx-auto reveal fade-bottom" style={{ animationDelay: '100ms' }}>
            Connect with fellow collectors, share knowledge, and stay updated
          </p>
        </div>
      </section>
      
      {/* Community Content */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          {/* Tabs */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 reveal fade-bottom">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full md:w-auto"
            >
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="forum" className="flex-1 md:flex-initial">
                  Forum
                </TabsTrigger>
                <TabsTrigger value="blog" className="flex-1 md:flex-initial">
                  Blog
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-3 mt-4 md:mt-0 w-full md:w-auto">
              {user && activeTab === "forum" && (
                <Button 
                  className="ottoman-button w-full md:w-auto"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  New Thread
                </Button>
              )}
              
              {user && activeTab === "blog" && user.rank.includes("Admin") && (
                <Button 
                  className="ottoman-button w-full md:w-auto"
                >
                  <PenSquare className="h-4 w-4 mr-2" />
                  New Post
                </Button>
              )}
            </div>
          </div>
          
          {/* Forum Tab */}
          <TabsContent value="forum" className="space-y-6">
            {forumThreads.length > 0 ? (
              <>
                {forumThreads.map((thread, index) => (
                  <div 
                    key={thread.id}
                    className={cn(
                      "bg-dark-600/50 border border-ottoman-900/20 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-ottoman-800/40 reveal",
                      index % 2 === 0 ? "fade-right" : "fade-left"
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <h3 className="text-xl font-serif font-semibold text-ottoman-100">
                          <Link 
                            to={`/community/forum/${thread.id}`}
                            className="hover:text-ottoman-300 transition-colors"
                          >
                            {thread.title}
                          </Link>
                        </h3>
                        
                        <div className="flex items-center gap-4 text-ottoman-400 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(thread.createdAt)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <MessagesSquare className="h-4 w-4" />
                            <span>{thread.replies.length} replies</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-ottoman-200 mb-6 line-clamp-2">
                        {thread.content}
                      </div>
                      
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-ottoman-700 flex items-center justify-center overflow-hidden">
                            {thread.author.id ? (
                              <img src="/placeholder.svg" alt={thread.author.username} className="w-full h-full object-cover" />
                            ) : (
                              <User className="h-5 w-5 text-ottoman-300" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ottoman-200">{thread.author.username}</p>
                            <Badge variant="user" rank={thread.author.rank} className="mt-1" />
                          </div>
                        </div>
                        
                        <Link
                          to={`/community/forum/${thread.id}`}
                          className="flex items-center text-ottoman-400 hover:text-ottoman-200 text-sm transition-colors"
                        >
                          Read More
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-center mt-8">
                  <Button variant="outline" className="border-ottoman-700 text-ottoman-200">
                    Load More
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <MessageSquare className="h-16 w-16 mx-auto text-ottoman-600/30 mb-4" />
                <h3 className="text-2xl font-serif font-semibold text-ottoman-200 mb-2">
                  No forum threads yet
                </h3>
                <p className="text-ottoman-400 mb-6">
                  Be the first to start a conversation
                </p>
                <Button className="ottoman-button">
                  Create Thread
                </Button>
              </div>
            )}
          </TabsContent>
          
          {/* Blog Tab */}
          <TabsContent value="blog">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content - Latest Posts */}
              <div className="lg:col-span-2 space-y-8">
                {blogPosts.length > 0 ? (
                  <>
                    {blogPosts.map((post, index) => (
                      <div 
                        key={post.id}
                        className="bg-dark-600/50 border border-ottoman-900/20 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-ottoman-800/40 reveal fade-bottom"
                        style={{ animationDelay: `${index * 150}ms` }}
                      >
                        <div className="aspect-[16/9] overflow-hidden">
                          <img
                            src={post.mainImageUrl || '/placeholder.svg'}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                          />
                        </div>
                        
                        <div className="p-6">
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Badge variant="secondary">Ottoman History</Badge>
                            <Badge variant="primary">Educational</Badge>
                          </div>
                          
                          <h3 className="text-2xl font-serif font-semibold text-ottoman-100 mb-2">
                            <Link 
                              to={`/community/blog/${post.id}`}
                              className="hover:text-ottoman-300 transition-colors"
                            >
                              {post.title}
                            </Link>
                          </h3>
                          
                          <p className="text-ottoman-200 mb-4 line-clamp-3">
                            {post.excerpt}
                          </p>
                          
                          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pt-4 border-t border-ottoman-900/30">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-ottoman-700 flex items-center justify-center overflow-hidden">
                                {post.author.id ? (
                                  <img src="/placeholder.svg" alt={post.author.username} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="h-5 w-5 text-ottoman-300" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-ottoman-200">{post.author.username}</p>
                                <Badge variant="user" rank={post.author.rank} className="mt-1" />
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-ottoman-400 text-sm">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(post.createdAt)}</span>
                              </div>
                              
                              <Link
                                to={`/community/blog/${post.id}`}
                                className="flex items-center text-ottoman-400 hover:text-ottoman-200 text-sm transition-colors"
                              >
                                Read More
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-20">
                    <PenSquare className="h-16 w-16 mx-auto text-ottoman-600/30 mb-4" />
                    <h3 className="text-2xl font-serif font-semibold text-ottoman-200 mb-2">
                      No blog posts yet
                    </h3>
                    <p className="text-ottoman-400 mb-6">
                      Blog posts will appear here when published
                    </p>
                  </div>
                )}
              </div>
              
              {/* Sidebar */}
              <div className="space-y-8">
                {/* About */}
                <div className="bg-dark-600/50 border border-ottoman-900/20 rounded-lg p-6 reveal fade-left">
                  <h3 className="text-xl font-serif font-semibold text-ottoman-100 mb-4">
                    About the Blog
                  </h3>
                  <p className="text-ottoman-300 text-sm mb-4">
                    The Ottoman Archive Blog features articles by knowledgeable collectors and historians about Ottoman banknote history, authentication techniques, collecting tips, and more.
                  </p>
                  <p className="text-ottoman-400 text-sm">
                    Blog posts are written by experienced collectors with Advanced Collector rank or administrators.
                  </p>
                </div>
                
                {/* Categories */}
                <div className="bg-dark-600/50 border border-ottoman-900/20 rounded-lg p-6 reveal fade-left" style={{ animationDelay: '100ms' }}>
                  <h3 className="text-xl font-serif font-semibold text-ottoman-100 mb-4">
                    Categories
                  </h3>
                  <ul className="space-y-2">
                    <li>
                      <Link 
                        to="/community/blog/category/history" 
                        className="flex items-center justify-between text-ottoman-300 hover:text-ottoman-100 transition-colors"
                      >
                        <span>Ottoman History</span>
                        <Badge variant="secondary">5</Badge>
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/community/blog/category/authentication" 
                        className="flex items-center justify-between text-ottoman-300 hover:text-ottoman-100 transition-colors"
                      >
                        <span>Authentication</span>
                        <Badge variant="secondary">3</Badge>
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/community/blog/category/collecting" 
                        className="flex items-center justify-between text-ottoman-300 hover:text-ottoman-100 transition-colors"
                      >
                        <span>Collecting Tips</span>
                        <Badge variant="secondary">2</Badge>
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/community/blog/category/regional" 
                        className="flex items-center justify-between text-ottoman-300 hover:text-ottoman-100 transition-colors"
                      >
                        <span>Regional Issues</span>
                        <Badge variant="secondary">4</Badge>
                      </Link>
                    </li>
                  </ul>
                </div>
                
                {/* Popular Posts */}
                <div className="bg-dark-600/50 border border-ottoman-900/20 rounded-lg p-6 reveal fade-left" style={{ animationDelay: '200ms' }}>
                  <h3 className="text-xl font-serif font-semibold text-ottoman-100 mb-4">
                    Popular Posts
                  </h3>
                  <div className="space-y-4">
                    {blogPosts.map((post) => (
                      <Link 
                        key={post.id}
                        to={`/community/blog/${post.id}`}
                        className="flex gap-3 group"
                      >
                        <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                          <img 
                            src={post.mainImageUrl || '/placeholder.svg'} 
                            alt={post.title} 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-ottoman-200 group-hover:text-ottoman-100 line-clamp-2">
                            {post.title}
                          </h4>
                          <p className="text-xs text-ottoman-400 mt-1">
                            {formatDate(post.createdAt)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
                
                {/* Subscribe */}
                <div className="bg-ottoman-700/30 border border-ottoman-700/30 rounded-lg p-6 reveal fade-left" style={{ animationDelay: '300ms' }}>
                  <h3 className="text-xl font-serif font-semibold text-ottoman-100 mb-2">
                    Subscribe to Updates
                  </h3>
                  <p className="text-ottoman-300 text-sm mb-4">
                    Get notified when new articles are published
                  </p>
                  <form className="space-y-4">
                    <input
                      type="email"
                      placeholder="Your email address"
                      className="w-full ottoman-input"
                    />
                    <Button className="ottoman-button w-full">
                      Subscribe
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </section>
    </div>
  );
};

export default Community;
