export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          avatar_url?: string;
          about?: string;
          country?: string;
          role_id: string;
          role: string;
          rank: string;
          points: number;
          created_at: string;
          updated_at?: string;
          blocked?: boolean;
          is_forum_blocked?: boolean;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          avatar_url?: string;
          about?: string;
          country?: string;
          role_id: string;
          role?: string;
          rank?: string;
          points?: number;
          created_at?: string;
          updated_at?: string;
          blocked?: boolean;
          is_forum_blocked?: boolean;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          avatar_url?: string;
          about?: string;
          country?: string;
          role_id?: string;
          role?: string;
          rank?: string;
          points?: number;
          created_at?: string;
          updated_at?: string;
          blocked?: boolean;
          is_forum_blocked?: boolean;
        };
      };
      followers: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'message' | 'forum_post' | 'collection_activity' | 'follow';
          title: string;
          content: string;
          reference_id?: string;
          reference_data?: any;
          is_read: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'message' | 'forum_post' | 'collection_activity' | 'follow';
          title: string;
          content: string;
          reference_id?: string;
          reference_data?: any;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'message' | 'forum_post' | 'collection_activity' | 'follow';
          title?: string;
          content?: string;
          reference_id?: string;
          reference_data?: any;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
