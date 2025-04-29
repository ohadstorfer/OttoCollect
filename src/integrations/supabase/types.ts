export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      badges: {
        Row: {
          created_at: string
          criteria: string
          description: string
          icon_url: string
          id: string
          is_automatic_award: boolean
          name: string
        }
        Insert: {
          created_at?: string
          criteria: string
          description: string
          icon_url: string
          id?: string
          is_automatic_award?: boolean
          name: string
        }
        Update: {
          created_at?: string
          criteria?: string
          description?: string
          icon_url?: string
          id?: string
          is_automatic_award?: boolean
          name?: string
        }
        Relationships: []
      }
      banknote_categories: {
        Row: {
          created_at: string | null
          description: string | null
          end_year: string | null
          id: string
          name: string
          start_year: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_year?: string | null
          id?: string
          name: string
          start_year?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_year?: string | null
          id?: string
          name?: string
          start_year?: string | null
        }
        Relationships: []
      }
      banknote_category_definitions: {
        Row: {
          country_id: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          country_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          country_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banknote_category_definitions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      banknote_rarity_levels: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      banknote_sort_options: {
        Row: {
          country_id: string
          created_at: string
          description: string | null
          display_order: number
          field_name: string
          id: string
          is_default: boolean
          is_required: boolean
          name: string
          updated_at: string
        }
        Insert: {
          country_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          field_name: string
          id?: string
          is_default?: boolean
          is_required?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          country_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          field_name?: string
          id?: string
          is_default?: boolean
          is_required?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banknote_sort_options_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      banknote_type_definitions: {
        Row: {
          country_id: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          country_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banknote_type_definitions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      banknote_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          excerpt: string
          id: string
          main_image_url: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          excerpt: string
          id?: string
          main_image_url: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          main_image_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      collection_items: {
        Row: {
          banknote_id: string
          condition: string
          created_at: string
          id: string
          is_for_sale: boolean
          location: string | null
          obverse_image: string | null
          order_index: number
          private_note: string | null
          public_note: string | null
          purchase_date: string | null
          purchase_price: number | null
          reverse_image: string | null
          sale_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          banknote_id: string
          condition: string
          created_at?: string
          id?: string
          is_for_sale?: boolean
          location?: string | null
          obverse_image?: string | null
          order_index?: number
          private_note?: string | null
          public_note?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          reverse_image?: string | null
          sale_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          banknote_id?: string
          condition?: string
          created_at?: string
          id?: string
          is_for_sale?: boolean
          location?: string | null
          obverse_image?: string | null
          order_index?: number
          private_note?: string | null
          public_note?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          reverse_image?: string | null
          sale_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_banknote_id_fkey"
            columns: ["banknote_id"]
            isOneToOne: false
            referencedRelation: "detailed_banknotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_banknote_id_fkey"
            columns: ["banknote_id"]
            isOneToOne: false
            referencedRelation: "sorted_banknotes"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      currencies: {
        Row: {
          country_id: string
          created_at: string
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          country_id: string
          created_at?: string
          display_order: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          country_id?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "currencies_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      detailed_banknotes: {
        Row: {
          back_picture: string | null
          banknote_description: string | null
          category: string | null
          colors: string | null
          country: string
          created_at: string | null
          extended_pick_number: string
          face_value: string
          front_picture: string | null
          gregorian_year: string | null
          historical_description: string | null
          id: string
          is_approved: boolean | null
          is_pending: boolean | null
          islamic_year: string | null
          other_element_pictures: string[] | null
          pick_number: string
          printer: string | null
          rarity: string | null
          seal_names: string | null
          seal_pictures: string[] | null
          security_element: string | null
          serial_numbering: string | null
          signature_pictures: string[] | null
          signatures_back: string | null
          signatures_front: string | null
          sultan_name: string | null
          tughra_picture: string | null
          turk_catalog_number: string | null
          type: string | null
          updated_at: string | null
          watermark_picture: string | null
        }
        Insert: {
          back_picture?: string | null
          banknote_description?: string | null
          category?: string | null
          colors?: string | null
          country: string
          created_at?: string | null
          extended_pick_number: string
          face_value: string
          front_picture?: string | null
          gregorian_year?: string | null
          historical_description?: string | null
          id?: string
          is_approved?: boolean | null
          is_pending?: boolean | null
          islamic_year?: string | null
          other_element_pictures?: string[] | null
          pick_number: string
          printer?: string | null
          rarity?: string | null
          seal_names?: string | null
          seal_pictures?: string[] | null
          security_element?: string | null
          serial_numbering?: string | null
          signature_pictures?: string[] | null
          signatures_back?: string | null
          signatures_front?: string | null
          sultan_name?: string | null
          tughra_picture?: string | null
          turk_catalog_number?: string | null
          type?: string | null
          updated_at?: string | null
          watermark_picture?: string | null
        }
        Update: {
          back_picture?: string | null
          banknote_description?: string | null
          category?: string | null
          colors?: string | null
          country?: string
          created_at?: string | null
          extended_pick_number?: string
          face_value?: string
          front_picture?: string | null
          gregorian_year?: string | null
          historical_description?: string | null
          id?: string
          is_approved?: boolean | null
          is_pending?: boolean | null
          islamic_year?: string | null
          other_element_pictures?: string[] | null
          pick_number?: string
          printer?: string | null
          rarity?: string | null
          seal_names?: string | null
          seal_pictures?: string[] | null
          security_element?: string | null
          serial_numbering?: string | null
          signature_pictures?: string[] | null
          signatures_back?: string | null
          signatures_front?: string | null
          sultan_name?: string | null
          tughra_picture?: string | null
          turk_catalog_number?: string | null
          type?: string | null
          updated_at?: string | null
          watermark_picture?: string | null
        }
        Relationships: []
      }
      forum_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_edited: boolean | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          image_urls: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      forum_replies: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      image_suggestions: {
        Row: {
          banknote_id: string
          created_at: string
          id: string
          image_url: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          banknote_id: string
          created_at?: string
          id?: string
          image_url: string
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          banknote_id?: string
          created_at?: string
          id?: string
          image_url?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_suggestions_banknote_id_fkey"
            columns: ["banknote_id"]
            isOneToOne: false
            referencedRelation: "detailed_banknotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_suggestions_banknote_id_fkey"
            columns: ["banknote_id"]
            isOneToOne: false
            referencedRelation: "sorted_banknotes"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_items: {
        Row: {
          banknote_id: string
          collection_item_id: string
          created_at: string
          id: string
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          banknote_id: string
          collection_item_id: string
          created_at?: string
          id?: string
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          banknote_id?: string
          collection_item_id?: string
          created_at?: string
          id?: string
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_items_collection_item_id_fkey"
            columns: ["collection_item_id"]
            isOneToOne: false
            referencedRelation: "collection_items"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          reference_item_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          reference_item_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          reference_item_id?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about: string | null
          avatar_url: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          points: number
          rank: string
          role: string
          role_id: string | null
          updated_at: string
          username: string
        }
        Insert: {
          about?: string | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email: string
          id: string
          points?: number
          rank?: string
          role?: string
          role_id?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          about?: string | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          points?: number
          rank?: string
          role?: string
          role_id?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          id: string
          is_country_admin: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_country_admin?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_country_admin?: boolean | null
          name?: string
        }
        Relationships: []
      }
      sort_fields: {
        Row: {
          created_at: string
          display_order: number | null
          id: number
          name: string | null
          sort_option: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: number
          name?: string | null
          sort_option?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: number
          name?: string | null
          sort_option?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sort_fields_sort_option_fkey"
            columns: ["sort_option"]
            isOneToOne: false
            referencedRelation: "banknote_sort_options"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_filter_preferences: {
        Row: {
          country_id: string
          created_at: string
          group_mode: boolean
          id: string
          selected_categories: string[] | null
          selected_sort_options: string[] | null
          selected_types: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country_id: string
          created_at?: string
          group_mode?: boolean
          id?: string
          selected_categories?: string[] | null
          selected_sort_options?: string[] | null
          selected_types?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country_id?: string
          created_at?: string
          group_mode?: boolean
          id?: string
          selected_categories?: string[] | null
          selected_sort_options?: string[] | null
          selected_types?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_filter_preferences_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          banknote_id: string
          created_at: string
          id: string
          note: string | null
          priority: string
          user_id: string
        }
        Insert: {
          banknote_id: string
          created_at?: string
          id?: string
          note?: string | null
          priority: string
          user_id: string
        }
        Update: {
          banknote_id?: string
          created_at?: string
          id?: string
          note?: string | null
          priority?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_banknote_id_fkey"
            columns: ["banknote_id"]
            isOneToOne: false
            referencedRelation: "detailed_banknotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_banknote_id_fkey"
            columns: ["banknote_id"]
            isOneToOne: false
            referencedRelation: "sorted_banknotes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      sorted_banknotes: {
        Row: {
          back_picture: string | null
          banknote_description: string | null
          base_num: number | null
          category: string | null
          colors: string | null
          country: string | null
          created_at: string | null
          extended_pick_number: string | null
          face_value: string | null
          front_picture: string | null
          gregorian_year: string | null
          historical_description: string | null
          id: string | null
          is_approved: boolean | null
          is_pending: boolean | null
          islamic_year: string | null
          letter_type: string | null
          letter_value: string | null
          other_element_pictures: string[] | null
          pick_number: string | null
          printer: string | null
          rarity: string | null
          seal_names: string | null
          seal_pictures: string[] | null
          security_element: string | null
          serial_numbering: string | null
          signature_pictures: string[] | null
          signatures_back: string | null
          signatures_front: string | null
          suffix_num: number | null
          sultan_name: string | null
          trailing_text: string | null
          tughra_picture: string | null
          turk_catalog_number: string | null
          type: string | null
          updated_at: string | null
          watermark_picture: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      extract_numeric_value: {
        Args: { face_value: string }
        Returns: number
      }
      extract_pick_components: {
        Args: { pick_number: string }
        Returns: {
          base_num: number
          capital_letter: string
          group_letter: string
          suffix_num: number
          suffix_text: string
        }[]
      }
      get_current_user: {
        Args: Record<PropertyKey, never>
        Returns: {
          about: string | null
          avatar_url: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          points: number
          rank: string
          role: string
          role_id: string | null
          updated_at: string
          username: string
        }
      }
      is_country_admin: {
        Args: { user_uuid: string; country_uuid: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      parse_extended_pick_number: {
        Args: { pick_number: string }
        Returns: {
          base_num: number
          letter_type: string
          letter_value: string
          suffix_num: number
          trailing_text: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
