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
      chat_history: {
        Row: {
          audit_id: string | null
          created_at: string
          id: string
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          audit_id?: string | null
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          audit_id?: string | null
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_audits: {
        Row: {
          analysis_metadata: Json | null
          audit_date: string
          created_at: string
          id: string
          kpis: Json
          monthly_metrics: Json
          recommendations: Json
          summary: string
          user_id: string
        }
        Insert: {
          analysis_metadata?: Json | null
          audit_date: string
          created_at?: string
          id?: string
          kpis: Json
          monthly_metrics?: Json
          recommendations: Json
          summary: string
          user_id: string
        }
        Update: {
          analysis_metadata?: Json | null
          audit_date?: string
          created_at?: string
          id?: string
          kpis?: Json
          monthly_metrics?: Json
          recommendations?: Json
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_integrations: {
        Row: {
          created_at: string
          credentials: Json
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          metadata: Json | null
          provider: Database["public"]["Enums"]["accounting_provider"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credentials: Json
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          metadata?: Json | null
          provider: Database["public"]["Enums"]["accounting_provider"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          metadata?: Json | null
          provider?: Database["public"]["Enums"]["accounting_provider"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          currency: string
          description: string | null
          external_id: string | null
          id: string
          integration_id: string
          metadata: Json | null
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          currency: string
          description?: string | null
          external_id?: string | null
          id?: string
          integration_id: string
          metadata?: Json | null
          transaction_date: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          external_id?: string | null
          id?: string
          integration_id?: string
          metadata?: Json | null
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "financial_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          email: string
          full_name: string | null
          id: string
          is_onboarded: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          email: string
          full_name?: string | null
          id: string
          is_onboarded?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_onboarded?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      user_audit_logs: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["audit_event_type"]
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["audit_event_type"]
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["audit_event_type"]
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          ai_explanation_detail:
            | Database["public"]["Enums"]["explanation_detail"]
            | null
          api_keys: Json | null
          api_usage_stats: Json | null
          audit_frequency: Database["public"]["Enums"]["audit_frequency"] | null
          audit_schedule_day: number | null
          audit_schedule_time: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          company_website: string | null
          country: string | null
          created_at: string
          dashboard_layout:
            | Database["public"]["Enums"]["dashboard_layout"]
            | null
          data_refresh_interval: unknown | null
          data_sharing_enabled: boolean | null
          email_frequency:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          email_notifications: boolean | null
          id: string
          in_app_notifications: boolean | null
          industry_benchmarks: Json | null
          integrations: Json | null
          job_title: string | null
          kpi_thresholds: Json | null
          language: string | null
          phone_number: string | null
          sms_notifications: boolean | null
          social_links: Json | null
          target_kpis: Json | null
          theme: Database["public"]["Enums"]["theme_preference"] | null
          timezone: string | null
          two_factor_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_explanation_detail?:
            | Database["public"]["Enums"]["explanation_detail"]
            | null
          api_keys?: Json | null
          api_usage_stats?: Json | null
          audit_frequency?:
            | Database["public"]["Enums"]["audit_frequency"]
            | null
          audit_schedule_day?: number | null
          audit_schedule_time?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company_website?: string | null
          country?: string | null
          created_at?: string
          dashboard_layout?:
            | Database["public"]["Enums"]["dashboard_layout"]
            | null
          data_refresh_interval?: unknown | null
          data_sharing_enabled?: boolean | null
          email_frequency?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          industry_benchmarks?: Json | null
          integrations?: Json | null
          job_title?: string | null
          kpi_thresholds?: Json | null
          language?: string | null
          phone_number?: string | null
          sms_notifications?: boolean | null
          social_links?: Json | null
          target_kpis?: Json | null
          theme?: Database["public"]["Enums"]["theme_preference"] | null
          timezone?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_explanation_detail?:
            | Database["public"]["Enums"]["explanation_detail"]
            | null
          api_keys?: Json | null
          api_usage_stats?: Json | null
          audit_frequency?:
            | Database["public"]["Enums"]["audit_frequency"]
            | null
          audit_schedule_day?: number | null
          audit_schedule_time?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company_website?: string | null
          country?: string | null
          created_at?: string
          dashboard_layout?:
            | Database["public"]["Enums"]["dashboard_layout"]
            | null
          data_refresh_interval?: unknown | null
          data_sharing_enabled?: boolean | null
          email_frequency?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          industry_benchmarks?: Json | null
          integrations?: Json | null
          job_title?: string | null
          kpi_thresholds?: Json | null
          language?: string | null
          phone_number?: string | null
          sms_notifications?: boolean | null
          social_links?: Json | null
          target_kpis?: Json | null
          theme?: Database["public"]["Enums"]["theme_preference"] | null
          timezone?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_monthly_changes: {
        Args: {
          current_metrics: Json
          previous_metrics: Json
        }
        Returns: Json
      }
      log_audit_event: {
        Args: {
          p_user_id: string
          p_event_type: Database["public"]["Enums"]["audit_event_type"]
          p_metadata?: Json
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: string
      }
    }
    Enums: {
      accounting_provider: "xero" | "quickbooks" | "sage"
      audit_event_type:
        | "mfa_enabled"
        | "mfa_disabled"
        | "login"
        | "logout"
        | "settings_updated"
        | "data_exported"
        | "password_changed"
        | "email_changed"
      audit_frequency: "on_demand" | "weekly" | "monthly"
      dashboard_layout: "grid" | "list"
      explanation_detail: "basic" | "intermediate" | "advanced"
      notification_frequency: "instant" | "daily" | "weekly"
      theme_preference: "light" | "dark" | "system"
      user_role: "admin" | "user"
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
