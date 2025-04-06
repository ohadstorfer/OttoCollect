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
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          points: number
          rank: string
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email: string
          id: string
          points?: number
          rank?: string
          role?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          points?: number
          rank?: string
          role?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          points: number
          rank: string
          role: string
          updated_at: string
          username: string
        }
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
