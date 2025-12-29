export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          content: string
          created_at: string | null
          feature: string
          id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          feature: string
          id?: string
          metadata?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          feature?: string
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_user_insights: {
        Row: {
          id: string
          patterns: Json | null
          preferences: Json | null
          recent_context: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          patterns?: Json | null
          preferences?: Json | null
          recent_context?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          patterns?: Json | null
          preferences?: Json | null
          recent_context?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      future_notes: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_read: boolean
          note: string
          sender_role: string
          session_id: string | null
          user_id: string
          work_type: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          note: string
          sender_role: string
          session_id?: string | null
          user_id: string
          work_type?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          note?: string
          sender_role?: string
          session_id?: string | null
          user_id?: string
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "future_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          onboarding_completed: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          onboarding_completed?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      project_templates: {
        Row: {
          created_at: string
          default_venture: string
          description: string | null
          id: string
          name: string
          stages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_venture: string
          description?: string | null
          id?: string
          name: string
          stages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_venture?: string
          description?: string | null
          id?: string
          name?: string
          stages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          completed_at: string | null
          created_at: string
          current_stage: number
          description: string | null
          id: string
          name: string
          project_template_id: string | null
          stages: Json
          status: string
          updated_at: string
          user_id: string
          venture: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_stage?: number
          description?: string | null
          id?: string
          name: string
          project_template_id?: string | null
          stages?: Json
          status?: string
          updated_at?: string
          user_id: string
          venture: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_stage?: number
          description?: string | null
          id?: string
          name?: string
          project_template_id?: string | null
          stages?: Json
          status?: string
          updated_at?: string
          user_id?: string
          venture?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          completed_at: string | null
          completion_condition: string
          created_at: string
          duration_minutes: number | null
          focus: string
          id: string
          project_id: string | null
          stage_index: number | null
          started_at: string
          status: string
          tasks: Json | null
          user_id: string | null
          venture: string
          work_type: string
        }
        Insert: {
          completed_at?: string | null
          completion_condition: string
          created_at?: string
          duration_minutes?: number | null
          focus: string
          id?: string
          project_id?: string | null
          stage_index?: number | null
          started_at?: string
          status?: string
          tasks?: Json | null
          user_id?: string | null
          venture: string
          work_type: string
        }
        Update: {
          completed_at?: string | null
          completion_condition?: string
          created_at?: string
          duration_minutes?: number | null
          focus?: string
          id?: string
          project_id?: string | null
          stage_index?: number | null
          started_at?: string
          status?: string
          tasks?: Json | null
          user_id?: string | null
          venture?: string
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string
          default_completion_condition: string | null
          default_focus: string | null
          default_tasks: Json | null
          id: string
          last_used_at: string | null
          name: string
          use_ai_tasks: boolean
          user_id: string | null
          venture: string
          work_type: string
        }
        Insert: {
          created_at?: string
          default_completion_condition?: string | null
          default_focus?: string | null
          default_tasks?: Json | null
          id?: string
          last_used_at?: string | null
          name: string
          use_ai_tasks?: boolean
          user_id?: string | null
          venture: string
          work_type: string
        }
        Update: {
          created_at?: string
          default_completion_condition?: string | null
          default_focus?: string | null
          default_tasks?: Json | null
          id?: string
          last_used_at?: string | null
          name?: string
          use_ai_tasks?: boolean
          user_id?: string | null
          venture?: string
          work_type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          default_session_duration: number
          id: string
          theme: string
          updated_at: string
          visible_template_tabs: Json
        }
        Insert: {
          created_at?: string
          default_session_duration?: number
          id: string
          theme?: string
          updated_at?: string
          visible_template_tabs?: Json
        }
        Update: {
          created_at?: string
          default_session_duration?: number
          id?: string
          theme?: string
          updated_at?: string
          visible_template_tabs?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          achievements_unlocked: string[]
          created_at: string
          current_streak: number
          id: string
          last_session_date: string | null
          longest_streak: number
          notes_read: number
          notes_sent: number
          projects_completed: number
          templates_created: number
          total_minutes_worked: number
          total_sessions_completed: number
          total_tasks_completed: number
          unique_categories_used: string[]
          updated_at: string
        }
        Insert: {
          achievements_unlocked?: string[]
          created_at?: string
          current_streak?: number
          id: string
          last_session_date?: string | null
          longest_streak?: number
          notes_read?: number
          notes_sent?: number
          projects_completed?: number
          templates_created?: number
          total_minutes_worked?: number
          total_sessions_completed?: number
          total_tasks_completed?: number
          unique_categories_used?: string[]
          updated_at?: string
        }
        Update: {
          achievements_unlocked?: string[]
          created_at?: string
          current_streak?: number
          id?: string
          last_session_date?: string | null
          longest_streak?: number
          notes_read?: number
          notes_sent?: number
          projects_completed?: number
          templates_created?: number
          total_minutes_worked?: number
          total_sessions_completed?: number
          total_tasks_completed?: number
          unique_categories_used?: string[]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
