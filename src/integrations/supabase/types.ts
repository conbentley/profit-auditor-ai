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
      audit_findings: {
        Row: {
          audit_id: string | null
          category: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          potential_savings: number | null
          resolution_steps: Json | null
          severity: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audit_id?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          potential_savings?: number | null
          resolution_steps?: Json | null
          severity: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audit_id?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          potential_savings?: number | null
          resolution_steps?: Json | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "financial_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_metrics_history: {
        Row: {
          audit_id: string
          change_percentage: number | null
          id: string
          metric_type: string
          metric_value: number
          previous_value: number | null
          recorded_at: string | null
          user_id: string
        }
        Insert: {
          audit_id: string
          change_percentage?: number | null
          id?: string
          metric_type: string
          metric_value: number
          previous_value?: number | null
          recorded_at?: string | null
          user_id: string
        }
        Update: {
          audit_id?: string
          change_percentage?: number | null
          id?: string
          metric_type?: string
          metric_value?: number
          previous_value?: number | null
          recorded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_audit"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "financial_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      business_metrics: {
        Row: {
          created_at: string
          expenses: number
          financial_health: number
          id: string
          marketing_performance: number
          profit_score: number
          revenue: number
          user_id: string
          workflow_efficiency: number
        }
        Insert: {
          created_at?: string
          expenses?: number
          financial_health?: number
          id?: string
          marketing_performance?: number
          profit_score?: number
          revenue?: number
          user_id: string
          workflow_efficiency?: number
        }
        Update: {
          created_at?: string
          expenses?: number
          financial_health?: number
          id?: string
          marketing_performance?: number
          profit_score?: number
          revenue?: number
          user_id?: string
          workflow_efficiency?: number
        }
        Relationships: []
      }
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
      competitor_prices: {
        Row: {
          competitor_name: string
          currency: string
          id: string
          last_checked: string
          metadata: Json | null
          price: number
          product_id: string
          url: string | null
          user_id: string
        }
        Insert: {
          competitor_name: string
          currency: string
          id?: string
          last_checked?: string
          metadata?: Json | null
          price: number
          product_id: string
          url?: string | null
          user_id: string
        }
        Update: {
          competitor_name?: string
          currency?: string
          id?: string
          last_checked?: string
          metadata?: Json | null
          price?: number
          product_id?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crm_integrations: {
        Row: {
          created_at: string
          credentials: Json
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_status: string | null
          metadata: Json | null
          platform: Database["public"]["Enums"]["crm_platform"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credentials: Json
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          platform: Database["public"]["Enums"]["crm_platform"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          platform?: Database["public"]["Enums"]["crm_platform"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ecommerce_integrations: {
        Row: {
          created_at: string
          credentials: Json
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_status: Json | null
          metadata: Json | null
          next_sync_at: string | null
          platform: Database["public"]["Enums"]["ecommerce_platform"]
          store_name: string | null
          store_url: string
          sync_frequency: unknown | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credentials: Json
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: Json | null
          metadata?: Json | null
          next_sync_at?: string | null
          platform: Database["public"]["Enums"]["ecommerce_platform"]
          store_name?: string | null
          store_url: string
          sync_frequency?: unknown | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: Json | null
          metadata?: Json | null
          next_sync_at?: string | null
          platform?: Database["public"]["Enums"]["ecommerce_platform"]
          store_name?: string | null
          store_url?: string
          sync_frequency?: unknown | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ecommerce_metrics: {
        Row: {
          average_order_value: number
          created_at: string
          customer_metrics: Json | null
          daily_revenue: number
          id: string
          integration_id: string
          metric_date: string
          products_sold: number
          top_products: Json | null
          total_orders: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_order_value?: number
          created_at?: string
          customer_metrics?: Json | null
          daily_revenue?: number
          id?: string
          integration_id: string
          metric_date: string
          products_sold?: number
          top_products?: Json | null
          total_orders?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_order_value?: number
          created_at?: string
          customer_metrics?: Json | null
          daily_revenue?: number
          id?: string
          integration_id?: string
          metric_date?: string
          products_sold?: number
          top_products?: Json | null
          total_orders?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_metrics_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_products: {
        Row: {
          cost: number | null
          created_at: string
          currency: string
          id: string
          integration_id: string
          inventory_quantity: number | null
          metadata: Json | null
          name: string
          platform_product_id: string
          price: number
          sku: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          currency: string
          id?: string
          integration_id: string
          inventory_quantity?: number | null
          metadata?: Json | null
          name: string
          platform_product_id: string
          price: number
          sku?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          currency?: string
          id?: string
          integration_id?: string
          inventory_quantity?: number | null
          metadata?: Json | null
          name?: string
          platform_product_id?: string
          price?: number
          sku?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_products_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_sales: {
        Row: {
          created_at: string
          currency: string
          id: string
          integration_id: string
          metadata: Json | null
          order_id: string
          product_id: string
          quantity: number
          sale_date: string
          total_price: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          integration_id: string
          metadata?: Json | null
          order_id: string
          product_id: string
          quantity: number
          sale_date: string
          total_price: number
          unit_price: number
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          integration_id?: string
          metadata?: Json | null
          order_id?: string
          product_id?: string
          quantity?: number
          sale_date?: string
          total_price?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_sales_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_products"
            referencedColumns: ["id"]
          },
        ]
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
          api_version: string | null
          connection_settings: Json | null
          created_at: string
          credentials: Json
          documents: Json | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_status: Json | null
          metadata: Json | null
          next_sync_at: string | null
          provider: Database["public"]["Enums"]["accounting_provider"]
          sync_frequency: unknown | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_version?: string | null
          connection_settings?: Json | null
          created_at?: string
          credentials: Json
          documents?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: Json | null
          metadata?: Json | null
          next_sync_at?: string | null
          provider: Database["public"]["Enums"]["accounting_provider"]
          sync_frequency?: unknown | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_version?: string | null
          connection_settings?: Json | null
          created_at?: string
          credentials?: Json
          documents?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: Json | null
          metadata?: Json | null
          next_sync_at?: string | null
          provider?: Database["public"]["Enums"]["accounting_provider"]
          sync_frequency?: unknown | null
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
      marketing_performance: {
        Row: {
          campaign_id: string | null
          clicks: number | null
          conversions: number | null
          created_at: string
          date: string
          id: string
          impressions: number | null
          metadata: Json | null
          platform: string
          revenue: number | null
          spend: number
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          date: string
          id?: string
          impressions?: number | null
          metadata?: Json | null
          platform: string
          revenue?: number | null
          spend: number
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          date?: string
          id?: string
          impressions?: number | null
          metadata?: Json | null
          platform?: string
          revenue?: number | null
          spend?: number
          user_id?: string
        }
        Relationships: []
      }
      marketplace_settings: {
        Row: {
          created_at: string
          fulfillment_type: string | null
          id: string
          integration_id: string
          marketplace_id: string | null
          region: string
          seller_id: string | null
          settings: Json | null
          sync_inventory: boolean | null
          sync_orders: boolean | null
          sync_pricing: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fulfillment_type?: string | null
          id?: string
          integration_id: string
          marketplace_id?: string | null
          region: string
          seller_id?: string | null
          settings?: Json | null
          sync_inventory?: boolean | null
          sync_orders?: boolean | null
          sync_pricing?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fulfillment_type?: string | null
          id?: string
          integration_id?: string
          marketplace_id?: string | null
          region?: string
          seller_id?: string | null
          settings?: Json | null
          sync_inventory?: boolean | null
          sync_orders?: boolean | null
          sync_pricing?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_settings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_integrations: {
        Row: {
          created_at: string
          credentials: Json
          id: string
          is_active: boolean | null
          is_test_mode: boolean | null
          last_sync_at: string | null
          metadata: Json | null
          provider: Database["public"]["Enums"]["payment_provider"]
          updated_at: string
          user_id: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          credentials: Json
          id?: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_sync_at?: string | null
          metadata?: Json | null
          provider: Database["public"]["Enums"]["payment_provider"]
          updated_at?: string
          user_id: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          credentials?: Json
          id?: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_sync_at?: string | null
          metadata?: Json | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          updated_at?: string
          user_id?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          completed_onboarding_tasks: string[] | null
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
          completed_onboarding_tasks?: string[] | null
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
          completed_onboarding_tasks?: string[] | null
          email?: string
          full_name?: string | null
          id?: string
          is_onboarded?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      spreadsheet_uploads: {
        Row: {
          analysis_results: Json | null
          analyzed_at: string | null
          data_summary: Json | null
          file_path: string
          file_type: string
          filename: string
          id: string
          metadata: Json | null
          processed: boolean | null
          processing_error: string | null
          row_count: number | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          analysis_results?: Json | null
          analyzed_at?: string | null
          data_summary?: Json | null
          file_path: string
          file_type: string
          filename: string
          id?: string
          metadata?: Json | null
          processed?: boolean | null
          processing_error?: string | null
          row_count?: number | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          analysis_results?: Json | null
          analyzed_at?: string | null
          data_summary?: Json | null
          file_path?: string
          file_type?: string
          filename?: string
          id?: string
          metadata?: Json | null
          processed?: boolean | null
          processing_error?: string | null
          row_count?: number | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string | null
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
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
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
          company_name: string | null
          company_website: string | null
          country: string | null
          created_at: string
          dashboard_layout:
            | Database["public"]["Enums"]["dashboard_layout"]
            | null
          data_refresh_interval: unknown | null
          data_sharing_enabled: boolean | null
          email: string | null
          email_frequency:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          email_notifications: boolean | null
          full_name: string | null
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
          company_name?: string | null
          company_website?: string | null
          country?: string | null
          created_at?: string
          dashboard_layout?:
            | Database["public"]["Enums"]["dashboard_layout"]
            | null
          data_refresh_interval?: unknown | null
          data_sharing_enabled?: boolean | null
          email?: string | null
          email_frequency?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          email_notifications?: boolean | null
          full_name?: string | null
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
          company_name?: string | null
          company_website?: string | null
          country?: string | null
          created_at?: string
          dashboard_layout?:
            | Database["public"]["Enums"]["dashboard_layout"]
            | null
          data_refresh_interval?: unknown | null
          data_sharing_enabled?: boolean | null
          email?: string | null
          email_frequency?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          email_notifications?: boolean | null
          full_name?: string | null
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
      is_admin: {
        Args: {
          user_uuid: string
        }
        Returns: boolean
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
      crm_platform:
        | "salesforce"
        | "hubspot"
        | "zoho"
        | "dynamics365"
        | "pipedrive"
        | "gohighlevel"
      dashboard_layout: "grid" | "list"
      ecommerce_platform:
        | "shopify"
        | "woocommerce"
        | "magento"
        | "bigcommerce"
        | "prestashop"
        | "amazon"
        | "ebay"
        | "etsy"
      explanation_detail: "basic" | "intermediate" | "advanced"
      notification_frequency: "instant" | "daily" | "weekly"
      payment_provider:
        | "stripe"
        | "paypal"
        | "square"
        | "adyen"
        | "braintree"
        | "razorpay"
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
