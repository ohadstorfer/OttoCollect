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
    };
  };
} 