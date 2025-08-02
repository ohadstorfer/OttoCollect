import { supabase } from '@/integrations/supabase/client';

export interface UserStats {
  date: string;
  totalRegisteredUsers: number;
  weeklyGuestVisits: number;
  weeklyActiveUsers: number;
}

export interface CatalogStats {
  date: string;
  countryId: string;
  countryName: string;
  totalViews: number;
  totalCollections: number;
  totalItems: number;
  itemsMissingPhotos: number;
  itemsWithPhotos: number;
}

export interface BlogStats {
  date: string;
  totalBlogPosts: number;
}

export interface ForumStats {
  date: string;
  totalForumPosts: number;
}

export interface CollectionViewStats {
  userId: string;
  username: string;
  totalViews: number;
}

export interface BlogPostViewStats {
  postId: string;
  postTitle: string;
  totalViews: number;
}

export const statisticsService = {
  // Generate daily statistics
  async generateDailyStats(date?: string) {
    const { error } = await supabase.rpc('generate_daily_statistics', {
      target_date: date || new Date().toISOString().split('T')[0]
    });
    
    if (error) throw error;
  },

  // User Statistics
  async getUserStats(daysBack: number = 30): Promise<UserStats[]> {
    const { data, error } = await supabase
      .from('daily_user_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(daysBack);
    
    if (error) throw error;
    
    return data.map(item => ({
      date: item.date,
      totalRegisteredUsers: item.total_registered_users,
      weeklyGuestVisits: item.weekly_guest_visits,
      weeklyActiveUsers: item.weekly_active_users
    }));
  },

  // Current user totals
  async getCurrentUserTotals() {
    const [registeredResult, weeklyGuestsResult, weeklyActiveResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.rpc('get_weekly_guest_visits'),
      supabase.rpc('get_weekly_active_users')
    ]);

    return {
      totalRegistered: registeredResult.count || 0,
      weeklyGuests: weeklyGuestsResult.data || 0,
      weeklyActive: weeklyActiveResult.data || 0
    };
  },

  // Catalog Statistics
  async getCatalogStats(daysBack: number = 30): Promise<CatalogStats[]> {
    const { data, error } = await supabase
      .from('daily_catalog_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(daysBack * 10); // More records since we have multiple countries per day
    
    if (error) throw error;
    
    return data.map(item => ({
      date: item.date,
      countryId: item.country_id,
      countryName: item.country_name,
      totalViews: item.total_views,
      totalCollections: item.total_collections,
      totalItems: item.total_items,
      itemsMissingPhotos: item.items_missing_photos,
      itemsWithPhotos: item.items_with_photos
    }));
  },

  // Current catalog totals
  async getCurrentCatalogTotals() {
    const { data, error } = await supabase
      .from('daily_catalog_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    // Get latest stats per country
    const latestByCountry = data.reduce((acc, item) => {
      if (!acc[item.country_id] || acc[item.country_id].date < item.date) {
        acc[item.country_id] = item;
      }
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(latestByCountry).map(item => ({
      countryId: item.country_id,
      countryName: item.country_name,
      totalViews: item.total_views,
      totalCollections: item.total_collections,
      totalItems: item.total_items,
      itemsMissingPhotos: item.items_missing_photos,
      itemsWithPhotos: item.items_with_photos
    }));
  },

  // Blog Statistics
  async getBlogStats(daysBack: number = 30): Promise<BlogStats[]> {
    const { data, error } = await supabase
      .from('daily_blog_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(daysBack);
    
    if (error) throw error;
    
    return data.map(item => ({
      date: item.date,
      totalBlogPosts: item.total_blog_posts
    }));
  },

  // Current blog totals
  async getCurrentBlogTotals() {
    const { count, error } = await supabase
      .from('blog_posts')
      .select('id', { count: 'exact', head: true });
    
    if (error) throw error;
    return count || 0;
  },

  // Forum Statistics
  async getForumStats(daysBack: number = 30): Promise<ForumStats[]> {
    const { data, error } = await supabase
      .from('daily_forum_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(daysBack);
    
    if (error) throw error;
    
    return data.map(item => ({
      date: item.date,
      totalForumPosts: item.total_forum_posts
    }));
  },

  // Current forum totals
  async getCurrentForumTotals() {
    const { count, error } = await supabase
      .from('forum_posts')
      .select('id', { count: 'exact', head: true });
    
    if (error) throw error;
    return count || 0;
  },

  // Collection View Statistics
  async getCollectionViewStats(): Promise<CollectionViewStats[]> {
    const { data, error } = await supabase
      .from('user_collection_views')
      .select(`
        user_id,
        profiles!inner(username)
      `)
      .order('view_date', { ascending: false });
    
    if (error) throw error;
    
    // Group by user and count views
    const viewCounts = data.reduce((acc, view) => {
      const userId = view.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          username: (view.profiles as any).username,
          totalViews: 0
        };
      }
      acc[userId].totalViews++;
      return acc;
    }, {} as Record<string, CollectionViewStats>);
    
    return Object.values(viewCounts).sort((a, b) => b.totalViews - a.totalViews);
  },

  // Blog Post View Statistics
  async getBlogPostViewStats(): Promise<BlogPostViewStats[]> {
    const { data, error } = await supabase
      .from('blog_post_views')
      .select(`
        blog_post_id,
        blog_posts!inner(title)
      `)
      .order('view_date', { ascending: false });
    
    if (error) throw error;
    
    // Group by post and count views
    const viewCounts = data.reduce((acc, view) => {
      const postId = view.blog_post_id;
      if (!acc[postId]) {
        acc[postId] = {
          postId,
          postTitle: (view.blog_posts as any).title,
          totalViews: 0
        };
      }
      acc[postId].totalViews++;
      return acc;
    }, {} as Record<string, BlogPostViewStats>);
    
    return Object.values(viewCounts).sort((a, b) => b.totalViews - a.totalViews);
  },

  // Track user login
  async trackUserLogin(userId: string) {
    const { error } = await supabase.rpc('track_user_login', {
      user_id_param: userId
    });
    
    if (error) console.error('Error tracking user login:', error);
  },

  // Track collection view
  async trackCollectionView(collectionUserId: string, countryId: string, viewerId?: string) {
    const { error } = await supabase.rpc('track_collection_view', {
      collection_user_id: collectionUserId,
      country_id_param: countryId,
      viewer_id_param: viewerId || null
    });
    
    if (error) console.error('Error tracking collection view:', error);
  },

  // Track blog post view
  async trackBlogPostView(postId: string, viewerId?: string) {
    const { error } = await supabase.rpc('track_blog_post_view', {
      post_id: postId,
      viewer_id_param: viewerId || null
    });
    
    if (error) console.error('Error tracking blog post view:', error);
  }
};