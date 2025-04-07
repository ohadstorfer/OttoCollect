
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchForumPosts } from "@/services/forumService";
import ForumPostCard from "@/components/forum/ForumPostCard";
import { ForumPost } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { PlusCircle, Search, MessageCircle, SortAsc, SortDesc } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Forum() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        const fetchedPosts = await fetchForumPosts();
        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Error loading forum posts:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load forum posts. Please try again later.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [toast]);

  // Filter and sort posts
  const filteredPosts = posts
    .filter(post => 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });

  return (
    <div className="container py-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Community Forum</h1>
          <p className="text-muted-foreground mt-1">
            Share knowledge and connect with other collectors
          </p>
        </div>

        {user && (
          <Button onClick={() => navigate("/community/forum/new")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Post
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              {sortOrder === "newest" ? (
                <SortDesc className="h-4 w-4" />
              ) : (
                <SortAsc className="h-4 w-4" />
              )}
              {sortOrder === "newest" ? "Newest first" : "Oldest first"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortOrder("newest")}>
              <SortDesc className="h-4 w-4 mr-2" />
              Newest first
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder("oldest")}>
              <SortAsc className="h-4 w-4 mr-2" />
              Oldest first
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="ottoman-card p-8 text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-ottoman-500 opacity-60" />
          <h3 className="text-xl font-medium mb-3">No posts found</h3>
          
          {searchQuery ? (
            <p className="text-muted-foreground">
              No posts match your search. Try different keywords or clear the search.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Be the first to start a conversation in our community forum.
            </p>
          )}
          
          {user && !searchQuery && (
            <Button 
              className="mt-4" 
              onClick={() => navigate("/community/forum/new")}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create the first post
            </Button>
          )}
          
          {!user && !searchQuery && (
            <div className="mt-4">
              <p className="mb-2 text-sm">Sign in to create posts</p>
              <Link to="/auth">
                <Button>
                  Sign In to Participate
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map(post => (
            <ForumPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
