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
      digirioh_app_whatsapp_chat_history: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      digirioh_app_whatsapp_chat_history_manual: {
        Row: {
          content: string | null
          created_at: string
          id: string
          message_type: string
          metadata: Json | null
          session_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          message_type: string
          metadata?: Json | null
          session_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          session_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          google_access_token: string | null
          google_email: string | null
          google_id: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          plan: string
          role: string
          updated_at: string | null
          whatsapp_jid: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          google_access_token?: string | null
          google_email?: string | null
          google_id?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id: string
          plan?: string
          role?: string
          updated_at?: string | null
          whatsapp_jid?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          google_access_token?: string | null
          google_email?: string | null
          google_id?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          plan?: string
          role?: string
          updated_at?: string | null
          whatsapp_jid?: string | null
        }
        Relationships: []
      }
      user_last_location: {
        Row: {
          created_at: string
          latitude: number | null
          longitude: number | null
          timestamp: string | null
          user_jid: string
        }
        Insert: {
          created_at?: string
          latitude?: number | null
          longitude?: number | null
          timestamp?: string | null
          user_jid: string
        }
        Update: {
          created_at?: string
          latitude?: number | null
          longitude?: number | null
          timestamp?: string | null
          user_jid?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          created_at: string
          id: number
          label: string | null
          latitude: number | null
          longitude: number | null
          user_jid: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          user_jid?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          user_jid?: string | null
        }
        Relationships: []
      }
      user_news_preferences: {
        Row: {
          created_at: string
          id: number
          preference_type: string
          preference_value: string | null
          user_jid: string
        }
        Insert: {
          created_at?: string
          id?: number
          preference_type?: string
          preference_value?: string | null
          user_jid: string
        }
        Update: {
          created_at?: string
          id?: number
          preference_type?: string
          preference_value?: string | null
          user_jid?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_linking_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_user_to_profiles: {
        Args: { user_id: string }
        Returns: undefined
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
